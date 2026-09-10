import { describe, expect, it } from "vitest";

import { OperationError } from "./errors.ts";
import { formatter } from "./structured.ts";
import { normalizeResult } from "../operations/types.ts";

const out = (result: ReturnType<ReturnType<typeof formatter>>) => normalizeResult(result).output;
const notes = (result: ReturnType<ReturnType<typeof formatter>>) => normalizeResult(result).notes;

const beautifyJson = formatter("json", false);
const minifyJson = formatter("json", true);
const beautifyXml = formatter("xml", false);
const minifyXml = formatter("xml", true);

describe("beautify e minify", () => {
  it("formata JSON com 2 espaços", () => {
    expect(out(beautifyJson('{"a":{"b":1}}', { indent: "2" }))).toBe(
      '{\n  "a": {\n    "b": 1\n  }\n}',
    );
  });

  it("formata JSON com tabulação quando pedido", () => {
    expect(out(beautifyJson('{"a":1}', { indent: "tab" }))).toBe('{\n\t"a": 1\n}');
  });

  it("minifica JSON sem alterar o conteúdo", () => {
    const original = '{\n  "a": [1, 2],\n  "b": "x y"\n}';
    const minified = out(minifyJson(original, {}));
    expect(minified).toBe('{"a":[1,2],"b":"x y"}');
    expect(JSON.parse(minified)).toEqual(JSON.parse(original));
  });

  it("preserva a ordem original das chaves", () => {
    expect(out(minifyJson('{"z":1,"a":2,"m":3}', {}))).toBe('{"z":1,"a":2,"m":3}');
  });

  it("ordena as chaves quando pedido, em todos os níveis", () => {
    expect(out(minifyJson('{"z":1,"a":{"y":1,"b":2}}', { sortKeys: true }))).toBe(
      '{"a":{"b":2,"y":1},"z":1}',
    );
  });

  it("formata e minifica XML", () => {
    expect(out(beautifyXml("<r><a>1</a></r>", { indent: "2" }))).toBe(
      "<r>\n  <a>1</a>\n</r>",
    );
    expect(out(minifyXml("<r>\n  <a>1</a>\n</r>", {}))).toBe("<r><a>1</a></r>");
  });
});

describe("fidelidade dos atributos XML", () => {
  // "sem alterar o conteúdo" é o que a operação promete no subtítulo; estes
  // casos são os que a quebravam ao converter atributo em tipo JS.
  it.each([
    '<r a="true"/>',
    '<r a="false"/>',
    '<r a="01"/>',
    '<r a="1"/>',
    '<r a="1.50"/>',
    '<r a="0x1f"/>',
    '<r a="texto"/>',
    '<r a=""/>',
  ])("preserva o valor literal em %s", (source) => {
    expect(out(minifyXml(source, {}))).toBe(source);
  });

  it("preserva o valor ao reindentar um documento com vários atributos", () => {
    const source = '<r a="true" b="01" c="x"><f d="false"/></r>';
    const formatted = out(beautifyXml(source, {}));
    for (const literal of ['a="true"', 'b="01"', 'c="x"', 'd="false"']) {
      expect(formatted).toContain(literal);
    }
  });
});

describe("avisos de leitura com perda", () => {
  it("avisa sobre a convenção usada para atributos XML", () => {
    const result = beautifyXml('<r a="1"><b>x</b></r>', {});
    expect(notes(result).join(" ")).toContain("@_");
  });

  it("avisa que namespaces XML perdem a semântica", () => {
    const result = beautifyXml('<r xmlns:x="urn:x"><x:b>1</x:b></r>', {});
    expect(notes(result).join(" ")).toContain("namespace");
  });
});

describe("erros de parsing", () => {
  it("aponta linha e coluna em JSON inválido", () => {
    try {
      beautifyJson('{\n  "a": 1,\n}', {});
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).message).toMatch(/linha 3, coluna 1/);
    }
  });

  it("nomeia a tag e a posição em XML não fechado", () => {
    try {
      beautifyXml("<a><b></a>", {});
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect((error as OperationError).message).toContain("b");
      expect((error as OperationError).message).toMatch(/linha \d+/);
    }
  });
});
