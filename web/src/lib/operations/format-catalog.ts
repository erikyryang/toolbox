import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo do grupo Formato.
 *
 * Os formatadores de JSON e XML são uma rota por formato, reversível: beautify
 * em um sentido, minify no outro. A junção de linhas não é nem uma coisa nem
 * outra — opera sobre texto sem gramática e só tem um sentido —, então é
 * escrita à mão, e não pela fábrica.
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
    aliases:
      format === "json"
        ? ["json", "beautify", "prettify", "formatar", "indentar", "minify", "minificar"]
        : ["xml", "beautify", "prettify", "formatar", "indentar", "minify", "minificar"],
    forward: {
      label: "Beautify",
      inputLabel: label,
      outputLabel: `${label} formatado`,
      help: `Reindenta com quebras de linha e recuo, para ler e revisar o ${label}.`,
    },
    reverse: {
      label: "Minify",
      inputLabel: label,
      outputLabel: `${label} minificado`,
      help: "Remove todo espaço supérfluo: mesmo conteúdo, menos bytes para trafegar.",
    },
    options: [INDENT_OPTION, SORT_KEYS_OPTION],
  };
}

const SEPARATOR_OPTION: OptionSpec = {
  kind: "select",
  id: "separator",
  label: "Separador",
  help: "Entra entre as linhas, nunca antes da primeira nem depois da última.",
  default: "none",
  choices: [
    { value: "none", label: "Nada" },
    { value: "space", label: "Espaço" },
    { value: "comma", label: "Vírgula" },
    { value: "comma-space", label: "Vírgula + espaço" },
    { value: "semicolon", label: "Ponto e vírgula" },
    { value: "pipe", label: "Barra vertical" },
    { value: "tab", label: "Tabulação" },
  ],
};

const TRIM_OPTION: OptionSpec = {
  kind: "boolean",
  id: "trim",
  label: "Aparar espaços",
  help: "Ligado, os espaços das pontas de cada linha ficam de fora.",
  default: false,
};

const DROP_EMPTY_OPTION: OptionSpec = {
  kind: "boolean",
  id: "dropEmpty",
  label: "Descartar linhas vazias",
  help: "Desligado, cada linha vazia vira um separador na saída.",
  default: false,
};

/**
 * Junção de linhas. Sem `reverse`: quebrar uma linha em várias é outra
 * operação, não o inverso desta — o separador que junta nem sempre é o que
 * separa de volta.
 */
const joinLinesOperation: OperationMeta = {
  slug: "juntar-linhas",
  name: "Juntar linhas",
  title: "Juntar linhas",
  subtitle:
    "Junta todas as linhas em uma só, com o separador que a próxima ferramenta espera.",
  description:
    "Junta várias linhas de texto em uma linha única, com escolha de separador, aparo de espaços e descarte de linhas vazias, processado no seu navegador.",
  group: "Formato",
  execution: "client",
  placeholder: "1042\n1043\n\n1044  \n1045",
  aliases: [
    "join",
    "join lines",
    "juntar",
    "juntar linhas",
    "unir linhas",
    "uma linha",
    "one line",
    "remover quebras",
  ],
  forward: { label: "Juntar", inputLabel: "Texto", outputLabel: "Linha única" },
  options: [SEPARATOR_OPTION, TRIM_OPTION, DROP_EMPTY_OPTION],
};

export const formatterOperations: OperationMeta[] = [
  beautifier("json"),
  beautifier("xml"),
  // Por último, e não em ordem alfabética: os dois formatadores são o que a
  // maioria vem buscar aqui, e a junção de linhas é a vizinha de outra
  // natureza — texto sem gramática.
  joinLinesOperation,
];
