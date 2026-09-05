import { describe, expect, it } from "vitest";
import { OperationError } from "../engines/errors.ts";
import { operationCatalog, operationSlugs } from "./catalog.ts";
import { formatForSlug } from "./compression-catalog.ts";
import { getOperation, implementedSlugs } from "./registry.ts";
import { defaultOptionValues } from "./types.ts";

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
      // Ou fixa um formato de saída, ou é a rota que detecta o formato.
      const known = formatForSlug(meta.slug) !== undefined || meta.slug === "descompactar";
      expect(known, `rota de arquivo sem formato: ${meta.slug}`).toBe(true);
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

  it("cada operação declara título, subtítulo e descrição", () => {
    for (const meta of operationCatalog) {
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.subtitle.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(20);
    }
  });
});
