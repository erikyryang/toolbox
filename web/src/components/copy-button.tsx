"use client";

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

  const what = label ?? { pt: "saída", en: "output" };

  return (
    <Button
      variant="chip"
      size="chip"
      onClick={copy}
      disabled={value === ""}
      aria-label={
        copied
          ? language === "pt" ? "Copiado" : "Copied"
          : language === "pt" ? `Copiar ${what.pt}` : `Copy ${what.en}`
      }
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span>
        {copied
          ? language === "pt" ? "Copiado" : "Copied"
          : language === "pt" ? "Copiar" : "Copy"}
      </span>
    </Button>
  );
}
