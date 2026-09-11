import { describe, expect, it } from "vitest";

import { localizeFeedback } from "../messages.ts";
import { getOperation } from "./registry.ts";
import { runOperation } from "./run.ts";
import { defaultOptionValues } from "./types.ts";

/**
 * O motor não sabe em que idioma alguém lê: ele devolve códigos. O que muda
 * com o idioma é a apresentação, e só ela — o mesmo resultado de dados sai
 * dos dois lados.
 */
const base64 = getOperation("base64")!;
const converter = getOperation("converter-tamanho")!;
const options = (slug: string) => defaultOptionValues(getOperation(slug)!);

describe("resultado independente do idioma", () => {
  it("devolve a mesma saída, sem texto de apresentação", () => {
    const outcome = runOperation(base64, "forward", "toolbox", options("base64"));
    expect(outcome).toMatchObject({ ok: true, output: "dG9vbGJveA==", processedOn: "client" });
  });

  it("reporta o aviso como código, traduzido só na apresentação", () => {
    const outcome = runOperation(converter, "forward", "1", { ...options("converter-tamanho"), from: "gb", to: "mb", base: "1024" });
    if (!outcome.ok) throw new Error("a conversão deveria ter funcionado");
    expect(outcome.notes.map((note) => note.code)).toEqual(["note.binaryBase"]);
    expect(localizeFeedback(outcome.notes[0], "pt")).toContain("Base binária");
    expect(localizeFeedback(outcome.notes[0], "en")).toContain("Binary base");
  });
});

describe("falha independente do idioma", () => {
  const outcome = runOperation(base64, "reverse", "dG9v*GJveA==", options("base64"));

  it("carrega código e posição, não uma frase", () => {
    expect(outcome).toMatchObject({
      ok: false,
      position: 4,
      feedback: { code: "error.base64Character" },
      processedOn: "client",
    });
  });

  it("resolve o mesmo código nos dois idiomas, preservando a posição", () => {
    if (outcome.ok) throw new Error("a decodificação deveria ter falhado");
    expect(localizeFeedback(outcome.feedback, "pt")).toMatch(/^Caractere .* posição 4\.$/);
    expect(localizeFeedback(outcome.feedback, "en")).toMatch(/^Character .* position 4\.$/);
  });
});
