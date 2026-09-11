import { OperationError } from "./errors.ts";
import type { Engine, EngineResult, OptionValues } from "../operations/types.ts";
import type { Feedback } from "../messages.ts";

/**
 * Conversão entre unidades de tamanho de dados.
 *
 * Bit é a unidade canônica: toda conversão é `valor * fatorOrigem /
 * fatorDestino`, com os fatores expressos em bits. Byte é sempre 8 bits, em
 * qualquer base — o que a base decide são os degraus acima dele.
 *
 * A base não é adivinhada. Ela é opção da operação, e a nota da saída declara
 * qual foi aplicada: é a ambiguidade entre 10¹² e 2⁴⁰ que faz um disco de
 * 1 TB aparecer como 931 no sistema operacional, e esconder essa escolha
 * seria esconder justamente o que a ferramenta existe para responder.
 *
 * A entrada é um valor, não um texto: o campo da tela aceita só caractere
 * numérico, e a unidade vem exclusivamente dos seletores. Por isso aqui não
 * há leitura de sufixo nem de várias linhas — não existe como digitá-los.
 */

export const DATA_UNITS = ["bit", "byte", "kb", "mb", "gb", "tb"] as const;

export type DataUnit = (typeof DATA_UNITS)[number];

export const UNIT_LABELS: Record<DataUnit, string> = {
  bit: "bit",
  byte: "byte",
  kb: "KB",
  mb: "MB",
  gb: "GB",
  tb: "TB",
};

/** O nome IEC de cada degrau, usado na nota quando a base é 1024. */
const IEC_LABELS: Partial<Record<DataUnit, string>> = {
  kb: "KiB",
  mb: "MiB",
  gb: "GiB",
  tb: "TiB",
};

/**
 * A posição de cada unidade na escada, em degraus acima de byte. Bit é o
 * degrau atômico e fica fora dela — seu fator é 1 por definição.
 */
const STEPS: Record<Exclude<DataUnit, "bit">, number> = {
  byte: 0,
  kb: 1,
  mb: 2,
  gb: 3,
  tb: 4,
};

const BITS_PER_BYTE = 8;

export const BASES = [1000, 1024] as const;
export type Base = (typeof BASES)[number];
export const DEFAULT_BASE: Base = 1024;
export const DEFAULT_FROM: DataUnit = "gb";
export const DEFAULT_TO: DataUnit = "mb";

/** Quantos bits vale uma unidade da escada, na base dada. */
export function factorInBits(unit: DataUnit, base: Base): number {
  if (unit === "bit") return 1;
  return BITS_PER_BYTE * base ** STEPS[unit];
}

export function isDataUnit(value: string): value is DataUnit {
  return (DATA_UNITS as readonly string[]).includes(value);
}

/**
 * O valor é um número, e só. A vírgula decimal é aceita porque o produto
 * começa em português, onde é ela que se digita.
 *
 * Separador de milhar não é aceito: "1,024" seria ambíguo entre mil e vinte e
 * quatro e um vírgula zero dois quatro, e adivinhar qual é pior que pedir o
 * número limpo.
 */
const VALUE_PATTERN = /^[+-]?\d+(?:[.,]\d+)?$/;

/**
 * Enquanto se digita, o campo passa por estados que ainda não são número —
 * vazio, um sinal solto, um separador solto. Nenhum deles é falha: são a
 * metade do caminho. Só o que não pode virar número por nenhum caminho é erro.
 */
const PARTIAL_PATTERN = /^[+-]?[.,]?$/;

export function parseValue(raw: string): number | undefined {
  const text = raw.trim();
  if (PARTIAL_PATTERN.test(text)) return undefined;

  if (!VALUE_PATTERN.test(text)) {
    throw new OperationError({ code: "error.number" });
  }

  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value)) {
    throw new OperationError({ code: "error.numberRange" });
  }

  return value;
}

/**
 * Formata sem ruído de ponto flutuante e sem separador de milhar, para que a
 * saída cole em outra ferramenta sem limpeza.
 *
 * Doze dígitos significativos matam a cauda binária — 0.1 GB em MB dá 102.4,
 * e não 102.39999999999999 — sem truncar nada que importe na escada
 * oferecida. `toPrecision` devolve expoente para números grandes, e "8.8e+12"
 * não cola em lugar nenhum: nesse caso a conversão é refeita com casas fixas.
 */
export function formatNumber(value: number): string {
  if (value === 0) return "0";

  let text = value.toPrecision(12);
  if (text.includes("e")) text = value.toFixed(Math.max(0, 12 - Math.ceil(Math.log10(Math.abs(value)))));

  if (text.includes(".")) text = text.replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function readUnitOption(value: unknown, fallback: DataUnit): DataUnit {
  const text = String(value);
  return isDataUnit(text) ? text : fallback;
}

function readBase(value: unknown): Base {
  return String(value) === "1000" ? 1000 : 1024;
}

/**
 * Monta a nota que declara a convenção aplicada. Ela existe porque os degraus
 * se chamam KB, MB, GB e TB nos dois modos: o rótulo não muda com a base, mas
 * o significado sim, e o usuário precisa poder conferir o número fora daqui.
 */
function conventionNote(from: DataUnit, to: DataUnit, base: Base): Feedback | undefined {
  const scaled = [...new Set([from, to])].filter((unit) => IEC_LABELS[unit] !== undefined);
  if (scaled.length === 0) return undefined;

  const units = scaled.map((unit) =>
    base === 1024 ? `${UNIT_LABELS[unit]} = ${IEC_LABELS[unit]}` : UNIT_LABELS[unit]);
  return {
    code: base === 1024 ? "note.binaryBase" : "note.decimalBase",
    params: { units: units.join(", ") },
  };
}

function convert(input: string, from: DataUnit, to: DataUnit, base: Base): EngineResult {
  const value = parseValue(input);
  if (value === undefined) return "";

  const converted = (value * factorInBits(from, base)) / factorInBits(to, base);
  const output = formatNumber(converted);

  const note = conventionNote(from, to, base);
  return note ? { output, notes: [note] } : output;
}

/** Origem para destino, como as opções declaram. */
export const convertDataSize: Engine = (input, options: OptionValues) =>
  convert(
    input,
    readUnitOption(options.from, DEFAULT_FROM),
    readUnitOption(options.to, DEFAULT_TO),
    readBase(options.base),
  );

/**
 * O sentido inverso é o mesmo motor com as pontas trocadas. É o que faz o
 * controle de inversão fechar o ciclo: converter 1.5 GB em 1536 MB e inverter
 * devolve 1536 MB em 1.5 GB.
 */
export const convertDataSizeBack: Engine = (input, options: OptionValues) =>
  convert(
    input,
    readUnitOption(options.to, DEFAULT_TO),
    readUnitOption(options.from, DEFAULT_FROM),
    readBase(options.base),
  );
