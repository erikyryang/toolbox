## ADDED Requirements

### Requirement: Rota dedicada por operação
Cada operação SHALL ter sua própria rota estável e indexável, com título, descrição e metadados de SEO próprios. Operações MUST NOT ser empilhadas como abas dentro de uma mesma página.

#### Scenario: Acesso direto por URL
- **WHEN** o usuário acessa `/base64` diretamente
- **THEN** a tela da operação Base64 é renderizada, sem seleção adicional

#### Scenario: Metadados por rota
- **WHEN** um rastreador busca a rota de uma operação
- **THEN** a resposta contém `<title>` e `<meta name="description">` específicos daquela operação

#### Scenario: Sem abas internas
- **WHEN** uma tela de operação é renderizada
- **THEN** ela apresenta uma única operação, sem abas que troquem para outras operações

### Requirement: Header fino com navegação e tema
O sistema SHALL apresentar um header fino contendo o nome "toolbox", um seletor de operações e um alternador de tema.

#### Scenario: Navegação entre operações
- **WHEN** o usuário abre o seletor de operações e escolhe outra operação
- **THEN** o navegador vai para a rota correspondente

#### Scenario: Alternância de tema
- **WHEN** o usuário aciona o alternador de tema
- **THEN** o tema muda imediatamente, sem recarregar a página

### Requirement: Cabeçalho de operação com título serifado
Cada tela de operação SHALL exibir, no topo, um título em fonte serifada e um subtítulo curto em cinza descrevendo a operação.

#### Scenario: Topo da tela
- **WHEN** a tela de uma operação é renderizada
- **THEN** o título aparece em serifada e o subtítulo, abaixo dele, em texto secundário

### Requirement: Dois painéis com inversão
O sistema SHALL apresentar entrada e saída em dois painéis lado a lado em fonte mono. Operações reversíveis SHALL oferecer um botão de inversão entre os painéis.

#### Scenario: Inverter direção
- **WHEN** o usuário aciona o botão de inversão em uma operação reversível
- **THEN** a direção da operação é trocada, o conteúdo de saída passa a ser a entrada e o resultado é recalculado

#### Scenario: Operação não reversível
- **WHEN** a operação não admite inversão (ex.: decodificação de JWT)
- **THEN** o botão de inversão não é exibido

#### Scenario: Empilhamento em tela pequena
- **WHEN** a largura da viewport fica abaixo do ponto de quebra
- **THEN** os painéis empilham verticalmente, entrada acima e saída abaixo

### Requirement: Conversão em tempo real
O sistema SHALL recalcular a saída automaticamente conforme a entrada ou as opções mudam. MUST NOT existir botão "converter".

#### Scenario: Digitação na entrada
- **WHEN** o usuário digita no painel de entrada
- **THEN** a saída é atualizada sem nenhuma ação adicional

#### Scenario: Mudança de opção
- **WHEN** o usuário altera uma opção avançada
- **THEN** a saída é recalculada imediatamente com a nova opção

#### Scenario: Ações disponíveis
- **WHEN** existe uma saída válida
- **THEN** as únicas ações oferecidas sobre ela são copiar e baixar

### Requirement: Opções avançadas atrás de disclosure
Opções avançadas (nível de compressão, variantes de codificação, parâmetros de formato) SHALL ficar recolhidas atrás de um disclosure e MUST NOT ser exibidas de imediato.

#### Scenario: Estado inicial
- **WHEN** a tela de uma operação carrega
- **THEN** as opções avançadas estão recolhidas, com os padrões aplicados

#### Scenario: Expansão
- **WHEN** o usuário aciona o disclosure
- **THEN** as opções avançadas aparecem e permanecem visíveis enquanto a operação estiver aberta

### Requirement: Erros em texto simples inline
Erros SHALL ser exibidos como texto simples abaixo do campo que os originou, descrevendo a causa. Toasts, modais e alertas MUST NOT ser usados para erros de operação.

#### Scenario: Entrada inválida
- **WHEN** o usuário cola uma string Base64 malformada
- **THEN** uma mensagem em texto simples aparece abaixo do painel de entrada explicando o problema

#### Scenario: Recuperação
- **WHEN** a entrada é corrigida
- **THEN** a mensagem de erro desaparece e a saída volta a ser calculada

### Requirement: Indicador de privacidade fiel ao local de processamento
O rodapé de cada operação SHALL exibir um aviso discreto de privacidade que reflita corretamente onde o processamento ocorreu.

#### Scenario: Processamento local
- **WHEN** a operação foi executada inteiramente no navegador
- **THEN** o rodapé exibe "processado no seu navegador, nada é enviado"

#### Scenario: Processamento no backend
- **WHEN** a operação foi encaminhada ao backend
- **THEN** o rodapé indica que o arquivo foi enviado ao servidor, informa o motivo do encaminhamento e afirma que nada foi armazenado

#### Scenario: Aviso antes do envio
- **WHEN** a entrada escolhida exigirá o backend
- **THEN** o indicador reflete esse destino antes que o envio aconteça

### Requirement: Largura máxima e espaçamento generoso
O conteúdo SHALL ser limitado a aproximadamente 1100px de largura, com espaçamento amplo entre blocos.

#### Scenario: Tela larga
- **WHEN** a viewport é mais larga que 1100px
- **THEN** o conteúdo permanece centralizado dentro da largura máxima

### Requirement: Acessibilidade por teclado
Todos os controles interativos SHALL ser alcançáveis e operáveis por teclado, com indicador de foco visível e ordem de tabulação coerente com a leitura.

#### Scenario: Percurso por teclado
- **WHEN** o usuário navega a tela apenas com Tab e Shift+Tab
- **THEN** todos os controles recebem foco, com indicador visível em cada um

#### Scenario: Disclosure por teclado
- **WHEN** o disclosure de opções avançadas recebe foco e o usuário pressiona Enter ou Espaço
- **THEN** a seção expande e o estado é anunciado por leitores de tela
