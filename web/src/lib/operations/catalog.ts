import { compressionOperations } from "./compression-catalog.ts";
import { encodingOperationsPhase2 } from "./encoding-catalog.ts";
import { formatterOperations } from "./format-catalog.ts";
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
    aliases: ["base64", "b64", "atob", "btoa", "rfc 4648", "url-safe"],
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
];

export const operationCatalog: OperationMeta[] = [
  ...encodingOperationsPhase1,
  ...encodingOperationsPhase2,
  ...formatterOperations,
  ...compressionOperations,
];

export const GROUP_ORDER: OperationGroup[] = [
  "Codificação",
  "Formato",
  "Compactação",
];

/**
 * As três operações oferecidas na home antes de qualquer busca. Vive aqui, e
 * não no componente, porque é dado de catálogo: um slug que saia da navegação
 * some do "Comece por aqui" sem nenhum erro — e o teste cobre esse vínculo.
 */
export const QUICK_START_SLUGS = ["base64", "json-format", "compactar"];

export function operationMetaBySlug(slug: string): OperationMeta | undefined {
  return operationCatalog.find((operation) => operation.slug === slug);
}

export function operationSlugs(): string[] {
  return operationCatalog.map((operation) => operation.slug);
}

/**
 * As operações agrupadas para a navegação. Rotas `unlisted` ficam de fora
 * daqui — e só daqui: elas continuam no catálogo, e portanto continuam
 * virando rota estática com metadados próprios.
 */
export function operationsByGroup(): {
  group: OperationGroup;
  items: OperationMeta[];
}[] {
  return GROUP_ORDER.map((group) => ({
    group,
    items: operationCatalog.filter(
      (operation) => operation.group === group && !operation.unlisted,
    ),
  })).filter((entry) => entry.items.length > 0);
}
