import { OperationError, describeChar } from "./errors.ts";

/**
 * Conversões entre texto, bytes e as bases usadas pelas operações de
 * codificação. Tudo opera sobre Uint8Array — nada aqui depende de Node,
 * de Buffer ou do DOM, para que os motores rodem igual no teste e no
 * navegador.
 */

const encoder = new TextEncoder();

export function utf8Encode(text: string): Uint8Array {
  return encoder.encode(text);
}

export function utf8Decode(bytes: Uint8Array, fatal = true): string {
  try {
    return new TextDecoder("utf-8", { fatal }).decode(bytes);
  } catch {
    throw new OperationError(
      "O resultado não é texto UTF-8 válido. Se o conteúdo for binário, use a ação de baixar em vez da saída em texto.",
    );
  }
}

// ---------------------------------------------------------------------------
// Hex
// ---------------------------------------------------------------------------

const HEX_DIGITS_LOWER = "0123456789abcdef";

export function toHex(bytes: Uint8Array, upper = false): string {
  const digits = upper ? HEX_DIGITS_LOWER.toUpperCase() : HEX_DIGITS_LOWER;
  let out = "";
  for (const byte of bytes) {
    out += digits[byte >> 4] + digits[byte & 0x0f];
  }
  return out;
}

export function fromHex(input: string): Uint8Array {
  // Espaços e quebras de linha são tolerados: colar um dump hexadecimal é o
  // caso comum.
  const compact = input.replace(/\s+/g, "");

  for (let i = 0; i < compact.length; i += 1) {
    if (!/[0-9a-fA-F]/.test(compact[i])) {
      throw new OperationError(
        `Caractere ${describeChar(compact[i])} não é um dígito hexadecimal.`,
        i,
      );
    }
  }

  if (compact.length % 2 !== 0) {
    throw new OperationError(
      `A entrada tem ${compact.length} dígitos hexadecimais — um número ímpar. Cada byte precisa de dois dígitos.`,
      compact.length - 1,
    );
  }

  const bytes = new Uint8Array(compact.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(compact.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Base64
// ---------------------------------------------------------------------------

const BASE64_STANDARD =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_URLSAFE =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export type Base64Alphabet = "standard" | "urlsafe";

function base64Alphabet(alphabet: Base64Alphabet): string {
  return alphabet === "urlsafe" ? BASE64_URLSAFE : BASE64_STANDARD;
}

export function toBase64(
  bytes: Uint8Array,
  alphabet: Base64Alphabet = "standard",
  padding = true,
): string {
  const chars = base64Alphabet(alphabet);
  let out = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const remaining = bytes.length - i;
    const b0 = bytes[i];
    const b1 = remaining > 1 ? bytes[i + 1] : 0;
    const b2 = remaining > 2 ? bytes[i + 2] : 0;

    out += chars[b0 >> 2];
    out += chars[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += remaining > 1 ? chars[((b1 & 0x0f) << 2) | (b2 >> 6)] : padding ? "=" : "";
    out += remaining > 2 ? chars[b2 & 0x3f] : padding ? "=" : "";
  }

  return out;
}

export function fromBase64(
  input: string,
  alphabet: Base64Alphabet = "standard",
): Uint8Array {
  const chars = base64Alphabet(alphabet);
  const compact = input.replace(/\s+/g, "");
  const body = compact.replace(/=+$/, "");

  if (/=/.test(body)) {
    throw new OperationError(
      "O caractere de preenchimento \"=\" só pode aparecer no fim da entrada.",
      compact.indexOf("="),
    );
  }

  const values: number[] = [];
  for (let i = 0; i < body.length; i += 1) {
    const value = chars.indexOf(body[i]);
    if (value < 0) {
      const other = alphabet === "urlsafe" ? "padrão" : "URL-safe";
      const hint = base64Alphabet(alphabet === "urlsafe" ? "standard" : "urlsafe")
        .includes(body[i])
        ? ` Esse caractere pertence ao alfabeto ${other} — troque a variante nas opções avançadas.`
        : "";
      throw new OperationError(
        `Caractere ${describeChar(body[i])} não pertence ao alfabeto Base64 selecionado.${hint}`,
        i,
      );
    }
    values.push(value);
  }

  if (values.length % 4 === 1) {
    throw new OperationError(
      "A entrada Base64 está incompleta: sobrou um único caractere no último grupo.",
      body.length - 1,
    );
  }

  const bytes = new Uint8Array(Math.floor((values.length * 6) / 8));
  let index = 0;
  for (let i = 0; i < values.length; i += 4) {
    const chunk = values.slice(i, i + 4);
    const bits =
      (chunk[0] << 18) |
      (chunk[1] << 12) |
      ((chunk[2] ?? 0) << 6) |
      (chunk[3] ?? 0);

    bytes[index++] = (bits >> 16) & 0xff;
    if (chunk.length > 2) bytes[index++] = (bits >> 8) & 0xff;
    if (chunk.length > 3) bytes[index++] = bits & 0xff;
  }

  return bytes;
}
