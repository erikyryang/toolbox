import localFont from "next/font/local";

/**
 * A interface usa a pilha nativa do sistema. JetBrains Mono é a única fonte
 * local, reservada a dados técnicos; nenhuma requisição sai para uma CDN.
 *
 * `adjustFontFallback` gera uma fonte de fallback com métricas ajustadas, o
 * que evita deslocamento de layout enquanto a fonte real carrega.
 */

export const jetbrainsMono = localFont({
  src: "../fonts/jetbrains-mono-variable.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-jetbrains-mono",
  adjustFontFallback: "Arial",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const fontVariables = jetbrainsMono.variable;
