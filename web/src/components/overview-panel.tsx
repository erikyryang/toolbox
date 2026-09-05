"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Archive, Braces, Code2, Search } from "lucide-react";

import type { OperationGroup, OperationMeta } from "@/lib/operations/types";
import { groupName, localizeOperation, useLanguage } from "@/lib/language";

const groupIcon = { Codificação: Code2, Formato: Braces, Compactação: Archive };
const quickSlugs = ["base64", "json-format", "zip"];

export function OverviewPanel({
  groups,
}: {
  groups: { group: OperationGroup; items: OperationMeta[] }[];
}) {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase(language === "pt" ? "pt-BR" : "en");
  const quickActions = groups
    .flatMap(({ items }) => items)
    .filter((operation) => quickSlugs.includes(operation.slug));
  const matches = useMemo(
    () => groups.map(({ group, items }) => ({
      group,
      items: items.filter((operation) =>
        `${localizeOperation(operation, language).name} ${localizeOperation(operation, language).title} ${localizeOperation(operation, language).subtitle}`
          .toLocaleLowerCase(language === "pt" ? "pt-BR" : "en")
          .includes(normalized),
      ),
    })).filter(({ items }) => items.length > 0),
    [groups, language, normalized],
  );

  return (
    <main className="mx-auto w-full max-w-[var(--content-max-width)] px-4 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-accent-text">toolbox</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          {language === "pt" ? "O que você quer fazer?" : "What would you like to do?"}
        </h1>
        <p className="mt-3 text-base text-text-muted">
          {language === "pt" ? "Escolha uma ferramenta na barra lateral ou encontre uma por aqui." : "Choose a tool from the sidebar or find one here."}
        </p>
      </header>

      <label className="relative mt-8 block max-w-2xl">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted" />
        <span className="sr-only">{language === "pt" ? "Buscar ferramenta" : "Search tools"}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={language === "pt" ? "Buscar ferramenta" : "Search tools"}
          className="h-12 w-full rounded-xl border border-border bg-surface-raised pl-11 pr-4 text-base text-text outline-none placeholder:text-text-muted focus:border-accent"
        />
      </label>

      {normalized === "" ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-text">{language === "pt" ? "Comece por aqui" : "Start here"}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {quickActions.map((operation) => (
              <OperationCard key={operation.slug} operation={operation} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-10" aria-live="polite">
          <h2 className="text-sm font-medium text-text">
            {matches.reduce((total, { items }) => total + items.length, 0)} {language === "pt" ? "ferramentas encontradas" : "tools found"}
          </h2>
          {matches.length > 0 ? (
            <div className="mt-4 flex flex-col gap-7">
              {matches.map(({ group, items }) => {
                const Icon = groupIcon[group];
                return (
                  <div key={group}>
                    <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                      <Icon aria-hidden className="size-3.5" />
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
            <p className="mt-3 text-sm text-text-muted">{language === "pt" ? "Nenhuma ferramenta corresponde à busca." : "No tools match your search."}</p>
          )}
        </section>
      )}

      <footer className="mt-14 border-t border-border pt-5 text-sm text-text-muted">
        {language === "pt" ? "Processamento local por padrão. Nada é salvo." : "Local processing by default. Nothing is saved."}
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
      className="group flex min-h-32 flex-col rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-interactive hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-text">{localized.name}</span>
        <ArrowUpRight aria-hidden className="size-4 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text" />
      </div>
      <span className="mt-2 text-sm leading-snug text-text-muted">{localized.subtitle}</span>
    </Link>
  );
}
