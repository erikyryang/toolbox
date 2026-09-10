## Context

As specs vigentes ainda descrevem ferramentas removidas, a conversão de unidades não consta da base e a configuração declara português como padrão apesar de o produto iniciar em inglês. Base inspecionada: main@9fc33af, após fetch e pull por fast-forward.

## Goals / Non-Goals

**Goals:**

- Consolidar deltas das três mudanças concluídas e arquivá-las com histórico preservado.
- Alinhar requisitos, configuração e documentação com o catálogo e a interface atuais.
- Definir uma rotina documentada para fechar mudanças e verificar divergências.

**Non-Goals:** expandir o catálogo de ferramentas, adicionar persistência ou alterar a identidade visual.

## Decisions

Comparar specs e deltas com o código da main, aplicar removidos/modificados/adicionados preservando requisitos não afetados. Consolidar trim-toolset, add-data-size-conversion e paper-terminal-aesthetic; adaptar decisões visuais ao estado realmente entregue. Arquivar somente após sincronização e validação. Documentar que novas mudanças aguardam integração antes de serem arquivadas.

## Risks / Trade-offs

Deltas podem conter detalhes superados por commits posteriores → verificar catálogo, temas, layout e controles reais. Não apresentar propostas ainda em PR como comportamento vigente.

## Migration Plan

Publicar em PR próprio a partir da main atualizada. Manter a mudança ativa durante revisão; consolidar seus deltas ao integrar. Reversão pelo revert dos commits deste PR. Instalações e dados do usuário não exigem migração.

## Open Questions

Nenhuma decisão de produto pendente. Detalhes de implementação serão resolvidos com base nos testes e registrados neste design quando materiais.

## Evidências da consolidação

- `trim-toolset`: os cenários de tar.zst, XZ e BZIP2 foram removidos por revisão explícita, pois já não existem no catálogo. O CLI recusou descartá-los automaticamente; após aplicar e validar os quatro deltas, o arquivo foi feito com `--skip-specs`.
- `paper-terminal-aesthetic`: o cabeçalho de superfícies foi alinhado ao nome usado no delta antes da consolidação. O histórico original foi preservado. A base recebeu ainda a topbar com links pessoais, navegação responsiva, exceção circular dos dots, acento de navegação e título animado, conforme commits posteriores presentes na main.
- `add-data-size-conversion`: os seis requisitos da capacidade e os dois de workspace foram consolidados. O Purpose gerado como TBD foi substituído por descrição concreta.
- A configuração agora declara inglês como padrão. O README inclui a ferramenta de unidades e aponta para o procedimento de manutenção.
