"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import {
  applyTheme,
  readStoredTheme,
  storeTheme,
  type Theme,
} from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

/**
 * O tema vive no documento (data-theme), carimbado pelo script de boot antes
 * da primeira pintura. Este componente lê esse estado externo em vez de manter
 * uma cópia própria — assim não há como a interface discordar do que está
 * aplicado.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // Sem escolha explícita, o tema continua acompanhando o sistema.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = () => {
    if (readStoredTheme()) return;
    applyTheme(media.matches ? "dark" : "light");
  };
  media.addEventListener("change", onMediaChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onMediaChange);
  };
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const { language } = useLanguage();
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    currentTheme,
    () => "light",
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    storeTheme(next);
  }

  const label = theme === "dark"
    ? (language === "pt" ? "Usar tema claro" : "Use light theme")
    : (language === "pt" ? "Usar tema escuro" : "Use dark theme");

  return (
    <Button
      type="button"
      variant="chip"
      size="chip"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
