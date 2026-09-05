"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import type { OperationGroup, OperationMeta } from "@/lib/operations/types";
import { groupName, localizeOperation, useLanguage } from "@/lib/language";

/**
 * Seletor de operações do header.
 *
 * É um <details> com links reais dentro: funciona sem JavaScript, é navegável
 * por teclado sem gestão manual de foco e mantém as rotas visíveis para
 * rastreadores. O JavaScript só acrescenta fechar com Escape e ao clicar fora.
 */
export function OperationMenu({
  groups,
}: {
  groups: { group: OperationGroup; items: OperationMeta[] }[];
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const { language } = useLanguage();

  useEffect(() => {
    const details = ref.current;
    if (!details) return;

    function close() {
      if (details && details.open) details.open = false;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    function onPointerDown(event: PointerEvent) {
      if (details && !details.contains(event.target as Node)) close();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text [&::-webkit-details-marker]:hidden">
        {language === "pt" ? "Operações" : "Tools"}
        <ChevronDown aria-hidden className="size-3.5" />
      </summary>

      <nav
        aria-label={language === "pt" ? "Operações" : "Tools"}
        className="absolute left-0 top-full z-20 mt-1 min-w-56 rounded-md border border-border bg-surface-raised p-1.5"
      >
        {groups.map(({ group, items }) => (
          <div key={group} className="py-1">
            <p className="px-2 pb-1 text-xs uppercase tracking-wide text-text-muted">
              {groupName(group, language)}
            </p>
            <ul>
              {items.map((operation) => {
                const localized = localizeOperation(operation, language);
                const href = `/${operation.slug}`;
                const current = pathname === href;
                return (
                  <li key={operation.slug}>
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className="block rounded-sm px-2 py-1.5 text-sm text-text transition-colors hover:bg-surface aria-[current=page]:text-accent-text"
                    >
                      {localized.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </details>
  );
}
