import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Relatório geral de Contas a Receber / Contas a Pagar com filtro por
 * cliente/fornecedor e empresa (roça com rótulo customizado) — task 001.
 * API simulada: não precisa de backend nem de credenciais.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const CLIENTES = [
  { id: 1, nome: "Cliente Alfa", statusCliente: "ATIVO" },
  { id: 2, nome: "Cliente Beta", statusCliente: "ATIVO" },
];
const FORNECEDORES = [
  { id: 3, nome_fantasia: "Fornecedor Gama", nome_razao: "Gama LTDA", statusFornecedor: "ATIVO" },
];
const ROCAS = [
  { id: 7, nome: "Empresa Norte", ativo: true },
  { id: 8, nome: "Empresa Sul", ativo: true },
];

interface ApiSimulada {
  /** Query strings das chamadas de pré-visualização (GET /contas-financeiras com limit=1). */
  previews: URLSearchParams[];
  /** URLs dos PDFs pedidos ao backend. */
  pdfs: URL[];
}

async function simularApi(
  page: Page,
  sessionStorageInicial?: Record<string, unknown>,
): Promise<ApiSimulada> {
  const api: ApiSimulada = { previews: [], pdfs: [] };
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
    { token: tokenFalso(), sessao: sessionStorageInicial },
  );

  await page.route(/\/api\/v1\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const caminho = url.pathname.replace(/^.*\/api\/v1/, "");
    const json = (body: Json, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (caminho.startsWith("/relatorios/") && caminho.endsWith("/geral/pdf")) {
      api.pdfs.push(url);
      return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 e2e" });
    }
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    if (caminho.endsWith("/rocas")) return json(ROCAS);
    if (caminho.startsWith("/clientes")) return json({ data: CLIENTES, total: CLIENTES.length });
    if (caminho.startsWith("/fornecedor")) return json({ data: FORNECEDORES, total: FORNECEDORES.length });
    if (caminho === "/contas-financeiras") {
      if (url.searchParams.get("limit") === "1") api.previews.push(url.searchParams);
      return json({ data: [], total: 3 });
    }
    return json([]);
  });
  return api;
}

async function abrirRelatorioGeral(page: Page) {
  await page.getByRole("button", { name: "Relatórios" }).click();
  await page.getByRole("menuitem", { name: "Relatório geral" }).click();
  const dialog = page.getByRole("dialog", { name: "Relatório geral" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("relatório geral — filtros por parceiro e empresa", () => {
  test("contas a receber: envia cliente e empresa para o PDF e para a pré-visualização", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/contas-a-receber");
    const dialog = await abrirRelatorioGeral(page);

    // Rótulo customizado da roça aparece no lugar de "Roça"
    await expect(dialog.getByText("Empresa", { exact: true })).toBeVisible();

    await dialog.getByRole("combobox").filter({ hasText: "Todos os clientes" }).click();
    await page.getByRole("option", { name: "Cliente Beta" }).click();
    await dialog.getByRole("combobox").filter({ hasText: "Todas as empresas" }).click();
    await page.getByRole("option", { name: "Empresa Sul" }).click();

    await expect
      .poll(() => api.previews.some((q) => q.get("cliente_id") === "2" && q.get("roca_id") === "8"))
      .toBe(true);

    await dialog.getByRole("button", { name: "Baixar PDF" }).click();
    await expect.poll(() => api.pdfs.length).toBe(1);
    const pdf = api.pdfs[0];
    expect(pdf.pathname).toMatch(/\/relatorios\/contas-receber\/geral\/pdf$/);
    expect(pdf.searchParams.get("cliente_id")).toBe("2");
    expect(pdf.searchParams.get("roca_id")).toBe("8");
  });

  test("contas a receber: sem filtros não envia cliente_id nem roca_id", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/contas-a-receber");
    const dialog = await abrirRelatorioGeral(page);

    await dialog.getByRole("button", { name: "Baixar PDF" }).click();
    await expect.poll(() => api.pdfs.length).toBe(1);
    expect(api.pdfs[0].searchParams.has("cliente_id")).toBe(false);
    expect(api.pdfs[0].searchParams.has("roca_id")).toBe(false);
  });

  test("contas a receber: abre com cliente e empresa dos filtros avançados", async ({ page }) => {
    await simularApi(page, {
      creceber_filtros_v2: { clienteFilterId: 1, rocaFilterId: 7 },
    });
    await page.goto("/contas-a-receber");
    const dialog = await abrirRelatorioGeral(page);

    await expect(dialog.getByRole("combobox").filter({ hasText: "Cliente Alfa" })).toBeVisible();
    await expect(dialog.getByRole("combobox").filter({ hasText: "Empresa Norte" })).toBeVisible();
  });

  test("contas a pagar: envia fornecedor e empresa para o PDF", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/contas-a-pagar");
    const dialog = await abrirRelatorioGeral(page);

    await dialog.getByRole("combobox").filter({ hasText: "Todos os fornecedores" }).click();
    await page.getByRole("option", { name: "Fornecedor Gama" }).click();
    await dialog.getByRole("combobox").filter({ hasText: "Todas as empresas" }).click();
    await page.getByRole("option", { name: "Empresa Norte" }).click();

    await expect
      .poll(() => api.previews.some((q) => q.get("fornecedor_id") === "3" && q.get("roca_id") === "7"))
      .toBe(true);

    await dialog.getByRole("button", { name: "Baixar PDF" }).click();
    await expect.poll(() => api.pdfs.length).toBe(1);
    const pdf = api.pdfs[0];
    expect(pdf.pathname).toMatch(/\/relatorios\/contas-pagar\/geral\/pdf$/);
    expect(pdf.searchParams.get("fornecedor_id")).toBe("3");
    expect(pdf.searchParams.get("roca_id")).toBe("7");
  });

  test("contas a pagar: abre com fornecedor e empresa dos filtros avançados", async ({ page }) => {
    await simularApi(page, {
      cpagar_filtros_v2: { fornecedorFilterId: 3, rocaFilterId: 8 },
    });
    await page.goto("/contas-a-pagar");
    const dialog = await abrirRelatorioGeral(page);

    await expect(dialog.getByRole("combobox").filter({ hasText: "Fornecedor Gama" })).toBeVisible();
    await expect(dialog.getByRole("combobox").filter({ hasText: "Empresa Sul" })).toBeVisible();
  });
});
