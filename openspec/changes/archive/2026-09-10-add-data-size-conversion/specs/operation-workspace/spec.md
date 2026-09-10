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

### Requirement: Painel de valor numérico
Uma operação SHALL poder declarar que sua entrada é um valor, e não um texto.
Nesse caso os dois painéis SHALL ser campos de uma única linha em vez de áreas
de texto: o de entrada aceitando apenas caractere numérico, o de saída somente
leitura.

O painel numérico SHALL manter tudo o que o painel de texto oferece e continua
fazendo sentido para um valor — rótulo, ação de limpar, ação de copiar, estado
de inválido e vínculo com a mensagem de erro. A ação de baixar MUST NOT
aparecer: um arquivo com um número dentro não é entrega de nada.

Em dispositivo móvel, o campo SHALL solicitar o teclado numérico.

#### Scenario: Operação de valor
- **WHEN** a tela de uma operação que declara entrada numérica carrega
- **THEN** entrada e saída são campos de uma linha, e não áreas de texto redimensionáveis

#### Scenario: Caractere não numérico
- **WHEN** o usuário digita uma letra no campo de entrada numérica
- **THEN** o caractere não é inserido, e nenhum erro é exibido

#### Scenario: Ausência da ação de baixar
- **WHEN** o painel de saída de uma operação numérica é renderizado
- **THEN** ele oferece copiar, e não oferece baixar

#### Scenario: Operação de texto não muda
- **WHEN** a operação não declara entrada numérica
- **THEN** seus painéis continuam sendo áreas de texto multilinha, como antes
