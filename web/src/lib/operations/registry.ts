import { decodeBase32, decodeBase58, encodeBase32, encodeBase58 } from "../engines/base32-58.ts";
import { decodeBase64, encodeBase64 } from "../engines/base64.ts";
import { convertCharset, convertCharsetReversed } from "../engines/charset.ts";
import { decodeHex, encodeHex } from "../engines/hex.ts";
import { decodeJwt } from "../engines/jwt.ts";
import { queryToStructure, structureToQuery } from "../engines/query-string.ts";
import { converter, formatter } from "../engines/structured.ts";
import { escapeUnicode, unescapeUnicode } from "../engines/unicode-escape.ts";
import { operationMetaBySlug } from "./catalog.ts";
import { FORMAT_PAIRS } from "./format-catalog.ts";
import type { Engine, Operation } from "./types.ts";

/**
 * Motores por slug. O catálogo descreve a operação; aqui ela ganha execução.
 * Só quem vai de fato rodar uma operação importa este módulo.
 */
const engines: Record<string, { forward: Engine; reverse?: Engine }> = {
  base64: { forward: encodeBase64, reverse: decodeBase64 },
  hex: { forward: encodeHex, reverse: decodeHex },

  "jwt-decode": { forward: decodeJwt },
  "unicode-escape": { forward: escapeUnicode, reverse: unescapeUnicode },
  "query-string": { forward: queryToStructure, reverse: structureToQuery },
  charset: { forward: convertCharset, reverse: convertCharsetReversed },
  base32: { forward: encodeBase32, reverse: decodeBase32 },
  base58: { forward: encodeBase58, reverse: decodeBase58 },

  // Conversões entre formatos: uma rota reversível por par cobre as duas
  // direções, e os seis pares cobrem as doze conversões possíveis.
  ...Object.fromEntries(
    FORMAT_PAIRS.map(([from, to]) => [
      `${from}-${to}`,
      { forward: converter(from, to), reverse: converter(to, from) },
    ]),
  ),

  "json-format": { forward: formatter("json", false), reverse: formatter("json", true) },
  "xml-format": { forward: formatter("xml", false), reverse: formatter("xml", true) },
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
