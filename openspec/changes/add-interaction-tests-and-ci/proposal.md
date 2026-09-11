## Why

Os testes existentes verificam motores e renderização estática, mas não exercitam fluxos reais no navegador.

## What Changes

- Adicionar testes de navegador para navegação, conversão, idioma e compressão/extração com Worker real.
- Adicionar teste de integração com o serviço Go usando dados sintéticos e ambiente isolado.

## Capabilities

### New Capabilities

- `continuous-verification`: Adicionar testes de navegador para navegação, conversão, idioma e compressão/extração com Worker real.

### Modified Capabilities

Nenhuma alteração adicional de requisitos existentes fora dos deltas já identificados no design.

## Impact

Novos testes e configuração de E2E em web, scripts/package-lock e documentação de execução. Sem alterar regras de produto.

Branch: `test/interaction-coverage-and-ci`. Base: `main@9fc33af`. Esta melhoria terá PR próprio.
