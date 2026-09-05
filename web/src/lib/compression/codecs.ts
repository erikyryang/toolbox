import { OperationError } from "../engines/errors.ts";
import { assertDeclaredSizeIsSane, createBombGuard } from "./bomb.ts";
import { detectFormat, describeSignature } from "./detect.ts";
import { FORMATS, clampLevel, type FormatId } from "./formats.ts";
import { createTar, extractTarEntry, listTar, type TarEntry } from "./tar.ts";
import { listZip } from "./zip-listing.ts";

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
    throw new OperationError("Nenhum arquivo para compactar.");
  }

  const spec = FORMATS[format];
  if (!spec.clientCompress) {
    throw new OperationError(
      `${spec.label} não é compactado no navegador — esta operação vai para o servidor.`,
    );
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

    case "tar.gz":
      return gzip(createTar(files.map(toTarEntry)), level);

    case "tar.zst":
      return zstd(createTar(files.map(toTarEntry)), level);

    default:
      throw new OperationError(
        `${spec.label} não tem compressor no navegador.`,
      );
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

async function unxz(data: Uint8Array): Promise<Uint8Array> {
  // O pacote é publicado em CJS: conforme o empacotador, a classe chega como
  // exportação nomeada ou pendurada no default.
  const loaded = await import("xz-decompress");
  const XzReadableStream =
    loaded.XzReadableStream ??
    (loaded as unknown as { default: typeof loaded }).default.XzReadableStream;

  const guard = createBombGuard(data.length);

  const source = new Response(data as BlobPart).body;
  if (!source) {
    throw new OperationError("Não foi possível abrir o arquivo XZ para leitura.");
  }

  const reader = new XzReadableStream(source).getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // O guarda roda a cada bloco: uma bomba é interrompida durante a
    // descompressão, não depois de a memória já ter sido consumida.
    guard.add(value.length);
    chunks.push(value);
  }

  return concat(chunks, guard.total());
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
      reject(error instanceof Error ? error : new OperationError("Não foi possível extrair o ZIP."));
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
        fail(new OperationError("A entrada pedida não existe no arquivo."));
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
    case "tar.gz":
      return gunzip(data);
    case "xz":
      return unxz(data);
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
    throw new OperationError(
      `Formato não identificado. Os primeiros bytes são ${describeSignature(data)}, que não correspondem a nenhum formato suportado.`,
    );
  }

  const spec = FORMATS[format];
  if (!spec.clientDecompress) {
    throw new OperationError(
      `${spec.label} não é lido no navegador — esta operação vai para o servidor.`,
    );
  }

  if (format === "zip") {
    const entries = listZip(data);
    const encrypted = entries.find((entry) => entry.encrypted);
    if (encrypted) {
      throw new OperationError(
        "O ZIP tem entradas protegidas por senha, e arquivos criptografados não são suportados.",
      );
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

  // Envelope de um só membro: pode conter um TAR dentro.
  const inner = await decompressEnvelope(format, data);
  const innerFormat = detectFormat(inner);

  if (innerFormat === "tar") {
    return {
      format: format === "gzip" ? "tar.gz" : format === "zstd" ? "tar.zst" : format,
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
    throw new OperationError(`A entrada "${entryName}" não existe no arquivo.`);
  }

  return extractTarEntry(source, entry);
}
