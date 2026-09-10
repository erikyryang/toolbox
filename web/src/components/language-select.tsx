"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const next = language === "pt" ? "en" : "pt";
  const label = language === "pt" ? "Mudar para inglês" : "Switch to Portuguese";

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
