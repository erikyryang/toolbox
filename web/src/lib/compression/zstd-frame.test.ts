import { describe, expect, it } from "vitest";
import { feedbackFrom, feedbackFromRejection } from "../messages.testing.ts";

import { compress, extract, inspect } from "./codecs.ts";
import { MAX_EXPANSION_RATIO, RATIO_CHECK_FLOOR_BYTES } from "./limits.ts";
import { zstdFrameContentSize } from "./zstd-frame.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

/**
 * Reescreve o cabeçalho de um frame para não declarar o tamanho, como faz
 * um compressor que lê de um pipe. Os blocos ficam intactos: o decodificador
 * só confere o tamanho declarado quando ele existe.
 */
function withoutContentSize(frame: Uint8Array): Uint8Array {
  const descriptor = frame[4];
  const singleSegment = (descriptor & 0x20) !== 0;
  const fieldSize = [singleSegment ? 1 : 0, 2, 4, 8][descriptor >> 6];
  const headerLength = 5 + (singleSegment ? 0 : 1) + fieldSize;
  // Sem segmento único é preciso um Window_Descriptor: expoente 10, 1 MB.
  const header = [...MAGIC, descriptor & 0x1f, 0x50];
  return Uint8Array.from([...header, ...frame.subarray(headerLength)]);
}

async function zstd(content: string): Promise<Uint8Array> {
  return compress({ format: "zstd", level: 3, files: [{ name: "x", data: encoder.encode(content) }] });
}

describe("cabeçalho do frame ZSTD", () => {
  it.each([
    ["um byte", "a".repeat(100)],
    ["dois bytes", "conteúdo pequeno\n".repeat(40)],
    ["quatro bytes", Array.from({ length: 20_000 }, (_, index) => `linha ${index * 7919}\n`).join("")],
  ])("lê o tamanho declarado no campo de %s", async (_, content) => {
    expect(zstdFrameContentSize(await zstd(content))).toBe(encoder.encode(content).length);
  });

  it("devolve indefinido quando o compressor não declarou o tamanho", async () => {
    expect(zstdFrameContentSize(withoutContentSize(await zstd("x".repeat(300))))).toBeUndefined();
  });

  it("recusa cabeçalho truncado ou sem assinatura", () => {
    expect(feedbackFrom(() => zstdFrameContentSize(Uint8Array.from([...MAGIC, 0x40]))).code).toBe("error.archive");
    expect(feedbackFrom(() => zstdFrameContentSize(Uint8Array.from([1, 2, 3, 4, 5, 6]))).code).toBe("error.archive");
  });
});

describe("descompressão ZSTD no navegador", () => {
  it("extrai um frame sem tamanho declarado dentro do teto", async () => {
    const content = "sem tamanho declarado\n".repeat(50);
    const packed = withoutContentSize(await zstd(content));

    const archive = await inspect(packed, "x.zst");
    expect(archive.single).toBe(true);
    expect(decoder.decode(await extract(packed, archive))).toBe(content);
  });

  it("interrompe um frame sem tamanho declarado que passa da razão de expansão", async () => {
    // Zeros comprimem a milhares de vezes: acima do piso, o teto passa a ser
    // a razão — e o decodificador tem que falhar em vez de alocar além dela.
    const zeros = new Uint8Array(RATIO_CHECK_FLOOR_BYTES + 1024 * 1024);
    const packed = withoutContentSize(await compress({ format: "zstd", level: 1, files: [{ name: "x", data: zeros }] }));
    expect(packed.length * MAX_EXPANSION_RATIO).toBeLessThan(zeros.length);

    const feedback = await feedbackFromRejection(inspect(packed, "x.zst"));
    expect(feedback.code).toBe("error.expansionLimit");
  });

  it("recusa antes de alocar um frame que declara mais do que o teto", async () => {
    const packed = await zstd("x".repeat(300));
    // Tamanho declarado de 8 bytes: 1 TB, sem mexer nos blocos.
    const descriptor = packed[4];
    const singleSegment = (descriptor & 0x20) !== 0;
    const headerLength = 5 + (singleSegment ? 0 : 1) + [singleSegment ? 1 : 0, 2, 4, 8][descriptor >> 6];
    const size = new Uint8Array(8);
    new DataView(size.buffer).setBigUint64(0, 1n << 40n, true);
    const bomb = Uint8Array.from([...MAGIC, (descriptor & 0x1f) | 0xc0, 0x50, ...size, ...packed.subarray(headerLength)]);

    expect((await feedbackFromRejection(inspect(bomb, "x.zst"))).code).toBe("error.declaredLimit");
  });

  it("erra como arquivo corrompido quando os blocos estão danificados", async () => {
    const packed = await zstd("conteúdo íntegro\n".repeat(40));
    packed.fill(0xff, 8);
    expect((await feedbackFromRejection(inspect(packed, "x.zst"))).code).toBe("error.archive");
  });
});
