# encoding-tools Specification

## Purpose
Codificação e decodificação de texto entre bases — Base64, Base32 e Base58 —, executadas integralmente no navegador.

## Requirements
### Requirement: Execução integralmente no navegador
Todas as operações de codificação e decodificação SHALL ser executadas no navegador do usuário. Nenhuma entrada dessas operações MUST ser transmitida ao backend ou a qualquer serviço externo.

#### Scenario: Nenhuma requisição de rede
- **WHEN** o usuário executa qualquer operação de encoding ou decoding
- **THEN** nenhuma requisição de rede carregando a entrada ou a saída é emitida

#### Scenario: Funcionamento offline
- **WHEN** a página já está carregada e a conexão é perdida
- **THEN** as operações de encoding continuam funcionando normalmente

### Requirement: Base64 padrão e URL-safe
O sistema SHALL codificar e decodificar Base64 no alfabeto padrão (RFC 4648 §4) e no alfabeto URL-safe (§5), com padding opcional.

#### Scenario: Codificação padrão
- **WHEN** a entrada é `toolbox` no modo padrão
- **THEN** a saída é `dG9vbGJveA==`

#### Scenario: URL-safe sem padding
- **WHEN** o alfabeto URL-safe é selecionado com padding desativado
- **THEN** a saída usa `-` e `_` no lugar de `+` e `/` e não contém `=`

#### Scenario: Entrada inválida
- **WHEN** a entrada de decodificação contém caracteres fora do alfabeto selecionado
- **THEN** uma mensagem de erro inline identifica o caractere inválido e nenhuma saída é produzida

### Requirement: Base32
O sistema SHALL codificar e decodificar Base32 (RFC 4648), com padding opcional.

#### Scenario: Codificação
- **WHEN** a entrada é `toolbox`
- **THEN** a saída é a representação Base32 correspondente, com padding conforme a opção escolhida

### Requirement: Base58
O sistema SHALL codificar e decodificar Base58 no alfabeto Bitcoin.

#### Scenario: Ida e volta
- **WHEN** uma entrada arbitrária é codificada e o resultado é decodificado
- **THEN** os bytes originais são recuperados exatamente

#### Scenario: Caractere ambíguo
- **WHEN** a entrada de decodificação contém `0`, `O`, `I` ou `l`
- **THEN** um erro inline informa que o caractere não pertence ao alfabeto Base58
