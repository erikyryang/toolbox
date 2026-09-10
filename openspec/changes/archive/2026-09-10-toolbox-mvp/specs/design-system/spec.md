## ADDED Requirements

### Requirement: Paleta em tons quentes
O sistema SHALL usar uma paleta em tons quentes, sem branco puro (`#ffffff`), preto puro (`#000000`) ou cinzas com componente azulada. Os valores canônicos são: fundo claro `#faf9f5`, fundo escuro `#1a1a18`, texto principal `#1f1e1c`, acento terracota `#c96442`.

#### Scenario: Fundo do tema claro
- **WHEN** a aplicação é renderizada no tema claro
- **THEN** o fundo da página usa `#faf9f5` e o texto principal usa `#1f1e1c`

#### Scenario: Fundo do tema escuro
- **WHEN** a aplicação é renderizada no tema escuro
- **THEN** o fundo da página usa `#1a1a18` e o texto usa a variante clara do token de texto

#### Scenario: Ausência de branco e preto puros
- **WHEN** os tokens de cor são auditados
- **THEN** nenhum token semântico resolve para `#ffffff` ou `#000000`

### Requirement: Acento reservado a ações primárias
O acento terracota `#c96442` SHALL ser usado exclusivamente em ações primárias e no anel de foco. Textos de corpo, bordas, ícones e estados informativos MUST NOT usar o acento.

#### Scenario: Botão primário
- **WHEN** uma tela apresenta uma ação primária (ex.: "Baixar")
- **THEN** o controle usa o token de acento como cor de destaque

#### Scenario: Ação secundária
- **WHEN** uma tela apresenta uma ação secundária (ex.: "Copiar", "Inverter")
- **THEN** o controle usa tokens neutros, sem o acento

### Requirement: Tokens semânticos como única interface de cor
O sistema SHALL expor tokens semânticos (`surface`, `surface-raised`, `text`, `text-muted`, `border`, `accent`, `accent-foreground`, `focus-ring`, `danger`) derivados de uma fonte única, e componentes MUST consumir apenas esses tokens.

#### Scenario: Componente usa token semântico
- **WHEN** um componente precisa de cor de fundo
- **THEN** ele referencia o token `surface`, nunca um valor hexadecimal literal

#### Scenario: Valor literal é rejeitado
- **WHEN** um componente introduz um hexadecimal ou uma cor primitiva diretamente
- **THEN** a verificação de lint falha o build

#### Scenario: Troca de tema altera apenas valores de token
- **WHEN** o tema muda de claro para escuro
- **THEN** apenas os valores das custom properties mudam, sem alteração de classes nos componentes

### Requirement: Tipografia com fontes livres em três papéis
O sistema SHALL usar Inter para UI, labels e botões; uma serifada (Newsreader) para títulos de seção; e JetBrains Mono para entrada, saída e qualquer conteúdo técnico. Fontes proprietárias (Styrene, Copernicus, Tiempos) MUST NOT ser usadas.

#### Scenario: Título de operação
- **WHEN** uma tela de operação é renderizada
- **THEN** seu título usa a fonte serifada

#### Scenario: Painéis de entrada e saída
- **WHEN** o usuário digita no painel de entrada
- **THEN** o texto é renderizado em JetBrains Mono, e o painel de saída usa a mesma fonte

#### Scenario: Fontes servidas localmente
- **WHEN** a aplicação carrega
- **THEN** os arquivos de fonte vêm do próprio domínio, sem requisição a CDN de terceiros

### Requirement: Superfícies sem sombra e sem gradiente
O sistema SHALL delimitar superfícies com bordas de 1px em cinza claro. Sombras, gradientes, cards elevados e ícones coloridos MUST NOT ser usados.

#### Scenario: Delimitação de painel
- **WHEN** um painel de entrada ou saída é renderizado
- **THEN** ele é delimitado por uma borda de 1px, sem `box-shadow`

### Requirement: Contraste AA em ambos os temas
Todo par texto/fundo SHALL atingir no mínimo 4.5:1 para texto normal e 3:1 para texto grande e elementos de interface, nos temas claro e escuro.

#### Scenario: Texto secundário no tema claro
- **WHEN** o token `text-muted` é usado sobre `surface` no tema claro
- **THEN** a razão de contraste é de ao menos 4.5:1

#### Scenario: Verificação automatizada
- **WHEN** a suíte de verificação de contraste roda sobre todas as combinações declaradas de token
- **THEN** nenhuma combinação fica abaixo do mínimo AA

### Requirement: Persistência da preferência de tema
O sistema SHALL respeitar a preferência de tema do sistema operacional por padrão e permitir sobreposição manual, guardada apenas no navegador do usuário.

#### Scenario: Primeira visita
- **WHEN** o usuário abre a aplicação pela primeira vez com o sistema em modo escuro
- **THEN** o tema escuro é aplicado sem flash de tema claro

#### Scenario: Escolha manual
- **WHEN** o usuário alterna o tema pelo controle no header
- **THEN** a escolha persiste entre recarregamentos, armazenada localmente no navegador
