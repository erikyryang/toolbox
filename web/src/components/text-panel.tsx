"use client";

import { useId } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { highlight, type SyntaxLanguage, type TokenKind } from "@/lib/highlight";
import { useLanguage } from "@/lib/language";
import { sanitizeNumeric } from "@/lib/numeric-input";

/**
 * Painel de texto em fonte mono. É o mesmo componente para entrada e saída —
 * a saída apenas não é editável e ganha as ações de copiar e baixar.
 *
 * Quando a saída tem uma linguagem conhecida, ela é renderizada realçada, em
 * <pre>, em vez de <textarea>: um textarea não aceita marcação dentro, e é a
 * cor que torna a saída de um beautifier legível de relance. A seleção e o
 * copiar do navegador continuam funcionando igual.
 *
 * Com `numeric`, os dois painéis viram campos de uma linha que aceitam só
 * caractere numérico. Uma área de texto multilinha para digitar "1.5" promete
 * uma liberdade que a operação não tem.
 */

/** Altura mínima menor no mobile: com os painéis empilhados, uma caixa de
 * entrada alta e vazia empurraria a resposta para fora da tela. */
const PANEL_BOX = "min-h-32 w-full rounded-md border bg-surface-raised p-4 text-sm leading-relaxed md:min-h-64";

/**
 * O painel de valor. Uma linha, altura de campo e nada de redimensionar — a
 * caixa acompanha o que cabe nela, que é um número.
 */
const NUMBER_BOX =
  "h-12 w-full rounded-md border bg-surface-raised px-4 text-md text-text placeholder:text-text-muted read-only:text-text";

const SYNTAX_CLASS: Record<TokenKind, string> = {
  key: "text-syntax-key",
  string: "text-syntax-string",
  number: "text-syntax-number",
  atom: "text-syntax-atom",
  attr: "text-syntax-attr",
  punct: "text-syntax-punct",
  plain: "text-text",
};

export function TextPanel({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  readOnly = false,
  downloadName,
  describedById,
  invalid = false,
  syntax,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  downloadName?: string;
  describedById?: string;
  invalid?: boolean;
  syntax?: SyntaxLanguage;
  numeric?: boolean;
}) {
  const { language } = useLanguage();
  const id = useId();
  const labelId = `${id}-label`;
  const highlighted = !numeric && readOnly && syntax !== undefined && value !== "";
  const labelClass = "section-title";

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex h-8 items-center justify-between gap-2">
        {/* <pre> não é rotulável por <label for>; ali o vínculo é por id. */}
        {highlighted ? (
          <span id={labelId} className={labelClass}>
            {label}
          </span>
        ) : (
          <label htmlFor={id} className={labelClass}>
            {label}
          </label>
        )}

        <div className="flex items-center gap-1">
          {readOnly ? (
            <>
              <CopyButton value={value} />
              {/* Um arquivo com um número dentro não é entrega de nada. */}
              {downloadName && !numeric ? (
                <DownloadButton value={value} filename={downloadName} />
              ) : null}
            </>
          ) : onClear && value !== "" ? (
            <Button
              variant="chip"
              size="chip"
              onClick={onClear}
              aria-label={language === "pt" ? "Limpar entrada" : "Clear input"}
            >
              <X aria-hidden />
              <span>{language === "pt" ? "Limpar" : "Clear"}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {highlighted ? (
        <pre
          id={id}
          tabIndex={0}
          aria-labelledby={labelId}
          aria-readonly
          aria-describedby={describedById}
          className={cn(
            PANEL_BOX,
            // Quebra como o textarea quebrava: a indentação é preservada, mas
            // uma linha longa não força rolagem horizontal.
            "resize-y overflow-auto whitespace-pre-wrap break-words border-border-interactive text-text",
          )}
        >
          {highlight(syntax, value).map((token, index) => (
            <span key={index} className={SYNTAX_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
        </pre>
      ) : numeric ? (
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={
            onChange ? (event) => onChange(sanitizeNumeric(event.target.value)) : undefined
          }
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedById}
          className={cn(
            NUMBER_BOX,
            invalid ? "border-danger" : "border-border-interactive",
          )}
        />
      ) : (
        <textarea
          id={id}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedById}
          className={cn(
            PANEL_BOX,
            "resize-y text-text placeholder:text-text-muted",
            invalid ? "border-danger" : "border-border-interactive",
          )}
        />
      )}
    </section>
  );
}

function DownloadButton({
  value,
  filename,
}: {
  value: string;
  filename: string;
}) {
  const { language } = useLanguage();
  function download() {
    // O arquivo é montado e liberado no próprio navegador; nenhum byte sai
    // daqui e nada fica retido depois do clique.
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    // A âncora precisa estar no documento em Firefox, e revogar a URL no mesmo
    // tick cancelaria o download que acabou de começar.
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <Button
      variant="chip"
      size="chip"
      onClick={download}
      disabled={value === ""}
      aria-label={language === "pt" ? "Baixar saída" : "Download output"}
    >
      <Download aria-hidden />
      <span>{language === "pt" ? "Baixar" : "Download"}</span>
    </Button>
  );
}
