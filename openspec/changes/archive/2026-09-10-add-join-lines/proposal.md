## Why

O grupo Formato só atende conteúdo estruturado: JSON e XML, com beautify e minify. Quem chega com texto solto — uma coluna de IDs copiada de uma planilha, uma lista de e-mails, o retorno de um `grep` — não tem nada no toolbox. E a transformação que essa pessoa quase sempre quer é a mesma: transformar N linhas em **uma** linha, com o separador que a próxima ferramenta espera (um `IN (…)` de SQL, um cabeçalho CSV, uma lista de argumentos de CLI).

Hoje isso é resolvido fora do produto, num editor com regex ou colando em um site qualquer — exatamente o hábito que o toolbox existe para substituir quando o conteúdo é sensível.

## What Changes

- **Nova operação `juntar-linhas`** no grupo Formato: operação de texto (`kind: "text"`), executada integralmente no navegador (`execution: "client"`), com rota dedicada `/juntar-linhas` e metadados próprios como toda operação do catálogo.
- **Junta todas as linhas da entrada em uma única linha**, com separador escolhido em uma lista de presets: nada, espaço, vírgula, vírgula + espaço, ponto e vírgula, pipe e tabulação.
- **Duas opções de limpeza**, ambas ligadas por padrão porque são o que o caso real pede: aparar espaços nas pontas de cada linha e descartar linhas vazias.
- **Direção única**: a operação não tem inverso. É a primeira operação de texto sem `reverse` — o workspace já trata `reverse` ausente, e o seletor de sentido simplesmente não aparece.
- **Aliases de busca** para os termos que as pessoas realmente digitam: `join`, `join lines`, `juntar`, `uma linha`, `remover quebras`, `unir linhas`.
- **Textos em inglês** da nova operação na tabela de tradução, incluindo os rótulos e as escolhas da opção de separador.

Não é breaking: nenhuma operação existente muda de comportamento, slug ou opções.

## Capabilities

### New Capabilities

- `text-line-tools`: operações de linha sobre texto livre no grupo Formato — texto que não tem gramática, ao contrário de JSON e XML. Cobre, nesta change, a junção de linhas em uma linha só: escolha de separador, aparo de espaços, descarte de linhas vazias, tratamento de finais de linha `\n`/`\r\n` e comportamento com entrada vazia.

### Modified Capabilities

Nenhuma. `openspec/specs/` está vazio — as capacidades do MVP ainda vivem como delta na change `toolbox-mvp` e nenhum requisito delas muda aqui. A operação nova é aditiva ao catálogo, que `operation-workspace` já renderiza de forma genérica.

## Impact

- **Catálogo**: `web/src/lib/operations/format-catalog.ts` ganha a entrada `juntar-linhas`. Hoje o arquivo só exporta formatadores gerados por `beautifier(format)`; passa a exportar também uma entrada escrita à mão.
- **Motor**: novo `web/src/lib/engines/lines.ts`, função pura como todos os motores, mais o registro em `web/src/lib/operations/registry.ts`.
- **Tradução**: `web/src/lib/language.tsx` — entrada em `englishOperations` e novos verbetes em `optionTranslations`. Atenção ao `isFormatter = /^(json|xml)-format$/`: a regra genérica de tradução dos formatadores não se aplica à operação nova, que precisa de texto próprio.
- **Rota e SEO**: nenhuma mudança de código — `generateStaticParams` já deriva as rotas do catálogo.
- **Testes**: novo teste do motor e o teste de catálogo existente (`registry.test.ts`), que exige motor para todo slug listado.
- **Dependências**: nenhuma. O motor é `split`/`join` sobre string.
- **Risco**: baixo e contido no cliente. O ponto de atenção é o `reverse` ausente numa operação de texto, caminho que a interface ainda não exercitou em produção.
