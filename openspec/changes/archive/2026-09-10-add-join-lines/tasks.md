## 1. Motor

- [x] 1.1 Criar `web/src/lib/engines/lines.ts` com o mapa `SEPARATORS` de identificador (`none`, `space`, `comma`, `comma-space`, `semicolon`, `pipe`, `tab`) para o caractere correspondente
- [x] 1.2 Implementar o motor `joinLines(input, options)` como `Engine` puro, na ordem separar → aparar → descartar vazias → juntar, usando `split(/\r\n|\r|\n/)` para reconhecer os três finais de linha
- [x] 1.3 Garantir que o motor nunca lança: entrada vazia devolve string vazia, linha única devolve a própria entrada, e nenhum `notes` é emitido
- [x] 1.4 Escrever `web/src/lib/engines/lines.test.ts` cobrindo os cenários da spec: três linhas com vírgula + espaço, linha única, entrada vazia, cada um dos sete separadores, separador ausente nas pontas, aparo ligado e desligado, descarte ligado e desligado (`a,,b`), quebra final da entrada, `\r\n`, `\r` e mistura de finais de linha

## 2. Catálogo

- [x] 2.1 Adicionar a entrada `juntar-linhas` em `web/src/lib/operations/format-catalog.ts`, entre `beautifier("json")` e `beautifier("xml")`, com `group: "Formato"`, `execution: "client"`, `kind` padrão de texto e sem `reverse`
- [x] 2.2 Escrever título, subtítulo, descrição e os rótulos de `forward` em português, no tom das entradas existentes do catálogo
- [x] 2.3 Declarar as opções: `separator` (`select`, padrão `none`, sete escolhas), `trim` (`boolean`, padrão desligado) e `dropEmpty` (`boolean`, padrão desligado), cada booleana com `help` dizendo o que muda ao alternar
- [x] 2.4 Definir o `placeholder` com um exemplo de várias linhas que torne o efeito óbvio sem ler o subtítulo
- [x] 2.5 Declarar os `aliases` de busca: `join`, `join lines`, `juntar`, `juntar linhas`, `unir linhas`, `uma linha`, `one line`, `remover quebras`
- [x] 2.6 Registrar o motor em `web/src/lib/operations/registry.ts` sob o slug `juntar-linhas`, apenas com `forward`

## 3. Tradução

- [x] 3.1 Adicionar a entrada `juntar-linhas` em `englishOperations` (`web/src/lib/language.tsx`) com `name`, `title`, `subtitle`, `description` e `forward`, confirmando que ela não é capturada pelo atalho `isFormatter`
- [x] 3.2 Adicionar em `optionTranslations` os rótulos das três opções e os das sete escolhas de separador
- [x] 3.3 Adicionar em `helpTranslations` os textos de ajuda das duas opções booleanas
- [x] 3.4 Verificar, com o idioma em inglês, que nenhum texto da operação nova cai no português — coberto por `src/lib/language.test.ts`, e não a olho

## 4. Interface e verificação

- [x] 4.1 Escrever o teste de interface da rota sem `reverse`: nenhum seletor de sentido renderizado, e opções avançadas, copiar, baixar e rodapé de privacidade presentes — feito com `react-dom/server` num teste `.ts`, sem jsdom nem dependência nova
- [x] 4.2 Verificar que `registry.test.ts` passa — catálogo e motores em dia, rota estática gerada, atalhos da home intactos
- [x] 4.3 Verificar a busca da home pelos termos `join lines`, `remover quebras` e `uma linha` — o casamento saiu de `overview-panel.tsx` para `matchesQuery` em `language.tsx`, o que tornou o vínculo alias↔busca testável
- [x] 4.4 Abrir `/juntar-linhas` no app rodando e conferir a tela: rota servida pelo dev server, sem seletor de sentido, com as três opções, os sete separadores e o rodapé de privacidade. A interação (digitar e ver a saída acompanhar) não foi dirigida por automação — vale um olhar humano
- [x] 4.5 Rodar `npx tsc --noEmit` e a suíte completa de testes
