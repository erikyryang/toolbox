"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Braces, Code2 } from "lucide-react";

import type { OperationGroup, OperationMeta } from "@/lib/operations/types";

const groupIcon = { Codificação: Code2, Formato: Braces, Compactação: Archive };

/** Navegação persistente para que escolher uma ferramenta não esconda o trabalho atual. */
export function OperationSidebar({
  groups,
}: {
  groups: { group: OperationGroup; items: OperationMeta[] }[];
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-[calc(100vh-var(--header-height))] w-64 shrink-0 overflow-y-auto border-r border-border bg-surface-raised px-3 py-5 lg:block">
      <nav aria-label="Ferramentas" className="flex flex-col gap-6">
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className="rounded-lg px-2.5 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-text"
        >
          Visão geral
        </Link>

        {groups.map(({ group, items }) => {
          const Icon = groupIcon[group];
          return (
            <section key={group}>
              <h2 className="mb-1.5 flex items-center gap-2 px-2 text-xs uppercase tracking-wide text-text-muted">
                <Icon aria-hidden className="size-3.5" />
                {group}
              </h2>
              <ul>
                {items.map((operation) => {
                  const href = `/${operation.slug}`;
                  const current = pathname === href;
                  return (
                    <li key={operation.slug}>
                      <Link
                        href={href}
                        aria-current={current ? "page" : undefined}
                        className="block rounded-lg px-2.5 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-accent-text"
                      >
                        {operation.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
