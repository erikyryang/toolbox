"use client";

import { useId } from "react";
import { ChevronRight } from "lucide-react";

import type { OptionSpec, OptionValue, OptionValues } from "@/lib/operations/types";
import { useLanguage } from "@/lib/language";

/**
 * Opções avançadas atrás de um disclosure. Nascem recolhidas, com os padrões
 * já aplicados — quem só quer converter nunca precisa abrir isto.
 *
 * O <details> nativo já anuncia o estado expandido/recolhido para leitores de
 * tela e responde a Enter e Espaço sem código nosso.
 */
export function AdvancedOptions({
  options,
  values,
  onChange,
}: {
  options: OptionSpec[];
  values: OptionValues;
  onChange: (id: string, value: OptionValue) => void;
}) {
  const { language } = useLanguage();
  if (options.length === 0) return null;

  return (
    <details className="group rounded-md border border-border bg-surface-raised px-3 py-2.5">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-text transition-colors hover:text-accent-text [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        {language === "pt" ? "Opções avançadas" : "Advanced options"}
        <span className="text-xs text-text-muted">· {options.length} {language === "pt" ? "controles" : "controls"}</span>
      </summary>

      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:flex-wrap sm:gap-8">
        {options.map((option) => (
          <OptionField
            key={option.id}
            option={option}
            value={values[option.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </details>
  );
}

function OptionField({
  option,
  value,
  onChange,
}: {
  option: OptionSpec;
  value: OptionValue | undefined;
  onChange: (id: string, value: OptionValue) => void;
}) {
  const id = useId();
  const helpId = `${id}-help`;

  if (option.kind === "boolean") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(option.id, event.target.checked)}
            aria-describedby={option.help ? helpId : undefined}
            className="size-4 accent-accent-solid"
          />
          <label htmlFor={id} className="text-sm text-text">
            {option.label}
          </label>
        </div>
        {option.help ? (
          <p id={helpId} className="text-xs text-text-muted">
            {option.help}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-text">
        {option.label}
      </label>
      <select
        id={id}
        value={typeof value === "string" ? value : option.default}
        onChange={(event) => onChange(option.id, event.target.value)}
        aria-describedby={option.help ? helpId : undefined}
        className="h-8 rounded-md border border-border-interactive bg-surface px-2 text-sm text-text"
      >
        {option.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
      {option.help ? (
        <p id={helpId} className="max-w-72 text-xs text-text-muted">
          {option.help}
        </p>
      ) : null}
    </div>
  );
}
