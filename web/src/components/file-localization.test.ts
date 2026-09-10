import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FileInput } from "./file-input";
import { FileResults } from "./file-results";

describe("file presentation localization", () => {
  it("renders selected input identically while translating instructions", () => {
    const files = [{ name: "input.zip", size: 4, blob: new Blob(["test"]) }];
    const props = { inputId: "file", dragging: false, setDragging: () => {}, onDrop: () => {}, mode: "decompress" as const, acceptsMany: false, onSelect: () => {}, files };
    const en = renderToStaticMarkup(createElement(FileInput, { ...props, language: "en" }));
    const pt = renderToStaticMarkup(createElement(FileInput, { ...props, language: "pt" }));
    expect(en).toContain("Drag an archive");
    expect(pt).toContain("Arraste o arquivo");
    expect(en).toContain("run locally up to");
    expect(pt).toContain("rodam localmente até");
    expect(en).toContain("input.zip");
    expect(pt).toContain("input.zip");
  });

  it("preserves result bytes and names while translating entry and download feedback", () => {
    const props = {
      archive: { format: "zip" as const, single: false, entries: [{ name: "hello.txt", size: 4, compressedSize: 2, directory: false }] },
      result: { name: "output.zip", bytes: new Uint8Array([1, 2]) },
      busy: false, mode: "compress" as const, totalSize: 4, onExtract: () => {}, onDownload: () => {},
    };
    const en = renderToStaticMarkup(createElement(FileResults, { ...props, language: "en" }));
    const pt = renderToStaticMarkup(createElement(FileResults, { ...props, language: "pt" }));
    expect(en).toContain("compressed 2 B");
    expect(pt).toContain("comprimido 2 B");
    expect(en).toContain("50% of original");
    expect(pt).toContain("50% do original");
    expect(en).toContain("output.zip");
    expect(pt).toContain("output.zip");
    expect(props.result.bytes).toEqual(new Uint8Array([1, 2]));
  });
});
