# Toolbox

Utilities for converting, encoding, and compressing data and files, with a
simple interface, browser-first processing, and no accounts or history.

## Features

- **Encoding:** Base64, Base32, Base58, hexadecimal, Unicode escape, JWT,
  query strings, and charset conversion.
- **Formats:** conversion between JSON, YAML, XML, and CSV, plus JSON and XML
  formatting and minification.
- **Compression:** ZIP, GZIP, ZSTD, XZ, BZIP2, TAR, and extraction for ZIP,
  RAR, 7Z, and other formats.
- **Portuguese and English:** the interface starts in Portuguese and can be
  switched from the header. The preference stays only in the browser.
- **Light and dark themes:** follows the system setting until a theme is
  selected.

## Privacy and processing

Text conversions and supported file formats run entirely in the browser. The
backend is used only when a file, format, or compression level needs resources
that the browser cannot provide.

When the backend is used, it does not keep files, history, or cache. Temporary
files live in a spool area and are discarded when the request ends. See the
[deployment guide](server/deploy/README.md) for capacity and security details.

## Architecture

| Part | Technology | Responsibility |
| --- | --- | --- |
| [`web/`](web/) | Next.js, TypeScript, and Web Workers | Interface, text operations, and local file processing |
| [`server/`](server/) | Go | Formats and workloads that need the server, with size and time limits |
| [`openspec/`](openspec/) | OpenSpec | Product scope and specifications |

## Run locally

### Prerequisites

- Node.js and npm
- Go 1.25.1 or Docker with Docker Compose when using the backend

### 1. Start the optional backend

Open a terminal at the project root:

```bash
cd server
ALLOWED_ORIGINS=http://localhost:3000 go run ./cmd/toolbox-server
```

The server listens on `http://localhost:8080`. During local development, the
spool automatically uses a secure system temporary directory. To choose
another location, set `SPOOL_DIR=/tmp/toolbox-spool`.

With Docker:

```bash
cd server/deploy
docker compose up --build
```

### 2. Start the frontend

In another terminal:

```bash
cd web
npm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080 npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without
`NEXT_PUBLIC_BACKEND_URL`, browser-only tools remain available.

## Validation

Frontend:

```bash
cd web
npm run lint
npm run typecheck
npm test
npm run build
```

Backend:

```bash
cd server
go test ./...
go build ./cmd/toolbox-server
```

## Backend configuration

| Variable | Default | Description |
| --- | --- | --- |
| `ADDR` | `:8080` | Listen address |
| `ALLOWED_ORIGINS` | empty | Comma-separated CORS origins |
| `REQUEST_MAX_BYTES` | `512 MB` | Maximum request size |
| `MEM_BUFFER_MAX` | `64 MB` | Maximum content kept in memory |
| `SPOOL_DIR` | `$TMPDIR/toolbox-spool` | Temporary directory for large files and staged output |
| `REQUEST_TIMEOUT` | `120s` | Maximum request duration |

For concurrency limits, tmpfs capacity, rate limiting, and production
operation, see the [backend deployment guide](server/deploy/README.md).

## License

This project does not declare a license yet.
