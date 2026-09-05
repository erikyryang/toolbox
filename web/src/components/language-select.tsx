"use client";

import { useLanguage } from "@/lib/language";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const next = language === "pt" ? "en" : "pt";
  const label = language === "pt" ? "Mudar para inglês" : "Switch to Portuguese";

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-md text-xs font-semibold text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
    >
      {language.toUpperCase()}
    </button>
  );
}
