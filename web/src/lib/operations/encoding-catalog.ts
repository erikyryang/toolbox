import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo das operações de codificação da fase 2 — dev/web e
 * cripto. Dados puros, como todo o catálogo.
 */

const INDENT_OPTION: OptionSpec = {
  kind: "select",
  id: "indent",
  label: "Indentação",
  default: "2",
  choices: [
    { value: "2", label: "2 espaços" },
    { value: "tab", label: "Tabulação" },
  ],
};

export const encodingOperationsPhase2: OperationMeta[] = [
  {
    slug: "jwt-decode",
    name: "JWT",
    title: "JWT",
    subtitle:
      "Mostra cabeçalho, payload e datas de um JSON Web Token. A assinatura não é verificada.",
    description:
      "Decodificador de JWT: cabeçalho, payload e claims temporais em data legível, sem enviar o token a lugar nenhum.",
    group: "Codificação",
    execution: "client",
    placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.assinatura",
    // Decodificar um JWT não tem volta: remontar exigiria a chave.
    forward: { label: "Decodificar", inputLabel: "Token", outputLabel: "Conteúdo" },
    options: [INDENT_OPTION],
  },
  {
    slug: "unicode-escape",
    name: "Unicode escape",
    title: "Unicode escape",
    subtitle:
      "Converte texto em sequências de escape e de volta, com pares substitutos corretos fora do BMP.",
    description:
      "Conversor de escapes Unicode nos estilos \\uXXXX, \\u{...} e \\xXX, processado no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "ação 😀",
    forward: { label: "Escapar", inputLabel: "Texto", outputLabel: "Escapado" },
    reverse: { label: "Desescapar", inputLabel: "Escapado", outputLabel: "Texto" },
    options: [
      {
        kind: "select",
        id: "style",
        label: "Estilo",
        help: "\\uXXXX usa pares substitutos fora do BMP; \\u{...} representa o código inteiro.",
        default: "u4",
        choices: [
          { value: "u4", label: "\\uXXXX" },
          { value: "brace", label: "\\u{XXXXX}" },
          { value: "x2", label: "\\xXX (até U+00FF)" },
        ],
      },
      {
        kind: "boolean",
        id: "onlyNonAscii",
        label: "Escapar apenas fora do ASCII",
        default: true,
      },
    ],
  },
  {
    slug: "query-string",
    name: "Query string",
    title: "Query string",
    subtitle:
      "Abre uma query string em pares legíveis e remonta, preservando chaves repetidas.",
    description:
      "Parser e serializador de query string com preservação de chaves repetidas e ordenação opcional.",
    group: "Codificação",
    execution: "client",
    placeholder: "a=1&b=2&a=3",
    forward: { label: "Abrir", inputLabel: "Query string", outputLabel: "Pares" },
    reverse: { label: "Remontar", inputLabel: "Pares", outputLabel: "Query string" },
    options: [
      {
        kind: "boolean",
        id: "sort",
        label: "Ordenar por chave",
        default: false,
      },
      INDENT_OPTION,
    ],
  },
  {
    slug: "charset",
    name: "Charset",
    title: "Charset UTF-8 e Latin-1",
    subtitle:
      "Codifica o texto em um charset e o relê em outro — é assim que se conserta mojibake.",
    description:
      "Conversor de charset entre UTF-8 e ISO-8859-1 (Latin-1), sinalizando caracteres não representáveis.",
    group: "Codificação",
    execution: "client",
    placeholder: "Ã§Ã£o",
    forward: { label: "Converter", inputLabel: "Texto", outputLabel: "Reinterpretado" },
    reverse: { label: "Inverter charsets", inputLabel: "Texto", outputLabel: "Reinterpretado" },
    options: [
      {
        kind: "select",
        id: "encodeAs",
        label: "Codificar em",
        help: "O charset usado para transformar o texto em bytes.",
        default: "latin-1",
        choices: [
          { value: "latin-1", label: "Latin-1 (ISO-8859-1)" },
          { value: "utf-8", label: "UTF-8" },
        ],
      },
      {
        kind: "select",
        id: "readAs",
        label: "Ler como",
        help: "O charset usado para ler esses bytes de volta como texto.",
        default: "utf-8",
        choices: [
          { value: "utf-8", label: "UTF-8" },
          { value: "latin-1", label: "Latin-1 (ISO-8859-1)" },
        ],
      },
    ],
  },
  {
    slug: "base32",
    name: "Base32",
    title: "Base32",
    subtitle: "Codifica e decodifica Base32 (RFC 4648), com preenchimento opcional.",
    description:
      "Codificador e decodificador Base32 conforme a RFC 4648, processado no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "toolbox",
    forward: { label: "Codificar", inputLabel: "Texto", outputLabel: "Base32" },
    reverse: { label: "Decodificar", inputLabel: "Base32", outputLabel: "Texto" },
    options: [
      {
        kind: "boolean",
        id: "padding",
        label: "Preenchimento com =",
        default: true,
      },
    ],
  },
  {
    slug: "base58",
    name: "Base58",
    title: "Base58",
    subtitle:
      "Codifica e decodifica Base58 no alfabeto Bitcoin, que omite os caracteres ambíguos.",
    description:
      "Codificador e decodificador Base58 (alfabeto Bitcoin), preservando zeros à esquerda, no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "toolbox",
    forward: { label: "Codificar", inputLabel: "Texto", outputLabel: "Base58" },
    reverse: { label: "Decodificar", inputLabel: "Base58", outputLabel: "Texto" },
    options: [],
  },
];
