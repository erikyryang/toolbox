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
 * operação de texto.
 */
const render = (slug: string) =>
  renderToStaticMarkup(
    createElement(LanguageProvider, null, createElement(OperationWorkspace, { slug })),
  );

describe("workspace de uma operação sem inverso", () => {
  const markup = render("juntar-linhas");

  it("não renderiza o seletor de sentido", () => {
    expect(markup).not.toContain("Sentido da conversão");
    expect(markup).not.toContain("aria-pressed");
  });

  it("renderiza título e subtítulo da operação", () => {
    expect(markup).toContain("Juntar linhas");
    expect(markup).toContain("com o separador que a próxima ferramenta espera");
  });

  it("mantém as opções avançadas com as três opções e os sete separadores", () => {
    expect(markup).toContain("Opções avançadas");
    expect(markup).toContain("Separador");
    expect(markup).toContain("Aparar espaços");
    expect(markup).toContain("Descartar linhas vazias");
    for (const value of ["none", "space", "comma", "comma-space", "semicolon", "pipe", "tab"]) {
      expect(markup, value).toContain(`value="${value}"`);
    }
  });

  it("mantém copiar, baixar e o rodapé de privacidade", () => {
    expect(markup).toContain("Copiar");
    expect(markup).toContain("Baixar");
    expect(markup).toContain("navegador");
  });

  it("continua renderizando o seletor nas operações reversíveis", () => {
    expect(render("base64")).toContain("Sentido da conversão");
  });
});
