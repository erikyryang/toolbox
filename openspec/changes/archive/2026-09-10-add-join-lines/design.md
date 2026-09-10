## Context

O catálogo de operações do toolbox é dado puro (`OperationMeta`), separado dos motores (`Engine`, função pura sem React e sem DOM). Uma operação nova é, na prática, três coisas: uma entrada no catálogo, uma função no `registry`, e texto em português e inglês. Rota, SEO, painéis, debounce, copiar, baixar e rodapé de privacidade vêm de graça de `operation-workspace`.

Estado atual do grupo Formato: só `json-format` e `xml-format`, ambos gerados pela mesma fábrica `beautifier(format)` em `format-catalog.ts`, ambos reversíveis (beautify ↔ minify) e ambos operando sobre conteúdo com gramática. A operação nova quebra esses três padrões ao mesmo tempo: é escrita à mão, é de sentido único e opera sobre texto sem gramática nenhuma.

Restrições que moldam o desenho:

- Motor puro, testável isoladamente, sem dependência nova.
- `OptionSpec` admite hoje apenas `select` e `boolean`. Nenhum campo de texto livre.
- O catálogo atravessa o limite servidor/cliente: só dados serializáveis, nada de funções.
- A tradução para inglês é por tabela, casando por slug e por string literal de rótulo.

## Goals / Non-Goals

**Goals:**

- Cobrir o caso real de quem cola uma coluna de valores e quer uma linha só, no separador que a próxima ferramenta espera.
- Não introduzir nenhum tipo novo de opção, nenhum componente novo e nenhuma dependência.
- Motor que não falha: para qualquer entrada, existe uma saída correta.
- Ser encontrável pelo que a pessoa digita, não pelo nome do produto.

**Non-Goals:**

- O inverso (quebrar uma linha em várias por um separador). Decisão do autor da change; se voltar, volta como operação própria, não como `reverse` desta.
- Separador arbitrário digitado pelo usuário.
- Ordenar, deduplicar, numerar ou filtrar linhas — outras operações, outra change.
- Prefixo e sufixo por linha (envolver cada item em aspas, montar um `IN ('a','b')`). É o passo seguinte natural, mas dobraria a superfície de opções aqui.

## Decisions

### 1. Slug em português: `juntar-linhas`

**Por quê**: o catálogo já tem precedente — `compactar` e `descompactar` são slugs em português com título em inglês na tradução. A rota é um endereço estável e indexável; misturar `join-lines` ao lado de `compactar` criaria duas convenções no mesmo produto. A descoberta em inglês é resolvida pelos aliases de busca, que é o mecanismo que existe exatamente para isso.

**Alternativa considerada**: `join-lines`, alinhado a `json-format`/`xml-format`. Rejeitado porque esses dois são o nome do formato, não um verbo — não são tradução de nada.

### 2. Separador como `select` de presets, com valores simbólicos

A opção `separator` é um `select` cujos `value` são identificadores (`none`, `space`, `comma`, `comma-space`, `semicolon`, `pipe`, `tab`), não os caracteres em si. O motor mantém o mapa `identificador → caractere`.

**Por quê**: dois motivos concretos. Primeiro, um `value` com tabulação ou espaço literal é frágil — atravessa serialização, aparece no DOM como atributo de `<option>` e some numa comparação distraída. Segundo, a tradução de opções casa por **string literal do label** (`optionTranslations`), então o label precisa ser texto legível ("Vírgula + espaço"), e o valor precisa ser estável e independente do idioma. Símbolo no `value`, texto no `label`, caractere no motor.

**Alternativa considerada**: um `kind: "text"` novo em `OptionSpec`, com campo livre. Rejeitado nesta change: exige tipo novo, campo novo em `advanced-options.tsx`, e uma decisão sobre escapes (`\t` digitado é tabulação ou dois caracteres?) que é uma discussão inteira. Os sete presets cobrem o caso real; o campo livre pode vir depois, aditivamente, sem quebrar o slug nem as opções existentes.

### 3. Sentido único, sem `reverse`

`OperationMeta.reverse` é opcional e `operation-workspace.tsx:101` já renderiza o seletor de sentido atrás de `localized.reverse ?`. Nada muda na interface — mas esta é a primeira operação **de texto** a exercitar esse caminho (as de sentido único que existem hoje são de arquivo, e usam outro componente).

**Consequência para o teste**: vale um teste de interface, não só de motor, garantindo que a rota renderiza sem seletor de sentido e com o resto do workspace intacto. É a única parte desta change que não é coberta por um teste de função pura.

### 4. Motor sem erro: nenhuma entrada é inválida

`juntarLinhas` nunca lança `OperationError`. Texto vazio devolve vazio; uma linha devolve ela mesma; qualquer sequência de bytes é texto aceitável. Não há `notes` — a operação não perde nem normaliza nada que o usuário não tenha pedido explicitamente nas opções.

**Por quê**: o campo de erro inline existe para entrada malformada, e "malformado" não é um conceito aplicável a texto livre. Inventar um erro aqui (entrada vazia, linha única) seria ruído numa tela que recalcula a cada tecla digitada.

### 5. Normalização das quebras antes de tudo

O motor faz `input.split(/\r\n|\r|\n/)` como primeiro passo, e a partir daí trabalha só com o array. Isso resolve `\r\n` e `\r` de uma vez e garante a exigência da spec de que nenhuma quebra sobreviva na saída — inclusive o `\r` órfão que um `split("\n")` ingênuo deixaria colado no fim de cada linha.

A ordem das etapas é fixa e importa: **separar → aparar (se ligado) → descartar vazias (se ligado) → juntar**. O aparo antes do descarte é o que faz uma linha de três espaços contar como vazia, que é o comportamento que a spec exige e o que a pessoa espera ao colar de uma planilha.

### 6. Última posição no grupo Formato

A entrada fica no fim do array exportado por `format-catalog.ts` — "JSON
beautify", "XML beautify", "Juntar linhas" —, e não na posição alfabética que
o grupo Codificação passou a seguir.

**Por quê**: os dois formatadores são o que a maioria vem buscar no grupo, e a
junção de linhas é a vizinha de outra natureza — texto sem gramática, ao lado
de dois formatos que têm uma. Ordem alfabética serve o grupo Codificação, onde
as três entradas são a mesma coisa em bases diferentes e nenhuma tem
precedência sobre as outras; aqui ela colocaria a estranha no meio das duas
irmãs.

**Efeito colateral bem-vindo**: a ordem deixa de depender do idioma do array.
A posição alfabética de "Juntar linhas" e a de "Join lines" coincidiam por
sorte, não por garantia — e agora não há sorte envolvida.

### 7. Tradução: entrada própria, fora da regra dos formatadores

`localizeOperation` tem um atalho `isFormatter = /^(json|xml)-format$/` que gera título e subtítulo em inglês por template. `juntar-linhas` não casa com esse regex e portanto cai no caminho da tabela `englishOperations`, que é onde ela deve estar mesmo — o texto dela não é derivável de um nome de formato. Os labels das sete escolhas de separador e os das duas opções booleanas entram em `optionTranslations`, e os `help` em `helpTranslations`.

## Risks / Trade-offs

- **Sete presets não cobrem o separador de alguém** → O caso é real (um ` | ` com espaços, um `", "` com aspas). Mitigação: os presets cobrem a grande maioria, e a decisão 2 deixa o caminho do campo livre aberto como adição futura, sem migração.
- **Primeira operação de texto sem `reverse`; regressão silenciosa possível** → Um teste de interface na rota, além do teste de motor (decisão 3).
- **Entrada muito grande recalculando a cada tecla** → O workspace já aplica debounce (`use-debounced.ts`) e a operação é `split`/`join`, linear e sem alocação extra relevante. Não se justifica worker aqui.
- **Padrão que não transforma nada é menos "útil de cara"** → Separador vazio, sem aparo e sem descarte significa que a primeira impressão da tela é só "as quebras sumiram", e quem queria `a, b, c` precisa abrir as opções. É a troca deliberada: uma operação de texto não deve alterar o texto de quem chegou sem que a pessoa tenha pedido, e cada opção diz no `help` o que faz quando ligada.

## Migration Plan

Aditivo, sem migração. A change entra com o catálogo, o motor, a tradução e os testes no mesmo commit — `registry.test.ts` já falha se um slug listado ficar sem motor, o que impede o meio-caminho. Rollback é remover a entrada do catálogo e do registry; nenhuma rota existente muda, nenhum slug é reaproveitado, nenhum dado persiste em lugar nenhum para migrar.

## Open Questions

- O inverso ("Quebrar linhas") merece rota própria? Fora do escopo por decisão do autor; a pergunta continua aberta para uma próxima change, e a decisão 1 não atrapalha — `quebrar-linhas` seria o slug irmão.
- Prefixo/sufixo por linha (montar `'a','b','c'`) resolveria o caso de SQL de ponta a ponta. Vale como operação separada ou como duas opções a mais aqui? Não decidido.
