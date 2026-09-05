import { describe, expect, it } from "vitest";
import { escapeHtml, unescapeHtml } from "./html-entities.ts";

const plain = { nonAscii: false };

describe("Entidades HTML", () => {
  it("escapa os caracteres que alteram o markup", () => {
    expect(escapeHtml('<a href="x">', plain)).toBe(
      "&lt;a href=&quot;x&quot;&gt;",
    );
  });

  it("escapa o & antes dos demais, sem duplicar", () => {
    expect(escapeHtml("a & <b>", plain)).toBe("a &amp; &lt;b&gt;");
  });

  it("escapa não-ASCII quando pedido", () => {
    expect(escapeHtml("é", { nonAscii: true })).toBe("&#233;");
    expect(escapeHtml("é", plain)).toBe("é");
  });

  it("resolve referências numéricas decimais e hexadecimais", () => {
    expect(unescapeHtml("&#233;")).toBe("é");
    expect(unescapeHtml("&#xE9;")).toBe("é");
  });

  it("resolve entidades nomeadas", () => {
    expect(unescapeHtml("&lt;a&gt; &amp; &ccedil;")).toBe("<a> & ç");
  });

  it("deixa entidade desconhecida como está", () => {
    expect(unescapeHtml("&naoexiste;")).toBe("&naoexiste;");
  });

  it("faz ida e volta no markup escapado", () => {
    const input = '<a href="x">&</a>';
    expect(unescapeHtml(escapeHtml(input, plain))).toBe(input);
  });
});
