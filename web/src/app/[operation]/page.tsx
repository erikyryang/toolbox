import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompressionRoute } from "@/components/compression-route";
import { OperationWorkspace } from "@/components/operation-workspace";
import { operationMetaBySlug, operationSlugs } from "@/lib/operations/catalog";

/**
 * Uma rota dedicada por operação.
 *
 * O segmento é dinâmico, mas `generateStaticParams` transforma cada operação
 * do registro numa rota estática própria, com título e descrição próprios —
 * é o que a torna indexável e endereçável diretamente.
 */
export function generateStaticParams() {
  return operationSlugs().map((operation) => ({ operation }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[operation]">): Promise<Metadata> {
  const { operation: slug } = await params;
  const operation = operationMetaBySlug(slug);

  if (!operation) return {};

  return {
    title: operation.title,
    description: operation.description,
    alternates: { canonical: `/${operation.slug}` },
    openGraph: {
      title: `${operation.title} — toolbox`,
      description: operation.description,
      type: "website",
    },
  };
}

export default async function OperationPage({
  params,
}: PageProps<"/[operation]">) {
  const { operation: slug } = await params;
  const operation = operationMetaBySlug(slug);

  if (!operation) notFound();

  return operation.kind === "file" ? (
    <CompressionRoute slug={operation.slug} />
  ) : (
    <OperationWorkspace slug={operation.slug} />
  );
}
