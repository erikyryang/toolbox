import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const frontendURL = "http://127.0.0.1:3100";
const backendURL = "http://127.0.0.1:8181";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Build e start no mesmo comando: as variáveis públicas são embutidas na
      // compilação, então precisam valer já no build, e não só no servidor.
      command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
      url: frontendURL,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_BACKEND_URL: backendURL,
        NEXT_PUBLIC_CLIENT_MAX_BYTES: "4096",
      },
    },
    {
      command: "go run ./cmd/toolbox-server",
      cwd: "../server",
      url: `${backendURL}/healthz`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ADDR: "127.0.0.1:8181",
        ALLOWED_ORIGINS: frontendURL,
        SPOOL_DIR: resolve(".e2e-spool"),
        REQUEST_MAX_BYTES: "1048576",
        MEM_BUFFER_MAX: "65536",
        RATE_PER_MINUTE: "120",
        RATE_BURST: "30",
      },
    },
  ],
});
