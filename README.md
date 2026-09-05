# Toolbox

Utilitários para converter, codificar e compactar dados e arquivos com uma
interface simples, processamento local por padrão e sem contas ou histórico.

## O que oferece

- **Codificação:** Base64, Base32, Base58, hexadecimal, Unicode escape, JWT,
  query strings e conversão de charset.
- **Formatos:** conversões entre JSON, YAML, XML e CSV, além de formatar e
  minificar JSON e XML.
- **Compactação:** ZIP, GZIP, ZSTD, XZ, BZIP2, TAR e extração de ZIP, RAR e
  7Z, entre outros formatos.
- **PT e EN:** a interface começa em português e permite alternar o idioma no
  cabeçalho; a escolha fica apenas no navegador.
- **Tema claro e escuro:** acompanha o sistema até que a pessoa escolha um
  tema.

## Privacidade e processamento

As conversões de texto e os formatos de arquivo compatíveis são processados
inteiramente no navegador. O backend é usado somente quando o arquivo, o
formato ou o nível de compactação exige recursos que o navegador não fornece.

Quando o backend é usado, ele não mantém arquivos, histórico ou cache. Os
temporários ficam em uma área de spool e são descartados ao término da
requisição. Veja os detalhes de capacidade e segurança no
[guia de deploy](server/deploy/README.md).

## Arquitetura

| Parte | Tecnologia | Responsabilidade |
| --- | --- | --- |
| [`web/`](web/) | Next.js, TypeScript e Web Workers | Interface, operações de texto e processamento local de arquivos |
| [`server/`](server/) | Go | Formatos e cargas que precisam do servidor, com limites de tamanho e tempo |
| [`openspec/`](openspec/) | OpenSpec | Escopo e especificações do produto |

## Executar localmente

### Pré-requisitos

- Node.js e npm
- Go 1.25.1 ou Docker com Docker Compose, caso use o backend

### 1. Inicie o backend opcional

Abra um terminal na raiz do projeto:

```bash
cd server
ALLOWED_ORIGINS=http://localhost:3000 go run ./cmd/toolbox-server
```

O servidor escuta em `http://localhost:8080`. No desenvolvimento local, o
spool usa automaticamente um diretório temporário seguro do sistema. Para
usar outro local, informe `SPOOL_DIR=/tmp/toolbox-spool`.

Com Docker:

```bash
cd server/deploy
docker compose up --build
```

### 2. Inicie o frontend

Em outro terminal:

```bash
cd web
npm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080 npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem
`NEXT_PUBLIC_BACKEND_URL`, as ferramentas que funcionam só no navegador
continuam disponíveis.

## Verificação

No frontend:

```bash
cd web
npm run lint
npm run typecheck
npm test
npm run build
```

No backend:

```bash
cd server
go test ./...
go build ./cmd/toolbox-server
```

## Configuração do backend

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `ADDR` | `:8080` | Endereço de escuta |
| `ALLOWED_ORIGINS` | vazio | Origens CORS, separadas por vírgula |
| `REQUEST_MAX_BYTES` | `512 MB` | Tamanho máximo da requisição |
| `MEM_BUFFER_MAX` | `64 MB` | Limite de conteúdo mantido em memória |
| `SPOOL_DIR` | `$TMPDIR/toolbox-spool` | Diretório temporário para arquivos grandes e staging de saída |
| `REQUEST_TIMEOUT` | `120s` | Tempo máximo por requisição |

Para limites de concorrência, capacidade da tmpfs, rate limiting e execução em
produção, consulte o [guia de deploy do backend](server/deploy/README.md).

## Licença

Este projeto ainda não declara uma licença.
