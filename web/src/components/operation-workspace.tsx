"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, Clock } from "lucide-react";

import { AdvancedOptions } from "@/components/advanced-options";
import { PrivacyNote } from "@/components/privacy-note";
import { TextPanel } from "@/components/text-panel";
import { Button } from "@/components/ui/button";
import { getOperation } from "@/lib/operations/registry";
import { runOperation } from "@/lib/operations/run";
import {
  defaultOptionValues,
  directionOf,
  type Direction,
  type Operation,
  type OptionValue,
} from "@/lib/operations/types";
import { useDebounced } from "@/lib/use-debounced";
import { localizeOperation, useLanguage } from "@/lib/language";

/**
 * A tela de uma operação: título serifado, dois painéis mono, opções atrás de
 * disclosure e o aviso de privacidade. Toda rota de operação monta este mesmo
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

  function invert() {
    // Inverter troca o sentido e promove a saída a entrada, para que a próxima
    // conversão continue de onde a anterior parou.
    setDirection(direction === "forward" ? "reverse" : "forward");
    setInput(output);
  }

  return (
    <main className="mx-auto w-full max-w-[var(--content-max-width)] px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {localized.title}
        </h1>
        <p className="max-w-2xl text-sm text-text-muted">{localized.subtitle}</p>
      </header>

      <div className="mt-10 flex flex-col gap-3">
        {localized.reverse ? (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={invert}
              aria-label={`Inverter para ${
                direction === "forward"
                  ? localized.reverse.label
                  : localized.forward.label
              }`}
            >
              <ArrowLeftRight aria-hidden />
              <span>{active.label}</span>
            </Button>
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
                <span>{language === "pt" ? "Agora" : "Now"}</span>
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <TextPanel
              label={active.inputLabel}
              value={input}
              onChange={setInput}
              placeholder={localized.placeholder}
              invalid={!outcome.ok}
              describedById={outcome.ok ? undefined : errorId}
            />

            {outcome.ok ? null : (
              <p id={errorId} role="alert" className="text-sm text-danger">
                {outcome.error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <TextPanel
              label={active.outputLabel}
              value={output}
              readOnly
              downloadName={`${operation.slug}.txt`}
            />

            {outcome.ok && outcome.notes.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {outcome.notes.map((note) => (
                  <li key={note} className="text-sm text-text-muted">
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <AdvancedOptions
            options={localized.options}
            values={options}
            onChange={setOption}
          />
        </div>

        <footer className="mt-6 border-t border-border pt-4">
          <PrivacyNote processedOn={outcome.processedOn} />
        </footer>
      </div>
    </main>
  );
}
