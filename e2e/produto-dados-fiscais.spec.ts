import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Aba "Dados Fiscais" do produto (task 036) com a API simulada:
 * não precisa de backend nem de credenciais.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const TABELAS: Record<string, Json> = {
  origem: [
    { codigo: "0", descricao: "Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8" },
    { codigo: "1", descricao: "Estrangeira - Importação direta" },
  ],
  csosn: [
    { codigo: "102", descricao: "Tributada pelo Simples Nacional sem permissão de crédito" },
    { codigo: "500", descricao: "ICMS cobrado anteriormente por substituição tributária" },
  ],
  "cst-icms": [{ codigo: "00", descricao: "Tributada integralmente" }],
  "cst-ipi": [{ codigo: "53", descricao: "Saída não tributada" }],
  "cst-pis-cofins": [
    { codigo: "01", descricao: "Operação tributável com alíquota básica" },
    { codigo: "49", descricao: "Outras operações de saída" },
    { codigo: "70", descricao: "Operação de aquisição sem direito a crédito" },
    { codigo: "98", descricao: "Outras operações de entrada" },
  ],
  cfop: [
    { codigo: "5102", descricao: "Venda de mercadoria adquirida ou recebida de terceiros" },
    { codigo: "6102", descricao: "Venda de mercadoria adquirida ou recebida de terceiros" },
    { codigo: "1102", descricao: "Compra para comercialização" },
  ],
  cest: [{ codigo: "1702401", descricao: "Queijo muçarela", segmento: "PRODUTOS ALIMENTÍCIOS" }],
};

const PRODUTO_EXISTENTE = {
  id: 10,
  nome: "Queijo minas",
  sku: "SKU-10",
  preco_custo: 20,
  preco_venda: 35,
  estoque_atual: 0,
  estoque_minimo: 0,
  statusProduto: "ATIVO",
  unidade_medida: "KG",
  categoriaId: 1,
  ncm: "0406.10.90",
  cest: null,
  cfop: "5102",
  origem: 0,
  tributacoes: [
    {
      tipo_operacao: "SAIDA",
      cfop_estadual: "5102",
      cfop_interestadual: "6102",
      icms_cst: null,
      icms_csosn: "102",
      icms_aliquota: null,
      ipi_cst: null,
      ipi_aliquota: null,
      ipi_enquadramento: null,
      pis_cst: "49",
      pis_aliquota: null,
      cofins_cst: "49",
      cofins_aliquota: null,
    },
  ],
};

interface ApiSimulada {
  corpos: { metodo: string; caminho: string; corpo: unknown }[];
}

async function simularApi(page: Page, opcoes: { nfeAtiva: boolean }): Promise<ApiSimulada> {
  const api: ApiSimulada = { corpos: [] };
  await page.addInitScript((token) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "u1", email: "teste@e2e.com", nome: "Teste", role: "ADMIN", ativo: true }),
    );
  }, tokenFalso());

  await page.route(/\/api\/v1\//, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const caminho = url.pathname.replace(/^.*\/api\/v1/, "");
    const metodo = req.method();
    const json = (body: Json, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (metodo !== "GET") {
      api.corpos.push({ metodo, caminho, corpo: req.postDataJSON() });
    }

    if (caminho === "/fiscal/contexto") {
      return json({
        regimeTributario: "SIMPLES_NACIONAL",
        usaCsosn: true,
        nfeAtiva: opcoes.nfeAtiva,
        cfopInterno: "5102",
        cfopInterestadual: "6102",
      });
    }
    const tabela = caminho.match(/^\/fiscal\/tabelas\/([\w-]+)$/);
    if (tabela) {
      const lista = (TABELAS[tabela[1]] ?? []) as { codigo: string }[];
      const escopo = url.searchParams.get("escopo");
      const operacao = url.searchParams.get("operacao");
      const filtrada = lista.filter((i) => {
        if (tabela[1] !== "cfop") return true;
        const prefixo = operacao === "ENTRADA" ? ["1", "2"] : ["5", "6"];
        return escopo
          ? i.codigo.startsWith(prefixo[escopo === "estadual" ? 0 : 1])
          : prefixo.some((p) => i.codigo.startsWith(p));
      });
      return json(filtrada);
    }
    if (caminho === "/fiscal/ncm") {
      return json([
        { codigo: "04061010", descricao: "Mozarela", caminho: "Queijos e requeijão › Queijos frescos" },
        { codigo: "04061090", descricao: "Outros", caminho: "Queijos e requeijão › Queijos frescos" },
      ]);
    }
    if (caminho.startsWith("/categorias")) return json({ data: [{ id: 1, nome: "Laticínios" }] });
    if (caminho.startsWith("/fornecedores")) return json({ data: [] });
    if (caminho === "/produtos" && metodo === "POST") return json({ id: 11, sku: "SKU-11" }, 201);
    if (caminho === "/produtos/10" && metodo === "GET") return json(PRODUTO_EXISTENTE);
    if (caminho === "/produtos/10" && metodo === "PATCH") return json(PRODUTO_EXISTENTE);
    if (caminho.startsWith("/produtos")) return json({ data: [], total: 0 });
    return json(metodo === "GET" ? [] : {});
  });
  return api;
}

test.describe("produto — dados fiscais", () => {
  test("criação: exige dados fiscais quando a empresa emite NF-e e envia a tributação de saída", async ({ page }) => {
    const api = await simularApi(page, { nfeAtiva: true });
    await page.goto("/produtos/novo");

    await page.getByPlaceholder("Ex: Notebook Dell Inspiron").fill("Queijo mussarela");
    await page.getByRole("button", { name: "Criar Produto" }).first().click();

    // Sem os obrigatórios, vai para a aba fiscal e não envia
    await expect(page.getByRole("tab", { name: /Dados Fiscais/ })).toHaveAttribute("data-state", "active");
    await expect(page.getByText("Informe a origem da mercadoria")).toBeVisible();
    await expect(page.getByText("Informe o CSOSN")).toBeVisible();
    expect(api.corpos).toHaveLength(0);

    // Origem
    await page.getByRole("combobox").filter({ hasText: "Selecione a origem" }).click();
    await page.getByRole("option", { name: /^0 — Nacional/ }).click();

    // NCM pela busca
    await page.getByRole("button", { name: "Buscar NCM" }).click();
    await page.getByPlaceholder("Ex.: queijo, 0406").fill("queijo");
    await expect(page.getByRole("option", { name: /Mozarela/ })).toBeVisible();
    await page.getByRole("option", { name: /Mozarela/ }).click();
    await expect(page.getByPlaceholder("0000.00.00")).toHaveValue("0406.10.10");

    // CEST filtrado pelo NCM
    await page.getByRole("button", { name: "Buscar CEST" }).click();
    await expect(page.getByText("Mostrando CEST aplicáveis ao NCM 0406.10.10")).toBeVisible();
    await page.getByRole("option", { name: /Queijo muçarela/ }).click();

    // Saída: CFOP digitado, CSOSN pela busca, PIS/COFINS digitados
    await page.getByPlaceholder("5102", { exact: true }).fill("5102");
    await page.getByRole("button", { name: "Buscar CSOSN" }).click();
    await page.getByRole("option", { name: /^500/ }).click();
    await page.getByPlaceholder("01", { exact: true }).first().fill("49");
    await page.getByPlaceholder("0,65", { exact: true }).first().fill("0,65");
    await page.getByPlaceholder("01", { exact: true }).nth(1).fill("49");

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Criar Produto" }).first().click();
    await expect(page).toHaveURL(/\/produtos$/);

    const post = api.corpos.find((c) => c.metodo === "POST" && c.caminho === "/produtos");
    expect(post?.corpo).toMatchObject({
      nome: "Queijo mussarela",
      origem: 0,
      ncm: "0406.10.10",
      cest: "1702401",
      tributacoes: [
        {
          tipo_operacao: "SAIDA",
          cfop_estadual: "5102",
          icms_csosn: "500",
          pis_cst: "49",
          pis_aliquota: 0.65,
          cofins_cst: "49",
        },
      ],
    });
    expect(post?.corpo).not.toHaveProperty("cfop");
    expect((post?.corpo as { tributacoes: unknown[] }).tributacoes).toHaveLength(1);
  });

  test("edição: carrega a tributação e só envia a operação alterada", async ({ page }) => {
    const api = await simularApi(page, { nfeAtiva: true });
    await page.goto("/produtos/10/editar");

    await page.getByRole("tab", { name: /Dados Fiscais/ }).click();
    await expect(page.getByPlaceholder("0000.00.00")).toHaveValue("0406.10.90");
    await expect(page.getByPlaceholder("102", { exact: true })).toHaveValue("102");

    await page.getByRole("tab", { name: "Entrada (compra)" }).click();
    await page.getByPlaceholder("1102", { exact: true }).fill("1102");
    await page.getByPlaceholder("50", { exact: true }).first().fill("70");

    await page.getByRole("button", { name: "Salvar Alterações" }).first().click();
    await expect(page).toHaveURL(/\/produtos$/);

    const patch = api.corpos.find((c) => c.metodo === "PATCH");
    const corpo = patch?.corpo as Record<string, unknown>;
    expect(corpo.tributacoes).toEqual([
      expect.objectContaining({ tipo_operacao: "ENTRADA", cfop_estadual: "1102", pis_cst: "70" }),
    ]);
    // Nada fiscal além da operação alterada
    for (const campo of ["origem", "ncm", "cest", "cfop"]) {
      expect(corpo).not.toHaveProperty(campo);
    }
  });

  test("empresa sem NF-e: dados fiscais são opcionais", async ({ page }) => {
    const api = await simularApi(page, { nfeAtiva: false });
    await page.goto("/produtos/novo");
    await page.getByPlaceholder("Ex: Notebook Dell Inspiron").fill("Produto sem nota");
    await page.getByRole("button", { name: "Criar Produto" }).first().click();
    await expect(page).toHaveURL(/\/produtos$/);
    const post = api.corpos.find((c) => c.metodo === "POST");
    expect(post?.corpo).not.toHaveProperty("tributacoes");
    expect(post?.corpo).not.toHaveProperty("origem");
  });
});
