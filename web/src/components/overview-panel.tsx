"use client";

import { message } from "@/lib/messages";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

import type { OperationGroup, OperationMeta } from "@/lib/operations/types";
import { groupName, localeOf, localizeOperation, matchesQuery, useLanguage } from "@/lib/language";
import { QUICK_START_SLUGS } from "@/lib/operations/catalog";
import { TypedHeading } from "@/components/typed-heading";

export function OverviewPanel({
  groups,
}: {
  groups: { group: OperationGroup; items: OperationMeta[] }[];
}) {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase(localeOf(language));
  const quickActions = groups
    .flatMap(({ items }) => items)
    .filter((operation) => QUICK_START_SLUGS.includes(operation.slug));
  const matches = useMemo(
    () => groups.map(({ group, items }) => ({
      group,
      items: items.filter((operation) => matchesQuery(operation, normalized, language)),
    })).filter(({ items }) => items.length > 0),
    [groups, language, normalized],
  );

  return (
    <main className="mx-auto w-full max-w-[var(--content-max-width)] px-[var(--content-gutter)] py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-sm text-text-muted" aria-hidden>
          you@toolbox:~$ ls
        </p>
        <TypedHeading
          className="mt-2 text-display font-bold leading-tight tracking-tight text-text"
          text={message(language, "ui.overviewTitle")}
        />
        <p className="mt-3 text-md text-text-muted">
          {message(language, "ui.overviewLead")}
        </p>
      </header>

      {/* A busca acompanha a largura da fileira de cartões abaixo, e não a
          do texto acima: as duas caixas terminam na mesma borda. */}
      <label className="relative mt-8 block">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted" />
        <span className="sr-only">{message(language, "ui.searchTools")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={message(language, "ui.searchTools")}
          className="h-12 w-full rounded-md border border-border bg-surface-raised pl-11 pr-4 text-md text-text placeholder:text-text-muted focus:border-accent"
        />
      </label>

      {normalized === "" ? (
        <section className="mt-10">
          <h2 className="section-title">{message(language, "ui.startHere")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {quickActions.map((operation) => (
              <OperationCard key={operation.slug} operation={operation} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-10" aria-live="polite">
          <h2 className="section-title">
            <span className="tabular">
              {matches.reduce((total, { items }) => total + items.length, 0)}
            </span>{" "}
            {message(language, "ui.toolsFound")}
          </h2>
          {matches.length > 0 ? (
            <div className="mt-4 flex flex-col gap-7">
              {matches.map(({ group, items }) => {
                return (
                  <div key={group}>
                    <h3 className="section-title">
                      {groupName(group, language)}
                    </h3>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {items.map((operation) => <OperationCard key={operation.slug} operation={operation} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-muted">{message(language, "ui.noToolsFound")}</p>
          )}
        </section>
      )}

      <footer className="mt-14 border-t border-border pt-5 text-center text-sm text-text-muted">
        {message(language, "ui.privacyDefault")}
      </footer>
    </main>
  );
}

function OperationCard({ operation }: { operation: OperationMeta }) {
  const { language } = useLanguage();
  const localized = localizeOperation(operation, language);
  return (
    <Link
      href={`/${operation.slug}`}
      className="group flex min-h-32 flex-col rounded-md border border-border bg-surface-raised p-4 transition-colors hover:border-accent hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-bold text-text">{localized.name}</span>
        <ArrowUpRight aria-hidden className="size-4 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text" />
      </div>
      <span className="mt-2 text-sm leading-snug text-text-muted">{localized.subtitle}</span>
    </Link>
  );
}
