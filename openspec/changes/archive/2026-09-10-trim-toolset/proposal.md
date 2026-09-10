## Why

O produto entregue não é mais o produto que as specs descrevem.

Ao longo da branch `refactor/trim-toolset-and-polish-ui`, o toolset foi podado
deliberadamente: hex, JWT, unicode escape, query string e charset saíram
(`30cfe67`), a conversão entre formatos saiu e restaram beautify e minify de
JSON e XML (`7939fd8`), e os formatos de compactação foram estreitados para
ZIP, GZIP, ZSTD e TAR (`5a43f89`), com as dependências órfãs removidas em
seguida (`d51591f`).

Nenhuma dessas remoções foi registrada como change. O resultado é que
`openspec/specs/`, recém-criado pelo arquivamento de `toolbox-mvp`, nasce
exigindo onze ferramentas de codificação que o catálogo não expõe, conversão
para YAML e CSV que não existe, e compressão em XZ e BZIP2 com bibliotecas Go
que não estão no `go.mod`.

Spec que descreve um produto que não existe é pior que spec nenhuma: ela dá
confiança falsa a quem a lê para decidir. Esta change fecha essa distância —
não propõe remover nada, e sim reconhecer o que já foi removido.

## What Changes

- **Onze requisitos de codificação removidos** de `encoding-tools`: Hex, URL e
  percent-encoding, HTML entities, decodificação de JWT, unicode escape,
  punycode, unix timestamp, query string, conversão de charset, conversão PEM
  e DER e parser ASN.1. Ficam Base64, Base32 e Base58 — as três bases que o
  catálogo entrega — e a garantia de execução integralmente no navegador, que
  vale para todas.
- **Conversão entre formatos removida** de `data-format-conversion`: some a
  conversão JSON↔YAML↔XML↔CSV, o aviso de conversão com perda que só existia
  por causa dela, e as opções de CSV. A capacidade passa a ser o que a rota
  faz hoje: beautify e minify de JSON e XML, com indentação configurável.
- **XZ e BZIP2 removidos** de `client-compression` e `compression-backend`.
  Junto vão as bibliotecas `ulikunitz/xz` e `dsnet/compress/bzip2`, que o
  `go.mod` não declara mais como dependência direta.
- **Leitura de ZSTD corrigida para o servidor** em `client-compression`. A
  spec dizia que a descompactação de ZSTD acontece no navegador; a
  implementação a encaminha ao backend desde sempre, porque a lib WASM
  disponível só expõe API síncrona, que aloca a saída inteira antes de a
  guarda anti-bomba poder agir. Aqui a spec passa a dizer o que o código faz.
- **Streaming da resposta corrigido** em `compression-backend`. A spec exigia
  escrever a saída no corpo da resposta conforme os bytes são gerados; o
  serviço faz o oposto de propósito, e o guia de deploy explica por quê — a
  saída inteira é preparada no staging da tmpfs antes do primeiro cabeçalho,
  para que uma falha do codec vire erro HTTP em vez de um `200` truncado.
  Encontrado ao reescrever o requisito para tirar XZ e BZIP2 dele.
- **Nenhuma mudança de comportamento.** Todo o código desta change já está na
  branch; o que falta é remover os motores órfãos que sobraram sem rota.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `encoding-tools`: reduzida às três bases entregues pelo catálogo.
- `data-format-conversion`: deixa de ser conversão entre formatos e passa a
  ser formatação de JSON e XML.
- `client-compression`: formatos alinhados a ZIP, GZIP, ZSTD e TAR na
  compactação e a ZIP, TAR e GZIP na descompactação local.
- `compression-backend`: escopo e bibliotecas alinhados aos formatos que
  restaram.

## Impact

- **Specs**: quatro capacidades editadas; nenhuma criada, nenhuma apagada.
- **Código já entregue**: `web/src/lib/operations/encoding-catalog.ts`,
  `format-catalog.ts`, `compression-catalog.ts`, `registry.ts` e os motores
  correspondentes, além de `web/src/lib/compression/formats.ts` e do
  `archive` do backend Go.
- **Código pendente**: seis motores continuam em `web/src/lib/engines/` sem
  rota que os alcance — `asn1.ts`, `html-entities.ts`, `pem-der.ts`,
  `punycode-idna.ts`, `timestamp.ts` e `url.ts`, com os testes que os
  acompanham. São a última sobra da poda.
- **Fora de escopo**: o que a branch *acrescentou* — script Python por
  formato, extração a partir de texto colado, arrastar e soltar, busca por
  aliases, rotas simétricas de compactar e extrair — não tem spec e não entra
  aqui. É change própria, com deltas de ADDED.
