import { expect, test } from "@playwright/test";

test("converts current input, reverses Base64, and navigates to another tool", async ({ page }) => {
  await page.goto("/base64");
  await page.getByRole("textbox", { name: /\bText$/ }).fill("toolbox ✓");
  await expect(page.getByRole("textbox", { name: /\bBase64$/ }))
    .toHaveValue(Buffer.from("toolbox ✓").toString("base64"));

  await page.getByRole("button", { name: "Decode", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /\bText$/ })).toHaveValue("toolbox ✓");
  await page.getByRole("textbox", { name: /\bBase64$/ }).fill("bmV3IGlucHV0");
  await expect(page.getByRole("textbox", { name: /\bText$/ })).toHaveValue("new input");

  await page.getByRole("navigation", { name: "Tools", exact: true })
    .getByRole("link", { name: "Join lines", exact: true }).click();
  await expect(page).toHaveURL(/\/juntar-linhas$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Join lines");
  await expect(page.getByRole("button", { name: "Decode", exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: /\bText$/ }).fill("one\ntwo");
  await expect(page.getByRole("textbox", { name: /\bSingle line$/ })).toHaveValue("onetwo");
});

test("switches visible labels between English and Portuguese", async ({ page }) => {
  await page.goto("/base64");
  await expect(page.getByRole("button", { name: "Encode", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Switch to Portuguese" }).click();
  await expect(page.getByRole("button", { name: "Codificar", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /\bTexto$/ })).toBeVisible();
  await page.getByRole("button", { name: "Mudar para inglês" }).click();
  await expect(page.getByRole("button", { name: "Encode", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /\bText$/ })).toBeVisible();
});
