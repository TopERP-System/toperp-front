import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const senha = process.env.E2E_SENHA;

/** Pula o teste quando as credenciais de E2E não foram informadas. */
export function exigirCredenciais() {
  test.skip(!email || !senha, "Defina E2E_EMAIL e E2E_SENHA para rodar testes com login.");
}

export async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(email ?? "");
  await page.locator("#password").fill(senha ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}
