import {
  COMPRESSIBLE_FORMATS,
  FORMATS,
  PRESETS,
  type FormatId,
} from "../compression/formats.ts";
import type { Language } from "../i18n.ts";
import { message } from "../messages.ts";
import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo da compactação.
 *
 * A navegação tem duas entradas simétricas — compactar e descompactar — mas o
 * catálogo tem mais rotas do que isso: cada formato de saída mantém a sua,
 * marcada como `unlisted`. Elas não aparecem no menu; existem porque cada uma
 * é uma página endereçável, com título e descrição próprios, e porque
 * "compactar em zip" é o que as pessoas de fato procuram. Abrir uma delas é
 * abrir a tela de compactar com aquele formato já escolhido.
 *
 * Descompactar continua sendo uma rota só: ali não há o que escolher, porque
 * a assinatura do arquivo já diz o que ele é.
 */

/**
 * Opções de nível do formato escolhido. É função do formato, e não da rota,
 * porque o formato virou um controle da tela: trocar de ZSTD para GZIP muda o
 * range de 1–22 para 1–9, e a lista precisa acompanhar.
 *
 * Os rótulos saem do catálogo de mensagens, no idioma pedido: a tela monta
 * estas opções por conta própria a cada troca de formato, fora do caminho
 * que traduz o resto da operação.
 */
export function levelOptionsFor(format: FormatId, language: Language = "pt"): OptionSpec[] {
  const spec = FORMATS[format];
  if (!spec.levels) return [];

  return [
    {
      kind: "select",
      id: "preset",
      label: message(language, "ui.compressionLevel"),
      help: message(language, "ui.compressionLevelHelp", { min: spec.levels.min, max: spec.levels.max }),
      default: "balanced",
      choices: PRESETS.map((preset) => ({ value: preset, label: message(language, `ui.preset.${preset}`) })),
    },
    {
      kind: "select",
      id: "level",
      label: message(language, "ui.exactLevel"),
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
  tar: "tar",
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
    // A rota existe e é indexável, mas quem navega chega por "Compactar".
    unlisted: true,
    aliases: [spec.label.toLowerCase(), spec.extension.replace(".", ""), "compactar", "comprimir", "compress", "zipar"],
    forward: {
      label: "Compactar",
      inputLabel: "Arquivos",
      outputLabel: spec.label,
    },
    options: levelOptionsFor(format),
  };
}

export const compressOperations: OperationMeta[] = COMPRESSIBLE_FORMATS.map(compressOperation);

/** A rota canônica de compactar: o formato é escolhido dentro dela. */
export const compressEntryOperation: OperationMeta = {
  slug: "compactar",
  name: "Compactar",
  title: "Compactar arquivos",
  subtitle:
    "Escolha o formato, junte os arquivos e baixe. ZIP e TAR guardam vários; GZIP e ZSTD, um por vez.",
  description:
    "Compactador de ZIP, GZIP, ZSTD e TAR com presets de nível, processado no seu navegador. Sem contas, sem histórico e sem armazenar nada.",
  group: "Compactação",
  kind: "file",
  execution: "auto",
  aliases: [
    "compactar", "comprimir", "compress", "zipar", "arquivar",
    "zip", "gzip", "zstd", "tar", "gz", "zst",
  ],
  forward: { label: "Compactar", inputLabel: "Arquivos", outputLabel: "Arquivo compactado" },
  options: [],
};

export const decompressOperation: OperationMeta = {
  slug: "descompactar",
  name: "Descompactar",
  title: "Descompactar",
  subtitle:
    "Abra um arquivo do disco ou cole o conteúdo em Base64 e liste o que há dentro antes de extrair.",
  description:
    "Descompactador de ZIP, RAR, 7Z, TAR, GZIP e ZSTD, a partir de arquivo ou de conteúdo colado em Base64, com listagem de entradas e extração seletiva.",
  group: "Compactação",
  kind: "file",
  execution: "auto",
  aliases: [
    "descompactar", "extrair", "abrir", "unzip", "gunzip", "untar",
    "extract", "unarchive", "zip", "rar", "7z", "tar", "gzip", "zstd",
    "base64", "b64", "colar", "paste", "data url", "hex",
  ],
  forward: {
    label: "Descompactar",
    inputLabel: "Arquivo",
    outputLabel: "Conteúdo",
  },
  options: [],
};

export const compressionOperations: OperationMeta[] = [
  compressEntryOperation,
  decompressOperation,
  // Depois das duas entradas visíveis: são rotas, não itens de menu.
  ...compressOperations,
];
