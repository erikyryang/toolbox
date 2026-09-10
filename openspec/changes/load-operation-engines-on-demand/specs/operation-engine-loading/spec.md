## ADDED Requirements

### Requirement: Motor carregado sob demanda

O registro SHALL carregar o motor da operação selecionada por import dinâmico, sem importar estaticamente todos os motores no workspace ou catálogo.

#### Scenario: Página Base64

- **WHEN** a rota Base64 é aberta
- **THEN** o carregador solicita a família Base64 e não solicita parsers de formatos nem codecs de compactação

#### Scenario: Navegação e metadados

- **WHEN** o catálogo é usado para home, menu ou geração de metadados
- **THEN** nenhum carregamento de motor é iniciado

### Requirement: Carregamento recuperável e isolado

A tela SHALL apresentar estado acessível de carregamento e falha, permitir retry e impedir que a resolução de outra rota execute ou substitua a operação atual.

#### Scenario: Falha transitória de chunk

- **WHEN** um import falha e o usuário tenta novamente
- **THEN** uma nova tentativa é feita e os dados atuais podem ser processados ao concluir

#### Scenario: Troca rápida de rota

- **WHEN** o usuário navega enquanto um motor está carregando
- **THEN** a resolução antiga não publica resultado na operação atual

#### Scenario: Entrada durante carregamento

- **WHEN** o usuário digita antes de o motor ficar disponível
- **THEN** a entrada permanece e é processada quando o motor correto chega

### Requirement: Equivalência funcional verificável

A mudança SHALL preservar motores puros, sentidos reversíveis, rotas estáticas e resultados existentes, e SHALL fornecer evidência de separação dos motores no build.

#### Scenario: Catálogo completo

- **WHEN** os loaders de todas as operações de texto são resolvidos nos testes
- **THEN** cada slug possui os motores declarados e mantém os resultados de referência

#### Scenario: Build de produção

- **WHEN** o build é inspecionado
- **THEN** a descrição da mudança registra como a família Base64 fica separada dos parsers não utilizados

