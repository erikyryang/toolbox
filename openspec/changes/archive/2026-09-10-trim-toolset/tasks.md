## 1. Registro das remoções nas specs

- [x] 1.1 Arquivar `toolbox-mvp` e `add-join-lines` para que `openspec/specs/` exista e passe a ser a spec vigente
- [x] 1.2 Escrever o delta de `encoding-tools` com as onze remoções, cada uma com `Reason` e `Migration`
- [x] 1.3 Escrever o delta de `data-format-conversion` removendo conversão entre formatos, aviso de perda e opções de CSV, e ajustando a preservação de ordem de chaves ao contexto de beautify
- [x] 1.4 Escrever o delta de `client-compression` alinhando formatos, presets e roteamento, incluindo a leitura de ZSTD pelo servidor
- [x] 1.5 Escrever o delta de `compression-backend` alinhando escopo e bibliotecas, e corrigindo o requisito de streaming da resposta
- [x] 1.6 Substituir o `Purpose` "TBD" das oito capacidades por uma descrição real

## 2. Código já entregue na branch

- [x] 2.1 Remover hex, JWT, unicode escape, query string e charset do catálogo e dos motores (`30cfe67`)
- [x] 2.2 Remover a conversão entre formatos, mantendo beautify e minify de JSON e XML (`7939fd8`)
- [x] 2.3 Estreitar os formatos de compactação para ZIP, GZIP, ZSTD e TAR (`5a43f89`)
- [x] 2.4 Remover as dependências que ficaram sem uso após as remoções (`d51591f`)

## 3. Motores órfãos

- [x] 3.1 Remover `web/src/lib/engines/asn1.ts`, `html-entities.ts`, `pem-der.ts`, `punycode-idna.ts`, `timestamp.ts` e `url.ts`
- [x] 3.2 Remover os testes que só existem para eles: `html-entities.test.ts` e `url.test.ts`
- [x] 3.3 Recortar `phase2.test.ts`, que cobre motores removidos junto com Base32 e Base58, preservando os blocos das duas bases em `base32-58.test.ts` — o nome que segue a convenção dos demais testes de motor
- [x] 3.4 Remover `punycode` e `@types/punycode` do `package.json`, usados apenas por `punycode-idna.ts`

## 4. Verificação

- [x] 4.1 `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` em `web/`
- [x] 4.2 `openspec validate trim-toolset --strict`
- [x] 4.3 Confirmar que nenhum slug do catálogo perdeu motor: `registry.test.ts` cobre o vínculo
