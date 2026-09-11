# Browser tests

Use Node **26.7.0** (also recorded in `web/.node-version`) and Go **1.25.1 or newer**
as declared in `server/go.mod`. CI uses that Go version from the module file.
From `web/`:

```sh
npm ci
npx playwright install chromium --only-shell
npm run test:e2e
```

On Linux, install browser system libraries with
`npx playwright install --with-deps chromium --only-shell` (may require sudo).
The browser download requires network access the first time. Playwright is pinned
in `package-lock.json`; rerun the browser installation when upgrading it.

The command builds production Next.js, starts the frontend at
`http://127.0.0.1:3100`, and starts the real Go backend at
`http://127.0.0.1:8181`. Leave both ports free; the suite refuses to reuse an
existing server. Playwright stops both process groups after the run. Do not run
another build/dev process in the same checkout because they share `.next`.

The configuration scopes these settings to its server subprocesses:

| Setting | E2E value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | `http://127.0.0.1:8181` | Use the isolated Go service |
| `NEXT_PUBLIC_CLIENT_MAX_BYTES` | `4096` | Exercise routing with small synthetic files |
| `ADDR` | `127.0.0.1:8181` | Bind the backend locally |
| `ALLOWED_ORIGINS` | `http://127.0.0.1:3100` | Allow the test frontend origin |
| `SPOOL_DIR` | `web/.e2e-spool` | Isolate temporary backend staging |
| `REQUEST_MAX_BYTES` / `MEM_BUFFER_MAX` | `1048576` / `65536` | Bound test requests and buffering |
| `RATE_PER_MINUTE` / `RATE_BURST` | `120` / `30` | Accommodate parallel tests and a CI retry |

Public variables are embedded during the E2E production build. Run `npm run build`
again with your normal environment before using that checkout's production output
outside this suite. No `.env` files or production defaults are modified.

Five tests cover Base64 encoding/decoding and navigation, switching languages,
a local ZIP compression/extraction round trip through real Workers, a ZIP round
trip through the real Go HTTP endpoints, and navigation between the file tools.
Fixtures are generated in memory:
UTF-8 text and deterministic 8 KiB binary data. Each downloaded result is compared
byte for byte. The local test also observes Worker creation and asserts that no
processing requests were sent. The server test checks the routing notice before
upload and verifies compression, inspection, and extraction requests.

The navigation case switches from compression to extraction and back using
sidebar links within the same document, so nothing is reset by a page load. It
verifies that selected files, archive contents, and downloads are cleared, and
that each route exposes the correct operation controls before accepting a fresh
file.

Tests use accessible labels and automatic waiting, without mocked processing or
fixed delays. Each test gets a fresh browser context. Chromium is the initial
coverage target; Firefox, WebKit, and mobile behavior are not covered by this suite.

Run `npm run test:e2e -- --list` to list tests or append `--grep browser` to run
the Worker case. Failures retain traces and screenshots in `test-results/`; view
the HTML report using `npx playwright show-report`. CI uploads reports for seven
days, including traces on failure. All test artifacts are ignored by Git.

# Other CI checks

From `web/`, run `npm run lint`, `npm run typecheck`, `npm test`, and
`npm run build`. From `server/`, run `go mod download`, `go mod verify`, and
`go test ./...`. From the repository root, run:

```sh
npx --yes @fission-ai/openspec@1.6.0 validate --all --strict --no-interactive
```

`.github/workflows/ci.yml` runs these checks in separate frontend, backend, specs,
and E2E jobs for every PR and push to `main`. npm installs use the committed
lockfile; Go uses `go.mod` and `go.sum`; the OpenSpec CLI is pinned to 1.6.0.
The workflow grants only `contents: read` and does not require repository secrets.

Configuration references: [Next.js testing guide](https://nextjs.org/docs/app/guides/testing/playwright),
[Playwright web servers](https://playwright.dev/docs/test-webserver),
[setup-node](https://github.com/actions/setup-node),
[setup-go](https://github.com/actions/setup-go),
[checkout](https://github.com/actions/checkout), and
[artifact uploads](https://github.com/actions/upload-artifact).
