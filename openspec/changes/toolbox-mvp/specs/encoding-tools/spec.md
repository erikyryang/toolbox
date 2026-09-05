## ADDED Requirements

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

### Requirement: Hex
O sistema SHALL codificar e decodificar hexadecimal, com escolha de caixa na saída e tolerância a espaços e quebras de linha na entrada.

#### Scenario: Codificação
- **WHEN** a entrada é `AB` em caixa baixa
- **THEN** a saída é `4142` com dígitos em caixa baixa

#### Scenario: Entrada com separadores
- **WHEN** a entrada de decodificação é `41 42\n43`
- **THEN** a saída é `ABC`

#### Scenario: Número ímpar de dígitos
- **WHEN** a entrada de decodificação tem quantidade ímpar de dígitos hexadecimais
- **THEN** um erro inline informa que a entrada está incompleta

### Requirement: URL e percent-encoding
O sistema SHALL codificar e decodificar percent-encoding, distinguindo codificação de componente e de URI completa.

#### Scenario: Codificação de componente
- **WHEN** a entrada é `a b&c=d` no modo componente
- **THEN** a saída é `a%20b%26c%3Dd`

#### Scenario: Sequência percentual inválida
- **WHEN** a entrada de decodificação contém `%zz`
- **THEN** um erro inline aponta a sequência inválida

### Requirement: HTML entities
O sistema SHALL escapar e desescapar entidades HTML, cobrindo as entidades nomeadas e as referências numéricas decimais e hexadecimais.

#### Scenario: Escape
- **WHEN** a entrada é `<a href="x">`
- **THEN** a saída é `&lt;a href=&quot;x&quot;&gt;`

#### Scenario: Unescape de referência numérica
- **WHEN** a entrada é `&#233;` ou `&#xE9;`
- **THEN** a saída é `é`

### Requirement: Decodificação de JWT
O sistema SHALL decodificar JSON Web Tokens exibindo header e payload formatados, e SHALL indicar claims temporais expirados. A assinatura MUST NOT ser verificada nem apresentada como verificada.

#### Scenario: Token válido
- **WHEN** o usuário cola um JWT bem formado
- **THEN** header e payload são exibidos como JSON formatado, com `iat`, `exp` e `nbf` também em data legível

#### Scenario: Token expirado
- **WHEN** o `exp` do token é anterior ao instante atual
- **THEN** a interface sinaliza que o token está expirado

#### Scenario: Assinatura não verificada
- **WHEN** um token é decodificado
- **THEN** a interface deixa explícito que a assinatura não foi verificada

#### Scenario: Formato inválido
- **WHEN** a entrada não tem três segmentos separados por ponto
- **THEN** um erro inline informa que o token está malformado

### Requirement: Unicode escape
O sistema SHALL converter entre texto e sequências de escape Unicode, suportando os estilos `\uXXXX`, `\u{XXXXX}` e `\xXX`, com tratamento correto de pares substitutos.

#### Scenario: Escape de caractere fora do BMP
- **WHEN** a entrada é `😀` no estilo `\uXXXX`
- **THEN** a saída é o par substituto `\ud83d\ude00`

#### Scenario: Unescape
- **WHEN** a entrada é `\u00e9`
- **THEN** a saída é `é`

### Requirement: Punycode
O sistema SHALL converter nomes de domínio entre Unicode e Punycode (IDNA), operando por rótulo.

#### Scenario: Para ASCII
- **WHEN** a entrada é `café.example`
- **THEN** a saída é `xn--caf-dma.example`

#### Scenario: Para Unicode
- **WHEN** a entrada é `xn--caf-dma.example`
- **THEN** a saída é `café.example`

### Requirement: Unix timestamp
O sistema SHALL converter entre timestamp Unix e data legível, aceitando segundos e milissegundos, e exibindo o resultado em UTC e no fuso local do navegador.

#### Scenario: Timestamp para data
- **WHEN** a entrada é `1700000000`
- **THEN** a saída mostra a data correspondente em UTC e no fuso local

#### Scenario: Detecção de milissegundos
- **WHEN** a entrada tem 13 dígitos
- **THEN** o valor é interpretado como milissegundos, com a unidade detectada indicada na interface

#### Scenario: Instante atual
- **WHEN** o usuário aciona a ação de instante atual
- **THEN** o timestamp corrente é inserido na entrada

### Requirement: Query string
O sistema SHALL converter entre query string e uma representação estruturada, preservando chaves repetidas e permitindo ordenação alfabética opcional.

#### Scenario: Parsing
- **WHEN** a entrada é `a=1&b=2&a=3`
- **THEN** a saída estruturada mostra a chave `a` com os valores `1` e `3`, e `b` com `2`

#### Scenario: Serialização
- **WHEN** a representação estruturada é editada e a direção é invertida
- **THEN** a query string resultante mantém as chaves repetidas

### Requirement: Conversão de charset UTF-8 e Latin-1
O sistema SHALL converter conteúdo entre UTF-8 e ISO-8859-1 (Latin-1), sinalizando caracteres não representáveis.

#### Scenario: Caractere fora do Latin-1
- **WHEN** a entrada UTF-8 contém `€` e o destino é Latin-1
- **THEN** a interface sinaliza que o caractere não é representável e indica sua posição

#### Scenario: Mojibake
- **WHEN** bytes Latin-1 são interpretados como UTF-8 e a conversão é aplicada na direção correta
- **THEN** o texto original é recuperado

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

### Requirement: Conversão PEM e DER
O sistema SHALL converter entre PEM e DER, preservando o rótulo do bloco PEM e permitindo escolhê-lo na direção DER→PEM.

#### Scenario: PEM para DER
- **WHEN** a entrada é um bloco PEM válido
- **THEN** a saída são os bytes DER correspondentes, oferecidos para download

#### Scenario: DER para PEM
- **WHEN** bytes DER são fornecidos e o rótulo `CERTIFICATE` é escolhido
- **THEN** a saída é um bloco PEM com as linhas de cabeçalho e rodapé corretas e quebra em 64 colunas

#### Scenario: PEM malformado
- **WHEN** o bloco PEM tem cabeçalho e rodapé incompatíveis
- **THEN** um erro inline descreve a incompatibilidade

### Requirement: Parser ASN.1
O sistema SHALL fazer o parsing de estruturas ASN.1 codificadas em DER, exibindo a hierarquia de tags com classe, tamanho e valor decodificado quando aplicável.

#### Scenario: Estrutura aninhada
- **WHEN** um certificado DER é fornecido
- **THEN** a saída mostra a hierarquia de SEQUENCE, SET e tipos primitivos, indentada por nível

#### Scenario: OIDs conhecidos
- **WHEN** a estrutura contém um OBJECT IDENTIFIER reconhecido
- **THEN** o nome legível do OID é exibido ao lado da notação numérica

#### Scenario: Bytes truncados
- **WHEN** a estrutura termina antes do tamanho declarado em uma tag
- **THEN** um erro inline indica o deslocamento em que o parsing falhou
