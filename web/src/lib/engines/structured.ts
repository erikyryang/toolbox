import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import Papa from "papaparse";
import { parseDocument, stringify as yamlStringify, visit } from "yaml";

import type { Engine, EngineResult, OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";

/**
 * Conversão entre JSON, YAML, XML e CSV.
 *
 * Todos os pares passam por um mesmo pivô — um valor JavaScript comum. É o que
 * permite oferecer as doze direções com um único motor, e é também onde a
 * conversão perde informação: cada formato representa coisas que os outros não
 * têm. Onde isso acontece, o motor produz a melhor conversão possível e diz o
 * que ficou pelo caminho, em vez de falhar ou de calar.
 */

export type Format = "json" | "yaml" | "xml" | "csv";

export const FORMAT_LABELS: Record<Format, string> = {
  json: "JSON",
  yaml: "YAML",
  xml: "XML",
  csv: "CSV",
};

const XML_ATTRIBUTE_PREFIX = "@_";
const XML_TEXT_NODE = "#text";
/** Nome do elemento raiz quando o valor não traz um. */
const XML_ROOT = "root";
const XML_ITEM = "item";

type Parsed = { value: unknown; notes: string[] };

// ---------------------------------------------------------------------------
// Erros com posição
// ---------------------------------------------------------------------------

function lineColumnAt(input: string, position: number): { line: number; column: number } {
  const upTo = input.slice(0, Math.max(0, position));
  const lines = upTo.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function jsonParseError(input: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "JSON inválido";
  const match = /position (\d+)/.exec(message);

  if (match) {
    const position = Number(match[1]);
    const { line, column } = lineColumnAt(input, position);
    const reason = message.split(/ in JSON at position/)[0];
    throw new OperationError(
      `${reason} — linha ${line}, coluna ${column}.`,
      position,
    );
  }

  throw new OperationError(`JSON inválido: ${message}`);
}

// ---------------------------------------------------------------------------
// Parsing por formato
// ---------------------------------------------------------------------------

function parseJson(input: string): Parsed {
  try {
    return { value: JSON.parse(input), notes: [] };
  } catch (error) {
    jsonParseError(input, error);
  }
}

function parseYaml(input: string): Parsed {
  const doc = parseDocument(input, { merge: true });

  if (doc.errors.length > 0) {
    const error = doc.errors[0];
    const [line, column] = error.linePos
      ? [error.linePos[0].line, error.linePos[0].col]
      : [0, 0];
    throw new OperationError(
      line > 0
        ? `${error.message.split("\n")[0]} — linha ${line}, coluna ${column}.`
        : `YAML inválido: ${error.message.split("\n")[0]}`,
      error.pos?.[0],
    );
  }

  const notes: string[] = [];
  let aliases = 0;
  visit(doc, {
    Alias() {
      aliases += 1;
    },
  });
  if (aliases > 0) {
    notes.push(
      `O documento usa ${aliases} alias(es) de âncora; eles foram expandidos, porque âncoras não existem nos outros formatos.`,
    );
  }
  if (doc.commentBefore || doc.comment) {
    notes.push("Comentários do YAML não sobrevivem à conversão.");
  }

  return { value: doc.toJS({ maxAliasCount: -1 }), notes };
}

function parseXml(input: string): Parsed {
  const validation = XMLValidator.validate(input, { allowBooleanAttributes: true });
  if (validation !== true) {
    const { msg, line, col } = validation.err;
    throw new OperationError(`${msg} — linha ${line}, coluna ${col}.`);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE_PREFIX,
    textNodeName: XML_TEXT_NODE,
    parseAttributeValue: true,
    trimValues: true,
  });

  const value = parser.parse(input);
  const notes: string[] = [];

  if (input.includes("=") && JSON.stringify(value).includes(`"${XML_ATTRIBUTE_PREFIX}`)) {
    notes.push(
      `Atributos XML viraram chaves com o prefixo "${XML_ATTRIBUTE_PREFIX}"; texto de elemento misto virou a chave "${XML_TEXT_NODE}".`,
    );
  }
  if (/xmlns(:[a-zA-Z0-9_-]+)?=/.test(input)) {
    notes.push(
      "Declarações de namespace viraram atributos comuns — a semântica de namespace não é preservada.",
    );
  }

  return { value, notes };
}

function parseCsv(input: string, options: OptionValues): Parsed {
  const delimiter = delimiterOf(options);
  const header = options.header !== false;

  const result = Papa.parse<Record<string, unknown> | unknown[]>(input.trim(), {
    delimiter,
    header,
    quoteChar: quoteCharOf(options),
    skipEmptyLines: true,
    dynamicTyping: options.typed === true,
  });

  const fatal = result.errors.find((error) => error.type !== "FieldMismatch");
  if (fatal) {
    throw new OperationError(
      `CSV inválido: ${fatal.message}${
        typeof fatal.row === "number" ? ` — linha ${fatal.row + 1}.` : "."
      }`,
    );
  }

  const notes: string[] = [];
  const mismatch = result.errors.find((error) => error.type === "FieldMismatch");
  if (mismatch) {
    notes.push(
      `Alguma linha tem número de campos diferente do cabeçalho (a partir da linha ${
        typeof mismatch.row === "number" ? mismatch.row + 1 : "?"
      }).`,
    );
  }
  if (!header) {
    notes.push("Sem cabeçalho: cada linha virou uma lista de valores.");
  }

  return { value: result.data, notes };
}

// ---------------------------------------------------------------------------
// Serialização por formato
// ---------------------------------------------------------------------------

function indentOf(options: OptionValues): string | number {
  if (options.indent === "tab") return "\t";
  const size = Number(options.indent);
  return Number.isFinite(size) && size > 0 ? size : 2;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}

function serializeJson(value: unknown, options: OptionValues): { output: string; notes: string[] } {
  const prepared = options.sortKeys === true ? sortValue(value) : value;
  const indent = options.minify === true ? undefined : indentOf(options);
  return { output: JSON.stringify(prepared, null, indent) ?? "null", notes: [] };
}

function serializeYaml(value: unknown, options: OptionValues): { output: string; notes: string[] } {
  const prepared = options.sortKeys === true ? sortValue(value) : value;
  const indent = indentOf(options);
  return {
    output: yamlStringify(prepared, {
      indent: typeof indent === "number" ? indent : 2,
      lineWidth: 0,
    }),
    notes: [],
  };
}

function serializeXml(value: unknown, options: OptionValues): { output: string; notes: string[] } {
  const notes: string[] = [];
  let prepared = options.sortKeys === true ? sortValue(value) : value;

  // XML precisa de um elemento raiz único; um array ou um escalar no topo não
  // tem como virar documento sem que se invente um.
  if (Array.isArray(prepared) || typeof prepared !== "object" || prepared === null) {
    prepared = { [XML_ROOT]: prepared };
    notes.push(
      `O valor no topo não é um objeto, então recebeu o elemento raiz <${XML_ROOT}>.`,
    );
  } else if (Object.keys(prepared as Record<string, unknown>).length !== 1) {
    prepared = { [XML_ROOT]: prepared };
    notes.push(
      `O objeto tem mais de uma chave no topo e foi envolvido em <${XML_ROOT}>, porque um documento XML tem um único elemento raiz.`,
    );
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE_PREFIX,
    textNodeName: XML_TEXT_NODE,
    format: options.minify !== true,
    indentBy: typeof indentOf(options) === "string" ? "\t" : " ".repeat(Number(indentOf(options))),
    arrayNodeName: XML_ITEM,
    suppressEmptyNode: true,
  });

  return { output: String(builder.build(prepared)).trimEnd(), notes };
}

/** Achata caminhos aninhados em colunas — a única forma de um objeto virar linha. */
function flattenRow(
  value: unknown,
  prefix: string,
  target: Record<string, unknown>,
  flattened: { count: number },
): void {
  if (value === null || typeof value !== "object") {
    target[prefix] = value;
    return;
  }

  flattened.count += 1;
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  for (const [key, item] of entries) {
    flattenRow(item, prefix === "" ? key : `${prefix}.${key}`, target, flattened);
  }
}

function serializeCsv(value: unknown, options: OptionValues): { output: string; notes: string[] } {
  const notes: string[] = [];
  const rows = Array.isArray(value) ? value : [value];

  if (!Array.isArray(value)) {
    notes.push("O valor não era uma lista; virou uma única linha.");
  }

  const flattened = { count: 0 };
  const prepared = rows.map((row) => {
    if (row === null || typeof row !== "object") return { valor: row };
    const target: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(row as Record<string, unknown>)) {
      flattenRow(item, key, target, flattened);
    }
    return target;
  });

  if (flattened.count > 0) {
    notes.push(
      "Estruturas aninhadas foram achatadas em colunas com caminho pontilhado (ex.: endereco.cidade) — CSV não tem aninhamento.",
    );
  }

  const columns = [...new Set(prepared.flatMap((row) => Object.keys(row)))];
  const ordered = options.sortKeys === true ? [...columns].sort() : columns;

  return {
    output: Papa.unparse(prepared, {
      columns: ordered,
      delimiter: delimiterOf(options),
      quoteChar: quoteCharOf(options),
      header: options.header !== false,
      newline: "\n",
    }),
    notes,
  };
}

function delimiterOf(options: OptionValues): string {
  const value = typeof options.delimiter === "string" ? options.delimiter : "comma";
  if (value === "semicolon") return ";";
  if (value === "tab") return "\t";
  if (value === "pipe") return "|";
  return ",";
}

function quoteCharOf(options: OptionValues): string {
  return options.quoteChar === "single" ? "'" : '"';
}

// ---------------------------------------------------------------------------
// Motor genérico
// ---------------------------------------------------------------------------

export function parseFormat(format: Format, input: string, options: OptionValues): Parsed {
  switch (format) {
    case "json":
      return parseJson(input);
    case "yaml":
      return parseYaml(input);
    case "xml":
      return parseXml(input);
    case "csv":
      return parseCsv(input, options);
  }
}

export function serializeFormat(
  format: Format,
  value: unknown,
  options: OptionValues,
): { output: string; notes: string[] } {
  switch (format) {
    case "json":
      return serializeJson(value, options);
    case "yaml":
      return serializeYaml(value, options);
    case "xml":
      return serializeXml(value, options);
    case "csv":
      return serializeCsv(value, options);
  }
}

export function convert(
  from: Format,
  to: Format,
  input: string,
  options: OptionValues,
): EngineResult {
  if (input.trim() === "") return "";

  const parsed = parseFormat(from, input, options);
  const serialized = serializeFormat(to, parsed.value, options);

  return {
    output: serialized.output,
    notes: [...parsed.notes, ...serialized.notes],
  };
}

/** Fabrica o motor de um sentido de conversão. */
export function converter(from: Format, to: Format): Engine {
  return (input, options) => convert(from, to, input, options);
}

/** Fabrica o motor de beautify/minify de um formato. */
export function formatter(format: Format, minify: boolean): Engine {
  return (input, options) => {
    if (input.trim() === "") return "";
    const parsed = parseFormat(format, input, options);
    const serialized = serializeFormat(format, parsed.value, { ...options, minify });
    return { output: serialized.output, notes: [...parsed.notes, ...serialized.notes] };
  };
}
