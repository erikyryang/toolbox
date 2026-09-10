## MODIFIED Requirements

### Requirement: Header fino com navegação e tema
O sistema SHALL apresentar um header fino contendo três *dots* decorativos à
esquerda, o nome "toolbox" como chip de retorno à visão geral, um seletor de
operações e os alternadores de idioma e de tema, ambos como chips.

#### Scenario: Navegação entre operações
- **WHEN** o usuário abre o seletor de operações e escolhe outra operação
- **THEN** o navegador vai para a rota correspondente

#### Scenario: Alternância de tema
- **WHEN** o usuário aciona o alternador de tema
- **THEN** o tema muda imediatamente, sem recarregar a página

#### Scenario: Dots decorativos
- **WHEN** um leitor de tela percorre o header
- **THEN** os três dots não são anunciados, e o primeiro elemento focável é o chip "toolbox"

## REMOVED Requirements

### Requirement: Cabeçalho de operação com título serifado
**Reason**: Não existe mais fonte serifada no sistema — a tipografia passou a
uma família mono única. O requisito descrevia um contraste entre serifada e
mono que a paleta tipográfica atual não pode produzir.

**Migration**: Substituído por "Cabeçalho de operação com linha de prompt",
abaixo. O subtítulo secundário permanece, sem alteração de conteúdo nem de
posição.

## ADDED Requirements

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
