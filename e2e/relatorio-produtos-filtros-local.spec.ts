import { expect, test, type Locator, type Page } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Tasks 016/017/018 contra a API LOCAL (clone): o relatório "Produtos por cliente/fornecedor"
 * aberto pela tela de Pedidos herda os filtros APLICADOS na listagem (parceiro, período pela
 * data do pedido — "Qualquer período" = todo o histórico — e status do pedido), recarregando
 * a cada abertura. Só lê dados: não cria nem altera nada.
 * Usa o primeiro cliente e o primeiro fornecedor que tenham pedidos.
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/relatorio-produtos-filtros-local.spec.ts
 */

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

async function api(page: Page, caminho: string) {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  const resposta = await page.request.get(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resposta.ok(), `GET ${caminho}`).toBeTruthy();
  return resposta.json();
}

/** Campo do painel de filtros pelo rótulo ("Status", "Cliente", "Período"...). */
function campoFiltro(painel: Locator, rotulo: string): Locator {
  return painel
    .locator("div.space-y-2")
    .filter({ has: painel.page().getByText(rotulo, { exact: true }) })
    .getByRole("combobox")
    .first();
}

async function escolher(page: Page, campo: Locator, opcao: string | RegExp) {
  await campo.click();
  await page.getByRole("option", { name: opcao }).first().click();
}

async function aplicarFiltros(
  page: Page,
  filtros: { status?: string; cliente?: string; fornecedor?: string; periodo?: string },
) {
  await page.getByRole("button", { name: /^Filtros/ }).click();
  const painel = page.getByRole("dialog").filter({ hasText: "Filtros" });
  if (filtros.status) await escolher(page, campoFiltro(painel, "Status"), filtros.status);
  if (filtros.cliente) await escolher(page, campoFiltro(painel, "Cliente"), filtros.cliente);
  if (filtros.fornecedor)
    await escolher(page, campoFiltro(painel, "Fornecedor"), filtros.fornecedor);
  if (filtros.periodo) await escolher(page, campoFiltro(painel, "Período"), filtros.periodo);
  await painel.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(painel).toBeHidden();
}

async function abrirRelatorio(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Relatórios", exact: true }).click();
  await page.getByRole("button", { name: /Produtos por cliente\/fornecedor/ }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Relatório de produtos por" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Clica em "Baixar PDF" e devolve os parâmetros da requisição do PDF. */
async function paramsDoPdf(page: Page, dialog: Locator): Promise<URLSearchParams> {
  const req = page.waitForRequest(/\/pedidos\/relatorio\/compras-cliente\/pdf/);
  await dialog.getByRole("button", { name: "Baixar PDF" }).click();
  return new URL((await req).url()).searchParams;
}

const datas = (dialog: Locator) => dialog.locator('input[type="date"]');

test("tasks 016/017/018 — relatório de produtos herda os filtros da listagem de Pedidos", async ({
  page,
}) => {
  exigirCredenciais();
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());
  await login(page);

  type PedidoLista = {
    tipo: string;
    cliente_id?: number | string | null;
    fornecedor_id?: number | string | null;
    cliente?: { nome?: string } | null;
    fornecedor?: { nome_fantasia?: string; nome_razao?: string } | null;
  };
  const pedidos = await api(page, "/pedidos?limit=200");
  const lista: PedidoLista[] = pedidos.pedidos ?? pedidos.data ?? pedidos;
  const venda = lista.find((p) => p.tipo === "VENDA" && p.cliente_id && p.cliente?.nome);
  const compra = lista.find(
    (p) => p.tipo === "COMPRA" && p.fornecedor_id && (p.fornecedor?.nome_fantasia || p.fornecedor?.nome_razao),
  );
  test.skip(!venda || !compra, "Precisa de um pedido de venda e um de compra no banco.");
  const clienteId = Number(venda!.cliente_id);
  const fornecedorId = Number(compra!.fornecedor_id);
  const nomeCliente = venda!.cliente!.nome!;
  const nomeFornecedor = compra!.fornecedor!.nome_fantasia?.trim() || compra!.fornecedor!.nome_razao!;

  await page.goto("/pedidos");

  await test.step("cliente + Atendido + Qualquer período → relatório sem período", async () => {
    await aplicarFiltros(page, {
      status: "Atendido",
      cliente: nomeCliente,
      periodo: "Qualquer período",
    });
    const dialog = await abrirRelatorio(page);
    await expect(dialog.getByLabel("Cliente (vendas)")).toBeChecked();
    await expect(dialog.getByRole("combobox").first()).toContainText(nomeCliente);
    await expect(datas(dialog).nth(0)).toHaveValue("");
    await expect(datas(dialog).nth(1)).toHaveValue("");
    await expect(dialog.getByText("Sem período: todo o histórico.")).toBeVisible();
    await expect(dialog.getByLabel("Data do pedido (emissão)")).toBeChecked();
    await expect(dialog.getByRole("radio", { name: "Atendido" })).toBeChecked();
    await page.screenshot({ path: "test-results/relatorio-produtos-herda-filtros.png" });

    const q = await paramsDoPdf(page, dialog);
    expect(q.get("cliente_id")).toBe(String(clienteId));
    expect(q.get("fornecedor_id")).toBeNull();
    expect(q.get("status_pedido")).toBe("ATENDIDO");
    expect(q.get("campo_data")).toBe("emissao");
    expect(q.get("data_inicial")).toBeNull();
    expect(q.get("data_final")).toBeNull();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step("mudar a listagem e reabrir traz os filtros novos", async () => {
    await aplicarFiltros(page, { status: "Todos os status", periodo: "Mês anterior" });
    const dialog = await abrirRelatorio(page);
    const ini = await datas(dialog).nth(0).inputValue();
    const fim = await datas(dialog).nth(1).inputValue();
    expect(ini).toMatch(/^\d{4}-\d{2}-01$/);
    expect(fim.slice(0, 7)).toBe(ini.slice(0, 7));
    await expect(dialog.getByRole("radio", { name: "Todos" }).first()).toBeChecked();
    await page.keyboard.press("Escape");
  });

  await test.step("filtro mudado no painel e NÃO aplicado não vai para o relatório", async () => {
    await page.getByRole("button", { name: /^Filtros/ }).click();
    const painel = page.getByRole("dialog").filter({ hasText: "Filtros" });
    await escolher(page, campoFiltro(painel, "Período"), "Qualquer período");
    await page.keyboard.press("Escape");
    await expect(painel).toBeHidden();
    const dialog = await abrirRelatorio(page);
    await expect(datas(dialog).nth(0)).not.toHaveValue("");
    await page.keyboard.press("Escape");
  });

  await test.step("só fornecedor filtrado → abre no modo fornecedor (compras)", async () => {
    await aplicarFiltros(page, { cliente: /^Todos$/, fornecedor: nomeFornecedor });
    const dialog = await abrirRelatorio(page);
    await expect(dialog.getByLabel("Fornecedor (compras)")).toBeChecked();
    await expect(dialog.getByText("Pelas contas a pagar do pedido.", { exact: false })).toBeVisible();
    const q = await paramsDoPdf(page, dialog);
    expect(q.get("fornecedor_id")).toBe(String(fornecedorId));
    expect(q.get("cliente_id")).toBeNull();
    await page.keyboard.press("Escape");
  });
});
