import { describe, expect, it } from "vitest";

import { localizeFeedback } from "../messages.ts";
import { failure } from "./backend.ts";

/**
 * O backend Go continua respondendo o que sempre respondeu, em português e em
 * prosa própria. O cliente lê o status, escolhe um código e traduz — a frase
 * remota nunca chega à tela.
 */
const respond = (status: number, headers: Record<string, string> = {}) =>
  failure(new Response(JSON.stringify({ error: "arquivo grande demais, tente outro" }), { status, headers }));

describe("erro do backend", () => {
  it("orienta a diminuir o arquivo em 413", () => {
    const { feedback } = respond(413);
    expect(feedback.code).toBe("error.httpTooLarge");
    expect(localizeFeedback(feedback, "en")).toContain("too large");
    expect(localizeFeedback(feedback, "pt")).toContain("grande demais");
  });

  it.each([429, 503])("pede para esperar em %i, com o Retry-After em segundos", (status) => {
    const { feedback } = respond(status, { "Retry-After": "30" });
    expect(feedback.code).toBe("error.httpBusy");
    expect(localizeFeedback(feedback, "en")).toBe("The server is busy. Try again later. Try again in 30 seconds.");
    expect(localizeFeedback(feedback, "pt")).toContain("Tente novamente em 30 segundos.");
  });

  it("preserva um Retry-After em data", () => {
    const { feedback } = respond(503, { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" });
    expect(localizeFeedback(feedback, "pt")).toContain("após Wed, 21 Oct 2026 07:28:00 GMT");
  });

  it("não inventa espera quando o cabeçalho não veio", () => {
    expect(localizeFeedback(respond(503).feedback, "en")).toBe("The server is busy. Try again later.");
  });

  it("nomeia o status nos demais casos", () => {
    const { feedback } = respond(500);
    expect(feedback.code).toBe("error.http");
    expect(localizeFeedback(feedback, "pt")).toContain("HTTP 500");
  });

  it("nunca repete a frase que o servidor mandou", () => {
    for (const status of [413, 429, 500, 503]) {
      expect(localizeFeedback(respond(status).feedback, "pt")).not.toContain("tente outro");
    }
  });
});
