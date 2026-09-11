## ADDED Requirements

### Requirement: Conversão entre unidades de tamanho de dados
O sistema SHALL oferecer, no grupo Unidades, uma operação que converte um
valor numérico entre bit, byte, KB, MB, GB e TB. A operação SHALL ser
executada integralmente no navegador, sem emitir nenhuma requisição carregando
o valor.

A relação entre bit e byte é fixa em 8 bits por byte, em qualquer base. Os
degraus acima de byte — KB, MB, GB e TB — SHALL escalar pela base escolhida,
elevada à posição do degrau.

#### Scenario: Byte para bit
- **WHEN** o usuário converte `1` de byte para bit
- **THEN** a saída é `8`, em qualquer uma das duas bases

#### Scenario: Degrau acima de byte
- **WHEN** o usuário converte `1` de GB para MB na base 1000
- **THEN** a saída é `1000`

#### Scenario: Valor fracionário
- **WHEN** o usuário converte `1.5` de GB para MB na base 1000
- **THEN** a saída é `1500`

### Requirement: Campo de valor estritamente numérico
A entrada SHALL ser um campo de uma única linha que aceita apenas número:
dígitos, um separador decimal — ponto ou vírgula — e um sinal inicial.
Qualquer outro caractere MUST ser recusado no momento da digitação, e não
depois, por mensagem de erro.

A saída SHALL ser um campo de uma única linha, somente leitura, no mesmo
formato. Nem entrada nem saída MUST aceitar múltiplas linhas.

A unidade de origem vem exclusivamente do seletor. O campo MUST NOT
interpretar unidade escrita junto do valor, porque não há como escrevê-la.

#### Scenario: Letra recusada na digitação
- **WHEN** o usuário digita `1.5 GB` no campo de valor
- **THEN** o campo retém `1.5` e descarta os caracteres não numéricos, sem exibir erro

#### Scenario: Vírgula como separador decimal
- **WHEN** o usuário digita `1,5`
- **THEN** o valor é aceito e convertido como um e meio

#### Scenario: Campo de uma linha
- **WHEN** o usuário tenta inserir uma quebra de linha no campo de valor
- **THEN** o campo permanece com uma única linha

#### Scenario: Saída não editável
- **WHEN** o usuário tenta digitar no campo de resultado
- **THEN** o conteúdo não muda, e continua sendo o resultado da conversão

### Requirement: Base escolhida explicitamente
A operação SHALL oferecer a base como opção de dois valores — 1000 (decimal,
SI) e 1024 (binária, IEC) — e MUST NOT adivinhar qual usar. A base padrão é
1024, que é a que o sistema operacional reporta e a origem mais comum da
confusão que a ferramenta resolve.

A saída SHALL declarar, como nota, qual convenção produziu aquele número e
qual é o nome IEC do degrau usado, para que o valor possa ser conferido fora
da ferramenta.

#### Scenario: Mesma conversão nas duas bases
- **WHEN** o usuário converte `1` de TB para GB
- **THEN** a saída é `1000` na base 1000 e `1024` na base 1024

#### Scenario: Nota de convenção
- **WHEN** uma conversão em base 1024 usa o degrau GB
- **THEN** a nota informa que a base binária foi aplicada e que aquele degrau equivale a GiB

#### Scenario: Base não altera bit e byte
- **WHEN** o usuário converte entre bit e byte
- **THEN** a escolha de base não altera o resultado

### Requirement: Unidade de origem e destino, com sentido invertível
A operação SHALL oferecer unidade de origem e unidade de destino como opções
de seleção, e SHALL ser reversível: no sentido inverso, origem e destino
trocam de papel.

#### Scenario: Inverter o sentido
- **WHEN** a operação está convertendo de GB para MB e o usuário aciona o controle de inversão
- **THEN** a conversão passa a ser de MB para GB, e a saída anterior vira a entrada

#### Scenario: Origem igual ao destino
- **WHEN** a unidade de origem e a de destino são a mesma
- **THEN** a saída repete o valor da entrada, sem erro

### Requirement: Saída legível e reaproveitável
A saída SHALL usar ponto como separador decimal e MUST NOT usar separador de
milhar, para que o número possa ser colado em outra ferramenta sem limpeza.
Valores SHALL ser apresentados com precisão suficiente para não perder
informação relevante e sem ruído de ponto flutuante — um resultado inteiro
MUST aparecer sem casas decimais.

#### Scenario: Resultado inteiro
- **WHEN** a conversão de `1` GB para MB na base 1024 é calculada
- **THEN** a saída é `1024`, sem casas decimais nem separador de milhar

#### Scenario: Ausência de ruído de ponto flutuante
- **WHEN** a conversão de `0.1` GB para MB na base 1024 é calculada
- **THEN** a saída não traz uma cauda de dígitos vinda da aritmética binária

### Requirement: Valor incompleto não é erro
Enquanto a entrada não for um número completo — vazia, ou apenas um sinal ou
um separador decimal —, a saída SHALL ser vazia e nenhum erro MUST ser
exibido. Digitar é um processo, e cada tecla intermediária não é uma falha.

Um valor que chegue ao motor sem ser um número reconhecível SHALL produzir
erro de operação com mensagem legível. O motor MUST NOT lançar exceção crua
nem devolver `NaN` na saída.

#### Scenario: Campo vazio
- **WHEN** o campo de entrada está vazio
- **THEN** a saída é vazia e nenhum erro é exibido

#### Scenario: Sinal sozinho
- **WHEN** o usuário digitou apenas `-`
- **THEN** a saída é vazia e nenhum erro é exibido

#### Scenario: Separador sozinho
- **WHEN** o usuário digitou apenas `.`
- **THEN** a saída é vazia e nenhum erro é exibido

#### Scenario: Valor irreconhecível
- **WHEN** o motor recebe um valor que não é um número
- **THEN** a operação reporta erro legível abaixo do campo de entrada, e a saída fica vazia
