import { describe, expect, it } from "vitest";
import { OperationError } from "./errors.ts";
import { localizeFeedback, type Feedback } from "../messages.ts";
import type { Language } from "../i18n.ts";
import {
  convertDataSize,
  convertDataSizeBack,
  factorInBits,
  formatNumber,
  parseValue,
} from "./data-size.ts";

/** As opções como a tela as entrega: strings, vindas dos seletores. */
function options(from: string, to: string, base: string) {
  return { from, to, base };
}

function output(result: ReturnType<typeof convertDataSize>): string {
  return typeof result === "string" ? result : result.output;
}

function notes(result: ReturnType<typeof convertDataSize>): Feedback[] {
  return typeof result === "string" ? [] : (result.notes ?? []);
}

function noteText(result: ReturnType<typeof convertDataSize>, language: Language): string[] {
  return notes(result).map((note) => localizeFeedback(note, language));
}

describe("escada de unidades", () => {
  it("um degrau acima de byte escala pela base", () => {
    expect(output(convertDataSize("1", options("gb", "mb", "1000")))).toBe("1000");
    expect(output(convertDataSize("1", options("gb", "mb", "1024")))).toBe("1024");
  });

  it("1 TB em GB é 1000 na base decimal e 1024 na binária", () => {
    expect(output(convertDataSize("1", options("tb", "gb", "1000")))).toBe("1000");
    expect(output(convertDataSize("1", options("tb", "gb", "1024")))).toBe("1024");
  });

  it("atravessa vários degraus de uma vez", () => {
    expect(output(convertDataSize("1", options("tb", "mb", "1000")))).toBe("1000000");
    expect(output(convertDataSize("1", options("gb", "byte", "1024")))).toBe("1073741824");
  });

  it("converte valor fracionário", () => {
    expect(output(convertDataSize("1.5", options("gb", "mb", "1000")))).toBe("1500");
    expect(output(convertDataSize("1.5", options("gb", "mb", "1024")))).toBe("1536");
  });

  it("aceita vírgula como separador decimal", () => {
    expect(output(convertDataSize("1,5", options("gb", "mb", "1000")))).toBe("1500");
  });

  it("origem igual ao destino repete o valor", () => {
    expect(output(convertDataSize("42", options("mb", "mb", "1024")))).toBe("42");
  });

  it("desce a escada tanto quanto sobe", () => {
    expect(output(convertDataSize("1536", options("mb", "gb", "1024")))).toBe("1.5");
  });
});

describe("bit e byte", () => {
  it("um byte são oito bits em qualquer base", () => {
    expect(output(convertDataSize("1", options("byte", "bit", "1000")))).toBe("8");
    expect(output(convertDataSize("1", options("byte", "bit", "1024")))).toBe("8");
  });

  it("a base não altera a conversão entre bit e byte", () => {
    const decimal = output(convertDataSize("4096", options("bit", "byte", "1000")));
    const binary = output(convertDataSize("4096", options("bit", "byte", "1024")));
    expect(decimal).toBe("512");
    expect(binary).toBe(decimal);
  });

  it("bit vale 1 e byte vale 8 na tabela de fatores", () => {
    expect(factorInBits("bit", 1000)).toBe(1);
    expect(factorInBits("bit", 1024)).toBe(1);
    expect(factorInBits("byte", 1024)).toBe(8);
    expect(factorInBits("kb", 1024)).toBe(8 * 1024);
  });

  it("um KB em bits segue a base escolhida", () => {
    expect(output(convertDataSize("1", options("kb", "bit", "1000")))).toBe("8000");
    expect(output(convertDataSize("1", options("kb", "bit", "1024")))).toBe("8192");
  });
});

describe("leitura do valor", () => {
  it("lê o número da entrada", () => {
    expect(parseValue("2048")).toBe(2048);
    expect(parseValue("1.5")).toBe(1.5);
  });

  it("aceita vírgula como separador decimal", () => {
    expect(parseValue("1,5")).toBe(1.5);
  });

  it("ignora espaço nas pontas", () => {
    expect(parseValue("  1024  ")).toBe(1024);
  });

  it("aceita sinal", () => {
    expect(parseValue("-2")).toBe(-2);
    expect(parseValue("+2")).toBe(2);
  });

  it("a unidade vem do seletor, e só dele", () => {
    expect(output(convertDataSize("2048", options("mb", "gb", "1024")))).toBe("2");
    expect(output(convertDataSize("2048", options("kb", "mb", "1024")))).toBe("2");
  });
});

describe("formatação", () => {
  it("resultado inteiro não ganha casas decimais", () => {
    expect(formatNumber(1024)).toBe("1024");
    expect(output(convertDataSize("1", options("gb", "mb", "1024")))).toBe("1024");
  });

  it("não deixa cauda de ponto flutuante", () => {
    expect(output(convertDataSize("0.1", options("gb", "mb", "1024")))).toBe("102.4");
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
  });

  it("não usa notação exponencial em valor grande", () => {
    const result = output(convertDataSize("1", options("tb", "bit", "1024")));
    expect(result).not.toContain("e");
    expect(result).toBe("8796093022208");
  });

  it("não usa separador de milhar", () => {
    expect(output(convertDataSize("1", options("tb", "mb", "1000")))).toBe("1000000");
  });

  it("zero é zero", () => {
    expect(output(convertDataSize("0", options("gb", "mb", "1024")))).toBe("0");
  });
});

describe("nota de convenção", () => {
  it("declara a base binária e o nome IEC do degrau", () => {
    const result = convertDataSize("1", options("gb", "mb", "1024"));
    expect(notes(result)[0]).toEqual({ code: "note.binaryBase", params: { units: "GB = GiB, MB = MiB" } });
    expect(noteText(result, "pt")[0]).toContain("1024");
  });

  it("declara a base decimal", () => {
    const result = convertDataSize("1", options("gb", "mb", "1000"));
    expect(notes(result)[0]?.code).toBe("note.decimalBase");
    expect(noteText(result, "en")[0]).toContain("1000");
  });

  it("não repete o degrau quando origem e destino são o mesmo", () => {
    const result = convertDataSize("1", options("gb", "gb", "1024"));
    expect(notes(result)[0]?.params).toEqual({ units: "GB = GiB" });
    expect(noteText(result, "pt")[0]).toBe("Base binária (1024): GB = GiB.");
  });

  it("não há nota quando a conversão é só entre bit e byte", () => {
    expect(notes(convertDataSize("8", options("bit", "byte", "1024")))).toEqual([]);
  });
});

describe("sentido inverso", () => {
  it("troca origem e destino", () => {
    const opts = options("gb", "mb", "1024");
    expect(output(convertDataSize("1.5", opts))).toBe("1536");
    expect(output(convertDataSizeBack("1536", opts))).toBe("1.5");
  });

  it("fecha o ciclo em qualquer base", () => {
    const opts = options("tb", "byte", "1000");
    const forward = output(convertDataSize("2", opts));
    expect(output(convertDataSizeBack(forward, opts))).toBe("2");
  });
});

describe("valor incompleto e inválido", () => {
  it("entrada vazia devolve saída vazia, sem erro", () => {
    expect(output(convertDataSize("", options("gb", "mb", "1024")))).toBe("");
    expect(output(convertDataSizeBack("", options("gb", "mb", "1024")))).toBe("");
  });

  it("sinal sozinho ainda não é número, e não é erro", () => {
    expect(parseValue("-")).toBeUndefined();
    expect(output(convertDataSize("-", options("gb", "mb", "1024")))).toBe("");
  });

  it("separador sozinho ainda não é número, e não é erro", () => {
    expect(parseValue(".")).toBeUndefined();
    expect(parseValue(",")).toBeUndefined();
    expect(output(convertDataSize(".", options("gb", "mb", "1024")))).toBe("");
  });

  it("só espaço em branco devolve vazio", () => {
    expect(output(convertDataSize("   ", options("gb", "mb", "1024")))).toBe("");
  });

  /*
   * O campo da tela recusa letra na digitação, então estes casos não chegam
   * pela interface. O motor é função pura e precisa se defender mesmo assim:
   * é o que o teste do registro cobre para toda operação.
   */
  it("valor irreconhecível é erro legível", () => {
    expect(() => convertDataSize("mais ou menos dois", options("gb", "mb", "1024"))).toThrow(
      OperationError,
    );
  });

  it("separador de milhar não é aceito, para não virar adivinhação", () => {
    expect(() => convertDataSize("1.024,5", options("gb", "mb", "1024"))).toThrow(
      OperationError,
    );
  });

  it("a mensagem diz o que era esperado", () => {
    try {
      convertDataSize("abc", options("gb", "mb", "1024"));
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect((error as OperationError).message).toContain("1024");
    }
  });
});
