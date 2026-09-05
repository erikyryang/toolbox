"use client";

import { Languages } from "lucide-react";

import { useLanguage, type Language } from "@/lib/language";

export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  const label = language === "pt" ? "Idioma" : "Language";

  return (
    <label className="relative flex h-8 items-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text">
      <Languages aria-hidden className="pointer-events-none absolute left-2 size-4" />
      <span className="sr-only">{label}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={label}
        className="h-full appearance-none bg-transparent pl-7 pr-2 text-xs font-medium outline-none"
      >
        <option value="pt">PT</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
