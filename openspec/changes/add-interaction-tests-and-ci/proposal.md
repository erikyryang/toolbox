## Why

Os testes existentes verificam motores e renderização estática, mas não exercitam fluxos reais no navegador; o repositório não executa verificações automaticamente em PRs.

## What Changes

- Adicionar testes de navegador para navegação, conversão, idioma e compressão/extração com Worker real.
- Adicionar teste de integração com o serviço Go usando dados sintéticos e ambiente isolado.
- Configurar CI para lint, tipos, testes, build e verificação OpenSpec, além da suíte de navegador.

## Capabilities

### New Capabilities

- `continuous-verification`: Adicionar testes de navegador para navegação, conversão, idioma e compressão/extração com Worker real.

### Modified Capabilities

Nenhuma alteração adicional de requisitos existentes fora dos deltas já identificados no design.

## Impact

Novos testes e configuração de E2E em web, scripts/package-lock, workflows GitHub Actions e documentação de execução. Sem alterar regras de produto.

Branch: `test/interaction-coverage-and-ci`. Base: `main@9fc33af`. Esta melhoria terá PR próprio.
