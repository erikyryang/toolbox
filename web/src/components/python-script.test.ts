import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/lib/language";
import { PythonScriptPanel } from "./python-script.tsx";

const render = (props: { mode: "compress" | "decompress"; format: "zip" | "zstd" | "rar"; level: number }) =>
  renderToStaticMarkup(
    createElement(LanguageProvider, null, createElement(PythonScriptPanel, props)),
  );

describe("painel do script Python", () => {
  it("mostra o script do formato escolhido, com o nível da tela", () => {
    const markup = render({ mode: "compress", format: "zstd", level: 19 });
    expect(markup).toContain("compress_zstd.py");
    expect(markup).toContain("LEVEL = 19");
    expect(markup).toContain("pip install zstandard");
  });

  it("nasce recolhido, para não competir com a operação da tela", () => {
    expect(render({ mode: "compress", format: "zip", level: 6 })).not.toContain("<details open");
  });

  it("ao descompactar, oferece a escolha do formato do script", () => {
    const markup = render({ mode: "decompress", format: "rar", level: 0 });
    expect(markup).toContain("Script format");
    expect(markup).toContain("extract_rar.py");
    expect(markup).toContain("rarfile");
  });

  it("ao compactar, o formato vem da tela e não há segunda escolha", () => {
    const markup = render({ mode: "compress", format: "zip", level: 6 });
    expect(markup).not.toContain("Script format");
    expect(markup).toContain("compress_zip.py");
  });
});
