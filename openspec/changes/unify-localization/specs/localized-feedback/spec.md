## ADDED Requirements

### Requirement: Mensagens por chave com paridade

A interface SHALL obter mensagens compartilhadas e de interação de um catálogo com chaves semânticas e traduções correspondentes em português e inglês.

#### Scenario: Troca de idioma

- **WHEN** o usuário alterna o idioma
- **THEN** rótulos, instruções, estados e feedback de operação passam a usar a tradução selecionada sem perder entrada ou resultado

#### Scenario: Mensagem parametrizada

- **WHEN** uma mensagem contém quantidade, nome ou limite
- **THEN** a tradução preserva os parâmetros e é renderizada como texto, sem HTML dinâmico

### Requirement: Erros independentes do idioma

Erros conhecidos de execução SHALL transportar código estável, parâmetros e posição quando houver; a apresentação SHALL resolvê-los no idioma atual.

#### Scenario: Entrada inválida

- **WHEN** uma codificação ou conversão rejeita uma entrada
- **THEN** o usuário recebe mensagem localizada, com posição preservada, e o motor permanece independente de React

#### Scenario: Erro HTTP

- **WHEN** o backend responde 413, 429 ou 503
- **THEN** o cliente oferece orientação localizada, preservando Retry-After quando disponível

#### Scenario: Erro desconhecido

- **WHEN** o processamento falha sem código conhecido
- **THEN** a interface apresenta fallback localizado legível, sem depender da frase do servidor

### Requirement: Compatibilidade e privacidade

A migração SHALL preservar resultados de motores, escolha de idioma armazenada somente no navegador e execução local padrão.

#### Scenario: Idioma padrão

- **WHEN** a página abre sem preferência salva
- **THEN** a interface inicia em inglês

#### Scenario: Operação bem-sucedida

- **WHEN** a mesma entrada e opções são executadas nos dois idiomas
- **THEN** o resultado de dados é idêntico e somente o texto de apresentação varia

