## ADDED Requirements

### Requirement: Base normativa corresponde ao produto

As specs vigentes SHALL descrever o conjunto de capacidades implementadas na main e a configuração SHALL declarar inglês como idioma inicial, com português disponível.

#### Scenario: Ferramentas removidas

- **WHEN** a base de encoding e formatos é consultada
- **THEN** ela exige Base64, Base32, Base58 e formatação JSON/XML, sem exigir as ferramentas removidas ou conversão entre formatos

#### Scenario: Unidades e aparência

- **WHEN** a base é consultada após sincronização
- **THEN** a conversão de tamanho e a aparência realmente entregue têm requisitos próprios e verificáveis

### Requirement: Fechamento rastreável de mudanças

Uma mudança concluída SHALL ter seus deltas consolidados antes de ser movida ao arquivo, preservando proposta, design, tarefas e specs.

#### Scenario: Três mudanças entregues

- **WHEN** trim-toolset, add-data-size-conversion e paper-terminal-aesthetic são fechadas
- **THEN** os requisitos vigentes incorporam os deltas e os artefatos completos permanecem em changes/archive

#### Scenario: Mudança ainda em revisão

- **WHEN** uma melhoria existe apenas em um PR aberto
- **THEN** ela permanece ativa e não é descrita como já disponível na main

### Requirement: Verificação documentada

A documentação SHALL informar como validar specs e encerrar mudanças implementadas sem perder histórico.

#### Scenario: Validação do repositório

- **WHEN** o comando documentado de validação estrita é executado
- **THEN** todas as specs e mudanças disponíveis são verificadas sem erro

