## Why

O registro importa todos os motores de texto estaticamente. Cada workspace de texto depende do conjunto inteiro, incluindo o parser XML, mesmo quando apenas Base64 é usado.

## What Changes

- Carregar motores por operação sob demanda, preservando catálogo e rotas estáticas.
- Tratar carregamento, falha e nova tentativa com estado acessível sem executar um motor de rota anterior.
- Validar isolamento de imports e registrar evidência do build antes/depois.

## Capabilities

### New Capabilities

- `operation-engine-loading`: Carregar motores por operação sob demanda, preservando catálogo e rotas estáticas.

### Modified Capabilities

Nenhuma alteração adicional de requisitos existentes fora dos deltas já identificados no design.

## Impact

web/src/lib/operations/registry.ts, adaptador de carregamento e OperationWorkspace, testes do registro/carregamento e evidências de bundle. Sem alterar algoritmos ou contratos síncronos de Engine.

Branch: `perf/lazy-operation-engines`. Base: `main@9fc33af`. Esta melhoria terá PR próprio.

