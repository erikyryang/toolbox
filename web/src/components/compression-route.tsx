"use client";

import { FileWorkspace } from "@/components/file-workspace";
import { formatForSlug } from "@/lib/operations/compression-catalog";
import { operationMetaBySlug } from "@/lib/operations/catalog";
import { localizeOperation, useLanguage } from "@/lib/language";

/**
 * Liga uma rota de compactação à tela de arquivos.
 *
 * São três casos. "descompactar" não fixa formato nenhum: ele é detectado pela
 * assinatura do arquivo escolhido. "compactar" é a rota canônica, onde o
 * formato começa em ZIP e o usuário troca na tela. As rotas por formato são a
 * mesma tela, apenas semeada com o formato do endereço — é o que permite que
 * /zstd continue sendo uma página própria sem virar um item de menu.
 */
export function CompressionRoute({ slug }: { slug: string }) {
  const { language } = useLanguage();
  const operation = operationMetaBySlug(slug);
  if (!operation) throw new Error(`Operação desconhecida: ${slug}`);

  const decompressing = slug === "descompactar";

  return (
    <FileWorkspace
      key={operation.slug}
      operation={localizeOperation(operation, language)}
      mode={decompressing ? "decompress" : "compress"}
      initialFormat={formatForSlug(slug)}
    />
  );
}
