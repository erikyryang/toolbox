import { describe, expect, it } from "vitest";
import { operationMetaBySlug } from "../operations/catalog.ts";
import { defaultOptionValues } from "../operations/types.ts";
import { SEPARATORS, joinLines } from "./lines.ts";

/**
 * Os testes fixam as opções que exercitam: o padrão do catálogo é não mexer em
 * nada (separador vazio, sem aparo, sem descarte), e cada caso abaixo diz o
 * que liga.
 */
const defaults = { separator: "comma-space", trim: true, dropEmpty: true };

const join = (input: string, options: Record<string, string | boolean> = {}) =>
  joinLines(input, { ...defaults, ...options }) as string;

describe("juntar linhas", () => {
  it("junta três linhas com vírgula e espaço", () => {
    expect(join("nome\nidade\nemail")).toBe("nome, idade, email");
  });

  it("devolve a própria entrada quando não há quebra de linha", () => {
    expect(join("uma linha só")).toBe("uma linha só");
  });

  it("devolve vazio para entrada vazia", () => {
    expect(join("")).toBe("");
    expect(join("", { trim: false, dropEmpty: false })).toBe("");
  });

  it("aceita cada um dos sete separadores", () => {
    const cases: [string, string][] = [
      ["none", "abcdef"],
      ["space", "abc def"],
      ["comma", "abc,def"],
      ["comma-space", "abc, def"],
      ["semicolon", "abc;def"],
      ["pipe", "abc|def"],
      ["tab", "abc\tdef"],
    ];

    for (const [separator, expected] of cases) {
      expect(join("abc\ndef", { separator }), separator).toBe(expected);
    }
    expect(Object.keys(SEPARATORS)).toHaveLength(cases.length);
  });

  it("não coloca separador antes da primeira nem depois da última linha", () => {
    for (const separator of Object.keys(SEPARATORS)) {
      const output = join("a\nb\nc", { separator });
      const character = SEPARATORS[separator];
      if (character === "") continue;
      expect(output.startsWith(character), separator).toBe(false);
      expect(output.endsWith(character), separator).toBe(false);
    }
  });

  it("apara os espaços das pontas de cada linha", () => {
    expect(join("  nome  \n  idade")).toBe("nome, idade");
  });

  it("preserva os espaços quando o aparo está desligado", () => {
    expect(join("  nome  \n  idade", { trim: false, dropEmpty: false })).toBe(
      "  nome  ,   idade",
    );
  });

  it("descarta as linhas vazias do meio", () => {
    expect(join("a\n\nb", { separator: "comma" })).toBe("a,b");
  });

  it("conta linha só de espaços como vazia quando o aparo está ligado", () => {
    expect(join("a\n   \nb", { separator: "comma" })).toBe("a,b");
  });

  it("preserva as linhas vazias quando o descarte está desligado", () => {
    expect(join("a\n\nb", { separator: "comma", dropEmpty: false })).toBe("a,,b");
  });

  it("não termina com separador solto quando a entrada termina em quebra", () => {
    expect(join("a\nb\n", { separator: "comma" })).toBe("a,b");
  });

  it("reconhece os finais de linha do Windows", () => {
    const output = join("a\r\nb\r\nc");
    expect(output).toBe("a, b, c");
    expect(output).not.toMatch(/[\r\n]/);
  });

  it("reconhece o retorno de carro sozinho", () => {
    expect(join("a\rb", { separator: "comma" })).toBe("a,b");
  });

  it("trata mistura de finais de linha igualmente", () => {
    const output = join("a\nb\r\nc\rd", { separator: "comma" });
    expect(output).toBe("a,b,c,d");
    expect(output).not.toMatch(/[\r\n]/);
  });

  it("cai no separador padrão quando o valor é desconhecido", () => {
    // O padrão do catálogo é "nada": um valor perdido não inventa pontuação.
    expect(join("a\nb", { separator: "inexistente" })).toBe("ab");
  });
});

describe("padrões da tela", () => {
  const meta = operationMetaBySlug("juntar-linhas")!;
  const values = defaultOptionValues(meta);

  it("não mexe em nada além de tirar as quebras", () => {
    expect(values).toEqual({ separator: "none", trim: false, dropEmpty: false });
    // O que entra volta igual, menos as quebras: nenhuma pontuação inventada,
    // nenhum espaço aparado, nenhuma linha sumida sem a pessoa pedir.
    expect(joinLines("  a  \n\nb\n", values)).toBe("  a  b");
  });

  it("cada opção ligada faz uma coisa só", () => {
    expect(joinLines("  a  \n\nb\n", { ...values, trim: true })).toBe("ab");
    expect(joinLines("  a  \n\nb\n", { ...values, dropEmpty: true })).toBe("  a  b");
    expect(joinLines("  a  \n\nb\n", { ...values, separator: "comma" })).toBe("  a  ,,b,");
  });
});
