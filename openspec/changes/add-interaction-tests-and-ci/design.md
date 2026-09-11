## Context

Os testes existentes verificam motores e renderização estática, mas não exercitam fluxos reais no navegador; o repositório não executa verificações automaticamente em PRs. Base inspecionada: main@9fc33af, após fetch e pull por fast-forward.

## Goals / Non-Goals

**Goals:**

- Adicionar testes de navegador para navegação, conversão, idioma e compressão/extração com Worker real.
- Adicionar teste de integração com o serviço Go usando dados sintéticos e ambiente isolado.
- Configurar CI para lint, tipos, testes, build e verificação OpenSpec, além da suíte de navegador.

**Non-Goals:** expandir o catálogo de ferramentas, adicionar persistência ou alterar a identidade visual.

## Decisions

Usar Playwright para fluxos completos com servidor Next e backend Go iniciados pela configuração de teste, portas próprias e fixtures sintéticas. Separar smoke local/Worker de integração HTTP; fixar uma variável de limite apropriada no ambiente E2E para exercitar roteamento sem arquivos gigantes. Executar contra build de produção quando viável. CI em pull_request e push main, permissões contents:read, lockfile npm e Go go.mod como fontes de versão. Evitar mudanças em componentes para acomodar testes.

## Risks / Trade-offs

Tempos assíncronos → asserções por estado visível e espera automática, sem sleeps fixos. Limites específicos de teste devem ser explícitos e confinados ao processo E2E. Não registrar dados reais; fixtures são geradas nos testes.

## Migration Plan

Publicar em PR próprio a partir da main atualizada. Manter a mudança ativa durante revisão; consolidar seus deltas ao integrar. Reversão pelo revert dos commits deste PR. Instalações e dados do usuário não exigem migração.

## Open Questions

Nenhuma decisão de produto pendente. Detalhes de implementação serão resolvidos com base nos testes e registrados neste design quando materiais.
