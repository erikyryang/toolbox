import { OperationError } from "../engines/errors.ts";

/**
 * Leitura do cabeçalho de um frame ZSTD (RFC 8878, §3.1.1).
 *
 * O que interessa aqui é um único campo: o tamanho do conteúdo, que o
 * compressor grava quando conhece a entrada inteira — o caso de qualquer
 * arquivo comprimido de disco. Com ele em mãos dá para recusar uma bomba
 * antes de alocar um byte; sem ele, a descompressão precisa correr dentro
 * de um teto arbitrário.
 */

const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

/**
 * Tamanho declarado do conteúdo do primeiro frame, ou `undefined` quando o
 * compressor não gravou o campo. Cabeçalho malformado ou truncado é erro de
 * arquivo — não vale a pena entregar bytes suspeitos ao decodificador.
 */
export function zstdFrameContentSize(data: Uint8Array): number | undefined {
  if (data.length < MAGIC.length + 1 || !MAGIC.every((byte, index) => data[index] === byte)) {
    throw new OperationError({ code: "error.archive" });
  }

  const descriptor = data[MAGIC.length];
  const contentSizeFlag = descriptor >> 6;
  const singleSegment = (descriptor & 0x20) !== 0;
  const reserved = (descriptor & 0x08) !== 0;
  const dictionaryIdFlag = descriptor & 0x03;

  if (reserved) {
    throw new OperationError({ code: "error.archive" });
  }

  let offset = MAGIC.length + 1;
  if (!singleSegment) offset += 1; // Window_Descriptor
  offset += [0, 1, 2, 4][dictionaryIdFlag];

  // Com flag 0 o campo só existe em frames de segmento único, e aí ocupa
  // um byte.
  const fieldSize = [singleSegment ? 1 : 0, 2, 4, 8][contentSizeFlag];
  if (fieldSize === 0) return undefined;

  if (data.length < offset + fieldSize) {
    throw new OperationError({ code: "error.archive" });
  }

  const view = new DataView(data.buffer, data.byteOffset + offset, fieldSize);
  switch (fieldSize) {
    case 1:
      return view.getUint8(0);
    case 2:
      // O campo de dois bytes tem deslocamento: valores até 255 cabem em um.
      return view.getUint16(0, true) + 256;
    case 4:
      return view.getUint32(0, true);
    default:
      return Number(view.getBigUint64(0, true));
  }
}
