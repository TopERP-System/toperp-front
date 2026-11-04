import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

/**
 * Tela de Pedidos: abre no mês atual, o painel de filtros só aplica no botão "Aplicar"
 * e o card verde (Faturamento) segue o mesmo período e os filtros da listagem (cliente, NF, empresa).
 * API simulada: não precisa de backend nem de credenciais. Data fixa: 04/11/2026.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(new Date("2026-11-04T12:00:00-03:00").getTime() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const CLIENTE = { id: 12, nome: "AGROMAIS ALIMENTOS LTDA", status: "ATIVO" };

interface ApiSimulada {
  /** Query strings de GET /pedidos (listagem). */
  pedidos: URLSearchParams[];
  /** Query strings de GET /financeiro/dashboard (card de Faturamento). */
  faturamento: URLSearchParams[];
}

/** Faturamento simulado: cliente 12 → R$ 500 (1); outubro → R$ 525 (4); todo o histórico → R$ 625 (5); senão 0. */
function respostaFaturamento(q: URLSearchParams) {
  let receita = 0;
  let qtd = 0;
  if (q.get("pedido_cliente_id") === "12") {
    receita = 500;
    qtd = 1;
  } else if (q.get("data_inicial") === "2026-10-01") {
    receita = 525;
    qtd = 4;
  } else if (q.get("data_inicial") === "2000-01-01") {
    // "Qualquer período": todo o histórico
    receita = 625;
    qtd = 5;
  }
  return {
    contas_receber: { receita_mes: receita, faturamento_pedidos_quantidade: qtd },
    contas_pagar: {},
    saldo_atual: 0,
  };
}

async function simularApi(page: Page): Promise<ApiSimulada> {
  const api: ApiSimulada = { pedidos: [], faturamento: [] };
  await page.clock.setFixedTime(new Date("2026-11-04T12:00:00-03:00"));
  await page.addInitScript((token) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "u1", email: "teste@e2e.com", nome: "Teste", role: "ADMIN", ativo: true }),
    );
  }, tokenFalso());

  await page.route(/\/api\/v1\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const caminho = url.pathname.replace(/^.*\/api\/v1/, "");
    const json = (body: Json) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

    if (caminho === "/pedidos") {
      api.pedidos.push(url.searchParams);
      return json({ data: [], total: 0, page: 1, limit: 10 });
    }
    if (caminho === "/financeiro/dashboard") {
      api.faturamento.push(url.searchParams);
      return json(respostaFaturamento(url.searchParams));
    }
    if (caminho === "/pedidos/dashboard/resumo") return json({});
    if (caminho === "/clientes") return json({ data: [CLIENTE], total: 1 });
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    return json([]);
  });
  return api;
}

async function abrirFiltros(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /^Filtros/ }).click();
  const gaveta = page.getByRole("dialog");
  await expect(gaveta.getByText("Período", { exact: true })).toBeVisible();
  return gaveta;
}

async function escolher(page: Page, gaveta: Locator, campo: string, opcao: string) {
  await gaveta
    .locator("div.space-y-2")
    .filter({ has: page.getByText(campo, { exact: true }) })
    .getByRole("combobox")
    .first()
    .click();
  await page.getByRole("option", { name: opcao, exact: true }).click();
}

const ehNovembro = (q: URLSearchParams) =>
  q.get("data_inicial") === "2026-11-01" && q.get("data_final") === "2026-11-30";
const ehOutubro = (q: URLSearchParams) =>
  q.get("data_inicial") === "2026-10-01" && q.get("data_final") === "2026-10-31";
const chip = (page: Page, texto: string) => page.locator("span.rounded-full", { hasText: texto });

test.describe("pedidos — filtros e card de faturamento", () => {
  test("abre no mês atual: tabela e card verde no mesmo período", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/pedidos");

    await expect.poll(() => api.pedidos.length).toBeGreaterThan(0);
    // Nenhuma listagem da tabela/cards sai sem período (o padrão já vem na 1ª requisição).
    // limit=500 é a busca auxiliar do hook (achar pedido pelo número), não a tabela.
    expect(api.pedidos.filter((q) => q.get("limit") !== "500").every(ehNovembro)).toBe(true);
    await expect.poll(() => api.faturamento.some(ehNovembro)).toBe(true);

    await expect(page.getByText("Faturamento (Vendas) · nov/2026 · 0 pedidos")).toBeVisible();
    await expect(chip(page, "Mês atual · nov/2026")).toBeVisible();
    // O período padrão não conta no selo do botão Filtros
    await expect(page.getByRole("button", { name: /^Filtros$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Limpar filtros" })).toBeDisabled();

    const gaveta = await abrirFiltros(page);
    await expect(gaveta.getByRole("combobox").filter({ hasText: "Mês atual" })).toBeVisible();
  });

  test("o período só é aplicado ao clicar em Aplicar", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/pedidos");
    await expect.poll(() => api.pedidos.length).toBeGreaterThan(0);

    // Escolhe e fecha sem aplicar: nada muda
    let gaveta = await abrirFiltros(page);
    await escolher(page, gaveta, "Período", "Mês anterior");
    await page.keyboard.press("Escape");
    await expect(gaveta).toBeHidden();
    await page.waitForTimeout(500);
    expect(api.pedidos.some(ehOutubro)).toBe(false);
    expect(api.faturamento.some(ehOutubro)).toBe(false);

    // Rascunho descartado: reabre no "Mês atual"
    gaveta = await abrirFiltros(page);
    await expect(gaveta.getByRole("combobox").filter({ hasText: "Mês atual" })).toBeVisible();

    await escolher(page, gaveta, "Período", "Mês anterior");
    await gaveta.getByRole("button", { name: "Aplicar" }).click();

    await expect.poll(() => api.pedidos.some(ehOutubro)).toBe(true);
    await expect(page.getByText("Faturamento (Vendas) · out/2026 · 4 pedidos")).toBeVisible();
    await expect(page.getByText("R$ 525,00")).toBeVisible();
    await expect(chip(page, "Mês anterior · out/2026")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filtros\s*1$/ })).toBeVisible();
  });

  test("Qualquer período soma todo o histórico e Limpar volta ao mês atual", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/pedidos");
    await expect.poll(() => api.pedidos.length).toBeGreaterThan(0);

    const gaveta = await abrirFiltros(page);
    await escolher(page, gaveta, "Período", "Qualquer período");
    await gaveta.getByRole("button", { name: "Aplicar" }).click();

    await expect
      .poll(() => api.pedidos.some((q) => q.get("limit") !== "500" && !q.has("data_inicial")))
      .toBe(true);
    await expect
      .poll(() =>
        api.faturamento.some(
          (q) => q.get("data_inicial") === "2000-01-01" && q.get("data_final") === "2100-12-31",
        ),
      )
      .toBe(true);
    await expect(page.getByText("Faturamento (Vendas) · 5 pedidos")).toBeVisible();
    await expect(page.getByText("R$ 625,00")).toBeVisible();

    await expect(chip(page, "Mês atual")).toHaveCount(0);

    // Com um filtro de cliente, Limpar tira o cliente e volta ao mês atual
    const g2 = await abrirFiltros(page);
    await escolher(page, g2, "Cliente", CLIENTE.nome);
    await g2.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByRole("button", { name: /^Filtros\s*1$/ })).toBeVisible();
    const antes = api.pedidos.length;
    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect.poll(() => api.pedidos.slice(antes).some(ehNovembro)).toBe(true);
    expect(api.pedidos.slice(antes).some((q) => q.has("cliente_id"))).toBe(false);
    await expect(chip(page, "Mês atual · nov/2026")).toBeVisible();
    await expect(page.getByText("Faturamento (Vendas) · nov/2026 · 0 pedidos")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filtros$/ })).toBeVisible();
  });

  test("filtro de cliente também muda o card verde", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/pedidos");

    const gaveta = await abrirFiltros(page);
    await escolher(page, gaveta, "Cliente", CLIENTE.nome);
    expect(api.faturamento.some((q) => q.has("pedido_cliente_id"))).toBe(false);
    await gaveta.getByRole("button", { name: "Aplicar" }).click();

    await expect
      .poll(() => api.faturamento.some((q) => q.get("pedido_cliente_id") === "12" && ehNovembro(q)))
      .toBe(true);
    await expect(page.getByText("Faturamento (Vendas) · nov/2026 · 1 pedido")).toBeVisible();
    await expect(page.getByText("R$ 500,00")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filtros\s*1$/ })).toBeVisible();
    // Status não entra no faturamento
    expect(api.faturamento.some((q) => q.has("status"))).toBe(false);
  });
});
