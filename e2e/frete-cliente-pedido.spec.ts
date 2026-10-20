import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Frete padrão no cliente e modalidade do frete no pedido — task 004 (etapa 1).
 * API simulada: não precisa de backend nem de credenciais.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const TRANSPORTADORAS = [
  { id: 3, nome: "Rápido Transportes LTDA", nome_fantasia: "Rápido Transportes", ativo: true },
  { id: 4, nome: "Lenta Cargas", nome_fantasia: null, ativo: true },
];
const CLIENTES = [
  { id: 1, nome: "Cliente Com Frete", statusCliente: "ATIVO", tipoPessoa: "PESSOA_FISICA", cpf_cnpj: "" },
  { id: 2, nome: "Cliente Sem Frete", statusCliente: "ATIVO", tipoPessoa: "PESSOA_FISICA", cpf_cnpj: "" },
];
const CONDICAO_PIX = { id: 9, descricao: "À vista", forma_pagamento: "PIX", parcelado: false, padrao: true };

async function simularApi(page: Page) {
  const criados: Record<string, unknown>[] = [];
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

    if (caminho === "/transportadoras") {
      return json({ transportadoras: TRANSPORTADORAS, total: TRANSPORTADORAS.length, page: 1, limit: 100 });
    }
    if (caminho === "/clientes" && req.method() === "POST") {
      const body = req.postDataJSON() as Record<string, unknown>;
      criados.push(body);
      return json({ id: 50, ...body }, 201);
    }
    if (caminho === "/clientes") return json({ data: CLIENTES, total: CLIENTES.length });
    const dados = /^\/clientes\/(\d+)\/dados-pedido$/.exec(caminho);
    if (dados) {
      const id = Number(dados[1]);
      return json({
        cliente: { id, nome: CLIENTES.find((c) => c.id === id)?.nome, cpf_cnpj: "", limite_credito: null },
        condicao_pagamento_padrao: CONDICAO_PIX,
        condicoes_pagamento: [CONDICAO_PIX],
        transportadora_padrao: id === 1 ? { id: 3, nome: "Rápido Transportes" } : null,
        modalidade_frete_padrao: id === 1 ? 0 : null,
      });
    }
    if (/^\/clientes\/\d+\/limite-credito$/.test(caminho)) {
      return json({ limite_total: null, valor_utilizado: 0, valor_disponivel: null, ultrapassou_limite: false });
    }
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    return json([]);
  });
  return { criados };
}

test.describe("frete padrão do cliente", () => {
  test("novo cliente: envia modalidade e transportadora padrão", async ({ page }) => {
    const api = await simularApi(page);
    await page.goto("/clientes/novo");

    await page.getByPlaceholder("Nome do cliente").fill("Cliente E2E Frete");
    await page.getByRole("combobox", { name: "Modalidade do frete padrão" }).click();
    await page.getByRole("option", { name: "Por conta do destinatário (FOB)" }).click();
    await page.getByRole("combobox", { name: "Transportadora padrão" }).click();
    await page.getByRole("option", { name: "Rápido Transportes" }).click();

    await page.getByRole("button", { name: "Criar Cliente" }).first().click();
    await expect.poll(() => api.criados.length).toBe(1);
    expect(api.criados[0]).toMatchObject({ transportadora_padrao_id: 3, modalidade_frete_padrao: 1 });
  });

  test("sem transporte limpa e desabilita a transportadora no cadastro", async ({ page }) => {
    await simularApi(page);
    await page.goto("/clientes/novo");

    const transportadora = page.getByRole("combobox", { name: "Transportadora padrão" });
    await transportadora.click();
    await page.getByRole("option", { name: "Lenta Cargas" }).click();
    await page.getByRole("combobox", { name: "Modalidade do frete padrão" }).click();
    await page.getByRole("option", { name: "Sem transporte" }).click();

    await expect(transportadora).toHaveText(/Nenhuma/);
    await expect(transportadora).toBeDisabled();
  });
});

test.describe("pedido novo puxa o frete do cliente", () => {
  test("preenche pelo cliente, acompanha a troca de cliente e respeita 'sem transporte'", async ({ page }) => {
    await simularApi(page);
    await page.goto("/pedidos/novo");

    await page.getByRole("combobox").filter({ hasText: "Selecione um cliente" }).click();
    await page.getByRole("option", { name: "Cliente Com Frete" }).click();

    const modalidade = page.getByRole("combobox", { name: "Modalidade do frete do pedido" });
    const transportadora = page.getByRole("combobox", { name: "Transportadora do pedido" });
    await expect(modalidade).toHaveText(/Por conta do remetente \(CIF\)/);
    await expect(transportadora).toHaveText(/Rápido Transportes/);

    // Cliente sem padrão: campos que o usuário não mexeu acompanham (ficam vazios)
    await page.getByRole("combobox").filter({ hasText: "Cliente Com Frete" }).click();
    await page.getByRole("option", { name: "Cliente Sem Frete" }).click();
    await expect(modalidade).toHaveText(/Não definida/);
    await expect(transportadora).toHaveText(/Selecione uma transportadora/);

    // Exceção feita pelo usuário + sem transporte: transportadora sai e fica desabilitada
    await transportadora.click();
    await page.getByRole("option", { name: "Lenta Cargas" }).click();
    await modalidade.click();
    await page.getByRole("option", { name: "Sem transporte" }).click();
    await expect(transportadora).toBeDisabled();
    await expect(transportadora).toHaveText(/Sem transporte/);
  });

  test("valor alterado pelo usuário não é sobrescrito ao trocar de cliente", async ({ page }) => {
    await simularApi(page);
    await page.goto("/pedidos/novo");

    await page.getByRole("combobox").filter({ hasText: "Selecione um cliente" }).click();
    await page.getByRole("option", { name: "Cliente Sem Frete" }).click();
    const transportadora = page.getByRole("combobox", { name: "Transportadora do pedido" });
    await transportadora.click();
    await page.getByRole("option", { name: "Lenta Cargas" }).click();

    await page.getByRole("combobox").filter({ hasText: "Cliente Sem Frete" }).click();
    await page.getByRole("option", { name: "Cliente Com Frete" }).click();

    // Transportadora escolhida pelo usuário fica; a modalidade (não mexida) vem do cliente
    await expect(transportadora).toHaveText(/Lenta Cargas/);
    await expect(page.getByRole("combobox", { name: "Modalidade do frete do pedido" })).toHaveText(
      /Por conta do remetente \(CIF\)/,
    );
  });
});
