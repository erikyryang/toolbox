import { FORMATS, type FormatId } from "./formats.ts";

/**
 * Limites e decisão de roteamento.
 *
 * A decisão de onde a operação roda é tomada *antes* do processamento e por
 * regras explícitas — nunca descoberta no meio do caminho. É esta função que
 * alimenta tanto o despacho quanto o aviso de privacidade, de modo que os dois
 * não têm como divergir.
 */

function envNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Acima deste tamanho, a operação vai para o backend. */
export const CLIENT_MAX_BYTES = envNumber(
  process.env.NEXT_PUBLIC_CLIENT_MAX_BYTES,
  100 * 1024 * 1024,
);

/** Nível ZSTD acima do qual o custo de memória sai do orçamento do navegador. */
export const ZSTD_CLIENT_MAX_LEVEL = envNumber(
  process.env.NEXT_PUBLIC_ZSTD_CLIENT_MAX_LEVEL,
  12,
);

/** Teto de bytes de saída de uma extração. */
export const MAX_OUTPUT_BYTES = envNumber(
  process.env.NEXT_PUBLIC_MAX_OUTPUT_BYTES,
  2 * 1024 * 1024 * 1024,
);

/** Razão máxima entre tamanho extraído e tamanho comprimido. */
export const MAX_EXPANSION_RATIO = envNumber(
  process.env.NEXT_PUBLIC_MAX_EXPANSION_RATIO,
  500,
);

/**
 * A razão de expansão só é cobrada depois deste tanto de saída.
 *
 * Sozinha, a razão acusa arquivo honesto: 5 MB de texto repetido viram 16 KB
 * em ZSTD, o que dá mais de 300×. O que caracteriza uma bomba não é a razão
 * alta, é a razão alta *com saída grande* — abaixo deste piso, o teto absoluto
 * de bytes já é proteção suficiente.
 */
export const RATIO_CHECK_FLOOR_BYTES = envNumber(
  process.env.NEXT_PUBLIC_RATIO_CHECK_FLOOR_BYTES,
  32 * 1024 * 1024,
);

export type Where = "client" | "server";

export type RoutingDecision = {
  where: Where;
  /** Motivo em linguagem corrente, exibido antes de qualquer envio. */
  reason?: string;
};

export type RoutingInput = {
  format: FormatId;
  direction: "compress" | "decompress";
  sizeBytes: number;
  level?: number;
};

export function decideRouting({
  format,
  direction,
  sizeBytes,
  level,
}: RoutingInput): RoutingDecision {
  const spec = FORMATS[format];

  // 1. O formato exige backend?
  const capable =
    direction === "compress" ? spec.clientCompress : spec.clientDecompress;
  if (!capable) {
    return {
      where: "server",
      reason:
        spec.backendReason ??
        `${spec.label} não pode ser processado no navegador`,
    };
  }

  // 2. O nível pedido está acima do teto do navegador?
  if (
    direction === "compress" &&
    (format === "zstd" || format === "tar.zst") &&
    level !== undefined &&
    level > ZSTD_CLIENT_MAX_LEVEL
  ) {
    return {
      where: "server",
      reason: `o nível ${level} do ZSTD passa do teto ${ZSTD_CLIENT_MAX_LEVEL} para o navegador`,
    };
  }

  // 3. O arquivo é grande demais?
  if (sizeBytes > CLIENT_MAX_BYTES) {
    return {
      where: "server",
      reason: `o arquivo tem ${formatBytes(sizeBytes)}, acima do limite de ${formatBytes(CLIENT_MAX_BYTES)} para processamento local`,
    };
  }

  return { where: "client" };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
