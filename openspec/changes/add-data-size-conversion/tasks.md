## 1. Motor

- [x] 1.1 Criar `web/src/lib/engines/data-size.ts` com a escada de unidades (bit, byte, KB, MB, GB, TB) e o fator de cada uma em bits, parametrizado pela base
- [x] 1.2 Escrever o parser de valor: número com ponto ou vírgula decimal e sinal opcional, devolvendo indefinido para os estados intermediários da digitação
- [x] 1.3 Escrever o formatador: 12 dígitos significativos, poda de zeros à direita, sem notação exponencial e sem separador de milhar
- [x] 1.4 Montar o motor sobre um valor único, com a nota que declara base aplicada e nome IEC do degrau
- [x] 1.5 Erros como `OperationError` com mensagem legível; entrada vazia ou incompleta devolve saída vazia, sem erro

## 2. Testes do motor

- [x] 2.1 Criar `web/src/lib/engines/data-size.test.ts` cobrindo os degraus nas duas bases, incluindo `1 TB → GB` = 1000 / 1024
- [x] 2.2 Cobrir bit e byte: fator 8 fixo, independente da base
- [x] 2.3 Cobrir a leitura do valor: ponto, vírgula, sinal, espaço nas pontas, e a unidade vindo só do seletor
- [x] 2.4 Cobrir origem igual ao destino e o ciclo fechado do sentido inverso
- [x] 2.5 Cobrir a formatação: inteiro sem casas, `0.1 GB → MB` sem cauda binária, valor grande sem notação exponencial
- [x] 2.6 Cobrir os estados incompletos sem erro (vazio, sinal solto, separador solto) e o valor irreconhecível com erro

## 3. Catálogo e navegação

- [x] 3.1 Acrescentar `Unidades` ao tipo `OperationGroup` em `web/src/lib/operations/types.ts`
- [x] 3.2 Criar `web/src/lib/operations/units-catalog.ts` com a operação `converter-tamanho`: rótulos dos dois sentidos, opções de origem, destino e base, placeholder e aliases
- [x] 3.3 Registrar o grupo em `GROUP_ORDER` e a operação em `operationCatalog`, em `catalog.ts`
- [x] 3.4 Ligar os dois sentidos em `registry.ts`, com o inverso trocando origem e destino

## 4. Tradução

- [x] 4.1 Acrescentar `Unidades: "Units"` a `groupNames` em `web/src/lib/i18n.ts`
- [x] 4.2 Traduzir a operação em `englishOperations`: nome, título, subtítulo, descrição e os rótulos dos dois sentidos
- [x] 4.3 Traduzir os rótulos e ajudas das três opções em `optionTranslations` e `helpTranslations`

## 5. Opções principais fora do disclosure

Encontrado ao montar a tela: os três seletores caíam atrás de "Opções
avançadas", fechado por padrão, e a operação nascia sem controle visível.

- [x] 5.1 Extrair `OptionField` de `advanced-options.tsx` para `web/src/components/option-field.tsx`, para que o mesmo campo sirva aos dois lugares
- [x] 5.2 Acrescentar `primaryOptionIds` a `OperationMeta` e `splitOptions()` a `types.ts`, com a separação testável fora da tela
- [x] 5.3 Criar `PrimaryOptions` em `advanced-options.tsx` e renderizá-lo acima dos painéis em `operation-workspace.tsx`
- [x] 5.4 Não renderizar o disclosure — nem o espaçamento dele — quando não sobrar nenhuma opção avançada
- [x] 5.5 Declarar `base`, `from` e `to` como principais no catálogo da operação
- [x] 5.6 Cobrir em `registry.test.ts`: todo id principal existe, a soma dos dois grupos é o total sem repetição, e operação sem declaração mantém tudo atrás do disclosure

## 6. Campo estritamente numérico

- [x] 6.1 Criar `web/src/lib/numeric-input.ts` com `sanitizeNumeric` e seu teste: dígitos, um separador, sinal só no começo, resto descartado
- [x] 6.2 Acrescentar `valueKind` a `OperationMeta` e a variante `numeric` a `text-panel.tsx` — campo de uma linha, `inputMode="decimal"`, sem realce de sintaxe e sem ação de baixar
- [x] 6.3 Repassar o tipo de valor aos dois painéis em `operation-workspace.tsx`
- [x] 6.4 Declarar `valueKind: "number"` na operação, e trocar o placeholder multilinha por `1.5`

## 7. Verificação

- [x] 7.1 `npm run lint`, `npm run typecheck` e `npm test` em `web/`
- [x] 7.2 `npm run build` — confirmar que a rota `/converter-tamanho` é gerada estaticamente
- [x] 7.3 Conferir a tela no navegador nos dois idiomas: seção nova na sidebar, conversão em tempo real, nota de base e inversão de sentido
- [x] 7.4 Conferir que o campo recusa letra na digitação e que os painéis são de uma linha só
- [x] 7.5 `openspec validate add-data-size-conversion --strict`
