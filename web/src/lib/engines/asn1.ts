import type { OptionValues } from "../operations/types.ts";
import { fromBase64, fromHex, toHex, utf8Decode } from "./bytes.ts";
import { OperationError } from "./errors.ts";

/**
 * Parser ASN.1 em codificação DER.
 *
 * Escrito à mão de propósito: o valor desta tela está na mensagem de erro
 * quando a estrutura está truncada — saber em que deslocamento o parsing parou
 * é o que permite descobrir onde o arquivo foi cortado. Uma biblioteca genérica
 * diria apenas "invalid".
 */

const UNIVERSAL_TAGS: Record<number, string> = {
  0x01: "BOOLEAN",
  0x02: "INTEGER",
  0x03: "BIT STRING",
  0x04: "OCTET STRING",
  0x05: "NULL",
  0x06: "OBJECT IDENTIFIER",
  0x07: "ObjectDescriptor",
  0x0a: "ENUMERATED",
  0x0c: "UTF8String",
  0x10: "SEQUENCE",
  0x11: "SET",
  0x12: "NumericString",
  0x13: "PrintableString",
  0x14: "T61String",
  0x16: "IA5String",
  0x17: "UTCTime",
  0x18: "GeneralizedTime",
  0x1a: "VisibleString",
  0x1b: "GeneralString",
  0x1e: "BMPString",
};

/** OIDs que aparecem com frequência em certificados e chaves. */
const KNOWN_OIDS: Record<string, string> = {
  "1.2.840.113549.1.1.1": "rsaEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
  "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.113549.1.9.1": "emailAddress",
  "1.2.840.10045.2.1": "ecPublicKey",
  "1.2.840.10045.3.1.7": "prime256v1",
  "1.2.840.10045.4.3.2": "ecdsaWithSHA256",
  "1.3.101.112": "Ed25519",
  "1.3.6.1.5.5.7.1.1": "authorityInfoAccess",
  "1.3.6.1.5.5.7.3.1": "serverAuth",
  "1.3.6.1.5.5.7.3.2": "clientAuth",
  "2.5.4.3": "commonName",
  "2.5.4.6": "countryName",
  "2.5.4.7": "localityName",
  "2.5.4.8": "stateOrProvinceName",
  "2.5.4.10": "organizationName",
  "2.5.4.11": "organizationalUnitName",
  "2.5.29.14": "subjectKeyIdentifier",
  "2.5.29.15": "keyUsage",
  "2.5.29.17": "subjectAltName",
  "2.5.29.19": "basicConstraints",
  "2.5.29.31": "cRLDistributionPoints",
  "2.5.29.35": "authorityKeyIdentifier",
  "2.5.29.37": "extKeyUsage",
  "2.16.840.1.101.3.4.2.1": "sha256",
};

const CLASS_NAMES = ["universal", "aplicação", "contexto", "privada"];

const STRING_TAGS = new Set([0x0c, 0x12, 0x13, 0x14, 0x16, 0x1a, 0x1b, 0x17, 0x18]);

type Cursor = { offset: number };

function need(bytes: Uint8Array, cursor: Cursor, count: number, what: string): void {
  if (cursor.offset + count > bytes.length) {
    throw new OperationError(
      `Estrutura truncada: ${what} exige ${count} byte(s) a partir do deslocamento ${cursor.offset}, mas a entrada termina em ${bytes.length}.`,
      cursor.offset,
    );
  }
}

function readLength(bytes: Uint8Array, cursor: Cursor): number {
  need(bytes, cursor, 1, "o campo de tamanho");
  const first = bytes[cursor.offset++];

  if ((first & 0x80) === 0) return first;

  const count = first & 0x7f;
  if (count === 0) {
    throw new OperationError(
      `Tamanho indefinido no deslocamento ${cursor.offset - 1}: DER não permite forma indefinida.`,
      cursor.offset - 1,
    );
  }
  if (count > 4) {
    throw new OperationError(
      `Tamanho declarado em ${count} bytes no deslocamento ${cursor.offset - 1} — grande demais para ser plausível.`,
      cursor.offset - 1,
    );
  }

  need(bytes, cursor, count, "o tamanho longo");
  let length = 0;
  for (let i = 0; i < count; i += 1) {
    length = (length << 8) | bytes[cursor.offset++];
  }
  return length;
}

function decodeOid(content: Uint8Array): string {
  if (content.length === 0) return "";

  const parts: number[] = [];
  const first = content[0];
  parts.push(Math.floor(first / 40), first % 40);

  let value = 0;
  for (let i = 1; i < content.length; i += 1) {
    value = value * 128 + (content[i] & 0x7f);
    if ((content[i] & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }

  return parts.join(".");
}

function decodeInteger(content: Uint8Array): string {
  if (content.length <= 6) {
    let value = 0n;
    const negative = (content[0] & 0x80) !== 0;
    for (const byte of content) value = (value << 8n) | BigInt(byte);
    if (negative) value -= 1n << BigInt(8 * content.length);
    return value.toString();
  }
  return `(${content.length} bytes) 0x${toHex(content.subarray(0, 8))}…`;
}

function describeValue(tag: number, content: Uint8Array): string {
  if (tag === 0x01) return content[0] === 0 ? "false" : "true";
  if (tag === 0x02 || tag === 0x0a) return decodeInteger(content);
  if (tag === 0x05) return "";
  if (tag === 0x06) {
    const oid = decodeOid(content);
    const name = KNOWN_OIDS[oid];
    return name ? `${oid} (${name})` : oid;
  }
  if (STRING_TAGS.has(tag)) {
    try {
      return JSON.stringify(utf8Decode(content));
    } catch {
      return `0x${toHex(content)}`;
    }
  }

  const preview = content.subarray(0, 16);
  return content.length === 0
    ? ""
    : `0x${toHex(preview)}${content.length > preview.length ? "…" : ""}`;
}

function tagName(tag: number, klass: number, constructed: boolean): string {
  if (klass === 0) {
    return UNIVERSAL_TAGS[tag] ?? `UNIVERSAL ${tag}`;
  }
  return `[${tag}] ${CLASS_NAMES[klass]}${constructed ? " constructed" : ""}`;
}

function parseNode(
  bytes: Uint8Array,
  cursor: Cursor,
  depth: number,
  lines: string[],
): void {
  const start = cursor.offset;
  need(bytes, cursor, 1, "a tag");
  const identifier = bytes[cursor.offset++];

  const klass = identifier >> 6;
  const constructed = (identifier & 0x20) !== 0;
  let tag = identifier & 0x1f;

  if (tag === 0x1f) {
    // Tag em forma longa: sete bits por byte, até o byte sem bit de continuação.
    tag = 0;
    let byte: number;
    do {
      need(bytes, cursor, 1, "a tag longa");
      byte = bytes[cursor.offset++];
      tag = (tag << 7) | (byte & 0x7f);
    } while ((byte & 0x80) !== 0);
  }

  const length = readLength(bytes, cursor);
  need(bytes, cursor, length, `o conteúdo da tag ${tagName(tag, klass, constructed)}`);

  const content = bytes.subarray(cursor.offset, cursor.offset + length);
  const indent = "  ".repeat(depth);
  const header = `${indent}${tagName(tag, klass, constructed)} (${length} bytes, off ${start})`;

  if (constructed) {
    lines.push(header);
    const inner: Cursor = { offset: cursor.offset };
    const end = cursor.offset + length;
    while (inner.offset < end) {
      parseNode(bytes, inner, depth + 1, lines);
    }
    if (inner.offset !== end) {
      throw new OperationError(
        `Os filhos da estrutura em ${start} terminam em ${inner.offset}, mas o tamanho declarado ia até ${end}.`,
        inner.offset,
      );
    }
  } else {
    const value = describeValue(tag, content);
    lines.push(value === "" ? header : `${header}: ${value}`);
  }

  cursor.offset += length;
}

function inputToBytes(input: string): Uint8Array {
  const trimmed = input.trim();

  const pem = /-----BEGIN [A-Z0-9 ]+-----([\s\S]*?)-----END [A-Z0-9 ]+-----/.exec(
    trimmed,
  );
  if (pem) return fromBase64(pem[1].replace(/\s+/g, ""), "standard");

  if (/^[0-9a-fA-F\s:]+$/.test(trimmed)) {
    return fromHex(trimmed.replace(/:/g, ""));
  }

  return fromBase64(trimmed, "standard");
}

export function parseAsn1(input: string, options: OptionValues): string {
  if (input.trim() === "") return "";

  const bytes = inputToBytes(input);
  if (bytes.length === 0) {
    throw new OperationError("Nenhum byte para analisar.");
  }

  const lines: string[] = [];
  const cursor: Cursor = { offset: 0 };

  parseNode(bytes, cursor, 0, lines);

  if (cursor.offset < bytes.length && options.strict !== false) {
    lines.push(
      `(${bytes.length - cursor.offset} byte(s) após o fim da primeira estrutura, a partir do deslocamento ${cursor.offset})`,
    );
  }

  return lines.join("\n");
}
