## ADDED Requirements

### Requirement: Conversão entre JSON, YAML, XML e CSV
O sistema SHALL converter conteúdo entre JSON, YAML, XML e CSV em todas as direções admissíveis, com a conversão executada no navegador.

#### Scenario: JSON para YAML
- **WHEN** um documento JSON válido é fornecido na operação JSON→YAML
- **THEN** a saída é o YAML equivalente, com a mesma estrutura de chaves e valores

#### Scenario: YAML para JSON
- **WHEN** um documento YAML válido é fornecido
- **THEN** a saída é o JSON equivalente

#### Scenario: Ida e volta preserva estrutura
- **WHEN** um documento JSON é convertido para YAML e o resultado é convertido de volta para JSON
- **THEN** a estrutura de dados resultante é equivalente à original

#### Scenario: Nenhuma requisição de rede
- **WHEN** qualquer conversão de formato é executada
- **THEN** nenhuma requisição carregando o conteúdo é emitida

### Requirement: Aviso de conversão com perda
Quando o formato de destino não é capaz de representar toda a semântica do formato de origem, o sistema SHALL produzir a melhor conversão possível e SHALL avisar explicitamente qual informação foi perdida ou normalizada.

#### Scenario: Âncoras YAML
- **WHEN** o YAML de entrada usa âncoras e aliases e o destino é JSON
- **THEN** os aliases são expandidos e um aviso informa que âncoras não são representáveis em JSON

#### Scenario: Atributos XML
- **WHEN** o XML de entrada tem atributos e o destino é JSON
- **THEN** os atributos são mapeados sob uma convenção declarada na interface, indicada em um aviso

#### Scenario: CSV a partir de estrutura aninhada
- **WHEN** o JSON de entrada tem objetos aninhados e o destino é CSV
- **THEN** ou os caminhos são achatados em colunas com aviso, ou a operação falha com erro inline explicando por que a estrutura não é tabular

### Requirement: Beautify e minify
O sistema SHALL oferecer formatação legível e minificação para JSON e XML, com escolha de indentação.

#### Scenario: Beautify de JSON
- **WHEN** um JSON minificado é fornecido com indentação de 2 espaços
- **THEN** a saída é o mesmo documento formatado com 2 espaços por nível

#### Scenario: Minify de JSON
- **WHEN** um JSON formatado é fornecido na operação de minificação
- **THEN** a saída não contém espaços em branco fora de strings, e o documento continua semanticamente idêntico

#### Scenario: Indentação configurável
- **WHEN** o usuário altera a indentação para tabulação
- **THEN** a saída é reformatada imediatamente com tabulações

### Requirement: Opções de CSV
O sistema SHALL permitir configurar delimitador, presença de cabeçalho e caractere de citação nas operações que envolvem CSV.

#### Scenario: Delimitador ponto e vírgula
- **WHEN** o delimitador é definido como `;`
- **THEN** o CSV é interpretado e gerado usando `;` como separador de campos

#### Scenario: Sem linha de cabeçalho
- **WHEN** a opção de cabeçalho é desativada na conversão CSV→JSON
- **THEN** cada linha vira um array de valores, em vez de um objeto com chaves

#### Scenario: Campo com delimitador embutido
- **WHEN** um valor contém o delimitador ou uma quebra de linha
- **THEN** o campo é citado corretamente na saída e reinterpretado sem perda na volta

### Requirement: Erros de parsing com localização
Erros de parsing SHALL indicar linha e coluna, ou o caminho do nó, quando o formato permitir determiná-los.

#### Scenario: JSON inválido
- **WHEN** a entrada JSON tem uma vírgula sobrando
- **THEN** o erro inline informa a linha e a coluna do problema

#### Scenario: XML não fechado
- **WHEN** uma tag XML não é fechada
- **THEN** o erro inline nomeia a tag e a posição onde o parsing falhou

### Requirement: Preservação da ordem de chaves
O sistema SHALL preservar a ordem original das chaves de objetos durante as conversões, salvo quando o usuário pedir ordenação explícita.

#### Scenario: Ordem preservada
- **WHEN** um JSON com chaves em ordem não alfabética é convertido para YAML
- **THEN** as chaves aparecem na saída na mesma ordem da entrada

#### Scenario: Ordenação opcional
- **WHEN** a opção de ordenar chaves é ativada
- **THEN** a saída apresenta as chaves em ordem alfabética em todos os níveis
