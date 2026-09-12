/**
 * Registro dos formatos de compactação.
 *
 * Cada formato declara o que sabe fazer *no navegador*. Onde `clientCompress`
 * ou `clientDecompress` é falso, a operação vai para o backend — a decisão de
 * roteamento lê daqui, não de exceções em tempo de execução.
 */

export type FormatId =
  | "zip"
  | "gzip"
  | "zstd"
  | "tar"
  | "rar"
  | "7z";

export type LevelRange = { min: number; max: number };

export type FormatSpec = {
  id: FormatId;
  label: string;
  extension: string;
  mime: string;
  /** Formatos com várias entradas — exigem listagem antes de extrair. */
  container: boolean;
  /** Range de nível do formato; ausente quando o formato não comprime. */
  levels?: LevelRange;
  clientCompress: boolean;
  clientDecompress: boolean;
  /** Assinaturas para detecção; deslocamento e bytes esperados. */
  magic: { offset: number; bytes: number[] }[];
  /**
   * Maior entrada que o formato registra sem extensões — ausente quando o
   * formato não impõe teto. É conferido antes de ler qualquer byte: um
   * arquivo acima disso não tem como sair certo, e descobrir isso depois de
   * carregar gigabytes seria desperdício.
   */
  maxEntryBytes?: number;
  /** Motivo pelo qual o navegador não dá conta, exibido na interface. */
  backendReason?: string;
};

export const FORMATS: Record<FormatId, FormatSpec> = {
  zip: {
    id: "zip",
    label: "ZIP",
    extension: ".zip",
    mime: "application/zip",
    container: true,
    levels: { min: 0, max: 9 },
    clientCompress: true,
    clientDecompress: true,
    magic: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }, { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] }],
    // Campos de 32 bits no cabeçalho; acima disso é ZIP64, que o fflate não gera.
    maxEntryBytes: 0xffffffff,
  },
  gzip: {
    id: "gzip",
    label: "GZIP",
    extension: ".gz",
    mime: "application/gzip",
    container: false,
    levels: { min: 1, max: 9 },
    clientCompress: true,
    clientDecompress: true,
    magic: [{ offset: 0, bytes: [0x1f, 0x8b] }],
  },
  zstd: {
    id: "zstd",
    label: "ZSTD",
    extension: ".zst",
    mime: "application/zstd",
    container: false,
    levels: { min: 1, max: 22 },
    clientCompress: true,
    // A biblioteca WASM só tem API síncrona, sem streaming: o guarda
    // anti-bomba age antes, pelo tamanho declarado no cabeçalho do frame, e
    // por um teto de alocação quando o cabeçalho não declara nada.
    clientDecompress: true,
    magic: [{ offset: 0, bytes: [0x28, 0xb5, 0x2f, 0xfd] }],
  },
  tar: {
    id: "tar",
    label: "TAR",
    extension: ".tar",
    mime: "application/x-tar",
    container: true,
    clientCompress: true,
    clientDecompress: true,
    magic: [{ offset: 257, bytes: [0x75, 0x73, 0x74, 0x61, 0x72] }],
    // Tamanho em 11 dígitos octais no cabeçalho ustar.
    maxEntryBytes: 0o77777777777,
  },
  rar: {
    id: "rar",
    label: "RAR",
    extension: ".rar",
    mime: "application/vnd.rar",
    container: true,
    clientCompress: false,
    clientDecompress: false,
    magic: [
      { offset: 0, bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00] },
      { offset: 0, bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00] },
    ],
    backendReason: "RAR só é lido pelo backend",
  },
  "7z": {
    id: "7z",
    label: "7Z",
    extension: ".7z",
    mime: "application/x-7z-compressed",
    container: true,
    clientCompress: false,
    clientDecompress: false,
    magic: [{ offset: 0, bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] }],
    backendReason: "7Z só é lido pelo backend",
  },
};

export const COMPRESSIBLE_FORMATS: FormatId[] = [
  "zip",
  "gzip",
  "zstd",
  "tar",
];

export const DECOMPRESSIBLE_FORMATS: FormatId[] = [
  "zip",
  "rar",
  "7z",
  "tar",
  "gzip",
  "zstd",
];

// ---------------------------------------------------------------------------
// Presets de nível
// ---------------------------------------------------------------------------

export type Preset = "fast" | "balanced" | "max" | "custom";

/** Na ordem em que aparecem na tela; os rótulos vivem no catálogo de mensagens. */
export const PRESETS: Preset[] = ["fast", "balanced", "max", "custom"];

/**
 * Cada preset vira um nível dentro do range do formato escolhido. O mapa é
 * explícito em vez de proporcional: o custo de subir um nível não é linear em
 * nenhum dos formatos, e 19 no ZSTD não corresponde a 9 no GZIP.
 */
const PRESET_LEVELS: Record<FormatId, Record<Exclude<Preset, "custom">, number>> = {
  zip: { fast: 1, balanced: 6, max: 9 },
  gzip: { fast: 1, balanced: 6, max: 9 },
  zstd: { fast: 1, balanced: 3, max: 19 },
  tar: { fast: 0, balanced: 0, max: 0 },
  rar: { fast: 0, balanced: 0, max: 0 },
  "7z": { fast: 0, balanced: 0, max: 0 },
};

export function levelForPreset(
  format: FormatId,
  preset: Preset,
  customLevel?: number,
): number {
  const spec = FORMATS[format];
  if (!spec.levels) return 0;

  if (preset === "custom") {
    const level = customLevel ?? PRESET_LEVELS[format].balanced;
    return clampLevel(format, level);
  }

  return PRESET_LEVELS[format][preset];
}

export function clampLevel(format: FormatId, level: number): number {
  const spec = FORMATS[format];
  if (!spec.levels) return 0;
  return Math.min(spec.levels.max, Math.max(spec.levels.min, Math.round(level)));
}

export function isLevelInRange(format: FormatId, level: number): boolean {
  const spec = FORMATS[format];
  if (!spec.levels) return level === 0;
  return level >= spec.levels.min && level <= spec.levels.max;
}
