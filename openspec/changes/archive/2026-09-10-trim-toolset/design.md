## Context

Esta change não desenha software: ela reconcilia a spec com um produto que já
mudou. O código da poda está em `refactor/trim-toolset-and-polish-ui`, em
quatro commits (`30cfe67`, `7939fd8`, `5a43f89`, `d51591f`), e o que sobrou
para decidir é o que a spec passa a dizer e o que fazer com os restos.

O estado de partida importa: `openspec/specs/` acabou de existir. Até o
arquivamento de `toolbox-mvp` e `add-join-lines`, feito junto desta change, as
capacidades viviam como delta dentro de changes concluídas e nunca arquivadas
— o que significa que nunca houve, até agora, um documento que respondesse "o
que o produto é hoje". A poda ficou sem registro em parte por isso: não havia
onde registrá-la.

## Goals / Non-Goals

**Goals**

- A spec vigente descreve exatamente o que o catálogo entrega.
- Cada remoção diz por que saiu e o que a pessoa faz no lugar.
- O que sobrou de código sem rota é apontado e removido.

**Non-Goals**

- Rediscutir a poda. As remoções já aconteceram e não estão em julgamento
  aqui; se alguma delas foi um erro, o caminho é uma change de ADDED.
- Especificar o que a branch **acrescentou** — script Python, extração de
  texto colado, arrastar e soltar, busca por aliases, rotas simétricas. É
  change própria, e misturá-la aqui faria um diff em que ninguém consegue
  separar o que entrou do que saiu.

## Decisions

### 1. REMOVED, não deleção silenciosa do arquivo

Cada requisito que sai vira uma entrada `## REMOVED Requirements` com
`**Reason**` e `**Migration**`, em vez de simplesmente sumir de
`openspec/specs/encoding-tools/spec.md` num commit de edição.

O motivo é o histórico: daqui a um ano, a pergunta "o toolbox já teve
decodificação de JWT?" tem resposta em `changes/archive/`, com a data e o
porquê. Uma linha apagada só responde "não tem", e não distingue nunca ter
existido de ter sido tirado.

**Alternativa considerada**: editar as specs direto, já que a change está
concluída de qualquer forma. Rejeitada — economiza um arquivo e perde a única
memória de que a poda existiu.

### 2. Migration honesta, inclusive quando é "nenhuma"

Onze remoções e quase todas as migrations são "Nenhuma". Escrever isso
explicitamente é melhor que omitir o campo: a ausência de migração é uma
afirmação — não há dado guardado, não há URL a redirecionar, não há usuário
com trabalho salvo — e ela só é verdade porque o produto não persiste nada.

Onde existe caminho real, ele está dito: JWT se resolve com Base64 URL-safe
por segmento; PEM/DER, com Base64 padrão no corpo entre as linhas `BEGIN` e
`END`; URL e query string, com `encodeURIComponent` e `URLSearchParams` do
próprio navegador. São exatamente os casos em que a operação removida era
conveniência sobre algo que o navegador já faz.

### 3. Duas correções de fidelidade entram junto

A poda foi o gatilho, mas ao reescrever os requisitos apareceram duas
afirmações que a implementação nunca honrou:

- **Leitura de ZSTD**: a spec dizia client-side; `formats.ts` marca
  `clientDecompress: false` desde o início, e o motivo está no comentário do
  código — a lib WASM só expõe API síncrona, que aloca a saída inteira antes
  de a guarda anti-bomba poder agir.
- **Streaming da resposta**: a spec exigia escrever no corpo conforme os bytes
  são gerados; `handleCompress` prepara o resultado inteiro no staging antes
  do primeiro cabeçalho, de propósito, e o guia de deploy documenta a troca.

Ambas entram como MODIFIED. Deixá-las para depois significaria reescrever os
mesmos dois requisitos duas vezes, e manter no ar, por mais um ciclo, uma
spec que descreve garantias de privacidade e integridade que o serviço não
cumpre da forma escrita — que é o tipo de imprecisão que menos se pode ter
justamente nesses dois requisitos.

### 4. Os motores órfãos são código morto e saem

Seis motores continuam em `web/src/lib/engines/` sem nenhuma rota que os
alcance: `asn1.ts`, `html-entities.ts`, `pem-der.ts`, `punycode-idna.ts`,
`timestamp.ts` e `url.ts`. Cada um tem teste passando, o que os faz parecer
vivos em qualquer verificação automática.

Saem, com os testes. Motor sem entrada no catálogo é inalcançável pelo
produto: nenhum bundle o inclui, nenhuma pessoa o executa, e a suíte verde dá
a impressão contrária de que há algo mantido ali.

**Alternativa considerada**: manter, como semente para quando a operação
voltar. Rejeitada — o histórico do git é essa semente, e melhor: `punycode`
ainda é dependência de `package.json` por causa de um desses arquivos.

## Risks / Trade-offs

- **Remover motor que alguém pretendia religar** → O git guarda tudo, e o
  `**Reason**` de cada REMOVED nomeia o arquivo removido. Religar é reverter
  um commit e reinserir a entrada no catálogo.
- **A spec de `data-format-conversion` fica com nome maior que o conteúdo** →
  A capacidade se chama "conversão" e não converte mais nada; entrega beautify
  e minify. Renomear a capacidade é possível (`RENAMED Requirements` não cobre
  pasta de capacidade — seria mover o diretório) e não vale o custo agora: o
  nome está em duas changes arquivadas e no histórico. Assumido.
- **Um requisito MODIFIED perde detalhe se copiado pela metade** → Cada
  MODIFIED aqui foi escrito a partir do bloco inteiro do requisito atual, com
  os cenários que continuam valendo preservados palavra por palavra.

## Migration Plan

Não há migração de dados — o produto não guarda nada. A ordem é: arquivar
`toolbox-mvp` e `add-join-lines` para que `openspec/specs/` exista (feito),
remover os motores órfãos, rodar a verificação do frontend, e arquivar esta
change quando a branch entrar na main.

## Open Questions

- A capacidade `data-format-conversion` deveria se chamar `text-formatting`,
  ao lado de `text-line-tools`? Fica para quando houver uma terceira operação
  de formatação que justifique mexer no nome.
