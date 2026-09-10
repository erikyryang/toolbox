import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo dos formatadores de JSON e XML.
 *
 * Uma rota por formato, reversível: beautify em um sentido, minify no outro.
 */

export type FormatId = "json" | "xml";

export const FORMAT_LABELS: Record<FormatId, string> = {
  json: "JSON",
  xml: "XML",
};

const INDENT_OPTION: OptionSpec = {
  kind: "select",
  id: "indent",
  label: "Indentação",
  default: "2",
  choices: [
    { value: "2", label: "2 espaços" },
    { value: "4", label: "4 espaços" },
    { value: "tab", label: "Tabulação" },
  ],
};

const SORT_KEYS_OPTION: OptionSpec = {
  kind: "boolean",
  id: "sortKeys",
  label: "Ordenar chaves",
  help: "Desligado, a ordem original das chaves é preservada.",
  default: false,
};

const PLACEHOLDERS: Record<FormatId, string> = {
  json: '{ "nome": "toolbox", "tags": ["dados", "arquivos"] }',
  xml: "<projeto>\n  <nome>toolbox</nome>\n</projeto>",
};

function beautifier(format: FormatId): OperationMeta {
  const label = FORMAT_LABELS[format];

  return {
    slug: `${format}-format`,
    name: `${label} beautify`,
    title: `${label}: beautify e minify`,
    subtitle: `Reindenta ${label} para leitura ou remove todo espaço supérfluo, sem alterar o conteúdo.`,
    description: `Formatador e minificador de ${label}, com indentação configurável, processado no seu navegador.`,
    group: "Formato",
    execution: "client",
    placeholder: PLACEHOLDERS[format],
    syntax: format,
    forward: { label: "Beautify", inputLabel: label, outputLabel: `${label} formatado` },
    reverse: { label: "Minify", inputLabel: label, outputLabel: `${label} minificado` },
    options: [INDENT_OPTION, SORT_KEYS_OPTION],
  };
}

export const formatterOperations: OperationMeta[] = [
  beautifier("json"),
  beautifier("xml"),
];
