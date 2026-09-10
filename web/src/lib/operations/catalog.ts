import { compressionOperations } from "./compression-catalog.ts";
import { encodingOperations } from "./encoding-catalog.ts";
import { formatterOperations } from "./format-catalog.ts";
import type { OperationGroup, OperationMeta } from "./types.ts";

/**
 * Catálogo das operações — dados puros, sem motores.
 *
 * É a fonte de uma rota dedicada por operação: o header, a página inicial e
 * os metadados de SEO leem daqui, e nenhum deles arrasta código de motor para
 * o bundle.
 */
export const operationCatalog: OperationMeta[] = [
  ...encodingOperations,
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
