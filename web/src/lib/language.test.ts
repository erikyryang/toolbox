import { describe, expect, it } from "vitest";
import { localizeOperation, matchesQuery } from "./language.tsx";
import { operationMetaBySlug } from "./operations/catalog.ts";

/**
 * A tradução casa por slug e por string literal de rótulo. Um rótulo novo que
 * ninguém traduziu não quebra nada — ele simplesmente aparece em português
 * numa tela em inglês. Daí este teste.
 */
const PORTUGUESE = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(de|da|do|com|para|linhas?|em|uma?|espaços?)\b/i;

describe("tradução da junção de linhas", () => {
  const meta = operationMetaBySlug("juntar-linhas")!;
  const english = localizeOperation(meta, "en");

  it("não cai no atalho genérico dos formatadores", () => {
    expect(/^(json|xml)-format$/.test(meta.slug)).toBe(false);
    expect(english.title).toBe("Join lines");
  });

  it("traduz título, subtítulo, descrição e o sentido", () => {
    for (const value of [english.name, english.title, english.subtitle, english.description]) {
      expect(value, value).not.toMatch(PORTUGUESE);
    }
    expect(english.forward).toEqual({
      label: "Join",
      inputLabel: "Text",
      outputLabel: "Single line",
    });
    expect(english.reverse).toBeUndefined();
  });

  it("traduz rótulo, ajuda e todas as escolhas de cada opção", () => {
    for (const option of english.options) {
      expect(option.label, option.id).not.toMatch(PORTUGUESE);
      if (option.help) expect(option.help, option.id).not.toMatch(PORTUGUESE);
      if (option.kind === "select") {
        for (const choice of option.choices) {
          expect(choice.label, `${option.id}/${choice.value}`).not.toMatch(PORTUGUESE);
        }
      }
    }
  });

  it("preserva o português quando o idioma é português", () => {
    expect(localizeOperation(meta, "pt")).toBe(meta);
  });
});

describe("busca da junção de linhas", () => {
  const meta = operationMetaBySlug("juntar-linhas")!;

  it("é encontrada pelos termos da tarefa, e não só pelo nome", () => {
    for (const term of ["join lines", "join", "remover quebras", "uma linha", "unir linhas", "juntar"]) {
      expect(matchesQuery(meta, term, "pt"), term).toBe(true);
    }
  });

  it("é encontrada com a interface em inglês", () => {
    for (const term of ["join lines", "one line", "join"]) {
      expect(matchesQuery(meta, term, "en"), term).toBe(true);
    }
  });

  it("não responde a termos de outra operação", () => {
    for (const term of ["base64", "beautify", "unzip"]) {
      expect(matchesQuery(meta, term, "pt"), term).toBe(false);
    }
  });
});
