import { describe, expect, it } from "vitest";
import { LANGUAGE_STORAGE_KEY, languageBootScript, localizeOperation, matchesQuery } from "./i18n.ts";
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

/**
 * O script de boot resolve o idioma antes da primeira pintura, direto no
 * documento. Roda como texto solto no `<head>`, então o teste o executa do
 * mesmo jeito: com globais falsos, e não com uma expectativa sobre a string.
 */
function bootWith(stored: string | null): string {
  const element = { lang: "" };
  const run = new Function(
    "document",
    "localStorage",
    languageBootScript,
  ) as (document: unknown, storage: unknown) => void;

  run({ documentElement: element }, {
    getItem: (key: string) => (key === LANGUAGE_STORAGE_KEY ? stored : null),
  });
  return element.lang;
}

describe("idioma padrão", () => {
  it("é inglês para quem chega sem preferência salva", () => {
    expect(bootWith(null)).toBe("en");
  });

  it("respeita o português de quem escolheu", () => {
    expect(bootWith("pt")).toBe("pt-BR");
  });

  it("cai no padrão quando o valor salvo não faz sentido", () => {
    expect(bootWith("klingon")).toBe("en");
  });
});

describe("descritivo dos sentidos dos formatadores", () => {
  for (const slug of ["json-format", "xml-format"]) {
    const meta = operationMetaBySlug(slug)!;
    const name = slug === "json-format" ? "JSON" : "XML";

    it(`explica beautify e minify de ${name} em português`, () => {
      expect(meta.forward.help).toContain("Reindenta");
      expect(meta.forward.help).toContain(name);
      expect(meta.reverse?.help).toContain("menos bytes");
    });

    it(`explica beautify e minify de ${name} em inglês`, () => {
      const english = localizeOperation(meta, "en");
      expect(english.forward.help).toBe(
        `Re-indents with line breaks and indentation, to read and review the ${name}.`,
      );
      expect(english.reverse?.help).toContain("fewer bytes");
      // O rótulo de saída também era português numa tela em inglês.
      expect(english.forward.outputLabel).toBe(`Formatted ${name}`);
      expect(english.reverse?.outputLabel).toBe(`Minified ${name}`);
    });
  }

  it("não inventa descritivo para quem não tem", () => {
    expect(operationMetaBySlug("base64")!.forward.help).toBeUndefined();
    expect(localizeOperation(operationMetaBySlug("base64")!, "en").forward.help).toBeUndefined();
  });
});
