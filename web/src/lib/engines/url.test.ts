import { describe, expect, it } from "vitest";
import { decodeUrl, encodeUrl } from "./url.ts";
import { OperationError } from "./errors.ts";

const component = { scope: "component", plusForSpace: false };
const uri = { scope: "uri", plusForSpace: false };

describe("URL / percent-encoding", () => {
  it("escapa separadores no modo componente", () => {
    expect(encodeUrl("a b&c=d", component)).toBe("a%20b%26c%3Dd");
  });

  it("preserva separadores no modo URI completa", () => {
    expect(encodeUrl("https://ex.com/a b?c=d", uri)).toBe(
      "https://ex.com/a%20b?c=d",
    );
  });

  it("usa + para espaço quando a convenção de formulário está ligada", () => {
    expect(encodeUrl("a b", { scope: "component", plusForSpace: true })).toBe(
      "a+b",
    );
    expect(decodeUrl("a+b", { scope: "component", plusForSpace: true })).toBe(
      "a b",
    );
  });

  it("decodifica de volta ao texto original", () => {
    expect(decodeUrl("a%20b%26c%3Dd", component)).toBe("a b&c=d");
  });

  it("aponta a sequência percentual inválida", () => {
    try {
      decodeUrl("a%zzb", component);
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).message).toContain("%zz");
      expect((error as OperationError).position).toBe(1);
    }
  });

  it("recusa sequência que não forma UTF-8 válido", () => {
    expect(() => decodeUrl("%ff", component)).toThrow(OperationError);
  });
});
