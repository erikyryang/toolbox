import { describe, expect, it } from "vitest";

import { OperationError } from "../engines/errors.ts";
import { assertDeclaredSizeIsSane, createBombGuard } from "./bomb.ts";
import { compress, extract, inspect } from "./codecs.ts";
import { detectFormat } from "./detect.ts";
import {
  COMPRESSIBLE_FORMATS,
  FORMATS,
  clampLevel,
  isLevelInRange,
  levelForPreset,
  type FormatId,
  type Preset,
} from "./formats.ts";
import {
  CLIENT_MAX_BYTES,
  MAX_EXPANSION_RATIO,
  MAX_OUTPUT_BYTES,
  RATIO_CHECK_FLOOR_BYTES,
  ZSTD_CLIENT_MAX_LEVEL,
  decideRouting,
} from "./limits.ts";
import { createTar, listTar } from "./tar.ts";
import { listZip } from "./zip-listing.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CONTENT_A = "conteúdo do arquivo A\n".repeat(20);
const CONTENT_B = "outro conteúdo, bem diferente\n".repeat(30);

function files() {
  return [
    { name: "a.txt", data: encoder.encode(CONTENT_A) },
    { name: "pasta/b.txt", data: encoder.encode(CONTENT_B) },
  ];
}

/** Formatos que o navegador realmente compacta. */
const CLIENT_COMPRESSIBLE = COMPRESSIBLE_FORMATS.filter(
  (format) => FORMATS[format].clientCompress,
);
const CLIENT_ROUND_TRIP = CLIENT_COMPRESSIBLE.filter(
  (format) => FORMATS[format].clientDecompress,
);

const SINGLE_MEMBER: FormatId[] = ["gzip", "zstd"];

describe("compactação no navegador", () => {
  it.each(CLIENT_ROUND_TRIP)("%s faz ida e volta preservando o conteúdo", async (format) => {
    const input = SINGLE_MEMBER.includes(format) ? [files()[0]] : files();
    const packed = await compress({ format, level: 6, files: input });

    expect(packed.length).toBeGreaterThan(0);

    const archive = await inspect(packed, `teste${FORMATS[format].extension}`);
    const target = archive.single
      ? undefined
      : archive.entries.find((entry) => !entry.directory)?.name;
    const extracted = await extract(packed, archive, target);

    expect(decoder.decode(extracted)).toBe(CONTENT_A);
  });

  it("lista as duas entradas de um container", async () => {
    const packed = await compress({ format: "zip", level: 6, files: files() });
    const archive = await inspect(packed);

    expect(archive.entries.map((entry) => entry.name)).toEqual(["a.txt", "pasta/b.txt"]);
    expect(archive.single).toBe(false);
  });

  it("extrai uma entrada específica de um ZIP", async () => {
    const packed = await compress({ format: "zip", level: 6, files: files() });
    const archive = await inspect(packed);

    expect(decoder.decode(await extract(packed, archive, "pasta/b.txt"))).toBe(CONTENT_B);
  });

  it("mostra tamanho original e comprimido na listagem de ZIP", async () => {
    const packed = await compress({ format: "zip", level: 9, files: files() });
    const [entry] = listZip(packed);

    expect(entry.uncompressedSize).toBe(encoder.encode(CONTENT_A).length);
    expect(entry.compressedSize).toBeLessThan(entry.uncompressedSize);
  });

  it("nível mais alto não gera saída maior que o mais baixo", async () => {
    const input = [files()[0]];
    const fast = await compress({ format: "gzip", level: 1, files: input });
    const max = await compress({ format: "gzip", level: 9, files: input });

    expect(max.length).toBeLessThanOrEqual(fast.length);
  });

  it("recusa compactar em formato sem compressor no navegador", async () => {
    await expect(
      compress({ format: "xz", level: 6, files: files() }),
    ).rejects.toThrow(OperationError);
  });

  it("recusa lista vazia", async () => {
    await expect(compress({ format: "zip", level: 6, files: [] })).rejects.toThrow(
      /Nenhum arquivo/,
    );
  });
});

describe("detecção de formato", () => {
  it.each(CLIENT_COMPRESSIBLE)("reconhece %s pela assinatura", async (format) => {
    const input = SINGLE_MEMBER.includes(format) ? [files()[0]] : files();
    const packed = await compress({ format, level: 3, files: input });
    const detected = detectFormat(packed);

    // tar.gz e tar.zst têm a assinatura do envelope; o TAR interno só aparece
    // depois de descomprimir, e é a inspeção que resolve isso.
    const expected =
      format === "tar.gz" ? "gzip" : format === "tar.zst" ? "zstd" : format;
    expect(detected).toBe(expected);
  });

  it("distingue tar.gz de gzip simples na inspeção", async () => {
    const tarGz = await compress({ format: "tar.gz", level: 3, files: files() });
    const gzip = await compress({ format: "gzip", level: 3, files: [files()[0]] });

    expect((await inspect(tarGz)).format).toBe("tar.gz");
    expect((await inspect(gzip, "a.txt.gz")).format).toBe("gzip");
  });

  it("erra com clareza em formato desconhecido", async () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(inspect(bytes)).rejects.toThrow(/não identificado/);
  });

  it("erra com clareza em formato que só o backend lê", async () => {
    // Assinatura de 7Z sem conteúdo válido: o erro deve falar do formato,
    // não estourar no parser.
    const bytes = Uint8Array.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0, 0]);
    await expect(inspect(bytes)).rejects.toThrow(/servidor/);
  });
});

describe("presets de nível", () => {
  const presets: Preset[] = ["fast", "balanced", "max"];

  it.each(COMPRESSIBLE_FORMATS)("os presets de %s caem dentro do range", (format) => {
    for (const preset of presets) {
      const level = levelForPreset(format, preset);
      expect(isLevelInRange(format, level), `${format}/${preset} = ${level}`).toBe(true);
    }
  });

  it("mapeia o preset máximo para o topo útil de cada formato", () => {
    expect(levelForPreset("gzip", "max")).toBe(9);
    expect(levelForPreset("zstd", "max")).toBe(19);
    expect(levelForPreset("xz", "max")).toBe(9);
  });

  it("os presets crescem monotonicamente", () => {
    for (const format of COMPRESSIBLE_FORMATS) {
      const [fast, balanced, max] = presets.map((preset) => levelForPreset(format, preset));
      expect(fast, format).toBeLessThanOrEqual(balanced);
      expect(balanced, format).toBeLessThanOrEqual(max);
    }
  });

  it("o preset customizado respeita o nível escolhido", () => {
    expect(levelForPreset("zstd", "custom", 15)).toBe(15);
  });

  it("nível fora do range é trazido para dentro", () => {
    expect(clampLevel("gzip", 42)).toBe(9);
    expect(clampLevel("zstd", 0)).toBe(1);
    expect(levelForPreset("gzip", "custom", 99)).toBe(9);
  });
});

describe("roteamento entre navegador e servidor", () => {
  it("fica no navegador dentro dos limites", () => {
    expect(
      decideRouting({ format: "gzip", direction: "compress", sizeBytes: 1024, level: 6 }),
    ).toEqual({ where: "client" });
  });

  it("vai ao servidor quando o formato exige", () => {
    for (const format of ["rar", "7z"] as FormatId[]) {
      const decision = decideRouting({ format, direction: "decompress", sizeBytes: 1024 });
      expect(decision.where, format).toBe("server");
      expect(decision.reason).toBeTruthy();
    }
  });

  it("vai ao servidor para comprimir XZ e BZIP2", () => {
    for (const format of ["xz", "bzip2"] as FormatId[]) {
      expect(
        decideRouting({ format, direction: "compress", sizeBytes: 1024, level: 6 }).where,
        format,
      ).toBe("server");
    }
  });

  it("lê XZ no navegador e roteia BZIP2 ao servidor", () => {
    expect(decideRouting({ format: "xz", direction: "decompress", sizeBytes: 1024 }).where).toBe("client");
    expect(decideRouting({ format: "bzip2", direction: "decompress", sizeBytes: 1024 }).where).toBe("server");
  });

  it("vai ao servidor acima do teto de nível do ZSTD", () => {
    const decision = decideRouting({
      format: "zstd",
      direction: "compress",
      sizeBytes: 1024,
      level: ZSTD_CLIENT_MAX_LEVEL + 1,
    });
    expect(decision.where).toBe("server");
    expect(decision.reason).toContain("nível");
  });

  it("fica no navegador no teto exato de nível", () => {
    expect(
      decideRouting({
        format: "zstd",
        direction: "compress",
        sizeBytes: 1024,
        level: ZSTD_CLIENT_MAX_LEVEL,
      }).where,
    ).toBe("client");
  });

  it("vai ao servidor acima do limite de tamanho", () => {
    const decision = decideRouting({
      format: "gzip",
      direction: "compress",
      sizeBytes: CLIENT_MAX_BYTES + 1,
      level: 6,
    });
    expect(decision.where).toBe("server");
    expect(decision.reason).toContain("limite");
  });

  it("dá sempre um motivo quando manda para o servidor", () => {
    const decisions = [
      decideRouting({ format: "rar", direction: "decompress", sizeBytes: 1 }),
      decideRouting({ format: "zstd", direction: "compress", sizeBytes: 1, level: 22 }),
      decideRouting({ format: "gzip", direction: "compress", sizeBytes: CLIENT_MAX_BYTES * 2 }),
    ];
    for (const decision of decisions) {
      expect(decision.where).toBe("server");
      expect(decision.reason?.length ?? 0).toBeGreaterThan(10);
    }
  });
});

describe("proteção contra bomba de descompressão", () => {
  /** Tamanho comprimido que estoura a razão logo acima do piso absoluto. */
  const bombCompressed = Math.ceil(RATIO_CHECK_FLOOR_BYTES / MAX_EXPANSION_RATIO);

  it("aborta ao passar da razão de expansão acima do piso", () => {
    const guard = createBombGuard(bombCompressed);
    expect(() => guard.add(RATIO_CHECK_FLOOR_BYTES * 2)).toThrow(/bomba/);
  });

  it("não acusa dado honesto muito compressível abaixo do piso", () => {
    // 16 KB que viram 5 MB são mais de 300× — e são um arquivo comum.
    const guard = createBombGuard(16 * 1024);
    expect(() => guard.add(5 * 1024 * 1024)).not.toThrow();
  });

  it("aborta ao passar do teto de bytes de saída", () => {
    const guard = createBombGuard(MAX_OUTPUT_BYTES);
    expect(() => guard.add(MAX_OUTPUT_BYTES + 1)).toThrow(/saída/);
  });

  it("deixa passar uma expansão comum", () => {
    const guard = createBombGuard(1000);
    expect(() => guard.add(10_000)).not.toThrow();
    expect(guard.total()).toBe(10_000);
  });

  it("acumula entre blocos, em vez de olhar cada um isoladamente", () => {
    const guard = createBombGuard(bombCompressed);
    const chunk = Math.ceil(RATIO_CHECK_FLOOR_BYTES / 2);
    expect(() => {
      guard.add(chunk);
      guard.add(chunk);
      guard.add(chunk);
    }).toThrow(/bomba/);
  });

  it("recusa tamanho declarado absurdo antes de alocar memória", () => {
    expect(() =>
      assertDeclaredSizeIsSane(bombCompressed, RATIO_CHECK_FLOOR_BYTES * 2),
    ).toThrow(/bomba/);
    expect(() => assertDeclaredSizeIsSane(100, 1000)).not.toThrow();
  });
});

describe("TAR", () => {
  it("escreve e lê entradas", () => {
    const tar = createTar([
      { name: "a.txt", data: encoder.encode("A") },
      { name: "dir/b.txt", data: encoder.encode(CONTENT_B) },
    ]);
    const entries = listTar(tar);

    expect(entries.map((entry) => entry.name)).toEqual(["a.txt", "dir/b.txt"]);
    expect(entries[1].size).toBe(encoder.encode(CONTENT_B).length);
  });

  it("alinha em blocos de 512 bytes e fecha com dois blocos nulos", () => {
    const tar = createTar([{ name: "a.txt", data: encoder.encode("A") }]);
    expect(tar.length % 512).toBe(0);
    expect(tar.subarray(tar.length - 1024).every((byte) => byte === 0)).toBe(true);
  });

  it("recusa nome que não cabe no cabeçalho", () => {
    expect(() =>
      createTar([{ name: "x".repeat(101), data: encoder.encode("A") }]),
    ).toThrow(OperationError);
  });

  it("detecta cabeçalho corrompido pelo checksum", () => {
    const tar = createTar([{ name: "a.txt", data: encoder.encode("A") }]);
    tar[0] = 0x7a; // muda o nome sem recalcular o checksum
    expect(() => listTar(tar)).toThrow(/[Cc]hecksum/);
  });
});

describe("listagem de ZIP", () => {
  it("recusa arquivo curto demais", () => {
    expect(() => listZip(Uint8Array.from([1, 2, 3]))).toThrow(/curto/);
  });

  it("recusa arquivo sem diretório central", () => {
    const bytes = new Uint8Array(64);
    bytes.set([0x50, 0x4b, 0x03, 0x04]);
    expect(() => listZip(bytes)).toThrow(/diretório central/);
  });
});
