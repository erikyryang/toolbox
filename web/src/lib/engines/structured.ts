import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

import type { Engine, OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";
import type { Feedback } from "../messages.ts";

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

type Parsed = { value: unknown; notes: Feedback[] };
type Serialized = { output: string; notes: Feedback[] };

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
    throw new OperationError({ code: "error.json", params: { line, column } }, position);
  }

  throw new OperationError({ code: "error.json" });
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
    const { line, col } = validation.err;
    const position = input.split("\n").slice(0, line - 1).reduce((sum, row) => sum + row.length + 1, 0) + col - 1;
    throw new OperationError({ code: "error.xml", params: { line, column: col } }, position);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE_PREFIX,
    textNodeName: XML_TEXT_NODE,
    // Atributos permanecem texto. Convertê-los para tipos JS apagava conteúdo
    // na volta: `a="true"` virava o atributo booleano `a`, e `a="01"` perdia o
    // zero à esquerda ao voltar como número. Um formatador que promete não
    // alterar o conteúdo não pode reinterpretá-lo.
    parseAttributeValue: false,
    trimValues: true,
  });

  const value = parser.parse(input);
  const notes: Feedback[] = [];

  if (input.includes("=") && JSON.stringify(value).includes(`"${XML_ATTRIBUTE_PREFIX}`)) {
    notes.push({ code: "note.xmlAttributes", params: { prefix: XML_ATTRIBUTE_PREFIX, textKey: XML_TEXT_NODE } });
  }
  if (/xmlns(:[a-zA-Z0-9_-]+)?=/.test(input)) {
    notes.push({ code: "note.xmlNamespaces" });
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

function serializeJson(value: unknown, options: OptionValues): Serialized {
  const prepared = options.sortKeys === true ? sortValue(value) : value;
  const indent = options.minify === true ? undefined : indentOf(options);
  return { output: JSON.stringify(prepared, null, indent) ?? "null", notes: [] };
}

function serializeXml(value: unknown, options: OptionValues): Serialized {
  const notes: Feedback[] = [];
  let prepared = options.sortKeys === true ? sortValue(value) : value;

  // XML precisa de um elemento raiz único; um array, um escalar ou um objeto
  // com várias chaves no topo não vira documento sem que se invente uma.
  const single = !Array.isArray(prepared) && typeof prepared === "object" && prepared !== null
    && Object.keys(prepared as Record<string, unknown>).length === 1;
  if (!single) {
    notes.push({ code: "note.xmlRoot", params: { root: XML_ROOT } });
    prepared = { [XML_ROOT]: prepared };
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE_PREFIX,
    textNodeName: XML_TEXT_NODE,
    format: options.minify !== true,
    indentBy: typeof indentOf(options) === "string" ? "\t" : " ".repeat(Number(indentOf(options))),
    arrayNodeName: XML_ITEM,
    suppressEmptyNode: true,
    // Ligado (o padrão da biblioteca), isto reescreve `a="true"` como `a`.
    // É uma abreviação válida em HTML, não em XML — e some com o valor.
    suppressBooleanAttributes: false,
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
): Serialized {
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
