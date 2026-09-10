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

## Implementation Notes

Cada erro conhecido existe uma vez só: `OperationError` recebe `{ code, params, position }`, e `Error.message` é o texto inglês do catálogo — serve a log e devtools, e a interface nunca o exibe. Notas seguem o mesmo canal: `EngineResult.notes` é `Feedback[]`, sem par em texto.

A fronteira do worker transporta só o código; `feedbackOf` recusa um código fora do catálogo e cai em `error.unknown`, de modo que um `postMessage` adulterado não escolhe frase. O cliente HTTP escolhe o código pelo status e ignora a prosa do corpo, preservando `Retry-After` como parâmetro.

Duas perdas deliberadas de detalhe: o XML inválido não nomeia mais a tag, porque o nome só existe dentro da frase inglesa do validador e extraí-lo seria a análise por regex que este design proíbe — linha, coluna e posição continuam apontando o lugar. A nota de base decimal junta as unidades por vírgula nos dois idiomas, porque o separador de lista é do idioma e não cabe num parâmetro.

O alfabeto errado em Base64 ganhou código próprio (`error.base64StandardAlphabet`, `error.base64UrlSafeAlphabet`): o motor já sabe a qual variante o caractere pertence, então a dica sobrevive sem ler frase nenhuma.

## Integration Points

`refactor-file-workspace` mexe nos mesmos arquivos da tela de arquivos e em `compression/backend.ts`. As assinaturas que as duas mudanças tocam são disjuntas — aqui o corpo dos erros, lá o tipo do corpo enviado —, mas `file-workspace.tsx`, `backend.ts` e `client.ts` vão conflitar textualmente. Quem integrar por último resolve mantendo os dois: entrada como Blob e falha como código.

`load-operation-engines-on-demand` passa a importar motores por função assíncrona; os erros continuam vindo do próprio motor, então o catálogo não muda.

## Risks / Trade-offs

Mudança transversal sobrepõe refatoração de arquivos e carregamento de motores → manter contratos compatíveis e registrar pontos de integração para revisão. Não alterar resultado das conversões, slugs, metadados padrão ou preferência em localStorage.

## Migration Plan

Publicar em PR próprio a partir da main atualizada. Manter a mudança ativa durante revisão; consolidar seus deltas ao integrar. Reversão pelo revert dos commits deste PR. Instalações e dados do usuário não exigem migração.

## Open Questions

Nenhuma decisão de produto pendente. Detalhes de implementação serão resolvidos com base nos testes e registrados neste design quando materiais.

