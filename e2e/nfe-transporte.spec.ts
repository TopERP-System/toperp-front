import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Seção "Transporte" da pré-emissão da NF-e — task 004 (etapa 2).
 * API simulada: não precisa de backend nem de credenciais.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const PEDIDO = {
  id: 10,
  numero_pedido: "PV-10",
  tipo: "VENDA",
  status: "ABERTO",
  cliente_id: 1,
  cliente: { id: 1, nome: "Cliente Alfa" },
  data_pedido: "2026-10-20",
  subtotal: 100,
  frete: 0,
  desconto_valor: 0,
  valor_total: 100,
  itens: [],
};

const TRANSPORTADORA = {
  id: 3,
  nome: "Rápido Transportes LTDA",
  nome_fantasia: "Rápido Transportes",
  cnpj: "11222333000181",
  inscricao_estadual: "123456789110",
  cidade: "Camanducaia",
  estado: "MG",
};

function preEmissao(transporte: Record<string, unknown>, faltantes: unknown[] = []) {
  return {
    pedido: {
      id: 10, numero_pedido: "PV-10", tipo: "VENDA", status: "ABERTO", subtotal: 100, frete: 0,
      desconto_valor: 0, valor_total: 100, data_pedido: "2026-10-20", forma_pagamento: "PIX",
    },
    empresa: { cnpj: "11222333000181", razao_social: "Empresa Teste", inscricao_estadual: "123" },
    spedy_configurado: true,
    spedy_ambiente: "homologacao",
    nota_existente: null,
    cliente: {
      id: 1, nome: "Cliente Alfa", cpf_cnpj: "12345678909",
      endereco: {
        cep: "37650-000", logradouro: "Rua A", numero: "1", bairro: "Centro",
        cidade: "Camanducaia", estado: "MG", codigo_ibge: "3110608",
      },
    },
    itens: [
      { produto_id: 1, nome: "Batata", sku: "BAT", ncm: "07019000", quantidade: 120.5, preco_unitario: 1, subtotal: 120.5 },
    ],
    transporte: {
      modalidade_frete: 0,
      transportadora: TRANSPORTADORA,
      peso_liquido_sugerido: 120.5,
      itens_sem_peso: 0,
      enviado_para_spedy: false,
      ...transporte,
    },
    campos_faltantes: faltantes,
    avisos: [],
    pode_emitir: faltantes.length === 0,
  };
}

async function simularApi(page: Page, transporte: Record<string, unknown> = {}, faltantes: unknown[] = []) {
  const emissoes: Record<string, unknown>[] = [];
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
    const json = (body: Json, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (caminho === "/pedidos/10/nota-fiscal/pre-emissao") return json(preEmissao(transporte, faltantes));
    if (caminho === "/pedidos/10/nota-fiscal/emitir" && req.method() === "POST") {
      emissoes.push(req.postDataJSON() as Record<string, unknown>);
      return json({ id: 1, pedido_id: 10, status: "authorized", numero_nf: 123 });
    }
    if (caminho === "/pedidos") return json({ data: [PEDIDO], total: 1, page: 1, limit: 15 });
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    return json([]);
  });
  return { emissoes };
}

async function abrirEmissao(page: Page) {
  await page.goto("/pedidos");
  await page.getByTitle("Ações").filter({ visible: true }).first().click();
  await page.getByRole("menuitem", { name: "Emitir nota fiscal" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Transporte" })).toBeVisible();
  return dialog;
}

test.describe("NF-e — transporte na pré-emissão", () => {
  test("mostra modalidade e transportadora do pedido e envia os pesos", async ({ page }) => {
    const api = await simularApi(page);
    const dialog = await abrirEmissao(page);

    await expect(dialog.getByText("Por conta do remetente (CIF)")).toBeVisible();
    await expect(dialog.getByText("Rápido Transportes", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/ainda não saem na NF-e/)).toBeVisible();

    // Peso líquido vem sugerido; bruto começa vazio
    await expect(dialog.getByLabel("Peso líquido (kg)")).toHaveValue("120,5");
    await expect(dialog.getByLabel("Peso bruto (kg)")).toHaveValue("");
    await dialog.getByLabel("Peso bruto (kg)").fill("125,75");

    await page.getByRole("button", { name: "Emitir NF-e" }).click();
    await expect.poll(() => api.emissoes.length).toBe(1);
    expect(api.emissoes[0]).toMatchObject({ peso_liquido: 120.5, peso_bruto: 125.75 });
    expect(api.emissoes[0]).not.toHaveProperty("modalidade_frete");
  });

  test("pesos independentes: apagar o líquido envia null", async ({ page }) => {
    const api = await simularApi(page);
    const dialog = await abrirEmissao(page);

    await dialog.getByLabel("Peso líquido (kg)").fill("");
    await page.getByRole("button", { name: "Emitir NF-e" }).click();
    await expect.poll(() => api.emissoes.length).toBe(1);
    expect(api.emissoes[0]).toMatchObject({ peso_liquido: null, peso_bruto: null });
  });

  test("bruto menor que o líquido bloqueia a emissão", async ({ page }) => {
    await simularApi(page);
    const dialog = await abrirEmissao(page);

    await dialog.getByLabel("Peso bruto (kg)").fill("100");
    await expect(dialog.getByText("O peso bruto não pode ser menor que o peso líquido")).toBeVisible();
    await expect(page.getByRole("button", { name: "Emitir NF-e" })).toBeDisabled();
  });

  test("pedido antigo sem modalidade: exige escolher e envia a escolhida", async ({ page }) => {
    const api = await simularApi(page, {
      modalidade_frete: null,
      transportadora: null,
      peso_liquido_sugerido: null,
      itens_sem_peso: 1,
    });
    const dialog = await abrirEmissao(page);

    await expect(dialog.getByText(/Não calculado: 1 item sem peso/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Emitir NF-e" })).toBeDisabled();

    await dialog.getByRole("combobox", { name: "Modalidade do frete da NF-e" }).click();
    await page.getByRole("option", { name: "Por conta do destinatário (FOB)" }).click();
    await page.getByRole("button", { name: "Emitir NF-e" }).click();
    await expect.poll(() => api.emissoes.length).toBe(1);
    expect(api.emissoes[0]).toMatchObject({ modalidade_frete: 1, peso_liquido: null });
  });

  test("problema no cadastro da transportadora aparece e bloqueia (envio ligado)", async ({ page }) => {
    await simularApi(page, { enviado_para_spedy: true }, [
      {
        campo: "transporte.transportadora",
        label: "UF da transportadora (obrigatória quando a inscrição estadual é informada) — corrija no cadastro da transportadora",
        secao: "transporte",
      },
    ]);
    await abrirEmissao(page);

    await expect(page.getByText(/UF da transportadora/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Emitir NF-e" })).toBeDisabled();
  });
});
