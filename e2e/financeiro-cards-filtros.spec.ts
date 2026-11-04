import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Financeiro › Visão Geral: os cards Receita / Despesas / Saldo / Previsão seguem
 * os filtros da tabela, inclusive a busca. Sem período = todo o histórico (como a tabela),
 * em vez do mês corrente que zerava os cards. As somas vêm do backend (`totais` de
 * GET /contas-financeiras), sem baixar a lista inteira. Data fixa: 04/11/2026.
 * API simulada: não precisa de backend nem de credenciais.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(new Date("2026-11-04T12:00:00-03:00").getTime() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const conta = (id: number, tipo: string, descricao: string, valor: number, extra: object = {}) => ({
  id,
  tipo,
  descricao,
  valor_original: valor,
  valor_total: valor,
  valor_pago: 0,
  status: "PENDENTE",
  data_emissao: "2026-10-15",
  data_vencimento: "2026-10-30",
  ...extra,
});

/** Contas de outubro: nada em novembro (mês corrente). */
const CONTAS = [
  conta(1, "RECEBER", "Pedido VEND-2026-00001 AGROMAIS", 500),
  conta(2, "RECEBER", "Pedido VEND-2026-00004 AGROMAIS", 10),
  conta(3, "PAGAR", "Energia elétrica", 100),
  conta(4, "RECEBER", "Previsão safra", 300, { status: "PREVISAO", previsao: true }),
];

function filtrarContas(q: URLSearchParams) {
  const busca = q.get("busca")?.toLowerCase();
  const ini = q.get("data_inicial");
  const fim = q.get("data_final");
  return CONTAS.filter(
    (c) =>
      (!q.get("tipo") || c.tipo === q.get("tipo")) &&
      (!q.get("status") || c.status === q.get("status")) &&
      (!busca || c.descricao.toLowerCase().includes(busca)) &&
      (!ini || c.data_emissao >= ini) &&
      (!fim || c.data_emissao <= fim),
  );
}

const soma = (contas: typeof CONTAS) =>
  contas.reduce((s, c) => s + c.valor_total, 0);

/** `semTotais`: simula o backend antigo, que não devolve `totais`. */
async function simularApi(page: Page, { semTotais = false } = {}): Promise<URLSearchParams[]> {
  const listagens: URLSearchParams[] = [];
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

    if (caminho === "/contas-financeiras") {
      listagens.push(url.searchParams);
      const todas = filtrarContas(url.searchParams);
      const limit = Number(url.searchParams.get("limit") || 15);
      const totais = {
        valor_total: soma(todas),
        valor_competencia: soma(todas.filter((c) => c.status !== "PREVISAO" && c.status !== "CANCELADO")),
      };
      return json({ data: todas.slice(0, limit), total: todas.length, ...(semTotais ? {} : { totais }) });
    }
    if (caminho === "/contas-financeiras/agrupado") return json({ itens: [], total: 0 });
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    if (caminho.startsWith("/clientes") || caminho.startsWith("/fornecedor")) {
      return json({ data: [], total: 0 });
    }
    return json([]);
  });
  return listagens;
}

const card = (page: Page, rotulo: string | RegExp) => page.getByRole("button", { name: rotulo });

test.describe("financeiro — cards seguem os filtros da tabela", () => {
  test("sem filtros os cards somam todo o histórico, como a tabela", async ({ page }) => {
    const listagens = await simularApi(page);
    await page.goto("/financeiro");

    await expect(card(page, /^Receita · todo o período/)).toContainText("R$ 510,00");
    await expect(card(page, /^Despesas · todo o período/)).toContainText("R$ 100,00");
    await expect(card(page, /^Saldo Atual/)).toContainText("R$ 410,00");
    await expect(card(page, /^Previsão de entrada/)).toContainText("R$ 300,00");

    // Nenhuma soma dos cards sai presa ao mês corrente, e todas pedem só 1 linha
    expect(listagens.some((q) => q.has("data_inicial"))).toBe(false);
    expect(listagens.every((q) => q.get("limit") === "1")).toBe(true);
  });

  test("backend antigo sem totais: soma a listagem no navegador", async ({ page }) => {
    const listagens = await simularApi(page, { semTotais: true });
    await page.goto("/financeiro");

    await expect(card(page, /^Receita · todo o período/)).toContainText("R$ 510,00");
    await expect(card(page, /^Despesas · todo o período/)).toContainText("R$ 100,00");
    await expect(card(page, /^Previsão de entrada/)).toContainText("R$ 300,00");
    expect(listagens.some((q) => q.get("limit") === "200")).toBe(true);
  });

  test("a busca também atualiza os cards", async ({ page }) => {
    const listagens = await simularApi(page);
    await page.goto("/financeiro");
    await expect(card(page, /^Receita · todo o período/)).toContainText("R$ 510,00");

    await page.getByPlaceholder("Buscar por cliente ou descrição...").fill("VEND-2026-00001");

    await expect(card(page, /^Receita · todo o período/)).toContainText("R$ 500,00");
    await expect(card(page, /^Despesas · todo o período/)).toContainText("R$ 0,00");
    await expect(card(page, /^Saldo Atual/)).toContainText("R$ 500,00");
    await expect(card(page, /^Previsão de entrada/)).toContainText("R$ 0,00");
    expect(listagens.some((q) => q.get("busca") === "VEND-2026-00001")).toBe(true);
  });

  test("clicar em Receita aplica o mês atual e o rótulo mostra o mês", async ({ page }) => {
    await simularApi(page);
    await page.goto("/financeiro");
    await card(page, /^Receita · todo o período/).click();

    await expect(card(page, /^Receita do Mês · nov\/2026/)).toContainText("R$ 0,00");
    await expect(card(page, /^Despesas do Mês · nov\/2026/)).toContainText("R$ 0,00");

    // Clicar de novo tira o mês e volta ao histórico
    await card(page, /^Receita do Mês · nov\/2026/).click();
    await expect(card(page, /^Receita · todo o período/)).toContainText("R$ 510,00");
  });
});
