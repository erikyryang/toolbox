"use client";

import { localizeFeedback, message } from "@/lib/messages";

import { useCallback, useId, useMemo, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";

import { AdvancedOptions, PrimaryOptions } from "@/components/advanced-options";
import { OperationHeading } from "@/components/operation-heading";
import { PrivacyNote } from "@/components/privacy-note";
import { TextPanel } from "@/components/text-panel";
import { Button } from "@/components/ui/button";
import { getOperation } from "@/lib/operations/registry";
import { runOperation } from "@/lib/operations/run";
import {
  defaultOptionValues,
  directionOf,
  splitOptions,
  type Direction,
  type Operation,
  type OptionValue,
} from "@/lib/operations/types";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import { localizeOperation, useLanguage } from "@/lib/language";

/**
 * A tela de uma operação: cabeçalho com linha de prompt, dois painéis, opções
 * atrás de disclosure e o aviso de privacidade. Toda rota de operação monta este mesmo
 * componente, parametrizado pelo descritor da operação.
 *
 * Não existe botão "converter": a saída é recalculada a cada mudança de
 * entrada ou de opção.
 */
export function OperationWorkspace({ slug }: { slug: string }) {
  // O descritor é resolvido aqui, no cliente: motores são funções e funções
  // não atravessam o limite servidor/cliente.
  const operation = getOperation(slug);
  if (!operation) {
    throw new Error(`Operação sem motor registrado: ${slug}`);
  }

  return <Workspace operation={operation} />;
}

function Workspace({ operation }: { operation: Operation }) {
  const { language } = useLanguage();
  const localized = localizeOperation(operation, language) as Operation;
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<Direction>("forward");
  const [options, setOptions] = useState(() => defaultOptionValues(operation));

  const errorId = useId();
  const debouncedInput = useDebounced(input);

  const outcome = useMemo(
    () => runOperation(operation, direction, debouncedInput, options),
    [operation, direction, debouncedInput, options],
  );

  const active = directionOf(localized, direction);
  const output = outcome.ok ? outcome.output : "";
  const notes = outcome.ok ? outcome.notes.map((note) => localizeFeedback(note, language)) : [];
  const { primary, advanced } = splitOptions(localized);
  const numeric = operation.valueKind === "number";

  const setOption = useCallback((id: string, value: OptionValue) => {
    setOptions((current) => ({ ...current, [id]: value }));
  }, [setOptions]);

  /**
   * Ações rápidas preenchem a entrada com um valor gerado na hora. O catálogo
   * declara só o identificador; a função vive aqui, no cliente.
   */
  function runQuickAction(action: "now") {
    if (action === "now") {
      const seconds = Math.floor(Date.now() / 1000);
      setDirection("forward");
      setInput(String(seconds));
    }
  }

  /**
   * Trocar de sentido promove a saída a entrada, para que a próxima conversão
   * continue de onde a anterior parou.
   *
   * A saída é recalculada aqui a partir do input corrente, e não lida de
   * `outcome`: aquele valor deriva do input *debounced*, e quem digita e troca
   * de sentido no mesmo instante levaria o resultado anterior consigo.
   */
  function switchTo(next: Direction) {
    if (next === direction) return;
    const fresh = runOperation(operation, direction, input, options);
    setDirection(next);
    setInput(fresh.ok ? fresh.output : "");
  }

  return (
    <main className="mx-auto w-full max-w-[var(--content-max-width)] px-[var(--content-gutter)] py-10 sm:py-14">
      <OperationHeading
        slug={operation.slug}
        title={localized.title}
        subtitle={localized.subtitle}
      />

      <div className="mt-10 flex flex-col gap-3">
        {localized.reverse ? (
          <div className="flex items-center gap-3">
            {/*
              Os dois sentidos ficam visíveis ao mesmo tempo. Antes havia um
              único botão com o rótulo do sentido *atual*, que ao ser clicado
              levava ao oposto — quem lia "Codificar" esperava codificar.
            */}
            <div
              role="group"
              aria-label={message(language, "ui.conversionDirection")}
              className="inline-flex rounded-md border border-border-interactive p-0.5"
            >
              {(["forward", "reverse"] as Direction[]).map((option) => {
                const meta = directionOf(localized, option);
                const current = option === direction;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={current}
                    onClick={() => switchTo(option)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs uppercase tracking-label transition-colors",
                      current
                        ? "bg-accent-solid text-accent-foreground"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-muted">
              <span className="inline-flex items-center gap-1">
                {active.inputLabel} <ArrowRight aria-hidden className="size-3" /> {active.outputLabel}
              </span>
            </p>

            {operation.quickActions?.includes("now") ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => runQuickAction("now")}
                className="ml-auto"
              >
                <Clock aria-hidden />
                <span>{message(language, "ui.now")}</span>
              </Button>
            ) : null}
          </div>
        ) : null}

        {active.help ? (
          <p className="max-w-2xl text-xs text-text-muted">{active.help}</p>
        ) : null}

        <PrimaryOptions options={primary} values={options} onChange={setOption} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <TextPanel
              label={active.inputLabel}
              value={input}
              onChange={setInput}
              onClear={() => setInput("")}
              placeholder={localized.placeholder}
              invalid={!outcome.ok}
              describedById={outcome.ok ? undefined : errorId}
              numeric={numeric}
            />

            {outcome.ok ? null : (
              <p id={errorId} role="alert" className="text-sm text-danger">
                {localizeFeedback(outcome.feedback, language)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <TextPanel
              label={active.outputLabel}
              value={output}
              readOnly
              syntax={localized.syntax}
              downloadName={`${operation.slug}.txt`}
              numeric={numeric}
            />

            {notes.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {notes.map((note) => (
                  <li key={note} className="bullet-arrow text-sm text-text-muted">
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* Sem opção avançada, nem o espaçamento sobra. */}
        {advanced.length > 0 ? (
          <div className="mt-4">
            <AdvancedOptions options={advanced} values={options} onChange={setOption} />
          </div>
        ) : null}

        <footer className="mt-6 border-t border-border pt-4 text-center">
          <PrivacyNote processedOn={outcome.processedOn} />
        </footer>
      </div>
    </main>
  );
}
