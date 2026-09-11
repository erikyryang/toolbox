import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function download(page: Page, name: string): Promise<Buffer> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: `Download ${name}`, exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe(name);
  const path = await file.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

// Bytes sintéticos e determinísticos: ultrapassam o limite E2E mesmo depois de
// compactados, fazendo a inspeção e a extração também passarem pelo servidor Go.
function serverFixture(): Buffer {
  const bytes = Buffer.alloc(8192);
  let state = 0x12345678;
  for (let index = 0; index < bytes.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[index] = state & 255;
  }
  return bytes;
}

for (const destination of ["browser", "server"] as const) {
  test(`ZIP round trip uses the ${destination} and preserves every byte`, async ({ page }) => {
    const name = destination === "browser" ? "local.txt" : "synthetic.bin";
    const original = destination === "browser" ? Buffer.from("Toolbox: ação ✓\n") : serverFixture();
    const requests: string[] = [];
    const failures: string[] = [];
    let workers = 0;
    page.on("worker", () => workers++);
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/v1/")) requests.push(request.url());
    });
    page.on("response", (response) => {
      if (new URL(response.url()).pathname.startsWith("/v1/") && !response.ok()) failures.push(response.url());
    });

    await page.goto("/compactar");
    await page.getByLabel("Drag files here or click to choose", { exact: false })
      .setInputFiles({ name, mimeType: "application/octet-stream", buffer: original });
    const privacy = destination === "browser"
      ? "Processed in your browser. Nothing is sent."
      : "Processed on the server";
    await expect(page.getByText(privacy, { exact: destination === "browser" })).toBeVisible();
    // O destino é informado antes de o usuário iniciar o envio.
    expect(requests).toEqual([]);
    await page.getByRole("button", { name: "Compress to ZIP", exact: true }).click();
    const zip = await download(page, `${name}.zip`);
    expect(zip.length).toBeGreaterThan(0);
    if (destination === "server") expect(zip.length).toBeGreaterThan(4096);

    await page.goto("/descompactar");
    await page.getByLabel("Drag an archive here or click to choose", { exact: false })
      .setInputFiles({ name: `${name}.zip`, mimeType: "application/zip", buffer: zip });
    await expect(page.getByRole("heading", { name: /\bContents \(ZIP\)$/ })).toBeVisible();
    await page.getByRole("button", { name: "Extract", exact: true }).click();
    expect(await download(page, name)).toEqual(original);
    expect(failures).toEqual([]);
    if (destination === "browser") {
      expect(workers).toBeGreaterThanOrEqual(2);
      expect(requests).toEqual([]);
    } else {
      expect(requests.map((url) => new URL(url).pathname)).toEqual([
        "/v1/compress", "/v1/inspect", "/v1/extract",
      ]);
      expect(requests.every((url) => new URL(url).origin === "http://127.0.0.1:8181")).toBe(true);
    }
  });
}

test("client-side navigation resets selected files and results in both directions", async ({ page }) => {
  const name = "navigation.txt";
  const original = Buffer.from("Toolbox: navegação ✓\n");
  const main = page.getByRole("main");
  const navigation = page.getByRole("navigation", { name: "Tools", exact: true });

  await page.goto("/compactar");
  await page.getByLabel("Drag files here or click to choose", { exact: false })
    .setInputFiles({ name, mimeType: "text/plain", buffer: original });
  await page.getByRole("button", { name: "Compress to ZIP", exact: true }).click();
  const zip = await download(page, `${name}.zip`);

  // A navegação interna preserva o documento; um reload esconderia estado residual.
  await navigation.getByRole("link", { name: "Extract", exact: true }).click();
  await expect(page).toHaveURL(/\/descompactar$/);
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Extract");
  await expect(main.getByText(name, { exact: true })).toHaveCount(0);
  await expect(main.getByRole("button", { name: /^Download / })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "Compress to ZIP", exact: true })).toHaveCount(0);
  await expect(main.getByRole("group", { name: "Where the archive comes from" })).toBeVisible();

  await page.getByLabel("Drag an archive here or click to choose", { exact: false })
    .setInputFiles({ name: `${name}.zip`, mimeType: "application/zip", buffer: zip });
  await page.getByRole("button", { name: "Extract", exact: true }).click();
  expect(await download(page, name)).toEqual(original);

  await navigation.getByRole("link", { name: "Compress", exact: true }).click();
  await expect(page).toHaveURL(/\/compactar$/);
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Compress files");
  await expect(main.getByText(`${name}.zip`, { exact: true })).toHaveCount(0);
  await expect(main.getByRole("button", { name: /^Download / })).toHaveCount(0);
  await expect(main.getByRole("heading", { name: /\bContents \(ZIP\)$/ })).toHaveCount(0);
  await expect(main.getByRole("group", { name: "Where the archive comes from" })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "ZIP", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Drag files here or click to choose", { exact: false })
    .setInputFiles({ name: "fresh.txt", mimeType: "text/plain", buffer: Buffer.from("fresh") });
  await expect(main.getByRole("button", { name: "Compress to ZIP", exact: true })).toBeEnabled();
});
