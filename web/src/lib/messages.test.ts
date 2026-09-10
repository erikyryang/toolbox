import { describe, expect, it } from "vitest";

import { OperationError } from "./engines/errors.ts";
import { en, feedbackOf, localizeFeedback, message, pt, type MessageKey } from "./messages.ts";

/**
 * O catálogo é a única fonte do texto que o usuário lê. O que se verifica aqui
 * é o que os tipos não alcançam: que as duas traduções cobrem as mesmas
 * chaves, com os mesmos parâmetros, e que a interpolação não reinterpreta o
 * que substitui.
 */
const keys = Object.keys(en) as MessageKey[];
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Marcas de português — um texto esquecido na tradução inglesa cai aqui. */
const PORTUGUESE = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(não|para|arquivo|entrada|servidor|tente|confira)\b/i;

describe("paridade do catálogo", () => {
  it("traduz exatamente as mesmas chaves nos dois idiomas", () => {
    expect(Object.keys(pt).sort()).toEqual(keys.slice().sort());
  });

  it.each(keys)("%s carrega os mesmos parâmetros nos dois idiomas", (key) => {
    expect(placeholders(pt[key])).toEqual(placeholders(en[key]));
  });

  it("não deixa tradução vazia", () => {
    for (const key of keys) {
      expect(en[key].trim(), key).not.toBe("");
      expect(pt[key].trim(), key).not.toBe("");
    }
  });

  it("não deixou português na tradução inglesa", () => {
    for (const key of keys) {
      expect(PORTUGUESE.test(en[key]), `${key}: ${en[key]}`).toBe(false);
    }
  });
});

describe("interpolação", () => {
  it("substitui o parâmetro no idioma pedido", () => {
    expect(message("en", "error.hexCharacter", { char: '"z"' })).toBe('Character "z" is not a hexadecimal digit.');
    expect(message("pt", "error.hexCharacter", { char: '"z"' })).toBe('Caractere "z" não é um dígito hexadecimal.');
  });

  it("aceita número sem que o chamador converta", () => {
    expect(message("en", "error.http", { status: 500 })).toContain("HTTP 500");
  });

  it("deixa visível o parâmetro que faltou, em vez de apagar o trecho", () => {
    expect(message("en", "error.hexCharacter", {})).toContain("{char}");
  });

  it("não reinterpreta o conteúdo substituído", () => {
    expect(message("en", "error.signature", { signature: "{char}" })).toContain("are {char},");
  });
});

describe("composição do feedback", () => {
  it("acrescenta a posição quando o motor a conhece", () => {
    expect(localizeFeedback({ code: "error.base32Character", params: { char: '"1"' }, position: 4 }, "en"))
      .toMatch(/position 4\.$/);
  });

  it("prefere linha e coluna à posição bruta", () => {
    const text = localizeFeedback({ code: "error.json", params: { line: 3, column: 1 }, position: 12 }, "pt");
    expect(text).toMatch(/linha 3, coluna 1\.$/);
    expect(text).not.toContain("posição 12");
  });

  it("lê Retry-After como segundos ou como data", () => {
    expect(localizeFeedback({ code: "error.httpBusy", params: { retryAfter: "30" } }, "en")).toContain("in 30 seconds");
    expect(localizeFeedback({ code: "error.httpBusy", params: { retryAfter: "Wed, 21 Oct 2026 07:28:00 GMT" } }, "en"))
      .toContain("after Wed, 21 Oct 2026");
  });

  it("cai no fallback localizado quando não há feedback", () => {
    expect(localizeFeedback(undefined, "pt")).toBe(pt["error.unknown"]);
    expect(localizeFeedback(undefined, "en")).toBe(en["error.unknown"]);
  });
});

describe("leitura do feedback de um erro", () => {
  it("preserva o código de um erro de operação", () => {
    const error = new OperationError({ code: "error.zipShort" });
    expect(feedbackOf(error)).toMatchObject({ code: "error.zipShort" });
  });

  it("mantém a mensagem do Error em inglês, para log", () => {
    expect(new OperationError({ code: "error.zipShort" }).message).toBe(en["error.zipShort"]);
  });

  it("trata um erro comum como desconhecido, sem expor sua frase", () => {
    expect(feedbackOf(new Error("ENOENT: no such file"))).toEqual({ code: "error.unknown" });
    expect(feedbackOf("falhou")).toEqual({ code: "error.unknown" });
  });

  it("recusa um código que não está no catálogo", () => {
    // Chega assim pela fronteira do worker, que é dado estruturado, não tipo.
    expect(feedbackOf({ feedback: { code: "error.inventado" } })).toEqual({ code: "error.unknown" });
  });
});
