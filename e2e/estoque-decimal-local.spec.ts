import { expect, test, type Page } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Task 011 contra a API LOCAL (clone): estoque com casas decimais.
 * Faz um ajuste e uma entrada de 2,5 no primeiro produto e devolve o estoque original no fim com outro
 * ajuste. As 3 movimentações ficam no histórico (a API não apaga movimentação): rode só no clone.
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/estoque-decimal-local.spec.ts
 */

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

async function api(page: Page, metodo: "GET" | "POST", caminho: string, dados?: unknown) {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  const resposta = await page.request.fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}` },
    data: dados,
  });
  expect(resposta.ok(), `${metodo} ${caminho}`).toBeTruthy();
  return resposta.json();
}

test("task 011 — movimentação de 2,5 e estoque com fração nas telas", async ({ page }) => {
  exigirCredenciais();
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());
  await login(page);

  const lista = await api(page, "GET", "/produtos?limit=1");
  const produto = (lista.data ?? lista.produtos ?? lista)[0];
  const original = (await api(page, "GET", `/produtos/${produto.id}`)).estoque_atual;
  expect(typeof original).toBe("number");

  try {
    await api(page, "POST", `/estoque/produtos/${produto.id}/movimentar`, { tipo: "AJUSTE", quantidade: 10 });

    await test.step("entrada de 2,5 pela tela de movimentações", async () => {
      await page.goto("/estoque");
      await page.getByRole("button", { name: "Nova movimentação" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /^Entrada/ }).click();
      await dialog.getByRole("combobox").first().click();
      await page.getByRole("option", { name: new RegExp(`^${produto.nome} — ${produto.sku}`) }).click();
      await dialog.getByPlaceholder("Ex: 5").fill("2.5");
      await dialog.getByPlaceholder(/Ex: Compra avulsa/).fill("Teste e2e 011");
      await dialog.getByRole("button", { name: "Registrar entrada" }).click();
      await expect(dialog).toBeHidden();
      expect((await api(page, "GET", `/produtos/${produto.id}`)).estoque_atual).toBe(12.5);
      await expect(page.getByText("+2,5").first()).toBeVisible();
    });

    await test.step("lista e detalhe do produto mostram 12,5", async () => {
      await page.goto("/produtos");
      await expect(page.getByRole("row").filter({ hasText: produto.sku }).first()).toContainText("12,5");
      await page.screenshot({ path: "test-results/estoque-decimal-produtos.png" });
    });
  } finally {
    await api(page, "POST", `/estoque/produtos/${produto.id}/movimentar`, { tipo: "AJUSTE", quantidade: original });
  }
});
