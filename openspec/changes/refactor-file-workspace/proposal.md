## Why

A tela de arquivos concentra seleção, processamento, transporte, download e apresentação. Arquivos destinados ao servidor são lidos integralmente na memória do navegador e tarefas antigas podem atualizar uma seleção nova.

## What Changes

- Extrair o ciclo de vida e a execução para um controlador testável e um hook, deixando componentes de entrada e resultado focados na apresentação.
- Manter File/Blob até decidir o destino; ler somente um prefixo para detectar o formato e materializar bytes completos apenas para o Worker.
- Cancelar requisições e invalidar resultados antigos ao limpar, trocar entrada ou desmontar a tela.

## Capabilities

### New Capabilities

- `file-operation-lifecycle`: Extrair o ciclo de vida e a execução para um controlador testável e um hook, deixando componentes de entrada e resultado focados na apresentação.

### Modified Capabilities

Nenhuma alteração adicional de requisitos existentes fora dos deltas já identificados no design.

## Impact

web/src/components/file-workspace.tsx, novos componentes/hook de arquivos, lib/compression/backend.ts e testes do controlador. Sem mudança dos endpoints Go, formatos, limites ou layout pretendido.

Branch: `refactor/file-workspace-lifecycle`. Base: `main@9fc33af`. Esta melhoria terá PR próprio.

