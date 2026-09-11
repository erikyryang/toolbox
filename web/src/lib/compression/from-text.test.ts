import { describe, expect, it } from "vitest";
import { feedbackFrom } from "../messages.testing.ts";

import { OperationError } from "../engines/errors.ts";
import { toBase64, toHex } from "../engines/bytes.ts";
import { compress } from "./codecs.ts";
import { MAX_PASTED_CHARS, decodeArchiveText } from "./from-text.ts";

const encoder = new TextEncoder();

function files() {
  return [
    { name: "a.txt", data: encoder.encode("conteúdo do arquivo A\n".repeat(20)) },
    { name: "pasta/b.txt", data: encoder.encode("outro conteúdo\n".repeat(30)) },
  ];
}

const zip = await compress({ format: "zip", level: 6, files: files() });
const gzip = await compress({ format: "gzip", level: 6, files: [files()[0]] });

describe("arquivo compactado colado como texto", () => {
  it("lê Base64 padrão", () => {
    const result = decodeArchiveText(toBase64(zip));
    expect(result.encoding).toBe("base64");
    expect(result.format).toBe("zip");
    expect(result.bytes).toEqual(zip);
  });

  it("lê Base64 sem preenchimento", () => {
    expect(decodeArchiveText(toBase64(gzip, "standard", false)).format).toBe("gzip");
  });

  it("lê Base64 URL-safe", () => {
    const result = decodeArchiveText(toBase64(zip, "urlsafe"));
    expect(result.format).toBe("zip");
    expect(result.bytes).toEqual(zip);
  });

  it("lê hexadecimal", () => {
    const result = decodeArchiveText(toHex(gzip));
    expect(result.encoding).toBe("hex");
    expect(result.bytes).toEqual(gzip);
  });

  it("lê um data: URL, e registra que veio embrulhado", () => {
    const result = decodeArchiveText(`data:application/zip;base64,${toBase64(zip)}`);
    expect(result.dataUrl).toBe(true);
    expect(result.format).toBe("zip");
    expect(result.bytes).toEqual(zip);
  });

  it("tolera quebras de linha e espaços, como todo Base64 copiado de terminal", () => {
    const wrapped = toBase64(zip).replace(/(.{40})/g, "$1\n");
    expect(decodeArchiveText(`  ${wrapped}  `).bytes).toEqual(zip);
  });

  /**
   * O ponto do módulo: a decodificação é aceita porque os bytes são um
   * arquivo, não porque os caracteres pareciam Base64.
   */
  it("recusa Base64 válido cujo conteúdo não é um formato suportado", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const feedback = feedbackFrom(() => decodeArchiveText(toBase64(png)));
    expect(feedback.code).toBe("error.pasteFormat");
    expect(feedback.params?.signature).toMatch(/0x89 50 4e 47/);
  });

  it("recusa texto que não é Base64 nem hexadecimal", () => {
    expect(feedbackFrom(() => decodeArchiveText("isto não é um arquivo!!")).code).toBe("error.pasteEncoding");
  });

  it("recusa entrada vazia com uma instrução, não com um erro cru", () => {
    for (const empty of ["", "   ", "\n\n"]) {
      expect(feedbackFrom(() => decodeArchiveText(empty)).code).toBe("error.pasteEmpty");
    }
  });

  it("recusa texto acima do teto de colagem", () => {
    expect(feedbackFrom(() => decodeArchiveText("A".repeat(MAX_PASTED_CHARS + 1))).code).toBe("error.pasteLarge");
  });

  it("um dump hexadecimal não é confundido com Base64", () => {
    // Um hex dump também é composto de caracteres válidos em Base64; o que
    // desempata é a assinatura dos bytes que cada leitura produz.
    const result = decodeArchiveText(toHex(zip));
    expect(result.encoding).toBe("hex");
    expect(result.format).toBe("zip");
  });

  it("erra com clareza quando o Base64 está truncado no meio", () => {
    const truncated = toBase64(zip).slice(0, 9) + "!";
    expect(() => decodeArchiveText(truncated)).toThrow(OperationError);
  });
});
