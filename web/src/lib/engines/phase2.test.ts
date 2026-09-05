import { describe, expect, it } from "vitest";

import { parseAsn1 } from "./asn1.ts";
import {
  decodeBase32,
  decodeBase58,
  encodeBase32,
  encodeBase58,
  fromBase58,
  toBase58,
} from "./base32-58.ts";
import { convertCharset, convertCharsetReversed } from "./charset.ts";
import { OperationError } from "./errors.ts";
import { decodeJwt } from "./jwt.ts";
import { derToPem, pemToDer } from "./pem-der.ts";
import { fromPunycode, toPunycode } from "./punycode-idna.ts";
import { queryToStructure, structureToQuery } from "./query-string.ts";
import { dateToTimestamp, timestampToDate } from "./timestamp.ts";
import { escapeUnicode, unescapeUnicode } from "./unicode-escape.ts";
import { normalizeResult } from "../operations/types.ts";

const out = (result: ReturnType<typeof decodeJwt>) => normalizeResult(result).output;
const notes = (result: ReturnType<typeof decodeJwt>) => normalizeResult(result).notes;

// Token com header/payload reais; a assinatura é irrelevante porque não é
// verificada — e o teste garante que a interface diga isso.
function tokenWith(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.assinatura`;
}

describe("JWT", () => {
  it("mostra cabeçalho e payload formatados", () => {
    const result = decodeJwt(tokenWith({ sub: "1" }), { indent: "2" });
    expect(out(result)).toContain('"alg": "HS256"');
    expect(out(result)).toContain('"sub": "1"');
  });

  it("avisa sempre que a assinatura não foi verificada", () => {
    const result = decodeJwt(tokenWith({ sub: "1" }), {});
    expect(notes(result).join(" ")).toContain("assinatura não foi verificada");
  });

  it("sinaliza token expirado", () => {
    const result = decodeJwt(tokenWith({ exp: 1000 }), {});
    expect(notes(result).join(" ")).toContain("expirado");
  });

  it("mostra claims temporais em data legível", () => {
    const result = decodeJwt(tokenWith({ iat: 1700000000 }), {});
    expect(out(result)).toContain("2023-11-14");
  });

  it("recusa token sem três segmentos", () => {
    expect(() => decodeJwt("a.b", {})).toThrow(/três segmentos/);
  });
});

describe("Unicode escape", () => {
  it("escapa fora do BMP como par substituto no estilo \\uXXXX", () => {
    expect(escapeUnicode("😀", { style: "u4", onlyNonAscii: true })).toBe(
      "\\uD83D\\uDE00",
    );
  });

  it("escapa fora do BMP como código inteiro no estilo com chaves", () => {
    expect(escapeUnicode("😀", { style: "brace", onlyNonAscii: true })).toBe(
      "\\u{1F600}",
    );
  });

  it("desescapa referências dos três estilos", () => {
    expect(unescapeUnicode("\\u00e9")).toBe("é");
    expect(unescapeUnicode("\\u{1F600}")).toBe("😀");
    expect(unescapeUnicode("\\x41")).toBe("A");
    expect(unescapeUnicode("\\uD83D\\uDE00")).toBe("😀");
  });

  it("preserva ASCII quando pedido", () => {
    expect(escapeUnicode("aé", { style: "u4", onlyNonAscii: true })).toBe(
      "a\\u00E9",
    );
  });

  it("recusa \\xXX acima de U+00FF", () => {
    expect(() => escapeUnicode("é😀", { style: "x2", onlyNonAscii: true })).toThrow(
      OperationError,
    );
  });
});

describe("Punycode", () => {
  it("converte para ASCII", () => {
    expect(toPunycode("café.example")).toBe("xn--caf-dma.example");
  });

  it("converte para Unicode", () => {
    expect(fromPunycode("xn--caf-dma.example")).toBe("café.example");
  });

  it("faz ida e volta preservando os rótulos ASCII", () => {
    expect(fromPunycode(toPunycode("sub.café.example"))).toBe("sub.café.example");
  });

  it("recusa entrada com espaços", () => {
    expect(() => toPunycode("a b.example")).toThrow(OperationError);
  });
});

describe("Unix timestamp", () => {
  it("converte segundos em data UTC", () => {
    expect(out(timestampToDate("1700000000", { unit: "auto" }))).toContain(
      "2023-11-14T22:13:20.000Z",
    );
  });

  it("detecta milissegundos por número de dígitos", () => {
    const result = timestampToDate("1700000000000", { unit: "auto" });
    expect(out(result)).toContain("2023-11-14T22:13:20.000Z");
    expect(notes(result).join(" ")).toContain("milissegundos");
  });

  it("respeita a unidade escolhida à mão", () => {
    expect(out(timestampToDate("1700000000", { unit: "ms" }))).toContain("1970-01-20");
  });

  it("converte data em timestamp", () => {
    expect(out(dateToTimestamp("2023-11-14T22:13:20Z", { unit: "s" }))).toBe(
      "1700000000",
    );
  });

  it("avisa quando a data não trazia fuso", () => {
    expect(notes(dateToTimestamp("2023-11-14 22:13:20", {})).join(" ")).toContain(
      "fuso local",
    );
  });

  it("recusa entrada que não é número", () => {
    expect(() => timestampToDate("ontem", {})).toThrow(OperationError);
  });
});

describe("Query string", () => {
  it("preserva chaves repetidas", () => {
    const result = queryToStructure("a=1&b=2&a=3", {});
    expect(JSON.parse(out(result))).toEqual([
      ["a", "1"],
      ["b", "2"],
      ["a", "3"],
    ]);
    expect(notes(result).join(" ")).toContain('"a" aparece 2 vezes');
  });

  it("remonta preservando chaves repetidas", () => {
    const structure = out(queryToStructure("a=1&b=2&a=3", {}));
    expect(out(structureToQuery(structure, {}))).toBe("a=1&b=2&a=3");
  });

  it("ordena por chave quando pedido", () => {
    expect(out(structureToQuery('[["b","2"],["a","1"]]', { sort: true }))).toBe(
      "a=1&b=2",
    );
  });

  it("decodifica percent-encoding e + nos pares", () => {
    expect(JSON.parse(out(queryToStructure("q=a+b%26c", {})))).toEqual([
      ["q", "a b&c"],
    ]);
  });

  it("recusa estrutura que não é objeto nem lista de pares", () => {
    expect(() => structureToQuery('"texto"', {})).toThrow(OperationError);
  });
});

describe("Charset", () => {
  it("conserta mojibake de UTF-8 lido como Latin-1", () => {
    // "ação" cujos bytes UTF-8 foram lidos como Latin-1.
    const mojibake = "aÃ§Ã£o";
    expect(
      out(convertCharset(mojibake, { encodeAs: "latin-1", readAs: "utf-8" })),
    ).toBe("ação");
  });

  it("sinaliza caractere não representável em Latin-1 e sua posição", () => {
    const result = convertCharset("a€", { encodeAs: "latin-1", readAs: "latin-1" });
    expect(notes(result).join(" ")).toContain("€");
    expect(notes(result).join(" ")).toContain("posição 1");
  });

  it("inverter troca os dois charsets de papel", () => {
    const options = { encodeAs: "latin-1", readAs: "utf-8" };
    const ida = out(convertCharset("aÃ§Ã£o", options));
    expect(out(convertCharsetReversed(ida, options))).toBe("aÃ§Ã£o");
  });
});

describe("Base32", () => {
  it("codifica com preenchimento", () => {
    expect(encodeBase32("toolbox", { padding: true })).toBe("ORXW63DCN54A====");
  });

  it("codifica sem preenchimento quando pedido", () => {
    expect(encodeBase32("toolbox", { padding: false })).toBe("ORXW63DCN54A");
  });

  it("faz ida e volta", () => {
    expect(decodeBase32(encodeBase32("ação 😀", { padding: true }))).toBe("ação 😀");
  });

  it("recusa caractere fora do alfabeto", () => {
    expect(() => decodeBase32("ORXW1")).toThrow(/Base32/);
  });
});

describe("Base58", () => {
  it("faz ida e volta", () => {
    expect(decodeBase58(encodeBase58("toolbox"))).toBe("toolbox");
  });

  it("preserva zeros à esquerda", () => {
    const bytes = Uint8Array.from([0, 0, 1, 2]);
    expect(toBase58(bytes).startsWith("11")).toBe(true);
    expect([...fromBase58(toBase58(bytes))]).toEqual([0, 0, 1, 2]);
  });

  it("recusa os caracteres ambíguos do alfabeto", () => {
    for (const char of ["0", "O", "I", "l"]) {
      expect(() => decodeBase58(`ab${char}cd`), char).toThrow(/ambíguos/);
    }
  });
});

describe("PEM e DER", () => {
  const der = "3006020101020102";

  it("converte DER em PEM com o rótulo escolhido", () => {
    const pem = out(derToPem(der, { label: "PUBLIC KEY" }));
    expect(pem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(pem).toContain("-----END PUBLIC KEY-----");
  });

  it("quebra o corpo em 64 colunas", () => {
    const pem = out(derToPem("00".repeat(200), { label: "CERTIFICATE" }));
    const body = pem
      .split("\n")
      .filter((line) => !line.startsWith("-----") && line !== "");
    expect(body.every((line) => line.length <= 64)).toBe(true);
    expect(body.length).toBeGreaterThan(1);
  });

  it("faz ida e volta", () => {
    const pem = out(derToPem(der, { label: "CERTIFICATE" }));
    expect(out(pemToDer(pem))).toBe(der);
  });

  it("recusa rótulos incompatíveis", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nMAYCAQECAQI=\n-----END PUBLIC KEY-----";
    expect(() => pemToDer(pem)).toThrow(/não bate/);
  });

  it("recusa entrada sem bloco PEM", () => {
    expect(() => pemToDer("nada aqui")).toThrow(/Nenhum bloco PEM/);
  });
});

describe("ASN.1", () => {
  // SEQUENCE { INTEGER 1, OID 1.2.840.113549.1.1.11, NULL }
  const der = "3014020101300f06092a864886f70d01010b050004006";

  it("mostra a hierarquia indentada", () => {
    const tree = parseAsn1("3009020101020102020103", { strict: true });
    const lines = tree.split("\n");
    expect(lines[0]).toContain("SEQUENCE");
    expect(lines[1]).toMatch(/^ {2}INTEGER/);
    expect(lines).toHaveLength(4);
  });

  it("nomeia OIDs conhecidos", () => {
    const tree = parseAsn1("300d06092a864886f70d01010b0500", { strict: true });
    expect(tree).toContain("1.2.840.113549.1.1.11 (sha256WithRSAEncryption)");
  });

  it("aceita entrada em Base64 além de hexadecimal", () => {
    expect(parseAsn1("MAkCAQECAQICAQM=", { strict: true })).toContain("SEQUENCE");
  });

  it("aponta o deslocamento onde a estrutura foi truncada", () => {
    try {
      parseAsn1(der.slice(0, 20), { strict: true });
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).message).toMatch(/[Tt]runcada|deslocamento/);
    }
  });
});
