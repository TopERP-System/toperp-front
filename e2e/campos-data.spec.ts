import { expect, test } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

test.describe("campos de data", () => {
  exigirCredenciais();

  test("ano não aceita mais de 4 dígitos", async ({ page }) => {
    await login(page);
    await page.goto("/pedidos");

    await page.getByRole("button", { name: "Relatórios" }).click();
    await page.getByText("Margem de contribuição").click();

    const dataInicial = page.getByRole("dialog").locator('input[type="date"]').first();
    await dataInicial.focus();
    // Exemplo reclamado pelo cliente: 05/09/202655
    await page.keyboard.type("0509202655", { delay: 50 });

    const valor = await dataInicial.inputValue();
    expect(valor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
