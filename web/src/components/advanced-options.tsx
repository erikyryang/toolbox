"use client";

import { ChevronRight } from "lucide-react";

import { OptionField } from "@/components/option-field";
import type { OptionSpec, OptionValue, OptionValues } from "@/lib/operations/types";
import { useLanguage } from "@/lib/language";

/**
 * Opções avançadas atrás de um disclosure. Nascem recolhidas, com os padrões
 * já aplicados — quem só quer converter nunca precisa abrir isto.
 *
 * O que é *principal* na operação não chega aqui: aquilo aparece acima dos
 * painéis, e a separação é feita por quem monta a tela. Sem nada para
 * mostrar, o disclosure não é renderizado — um controle vazio é ruído.
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
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs uppercase tracking-label text-text transition-colors hover:text-accent-text [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        {language === "pt" ? "Opções avançadas" : "Advanced options"}
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

/**
 * As opções que são o controle principal da operação: ficam à vista, acima
 * dos painéis. Um conversor cuja base está escondida atrás de "opções
 * avançadas" esconde a própria pergunta que ele existe para responder.
 */
export function PrimaryOptions({
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
    <div
      role="group"
      aria-label={language === "pt" ? "Opções da operação" : "Operation options"}
      className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-8"
    >
      {options.map((option) => (
        <OptionField
          key={option.id}
          option={option}
          value={values[option.id]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
