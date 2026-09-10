"use client";

import { useId } from "react";

import type { OptionSpec, OptionValue } from "@/lib/operations/types";

/**
 * Um campo de opção — seleção ou caixa de marcação.
 *
 * Vive em módulo próprio porque as opções de uma operação aparecem em dois
 * lugares: as principais, acima dos painéis, e o resto atrás do disclosure de
 * opções avançadas. É o mesmo campo nos dois, e um campo duplicado é um campo
 * que diverge.
 */
export function OptionField({
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
          <label htmlFor={id} className="section-title">
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
      <label htmlFor={id} className="section-title">
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
