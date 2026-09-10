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

### Requirement: Sufixo de unidade na entrada vence a seleção
Quando o valor da entrada traz uma unidade escrita junto — `1.5 GB`, `900mb`,
`64 KiB` —, essa unidade SHALL prevalecer sobre a unidade de origem
selecionada, para aquela linha. O reconhecimento MUST ignorar diferença de
caixa e espaço entre número e unidade, e MUST aceitar as formas IEC (`KiB`,
`MiB`, `GiB`, `TiB`) como sinônimos do degrau correspondente.

#### Scenario: Sufixo sobrepõe a seleção
- **WHEN** a unidade de origem selecionada é MB e o usuário digita `2 GB`
- **THEN** a conversão parte de GB, e não de MB

#### Scenario: Forma IEC reconhecida
- **WHEN** o usuário digita `64 KiB`
- **THEN** o valor é lido como 64 no degrau KB

#### Scenario: Valor sem sufixo
- **WHEN** o usuário digita apenas `2048`
- **THEN** a conversão parte da unidade de origem selecionada

### Requirement: Uma linha por valor
A entrada SHALL aceitar várias linhas e converter cada uma independentemente,
produzindo uma linha de saída por linha de entrada, na mesma ordem. Linhas em
branco SHALL ser preservadas como linhas em branco, para que a saída continue
alinhada com a entrada.

#### Scenario: Coluna de valores
- **WHEN** o usuário cola três valores, um por linha
- **THEN** a saída tem três linhas, cada uma com a conversão da linha correspondente

#### Scenario: Linha em branco
- **WHEN** a entrada tem uma linha em branco entre dois valores
- **THEN** a saída tem uma linha em branco na mesma posição

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

### Requirement: Entrada inválida em erro legível
Uma linha que não seja um número reconhecível SHALL produzir erro de operação
com mensagem legível, identificando a linha problemática. O motor MUST NOT
lançar exceção crua nem devolver `NaN` na saída. Entrada vazia SHALL produzir
saída vazia, sem erro.

#### Scenario: Texto no lugar do número
- **WHEN** o usuário digita `mais ou menos dois`
- **THEN** a operação reporta erro legível abaixo do campo de entrada, e a saída fica vazia

#### Scenario: Unidade desconhecida
- **WHEN** o usuário digita `5 parsecs`
- **THEN** a operação reporta erro legível informando que a unidade não é reconhecida

#### Scenario: Entrada vazia
- **WHEN** o campo de entrada está vazio
- **THEN** a saída é vazia e nenhum erro é exibido
