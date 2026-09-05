export const THEME_STORAGE_KEY = "toolbox:theme";

export type Theme = "light" | "dark";

/**
 * Script injetado no <head> e executado antes da primeira pintura. Carimba
 * data-theme no documento a partir da escolha guardada ou, na ausência dela,
 * da preferência do sistema — é o que evita o flash de tema errado.
 *
 * A preferência de tema é a única coisa que o toolbox guarda no navegador.
 * Nenhuma entrada, saída ou nome de arquivo é armazenado.
 */
export const themeBootScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="light"||s==="dark"?s:(m?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;

export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Navegador com armazenamento bloqueado: o tema vale só para esta sessão.
  }
}

export function systemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}
