import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Relatórios financeiros com filtro por cliente/fornecedor e empresa
 * (roça com rótulo customizado) — task 001:
 * - Relatório geral de Contas a Receber / Contas a Pagar
 * - Relatório financeiro por cliente (Contas a Receber e Financeiro)
 * E filtro por conta bancária (banco) no relatório geral — task 003.
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
const CONTAS_BANCARIAS = [
  { id: 4, nome: "Conta Principal", banco: "Sicoob", numeroConta: "1234-5", ativo: true },
  { id: 5, nome: "Conta Antiga", banco: "Itaú", ativo: false },
];
const ROCAS = [
  { id: 7, nome: "Empresa Norte", ativo: true },
  { id: 8, nome: "Empresa Sul", ativo: true },
];

interface ApiSimulada {
  /** Query strings das pré-visualizações (GET /contas-financeiras e /agrupado com limit=1). */
  previews: URLSearchParams[];
  /** URLs dos PDFs pedidos ao backend. */
  pdfs: URL[];
  /** URLs dos PDFs pedidos para impressão. */
  impressoes: URL[];
}

async function simularApi(
  page: Page,
  sessionStorageInicial?: Record<string, unknown>,
): Promise<ApiSimulada> {
  const api: ApiSimulada = { previews: [], pdfs: [], impressoes: [] };
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

    if (caminho.startsWith("/relatorios/") && caminho.endsWith("/pdf")) {
      api.pdfs.push(url);
      return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 e2e" });
    }
    if (caminho.startsWith("/relatorios/") && caminho.endsWith("/imprimir")) {
      api.impressoes.push(url);
      return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 e2e" });
    }
    if (caminho === "/contas-bancarias") {
      return json({ contas: CONTAS_BANCARIAS, total: CONTAS_BANCARIAS.length });
    }
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    if (caminho.endsWith("/rocas")) return json(ROCAS);
    if (caminho.startsWith("/clientes")) return json({ data: CLIENTES, total: CLIENTES.length });
    if (caminho.startsWith("/fornecedor")) return json({ data: FORNECEDORES, total: FORNECEDORES.length });
    if (caminho === "/contas-financeiras" || caminho === "/contas-financeiras/agrupado") {
      if (url.searchParams.get("limit") === "1") api.previews.push(url.searchParams);
      return json({ data: [], total: 3 });
    }
    return json([]);
  });
  return api;
}

async function abrirRelatorio(page: Page, nome: string) {
  await page.getByRole("button", { name: "Relatórios" }).click();
  await page.getByRole("menuitem", { name: nome }).click();
  const dialog = page.getByRole("dialog", { name: nome });
  await expect(dialog).toBeVisible();
  return dialog;
}

const abrirRelatorioGeral = (page: Page) => abrirRelatorio(page, "Relatório geral");

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

for (const tela of [
  { nome: "contas a receber", rota: "/contas-a-receber", sessao: "creceber_filtros_v2" },
  { nome: "financeiro", rota: "/financeiro", sessao: null },
]) {
  test.describe(`relatório financeiro por cliente — ${tela.nome}`, () => {
    test("envia a empresa escolhida para o PDF e para a pré-visualização", async ({ page }) => {
      const api = await simularApi(page);
      await page.goto(tela.rota);
      const dialog = await abrirRelatorio(page, "Relatório financeiro por cliente");

      await dialog.getByRole("combobox").filter({ hasText: "Selecione o cliente" }).click();
      await page.getByRole("option", { name: "Cliente Alfa" }).click();
      await dialog.getByRole("combobox").filter({ hasText: "Todas as empresas" }).click();
      await page.getByRole("option", { name: "Empresa Sul" }).click();

      await expect
        .poll(() => api.previews.some((q) => q.get("cliente_id") === "1" && q.get("roca_id") === "8"))
        .toBe(true);

      await dialog.getByRole("button", { name: /Baixar PDF/ }).click();
      await expect.poll(() => api.pdfs.length).toBe(1);
      const pdf = api.pdfs[0];
      expect(pdf.pathname).toMatch(/\/relatorios\/cliente\/1\/financeiro\/pdf$/);
      expect(pdf.searchParams.get("roca_id")).toBe("8");
    });

    test("sem empresa não envia roca_id", async ({ page }) => {
      const api = await simularApi(page);
      await page.goto(tela.rota);
      const dialog = await abrirRelatorio(page, "Relatório financeiro por cliente");

      await dialog.getByRole("combobox").filter({ hasText: "Selecione o cliente" }).click();
      await page.getByRole("option", { name: "Cliente Beta" }).click();
      await dialog.getByRole("button", { name: /Baixar PDF/ }).click();
      await expect.poll(() => api.pdfs.length).toBe(1);
      expect(api.pdfs[0].pathname).toMatch(/\/relatorios\/cliente\/2\/financeiro\/pdf$/);
      expect(api.pdfs[0].searchParams.has("roca_id")).toBe(false);
    });

    if (tela.sessao) {
      test("abre com cliente e empresa dos filtros avançados", async ({ page }) => {
        await simularApi(page, { [tela.sessao!]: { clienteFilterId: 2, rocaFilterId: 7 } });
        await page.goto(tela.rota);
        const dialog = await abrirRelatorio(page, "Relatório financeiro por cliente");

        await expect(dialog.getByRole("combobox").filter({ hasText: "Cliente Beta" })).toBeVisible();
        await expect(dialog.getByRole("combobox").filter({ hasText: "Empresa Norte" })).toBeVisible();
      });
    }
  });
}

const PARAMS_BANCO = ["conta_bancaria_id", "sem_conta_bancaria"];
const comboBanco = (dialog: ReturnType<Page["getByRole"]>) =>
  dialog.getByRole("combobox", { name: "Conta (Banco) do relatório geral" });

for (const tela of [
  {
    nome: "contas a receber",
    rota: "/contas-a-receber",
    sessao: "creceber_filtros_v2",
    caminhoPdf: /\/relatorios\/contas-receber\/geral\/pdf$/,
    caminhoImprimir: /\/relatorios\/contas-receber\/geral\/imprimir$/,
  },
  {
    nome: "contas a pagar",
    rota: "/contas-a-pagar",
    sessao: "cpagar_filtros_v2",
    caminhoPdf: /\/relatorios\/contas-pagar\/geral\/pdf$/,
    caminhoImprimir: /\/relatorios\/contas-pagar\/geral\/imprimir$/,
  },
]) {
  test.describe(`relatório geral — conta bancária — ${tela.nome}`, () => {
    test("padrão é \"Todas (com e sem banco)\" e nenhuma requisição leva parâmetro de banco", async ({ page }) => {
      const api = await simularApi(page);
      await page.goto(tela.rota);
      const dialog = await abrirRelatorioGeral(page);

      await expect(comboBanco(dialog)).toHaveText(/Todas \(com e sem banco\)/);
      await expect.poll(() => api.previews.length).toBeGreaterThan(0);

      await dialog.getByRole("button", { name: "Baixar PDF" }).click();
      await expect.poll(() => api.pdfs.length).toBe(1);
      await dialog.getByRole("button", { name: "Abrir para imprimir" }).click();
      await expect.poll(() => api.impressoes.length).toBe(1);

      for (const q of [...api.previews, api.pdfs[0].searchParams, api.impressoes[0].searchParams]) {
        for (const p of PARAMS_BANCO) expect(q.has(p)).toBe(false);
      }
    });

    test("abre com o banco dos filtros avançados da tela", async ({ page }) => {
      await simularApi(page, { [tela.sessao]: { contaBancariaFilterId: 4 } });
      await page.goto(tela.rota);
      const dialog = await abrirRelatorioGeral(page);

      await expect(comboBanco(dialog)).toHaveText(/Conta Principal \(Sicoob\) - CC: 1234-5/);
    });

    test("banco escolhido vai para a pré-visualização, o PDF e a impressão", async ({ page }) => {
      const api = await simularApi(page);
      await page.goto(tela.rota);
      const dialog = await abrirRelatorioGeral(page);

      await comboBanco(dialog).click();
      // Ordem das opções: Todas, Sem banco, depois os bancos (inclui inativos)
      await expect(page.getByRole("option")).toHaveText([
        "Todas (com e sem banco)",
        "Sem banco definido",
        "Conta Principal (Sicoob) - CC: 1234-5",
        "Conta Antiga (Itaú)",
      ]);
      await page.getByRole("option", { name: "Conta Antiga (Itaú)" }).click();

      await expect
        .poll(() =>
          api.previews.some(
            (q) => q.get("conta_bancaria_id") === "5" && !q.has("sem_conta_bancaria"),
          ),
        )
        .toBe(true);

      await dialog.getByRole("button", { name: "Baixar PDF" }).click();
      await expect.poll(() => api.pdfs.length).toBe(1);
      expect(api.pdfs[0].pathname).toMatch(tela.caminhoPdf);
      expect(api.pdfs[0].searchParams.get("conta_bancaria_id")).toBe("5");
      expect(api.pdfs[0].searchParams.has("sem_conta_bancaria")).toBe(false);

      await dialog.getByRole("button", { name: "Abrir para imprimir" }).click();
      await expect.poll(() => api.impressoes.length).toBe(1);
      expect(api.impressoes[0].pathname).toMatch(tela.caminhoImprimir);
      expect(api.impressoes[0].searchParams.get("conta_bancaria_id")).toBe("5");
    });

    test("\"Sem banco definido\" envia sem_conta_bancaria=true", async ({ page }) => {
      const api = await simularApi(page, { [tela.sessao]: { contaBancariaFilterId: 4 } });
      await page.goto(tela.rota);
      const dialog = await abrirRelatorioGeral(page);

      await comboBanco(dialog).click();
      await page.getByRole("option", { name: "Sem banco definido" }).click();

      await expect
        .poll(() =>
          api.previews.some(
            (q) => q.get("sem_conta_bancaria") === "true" && !q.has("conta_bancaria_id"),
          ),
        )
        .toBe(true);

      await dialog.getByRole("button", { name: "Baixar PDF" }).click();
      await expect.poll(() => api.pdfs.length).toBe(1);
      expect(api.pdfs[0].searchParams.get("sem_conta_bancaria")).toBe("true");
      expect(api.pdfs[0].searchParams.has("conta_bancaria_id")).toBe(false);

      await dialog.getByRole("button", { name: "Abrir para imprimir" }).click();
      await expect.poll(() => api.impressoes.length).toBe(1);
      expect(api.impressoes[0].searchParams.get("sem_conta_bancaria")).toBe("true");
      expect(api.impressoes[0].searchParams.has("conta_bancaria_id")).toBe(false);
    });
  });
}
