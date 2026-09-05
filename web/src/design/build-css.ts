/**
 * Monta o conteúdo de src/app/tokens.css a partir dos tokens.
 *
 * Vive separado do script de geração para que o teste possa comparar o
 * arquivo em disco com o que os tokens produzem hoje, e falhar quando os
 * dois divergirem.
 */
import {
  fontFamilies,
  fontSizes,
  layout,
  lineHeights,
  radii,
  spacing,
  themes,
  type SemanticToken,
  type ThemeName,
} from "./tokens.ts";

/**
 * Variáveis do shadcn/ui mapeadas aos tokens semânticos. Os nomes que já são
 * tokens do Toolbox (`accent`, `accent-foreground` e `border`) ficam fora: ao
 * emiti-los de novo, CSS cria uma auto-referência e o tema claro perde cor.
 */
const shadcnMap: Record<string, SemanticToken> = {
  background: "surface",
  foreground: "text",
  card: "surface-raised",
  "card-foreground": "text",
  popover: "surface-raised",
  "popover-foreground": "text",
  primary: "accent-solid",
  "primary-foreground": "accent-foreground",
  secondary: "surface-raised",
  "secondary-foreground": "text",
  muted: "surface-raised",
  "muted-foreground": "text-muted",
  destructive: "danger",
  "destructive-foreground": "danger-foreground",
  input: "border-interactive",
  ring: "focus-ring",
};

function colorBlock(theme: ThemeName, indent: string): string {
  return Object.entries(themes[theme])
    .map(([name, value]) => `${indent}--${name}: ${value};`)
    .join("\n");
}

function shadcnBlock(indent: string): string {
  return Object.entries(shadcnMap)
    .map(([name, token]) => `${indent}--${name}: var(--${token});`)
    .join("\n");
}

function scaleBlock(prefix: string, scale: Record<string, string>): string {
  return Object.entries(scale)
    .map(([name, value]) => `  --${prefix}-${name}: ${value};`)
    .join("\n");
}

export function buildTokensCss(): string {
  return `/*
 * GERADO por scripts/generate-tokens.mts a partir de src/design/tokens.ts.
 * Não edite à mão — rode \`npm run tokens\`.
 */

:root {
  color-scheme: light;

  /* Cor — tokens semânticos, tema claro */
${colorBlock("light", "  ")}

  /* Compatibilidade com as variáveis do shadcn/ui */
${shadcnBlock("  ")}

  /* Tipografia */
  --font-sans: ${fontFamilies.sans};
  --font-serif: ${fontFamilies.serif};
  --font-mono: ${fontFamilies.mono};
${scaleBlock("text", fontSizes)}
${scaleBlock("leading", lineHeights)}

  /* Espaçamento e raio */
${scaleBlock("space", spacing)}
${scaleBlock("radius", radii)}

  /* Layout */
  --content-max-width: ${layout.contentMaxWidth};
  --header-height: ${layout.headerHeight};
}

/*
 * Tema escuro. A escolha explícita do usuário vence sempre; sem escolha, a
 * preferência do sistema decide. O par de regras cobre também o instante
 * anterior à hidratação, quando ainda não há data-theme no documento.
 */
:root[data-theme="dark"] {
  color-scheme: dark;

${colorBlock("dark", "  ")}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

${colorBlock("dark", "    ")}
  }
}
`;
}
