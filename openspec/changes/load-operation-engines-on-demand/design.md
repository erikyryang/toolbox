## Context

O registro importa todos os motores de texto estaticamente. Cada workspace de texto depende do conjunto inteiro, incluindo o parser XML, mesmo quando apenas Base64 é usado. Base inspecionada: main@9fc33af, após fetch e pull por fast-forward.

## Goals / Non-Goals

**Goals:**

- Carregar motores por operação sob demanda, preservando catálogo e rotas estáticas.
- Tratar carregamento, falha e nova tentativa com estado acessível sem executar um motor de rota anterior.
- Validar isolamento de imports e registrar evidência do build antes/depois.

**Non-Goals:** expandir o catálogo de ferramentas, adicionar persistência ou alterar a identidade visual.

## Decisions

Criar loaders explícitos com import() por família de motor, cachear Promises bem-sucedidas e remover falhas do cache para permitir retry. Manter metadados e renderização inicial dos controles independentes do carregamento, evitando perda de SEO ou acessibilidade. Expor execução síncrona após resolver o motor; invalidar resposta de carregamento de slug antigo e resetar estado ao trocar operação. Não mover texto para Worker neste PR. Medir a separação por grafo/chunks de produção, sem impor porcentagem arbitrária de redução.

## Risks / Trade-offs

Chunk indisponível → erro localizado de carregamento e ação de tentar novamente. Corrida entre slugs → isolamento por chave/geração. JSON e XML compartilham structured.ts; decidir a separação do parser com evidência de build e manter testes funcionais.

## Migration Plan

Publicar em PR próprio a partir da main atualizada. Manter a mudança ativa durante revisão; consolidar seus deltas ao integrar. Reversão pelo revert dos commits deste PR. Instalações e dados do usuário não exigem migração.

## Open Questions

Nenhuma decisão de produto pendente. Detalhes de implementação serão resolvidos com base nos testes e registrados neste design quando materiais.

