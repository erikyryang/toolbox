"use client";

import { message } from "@/lib/messages";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const next = language === "pt" ? "en" : "pt";
  const label = message(language, "ui.switchLanguage");

  return (
    <Button
      type="button"
      variant="chip"
      size="chip"
      onClick={() => setLanguage(next)}
      aria-label={label}
      title={label}
    >
      {/* Como no site: o chip mostra o idioma de destino, não o atual. */}
      {next.toUpperCase()}
    </Button>
  );
}
