## REMOVED Requirements

### Requirement: Conversão entre JSON, YAML, XML e CSV
**Reason**: A conversão entre formatos saiu do produto em `7939fd8`. O grupo Formato entrega beautify e minify de JSON e XML; não há rota, motor nem dependência de YAML ou CSV. Converter entre formatos com semânticas diferentes exige decidir por quem usa — como representar atributos XML em JSON, como achatar aninhamento em CSV — e cada decisão dessas é um comportamento a manter e explicar. O beautify não tem essa ambiguidade: entra e sai o mesmo documento.
**Migration**: Nenhuma. As rotas de conversão deixaram de ser geradas.

### Requirement: Aviso de conversão com perda
**Reason**: O aviso existia por causa da conversão entre formatos. Sem conversão, não há perda a avisar: beautify e minify preservam o documento.
**Migration**: Nenhuma.

### Requirement: Opções de CSV
**Reason**: Não há operação de CSV no catálogo.
**Migration**: Nenhuma.

## MODIFIED Requirements

### Requirement: Preservação da ordem de chaves
O sistema SHALL preservar a ordem original das chaves de objetos ao formatar e minificar, salvo quando o usuário pedir ordenação explícita pela opção de ordenar chaves.

#### Scenario: Ordem preservada
- **WHEN** um JSON com chaves em ordem não alfabética é formatado com a opção de ordenar chaves desligada
- **THEN** as chaves aparecem na saída na mesma ordem da entrada

#### Scenario: Ordenação opcional
- **WHEN** a opção de ordenar chaves é ativada
- **THEN** a saída apresenta as chaves em ordem alfabética em todos os níveis
