import { describe, expect, it } from "vitest";
import { decodeHex, encodeHex } from "./hex.ts";
import { OperationError } from "./errors.ts";

const lower = { case: "lower", separator: "none" };

describe("Hexadecimal", () => {
  it("codifica em caixa baixa", () => {
    expect(encodeHex("AB", lower)).toBe("4142");
  });

  it("codifica em caixa alta quando pedido", () => {
    expect(encodeHex("AB", { case: "upper", separator: "none" })).toBe("4142");
    expect(encodeHex("z~", { case: "upper", separator: "none" })).toBe("7A7E");
  });

  it("separa por byte quando pedido", () => {
    expect(encodeHex("ABC", { case: "lower", separator: "space" })).toBe(
      "41 42 43",
    );
  });

  it("decodifica tolerando espaços e quebras de linha", () => {
    expect(decodeHex("41 42\n43")).toBe("ABC");
  });

  it("recusa dígito inválido apontando a posição", () => {
    try {
      decodeHex("41g2");
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).position).toBe(2);
    }
  });

  it("recusa número ímpar de dígitos", () => {
    expect(() => decodeHex("414")).toThrow(/ímpar/);
  });

  it("faz ida e volta com acentos", () => {
    const input = "ação";
    expect(decodeHex(encodeHex(input, lower))).toBe(input);
  });
});
