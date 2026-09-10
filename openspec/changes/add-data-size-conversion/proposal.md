## Why

Converter tamanho de dados é a conta que todo mundo refaz na calculadora e
erra: não porque a aritmética seja difícil, mas porque a base é ambígua. Um
disco de "1 TB" tem 10¹² bytes; o mesmo disco aparece como 931 GB no sistema
operacional, que conta em 2⁴⁰. Bit e byte acrescentam o fator 8 no meio do
caminho — o plano de 500 Mbps não entrega 500 MB por segundo.

O toolbox já é onde se converte codificação e formato. Tamanho de dados é a
terceira conversão da mesma família, e é a que mais se beneficia de uma
ferramenta que obriga a escolher a base em vez de escondê-la.

## What Changes

- **Novo grupo `Unidades`** na navegação, ao lado de Codificação, Formato e
  Compactação. É a quarta seção do menu, e nasce com uma operação.

- **Nova operação `converter-tamanho`**, rota própria e indexável, em duas
  colunas: valor na entrada, resultado na saída, recalculado a cada tecla.

- **Seis unidades**: bit, byte, KB, MB, GB e TB. KB entra porque é o degrau
  que falta entre byte e MB — uma escada com buraco no meio não é uma escada.

- **Base escolhida explicitamente**, e não adivinhada: 1000 (decimal, SI) ou
  1024 (binária, IEC). A opção é o coração da ferramenta, não um detalhe
  avançado, e a saída diz qual convenção produziu aquele número.

- **Unidade de origem e de destino** como opções de seleção, com o sentido
  invertível pelo controle que as operações reversíveis já têm — converter de
  volta é promover a saída a entrada e trocar as duas pontas.

- **Campo estritamente numérico**, e não área de texto: uma linha, aceitando
  dígitos, um separador decimal e um sinal. Letra é recusada na digitação, não
  depois por mensagem de erro. A saída é um campo igual, somente leitura.

  A entrada de um conversor é um valor, não um texto. Uma área de texto
  multilinha para digitar `1.5` promete uma liberdade que a operação não tem —
  e a unidade vem dos seletores, que é onde ela pode ser lida sem ambiguidade.

- **Opções principais fora do disclosure.** Encontrado ao montar a tela: os
  três seletores — base, origem e destino — caíam atrás de "Opções avançadas",
  fechado por padrão, e a operação nascia sem nenhum controle visível. O
  requisito de disclosure sempre falou de *opções avançadas* (nível de
  compressão, variantes de codificação, parâmetros de formato); falta o
  conceito oposto. A tela de operação passa a aceitar opções declaradas como
  principais, exibidas acima dos painéis.

- **Nenhuma mudança em operação existente.** Nem catálogo, nem motor, nem
  roteamento, nem limites. Nenhuma operação de hoje declara opção principal,
  então todas continuam com o disclosure que já tinham.

## Capabilities

### New Capabilities

- `data-size-conversion`: conversão entre unidades de tamanho de dados, com a
  base como escolha explícita.

### Modified Capabilities

- `operation-workspace`: ganha dois conceitos — opção principal, exibida fora
  do disclosure, e painel de valor numérico, para operações cuja entrada é um
  número. Nenhum requisito existente muda: o de opções avançadas continua
  valendo para tudo que não for declarado principal, e o de dois painéis
  continua valendo para toda operação de texto.

## Impact

- **Novo código**: `web/src/lib/engines/data-size.ts`,
  `web/src/lib/numeric-input.ts` e os testes dos dois,
  `web/src/lib/operations/units-catalog.ts`.
- **Código tocado**: `types.ts` (o tipo `OperationGroup` ganha `Unidades`, e
  `OperationMeta` ganha `primaryOptionIds` e `valueKind`),
  `operation-workspace.tsx` e `advanced-options.tsx` (a separação entre
  principal e avançada, com o campo de opção extraído para módulo próprio),
  `text-panel.tsx` (a variante de campo numérico),
  `catalog.ts` (`GROUP_ORDER` e a lista de operações), `registry.ts` (os dois
  sentidos do motor) e `i18n.ts` (nome do grupo, tradução da operação e das
  opções — toda operação nova precisa dos dois idiomas).
- **Sem impacto**: `server/`, compactação, roteamento e o design system — a
  tela nova não introduz nenhum token, e o único componente novo é a extração
  do campo de opção que já existia dentro de `advanced-options.tsx`.
