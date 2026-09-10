# data-format-conversion Specification

## Purpose
Formatação de conteúdo estruturado: beautify e minify de JSON e XML, com indentação configurável, erros de parsing localizados e preservação da ordem das chaves.

## Requirements
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

### Requirement: Erros de parsing com localização
Erros de parsing SHALL indicar linha e coluna, ou o caminho do nó, quando o formato permitir determiná-los.

#### Scenario: JSON inválido
- **WHEN** a entrada JSON tem uma vírgula sobrando
- **THEN** o erro inline informa a linha e a coluna do problema

#### Scenario: XML não fechado
- **WHEN** uma tag XML não é fechada
- **THEN** o erro inline nomeia a tag e a posição onde o parsing falhou

### Requirement: Preservação da ordem de chaves
O sistema SHALL preservar a ordem original das chaves de objetos ao formatar e minificar, salvo quando o usuário pedir ordenação explícita pela opção de ordenar chaves.

#### Scenario: Ordem preservada
- **WHEN** um JSON com chaves em ordem não alfabética é formatado com a opção de ordenar chaves desligada
- **THEN** as chaves aparecem na saída na mesma ordem da entrada

#### Scenario: Ordenação opcional
- **WHEN** a opção de ordenar chaves é ativada
- **THEN** a saída apresenta as chaves em ordem alfabética em todos os níveis
