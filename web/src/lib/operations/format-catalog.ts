import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo das conversões entre JSON, YAML, XML e CSV.
 *
 * São seis rotas reversíveis, que juntas cobrem as doze direções possíveis
 * entre os quatro formatos — uma rota por par, cada uma com sua própria URL e
 * seus próprios metadados.
 */

export type FormatId = "json" | "yaml" | "xml" | "csv";

export const FORMAT_LABELS: Record<FormatId, string> = {
  json: "JSON",
  yaml: "YAML",
  xml: "XML",
  csv: "CSV",
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

const CSV_OPTIONS: OptionSpec[] = [
  {
    kind: "select",
    id: "delimiter",
    label: "Delimitador",
    default: "comma",
    choices: [
      { value: "comma", label: "Vírgula" },
      { value: "semicolon", label: "Ponto e vírgula" },
      { value: "tab", label: "Tabulação" },
      { value: "pipe", label: "Barra vertical" },
    ],
  },
  {
    kind: "select",
    id: "quoteChar",
    label: "Caractere de citação",
    default: "double",
    choices: [
      { value: "double", label: "Aspas duplas" },
      { value: "single", label: "Aspas simples" },
    ],
  },
  {
    kind: "boolean",
    id: "header",
    label: "Primeira linha é cabeçalho",
    help: "Desligado, cada linha vira uma lista de valores em vez de um objeto.",
    default: true,
  },
  {
    kind: "boolean",
    id: "typed",
    label: "Converter números e booleanos",
    help: "Ligado, \"1\" vira 1 e \"true\" vira true na leitura do CSV.",
    default: false,
  },
];

const PLACEHOLDERS: Record<FormatId, string> = {
  json: '{ "nome": "toolbox", "tags": ["dados", "arquivos"] }',
  yaml: "nome: toolbox\ntags:\n  - dados\n  - arquivos",
  xml: "<projeto>\n  <nome>toolbox</nome>\n</projeto>",
  csv: "nome,tags\ntoolbox,dados",
};

function optionsFor(...formats: FormatId[]): OptionSpec[] {
  const options = [INDENT_OPTION, SORT_KEYS_OPTION];
  return formats.includes("csv") ? [...options, ...CSV_OPTIONS] : options;
}

function pair(from: FormatId, to: FormatId): OperationMeta {
  const fromLabel = FORMAT_LABELS[from];
  const toLabel = FORMAT_LABELS[to];

  return {
    slug: `${from}-${to}`,
    name: `${fromLabel} ⇄ ${toLabel}`,
    title: `${fromLabel} ⇄ ${toLabel}`,
    subtitle: `Converte ${fromLabel} em ${toLabel} e de volta, avisando o que cada formato não consegue representar.`,
    description: `Conversor ${fromLabel} para ${toLabel} e ${toLabel} para ${fromLabel}, com aviso de conversão com perda, no seu navegador.`,
    group: "Formato",
    execution: "client",
    placeholder: PLACEHOLDERS[from],
    forward: {
      label: `${fromLabel} → ${toLabel}`,
      inputLabel: fromLabel,
      outputLabel: toLabel,
    },
    reverse: {
      label: `${toLabel} → ${fromLabel}`,
      inputLabel: toLabel,
      outputLabel: fromLabel,
    },
    options: optionsFor(from, to),
  };
}

/** Os seis pares entre os quatro formatos. */
export const FORMAT_PAIRS: [FormatId, FormatId][] = [
  ["json", "yaml"],
  ["json", "xml"],
  ["json", "csv"],
  ["yaml", "xml"],
  ["yaml", "csv"],
  ["xml", "csv"],
];

export const formatPairOperations: OperationMeta[] = FORMAT_PAIRS.map(([from, to]) =>
  pair(from, to),
);

function beautifier(format: "json" | "xml"): OperationMeta {
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
    forward: { label: "Beautify", inputLabel: label, outputLabel: `${label} formatado` },
    reverse: { label: "Minify", inputLabel: label, outputLabel: `${label} minificado` },
    options: optionsFor(format),
  };
}

export const formatterOperations: OperationMeta[] = [
  beautifier("json"),
  beautifier("xml"),
];
