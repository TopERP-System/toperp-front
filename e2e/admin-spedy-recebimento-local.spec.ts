import { expect, test } from "@playwright/test";

/**
 * Task 012: botão "Recebimento de notas" no painel super admin da Spedy. Não há usuário
 * SUPER_ADMIN de E2E, então a API inteira é simulada (login, lista e recebimento). Não grava nada.
 *
 *   npx playwright test e2e/admin-spedy-recebimento-local.spec.ts
 */

const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const TOKEN = [
  base64url({ alg: "HS256", typ: "JWT" }),
  base64url({ sub: "sa1", email: "sa@toperp.local", role: "SUPER_ADMIN", exp: Math.floor(Date.now() / 1000) + 3600 }),
  "assinatura",
].join(".");

const tenant = (codigo: string, nome: string, ambiente: "producao" | "homologacao") => ({
  tenant_id: `00000000-0000-4000-8000-00000000000${codigo.length % 10}`,
  codigo,
  nome,
  cnpj: "12345678000195",
  status: "ATIVO",
  integracao_ativa: true,
  emissor_cadastrado: true,
  aguardando_chave: false,
  company_id: "c1",
  ambiente,
  pode_ativar: true,
  pode_atualizar_certificado: true,
  dados_completos: true,
  pendencias: [],
});

test("task 012 — ligar o recebimento de notas pelo painel super admin", async ({ page }) => {
  const ligacoes: unknown[] = [];
  let ligado = false;
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());
  await page.route(/localhost:4000\/api\/v1\//, async (route) => {
    const url = route.request().url();
    const metodo = route.request().method();
    if (url.endsWith("/usuarios/login")) {
      return route.fulfill({
        json: {
          access_token: TOKEN,
          refresh_token: TOKEN,
          usuario: { id: "sa1", email: "sa@toperp.local", role: "SUPER_ADMIN", nome: "Super Admin" },
        },
      });
    }
    if (url.endsWith("/admin/spedy/tenants")) {
      return route.fulfill({
        json: [tenant("ja", "J.A HORTIFRUT LTDA", "producao"), tenant("teste", "EMPRESA TESTE", "homologacao")],
      });
    }
    if (url.endsWith("/recebimento-notas")) {
      if (metodo === "POST") {
        ligacoes.push(route.request().postDataJSON());
        ligado = true;
      }
      return route.fulfill({
        json: { ligado, data_inicio: ligado ? "2026-08-01" : null, data_inicio_minima: "2026-07-31" },
      });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/login");
  await page.locator("#email").fill("sa@toperp.local");
  await page.locator("#password").fill("x");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  await page.goto("/admin/spedy");

  // Só emissor em produção tem o botão
  const botao = page.getByRole("button", { name: "Recebimento de notas" });
  await expect(botao).toHaveCount(1);
  await botao.click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText("J.A HORTIFRUT LTDA");
  const data = dialogo.getByLabel("Receber notas emitidas a partir de");
  await expect(data).toHaveValue("2026-07-31");
  await data.fill("2026-08-01");
  await dialogo.getByRole("button", { name: "Ligar recebimento" }).click();

  await expect(dialogo).toContainText("Ligado desde 01/08/2026");
  await expect(dialogo.getByRole("button", { name: "Ligar recebimento" })).toHaveCount(0);
  expect(ligacoes).toEqual([{ data_inicio: "2026-08-01" }]);
  await page.screenshot({ path: "test-results/admin-spedy-recebimento.png" });
});
