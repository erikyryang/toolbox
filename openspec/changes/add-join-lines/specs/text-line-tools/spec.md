## ADDED Requirements

### Requirement: Junção de linhas em uma linha só
O sistema SHALL oferecer, no grupo Formato, uma operação que recebe texto livre e devolve o mesmo conteúdo em uma única linha, unindo as linhas da entrada pelo separador escolhido. A operação SHALL ser executada integralmente no navegador, sem emitir nenhuma requisição carregando o conteúdo.

#### Scenario: Três linhas viram uma
- **WHEN** a entrada tem `nome`, `idade` e `email` em três linhas e o separador é vírgula + espaço
- **THEN** a saída é `nome, idade, email` em uma única linha

#### Scenario: Linha única não muda
- **WHEN** a entrada não contém nenhuma quebra de linha
- **THEN** a saída é igual à entrada

#### Scenario: Entrada vazia
- **WHEN** a entrada está vazia
- **THEN** a saída é vazia e nenhum erro é exibido

#### Scenario: Nenhuma requisição de rede
- **WHEN** a junção é executada
- **THEN** nenhuma requisição carregando o conteúdo é emitida e o rodapé indica processamento no navegador

### Requirement: Escolha do separador
O sistema SHALL permitir escolher o separador inserido entre as linhas a partir de uma lista fixa de presets: nada, espaço, vírgula, vírgula + espaço, ponto e vírgula, pipe e tabulação. O padrão SHALL ser vírgula + espaço. O separador escolhido SHALL ser inserido apenas *entre* linhas, nunca antes da primeira nem depois da última.

#### Scenario: Separador vazio
- **WHEN** o separador escolhido é "nada" e a entrada tem `abc` e `def` em duas linhas
- **THEN** a saída é `abcdef`

#### Scenario: Separador de tabulação
- **WHEN** o separador escolhido é tabulação e a entrada tem duas linhas
- **THEN** a saída tem exatamente um caractere de tabulação entre as duas, e nenhum nas pontas

#### Scenario: Separador não é adicionado nas pontas
- **WHEN** qualquer separador é escolhido
- **THEN** a saída não começa nem termina com o separador

### Requirement: Aparo de espaços por linha
O sistema SHALL oferecer a opção de aparar os espaços em branco no início e no fim de cada linha antes da junção, ligada por padrão. Com a opção desligada, cada linha SHALL entrar na saída exatamente como está na entrada.

#### Scenario: Aparo ligado
- **WHEN** a entrada tem `  nome  ` e `  idade` em duas linhas, com aparo ligado e separador vírgula + espaço
- **THEN** a saída é `nome, idade`

#### Scenario: Aparo desligado preserva os espaços
- **WHEN** a mesma entrada é processada com o aparo desligado
- **THEN** os espaços originais de cada linha aparecem na saída

### Requirement: Descarte de linhas vazias
O sistema SHALL oferecer a opção de descartar as linhas vazias antes da junção, ligada por padrão. Com o aparo ligado, uma linha composta apenas de espaços SHALL contar como vazia. Com a opção desligada, cada linha vazia SHALL produzir um separador na saída.

#### Scenario: Linha em branco no meio da lista
- **WHEN** a entrada tem `a`, uma linha vazia e `b`, com descarte ligado e separador vírgula
- **THEN** a saída é `a,b`

#### Scenario: Quebra final da entrada não vira separador solto
- **WHEN** a entrada termina com uma quebra de linha e o descarte está ligado
- **THEN** a saída não termina com o separador

#### Scenario: Descarte desligado preserva os vazios
- **WHEN** a mesma entrada `a`, vazia, `b` é processada com o descarte desligado e separador vírgula
- **THEN** a saída é `a,,b`

### Requirement: Finais de linha reconhecidos
O sistema SHALL reconhecer `\n`, `\r\n` e `\r` como quebras de linha, e a saída SHALL não conter nenhum caractere de quebra remanescente.

#### Scenario: Texto com finais de linha do Windows
- **WHEN** a entrada usa `\r\n` entre as linhas
- **THEN** a saída não contém `\r` nem `\n`

#### Scenario: Mistura de finais de linha
- **WHEN** a entrada mistura `\n` e `\r\n`
- **THEN** todas as quebras são tratadas igualmente e a saída é uma única linha

### Requirement: Operação de sentido único
A operação SHALL declarar apenas o sentido direto, sem inverso. A interface SHALL, nesse caso, omitir o seletor de sentido, e o restante do workspace — conversão em tempo real, opções avançadas, copiar, baixar e o rodapé de privacidade — SHALL continuar disponível.

#### Scenario: Seletor de sentido ausente
- **WHEN** a rota da operação é aberta
- **THEN** nenhum controle de inversão é renderizado

#### Scenario: Ações do workspace preservadas
- **WHEN** a rota da operação é aberta
- **THEN** copiar, baixar, opções avançadas e o rodapé de privacidade estão presentes e funcionais

### Requirement: Descoberta pela busca
A operação SHALL ser encontrada pela busca da página inicial pelos termos que descrevem a tarefa, e não apenas pelo seu nome — em português e em inglês.

#### Scenario: Busca em inglês
- **WHEN** a busca recebe `join lines`
- **THEN** a operação aparece nos resultados

#### Scenario: Busca pela tarefa
- **WHEN** a busca recebe `remover quebras` ou `uma linha`
- **THEN** a operação aparece nos resultados

### Requirement: Interface nos dois idiomas
A operação SHALL ter título, subtítulo, descrição, rótulos de sentido e rótulos de opções — incluindo cada escolha de separador — em português e em inglês, seguindo o seletor de idioma do produto.

#### Scenario: Idioma inglês
- **WHEN** o idioma selecionado é inglês
- **THEN** título, subtítulo, rótulos e as escolhas do separador aparecem em inglês, sem cair no texto em português
