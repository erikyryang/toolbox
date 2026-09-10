import { describe, expect, it } from "vitest";
import { sanitizeNumeric } from "./numeric-input.ts";

describe("campo estritamente numérico", () => {
  it("mantém dígitos", () => {
    expect(sanitizeNumeric("1024")).toBe("1024");
  });

  it("descarta letras", () => {
    expect(sanitizeNumeric("1.5 GB")).toBe("1.5");
    expect(sanitizeNumeric("abc")).toBe("");
    expect(sanitizeNumeric("64 KiB")).toBe("64");
  });

  it("preserva a vírgula como vírgula", () => {
    expect(sanitizeNumeric("1,5")).toBe("1,5");
  });

  it("aceita um separador só", () => {
    expect(sanitizeNumeric("1.5.5")).toBe("1.55");
    expect(sanitizeNumeric("1,5.5")).toBe("1,55");
  });

  it("aceita sinal apenas no começo", () => {
    expect(sanitizeNumeric("-5")).toBe("-5");
    expect(sanitizeNumeric("+5")).toBe("+5");
    expect(sanitizeNumeric("5-5")).toBe("55");
    expect(sanitizeNumeric("--5")).toBe("-5");
  });

  it("descarta quebra de linha, para que o campo continue de uma linha", () => {
    expect(sanitizeNumeric("1\n2")).toBe("12");
  });

  it("descarta espaço", () => {
    expect(sanitizeNumeric(" 1 024 ")).toBe("1024");
  });

  it("deixa passar os estados intermediários da digitação", () => {
    expect(sanitizeNumeric("")).toBe("");
    expect(sanitizeNumeric("-")).toBe("-");
    expect(sanitizeNumeric(".")).toBe(".");
    expect(sanitizeNumeric("-.")).toBe("-.");
  });
});
