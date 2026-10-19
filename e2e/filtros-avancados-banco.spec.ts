import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Filtros Avançados de Contas a Receber / Contas a Pagar: filtro por conta bancária
 * (banco) — task 002. API simulada: não precisa de backend nem de credenciais.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const CONTAS_BANCARIAS = [
  { id: 4, nome: "Conta Principal", banco: "Sicoob", numeroConta: "1234-5", ativo: true },
  { id: 5, nome: "Conta Antiga", banco: "Itaú", ativo: false },
];

interface ApiSimulada {
  /** Query strings das listagens de contas financeiras (lista e agrupado). */
  listagens: URLSearchParams[];
  /** Parâmetros usados na lista de contas bancárias. */
  bancos: URLSearchParams[];
}

async function simularApi(page: Page, sessao?: Record<string, unknown>): Promise<ApiSimulada> {
  const api: ApiSimulada = { listagens: [], bancos: [] };
  await page.addInitScript(
    ({ token, sessao }) => {
      localStorage.setItem("access_token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({ id: "u1", email: "teste@e2e.com", nome: "Teste", role: "ADMIN", ativo: true }),
      );
      for (const [k, v] of Object.entries(sessao ?? {})) {
        sessionStorage.setItem(k, JSON.stringify(v));
      }
    },
    { token: tokenFalso(), sessao },
  );

  await page.route(/\/api\/v1\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const caminho = url.pathname.replace(/^.*\/api\/v1/, "");
    const json = (body: Json) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

    if (caminho === "/contas-bancarias") {
      api.bancos.push(url.searchParams);
      return json({ contas: CONTAS_BANCARIAS, total: CONTAS_BANCARIAS.length });
    }
    if (caminho === "/contas-financeiras" || caminho === "/contas-financeiras/agrupado") {
      api.listagens.push(url.searchParams);
      return json({ data: [], itens: [], total: 0 });
    }
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    return json([]);
  });
  return api;
}

async function aplicarFiltroBanco(page: Page, conta: string) {
  await page.getByRole("button", { name: /^Filtros/ }).click();
  const gaveta = page.getByRole("dialog");
  await expect(gaveta.getByText("Conta (Banco)")).toBeVisible();
  await gaveta.getByRole("combobox").filter({ hasText: "Todas as contas" }).click();
  await page.getByRole("option", { name: new RegExp(conta) }).click();
  await gaveta.getByRole("button", { name: "Aplicar Filtros" }).click();
}

for (const tela of [
  { nome: "contas a receber", rota: "/contas-a-receber", sessao: "creceber_filtros_v2" },
  { nome: "contas a pagar", rota: "/contas-a-pagar", sessao: "cpagar_filtros_v2" },
]) {
  test.describe(`filtros avançados — conta bancária — ${tela.nome}`, () => {
    test("filtra a listagem pelo banco escolhido e conta o filtro no botão", async ({ page }) => {
      const api = await simularApi(page);
      await page.goto(tela.rota);
      await expect.poll(() => api.listagens.length).toBeGreaterThan(0);
      expect(api.listagens.some((q) => q.has("conta_bancaria_id"))).toBe(false);

      await aplicarFiltroBanco(page, "Conta Principal");

      await expect
        .poll(() => api.listagens.filter((q) => q.get("conta_bancaria_id") === "4").length)
        .toBeGreaterThan(0);
      await expect(page.getByRole("button", { name: /^Filtros\s*1$/ })).toBeVisible();
    });

    test("lista também contas bancárias inativas no filtro", async ({ page }) => {
      const api = await simularApi(page);
      await page.goto(tela.rota);

      await aplicarFiltroBanco(page, "Conta Antiga");

      await expect
        .poll(() => api.listagens.some((q) => q.get("conta_bancaria_id") === "5"))
        .toBe(true);
      expect(api.bancos.some((q) => !q.has("apenasAtivos"))).toBe(true);
    });

    test("mantém o filtro ao voltar para a tela e limpa com Limpar", async ({ page }) => {
      const api = await simularApi(page, { [tela.sessao]: { contaBancariaFilterId: 4 } });
      await page.goto(tela.rota);

      await expect
        .poll(() => api.listagens.some((q) => q.get("conta_bancaria_id") === "4"))
        .toBe(true);

      await page.getByRole("button", { name: /^Filtros/ }).click();
      const gaveta = page.getByRole("dialog");
      await expect(gaveta.getByRole("combobox").filter({ hasText: "Conta Principal" })).toBeVisible();

      const antes = api.listagens.length;
      await gaveta.getByRole("button", { name: /Limpar/ }).click();
      await expect.poll(() => api.listagens.length).toBeGreaterThan(antes);
      expect(api.listagens.slice(antes).some((q) => q.has("conta_bancaria_id"))).toBe(false);
    });
  });
}
