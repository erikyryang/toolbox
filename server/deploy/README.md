# Implantação do backend

## Garantias que o deploy precisa preservar

| Garantia | Como é sustentada |
|---|---|
| Nada é gravado em disco persistente | `read_only: true` no container; a única montagem gravável é a tmpfs de spool |
| Temporários somem sempre | O spool cria e desvincula o arquivo no mesmo instante: o inode não tem nome enquanto existe, e some quando o processo fecha — inclusive sob `SIGKILL` |
| Nada é cacheado no caminho | `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache` e `Expires: 0` em toda resposta, aplicados por middleware |
| Memória não estoura | `MAX_CONCURRENCY` × `MEM_BUFFER_MAX` + tamanho da tmpfs precisa caber em `mem_limit` |
| Download íntegro | A saída é preparada na tmpfs anônima antes dos cabeçalhos HTTP; falhas retornam JSON de erro, nunca um `200` truncado |

## Dimensionamento

O pior caso de memória é calculável antes do deploy:

    pior_caso = MAX_CONCURRENCY × MEM_BUFFER_MAX + tamanho_da_tmpfs

Com os padrões (4 × 64 MB + 3 GB), o pior caso é ~3,25 GB — daí o `mem_limit: 4g`
com folga para o runtime.

O serviço recebe e processa dados incrementalmente quando o formato permite,
mas a **resposta** não é enviada em streaming estrito: toda compactação e
extração termina primeiro no staging da tmpfs. Essa é a troca que garante que
um erro do codec nunca pareça um download bem-sucedido.

A tmpfs é compartilhada por todas as requisições. Ela comporta tanto entradas
que ultrapassam `MEM_BUFFER_MAX` quanto saídas ainda em staging. Portanto, os
limites por requisição não reservam espaço: sob concorrência, uma operação
válida pode receber `503 spool_cheio` antes de chegar ao seu limite individual.
O cliente deve poder tentar novamente após o `Retry-After`.

Se aumentar `REQUEST_MAX_BYTES`, aumente a tmpfs junto: um corpo entre
`MEM_BUFFER_MAX` e `REQUEST_MAX_BYTES` vai inteiro para lá. Dimensione também
para a maior saída permitida e para a soma de entradas e saídas simultâneas
que se pretende atender; `MAX_CONCURRENCY` limita CPU, mas não reserva espaço
na tmpfs.

## Variáveis

| Variável | Padrão | Efeito |
|---|---|---|
| `REQUEST_MAX_BYTES` | 512 MB | Acima disso, `413` antes de ler o corpo |
| `MEM_BUFFER_MAX` | 64 MB | Até aqui, o conteúdo fica só em memória |
| `SPOOL_DIR` | `/spool` | Onde a camada B e o staging de saída criam (e desvinculam) seus arquivos |
| `REQUEST_TIMEOUT` | 120s | Prazo por requisição; ao expirar, o contexto é cancelado |
| `MAX_CONCURRENCY` | nº de CPUs | Operações caras simultâneas |
| `SEMAPHORE_WAIT` | 5s | Espera por um slot antes de responder `503` |
| `RATE_PER_MINUTE` | 30 | Requisições por origem por minuto |
| `RATE_BURST` | 10 | Estouro instantâneo permitido |
| `ALLOWED_ORIGINS` | vazio | Origens do frontend autorizadas por CORS; o Compose usa `http://localhost:3000` por padrão |

## Limite de taxa e réplicas

O rate limiter fica na memória do processo. Ele é adequado para a única
instância deste Compose, mas cada réplica adicional terá buckets próprios. Em
um deploy horizontal, aplique limite de taxa coordenado no proxy ou gateway de
borda, com uma identidade de cliente que só possa ser definida por proxies
confiáveis. Não use a contagem local como proteção global contra abuso.

## Endpoints

    POST /v1/compress?format=<fmt>&preset=<fast|balanced|max|custom>&level=<n>
    POST /v1/inspect
    POST /v1/extract?entry=<nome>
    GET  /healthz

`compress` recebe `multipart/form-data`; `inspect` e `extract` aceitam o corpo
direto ou multipart.
