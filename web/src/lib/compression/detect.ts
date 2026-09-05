import { FORMATS, type FormatId } from "./formats.ts";

/**
 * Detecção de formato pela assinatura dos bytes, não pela extensão do nome —
 * um arquivo renomeado continua sendo o que é.
 */

function matchesMagic(bytes: Uint8Array, format: FormatId): boolean {
  return FORMATS[format].magic.some(({ offset, bytes: signature }) => {
    if (bytes.length < offset + signature.length) return false;
    return signature.every((byte, index) => bytes[offset + index] === byte);
  });
}

/**
 * Ordem importa: TAR é verificado antes dos envelopes porque sua assinatura
 * está no deslocamento 257, e os formatos compostos (tar.gz, tar.zst) só são
 * distinguíveis depois de descomprimir o envelope.
 */
const DETECTION_ORDER: FormatId[] = [
  "zip",
  "rar",
  "7z",
  "gzip",
  "zstd",
  "xz",
  "bzip2",
  "tar",
];

export function detectFormat(bytes: Uint8Array): FormatId | undefined {
  return DETECTION_ORDER.find((format) => matchesMagic(bytes, format));
}

/** Descreve os primeiros bytes para a mensagem de erro de formato desconhecido. */
export function describeSignature(bytes: Uint8Array): string {
  const preview = [...bytes.subarray(0, 8)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return preview === "" ? "(arquivo vazio)" : `0x${preview}`;
}

/** Extensão sugerida para o nome do arquivo baixado. */
export function extensionFor(format: FormatId): string {
  return FORMATS[format].extension;
}
