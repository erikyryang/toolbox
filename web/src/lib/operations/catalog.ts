import { compressionOperations } from "./compression-catalog.ts";
import { encodingOperationsPhase2 } from "./encoding-catalog.ts";
import { formatPairOperations, formatterOperations } from "./format-catalog.ts";
import type { OperationGroup, OperationMeta } from "./types.ts";

/**
 * Catálogo das operações — dados puros, sem motores.
 *
 * É a fonte de uma rota dedicada por operação: o header, a página inicial e
 * os metadados de SEO leem daqui, e nenhum deles arrasta código de motor para
 * o bundle.
 */
const encodingOperationsPhase1: OperationMeta[] = [
  {
    slug: "base64",
    name: "Base64",
    title: "Base64",
    subtitle:
      "Codifica e decodifica Base64 nos alfabetos padrão e URL-safe, com ou sem preenchimento.",
    description:
      "Codificador e decodificador Base64 (RFC 4648), padrão e URL-safe, processado inteiramente no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "toolbox",
    forward: { label: "Codificar", inputLabel: "Texto", outputLabel: "Base64" },
    reverse: { label: "Decodificar", inputLabel: "Base64", outputLabel: "Texto" },
    options: [
      {
        kind: "select",
        id: "alphabet",
        label: "Alfabeto",
        help: "O alfabeto URL-safe troca + e / por - e _.",
        default: "standard",
        choices: [
          { value: "standard", label: "Padrão (RFC 4648 §4)" },
          { value: "urlsafe", label: "URL-safe (RFC 4648 §5)" },
        ],
      },
      {
        kind: "boolean",
        id: "padding",
        label: "Preenchimento com =",
        help: "Desligado, a saída não recebe os caracteres = do fim.",
        default: true,
      },
    ],
  },
  {
    slug: "hex",
    name: "Hex",
    title: "Hexadecimal",
    subtitle:
      "Converte texto em bytes hexadecimais e de volta, tolerando espaços e quebras de linha na entrada.",
    description:
      "Conversor hexadecimal: texto para bytes e bytes para texto, com escolha de caixa e separador, no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "AB",
    forward: { label: "Codificar", inputLabel: "Texto", outputLabel: "Hexadecimal" },
    reverse: { label: "Decodificar", inputLabel: "Hexadecimal", outputLabel: "Texto" },
    options: [
      {
        kind: "select",
        id: "case",
        label: "Caixa dos dígitos",
        default: "lower",
        choices: [
          { value: "lower", label: "Minúscula" },
          { value: "upper", label: "Maiúscula" },
        ],
      },
      {
        kind: "select",
        id: "separator",
        label: "Separador",
        help: "Só afeta a saída; na entrada, espaços são sempre tolerados.",
        default: "none",
        choices: [
          { value: "none", label: "Nenhum" },
          { value: "space", label: "Espaço a cada byte" },
        ],
      },
    ],
  },
];

export const operationCatalog: OperationMeta[] = [
  ...encodingOperationsPhase1,
  ...encodingOperationsPhase2,
  ...formatPairOperations,
  ...formatterOperations,
  ...compressionOperations,
];

export const GROUP_ORDER: OperationGroup[] = [
  "Codificação",
  "Formato",
  "Compactação",
];

export function operationMetaBySlug(slug: string): OperationMeta | undefined {
  return operationCatalog.find((operation) => operation.slug === slug);
}

export function operationSlugs(): string[] {
  return operationCatalog.map((operation) => operation.slug);
}

export function operationsByGroup(): {
  group: OperationGroup;
  items: OperationMeta[];
}[] {
  return GROUP_ORDER.map((group) => ({
    group,
    items: operationCatalog.filter((operation) => operation.group === group),
  })).filter((entry) => entry.items.length > 0);
}
