import { describe, expect, it } from "vitest";

import { highlight, type SyntaxLanguage, type Token } from "./highlight.ts";

const text = (tokens: Token[]) => tokens.map((token) => token.text).join("");
const kindOf = (tokens: Token[], needle: string) =>
  tokens.find((token) => token.text === needle)?.kind;

/**
 * O invariante que importa: realçar não pode alterar uma vírgula sequer. Se a
 * concatenação bater com a entrada, o painel de saída mostra exatamente o que
 * o motor produziu — que é o que o botão "Copiar" vai entregar.
 */
const SAMPLES: [SyntaxLanguage, string][] = [
  ["json", '{\n  "nome": "toolbox",\n  "n": 2,\n  "ok": true,\n  "nada": null\n}'],
  ["json", '[1, -2.5, 3e10, "a\\"b", {"k": [false]}]'],
  ["json", '{"vazio": "", "escapes": "linha\\nquebra \\\\ fim"}'],
  ["json", '"só uma string"'],
  ["json", "[]"],
  ["xml", "<r>\n  <a>1</a>\n</r>"],
  ["xml", '<r a="1" b=\'2\'><b>x</b></r>'],
  ["xml", '<?xml version="1.0"?>\n<r xmlns:x="urn:x"><x:b/></r>'],
  ["xml", "<r><!-- comentário com < e > --><a/></r>"],
  ["xml", "<r><![CDATA[texto <cru> aqui]]></r>"],
  ["xml", "texto solto sem tag"],
];

describe("realce de sintaxe", () => {
  it.each(SAMPLES)("%s: preserva a entrada caractere a caractere", (language, source) => {
    expect(text(highlight(language, source))).toBe(source);
  });

  it.each(SAMPLES)("%s: não emite token vazio", (language, source) => {
    for (const token of highlight(language, source)) {
      expect(token.text.length).toBeGreaterThan(0);
    }
  });

  it("distingue chave de valor em JSON", () => {
    const tokens = highlight("json", '{"nome": "toolbox"}');
    expect(kindOf(tokens, '"nome"')).toBe("key");
    expect(kindOf(tokens, '"toolbox"')).toBe("string");
  });

  it("uma string com dois-pontos dentro não vira chave", () => {
    const tokens = highlight("json", '["a: b"]');
    expect(kindOf(tokens, '"a: b"')).toBe("string");
  });

  it("classifica números, booleanos e null", () => {
    const tokens = highlight("json", '{"a": 2, "b": true, "c": null, "d": -1.5e3}');
    expect(kindOf(tokens, "2")).toBe("number");
    expect(kindOf(tokens, "true")).toBe("atom");
    expect(kindOf(tokens, "null")).toBe("atom");
    expect(kindOf(tokens, "-1.5e3")).toBe("number");
  });

  it("uma string que começa com 'null' continua sendo string", () => {
    const tokens = highlight("json", '["nullo"]');
    expect(kindOf(tokens, '"nullo"')).toBe("string");
  });

  it("classifica elemento, atributo e valor em XML", () => {
    const tokens = highlight("xml", '<projeto nome="toolbox"/>');
    expect(kindOf(tokens, "projeto")).toBe("key");
    expect(kindOf(tokens, "nome")).toBe("attr");
    expect(kindOf(tokens, '"toolbox"')).toBe("string");
  });

  it("um comentário XML sai inteiro, sem análise interna", () => {
    // O comentário se funde à pontuação vizinha — mesma cor, menos nós no DOM.
    // O que importa é que nada dentro dele foi lido como atributo ou elemento.
    const tokens = highlight("xml", "<r><!-- <a href=x> --></r>");
    const comment = tokens.find((token) => token.text.includes("<!--"));
    expect(comment?.kind).toBe("punct");
    expect(comment?.text).toContain("<!-- <a href=x> -->");
    expect(tokens.some((token) => token.kind === "attr")).toBe(false);
  });

  it("não se perde com entrada truncada", () => {
    for (const source of ['{"a": "sem fim', "<r a=\"aberto", "<!-- sem fechar", "{"]) {
      const language: SyntaxLanguage = source.startsWith("<") ? "xml" : "json";
      expect(text(highlight(language, source))).toBe(source);
    }
  });

  it("entrada vazia devolve lista vazia", () => {
    expect(highlight("json", "")).toEqual([]);
    expect(highlight("xml", "")).toEqual([]);
  });
});
