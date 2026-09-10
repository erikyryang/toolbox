import { describe, expect, it } from "vitest";

import {
  decodeBase32,
  decodeBase58,
  encodeBase32,
  encodeBase58,
  fromBase58,
  toBase58,
} from "./base32-58.ts";

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
