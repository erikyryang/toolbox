import { describe, expect, it } from "vitest";

import { OperationError } from "./errors.ts";
import { convert, formatter } from "./structured.ts";
import { normalizeResult } from "../operations/types.ts";

const out = (result: ReturnType<typeof convert>) => normalizeResult(result).output;
const notes = (result: ReturnType<typeof convert>) => normalizeResult(result).notes;

describe("conversão entre formatos", () => {
  it("converte JSON em YAML", () => {
    expect(out(convert("json", "yaml", '{"nome":"toolbox","n":2}', {}))).toBe(
      "nome: toolbox\nn: 2\n",
    );
  });

  it("converte YAML em JSON", () => {
    expect(out(convert("yaml", "json", "nome: toolbox\nn: 2\n", {}))).toBe(
      '{\n  "nome": "toolbox",\n  "n": 2\n}',
    );
  });

  it("faz ida e volta JSON → YAML → JSON preservando a estrutura", () => {
    const original = '{"a":{"b":[1,2,{"c":true}]},"d":null}';
    const yaml = out(convert("json", "yaml", original, {}));
    expect(JSON.parse(out(convert("yaml", "json", yaml, {})))).toEqual(
      JSON.parse(original),
    );
  });

  it("converte XML em JSON e de volta", () => {
    const json = out(convert("xml", "json", "<r><a>1</a></r>", {}));
    expect(out(convert("json", "xml", json, {}))).toContain("<a>1</a>");
  });

  it("converte JSON em CSV", () => {
    expect(out(convert("json", "csv", '[{"a":1,"b":2},{"a":3,"b":4}]', {}))).toBe(
      "a,b\n1,2\n3,4",
    );
  });

  it("converte CSV em JSON", () => {
    expect(JSON.parse(out(convert("csv", "json", "a,b\n1,2", {})))).toEqual([
      { a: "1", b: "2" },
    ]);
  });

  it("preserva a ordem original das chaves", () => {
    const yaml = out(convert("json", "yaml", '{"z":1,"a":2,"m":3}', {}));
    expect(yaml).toBe("z: 1\na: 2\nm: 3\n");
  });

  it("ordena as chaves quando pedido, em todos os níveis", () => {
    const yaml = out(
      convert("json", "yaml", '{"z":1,"a":{"y":1,"b":2}}', { sortKeys: true }),
    );
    expect(yaml).toBe("a:\n  b: 2\n  y: 1\nz: 1\n");
  });
});

describe("avisos de conversão com perda", () => {
  it("avisa que âncoras YAML foram expandidas", () => {
    const result = convert("yaml", "json", "base: &b {x: 1}\nuso: *b\n", {});
    expect(notes(result).join(" ")).toContain("âncora");
    expect(JSON.parse(out(result))).toEqual({ base: { x: 1 }, uso: { x: 1 } });
  });

  it("avisa sobre a convenção usada para atributos XML", () => {
    const result = convert("xml", "json", '<r a="1"><b>x</b></r>', {});
    expect(notes(result).join(" ")).toContain("@_");
    expect(out(result)).toContain('"@_a"');
  });

  it("avisa que namespaces XML perdem a semântica", () => {
    const result = convert("xml", "json", '<r xmlns:x="urn:x"><x:b>1</x:b></r>', {});
    expect(notes(result).join(" ")).toContain("namespace");
  });

  it("achata estrutura aninhada ao virar CSV, avisando", () => {
    const result = convert("json", "csv", '[{"a":1,"b":{"c":2}}]', {});
    expect(out(result)).toBe("a,b.c\n1,2");
    expect(notes(result).join(" ")).toContain("achatadas");
  });

  it("envolve valor sem raiz única ao virar XML, avisando", () => {
    const result = convert("json", "xml", '{"a":1,"b":2}', {});
    expect(out(result)).toContain("<root>");
    expect(notes(result).join(" ")).toContain("raiz");
  });
});

describe("opções de CSV", () => {
  it("usa o delimitador escolhido nos dois sentidos", () => {
    const json = out(convert("csv", "json", "a;b\n1;2", { delimiter: "semicolon" }));
    expect(JSON.parse(json)).toEqual([{ a: "1", b: "2" }]);
    expect(out(convert("json", "csv", json, { delimiter: "semicolon" }))).toBe(
      "a;b\n1;2",
    );
  });

  it("sem cabeçalho, cada linha vira uma lista de valores", () => {
    const result = convert("csv", "json", "1,2\n3,4", { header: false });
    expect(JSON.parse(out(result))).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(notes(result).join(" ")).toContain("Sem cabeçalho");
  });

  it("cita campos que contêm o delimitador e sobrevive à volta", () => {
    const json = out(convert("csv", "json", 'a,b\n"x,y",2', {}));
    expect(JSON.parse(json)).toEqual([{ a: "x,y", b: "2" }]);
    expect(out(convert("json", "csv", json, {}))).toBe('a,b\n"x,y",2');
  });

  it("cita campos com quebra de linha", () => {
    const csv = out(convert("json", "csv", '[{"a":"x\\ny"}]', {}));
    expect(csv).toBe('a\n"x\ny"');
    expect(JSON.parse(out(convert("csv", "json", csv, {})))).toEqual([{ a: "x\ny" }]);
  });

  it("converte tipos quando pedido", () => {
    expect(JSON.parse(out(convert("csv", "json", "a,b\n1,true", { typed: true })))).toEqual(
      [{ a: 1, b: true }],
    );
  });
});

describe("beautify e minify", () => {
  const beautifyJson = formatter("json", false);
  const minifyJson = formatter("json", true);
  const beautifyXml = formatter("xml", false);
  const minifyXml = formatter("xml", true);

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

  it("formata e minifica XML", () => {
    expect(out(beautifyXml("<r><a>1</a></r>", { indent: "2" }))).toBe(
      "<r>\n  <a>1</a>\n</r>",
    );
    expect(out(minifyXml("<r>\n  <a>1</a>\n</r>", {}))).toBe("<r><a>1</a></r>");
  });
});

describe("erros de parsing", () => {
  it("aponta linha e coluna em JSON inválido", () => {
    try {
      convert("json", "yaml", '{\n  "a": 1,\n}', {});
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).message).toMatch(/linha 3, coluna 1/);
    }
  });

  it("nomeia a tag e a posição em XML não fechado", () => {
    try {
      convert("xml", "json", "<a><b></a>", {});
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect((error as OperationError).message).toContain("b");
      expect((error as OperationError).message).toMatch(/linha \d+/);
    }
  });

  it("aponta a linha em YAML inválido", () => {
    try {
      convert("yaml", "json", "a: 1\n b: 2\n  c: 3\n", {});
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).message).toMatch(/linha \d+/);
    }
  });
});
