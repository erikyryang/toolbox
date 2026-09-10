import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/lib/language";
import { OperationWorkspace } from "./operation-workspace.tsx";

/**
 * A única parte desta operação que não é função pura: a tela sem seletor de
 * sentido. `juntar-linhas` é a primeira operação de texto sem `reverse`, e o
 * seletor está atrás de um guard que nunca tinha sido exercitado.
 *
 * Renderiza no servidor, sem DOM: o que se verifica aqui é a primeira pintura
 * — quais controles existem —, não a interação, que é a mesma de toda outra
 * operação de texto. Sem `window`, o provedor de idioma cai no padrão do
 * produto, que é inglês — daí os textos esperados abaixo.
 */
const render = (slug: string) =>
  renderToStaticMarkup(
    createElement(LanguageProvider, null, createElement(OperationWorkspace, { slug })),
  );

describe("workspace de uma operação sem inverso", () => {
  const markup = render("juntar-linhas");

  it("não renderiza o seletor de sentido", () => {
    expect(markup).not.toContain("Conversion direction");
    expect(markup).not.toContain("aria-pressed");
  });

  it("renderiza título e subtítulo da operação, no idioma padrão", () => {
    expect(markup).toContain("Join lines");
    expect(markup).toContain("with the separator the next tool expects");
  });

  it("mantém as opções avançadas com as três opções e os sete separadores", () => {
    expect(markup).toContain("Advanced options");
    expect(markup).toContain("Separator");
    expect(markup).toContain("Trim whitespace");
    expect(markup).toContain("Drop empty lines");
    for (const value of ["none", "space", "comma", "comma-space", "semicolon", "pipe", "tab"]) {
      expect(markup, value).toContain(`value="${value}"`);
    }
  });

  it("mantém copiar, baixar e o rodapé de privacidade", () => {
    expect(markup).toContain("Copy");
    expect(markup).toContain("Download");
    expect(markup).toContain("Processed in your browser");
  });

  it("continua renderizando o seletor nas operações reversíveis", () => {
    expect(render("base64")).toContain("Conversion direction");
  });
});
