## Context

A tela de arquivos concentra seleção, processamento, transporte, download e apresentação. Arquivos destinados ao servidor são lidos integralmente na memória do navegador e tarefas antigas podem atualizar uma seleção nova. Base inspecionada: main@9fc33af, após fetch e pull por fast-forward.

## Goals / Non-Goals

**Goals:**

- Extrair o ciclo de vida e a execução para um controlador testável e um hook, deixando componentes de entrada e resultado focados na apresentação.
- Manter File/Blob até decidir o destino; ler somente um prefixo para detectar o formato e materializar bytes completos apenas para o Worker.
- Cancelar requisições e invalidar resultados antigos ao limpar, trocar entrada ou desmontar a tela.

**Non-Goals:** expandir o catálogo de ferramentas, adicionar persistência ou alterar a identidade visual.

## Decisions

Representar entrada como Blob/File com nome e tamanho. O adaptador HTTP aceitará Blob e ArrayBuffer para compatibilidade. A detecção usa um slice limitado da assinatura. Um controlador sem React recebe dependências de Worker/transporte e gerações de execução; o hook conecta estado e limpeza. Requisições usam AbortController; saídas obsoletas são ignoradas. Extrair regiões de apresentação com props tipadas. Preservar transparência de roteamento e processamento local padrão.

## Risks / Trade-offs

Respostas concorrentes e terminação do Worker → testes com Promises controladas. Blob no transporte → testes do corpo enviado. A saída ainda pode ocupar memória ao baixar; o escopo não promete streaming de download.

## Migration Plan

Publicar em PR próprio a partir da main atualizada. Manter a mudança ativa durante revisão; consolidar seus deltas ao integrar. Reversão pelo revert dos commits deste PR. Instalações e dados do usuário não exigem migração.

## Open Questions

Nenhuma decisão de produto pendente. Detalhes de implementação serão resolvidos com base nos testes e registrados neste design quando materiais.

