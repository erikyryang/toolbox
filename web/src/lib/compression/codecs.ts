import { OperationError } from "../engines/errors.ts";
import { assertDeclaredSizeIsSane, createBombGuard } from "./bomb.ts";
import { detectFormat, describeSignature } from "./detect.ts";
import { FORMATS, clampLevel, type FormatId } from "./formats.ts";
import {
  MAX_EXPANSION_RATIO,
  RATIO_CHECK_FLOOR_BYTES,
  ZSTD_CLIENT_MAX_OUTPUT_BYTES,
  formatBytes,
} from "./limits.ts";
import { createTar, extractTarEntry, listTar, type TarEntry } from "./tar.ts";
import { listZip } from "./zip-listing.ts";
import { zstdFrameContentSize } from "./zstd-frame.ts";

/**
 * Codecs de compactação do navegador.
 *
 * As bibliotecas entram por import dinâmico: as rotas de codificação, que são
 * a maior parte do tráfego, não devem pagar o peso de um WASM de compressão que
 * nunca vão usar.
 */

export type ArchiveEntry = {
  name: string;
  size: number;
  compressedSize?: number;
  directory: boolean;
  encrypted?: boolean;
};

export type CompressInput = {
  format: FormatId;
  level: number;
  files: { name: string; data: Uint8Array }[];
};

// ---------------------------------------------------------------------------
// Compactação
// ---------------------------------------------------------------------------

async function gzip(data: Uint8Array, level: number): Promise<Uint8Array> {
  const { gzipSync } = await import("fflate");
  return gzipSync(data, { level: clampLevel("gzip", level) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
}

/**
 * O módulo WASM do ZSTD é inicializado uma única vez por sessão: um segundo
 * `init()` recria a instância e zera a memória sob os resultados já devolvidos
 * — as saídas seguintes voltariam preenchidas de zeros, com o tamanho certo e
 * o conteúdo errado.
 */
let zstdModule: Promise<typeof import("@bokuweb/zstd-wasm")> | undefined;

function zstdLib(): Promise<typeof import("@bokuweb/zstd-wasm")> {
  zstdModule ??= (async () => {
    const loaded = await import("@bokuweb/zstd-wasm");
    await loaded.init();
    return loaded;
  })();
  return zstdModule;
}

async function zstd(data: Uint8Array, level: number): Promise<Uint8Array> {
  const zstdWasm = await zstdLib();
  // O retorno é uma janela sobre a memória do WASM; a cópia é o que torna o
  // resultado seguro de guardar.
  return Uint8Array.from(zstdWasm.compress(data, clampLevel("zstd", level)));
}

export async function compress({
  format,
  level,
  files,
}: CompressInput): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new OperationError({ code: "error.noFiles" });
  }

  const spec = FORMATS[format];
  if (!spec.clientCompress) {
    throw new OperationError({ code: "error.serverFormat", params: { format: spec.label } });
  }

  const single = files[0];

  switch (format) {
    case "zip": {
      const { zipSync } = await import("fflate");
      const entries: Record<string, [Uint8Array, { level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }]> = {};
      for (const file of files) {
        entries[file.name] = [
          file.data,
          { level: clampLevel("zip", level) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 },
        ];
      }
      return zipSync(entries);
    }

    case "gzip":
      return gzip(single.data, level);

    case "zstd":
      return zstd(single.data, level);

    case "tar":
      return createTar(files.map(toTarEntry));

    default:
      throw new OperationError({ code: "error.serverFormat", params: { format: spec.label } });
  }
}

function toTarEntry(file: { name: string; data: Uint8Array }): TarEntry {
  return { name: file.name, data: file.data };
}

// ---------------------------------------------------------------------------
// Descompactação
// ---------------------------------------------------------------------------

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const { Gunzip } = await import("fflate");
  const guard = createBombGuard(data.length);
  const chunks: Uint8Array[] = [];
  const stream = new Gunzip((chunk) => {
    guard.add(chunk.length);
    chunks.push(chunk);
  });
  for (let offset = 0; offset < data.length; offset += 64 * 1024) {
    stream.push(data.subarray(offset, offset + 64 * 1024), offset + 64 * 1024 >= data.length);
  }
  return concat(chunks, guard.total());
}

/**
 * Código que o ZSTD devolve quando a saída não cabe no destino
 * (`ZSTD_error_dstSize_tooSmall`). A biblioteca só repassa o número na
 * mensagem, e é ele que separa "passou do teto" de "arquivo corrompido".
 */
const ZSTD_DESTINATION_TOO_SMALL = 70;

function isDestinationTooSmall(failure: unknown): boolean {
  const match = failure instanceof Error ? /code (-?\d+)$/.exec(failure.message) : null;
  if (!match) return false;
  const code = Number(match[1]);
  return code === -ZSTD_DESTINATION_TOO_SMALL || code === 2 ** 32 - ZSTD_DESTINATION_TOO_SMALL;
}

/**
 * A API é síncrona e sem streaming, então o guarda anti-bomba não pode agir
 * conforme a saída cresce. Age antes: pelo tamanho que o cabeçalho declara,
 * quando declara, e pelo teto de alocação que a biblioteca respeita quando
 * não declara — o decodificador falha em vez de crescer além dele.
 */
async function unzstd(data: Uint8Array): Promise<Uint8Array> {
  const declared = zstdFrameContentSize(data);
  const zstdWasm = await zstdLib();

  if (declared !== undefined) {
    assertDeclaredSizeIsSane(data.length, declared);
    if (declared > ZSTD_CLIENT_MAX_OUTPUT_BYTES) {
      throw new OperationError({ code: "error.declaredLimit", params: { size: formatBytes(declared), limit: formatBytes(ZSTD_CLIENT_MAX_OUTPUT_BYTES) } });
    }
    try {
      return zstdWasm.decompress(data);
    } catch {
      throw new OperationError({ code: "error.archive" });
    }
  }

  // Sem tamanho declarado, o teto é o mesmo que o guarda incremental
  // aplicaria: a razão de expansão acima do piso, limitada ao orçamento do
  // navegador.
  const capacity = Math.min(
    ZSTD_CLIENT_MAX_OUTPUT_BYTES,
    Math.max(RATIO_CHECK_FLOOR_BYTES, data.length * MAX_EXPANSION_RATIO),
  );
  try {
    return zstdWasm.decompress(data, { defaultHeapSize: capacity });
  } catch (failure) {
    if (!isDestinationTooSmall(failure)) {
      throw new OperationError({ code: "error.archive" });
    }
    throw capacity === ZSTD_CLIENT_MAX_OUTPUT_BYTES
      ? new OperationError({ code: "error.outputLimit", params: { limit: formatBytes(ZSTD_CLIENT_MAX_OUTPUT_BYTES) } })
      : new OperationError({ code: "error.expansionLimit", params: { ratio: MAX_EXPANSION_RATIO } });
  }
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Extrai uma entrada ZIP por blocos, aplicando o guarda antes de reter cada um. */
async function extractZipEntry(data: Uint8Array, entryName?: string): Promise<Uint8Array> {
  const { Unzip, UnzipInflate, UnzipPassThrough } = await import("fflate");

  return new Promise<Uint8Array>((resolve, reject) => {
    const guard = createBombGuard(data.length);
    const chunks: Uint8Array[] = [];
    let found = false;
    let settled = false;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new OperationError({ code: "error.archive" }));
    };

    const unzip = new Unzip((file) => {
      const wanted = entryName === undefined ? !found && !file.name.endsWith("/") : file.name === entryName;
      if (!wanted) return;
      found = true;
      file.ondata = (error, chunk, final) => {
        if (error) {
          fail(error);
          return;
        }
        try {
          guard.add(chunk.length);
          chunks.push(chunk);
          if (final && !settled) {
            settled = true;
            resolve(concat(chunks, guard.total()));
          }
        } catch (failure) {
          file.terminate();
          fail(failure);
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    unzip.register(UnzipPassThrough);

    try {
      for (let offset = 0; offset < data.length; offset += 64 * 1024) {
        unzip.push(data.subarray(offset, offset + 64 * 1024), offset + 64 * 1024 >= data.length);
      }
      if (!found && !settled) {
        fail(new OperationError({ code: "error.entry" }));
      }
    } catch (failure) {
      fail(failure);
    }
  });
}

/** Remove o envelope de compressão, devolvendo o conteúdo bruto. */
async function decompressEnvelope(
  format: FormatId,
  data: Uint8Array,
): Promise<Uint8Array> {
  switch (format) {
    case "gzip":
      return gunzip(data);
    case "zstd":
      return unzstd(data);
    default:
      return data;
  }
}

export type Archive = {
  format: FormatId;
  entries: ArchiveEntry[];
  /** Verdadeiro quando o arquivo tem um único conteúdo, sem índice. */
  single: boolean;
  /**
   * Conteúdo já descomprimido durante a inspeção, quando houve. Guardá-lo
   * evita descomprimir o mesmo envelope duas vezes — uma para listar, outra
   * para extrair.
   */
  payload?: Uint8Array;
};

/**
 * Lê o índice do arquivo sem extrair conteúdo. Para formatos de um só membro
 * não há índice, e a entrada única é sintética.
 */
export async function inspect(
  data: Uint8Array,
  fileName?: string,
): Promise<Archive> {
  const format = detectFormat(data);

  if (!format) {
    throw new OperationError({ code: "error.signature", params: { signature: describeSignature(data) } });
  }

  const spec = FORMATS[format];
  if (!spec.clientDecompress) {
    throw new OperationError({ code: "error.serverFormat", params: { format: spec.label } });
  }

  if (format === "zip") {
    const entries = listZip(data);
    const encrypted = entries.find((entry) => entry.encrypted);
    if (encrypted) {
      throw new OperationError({ code: "error.encrypted" });
    }

    for (const entry of entries) {
      assertDeclaredSizeIsSane(entry.compressedSize, entry.uncompressedSize);
    }

    return {
      format,
      single: false,
      entries: entries.map((entry) => ({
        name: entry.name,
        size: entry.uncompressedSize,
        compressedSize: entry.compressedSize,
        directory: entry.directory,
        encrypted: entry.encrypted,
      })),
    };
  }

  if (format === "tar") {
    return {
      format,
      single: false,
      entries: listTar(data).map((entry) => ({
        name: entry.name,
        size: entry.size,
        directory: entry.type === "directory",
      })),
    };
  }

  // Envelope de um só membro: pode conter um TAR dentro, e nesse caso o
  // índice de verdade é o do TAR — o formato continua sendo o do envelope.
  const inner = await decompressEnvelope(format, data);
  const innerFormat = detectFormat(inner);

  if (innerFormat === "tar") {
    return {
      format,
      single: false,
      payload: inner,
      entries: listTar(inner).map((entry) => ({
        name: entry.name,
        size: entry.size,
        directory: entry.type === "directory",
      })),
    };
  }

  return {
    format,
    single: true,
    payload: inner,
    entries: [
      {
        name: strippedName(fileName, format),
        size: inner.length,
        compressedSize: data.length,
        directory: false,
      },
    ],
  };
}

function strippedName(fileName: string | undefined, format: FormatId): string {
  const extension = FORMATS[format].extension;
  if (!fileName) return "conteudo";
  return fileName.endsWith(extension)
    ? fileName.slice(0, -extension.length)
    : `${fileName}.extraido`;
}

/** Extrai uma entrada — ou o conteúdo único, quando o formato não tem índice. */
export async function extract(
  data: Uint8Array,
  archive: Archive,
  entryName?: string,
): Promise<Uint8Array> {
  if (archive.format === "zip") {
    return extractZipEntry(data, entryName);
  }

  const inner = archive.payload ?? (await decompressEnvelope(archive.format, data));

  if (archive.single) return inner;

  const source = archive.format === "tar" ? data : inner;
  const listing = listTar(source);
  const entry = entryName
    ? listing.find((item) => item.name === entryName)
    : listing.find((item) => item.type === "file");

  if (!entry) {
    throw new OperationError({ code: "error.entry" });
  }

  return extractTarEntry(source, entry);
}
