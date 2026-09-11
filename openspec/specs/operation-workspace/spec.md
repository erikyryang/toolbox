# operation-workspace Specification

## Purpose
A estrutura das telas de operação: rota dedicada, navegação responsiva, painéis de texto ou valor com sentidos quando aplicáveis, fluxo de arquivos, opções principais e avançadas, erros inline e indicador do local de processamento.
## Requirements
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
O sistema SHALL apresentar um header fino com três dots decorativos à esquerda,
links para o site pessoal e o blog, a aba "toolbox" de retorno à visão geral
e os alternadores de idioma e tema. O toolbox SHALL permanecer marcado como
site atual em todas as suas rotas. Os links externos SHALL acompanhar o idioma
selecionado.

A navegação de operações SHALL aparecer na sidebar em telas largas e em um
menu no header abaixo de 64rem. Os dots SHALL ser ocultados em telas de até
560px; a fila de abas SHALL permitir rolagem horizontal quando necessário.

#### Scenario: Navegação entre operações
- **WHEN** o usuário abre o seletor de operações e escolhe outra operação
- **THEN** o navegador vai para a rota correspondente

#### Scenario: Alternância de tema
- **WHEN** o usuário aciona o alternador de tema
- **THEN** o tema muda imediatamente, sem recarregar a página

#### Scenario: Dots decorativos
- **WHEN** um leitor de tela percorre o header
- **THEN** os três dots não são anunciados, e os links e controles continuam alcançáveis por teclado

#### Scenario: Links externos por idioma
- **WHEN** o idioma selecionado é português
- **THEN** os links pessoais apontam para `/pt/` e `/pt/blog/` em erikyryan.dev.br, enquanto toolbox retorna à visão geral local

#### Scenario: Navegação responsiva
- **WHEN** a viewport fica abaixo de 64rem
- **THEN** o menu do header permite escolher a ferramenta e substitui a sidebar

### Requirement: Dois painéis com inversão
Operações de texto e valor SHALL apresentar entrada e saída em dois painéis em fonte mono. Operações reversíveis SHALL oferecer controles explícitos dos dois sentidos acima dos painéis.

#### Scenario: Inverter direção
- **WHEN** o usuário aciona o botão de inversão em uma operação reversível
- **THEN** a direção da operação é trocada, o conteúdo de saída passa a ser a entrada e o resultado é recalculado

#### Scenario: Operação não reversível
- **WHEN** a operação não admite inversão (ex.: juntar linhas)
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
- **THEN** a saída de texto oferece copiar e baixar, enquanto a saída numérica oferece copiar

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

### Requirement: Opções principais fora do disclosure
Uma operação SHALL poder declarar quais das suas opções são o controle
principal da operação, e não um ajuste fino. Opções assim declaradas SHALL ser
exibidas de imediato, acima dos painéis, e MUST NOT ficar atrás do disclosure
de opções avançadas.

O disclosure continua existindo para o restante. Quando nenhuma opção sobra
para ele, o disclosure MUST NOT ser renderizado — um controle vazio é ruído.

Esta é a distinção que o requisito de opções avançadas já pressupunha ao se
limitar a nível de compressão, variantes de codificação e parâmetros de
formato: existem operações cuja opção *é* a pergunta que o usuário veio
fazer. Esconder a base de um conversor de unidades atrás de "opções
avançadas" esconde a própria ferramenta.

#### Scenario: Operação com opção principal
- **WHEN** a tela de uma operação que declara opções principais carrega
- **THEN** essas opções aparecem acima dos painéis, sem nenhuma interação prévia

#### Scenario: Restante continua recolhido
- **WHEN** a operação declara opções principais e também opções não declaradas
- **THEN** as não declaradas continuam recolhidas atrás do disclosure

#### Scenario: Disclosure sem conteúdo
- **WHEN** todas as opções de uma operação são principais
- **THEN** o disclosure de opções avançadas não é renderizado

#### Scenario: Operação sem opção principal
- **WHEN** a operação não declara nenhuma opção principal
- **THEN** todas as suas opções continuam atrás do disclosure, como antes

### Requirement: Painel de valor numérico
Uma operação SHALL poder declarar que sua entrada é um valor, e não um texto.
Nesse caso os dois painéis SHALL ser campos de uma única linha em vez de áreas
de texto: o de entrada aceitando apenas caractere numérico, o de saída somente
leitura.

O painel numérico SHALL manter tudo o que o painel de texto oferece e continua
fazendo sentido para um valor — rótulo, ação de limpar, ação de copiar, estado
de inválido e vínculo com a mensagem de erro. A ação de baixar MUST NOT
aparecer: um arquivo com um número dentro não é entrega de nada.

Em dispositivo móvel, o campo SHALL solicitar o teclado numérico.

#### Scenario: Operação de valor
- **WHEN** a tela de uma operação que declara entrada numérica carrega
- **THEN** entrada e saída são campos de uma linha, e não áreas de texto redimensionáveis

#### Scenario: Caractere não numérico
- **WHEN** o usuário digita uma letra no campo de entrada numérica
- **THEN** o caractere não é inserido, e nenhum erro é exibido

#### Scenario: Ausência da ação de baixar
- **WHEN** o painel de saída de uma operação numérica é renderizado
- **THEN** ele oferece copiar, e não oferece baixar

#### Scenario: Operação de texto não muda
- **WHEN** a operação não declara entrada numérica
- **THEN** seus painéis continuam sendo áreas de texto multilinha, como antes

### Requirement: Cabeçalho de operação com linha de prompt
Cada tela de operação SHALL exibir, no topo e nesta ordem: uma linha de prompt
`you@toolbox:~$ <slug>` em texto secundário e tamanho reduzido, o título da
operação em mono peso 700 com tracking negativo, e um subtítulo curto em texto
secundário descrevendo a operação.

A linha de prompt é decorativa e MUST ser marcada com `aria-hidden`, já que o
slug que ela mostra já está no título e na URL.

#### Scenario: Topo da tela
- **WHEN** a tela de uma operação é renderizada
- **THEN** a linha de prompt aparece acima do título, o título em mono peso 700 e o subtítulo abaixo dele em texto secundário

#### Scenario: Prompt fora da leitura assistiva
- **WHEN** um leitor de tela percorre o topo da tela
- **THEN** ele anuncia o título e o subtítulo, e não a linha de prompt
