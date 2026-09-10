import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

import type { Engine, OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";

/**
 * Beautify e minify de JSON e XML.
 *
 * Os dois passam pelo mesmo pivô — um valor JavaScript comum — porque é o que
 * permite reindentar e minificar com um único motor. Onde a leitura do XML
 * precisa de uma convenção que o documento original não tinha, o motor diz o
 * que fez, em vez de calar.
 */

export type Format = "json" | "xml";

export const FORMAT_LABELS: Record<Format, string> = {
  json: "JSON",
  xml: "XML",
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

// ---------------------------------------------------------------------------
// Motor genérico
// ---------------------------------------------------------------------------

export function parseFormat(format: Format, input: string): Parsed {
  switch (format) {
    case "json":
      return parseJson(input);
    case "xml":
      return parseXml(input);
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
    case "xml":
      return serializeXml(value, options);
  }
}

/** Fabrica o motor de beautify/minify de um formato. */
export function formatter(format: Format, minify: boolean): Engine {
  return (input, options) => {
    if (input.trim() === "") return "";
    const parsed = parseFormat(format, input);
    const serialized = serializeFormat(format, parsed.value, { ...options, minify });
    return { output: serialized.output, notes: [...parsed.notes, ...serialized.notes] };
  };
}
