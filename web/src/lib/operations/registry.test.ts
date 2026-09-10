import { describe, expect, it } from "vitest";
import { OperationError } from "../engines/errors.ts";
import { COMPRESSIBLE_FORMATS } from "../compression/formats.ts";
import {
  QUICK_START_SLUGS,
  operationCatalog,
  operationSlugs,
  operationsByGroup,
} from "./catalog.ts";
import { formatForSlug, slugForFormat } from "./compression-catalog.ts";
import { getOperation, implementedSlugs } from "./registry.ts";
import { defaultOptionValues, splitOptions } from "./types.ts";

/**
 * Operações de arquivo não têm motor de texto: elas rodam no worker de
 * compactação. Os invariantes de motor valem para as operações de texto.
 */
const textOperations = operationCatalog.filter((meta) => meta.kind !== "file");
const fileOperations = operationCatalog.filter((meta) => meta.kind === "file");

describe("catálogo e motores", () => {
  it("todo slug de operação de texto tem motor registrado", () => {
    for (const meta of textOperations) {
      expect(getOperation(meta.slug), `sem motor: ${meta.slug}`).toBeDefined();
    }
  });

  it("toda operação de arquivo é de compactação e tem destino conhecido", () => {
    for (const meta of fileOperations) {
      expect(meta.group).toBe("Compactação");
      // Três casos: a rota semeia um formato, é a tela canônica de compactar
      // (onde o formato é escolhido) ou é a que detecta o formato do arquivo.
      const known =
        formatForSlug(meta.slug) !== undefined ||
        meta.slug === "compactar" ||
        meta.slug === "descompactar";
      expect(known, `rota de arquivo sem destino: ${meta.slug}`).toBe(true);
    }
  });

  it("a navegação de compactação tem só as duas entradas simétricas", () => {
    const compression = operationsByGroup().find(({ group }) => group === "Compactação");
    expect(compression?.items.map((item) => item.slug)).toEqual([
      "compactar",
      "descompactar",
    ]);
  });

  it("as rotas por formato somem do menu mas continuam sendo rotas", () => {
    const listed = operationsByGroup().flatMap(({ items }) => items.map((i) => i.slug));
    for (const format of COMPRESSIBLE_FORMATS) {
      const slug = slugForFormat(format);
      expect(operationSlugs(), `rota perdida: ${slug}`).toContain(slug);
      expect(listed, `deveria estar fora do menu: ${slug}`).not.toContain(slug);
    }
  });

  it("todo atalho da home aponta para uma operação que está na navegação", () => {
    const listed = operationsByGroup().flatMap(({ items }) => items.map((i) => i.slug));
    for (const slug of QUICK_START_SLUGS) {
      expect(listed, `atalho quebrado na home: ${slug}`).toContain(slug);
    }
  });

  it("toda rota fora do menu tem metadados próprios para ser indexável", () => {
    for (const meta of operationCatalog.filter((operation) => operation.unlisted)) {
      expect(meta.title.length, meta.slug).toBeGreaterThan(0);
      expect(meta.description.length, meta.slug).toBeGreaterThan(20);
    }
  });

  it("todo motor registrado tem entrada no catálogo", () => {
    for (const slug of implementedSlugs()) {
      expect(operationSlugs()).toContain(slug);
    }
  });

  it("os slugs são únicos", () => {
    const slugs = operationSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("operação reversível tem motor para os dois sentidos", () => {
    for (const meta of textOperations) {
      const operation = getOperation(meta.slug);
      if (meta.reverse) {
        expect(operation?.engines.reverse, `sem motor reverso: ${meta.slug}`).toBeTypeOf(
          "function",
        );
      } else {
        expect(operation?.engines.reverse).toBeUndefined();
      }
    }
  });

  it("todo motor falha apenas com erro legível", () => {
    // Placeholders são ilustrativos e nem sempre são entrada válida — o que
    // precisa valer é que nenhuma falha escape como exceção crua.
    for (const meta of textOperations) {
      const operation = getOperation(meta.slug)!;
      const options = defaultOptionValues(meta);

      try {
        operation.engines.forward(meta.placeholder ?? "toolbox", options);
      } catch (error) {
        expect(error, `${meta.slug} lançou algo que não é OperationError`).toBeInstanceOf(
          OperationError,
        );
        expect((error as OperationError).message.length).toBeGreaterThan(10);
      }
    }
  });

  it("nenhum motor lança com entrada vazia", () => {
    for (const meta of textOperations) {
      const operation = getOperation(meta.slug)!;
      const options = defaultOptionValues(meta);
      expect(() => operation.engines.forward("", options), meta.slug).not.toThrow();
      if (operation.engines.reverse) {
        expect(() => operation.engines.reverse!("", options), meta.slug).not.toThrow();
      }
    }
  });

  it("toda opção declarada como principal existe na operação", () => {
    for (const meta of operationCatalog) {
      const ids = meta.options.map((option) => option.id);
      for (const id of meta.primaryOptionIds ?? []) {
        expect(ids, `opção principal inexistente em ${meta.slug}: ${id}`).toContain(id);
      }
    }
  });

  it("principal e avançada juntas são todas as opções, sem repetição", () => {
    for (const meta of operationCatalog) {
      const { primary, advanced } = splitOptions(meta);
      expect(primary.length + advanced.length, meta.slug).toBe(meta.options.length);
      const ids = [...primary, ...advanced].map((option) => option.id);
      expect(new Set(ids).size, meta.slug).toBe(ids.length);
    }
  });

  it("sem declaração, toda opção continua atrás do disclosure", () => {
    for (const meta of operationCatalog.filter((m) => m.primaryOptionIds === undefined)) {
      expect(splitOptions(meta).primary, meta.slug).toEqual([]);
      expect(splitOptions(meta).advanced.length, meta.slug).toBe(meta.options.length);
    }
  });

  it("cada operação declara título, subtítulo e descrição", () => {
    for (const meta of operationCatalog) {
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.subtitle.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(20);
    }
  });
});
