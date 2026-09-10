import { OperationError } from "./errors.ts";
import type { Engine, EngineResult, OptionValues } from "../operations/types.ts";

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

/**
 * Sinônimos aceitos na entrada. As formas IEC entram como sinônimo do degrau
 * correspondente, e não como unidade própria: a base já é escolhida à parte, e
 * ter duas fontes de verdade para ela seria ter duas fontes discordando.
 */
const UNIT_ALIASES: Record<string, DataUnit> = {
  b: "byte",
  bit: "bit",
  bits: "bit",
  byte: "byte",
  bytes: "byte",
  kb: "kb",
  kib: "kb",
  kbyte: "kb",
  kilobyte: "kb",
  kilobytes: "kb",
  mb: "mb",
  mib: "mb",
  mbyte: "mb",
  megabyte: "mb",
  megabytes: "mb",
  gb: "gb",
  gib: "gb",
  gbyte: "gb",
  gigabyte: "gb",
  gigabytes: "gb",
  tb: "tb",
  tib: "tb",
  tbyte: "tb",
  terabyte: "tb",
  terabytes: "tb",
};

export function isDataUnit(value: string): value is DataUnit {
  return (DATA_UNITS as readonly string[]).includes(value);
}

function readUnit(raw: string, line: number): DataUnit {
  const unit = UNIT_ALIASES[raw.toLowerCase()];
  if (!unit) {
    throw new OperationError(
      `Unidade não reconhecida na linha ${line}: "${raw}". Use bit, byte, KB, MB, GB ou TB.`,
    );
  }
  return unit;
}

/**
 * Uma linha é `número [unidade]`. A unidade escrita junto vence a seleção,
 * porque quem cola "1.5 GB" de um relatório não quer ajustar um seletor
 * antes — é assim que o valor aparece no mundo.
 *
 * A vírgula decimal é aceita porque o produto começa em português, onde é ela
 * que se digita. Separador de milhar não é aceito: "1,024" seria ambíguo
 * entre mil e vinte e quatro e um vírgula zero dois quatro, e adivinhar qual
 * é pior que pedir o número limpo.
 */
const LINE_PATTERN = /^([+-]?\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)$/;

export function parseLine(
  raw: string,
  fallback: DataUnit,
  line: number,
): { value: number; unit: DataUnit } {
  const match = LINE_PATTERN.exec(raw.trim());
  if (!match) {
    throw new OperationError(
      `Não é um valor reconhecível na linha ${line}: "${raw.trim()}". Esperado um número, com unidade opcional — por exemplo "1.5 GB".`,
    );
  }

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value)) {
    throw new OperationError(`Número fora de faixa na linha ${line}: "${raw.trim()}".`);
  }

  return { value, unit: match[2] === "" ? fallback : readUnit(match[2], line) };
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
function conventionNote(from: DataUnit, to: DataUnit, base: Base): string | undefined {
  const scaled = [...new Set([from, to])].filter((unit) => IEC_LABELS[unit] !== undefined);
  if (scaled.length === 0) return undefined;

  if (base === 1024) {
    const equivalences = scaled.map((unit) => `${UNIT_LABELS[unit]} = ${IEC_LABELS[unit]}`);
    return `Base binária (1024): ${equivalences.join(", ")}.`;
  }

  const names = scaled.map((unit) => UNIT_LABELS[unit]);
  return `Base decimal (1000): ${names.join(" e ")} no sentido SI, e não os degraus de 1024 que o sistema operacional reporta.`;
}

function convert(input: string, from: DataUnit, to: DataUnit, base: Base): EngineResult {
  if (input.trim() === "") return "";

  const fromFactor = factorInBits(from, base);
  const toFactor = factorInBits(to, base);

  const output = input
    .split(/\r\n|\r|\n/)
    .map((raw, index) => {
      if (raw.trim() === "") return "";
      const { value, unit } = parseLine(raw, from, index + 1);
      const factor = unit === from ? fromFactor : factorInBits(unit, base);
      return formatNumber((value * factor) / toFactor);
    })
    .join("\n");

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
