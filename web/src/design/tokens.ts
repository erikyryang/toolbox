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
 * Rampa de papel: areia quente, sem branco ou preto puros e sem nenhum passo
 * com o canal azul acima do vermelho. É a mesma família de tons de
 * erikyryan.dev.br — papel envelhecido, tinta sépia.
 */
export const sand = {
  paper: "#faf7f1",
  panel: "#f3ebdd",
  line: "#e2dac9",
  faint: "#877c6c",
  muted: "#6b6255",
  ink: "#201c15",
  paperDark: "#171310",
  panelDark: "#26201a",
  lineDark: "#332b21",
  faintDark: "#7d7565",
  mutedDark: "#a49988",
  inkDark: "#ede5d8",
} as const;

/**
 * Terracota, reservado a ação primária, foco e marcador de lista. A variante
 * escura clareia porque o mesmo tom sobre papel escuro perde legibilidade.
 */
export const rust = {
  400: "#f0946a",
  500: "#e0784a",
  600: "#b3431f",
  700: "#8a2f16",
  ink: "#fff8f2",
  inkDark: "#1a1109",
} as const;

/**
 * Carmim para erro. Tem componente azul de propósito: é o que o separa do
 * terracota do acento, que significa ação e não falha.
 */
export const red = {
  300: "#f08a92",
  700: "#a11d33",
} as const;

/**
 * Paleta de realce de sintaxe. Só existe para o conteúdo técnico dos painéis
 * de saída; nenhum outro lugar da interface deve usá-la. Cada cor foi
 * escolhida para assentar sobre papel quente, atingir 4.5:1 sobre a
 * superfície de painel nos dois temas e não ser confundível com o acento — a
 * verificação de contraste cobre as duas primeiras, e um teste próprio cobre
 * a terceira.
 */
export const syntaxLight = {
  key: "#0f5b70",
  string: "#3d6b35",
  number: "#8a4b00",
  atom: "#9b2c5a",
  attr: "#7340a8",
  punct: "#6b6255",
} as const;

export const syntaxDark = {
  key: "#6fbfd4",
  string: "#9ccf7f",
  number: "#e0b371",
  atom: "#f08fb8",
  attr: "#c4a2f0",
  punct: "#a49988",
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
    surface: sand.paper,
    "surface-raised": sand.panel,
    text: sand.ink,
    "text-muted": sand.muted,
    border: sand.line,
    "border-interactive": sand.faint,
    accent: rust[600],
    "accent-solid": rust[600],
    "accent-solid-hover": rust[700],
    "accent-foreground": rust.ink,
    "accent-text": rust[600],
    "focus-ring": rust[700],
    danger: red[700],
    "danger-foreground": rust.ink,
    "syntax-key": syntaxLight.key,
    "syntax-string": syntaxLight.string,
    "syntax-number": syntaxLight.number,
    "syntax-atom": syntaxLight.atom,
    "syntax-attr": syntaxLight.attr,
    "syntax-punct": syntaxLight.punct,
  },
  dark: {
    surface: sand.paperDark,
    "surface-raised": sand.panelDark,
    text: sand.inkDark,
    "text-muted": sand.mutedDark,
    border: sand.lineDark,
    "border-interactive": sand.faintDark,
    accent: rust[500],
    "accent-solid": rust[500],
    "accent-solid-hover": rust[400],
    "accent-foreground": rust.inkDark,
    "accent-text": rust[500],
    "focus-ring": rust[400],
    danger: red[300],
    "danger-foreground": rust.inkDark,
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
 * Uma família só, mono, em interface e em conteúdo técnico. Não existe token
 * de serifada ou de sem serifa: o sistema não carrega nenhuma outra fonte.
 */
export const fontFamilies = {
  mono: "var(--font-ibm-plex-mono), ui-monospace, 'SFMono-Regular', Menlo, monospace",
} as const;

/**
 * Os tamanhos de título são fluidos: `clamp()` no lugar de breakpoint, para
 * que a mesma tela sirva do telefone ao monitor. O corpo permanece fixo —
 * texto que o usuário lê e edita não deve mudar de tamanho com a janela.
 */
export const fontSizes = {
  xs: "0.75rem",
  sm: "0.8125rem",
  base: "0.9375rem",
  md: "1rem",
  lg: "1.25rem",
  title: "clamp(1.35rem, 3.5vw, 1.9rem)",
  display: "clamp(1.9rem, 6vw, 2.9rem)",
} as const;

export const lineHeights = {
  tight: "1.08",
  snug: "1.35",
  normal: "1.65",
  relaxed: "1.75",
} as const;

/**
 * Tracking. `label` é o do rótulo em caixa alta — chips, títulos de grupo,
 * metadados. `tight` é o do título, que em mono precisa fechar para não
 * parecer espaçado demais.
 */
export const tracking = {
  tight: "-0.02em",
  label: "0.12em",
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

/**
 * Raio único. Não há escala de arredondamento: chip, botão, painel e campo
 * usam o mesmo valor, e `globals.css` colapsa todos os nomes de raio do
 * Tailwind neste token para que uma escala não volte por engano.
 */
export const radius = "6px";

/**
 * Largura máxima do conteúdo, conforme a especificação de layout.
 *
 * A largura da sidebar e as duas goteiras são token, e não número solto em
 * classe, porque a topbar depende delas: é assim que o primeiro item dela cai
 * na coluna da sidebar e o último na borda direita do conteúdo. Se cada lado
 * escrevesse o próprio valor, o alinhamento sairia do lugar na primeira
 * mudança de um deles.
 *
 * `headerHeight` não dita a altura da topbar — ela é medida pelo conteúdo,
 * como no erikyryan.dev.br: 0.5rem de padding em cima e embaixo em volta de um
 * chip de 1.8625rem. O token repete esse total para quem precisa descontá-lo
 * da viewport (a sidebar grudada abaixo do header).
 */
export const layout = {
  contentMaxWidth: "1100px",
  headerHeight: "2.875rem",
  sidebarWidth: "16rem",
  sidebarGutter: "0.75rem",
  contentGutterNarrow: "1rem",
  contentGutterWide: "2rem",
} as const;
