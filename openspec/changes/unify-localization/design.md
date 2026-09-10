## Context

Textos estão divididos entre traduções de catálogo, condicionais em componentes e mensagens fixas em português nos motores e transporte HTTP. Isso permite que a interface em inglês apresente erros em outro idioma. Base inspecionada: main@9fc33af, após fetch e pull por fast-forward.

## Goals / Non-Goals

**Goals:**

- Introduzir catálogo tipado de mensagens de interface e feedback em português e inglês.
- Usar códigos e parâmetros para erros conhecidos, traduzindo-os na apresentação e preservando posições.
- Migrar textos de componentes e mensagens de execução para uma política única de tradução com fallback legível.

**Non-Goals:** expandir o catálogo de ferramentas, adicionar persistência ou alterar a identidade visual.

## Decisions

Chaves semânticas estáveis, paridade tipada entre pt/en e interpolação explícita. Motores continuam puros e independentes de React/idioma: erros carregam código, parâmetros e posição; a interface traduz. Preservar compatibilidade de Error.message e retornos existentes quando necessário. Erros desconhecidos usam fallback localizado, sem analisar frases por regex nem expor texto arbitrário de servidor. Notas dinâmicas relevantes também devem seguir o idioma. Evitar dependência de framework de internacionalização.

## Risks / Trade-offs

Mudança transversal sobrepõe refatoração de arquivos e carregamento de motores → manter contratos compatíveis e registrar pontos de integração para revisão. Não alterar resultado das conversões, slugs, metadados padrão ou preferência em localStorage.

## Migration Plan

Publicar em PR próprio a partir da main atualizada. Manter a mudança ativa durante revisão; consolidar seus deltas ao integrar. Reversão pelo revert dos commits deste PR. Instalações e dados do usuário não exigem migração.

## Open Questions

Nenhuma decisão de produto pendente. Detalhes de implementação serão resolvidos com base nos testes e registrados neste design quando materiais.

