# Manutenção das especificações

`specs/` descreve o produto integrado na `main`. `changes/` contém propostas
em implementação ou revisão; uma lista de tarefas concluída não significa,
por si só, que a mudança já foi integrada. `changes/archive/` preserva o
histórico de propostas, decisões, tarefas e deltas consolidados.

Use o OpenSpec CLI 1.6.0, a versão usada nesta consolidação. Na raiz do projeto:

```bash
openspec list
openspec validate --all --strict --no-interactive
```

## Definição e implementação

1. Crie uma mudança com `openspec new change <nome>`.
2. Complete proposta, design, delta de requisitos e tarefas. Cada requisito
   normativo precisa de cenários observáveis. Registre remoções com motivo e
   migração; requisitos modificados devem carregar seu conteúdo completo.
3. Execute `openspec validate <nome> --strict` e registre as specs antes do código.
4. Implemente, valide e marque apenas tarefas realmente concluídas. O PR deve
   apontar a mudança e informar verificações, limitações e dependências.

## Fechamento após integração

1. Confirme que o código da mudança está na `main`, confira as tarefas e compare
   o delta com o comportamento entregue, inclusive ajustes feitos na revisão.
2. Atualize requisitos afetados por decisões posteriores; preserve os demais.
   Renomeações de requisitos precisam ser explícitas para que o sincronizador
   encontre o cabeçalho correto.
3. Execute `openspec archive <nome> --yes`, que consolida e arquiva. Revise o
   diff e preencha o propósito de qualquer capacidade recém-criada.
4. Execute a validação estrita de todo o repositório e registre o fechamento
   em um commit documental. Mantenha nomes datados no arquivo histórico.

O sincronizador pode recusar a remoção de cenários de um requisito modificado.
Quando a remoção é intencional e corresponde ao código integrado, aplique o
delta por revisão explícita, valide a base e use
`openspec archive <nome> --yes --skip-specs` **somente depois de confirmar a
sincronização manual**. Não use a opção para deixar specs antigas em vigor.

## Referências para conferir divergências

| Assunto | Fonte no código |
| --- | --- |
| Ferramentas e rotas disponíveis | `web/src/lib/operations/*-catalog.ts` |
| Formatos e roteamento local/servidor | `web/src/lib/compression/formats.ts` e `limits.ts` |
| Operações de texto e unidades | `web/src/lib/engines/` |
| Idioma inicial e preferência | `web/src/lib/i18n.ts` e `language.tsx` |
| Tema, tipografia e layout | `web/src/design/`, `site-header.tsx` e `globals.css` |
| Limites e transporte Go | `server/cmd/toolbox-server/` e `server/internal/` |

A validação sintática não compara requisitos com a implementação. Essa
comparação continua sendo parte da revisão, apoiada pelos testes das operações.
