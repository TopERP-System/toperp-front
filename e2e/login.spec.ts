import { expect, test } from "@playwright/test";

test("tela de login exibe e-mail, senha e botão Entrar", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
