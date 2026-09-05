import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "./base64.ts";
import { OperationError } from "./errors.ts";

const standard = { alphabet: "standard", padding: true };
const urlsafeNoPadding = { alphabet: "urlsafe", padding: false };

describe("Base64", () => {
  it("codifica no alfabeto padrão", () => {
    expect(encodeBase64("toolbox", standard)).toBe("dG9vbGJveA==");
  });

  it("codifica no alfabeto URL-safe sem preenchimento", () => {
    // Emoji: os bytes 0xf0 0x9f produzem + no alfabeto padrão.
    const input = "😀🙃";
    const padrao = encodeBase64(input, standard);
    const urlSafe = encodeBase64(input, urlsafeNoPadding);

    expect(padrao).toMatch(/[+/]/);
    expect(urlSafe).not.toMatch(/[+/=]/);
    expect(urlSafe).toMatch(/[-_]/);
  });

  it("decodifica de volta ao texto original", () => {
    expect(decodeBase64("dG9vbGJveA==", standard)).toBe("toolbox");
  });

  it("faz ida e volta com Unicode fora do ASCII", () => {
    const input = "acentuação — ✓ 😀";
    expect(decodeBase64(encodeBase64(input, standard), standard)).toBe(input);
  });

  it("decodifica sem preenchimento", () => {
    expect(decodeBase64("dG9vbGJveA", standard)).toBe("toolbox");
  });

  it("tolera espaços e quebras de linha na entrada", () => {
    expect(decodeBase64("dG9v\nbGJv\neA==", standard)).toBe("toolbox");
  });

  it("recusa caractere fora do alfabeto selecionado e aponta a posição", () => {
    try {
      decodeBase64("dG9v*GJveA==", standard);
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).message).toContain('"*"');
      expect((error as OperationError).position).toBe(4);
    }
  });

  it("sugere a troca de variante quando o caractere é do outro alfabeto", () => {
    try {
      decodeBase64("a-b_cd", standard);
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect((error as OperationError).message).toContain("URL-safe");
    }
  });

  it("recusa preenchimento no meio da entrada", () => {
    expect(() => decodeBase64("dG9v=GJveA==", standard)).toThrow(OperationError);
  });

  it("recusa um grupo final de um único caractere", () => {
    // 9 caracteres: o último grupo tem um só, o que não completa nenhum byte.
    expect(() => decodeBase64("dG9vbGJve", standard)).toThrow(OperationError);
  });

  it("recusa bytes que não formam UTF-8 válido", () => {
    // 0xff isolado não é uma sequência UTF-8 legal.
    expect(() => decodeBase64("/w==", standard)).toThrow(OperationError);
  });
});
