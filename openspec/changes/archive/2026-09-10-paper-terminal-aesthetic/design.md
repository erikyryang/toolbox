## Context

O toolbox já tem a infraestrutura de design certa e a paleta errada.
`web/src/design/tokens.ts` é fonte única de verdade: dele saem, por geração,
as custom properties de `:root`, o mapeamento shadcn/ui e os nomes expostos ao
Tailwind por `@theme inline`. Um teste compara `tokens.css` em disco com o que
os tokens produzem hoje e falha na divergência; outro roda contraste WCAG
sobre uma lista declarada de pares; um `no-restricted-syntax` do ESLint
rejeita hexadecimal, `rgb()`, `oklch()` e classe de cor arbitrária em qualquer
arquivo de `src/app`, `src/components` e `src/lib`.

O efeito prático é que trocar a paleta inteira é uma edição de um arquivo mais
`npm run tokens`. Nenhum componente conhece uma cor. Isto é o que torna esta
change barata apesar de tocar toda a superfície visual.

O que não é barato é o cromo: dots, chips, prefixo `//`, marcador `▸` e linha
de prompt não existem hoje em forma alguma, e a marcação atual usa raio `lg`,
`text-sm`/`text-xs` do Tailwind e fonte sans do sistema em quase todo lugar.

A referência é `erikyryan.dev.br`, cujo CSS foi lido diretamente: `--paper:
#faf7f1`, `--ink: #201c15`, `--accent: #b3431f`, IBM Plex Mono nos pesos
400/500/600/700, raio `6px`, entrelinha `1.65`, `--track-label: .12em`.

## Goals / Non-Goals

**Goals:**

- A superfície visual do toolbox lida como a de `erikyryan.dev.br`: mesma
  paleta, mesma família, mesma geometria, mesmo vocabulário de cromo.
- Todo par de cor que a interface usa passa WCAG AA nos dois temas, verificado
  por teste — inclusive os pares que o site de referência não passa.
- `openspec/specs/design-system/spec.md` volta a descrever o produto real.
- Nenhuma mudança de comportamento: mesma operação, mesma rota, mesmo motor,
  mesmo roteamento, mesmos limites.

**Non-Goals:**

- Reproduzir o layout do site. O toolbox mantém sidebar de operações e dois
  painéis; a coluna única de 46rem, a gutter numerada por seção e o cursor
  piscando do `whoami` ficam de fora — são de documento, não de ferramenta.
- Compartilhar código, pacote de tokens ou repositório com o site.
- Rever a hierarquia de informação, os textos ou a i18n.
- Tocar o `server/`.

## Decisions

### Uma família mono, estática, três pesos

IBM Plex Mono não tem versão variável publicada em `@fontsource-variable` —
só `@fontsource/ibm-plex-mono` 5.3.0, com arquivos estáticos por peso. Então
o padrão vigente no repositório (um `.woff2` variável por família, copiado por
`npm run fonts:sync`) muda para três arquivos estáticos, um por peso.

Escolhidos 400, 600 e 700. O site carrega também 500 e um itálico; o 500 não
é referenciado por regra alguma do CSS dele, e o itálico serve `blockquote` e
legenda, que o toolbox não tem. Três arquivos a ~15 KB cada é menos peso que o
único variável da JetBrains Mono que sai.

`next/font/local` aceita um array de `src` com `weight` por entrada, então
continua sendo uma declaração só, com `adjustFontFallback` preservado para não
haver deslocamento de layout enquanto a fonte carrega.

*Alternativa descartada*: manter JetBrains Mono e trocar só a cor. Custa zero
download, mas a JetBrains tem eixo vertical mais alto e terminações retas — ao
lado do site a diferença é imediata, e o objetivo da change é justamente que
não seja.

### Os tokens semânticos não mudam de nome

A troca é de valor, não de vocabulário. `surface`, `surface-raised`, `text`,
`text-muted`, `border`, `border-interactive`, `accent*`, `focus-ring`,
`danger*` e as seis de sintaxe continuam existindo com o mesmo significado.
Isto mantém o mapeamento shadcn/ui, o `@theme inline` e todos os componentes
válidos sem edição de classe — e faz a troca de paleta caber em `tokens.ts`.

O que muda de nome são as *primitivas*: `gray` e `blue` saem e entram `sand`
(rampa quente) e `rust` (acento). O ESLint já tem uma regra
`no-restricted-imports` proibindo importar `sand`, `terracotta` e `rust` de
`@/design/tokens` em componente — escrita para primitivas que nunca chegaram a
existir. Depois desta change ela passa a proteger algo real.

### `border-interactive` é mais escuro que o `--faint` do site

O site usa `--faint` (`#94897a` claro, `#6f6758` escuro) em texto de 12px, e
esse par entrega 3.2:1 — abaixo de AA para texto normal. O toolbox usa o token
equivalente em limite de controle interativo, onde o mínimo é 3:1, mas sobre a
superfície *de painel* o valor do site cai para 2.90:1 e reprova.

Ajustado para `#877c6c` no claro (3.46:1 sobre painel) e `#7d7565` no escuro
(3.53:1). É a única divergência deliberada de valor em relação à referência, e
existe porque o teste de contraste do toolbox cobre um par que o site não tem.

### Sintaxe recolorida, não herdada

O site não tem realce de sintaxe — não há o que copiar. A paleta atual é
GitHub-derivada (azul `#0a53b8`, roxo `#6b34c9`, ciano `#0a6068`) e, sobre
papel `#f3ebdd`, lê como enxerto.

Substituída por seis hues separados que assentam no quente: teal `#0f5b70`
para chave, verde-oliva `#3d6b35` para string, âmbar `#8a4b00` para número,
vinho `#9b2c5a` para átomo, violeta `#7340a8` para atributo e o próprio
`text-muted` para pontuação; no escuro, as versões claras correspondentes.
Nenhuma se aproxima do terracota, que continua significando ação. Todas
verificadas: o menor par é 4.74:1.

*Restrição que guiou a escolha*: `danger` também precisa não ser confundível
com o acento. Por isso ficou em carmim `#a11d33` / `#f08a92` — vermelho com
componente azul, não laranja-marrom.

### O cromo entra por classe utilitária, não por CSS global

Dots, chips, prefixo `//` e marcador `▸` poderiam virar regras em
`globals.css`, como no site. Aqui viram composições de utilitário Tailwind,
com uma exceção: o prefixo `// ` e o marcador `▸` precisam de `::before` para
ficarem fora da árvore de acessibilidade, e utilitário arbitrário de `content`
é ilegível. Esses dois ganham uma classe cada em `@layer components` de
`globals.css` — `section-title` e `bullet-arrow` — que consomem tokens e não
literais.

O chip vira uma variante do `Button` existente (`variant: "chip"`), não um
componente novo: os controles que precisam dele já são botões ou links, e a
variante herda foco, estados de disabled e `asChild`.

### O prompt é decorativo e some da árvore de acessibilidade

`you@toolbox:~$ base64` repete informação que já está no `<h1>` e na URL. Vai
com `aria-hidden`, como os dots e o prefixo `//`. O mesmo vale para o cursor
do site, que aqui nem entra.

## Risks / Trade-offs

- **A paleta quente reduz a distância entre `surface` e `surface-raised`** →
  no claro são `#faf7f1` e `#f3ebdd`, 1.11:1 entre si. A delimitação de painel
  não pode depender do preenchimento: continua sendo a borda de 1px, que a
  spec já exige. Verificar visualmente que nenhum painel perde limite quando o
  fundo muda.

- **Três arquivos de fonte estática em vez de um variável** → mais requisições
  no primeiro carregamento. Mitigado por `display: swap`, `adjustFontFallback`
  e pelo tamanho: ~45 KB somados, contra ~60 KB do variável que sai.

- **A remoção de Inter e Newsreader é irreversível dentro da change** → se um
  requisito futuro pedir serifada, volta como change própria. Os arquivos
  estão no histórico do git; nada se perde.

- **`text-muted` sobre `surface-raised` fica em 5.06:1** → passa AA com folga
  pequena. Qualquer escurecimento futuro de `surface-raised` precisa refazer a
  conta. O teste de contraste é quem avisa.

- **O teste `preserva a paleta de sistema` vai falhar por construção** → é
  intencional: ele congela `#f5f5f7` e `#0071e3`. Reescrito para congelar os
  novos valores canônicos, mantendo a função de detectar troca acidental de
  paleta.

## Migration Plan

Não há migração de dados, de API nem de estado persistido. A única coisa
guardada no navegador é a preferência de tema em `localStorage`, cujos valores
(`"light"` / `"dark"`) não mudam.

A implementação segue a ordem que mantém a árvore verde a cada passo: fontes
primeiro (a troca de família não depende de cor), tokens em seguida com
`npm run tokens` e os testes de contraste atualizados, e só então os
componentes. `npm run lint`, `typecheck`, `test` e `build` fecham cada etapa.

Rollback é `git revert` do merge: nenhum artefato fora do repositório é
tocado.

## Open Questions

Nenhuma. As duas decisões abertas — profundidade da estética e destino da
JetBrains Mono — foram resolvidas antes da proposta: cromo leve sobre a
estrutura atual, e substituição por IBM Plex Mono.
