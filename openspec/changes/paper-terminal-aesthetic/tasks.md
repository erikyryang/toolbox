## 1. Tipografia — IBM Plex Mono como família única

- [ ] 1.1 Adicionar `@fontsource/ibm-plex-mono` e remover `@fontsource-variable/inter`, `@fontsource-variable/newsreader` e `@fontsource-variable/jetbrains-mono` de `web/package.json`
- [ ] 1.2 Reescrever `web/scripts/sync-fonts.mjs` para copiar os três pesos estáticos (400, 600, 700) do subset latin, e rodar `npm run fonts:sync`
- [ ] 1.3 Apagar `web/src/fonts/inter-variable.woff2`, `newsreader-variable.woff2` e `jetbrains-mono-variable.woff2`
- [ ] 1.4 Reescrever `web/src/design/fonts.ts`: uma declaração `localFont` com array de `src` por peso, variável CSS `--font-ibm-plex-mono`, `display: swap` e `adjustFontFallback` preservados
- [ ] 1.5 Em `tokens.ts`, reduzir `fontFamilies` a uma entrada `mono` apontando para a nova variável, com fallback `ui-monospace, SFMono-Regular, Menlo, monospace`
- [ ] 1.6 Em `build-css.ts`, emitir só `--font-mono`; remover `--font-sans` e `--font-serif`
- [ ] 1.7 Em `globals.css`, remover `--font-sans` e `--font-serif` do `@theme inline` e apontar `body` para `var(--font-mono)`

## 2. Paleta e escalas em `tokens.ts`

- [ ] 2.1 Substituir as primitivas: remover `gray` e `blue`, criar `sand` (rampa quente) e `rust` (acento), manter `red` com os valores de carmim novos
- [ ] 2.2 Aplicar os valores canônicos do tema claro: `surface #faf7f1`, `surface-raised #f3ebdd`, `text #201c15`, `text-muted #6b6255`, `border #e2dac9`, `border-interactive #877c6c`, `accent`/`accent-solid`/`accent-text` `#b3431f`, `accent-solid-hover`/`focus-ring` `#8a2f16`, `accent-foreground` `#fff8f2`, `danger #a11d33`, `danger-foreground #fff8f2`
- [ ] 2.3 Aplicar os valores do tema escuro: `surface #171310`, `surface-raised #26201a`, `text #ede5d8`, `text-muted #a49988`, `border #332b21`, `border-interactive #7d7565`, `accent`/`accent-solid`/`accent-text` `#e0784a`, `accent-solid-hover`/`focus-ring` `#f0946a`, `accent-foreground` `#1a1109`, `danger #f08a92`, `danger-foreground #1a1109`
- [ ] 2.4 Recolorir a sintaxe: claro `key #0f5b70`, `string #3d6b35`, `number #8a4b00`, `atom #9b2c5a`, `attr #7340a8`, `punct #6b6255`; escuro `key #6fbfd4`, `string #9ccf7f`, `number #e0b371`, `atom #f08fb8`, `attr #c4a2f0`, `punct #a49988`
- [ ] 2.5 Trocar `radii` (escala de três) por um raio único de `6px` e ajustar `build-css.ts` para emitir `--radius`
- [ ] 2.6 Tornar fluidos os tamanhos de título em `fontSizes` com `clamp()`, ajustar `lineHeights.normal` para `1.65` e adicionar o token de tracking de rótulo (`.12em`)
- [ ] 2.7 Rodar `npm run tokens` e conferir que `src/app/tokens.css` foi regerado

## 3. Testes de design

- [ ] 3.1 Reescrever o teste `preserva a paleta de sistema` em `tokens.test.ts` para congelar os novos valores canônicos, renomeando-o para o que ele agora protege
- [ ] 3.2 Adicionar teste que reprova neutro frio: para `surface`, `surface-raised`, `text`, `text-muted`, `border` e `border-interactive`, nos dois temas, o canal vermelho é maior ou igual ao azul (`isWarm` de `contrast.ts` já existe e não era usado)
- [ ] 3.3 Adicionar ao `contrastPairs` os pares que faltam para cobrir a spec — em especial `accent-foreground` sobre `accent-solid-hover` já presente e `border-interactive` sobre as duas superfícies — e confirmar que a suíte passa nos dois temas
- [ ] 3.4 Adicionar teste que reprova cor de sintaxe igual ao token de acento em qualquer um dos temas

## 4. Cromo de terminal

- [ ] 4.1 Em `globals.css`, criar em `@layer components` a classe `section-title` (prefixo `// ` por `::before`, em `text-muted`, com `aria-hidden` garantido pelo pseudo-elemento) e `bullet-arrow` (marcador `▸` em acento)
- [ ] 4.2 Adicionar a variante `chip` a `web/src/components/ui/button.tsx`: caixa alta, `0.75rem`, tracking de rótulo, borda de 1px, raio único, borda e texto em acento no hover e em `aria-current`
- [ ] 4.3 Padronizar o raio: trocar todo `rounded-sm|md|lg|xl` dos componentes pelo utilitário do raio único, e conferir no build que nenhum resíduo da escala antiga sobrou

## 5. Componentes

- [ ] 5.1 `site-header.tsx`: três dots decorativos com `aria-hidden` à esquerda, "toolbox" como chip com `aria-current` na visão geral, e idioma e tema como chips
- [ ] 5.2 `theme-toggle.tsx` e `language-select.tsx`: adotar a variante `chip`, preservando rótulo acessível e o comportamento atual
- [ ] 5.3 `operation-sidebar.tsx` e `operation-menu.tsx`: títulos de grupo com `section-title`, item ativo em acento, raio único; remover os ícones coloridos de grupo se destoarem do peso visual
- [ ] 5.4 `[operation]/page.tsx` e `operation-workspace.tsx`: linha de prompt `you@toolbox:~$ <slug>` com `aria-hidden`, título em peso 700 com tracking negativo, subtítulo em `text-muted`
- [ ] 5.5 `text-panel.tsx`: rótulos de painel com `section-title`, borda de 1px como única delimitação, raio único
- [ ] 5.6 `file-workspace.tsx`: `section-title` nos rótulos, `bullet-arrow` na lista de arquivos, `tabular-nums` em tamanho de arquivo e razão de compactação, raio único
- [ ] 5.7 `overview-panel.tsx`, `privacy-note.tsx`, `advanced-options.tsx`, `copy-button.tsx` e `python-script.tsx`: aplicar chips, `section-title`, raio único e `tabular-nums` onde houver número comparável
- [ ] 5.8 Varrer os componentes atrás de `text-sm`/`text-xs` que agora deveriam ser rótulo com tracking, e uniformizar

## 6. Specs e verificação

- [ ] 6.1 `npm run lint` — confirmar que nenhuma cor literal entrou junto com o cromo
- [ ] 6.2 `npm run typecheck` e `npm test`
- [ ] 6.3 `npm run build`
- [ ] 6.4 `openspec validate paper-terminal-aesthetic --strict`
- [ ] 6.5 Conferir as duas telas nos dois temas — visão geral e uma operação de arquivo — procurando painel sem limite visível, já que `surface` e `surface-raised` ficaram a 1.11:1 uma da outra
