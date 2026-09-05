## Why

Quem trabalha com dados e arquivos no dia a dia recorre a utilitários web dispersos (decodificadores de Base64, conversores JSON/YAML, compactadores online) que quase sempre enviam o conteúdo para um servidor, guardam histórico e não deixam claro o que acontece com o arquivo. Isso inviabiliza o uso com dados sensíveis — tokens, certificados, dumps, payloads de produção.

O **toolbox** existe para ser o utilitário que se pode usar com dado real: uma coleção coesa de operações de codificação, conversão e compactação com **zero persistência** como requisito inegociável, processamento no navegador por padrão e um backend Go mínimo, acionado apenas quando o navegador não dá conta.

## What Changes

- **Novo produto web público** (`toolbox`), sem contas de usuário, sem histórico, sem armazenamento de conteúdo em disco, banco, fila, cache ou CDN.
- **Design system próprio**: paleta quente (fundo claro `#faf9f5`, escuro `#1a1a18`, texto `#1f1e1c`, acento terracota `#c96442`), tipografia com fontes livres (Inter na UI, serifada Newsreader nos títulos, JetBrains Mono no conteúdo técnico), bordas de 1px sem sombras, temas claro e escuro.
- **Shell de operação**: header fino, uma operação por rota (`/base64`, `/json-yaml`, `/zip`, …) para SEO, título serifado + subtítulo, dois painéis mono lado a lado com botão de inversão, conversão em tempo real, opções avançadas atrás de disclosure, erros em texto simples abaixo do campo.
- **Codificação/decodificação client-side**: Base64 (padrão e URL-safe), Hex, URL/percent, HTML entities, JWT decode, Unicode escape, Punycode, Unix timestamp, query string, charset UTF-8/Latin-1, Base58, Base32, PEM↔DER e parser ASN.1.
- **Conversão e formatação**: JSON ↔ YAML ↔ XML ↔ CSV, com beautify e minify.
- **Compactação com controle de nível** no navegador: ZIP, GZIP, ZSTD, TAR e combinações (tar.gz, tar.zst), com presets Rápido / Balanceado / Máxima / Customizado mapeados para o range de cada formato. XZ e BZIP2 só têm compressor no backend; sua descompactação continua no navegador.
- **Descompactação**: ZIP, TAR, GZIP, ZSTD, XZ, BZIP2 no navegador; RAR e 7Z no backend.
- **Backend Go isolado**, acionado apenas para arquivos acima do limite configurável, RAR, 7Z, compressão XZ/BZIP2 e níveis altos de ZSTD — streaming via `io.Reader`/`io.Writer`, container com filesystem read-only, `Cache-Control: no-store`, logs apenas de metadados, rate limiting, limite de tamanho, timeout e semáforo de concorrência.
- **Indicador de privacidade por operação**, que reflete corretamente se o processamento ocorreu no navegador ou no backend.

## Capabilities

### New Capabilities

- `design-system`: tokens de cor, tipografia, espaçamento e foco; temas claro/escuro; regras de contraste AA e componentes base sobre shadcn/ui.
- `operation-workspace`: shell da aplicação — header, rota dedicada por operação, layout de dois painéis com inversão, conversão em tempo real, disclosure de opções avançadas, tratamento de erro inline, responsividade, acessibilidade e SEO.
- `encoding-tools`: operações de codificação/decodificação executadas integralmente no navegador (Base64, Hex, URL, HTML entities, JWT, Unicode escape, Punycode, Unix timestamp, query string, charset, Base58, Base32, PEM↔DER, ASN.1).
- `data-format-conversion`: conversão entre JSON, YAML, XML e CSV, com beautify e minify e preservação de semântica onde os formatos permitirem.
- `client-compression`: compactação e descompactação no navegador, presets e mapeamento de nível por formato, limite de tamanho configurável e roteamento para o backend quando excedido.
- `compression-backend`: serviço Go para arquivos grandes, RAR, 7Z e níveis altos de ZSTD, com streaming, limites operacionais e endurecimento do container.
- `zero-persistence`: garantias transversais de não-persistência — cabeçalhos de resposta, filesystem read-only, remoção garantida de temporários, política de logs e ausência de contas/histórico.

### Modified Capabilities

Nenhuma. O repositório não possui specs em `openspec/specs/`; este é o primeiro conjunto de capacidades do projeto.

## Impact

- **Novo frontend**: aplicação Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, com uma rota por operação e workers/WASM para processamento pesado.
- **Novo backend**: serviço Go isolado, sem estado, exposto por um punhado de endpoints de compressão/descompressão.
- **Dependências novas** (backend): `klauspost/compress` (zstd, gzip, xz, zip), `bodgit/sevenzip` (7Z), `nwaples/rardecode` (RAR).
- **Dependências novas** (frontend): bibliotecas WASM de compressão, parsers de YAML/XML/CSV e utilitários de ASN.1/Base58.
- **Infraestrutura**: container read-only com tmpfs opcional e montagem `noexec`; políticas de cache desativadas em toda resposta que trafegue conteúdo do usuário; observabilidade restrita a métricas e metadados.
- **Riscos principais**: formatos com índice no final (ZIP, RAR, 7Z) impedem streaming puro e exigem buffer limitado; o custo de memória do ZSTD em níveis altos precisa ser contido por semáforo de concorrência.
