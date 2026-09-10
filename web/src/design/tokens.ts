/**
 * Fonte única dos tokens de design.
 *
 * Deste arquivo derivam, por geração (`npm run tokens`):
 *   1. as CSS custom properties de `:root` e do tema escuro;
 *   2. o mapeamento das variáveis do shadcn/ui;
 *   3. os nomes de cor expostos ao Tailwind via `@theme inline`.
 *
 * Componentes consomem apenas os tokens semânticos. Hexadecimais e
 * primitivas em código de componente são rejeitados pelo lint.
 */

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------

/**
 * Rampa neutra inspirada nas superfícies de sistema: fria, clara e sem branco
 * ou preto puros, para reduzir o brilho sem perder nitidez.
 */
export const gray = {
  50: "#f5f5f7",
  100: "#fbfbfd",
  200: "#d2d2d7",
  300: "#a1a1a6",
  400: "#86868b",
  500: "#6e6e73",
  600: "#515154",
  700: "#424245",
  800: "#2d2d2f",
  900: "#1d1d1f",
  950: "#161617",
  ink: "#1d1d1f",
  paper: "#f5f5f7",
  mutedDark: "#a1a1a6",
} as const;

/** Azul reservado a ações e foco; a interface não depende dele para contexto. */
export const blue = {
  300: "#2997ff",
  400: "#0a84ff",
  500: "#0071e3",
  600: "#0066cc",
  700: "#004f9e",
} as const;

export const red = {
  300: "#ff6961",
  700: "#c41e3a",
} as const;

/**
 * Paleta de realce de sintaxe. Só existe para o conteúdo técnico dos painéis
 * de saída; nenhum outro lugar da interface deve usá-la. Cada cor foi
 * escolhida para atingir 4.5:1 sobre as duas superfícies, nos dois temas — a
 * verificação de contraste cobre isso.
 */
export const syntaxLight = {
  key: "#0a53b8",
  string: "#0a6b3d",
  number: "#8a4b00",
  atom: "#6b34c9",
  attr: "#0a6068",
  punct: "#515154",
} as const;

export const syntaxDark = {
  key: "#79c0ff",
  string: "#7ee787",
  number: "#ffa657",
  atom: "#d2a8ff",
  attr: "#56d4dd",
  punct: "#a1a1a6",
} as const;

// ---------------------------------------------------------------------------
// Tokens semânticos
// ---------------------------------------------------------------------------

export const SEMANTIC_TOKEN_NAMES = [
  "surface",
  "surface-raised",
  "text",
  "text-muted",
  "border",
  "border-interactive",
  "accent",
  "accent-solid",
  "accent-solid-hover",
  "accent-foreground",
  "accent-text",
  "focus-ring",
  "danger",
  "danger-foreground",
  "syntax-key",
  "syntax-string",
  "syntax-number",
  "syntax-atom",
  "syntax-attr",
  "syntax-punct",
] as const;

export type SemanticToken = (typeof SEMANTIC_TOKEN_NAMES)[number];
export type ThemeName = "light" | "dark";

export const themes: Record<ThemeName, Record<SemanticToken, string>> = {
  light: {
    surface: gray[50],
    "surface-raised": gray[100],
    text: gray.ink,
    "text-muted": gray[600],
    border: gray[200],
    "border-interactive": gray[400],
    accent: blue[500],
    "accent-solid": blue[600],
    "accent-solid-hover": blue[700],
    "accent-foreground": gray[100],
    "accent-text": blue[700],
    "focus-ring": blue[500],
    danger: red[700],
    "danger-foreground": gray[100],
    "syntax-key": syntaxLight.key,
    "syntax-string": syntaxLight.string,
    "syntax-number": syntaxLight.number,
    "syntax-atom": syntaxLight.atom,
    "syntax-attr": syntaxLight.attr,
    "syntax-punct": syntaxLight.punct,
  },
  dark: {
    surface: gray[950],
    "surface-raised": gray[900],
    text: gray.paper,
    "text-muted": gray.mutedDark,
    border: gray[800],
    "border-interactive": gray[500],
    accent: blue[300],
    "accent-solid": blue[400],
    "accent-solid-hover": blue[300],
    "accent-foreground": gray[950],
    "accent-text": blue[300],
    "focus-ring": blue[300],
    danger: red[300],
    "danger-foreground": gray[950],
    "syntax-key": syntaxDark.key,
    "syntax-string": syntaxDark.string,
    "syntax-number": syntaxDark.number,
    "syntax-atom": syntaxDark.atom,
    "syntax-attr": syntaxDark.attr,
    "syntax-punct": syntaxDark.punct,
  },
};

// ---------------------------------------------------------------------------
// Pares de contraste declarados
// ---------------------------------------------------------------------------

export type ContrastUsage = "text" | "large-text" | "interface";

export type ContrastPair = {
  foreground: SemanticToken;
  background: SemanticToken;
  usage: ContrastUsage;
  description: string;
};

/** Mínimos WCAG 2.1 AA por tipo de uso. */
export const MIN_RATIO: Record<ContrastUsage, number> = {
  text: 4.5,
  "large-text": 3,
  interface: 3,
};

/**
 * Toda combinação de tokens que o sistema realmente usa. A verificação
 * automatizada roda sobre esta lista nos dois temas; combinações que não
 * estão aqui não devem aparecer na interface.
 *
 * `border` é decorativo (separadores e delimitação de painéis que já contêm
 * texto legível) e por isso não figura na lista — a delimitação de controles
 * interativos usa `border-interactive`, que figura.
 */
export const contrastPairs: ContrastPair[] = [
  { foreground: "text", background: "surface", usage: "text", description: "corpo de texto sobre o fundo da página" },
  { foreground: "text", background: "surface-raised", usage: "text", description: "corpo de texto em painel" },
  { foreground: "text-muted", background: "surface", usage: "text", description: "subtítulo e texto secundário" },
  { foreground: "text-muted", background: "surface-raised", usage: "text", description: "texto secundário em painel" },
  { foreground: "accent-text", background: "surface", usage: "text", description: "texto em acento" },
  { foreground: "accent-text", background: "surface-raised", usage: "text", description: "texto em acento sobre painel" },
  { foreground: "accent-foreground", background: "accent-solid", usage: "text", description: "rótulo de ação primária" },
  { foreground: "accent-foreground", background: "accent-solid-hover", usage: "text", description: "rótulo de ação primária em hover" },
  { foreground: "danger", background: "surface", usage: "text", description: "mensagem de erro inline" },
  { foreground: "danger", background: "surface-raised", usage: "text", description: "mensagem de erro em painel" },
  { foreground: "danger-foreground", background: "danger", usage: "text", description: "texto sobre superfície de erro" },
  { foreground: "border-interactive", background: "surface", usage: "interface", description: "limite de controle interativo" },
  { foreground: "border-interactive", background: "surface-raised", usage: "interface", description: "limite de controle em painel" },
  { foreground: "focus-ring", background: "surface", usage: "interface", description: "anel de foco sobre o fundo" },
  { foreground: "focus-ring", background: "surface-raised", usage: "interface", description: "anel de foco em painel" },
  { foreground: "accent-solid", background: "surface", usage: "interface", description: "preenchimento da ação primária" },
  { foreground: "accent-solid", background: "surface-raised", usage: "interface", description: "ação primária em painel" },
  { foreground: "syntax-key", background: "surface-raised", usage: "text", description: "chave de objeto e nome de elemento no painel de saída" },
  { foreground: "syntax-string", background: "surface-raised", usage: "text", description: "texto entre aspas no painel de saída" },
  { foreground: "syntax-number", background: "surface-raised", usage: "text", description: "número no painel de saída" },
  { foreground: "syntax-atom", background: "surface-raised", usage: "text", description: "true, false e null no painel de saída" },
  { foreground: "syntax-attr", background: "surface-raised", usage: "text", description: "nome de atributo no painel de saída" },
  { foreground: "syntax-punct", background: "surface-raised", usage: "text", description: "pontuação estrutural no painel de saída" },
];

// ---------------------------------------------------------------------------
// Tipografia
// ---------------------------------------------------------------------------

/**
 * Interface e títulos seguem a pilha de fontes do sistema. JetBrains Mono
 * fica reservado ao conteúdo técnico para preservar densidade e precisão.
 */
export const fontFamilies = {
  sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
  serif: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
  mono: "var(--font-jetbrains-mono), ui-monospace, 'SFMono-Regular', Menlo, monospace",
} as const;

export const fontSizes = {
  xs: "0.75rem",
  sm: "0.8125rem",
  base: "0.9375rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.75rem",
  "2xl": "2.25rem",
} as const;

export const lineHeights = {
  tight: "1.2",
  snug: "1.35",
  normal: "1.6",
  relaxed: "1.75",
} as const;

// ---------------------------------------------------------------------------
// Espaçamento, raio e layout
// ---------------------------------------------------------------------------

export const spacing = {
  "3xs": "0.25rem",
  "2xs": "0.5rem",
  xs: "0.75rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "3rem",
  "2xl": "4rem",
} as const;

export const radii = {
  sm: "0.5rem",
  md: "0.625rem",
  lg: "0.875rem",
} as const;

/** Largura máxima do conteúdo, conforme a especificação de layout. */
export const layout = {
  contentMaxWidth: "1100px",
  headerHeight: "3.25rem",
} as const;
