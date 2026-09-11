"use client";

import { message } from "@/lib/messages";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

/**
 * Copiar para a área de transferência, com confirmação que se desfaz sozinha.
 *
 * O rótulo acessível é parametrizado porque "Copiar" sem complemento não diz a
 * quem usa leitor de tela *o que* seria copiado numa tela com mais de um
 * botão desses.
 */
export function CopyButton({
  value,
  label,
}: {
  value: string;
  /** O que está sendo copiado, para o rótulo acessível. Padrão: a saída. */
  label?: { pt: string; en: string };
}) {
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

  const target = label?.[language] ?? message(language, "ui.output");

  return (
    <Button
      variant="chip"
      size="chip"
      onClick={copy}
      disabled={value === ""}
      aria-label={
        copied
          ? message(language, "ui.copied")
          : message(language, "ui.copyTarget", { target })
      }
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span>
        {copied
          ? message(language, "ui.copied")
          : message(language, "ui.copy")}
      </span>
    </Button>
  );
}
