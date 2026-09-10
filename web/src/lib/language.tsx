"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

import {
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<Language>(subscribeToLanguage, currentLanguage, () => "en");

  function setLanguage(next: Language) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // A preferência vale só para esta sessão quando o armazenamento bloqueia.
    }
    document.documentElement.lang = next === "pt" ? "pt-BR" : "en";
    window.dispatchEvent(new Event("toolbox:languagechange"));
  }

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}

/**
 * Inglês é o padrão: o produto é público e a maior parte de quem chega não
 * lê português. O português continua a um clique, e a escolha fica salva.
 */
function currentLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "pt" ? "pt" : "en";
  } catch {
    return "en";
  }
}

function subscribeToLanguage(onChange: () => void): () => void {
  const event = () => onChange();
  window.addEventListener("storage", event);
  window.addEventListener("toolbox:languagechange", event);
  return () => {
    window.removeEventListener("storage", event);
    window.removeEventListener("toolbox:languagechange", event);
  };
}

/**
 * Reexportado para que componentes continuem importando idioma de um lugar
 * só. Quem chama do servidor precisa ir direto em `@/lib/i18n`: o que sai
 * daqui é referência de cliente.
 */
export { LANGUAGE_STORAGE_KEY, groupName, localeOf, localizeOperation, matchesQuery } from "@/lib/i18n";
export type { Language } from "@/lib/i18n";
