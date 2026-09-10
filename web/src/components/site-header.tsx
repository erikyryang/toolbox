"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OperationMenu } from "@/components/operation-menu";
import { LanguageToggle } from "@/components/language-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { operationsByGroup } from "@/lib/operations/catalog";

/**
 * Header fino: dots de janela de terminal, marca, navegação móvel e os
 * alternadores de idioma e tema.
 *
 * Os dots são ornamento — não são anunciados, e o primeiro elemento focável
 * continua sendo o chip "toolbox".
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="flex h-[var(--header-height)] items-center gap-3 px-4 sm:px-6">
        <span className="terminal-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>

        <Button asChild variant="chip" size="chip">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            toolbox
          </Link>
        </Button>

        <div className="lg:hidden">
          <OperationMenu groups={operationsByGroup()} />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
