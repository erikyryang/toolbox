## 1. Fase 1 — Fundação e design system

- [x] 1.1 Inicializar o projeto Next.js (App Router) com TypeScript, Tailwind e ESLint
- [x] 1.2 Instalar e configurar shadcn/ui apontando para as variáveis de tema do projeto
- [x] 1.3 Criar `tokens.ts` com primitivas (paleta quente, escala tipográfica, espaçamento) e tokens semânticos (`surface`, `surface-raised`, `text`, `text-muted`, `border`, `accent`, `accent-foreground`, `focus-ring`, `danger`)
- [x] 1.4 Gerar as CSS custom properties de `:root` e `[data-theme="dark"]` a partir de `tokens.ts` e ligá-las ao tema do Tailwind
- [x] 1.5 Mapear as variáveis do shadcn/ui (`--background`, `--foreground`, `--primary`, …) aos tokens semânticos
- [x] 1.6 Adicionar regra de lint que rejeita hexadecimais e primitivas de cor em código de componente
- [x] 1.7 Carregar Inter, Newsreader e JetBrains Mono localmente via `next/font/local`, com fallback métrico e sem CDN externa
- [x] 1.8 Implementar o alternador de tema com preferência do sistema por padrão, persistência local e sem flash na primeira pintura
- [x] 1.9 Escrever a verificação automatizada de contraste sobre todas as combinações declaradas de token, falhando abaixo de AA
- [x] 1.10 Construir o header fino com nome "toolbox", seletor de operações e alternador de tema
- [x] 1.11 Definir o descritor de operação (`id`, `slug`, título, subtítulo, motor, opções, reversibilidade, modo de execução) e o registro central de operações
- [x] 1.12 Construir o componente de workspace: título serifado + subtítulo, dois painéis mono, botão de inversão, disclosure de opções avançadas, ações copiar e baixar
- [x] 1.13 Implementar recálculo em tempo real com debounce, sem botão "converter"
- [x] 1.14 Implementar erros inline em texto simples abaixo do campo de origem
- [x] 1.15 Implementar o rodapé de privacidade lendo o local de processamento do próprio resultado da operação
- [x] 1.16 Aplicar o layout responsivo (empilhamento dos painéis) e a largura máxima de ~1100px
- [x] 1.17 Garantir navegação por teclado com foco visível em todos os controles do workspace
- [x] 1.18 Gerar metadados de SEO por rota a partir do descritor de operação
- [x] 1.19 Implementar os motores de Base64 (padrão e URL-safe, padding opcional), Hex, URL/percent e HTML entities, como funções puras testadas
- [x] 1.20 Criar as rotas dedicadas das quatro operações da fase 1 e ligá-las ao workspace
- [x] 1.21 Escrever os testes de unidade dos motores da fase 1, cobrindo os cenários das specs, incluindo entradas inválidas

## 2. Fase 2 — Operações de dev/web, cripto e conversão de formatos

- [x] 2.1 Implementar o motor de decodificação de JWT com header, payload, claims temporais legíveis e aviso explícito de assinatura não verificada
- [x] 2.2 Implementar o motor de Unicode escape nos estilos `\uXXXX`, `\u{XXXXX}` e `\xXX`, com pares substitutos corretos
- [x] 2.3 Implementar o motor de Punycode/IDNA por rótulo, nas duas direções
- [x] 2.4 Implementar o motor de Unix timestamp com detecção de segundos/milissegundos, saída em UTC e fuso local, e ação de instante atual
- [x] 2.5 Implementar o motor de query string preservando chaves repetidas, com ordenação opcional
- [x] 2.6 Implementar o motor de conversão de charset UTF-8 ↔ Latin-1 sinalizando caracteres não representáveis e sua posição
- [x] 2.7 Implementar os motores de Base32 e Base58 (alfabeto Bitcoin), com erros para caracteres fora do alfabeto
- [x] 2.8 Implementar o motor de conversão PEM ↔ DER com rótulo configurável e quebra em 64 colunas
- [x] 2.9 Implementar o parser ASN.1 (DER) com hierarquia indentada, nomes de OIDs conhecidos e erro por deslocamento em bytes truncados
- [x] 2.10 Implementar os motores de conversão JSON ↔ YAML ↔ XML ↔ CSV, preservando a ordem das chaves
- [x] 2.11 Implementar os avisos de conversão com perda (âncoras YAML, atributos e namespaces XML, achatamento para CSV)
- [x] 2.12 Implementar beautify e minify de JSON e XML com indentação configurável
- [x] 2.13 Implementar as opções de CSV (delimitador, cabeçalho, citação) com tratamento correto de campos citados
- [x] 2.14 Implementar erros de parsing com linha e coluna, ou caminho do nó
- [x] 2.15 Criar as rotas dedicadas de todas as operações da fase 2
- [x] 2.16 Escrever os testes dos motores da fase 2, incluindo ida e volta e casos de perda de informação

## 3. Fase 3 — Compactação client-side

- [x] 3.1 Avaliar e escolher as bibliotecas WASM de ZIP, GZIP, ZSTD, XZ, BZIP2 e TAR, medindo peso de bundle e throughput
- [x] 3.2 Montar a infraestrutura de Web Worker com carregamento sob demanda do WASM, transferência de `ArrayBuffer` por posse e término do worker ao sair da rota
- [x] 3.3 Implementar a compactação client-side dos formatos suportados, incluindo tar.gz e tar.zst
- [x] 3.4 Implementar a descompactação client-side de ZIP, TAR, GZIP, ZSTD, XZ e BZIP2
- [x] 3.5 Implementar a listagem de entradas de containers (nome, tamanho original e comprimido) antes da extração, com extração seletiva
- [x] 3.6 Implementar os presets Rápido / Balanceado / Máxima / Customizado com mapeamento por formato (ZSTD 1–22, GZIP 1–9, XZ 0–9) e exibição do nível efetivo
- [x] 3.7 Implementar a regra determinística de roteamento (formato, nível, tamanho) com `NEXT_PUBLIC_CLIENT_MAX_BYTES` e `ZSTD_CLIENT_MAX_LEVEL` configuráveis
- [x] 3.8 Sinalizar na interface, antes de qualquer envio, quando a operação usará o servidor, com o motivo
- [x] 3.9 Desabilitar e explicar as operações que dependem do backend enquanto a fase 4 não estiver no ar
- [x] 3.10 Implementar indicação de atividade e cancelamento com liberação de memória do worker
- [x] 3.11 Implementar a proteção contra bomba de descompressão (razão de expansão e teto de bytes de saída)
- [x] 3.12 Implementar detecção de formato por assinatura, com erro nomeando o formato detectado ou a variante não suportada
- [x] 3.13 Criar as rotas dedicadas das operações de compactação e descompactação
- [x] 3.14 Escrever testes de ida e volta por formato e por preset, e testes das regras de roteamento

## 4. Fase 4 — Backend Go

- [x] 4.1 Inicializar o módulo Go com `klauspost/compress`, `bodgit/sevenzip` e `nwaples/rardecode`, sem qualquer client de banco, cache ou fila
- [x] 4.2 Montar o servidor HTTP com os endpoints restritos ao escopo de backend (arquivos grandes, RAR, 7Z, ZSTD em nível alto)
- [x] 4.3 Implementar o middleware de cabeçalhos `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache` e `Expires: 0` em todas as rotas de conteúdo
- [x] 4.4 Implementar o logger estruturado com allowlist de campos, cujo tipo de evento não admite nome de arquivo nem conteúdo
- [x] 4.5 Implementar o caminho de streaming (`io.Reader`/`io.Writer`) para GZIP, ZSTD, XZ, BZIP2 e TAR, com memória constante e escrita chunked na resposta
- [x] 4.6 Implementar a política de buffer em três camadas: memória até `MEM_BUFFER_MAX`, tmpfs com create-then-unlink imediato até `REQUEST_MAX_BYTES`, e rejeição `413` acima
- [x] 4.7 Implementar a leitura de ZIP, RAR e 7Z sobre o `io.ReaderAt` fornecido pela camada de buffer
- [x] 4.8 Implementar a compressão ZSTD em níveis altos com o mapeamento de presets alinhado ao do cliente
- [x] 4.9 Aplicar `http.MaxBytesReader` antes de qualquer leitura do corpo
- [x] 4.10 Implementar timeout por requisição via `context.WithTimeout`, com liberação de buffers e descritores no cancelamento
- [x] 4.11 Implementar o semáforo de concorrência para operações caras, com `503` e `Retry-After` ao não adquirir no prazo
- [x] 4.12 Implementar rate limiting por origem, com `429` e `Retry-After` antes de processar o conteúdo
- [x] 4.13 Implementar a proteção contra bomba de descompressão também no backend
- [x] 4.14 Padronizar as mensagens de erro para não ecoar nome de arquivo, conteúdo ou caminho interno, incluindo o caso de arquivos criptografados
- [x] 4.15 Escrever o Dockerfile e o manifesto com filesystem raiz somente leitura e tmpfs de spool com `size`, `noexec` e `nosuid`
- [x] 4.16 Ligar o cliente ao backend na regra de roteamento, atualizando o indicador de privacidade para processamento no servidor
- [x] 4.17 Escrever testes de integração por formato, incluindo RAR e 7Z, e testes dos limites de tamanho, timeout, semáforo e rate limiting
- [x] 4.18 Escrever o teste que verifica a ausência de arquivos temporários acessíveis após sucesso, erro e encerramento abrupto
- [x] 4.19 Verificar em teste que toda resposta de conteúdo carrega os cabeçalhos de no-store e que nenhum log contém nome de arquivo ou conteúdo
