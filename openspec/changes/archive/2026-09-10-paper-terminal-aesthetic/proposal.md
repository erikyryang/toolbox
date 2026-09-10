## Why

A linguagem visual do toolbox precisa ser a mesma de `erikyryan.dev.br`: papel
quente, acento terracota, uma única família mono e o cromo discreto de
terminal que o site usa. Hoje o produto vai na direção oposta — o commit
`75be595` trocou a paleta por cinzas frios de sistema com acento azul
`#0071e3` e pilha de fontes nativa, deixando duas superfícies distintas para o
mesmo autor.

O mesmo commit criou uma segunda dívida: `openspec/specs/design-system/spec.md`
nunca foi atualizado. A spec vigente ainda exige paleta quente `#c96442`, Inter
para UI e Newsreader para títulos — nada disso está no código, e Inter e
Newsreader continuam vendorizadas em `web/src/fonts/` sem que fonte alguma as
carregue. Esta change fecha as duas distâncias de uma vez, porque a correção da
deriva e a adoção da nova estética tocam exatamente os mesmos requisitos.

## What Changes

- **Paleta trocada para papel quente e terracota.** Fundo claro `#faf7f1`,
  fundo escuro `#171310`, tinta `#201c15` / `#ede5d8`, acento `#b3431f` /
  `#e0784a`. Nenhum neutro com componente azul sobra: a rampa `gray` fria e o
  azul `blue` saem inteiros de `tokens.ts`.

- **Uma família tipográfica só.** IBM Plex Mono, servida localmente nos pesos
  400, 600 e 700, passa a valer para interface *e* conteúdo técnico. JetBrains
  Mono sai; Inter e Newsreader, já órfãs, saem com ela — junto dos três pacotes
  `@fontsource-variable` correspondentes.

- **BREAKING (spec, não runtime): o título de operação deixa de ser serifado.**
  Não há mais serifada no sistema. O cabeçalho de operação passa a ser mono com
  tracking negativo, precedido da linha de prompt `you@toolbox:~$ <slug>`.

- **Cromo de terminal na moldura.** Três *dots* à esquerda no header, chips
  maiúsculos com `letter-spacing` de `.12em` para ações e alternadores,
  títulos de seção prefixados por `// `, bullets `▸` em acento, e
  `font-variant-numeric: tabular-nums` em todo número que o usuário compara
  (tamanhos de arquivo, razão de compactação, contagem de bytes).

- **Geometria mais dura.** Raio único de `6px` no lugar da escala
  `0.5/0.625/0.875rem`; bordas de 1px como única delimitação, sem sombra nem
  gradiente — o que a spec já exigia e o código já cumpre, agora com a
  geometria alinhada.

- **Escala tipográfica fluida.** Títulos passam a usar `clamp()` em vez de
  tamanhos fixos, para que a mesma tela sirva do telefone ao monitor sem
  breakpoint dedicado.

- **Realce de sintaxe recolorido.** As seis cores do painel de saída trocam a
  base GitHub (azul, roxo e ciano vivos) por um conjunto que assenta sobre
  papel quente, mantendo o mínimo de 4.5:1 sobre a superfície de painel nos
  dois temas.

- **Nenhuma mudança de comportamento.** Nenhuma operação, rota, motor, limite
  ou decisão de roteamento é tocada. A change é inteiramente de apresentação.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `design-system`: paleta canônica, tipografia, geometria e o vocabulário de
  cromo de terminal. É a capacidade que mais muda — e a que hoje descreve um
  produto que não existe.
- `operation-workspace`: o requisito do título serifado deixa de existir e é
  substituído por cabeçalho mono com linha de prompt; o requisito do header
  fino ganha os *dots* e os chips.

## Impact

- **Fonte única de cor**: `web/src/design/tokens.ts` — primitivas, tokens
  semânticos, escalas de tipografia e raio. `web/src/app/tokens.css` é
  regerado por `npm run tokens`.
- **Fontes**: `web/src/design/fonts.ts`, `web/scripts/sync-fonts.mjs`,
  `web/src/fonts/` (três arquivos saem, três entram) e as dependências de
  fonte em `web/package.json`.
- **Componentes**: `site-header`, `operation-sidebar`, `operation-menu`,
  `ui/button`, `theme-toggle`, `language-select`, `text-panel`,
  `operation-workspace`, `file-workspace`, `overview-panel`, `copy-button`,
  `advanced-options`, `privacy-note`, `python-script` — todos por classe
  utilitária, nenhum por valor literal.
- **Testes**: `web/src/design/tokens.test.ts` — a asserção que hoje congela a
  paleta de sistema (`#f5f5f7`, `#0071e3`) passa a congelar a nova.
- **Sem impacto**: `server/`, motores, catálogo, roteamento, i18n e a suíte de
  compactação. O lint que rejeita cor literal em componente continua valendo
  sem alteração.
