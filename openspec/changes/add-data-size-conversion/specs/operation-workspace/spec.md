## ADDED Requirements

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
