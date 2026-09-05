import { OperationError } from "../engines/errors.ts";

/**
 * Leitura do diretório central de um ZIP.
 *
 * É a razão pela qual ZIP não pode ser lido em streaming: o índice das entradas
 * fica no fim do arquivo, e é preciso voltar atrás para saber o que existe
 * dentro. Ler só o diretório central permite listar nomes e tamanhos sem
 * descomprimir um byte de conteúdo.
 */

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
/** O comentário final do ZIP tem no máximo 64 KiB. */
const MAX_COMMENT = 0xffff;

export type ZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  method: number;
  directory: boolean;
  encrypted: boolean;
};

function findEndOfCentralDirectory(view: DataView, bytes: Uint8Array): number {
  const start = Math.max(0, bytes.length - MAX_COMMENT - 22);
  for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new OperationError(
    "Fim do diretório central não encontrado: o arquivo não parece ser um ZIP válido (ou está truncado).",
  );
}

export function listZip(bytes: Uint8Array): ZipEntry[] {
  if (bytes.length < 22) {
    throw new OperationError("O arquivo é curto demais para ser um ZIP.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view, bytes);

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  if (offset >= bytes.length) {
    throw new OperationError(
      "O diretório central aponta para fora do arquivo — provavelmente um ZIP64, ainda não suportado no navegador.",
    );
  }

  const entries: ZipEntry[] = [];
  const decoder = new TextDecoder("utf-8");

  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_FILE_HEADER) {
      throw new OperationError(
        `Cabeçalho de entrada inválido no deslocamento ${offset} do diretório central.`,
      );
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);

    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      method,
      directory: name.endsWith("/"),
      // Bit 0 dos flags gerais marca entrada criptografada.
      encrypted: (flags & 0x0001) !== 0,
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
