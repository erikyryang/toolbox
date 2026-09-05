"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Archive, Braces, Code2, Search } from "lucide-react";

import type { OperationGroup, OperationMeta } from "@/lib/operations/types";

const groupIcon = { Codificação: Code2, Formato: Braces, Compactação: Archive };
const quickSlugs = ["base64", "json-format", "zip"];

export function OverviewPanel({
  groups,
}: {
  groups: { group: OperationGroup; items: OperationMeta[] }[];
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const quickActions = groups
    .flatMap(({ items }) => items)
    .filter((operation) => quickSlugs.includes(operation.slug));
  const matches = useMemo(
    () => groups.map(({ group, items }) => ({
      group,
      items: items.filter((operation) =>
        `${operation.name} ${operation.title} ${operation.subtitle}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalized),
      ),
    })).filter(({ items }) => items.length > 0),
    [groups, normalized],
  );

  return (
    <main className="mx-auto w-full max-w-[var(--content-max-width)] px-4 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-accent-text">toolbox</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          O que você quer fazer?
        </h1>
        <p className="mt-3 text-base text-text-muted">
          Escolha uma ferramenta na barra lateral ou encontre uma por aqui.
        </p>
      </header>

      <label className="relative mt-8 block max-w-2xl">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted" />
        <span className="sr-only">Buscar ferramenta</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar ferramenta"
          className="h-12 w-full rounded-xl border border-border bg-surface-raised pl-11 pr-4 text-base text-text outline-none placeholder:text-text-muted focus:border-accent"
        />
      </label>

      {normalized === "" ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-text">Comece por aqui</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {quickActions.map((operation) => (
              <OperationCard key={operation.slug} operation={operation} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-10" aria-live="polite">
          <h2 className="text-sm font-medium text-text">
            {matches.reduce((total, { items }) => total + items.length, 0)} ferramentas encontradas
          </h2>
          {matches.length > 0 ? (
            <div className="mt-4 flex flex-col gap-7">
              {matches.map(({ group, items }) => {
                const Icon = groupIcon[group];
                return (
                  <div key={group}>
                    <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                      <Icon aria-hidden className="size-3.5" />
                      {group}
                    </h3>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {items.map((operation) => <OperationCard key={operation.slug} operation={operation} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-muted">Nenhuma ferramenta corresponde à busca.</p>
          )}
        </section>
      )}

      <footer className="mt-14 border-t border-border pt-5 text-sm text-text-muted">
        Processamento local por padrão. Nada é salvo.
      </footer>
    </main>
  );
}

function OperationCard({ operation }: { operation: OperationMeta }) {
  return (
    <Link
      href={`/${operation.slug}`}
      className="group flex min-h-32 flex-col rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-interactive hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-text">{operation.name}</span>
        <ArrowUpRight aria-hidden className="size-4 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text" />
      </div>
      <span className="mt-2 text-sm leading-snug text-text-muted">{operation.subtitle}</span>
    </Link>
  );
}
