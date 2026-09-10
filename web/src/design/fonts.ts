import localFont from "next/font/local";

/**
 * IBM Plex Mono é a única família do sistema, em interface e em conteúdo
 * técnico. Vem do próprio domínio; nenhuma requisição sai para uma CDN.
 *
 * Não há versão variável publicada, então são três arquivos estáticos — os
 * três pesos que o sistema usa. `adjustFontFallback` gera uma fonte de
 * fallback com métricas ajustadas, o que evita deslocamento de layout
 * enquanto a fonte real carrega.
 */

export const ibmPlexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/ibm-plex-mono-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-ibm-plex-mono",
  adjustFontFallback: "Arial",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const fontVariables = ibmPlexMono.variable;
