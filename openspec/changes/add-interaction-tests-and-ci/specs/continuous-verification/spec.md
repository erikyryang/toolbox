## ADDED Requirements

### Requirement: Fluxos no navegador

A suíte SHALL verificar interação real com operações de texto, navegação e idioma, usando seletores acessíveis.

#### Scenario: Conversão e navegação

- **WHEN** o usuário converte Base64 e navega para outra ferramenta
- **THEN** a saída corresponde à entrada atual e os controles pertencem à operação selecionada

#### Scenario: Idioma

- **WHEN** o usuário alterna entre inglês e português
- **THEN** os rótulos visíveis acompanham a escolha

### Requirement: Arquivos locais e integração

A suíte SHALL exercitar compressão/extração em Worker, uma operação roteada ao backend Go com fixtures sintéticas e a troca entre as ferramentas de arquivo sem recarregar a página.

#### Scenario: Round trip local

- **WHEN** um arquivo de texto pequeno é compactado e extraído no navegador
- **THEN** o conteúdo baixado é idêntico à fixture e nenhuma requisição de processamento chega ao backend

#### Scenario: Rota servidor

- **WHEN** um arquivo sintético ultrapassa o limite definido para E2E
- **THEN** a interface informa o destino servidor e o backend real produz resultado íntegro

#### Scenario: Navegação entre ferramentas de arquivo

- **WHEN** o usuário vai de compactar para descompactar e volta por links internos
- **THEN** seleção, conteúdo do arquivo e downloads são descartados e cada rota mostra os controles da sua operação

### Requirement: Verificação reproduzível

O repositório SHALL documentar como executar lint, typecheck, testes unitários frontend/Go, build frontend, validação OpenSpec e testes de navegador com instalações reproduzíveis.

#### Scenario: Execução local

- **WHEN** um colaborador segue a documentação
- **THEN** ele consegue executar a mesma suíte e conhece os requisitos de browser e backend
