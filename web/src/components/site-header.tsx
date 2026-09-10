"use client";

import { message } from "@/lib/messages";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OperationMenu } from "@/components/operation-menu";
import { LanguageToggle } from "@/components/language-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { operationsByGroup } from "@/lib/operations/catalog";

/**
 * Topbar — a mesma do erikyryan.dev.br, com o toolbox como terceira aba.
 *
 * A estrutura, as medidas e o comportamento vêm de lá: dots de janela à
 * esquerda (escondidos abaixo de 560px), a fila de abas que rola na horizontal
 * quando não cabe, e os controles encostados à direita.
 *
 * As duas primeiras abas saem do site: são links externos, e apontam para a
 * versão no idioma escolhido aqui. Os dots são ornamento — não são anunciados,
 * e o primeiro elemento focável continua sendo uma aba.
 *
 * As partes têm os nomes de lá — `.topbar`, `.topbar-inner`, `.topbar-dots`,
 * `.topbar-tabs`, `.topbar-actions` — e as medidas de cada uma ficam no CSS,
 * onde a largura da sidebar e a goteira do conteúdo são lidas como token.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const site = language === "pt"
    ? { home: "https://erikyryan.dev.br/pt/", blog: "https://erikyryan.dev.br/pt/blog/" }
    : { home: "https://erikyryan.dev.br/", blog: "https://erikyryan.dev.br/blog/" };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="topbar-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>

        <nav
          className="topbar-tabs"
          aria-label={message(language, "ui.navigation")}
        >
          <Button asChild variant="tab" size="chip">
            <a href={site.home}>eriky-ryan</a>
          </Button>

          <Button asChild variant="tab" size="chip">
            <a href={site.blog}>blog</a>
          </Button>

          {/*
            O toolbox é a aba da vez em qualquer rota daqui, e não só na raiz:
            a aba nomeia o site, do jeito que "blog" nomeia o blog inteiro lá.
          */}
          <Button asChild variant="tab" size="chip">
            <Link href="/" aria-current={pathname === "/" ? "page" : "true"}>
              toolbox
            </Link>
          </Button>
        </nav>

        <div className="lg:hidden">
          <OperationMenu groups={operationsByGroup()} />
        </div>

        <div className="topbar-actions">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
