## Context

O toolbox é um utilitário web público, sem contas e sem histórico, para codificar, converter e compactar dados e arquivos. O produto vive ou morre por uma promessa: **nada do que o usuário coloca na tela é persistido em lugar nenhum**. Isso restringe a arquitetura antes de qualquer decisão de conveniência.

Estado atual: repositório vazio, sem specs prévias. Tudo é greenfield.

Restrições que moldam o desenho:

- Frontend Next.js (App Router) + TypeScript + Tailwind + shadcn/ui; backend Go isolado.
- Zero persistência: nenhum conteúdo de usuário em disco, banco, fila, cache ou CDN.
- O backend só entra em cena quando o navegador não dá conta: arquivos acima do limite, RAR, 7Z e níveis altos de ZSTD.
- Uma rota dedicada por operação, para SEO.
- Estética minimalista e quente, com tipografia serifada nos títulos e mono no conteúdo técnico, usando apenas fontes livres.

## Goals / Non-Goals

**Goals:**

- Processar por padrão no navegador; o backend é exceção explícita e sinalizada ao usuário.
- Tornar a não-persistência verificável — não apenas prometida — por decisões estruturais (filesystem read-only, ausência de storage layer, política de logs).
- Um sistema de tokens de design único, consumido por Tailwind e shadcn/ui, que garanta contraste AA nos dois temas sem ajustes manuais por componente.
- Streaming de ponta a ponta onde o formato permitir; buffer limitado e previsível onde não permitir.
- Latência percebida próxima de zero nas operações de texto: conversão em tempo real, sem botão "converter".

**Non-Goals:**

- Contas, histórico, links compartilháveis de resultado, ou qualquer forma de retomada de sessão.
- Criação de arquivos RAR (apenas leitura) — não há encoder livre viável.
- Edição de arquivos dentro de containers (abrir um ZIP, trocar um arquivo, reempacotar) no MVP.
- Processamento assíncrono com fila de jobs — incompatível com zero persistência.
- Internacionalização além do idioma inicial.

## Decisions

### 1. Fronteira client/backend: limite de tamanho configurável, não heurística

O roteamento entre WASM e backend é decidido por três regras explícitas, avaliadas na ordem:

1. Formato exige backend (RAR, 7Z) → backend.
2. Nível de compressão ZSTD acima do teto client-side (`ZSTD_CLIENT_MAX_LEVEL`, default 12) → backend.
3. Tamanho de entrada acima de `NEXT_PUBLIC_CLIENT_MAX_BYTES` (default 100 MB) → backend.

Caso contrário, WASM no navegador.

**Por quê**: uma regra determinística é auditável e explicável na UI ("esta operação vai usar o servidor porque o arquivo tem 180 MB"). O indicador de privacidade depende dessa decisão ser tomada *antes* do processamento, não descoberta durante.

**Alternativas consideradas**: heurística por tempo estimado de CPU (imprevisível entre dispositivos, e impossível de comunicar honestamente); tentar sempre no cliente e cair para o backend em caso de OOM (o crash da aba já perdeu o trabalho do usuário, e o fallback silencioso quebraria o indicador de privacidade).

### 2. Streaming vs. buffer para formatos com índice no final

Este é o trade-off central do backend.

**O problema**: GZIP, ZSTD, XZ, BZIP2 e TAR são sequenciais — um `io.Reader` entra, um `io.Writer` sai, memória constante. ZIP, RAR e 7Z guardam o diretório de entradas **no fim do arquivo**, e as APIs de leitura (`archive/zip`, `bodgit/sevenzip`, `nwaples/rardecode`) exigem `io.ReaderAt` — ou seja, a capacidade de voltar atrás. Não é possível descompactar esses formatos a partir de um stream puro sem materializar o conteúdo em algum lugar.

**Decisão — política em três camadas, por tamanho:**

| Camada | Faixa | Mecanismo |
|---|---|---|
| A | ≤ `MEM_BUFFER_MAX` (default 64 MB) | `bytes.Reader` em memória; nada toca o filesystem |
| B | `MEM_BUFFER_MAX` < tamanho ≤ `REQUEST_MAX_BYTES` (default 512 MB) | arquivo em **tmpfs** (`/spool`, montada `rw,noexec,nosuid,size=…`), criado com `os.CreateTemp` seguido de `os.Remove` **imediato** enquanto o descritor segue aberto |
| C | > `REQUEST_MAX_BYTES` | rejeitado com `413`, antes de ler o corpo |

O padrão *create-then-unlink* da camada B é o ponto importante: o inode fica sem nome no diretório desde o primeiro instante, o conteúdo vive apenas enquanto o handle existe e some quando o processo fecha o descritor — inclusive se o processo for morto com `SIGKILL`. Não depende de `defer` executar, não depende de o container terminar limpo, e nunca é visível para outro processo por caminho. A tmpfs é RAM: nada chega ao disco físico.

**Por que não só memória**: um pico de 512 MB por requisição concorrente derruba o serviço; a camada B troca RSS por páginas de tmpfs, que o kernel gerencia sob pressão.

**Por que não só tmpfs**: para a esmagadora maioria das requisições (arquivos pequenos), tocar o filesystem — mesmo virtual — é superfície de risco sem ganho.

**Compactação** é o caso feliz e assimétrico: escrever ZIP e TAR é sequencial, então a criação de qualquer formato suportado usa streaming direto para o `http.ResponseWriter` com memória constante. A restrição de buffer vale apenas para **leitura** de ZIP/RAR/7Z.

**Trade-off aceito**: sem o índice, não é possível dar `Content-Length` na resposta de compactação; usamos `Transfer-Encoding: chunked` e o navegador mostra download sem barra de progresso determinada. Preferimos isso a bufferizar o resultado inteiro para medir.

### 3. Design tokens: uma fonte, três consumidores

Os tokens vivem em **um único arquivo TypeScript** (`tokens.ts`), exportando primitivas (paleta crua, escala tipográfica, espaçamento) e **tokens semânticos** (`surface`, `surface-raised`, `text`, `text-muted`, `border`, `accent`, `accent-foreground`, `focus-ring`, `danger`). Desse arquivo derivam:

1. **CSS custom properties** geradas em build para `:root` e `[data-theme="dark"]`.
2. **Tema Tailwind**, que referencia as custom properties — nunca hex literal em classe utilitária.
3. **Variáveis do shadcn/ui** (`--background`, `--foreground`, `--primary`, …), mapeadas aos tokens semânticos para que os componentes prontos herdem a identidade sem fork.

**Regra dura**: componentes consomem apenas tokens semânticos. Um hex ou uma primitiva em código de componente é falha de lint.

**Por quê**: o requisito de tema claro/escuro com contraste AA só é sustentável se a troca de tema for troca de valores de token, não `dark:` espalhado por centenas de classes. E o mapeamento explícito para as variáveis do shadcn evita o cenário comum de "o componente novo veio com a cor errada".

**Alternativa considerada**: só as CSS variables do shadcn, sem camada própria. Rejeitada porque o vocabulário do shadcn (`primary`, `secondary`, `muted`, `card`, `popover`) não descreve esta interface — não há cards com sombra, não há popovers coloridos, e `accent` aqui tem significado restrito (apenas ações primárias) que `primary` não comunica.

**Escolha tipográfica**: Inter (UI) + Newsreader (títulos de seção) + JetBrains Mono (conteúdo técnico), todas com licença livre, servidas localmente via `next/font/local` com `font-display: swap` e stack de fallback métrico-compatível. Sem CDN de fontes — coerente com a política de não vazar tráfego do usuário para terceiros.

### 4. Uma rota por operação, com o motor fora da rota

Cada operação tem sua rota (`/base64`, `/jwt-decode`, `/json-to-yaml`, `/gzip`, …) com metadata própria para SEO, e todas montam o **mesmo** componente de workspace, parametrizado por um descritor de operação:

```
{ id, slug, título, subtítulo, motor, opções, direção reversível?, execução: 'client' | 'auto' }
```

O motor de cada operação é uma função pura `(entrada, opções) => resultado | erro`, sem dependência de React. Isso mantém os motores testáveis isoladamente e permite mover um deles para um Web Worker sem tocar na UI.

**Por quê**: a alternativa (uma página genérica com abas ou query params) mata o SEO e contraria a regra "uma operação por tela".

### 5. Execução: main thread para texto, worker para binário

Operações de texto rodam síncronas na main thread com debounce de ~120 ms — Base64 e JSON são triviais em qualquer tamanho plausível colado à mão. Compactação WASM e parsing de arquivos rodam em **Web Worker**, com transferência de `ArrayBuffer` por transferência de posse (zero cópia). O worker é criado sob demanda e terminado ao sair da rota, para que o módulo WASM não fique residente.

### 6. Zero persistência como propriedade estrutural

- Backend **sem camada de storage**: nenhum client de banco, cache ou fila entra no `go.mod`. O que não existe não pode ser usado por engano.
- Container com `read_only: true`; a única montagem gravável é a tmpfs de spool, com `noexec,nosuid`.
- Toda resposta que trafega conteúdo do usuário carrega `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache` e `Expires: 0`, aplicados por middleware — não por handler, para que não haja rota esquecida.
- Logs estruturados com **allowlist de campos** (`operation`, `format`, `bytes_in`, `bytes_out`, `level`, `duration_ms`, `status`). Nome de arquivo e conteúdo nunca entram no logger; o tipo do evento de log não tem campo capaz de carregá-los.
- Sem `Referrer-Policy` permissiva e sem analytics de terceiros nas rotas de operação.

### 7. Proteções operacionais do backend

Rate limiting por IP (token bucket), `REQUEST_MAX_BYTES` verificado por `http.MaxBytesReader` antes de qualquer leitura, timeout por requisição via `context.WithTimeout`, e um **semáforo de concorrência** (`chan struct{}` dimensionado por CPU) na frente das operações caras. ZSTD nível 19–22 aloca centenas de MB por operação; sem semáforo, três requisições simultâneas derrubam o pod. Requisição que não adquire o semáforo dentro do prazo recebe `503` com `Retry-After`, em vez de enfileirar indefinidamente.

## Risks / Trade-offs

- **Buffer para ZIP/RAR/7Z contraria o ideal de streaming puro** → mitigado pela política de três camadas: memória para o caso comum, tmpfs com unlink imediato para o caso grande, rejeição explícita acima do teto. O conteúdo nunca alcança disco persistente.
- **tmpfs consome RAM do nó** → `size=` explícito na montagem, somado ao teto de concorrência, limita o pior caso a um valor calculável antes do deploy.
- **ZSTD em nível alto é um vetor de exaustão de CPU/memória** → semáforo, timeout e teto de tamanho; níveis 19+ só existem no backend, nunca no WASM do navegador.
- **Bombas de descompressão (zip bomb)** → limite de razão de expansão e de bytes de saída acumulados, verificados durante a extração, com aborto ao ultrapassar; vale igualmente no cliente e no backend.
- **WASM de compressão é pesado (centenas de KB)** → carregado sob demanda por rota, nunca no bundle inicial; as rotas de encoding, que são a maioria do tráfego, não pagam esse custo.
- **Navegadores antigos ou memória insuficiente no dispositivo** → o limite client-side é configurável e conservador; ao ultrapassá-lo a operação vai para o backend com o indicador de privacidade atualizado.
- **O indicador de privacidade pode mentir se a decisão de roteamento e a UI divergirem** → a decisão de roteamento é retornada pelo mesmo objeto de resultado que alimenta o indicador; não há caminho de código em que uma exista sem a outra.
- **Conversões entre formatos com semânticas diferentes perdem informação** (YAML com âncoras, XML com atributos e namespaces, CSV sem tipos) → o comportamento de cada par é normativo nas specs e a UI avisa quando a conversão é lossy, em vez de falhar silenciosamente.
- **Fidelidade dos decoders de RAR e 7Z em Go** é menor que a das ferramentas nativas para variantes exóticas → erro explícito e legível quando o formato não é suportado, jamais saída parcial apresentada como completa.

## Migration Plan

Não há sistema anterior nem dados a migrar. O rollout é por fases, cada uma implantável de forma independente:

1. **Fase 1** entrega o design system e as operações de encoding essenciais — frontend puro, deploy estático/edge, sem backend.
2. **Fase 2** amplia o catálogo de operações client-side; continua sem backend.
3. **Fase 3** adiciona compactação client-side via WASM; ainda sem backend, com as operações fora do alcance do navegador desabilitadas e sinalizadas.
4. **Fase 4** sobe o serviço Go e habilita o roteamento automático.

Rollback: como as fases 1–3 não dependem do backend, uma falha na fase 4 é revertida desabilitando a flag de roteamento — o produto volta a ser inteiramente client-side, com as operações de backend indisponíveis, sem perda de funcionalidade das demais.

## Open Questions

- Valor definitivo de `NEXT_PUBLIC_CLIENT_MAX_BYTES`: 100 MB é o ponto de partida; precisa de medição real de consumo de memória em dispositivos móveis antes de fixar.
- Se compactação de múltiplos arquivos com estrutura de pastas (arrastar uma pasta inteira) entra antes ou depois do backend.
- Se o parser ASN.1 deve ganhar árvore navegável, agora que o dump indentado está no ar.

## Decisões tomadas durante a implementação

### Bibliotecas de compactação client-side (fase 3)

Medição em 5 MB de texto semi-comprimível, neste hardware:

| Formato / nível | Saída | Comprime | Descomprime | Razão |
|---|---|---|---|---|
| gzip 1 | 251 KB | 45 ms | 18 ms | 20× |
| gzip 9 | 168 KB | 393 ms | 12 ms | 31× |
| zip 6 | 167 KB | 316 ms | 29 ms | 31× |
| zstd 1 | 129 KB | 12 ms | 4 ms | 40× |
| zstd 3 | 88 KB | 5 ms | 2 ms | 58× |
| zstd 12 | 16 KB | 27 ms | 1 ms | 324× |

Escolhas:

- **ZIP, GZIP, DEFLATE — `fflate` (JavaScript, não WASM).** É mais rápido que os builds WASM de deflate disponíveis e não paga carregamento de módulo. O design falava em WASM como mecanismo; o requisito real é processar no navegador, e aqui o JavaScript entrega isso melhor.
- **ZSTD — `@bokuweb/zstd-wasm`.** Comprime e descomprime, cobre o range 1–22, e é uma ordem de grandeza mais rápido que o gzip com razão melhor. O módulo é inicializado **uma única vez por sessão**: um segundo `init()` recria a instância e zera a memória sob os resultados já devolvidos, que voltariam do tamanho certo e cheios de zeros.
- **TAR — implementação própria (~150 linhas).** As bibliotecas de TAR do npm são construídas sobre streams do Node; trazê-las custaria mais polyfill do que o formato inteiro custa em código.
- **XZ — `xz-decompress`; BZIP2 — `bz2`.** Ambas só descomprimem. **Não existe compressor mantido de XZ ou BZIP2 para o navegador**, então a compactação nesses dois formatos passa a ser responsabilidade do backend, junto com RAR e 7Z. A descompactação segue local.
- **Listagem de ZIP — leitura própria do diretório central.** Permite mostrar nome, tamanho original e tamanho comprimido sem descomprimir um byte, e é o que torna a extração seletiva possível.

### Piso absoluto na proteção contra bomba de descompressão

A primeira versão do guarda abortava sempre que a razão de expansão passava de 200×. O benchmark acima derrubou essa regra: ZSTD nível 12 comprime 5 MB honestos para 16 KB, o que dá 324× — o guarda recusava um arquivo comum.

A razão passou a valer **apenas depois de um piso absoluto de saída** (`RATIO_CHECK_FLOOR_BYTES`, 32 MB por padrão), com o limite de razão em 500×. O que caracteriza uma bomba não é a razão alta, é a razão alta com saída grande; abaixo do piso, o teto absoluto de bytes já protege. Uma bomba clássica expande bilhões de vezes e continua sendo barrada.

### Acento de marca e contraste AA (fase 1)

O acento `#c96442` não alcança 4.5:1 contra fundo nenhum: 3.90:1 com texto claro, 4.27:1 com texto escuro. Como contraste AA também é requisito, o acento permanece como valor de marca nos usos **não textuais** — anel de foco e indicadores, onde 3:1 basta e ele passa — enquanto superfícies que carregam texto usam tons adjacentes do mesmo matiz: `#b4553a` no preenchimento de ação primária (4.63:1 com o rótulo) e `#a34a30` / `#e08a6c` no texto em acento. A verificação automatizada de contraste cobre os dois temas e falhou de fato durante a implementação, quando o hover do tema escuro tentou usar o valor de marca.

### Descritor de operação partido em duas camadas

O descritor único descrito acima não sobrevive ao limite servidor/cliente: funções não são serializáveis, e o header — que é servidor — precisa da lista de operações. O catálogo virou **dados puros** (`catalog.ts`), consumido por header, página inicial e metadados de SEO, e os motores passaram a viver num registro à parte (`registry.ts`), importado só por quem executa. Efeito colateral bem-vindo: nenhuma rota carrega o código de motor que não usa.

### Bibliotecas do backend (fase 4)

`klauspost/compress` cobre ZSTD, GZIP, DEFLATE e ZIP — este último com um fork
de `archive/zip` que aceita compressor customizado, e é por isso que o nível
escolhido chega ao conteúdo das entradas. O que ele **não** tem é XZ nem BZIP2:
XZ ficou com `ulikunitz/xz` e BZIP2 com `dsnet/compress/bzip2` (o
`compress/bzip2` da biblioteca padrão só lê). Leitura de 7Z com
`bodgit/sevenzip` e de RAR com `nwaples/rardecode/v2`, como planejado.

### Presets espelhados nos dois lados

O mapa de preset → nível existe duas vezes, em TypeScript e em Go, e um teste
de cada lado fixa os mesmos valores. Se divergissem, o mesmo botão produziria
arquivos diferentes conforme o tamanho da entrada tivesse mandado a operação
para o navegador ou para o servidor — o tipo de inconsistência que ninguém
percebe até precisar reproduzir um resultado.

### CORS fechado por padrão

Frontend e backend vivem em origens diferentes, então o navegador exige CORS.
A lista de origens é explícita e o padrão é vazio: um serviço que recebe
conteúdo sensível não deve aceitar requisição de qualquer página. Sem
`ALLOWED_ORIGINS`, só mesma origem passa.

### Verificação da promessa de não-persistência

As três afirmações centrais do projeto foram verificadas em processo real, não
apenas em teste unitário:

- Durante o upload de 100 MB, `lsof` mostra o descritor aberto sobre
  `spool/toolbox-…` enquanto `ls` no mesmo diretório lista **zero** nomes: o
  inode existe sem nome, exatamente como o create-then-unlink promete.
- Depois de `kill -9` no meio da requisição, o diretório continua vazio.
- Os logs de uma operação com nome e conteúdo distintivos não contêm nenhum
  dos dois — só `operation`, `format`, `bytes_in`, `bytes_out`, `level`,
  `duration_ms` e `status`.
