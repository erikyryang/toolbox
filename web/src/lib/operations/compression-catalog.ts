import {
  COMPRESSIBLE_FORMATS,
  FORMATS,
  PRESET_LABELS,
  type FormatId,
} from "../compression/formats.ts";
import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo da compactação.
 *
 * Uma rota por formato de saída, e uma rota única para descompactar — que
 * detecta o formato pela assinatura do arquivo, não pela extensão.
 */

function levelOptions(format: FormatId): OptionSpec[] {
  const spec = FORMATS[format];
  if (!spec.levels) return [];

  return [
    {
      kind: "select",
      id: "preset",
      label: "Nível de compressão",
      help: `Cada preset vira um nível dentro do range ${spec.levels.min}–${spec.levels.max} deste formato.`,
      default: "balanced",
      choices: [
        { value: "fast", label: PRESET_LABELS.fast },
        { value: "balanced", label: PRESET_LABELS.balanced },
        { value: "max", label: PRESET_LABELS.max },
        { value: "custom", label: PRESET_LABELS.custom },
      ],
    },
    {
      kind: "select",
      id: "level",
      label: "Nível exato",
      help: "Vale apenas com o preset Customizado.",
      default: String(Math.round((spec.levels.min + spec.levels.max) / 2)),
      choices: Array.from(
        { length: spec.levels.max - spec.levels.min + 1 },
        (_, index) => {
          const value = String(spec.levels!.min + index);
          return { value, label: value };
        },
      ),
    },
  ];
}

const SLUGS: Record<FormatId, string> = {
  zip: "zip",
  gzip: "gzip",
  zstd: "zstd",
  xz: "xz",
  bzip2: "bzip2",
  tar: "tar",
  "tar.gz": "tar-gz",
  "tar.zst": "tar-zst",
  rar: "rar",
  "7z": "7z",
};

export function slugForFormat(format: FormatId): string {
  return SLUGS[format];
}

export function formatForSlug(slug: string): FormatId | undefined {
  return (Object.keys(SLUGS) as FormatId[]).find((format) => SLUGS[format] === slug);
}

function compressOperation(format: FormatId): OperationMeta {
  const spec = FORMATS[format];
  const local = spec.clientCompress;

  return {
    slug: SLUGS[format],
    name: spec.label,
    title: `Compactar em ${spec.label}`,
    subtitle: local
      ? `Compacta no seu navegador, com controle de nível${spec.container ? " e vários arquivos de uma vez" : ""}.`
      : `${spec.label} é compactado no servidor: ${spec.backendReason}.`,
    description: `Compactador ${spec.label} com presets de nível${
      local ? ", processado no seu navegador" : ""
    }. Sem contas, sem histórico e sem armazenar nada.`,
    group: "Compactação",
    kind: "file",
    execution: local ? "auto" : "auto",
    forward: {
      label: "Compactar",
      inputLabel: "Arquivos",
      outputLabel: spec.label,
    },
    options: levelOptions(format),
  };
}

export const compressOperations: OperationMeta[] = COMPRESSIBLE_FORMATS.map(compressOperation);

export const decompressOperation: OperationMeta = {
  slug: "descompactar",
  name: "Descompactar",
  title: "Descompactar",
  subtitle:
    "Abre ZIP, TAR, GZIP e XZ no navegador e lista o conteúdo antes de extrair. ZSTD, BZIP2, RAR e 7Z vão para o servidor.",
  description:
    "Descompactador de ZIP, RAR, 7Z, TAR, GZIP, ZSTD, XZ e BZIP2, com listagem de entradas e extração seletiva.",
  group: "Compactação",
  kind: "file",
  execution: "auto",
  forward: {
    label: "Descompactar",
    inputLabel: "Arquivo",
    outputLabel: "Conteúdo",
  },
  options: [],
};

export const compressionOperations: OperationMeta[] = [
  ...compressOperations,
  decompressOperation,
];
