import { OperationError } from "../engines/errors.ts";
import {
  MAX_EXPANSION_RATIO,
  MAX_OUTPUT_BYTES,
  RATIO_CHECK_FLOOR_BYTES,
  formatBytes,
} from "./limits.ts";

/**
 * Proteção contra bomba de descompressão.
 *
 * Dois tetos, porque um só não basta: a razão de expansão pega o arquivo
 * minúsculo que vira gigabytes, e o teto absoluto pega o arquivo grande que
 * simplesmente não cabe na memória do navegador.
 *
 * A razão só passa a valer depois de RATIO_CHECK_FLOOR_BYTES de saída: dado
 * honesto e muito repetitivo passa fácil de 300× sem ser bomba nenhuma, e
 * recusá-lo seria quebrar o caso comum para proteger contra o raro.
 */

export type BombGuard = {
  /** Acrescenta bytes ao total e aborta se algum teto for ultrapassado. */
  add(bytes: number): void;
  total(): number;
};

export function createBombGuard(compressedSize: number): BombGuard {
  let total = 0;

  return {
    add(bytes: number) {
      total += bytes;

      if (total > MAX_OUTPUT_BYTES) {
        throw new OperationError(
          `A extração passou de ${formatBytes(MAX_OUTPUT_BYTES)} de saída e foi interrompida.`,
        );
      }

      if (
        total > RATIO_CHECK_FLOOR_BYTES &&
        compressedSize > 0 &&
        total / compressedSize > MAX_EXPANSION_RATIO
      ) {
        throw new OperationError(
          `A extração expandiu mais de ${MAX_EXPANSION_RATIO}× o tamanho do arquivo (${formatBytes(compressedSize)} → ${formatBytes(total)}) e foi interrompida: isso é a assinatura de uma bomba de descompressão.`,
        );
      }
    },
    total() {
      return total;
    },
  };
}

/**
 * Verificação antecipada, para formatos que declaram o tamanho extraído no
 * índice: dá para recusar a bomba antes de alocar qualquer memória.
 */
export function assertDeclaredSizeIsSane(
  compressedSize: number,
  declaredUncompressed: number,
): void {
  if (declaredUncompressed > MAX_OUTPUT_BYTES) {
    throw new OperationError(
      `O arquivo declara ${formatBytes(declaredUncompressed)} de conteúdo extraído, acima do teto de ${formatBytes(MAX_OUTPUT_BYTES)}.`,
    );
  }

  if (
    declaredUncompressed > RATIO_CHECK_FLOOR_BYTES &&
    compressedSize > 0 &&
    declaredUncompressed / compressedSize > MAX_EXPANSION_RATIO
  ) {
    throw new OperationError(
      `O arquivo declara expansão de ${Math.round(declaredUncompressed / compressedSize)}×, acima do limite de ${MAX_EXPANSION_RATIO}×: isso é a assinatura de uma bomba de descompressão.`,
    );
  }
}
