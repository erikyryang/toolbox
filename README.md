# Toolbox

Ferramentas para compressão, conversão e codificação de dados. O projeto é
dividido em um frontend Next.js e um backend Go opcional para operações que não
rodam no navegador.

## Pré-requisitos

- Node.js e npm
- Go 1.25.1 ou Docker com Docker Compose

## Rodar em desenvolvimento

Abra dois terminais na raiz do projeto.

### 1. Backend

Com Go instalado:

```bash
cd server
ALLOWED_ORIGINS=http://localhost:3000 go run ./cmd/toolbox-server
```

O backend ficará disponível em `http://localhost:8080`. Para verificar:

```bash
curl http://localhost:8080/healthz
```

Alternativamente, usando Docker Compose:

```bash
cd server/deploy
docker compose up --build
```

### 2. Frontend

Em outro terminal:

```bash
cd web
npm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080 npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_BACKEND_URL` é opcional. Sem ela, as operações que exigem o
backend ficam indisponíveis, mas as operações executadas inteiramente no
navegador continuam funcionando.

## Comandos úteis

No diretório `web/`:

```bash
npm run build       # build de produção
npm run start       # inicia o build de produção
npm run lint        # verifica o lint
npm run typecheck   # verifica os tipos TypeScript
npm test            # executa os testes
```

No diretório `server/`:

```bash
go test ./...       # executa os testes do backend
go build ./cmd/toolbox-server
```

## Configuração do backend

O backend usa `:8080` por padrão. As principais variáveis de ambiente são:

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `ADDR` | `:8080` | Endereço de escuta |
| `ALLOWED_ORIGINS` | vazio | Origens CORS, separadas por vírgula |
| `REQUEST_MAX_BYTES` | `512 MB` | Tamanho máximo da requisição |
| `MEM_BUFFER_MAX` | `64 MB` | Limite de conteúdo mantido em memória |
| `SPOOL_DIR` | diretório temporário do sistema + `/toolbox-spool` | Diretório temporário para arquivos maiores e para preparar respostas antes do download |
| `REQUEST_TIMEOUT` | `120s` | Tempo máximo por requisição |

No modo local, o diretório de spool é criado e validado na inicialização. Para
escolher outro local, use por exemplo `SPOOL_DIR=/tmp/toolbox-spool`. O backend
não persiste os arquivos processados. A configuração completa de deploy está
em [`server/deploy/README.md`](server/deploy/README.md).
