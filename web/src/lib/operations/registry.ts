import { decodeBase32, decodeBase58, encodeBase32, encodeBase58 } from "../engines/base32-58.ts";
import { decodeBase64, encodeBase64 } from "../engines/base64.ts";
import { convertDataSize, convertDataSizeBack } from "../engines/data-size.ts";
import { joinLines } from "../engines/lines.ts";
import { formatter } from "../engines/structured.ts";
import { operationMetaBySlug } from "./catalog.ts";
import type { Engine, Operation } from "./types.ts";

/**
 * Motores por slug. O catálogo descreve a operação; aqui ela ganha execução.
 * Só quem vai de fato rodar uma operação importa este módulo.
 */
const engines: Record<string, { forward: Engine; reverse?: Engine }> = {
  base64: { forward: encodeBase64, reverse: decodeBase64 },
  base32: { forward: encodeBase32, reverse: decodeBase32 },
  base58: { forward: encodeBase58, reverse: decodeBase58 },

  "json-format": { forward: formatter("json", false), reverse: formatter("json", true) },
  "xml-format": { forward: formatter("xml", false), reverse: formatter("xml", true) },

  // Sentido único: o inverso seria outra operação, não a volta desta.
  "juntar-linhas": { forward: joinLines },

  // O inverso é o mesmo motor com origem e destino trocados.
  "tamanho-de-dados": { forward: convertDataSize, reverse: convertDataSizeBack },
};

export function getOperation(slug: string): Operation | undefined {
  const meta = operationMetaBySlug(slug);
  const engine = engines[slug];
  if (!meta || !engine) return undefined;
  return { ...meta, engines: engine };
}

/** Slugs que têm motor — usado pelos testes para garantir catálogo e motores em dia. */
export function implementedSlugs(): string[] {
  return Object.keys(engines);
}
