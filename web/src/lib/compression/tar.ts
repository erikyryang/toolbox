import { OperationError } from "../engines/errors.ts";

/**
 * TAR (USTAR) — leitura e escrita.
 *
 * Escrito à mão porque o formato é simples e as bibliotecas de TAR do npm são
 * construídas sobre streams do Node: trazê-las para o navegador custaria mais
 * polyfill do que o formato inteiro custa em código.
 *
 * Um arquivo TAR é uma sequência de blocos de 512 bytes: um cabeçalho por
 * entrada, o conteúdo alinhado em 512, e dois blocos nulos no fim.
 */

const BLOCK = 512;
const NAME_MAX = 100;

export type TarEntry = {
  name: string;
  data: Uint8Array;
  /** Modo POSIX; o padrão é 0644 para arquivos comuns. */
  mode?: number;
  mtime?: number;
};

export type TarListing = {
  name: string;
  size: number;
  offset: number;
  type: "file" | "directory" | "other";
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function writeString(block: Uint8Array, offset: number, value: string, length: number): void {
  const bytes = encoder.encode(value);
  if (bytes.length > length) {
    throw new OperationError(
      `O nome "${value}" tem ${bytes.length} bytes e não cabe no campo de ${length} do formato TAR.`,
    );
  }
  block.set(bytes.subarray(0, length), offset);
}

function writeOctal(block: Uint8Array, offset: number, value: number, length: number): void {
  // Campos numéricos do TAR são octal em ASCII, terminados por NUL.
  const text = value.toString(8).padStart(length - 1, "0");
  writeString(block, offset, text, length - 1);
}

function readString(block: Uint8Array, offset: number, length: number): string {
  const slice = block.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return decoder.decode(end === -1 ? slice : slice.subarray(0, end)).trim();
}

function readOctal(block: Uint8Array, offset: number, length: number): number {
  const text = readString(block, offset, length);
  if (text === "") return 0;
  const value = parseInt(text, 8);
  return Number.isFinite(value) ? value : 0;
}

function checksum(block: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < BLOCK; i += 1) {
    // O próprio campo de checksum conta como espaços durante o cálculo.
    sum += i >= 148 && i < 156 ? 0x20 : block[i];
  }
  return sum;
}

export function createTar(entries: TarEntry[]): Uint8Array {
  const blocks: Uint8Array[] = [];

  for (const entry of entries) {
    const header = new Uint8Array(BLOCK);

    writeString(header, 0, entry.name, NAME_MAX);
    writeOctal(header, 100, entry.mode ?? 0o644, 8);
    writeOctal(header, 108, 0, 8); // uid
    writeOctal(header, 116, 0, 8); // gid
    writeOctal(header, 124, entry.data.length, 12);
    writeOctal(header, 136, entry.mtime ?? Math.floor(Date.now() / 1000), 12);
    header.set(encoder.encode("        "), 148); // checksum em branco
    header[156] = 0x30; // typeflag "0": arquivo comum
    writeString(header, 257, "ustar", 6);
    header[263] = 0x30;
    header[264] = 0x30; // versão "00"

    const sum = checksum(header);
    writeString(header, 148, sum.toString(8).padStart(6, "0"), 6);
    header[154] = 0;
    header[155] = 0x20;

    blocks.push(header);

    const padded = new Uint8Array(Math.ceil(entry.data.length / BLOCK) * BLOCK);
    padded.set(entry.data);
    blocks.push(padded);
  }

  // Dois blocos nulos encerram o arquivo.
  blocks.push(new Uint8Array(BLOCK * 2));

  const total = blocks.reduce((sum, block) => sum + block.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const block of blocks) {
    out.set(block, offset);
    offset += block.length;
  }
  return out;
}

export function listTar(bytes: Uint8Array): TarListing[] {
  const entries: TarListing[] = [];
  let offset = 0;

  while (offset + BLOCK <= bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK);

    // Bloco nulo: fim do arquivo.
    if (header.every((byte) => byte === 0)) break;

    const declared = readOctal(header, 148, 8);
    if (declared !== 0 && declared !== checksum(header)) {
      throw new OperationError(
        `Checksum inválido no cabeçalho TAR do deslocamento ${offset}: o arquivo parece corrompido.`,
      );
    }

    const name = readString(header, 0, NAME_MAX);
    const prefix = readString(header, 345, 155);
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] || 0x30);

    if (offset + BLOCK + size > bytes.length) {
      throw new OperationError(
        `A entrada "${name}" declara ${size} bytes, mas o arquivo TAR termina antes disso.`,
      );
    }

    entries.push({
      name: prefix === "" ? name : `${prefix}/${name}`,
      size,
      offset: offset + BLOCK,
      type: typeflag === "5" ? "directory" : typeflag === "0" || typeflag === "\0" ? "file" : "other",
    });

    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
  }

  return entries;
}

export function extractTarEntry(bytes: Uint8Array, entry: TarListing): Uint8Array {
  return bytes.subarray(entry.offset, entry.offset + entry.size);
}
