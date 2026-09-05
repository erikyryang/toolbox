"use client";

import { FileWorkspace } from "@/components/file-workspace";
import { formatForSlug } from "@/lib/operations/compression-catalog";
import { operationMetaBySlug } from "@/lib/operations/catalog";
import { localizeOperation, useLanguage } from "@/lib/language";

/**
 * Liga uma rota de compactação ao seu formato. A rota "descompactar" não fixa
 * formato: ele é detectado pela assinatura do arquivo escolhido.
 */
export function CompressionRoute({ slug }: { slug: string }) {
  const { language } = useLanguage();
  const operation = operationMetaBySlug(slug);
  if (!operation) throw new Error(`Operação desconhecida: ${slug}`);

  const format = formatForSlug(slug);

  return (
    <FileWorkspace
      operation={localizeOperation(operation, language)}
      mode={format ? "compress" : "decompress"}
      format={format}
    />
  );
}
