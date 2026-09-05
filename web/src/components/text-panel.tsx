"use client";

import { useEffect, useId, useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";

/**
 * Painel de texto em fonte mono. É o mesmo componente para entrada e saída —
 * a saída apenas não é editável e ganha as ações de copiar e baixar.
 */
export function TextPanel({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  downloadName,
  describedById,
  invalid = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  downloadName?: string;
  describedById?: string;
  invalid?: boolean;
}) {
  const id = useId();

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex h-8 items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs uppercase tracking-wide text-text-muted"
        >
          {label}
        </label>

        {readOnly ? (
          <div className="flex items-center gap-1">
            <CopyButton value={value} />
            {downloadName ? (
              <DownloadButton value={value} filename={downloadName} />
            ) : null}
          </div>
        ) : null}
      </div>

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
          "min-h-64 w-full resize-y rounded-xl border bg-surface-raised p-4 font-mono text-sm leading-relaxed text-text placeholder:text-text-muted",
          invalid ? "border-danger" : "border-border-interactive",
          readOnly && "text-text-muted",
        )}
      />
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copy}
      disabled={value === ""}
      aria-label={copied ? (language === "pt" ? "Copiado" : "Copied") : (language === "pt" ? "Copiar saída" : "Copy output")}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span className="text-xs">{copied ? (language === "pt" ? "Copiado" : "Copied") : (language === "pt" ? "Copiar" : "Copy")}</span>
    </Button>
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
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={download}
      disabled={value === ""}
      aria-label={language === "pt" ? "Baixar saída" : "Download output"}
    >
      <Download aria-hidden />
      <span className="text-xs">{language === "pt" ? "Baixar" : "Download"}</span>
    </Button>
  );
}
