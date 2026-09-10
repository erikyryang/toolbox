## MODIFIED Requirements

### Requirement: Paleta em tons quentes
O sistema SHALL usar uma paleta de papel quente, sem branco puro (`#ffffff`),
preto puro (`#000000`) ou neutro com componente azulada. Os valores canônicos
são: fundo claro `#faf7f1`, painel claro `#f3ebdd`, fundo escuro `#171310`,
painel escuro `#26201a`, tinta clara `#201c15`, tinta escura `#ede5d8`, acento
terracota `#b3431f` no tema claro e `#e0784a` no escuro.

Nenhum neutro do sistema MUST ter o canal azul acima do vermelho. A rampa fria
de cinzas de sistema e o azul de ação não fazem mais parte da paleta.

#### Scenario: Fundo do tema claro
- **WHEN** a aplicação é renderizada no tema claro
- **THEN** o fundo da página usa `#faf7f1`, o painel usa `#f3ebdd` e o texto principal usa `#201c15`

#### Scenario: Fundo do tema escuro
- **WHEN** a aplicação é renderizada no tema escuro
- **THEN** o fundo da página usa `#171310`, o painel usa `#26201a` e o texto principal usa `#ede5d8`

#### Scenario: Ausência de branco e preto puros
- **WHEN** os tokens de cor são auditados
- **THEN** nenhum token semântico resolve para `#ffffff` ou `#000000`

#### Scenario: Ausência de neutro frio
- **WHEN** um token de superfície, texto, borda ou neutro é auditado nos dois temas
- **THEN** seu canal vermelho é maior ou igual ao azul

### Requirement: Acento reservado a ações primárias
O acento terracota — `#b3431f` no tema claro, `#e0784a` no escuro — SHALL ser
usado exclusivamente em ações primárias, no anel de foco, no cursor de bloco e
no marcador `▸` de lista. Textos de corpo, bordas de painel, rótulos e estados
informativos MUST NOT usar o acento.

#### Scenario: Botão primário
- **WHEN** uma tela apresenta uma ação primária (ex.: "Baixar")
- **THEN** o controle usa o token de acento como preenchimento, com o texto no token de contraste do acento

#### Scenario: Ação secundária
- **WHEN** uma tela apresenta uma ação secundária (ex.: "Copiar", "Inverter")
- **THEN** o controle usa tokens neutros, sem o acento

#### Scenario: Marcador de lista
- **WHEN** uma lista de itens é renderizada com o marcador `▸`
- **THEN** o marcador usa o acento e o texto do item permanece em tinta neutra

### Requirement: Superfícies sem sombra, sem gradiente e com raio único
O sistema SHALL delimitar superfícies com bordas de 1px no token de borda
quente, e SHALL usar um raio único de `6px` em todo elemento arredondado.
Sombras, gradientes, cards elevados e ícones coloridos MUST NOT ser usados.

#### Scenario: Delimitação de painel
- **WHEN** um painel de entrada ou saída é renderizado
- **THEN** ele é delimitado por uma borda de 1px, sem `box-shadow`

#### Scenario: Raio uniforme
- **WHEN** botões, chips, painéis e campos são renderizados na mesma tela
- **THEN** todos usam o mesmo raio de `6px`

## REMOVED Requirements

### Requirement: Tipografia com fontes livres em três papéis
**Reason**: O sistema passa a ter uma família só. A divisão em três papéis
(Inter para UI, Newsreader para títulos, JetBrains Mono para conteúdo técnico)
nunca chegou a existir no código — desde `75be595` a interface usa a pilha
nativa do sistema e só JetBrains Mono é carregada, com Inter e Newsreader
vendorizadas e órfãs em `web/src/fonts/`. A estética adotada agora resolve a
divergência no sentido oposto: mono em tudo.

**Migration**: Substituída por "Tipografia mono em família única", abaixo. Os
três arquivos `.woff2` de Inter, Newsreader e JetBrains Mono saem do
repositório junto dos pacotes `@fontsource-variable` correspondentes; nenhum
componente referenciava `font-serif` ou `font-sans` por nome de família, então
a troca é de token, não de marcação.

## ADDED Requirements

### Requirement: Tipografia mono em família única
O sistema SHALL usar IBM Plex Mono como única família tipográfica, em
interface e em conteúdo técnico, servida do próprio domínio nos pesos 400, 600
e 700. Nenhuma outra família MUST ser carregada, e nenhuma requisição de fonte
MUST sair para domínio de terceiros.

Os pesos têm papel fixo: 400 para corpo e dados, 600 para título de seção e
rótulo, 700 para o título da operação e para o nome de item em destaque.

#### Scenario: Interface e conteúdo na mesma família
- **WHEN** qualquer tela é renderizada
- **THEN** rótulos, botões, títulos e o conteúdo dos painéis usam IBM Plex Mono

#### Scenario: Fontes servidas localmente
- **WHEN** a aplicação carrega
- **THEN** os arquivos de fonte vêm do próprio domínio, sem requisição a CDN de terceiros

#### Scenario: Ausência de família secundária
- **WHEN** os tokens de tipografia são auditados
- **THEN** não existe token de família serifada ou sem serifa apontando para uma fonte carregada

### Requirement: Escala tipográfica fluida
Os tamanhos de título SHALL ser definidos com `clamp()`, para que a tipografia
acompanhe a viewport sem breakpoint dedicado. O corpo permanece em tamanho
fixo, e a entrelinha do corpo é de `1.65`.

#### Scenario: Título em tela estreita
- **WHEN** a viewport tem 400px de largura
- **THEN** o título da operação é renderizado no limite inferior do `clamp`, sem estouro horizontal

#### Scenario: Título em tela larga
- **WHEN** a viewport passa da largura máxima do conteúdo
- **THEN** o título para de crescer no limite superior do `clamp`

### Requirement: Cromo de terminal
A moldura da aplicação SHALL usar um vocabulário visual de terminal, composto
por quatro elementos e por nenhum outro:

1. três *dots* circulares de 1px de borda à esquerda do header, decorativos e
   marcados com `aria-hidden`;
2. *chips* — controles em caixa alta, `font-size` de `0.75rem`,
   `letter-spacing` de `.12em`, borda de 1px e raio de `6px`, que ganham a cor
   do acento na borda e no texto quando ativos ou sob o ponteiro;
3. títulos de seção prefixados por `// ` em tom secundário, com o prefixo
   inserido por CSS e ausente da árvore de acessibilidade;
4. marcador `▸` em acento no lugar do bullet padrão das listas de item.

Ornamento fora dessa lista — ASCII art, moldura dupla, varredura de scanline —
MUST NOT ser usado.

#### Scenario: Header
- **WHEN** o header é renderizado
- **THEN** os três dots aparecem à esquerda e os controles de idioma, tema e navegação aparecem como chips

#### Scenario: Prefixo de seção fora da leitura assistiva
- **WHEN** um leitor de tela anuncia o título de uma seção
- **THEN** ele lê apenas o texto do título, sem o prefixo `//`

#### Scenario: Chip ativo
- **WHEN** um chip corresponde à página atual
- **THEN** sua borda e seu texto usam o acento, e ele carrega `aria-current`

### Requirement: Números tabulares em dados comparáveis
Todo número que o usuário compara entre linhas — tamanho de arquivo, razão de
compactação, contagem de bytes, contagem de entradas — SHALL ser renderizado
com `font-variant-numeric: tabular-nums`, para que os dígitos alinhem em
coluna.

#### Scenario: Lista de arquivos
- **WHEN** o conteúdo de um arquivo compactado é listado com um tamanho por linha
- **THEN** os dígitos dos tamanhos alinham verticalmente entre as linhas

### Requirement: Realce de sintaxe sobre papel quente
A paleta de realce de sintaxe SHALL ser escolhida para assentar sobre a
superfície de painel quente, e continua restrita ao conteúdo técnico do painel
de saída. Cada uma das seis cores MUST atingir 4.5:1 sobre a superfície de
painel nos dois temas, e nenhuma MUST ser confundível com o acento terracota,
que é reservado a ação.

#### Scenario: Chave e acento distinguíveis
- **WHEN** um JSON realçado é exibido ao lado de uma ação primária
- **THEN** nenhuma cor de sintaxe reproduz o valor do token de acento

#### Scenario: Contraste do realce
- **WHEN** a verificação automatizada roda sobre as seis cores de sintaxe nos dois temas
- **THEN** cada uma atinge ao menos 4.5:1 sobre a superfície de painel
