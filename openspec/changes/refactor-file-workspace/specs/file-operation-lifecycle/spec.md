## ADDED Requirements

### Requirement: Entrada proporcional ao destino

O sistema SHALL decidir o destino usando formato, tamanho e nível antes de materializar a entrada inteira. Arquivos roteados ao servidor SHALL permanecer como File/Blob até o envio.

#### Scenario: Arquivo grande no servidor

- **WHEN** um arquivo acima do limite local é selecionado
- **THEN** apenas o prefixo necessário à detecção é lido e o corpo HTTP recebe o Blob original, sem chamar arrayBuffer no arquivo inteiro

#### Scenario: Arquivo local

- **WHEN** uma entrada é roteada ao navegador
- **THEN** os bytes completos são lidos apenas quando necessários ao Worker, preservando seleção e download

### Requirement: Ciclo de vida cancelável

O controlador SHALL cancelar transporte pendente, encerrar Worker quando aplicável e impedir que resultados de uma geração anterior modifiquem o estado atual.

#### Scenario: Limpar durante processamento

- **WHEN** a seleção é limpa com uma tarefa pendente
- **THEN** o transporte é abortado, o estado é limpo e a conclusão antiga não restaura erro, resultado ou indicador de atividade

#### Scenario: Trocar seleção

- **WHEN** uma segunda seleção substitui a primeira antes de terminar a inspeção
- **THEN** somente a segunda seleção pode publicar sua listagem

#### Scenario: Sair da operação

- **WHEN** a tela é desmontada durante uma requisição
- **THEN** o AbortSignal é cancelado e recursos locais são liberados

### Requirement: Apresentação separada da execução

A interface SHALL delegar seleção, inspeção, compressão e extração a uma unidade testável sem renderização de componentes.

#### Scenario: Mesmas ferramentas

- **WHEN** a tela de compactação ou extração é aberta
- **THEN** formatos, presets, colagem, privacidade, listagem e download continuam disponíveis conforme as capacidades existentes

