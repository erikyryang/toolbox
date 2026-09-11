"use client";

import { message } from "@/lib/messages";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { OperationGroup, OperationMeta } from "@/lib/operations/types";
import { groupName, localizeOperation, useLanguage } from "@/lib/language";

/** Navegação persistente para que escolher uma ferramenta não esconda o trabalho atual. */
export function OperationSidebar({
  groups,
}: {
  groups: { group: OperationGroup; items: OperationMeta[] }[];
}) {
  const pathname = usePathname();
  const { language } = useLanguage();

  return (
    <aside className="sticky top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[var(--sidebar-width)] shrink-0 overflow-y-auto border-r border-border bg-surface-raised px-[var(--sidebar-gutter)] py-5 lg:block">
      <nav aria-label={message(language, "ui.tools")} className="flex flex-col gap-6">
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className="rounded-md px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text aria-[current=page]:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-text"
        >
          {message(language, "ui.overview")}
        </Link>

        {groups.map(({ group, items }) => {
          return (
            <section key={group}>
              <h2 className="section-title mb-1.5 px-2">
                {groupName(group, language)}
              </h2>
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
                        className="block rounded-md px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text aria-[current=page]:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-accent-text"
                      >
                        {localized.name}
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
