"use client";

import { FileWorkspace } from "@/components/file-workspace";
import { formatForSlug } from "@/lib/operations/compression-catalog";
import { operationMetaBySlug } from "@/lib/operations/catalog";

/**
 * Liga uma rota de compactação ao seu formato. A rota "descompactar" não fixa
 * formato: ele é detectado pela assinatura do arquivo escolhido.
 */
export function CompressionRoute({ slug }: { slug: string }) {
  const operation = operationMetaBySlug(slug);
  if (!operation) throw new Error(`Operação desconhecida: ${slug}`);

  const format = formatForSlug(slug);

  return (
    <FileWorkspace
      operation={operation}
      mode={format ? "compress" : "decompress"}
      format={format}
    />
  );
}
