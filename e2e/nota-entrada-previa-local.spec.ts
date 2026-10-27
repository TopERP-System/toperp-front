import { expect, test, type Page } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Task 009 contra a API LOCAL (clone): código de barras no produto, prévia do XML da nota de entrada,
 * cadastro do fornecedor pelo emitente e do produto pelo item (com o vínculo).
 * Grava um código de barras no primeiro produto e devolve o valor original no fim; apaga o fornecedor
 * e o produto criados (o vínculo sai junto, ON DELETE CASCADE).
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/nota-entrada-previa-local.spec.ts
 */

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
const EAN = "7891234567895";
const CHAVE = "35261011222333000181550010000000091000000097";

function xmlNota(): string {
  const det = (n: number, cprod: string, ean: string) => `<det nItem="${n}"><prod><cProd>${cprod}</cProd>
    <cEAN>${ean}</cEAN><xProd>ITEM ${cprod}</xProd><NCM>07041000</NCM><CFOP>6102</CFOP><uCom>CX</uCom>
    <qCom>2.0000</qCom><vUnCom>10.00</vUnCom><vProd>20.00</vProd></prod>
    <imposto><ICMS><ICMSSN102><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto></det>`;
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe><infNFe Id="NFe${CHAVE}" versao="4.00"><ide><mod>55</mod><natOp>VENDA</natOp><serie>1</serie><nNF>9</nNF>
<dhEmi>2026-10-26T09:00:00-03:00</dhEmi></ide>
<emit><CNPJ>11222333000181</CNPJ><xNome>FORNECEDOR TESTE 009 LTDA</xNome><xFant>Teste 009</xFant>
<enderEmit><xLgr>Rua A</xLgr><nro>1</nro><xBairro>Centro</xBairro><cMun>3550308</cMun><xMun>Sao Paulo</xMun>
<UF>SP</UF><CEP>01001000</CEP><fone>1133334444</fone></enderEmit><IE>123</IE></emit>
<dest><CNPJ>99888777000166</CNPJ><xNome>OUTRA EMPRESA</xNome></dest>
${det(1, "ABC", EAN)}${det(2, "XYZ", "SEM GTIN")}
<total><ICMSTot><vProd>40.00</vProd><vNF>40.00</vNF></ICMSTot></total></infNFe></NFe>
<protNFe versao="4.00"><infProt><nProt>1</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;
}

async function api(page: Page, metodo: "GET" | "PATCH" | "POST" | "DELETE", caminho: string, dados?: unknown) {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  const resposta = await page.request.fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}` },
    ...(caminho.endsWith("/previa")
      ? { multipart: { xml: { name: "nota.xml", mimeType: "text/xml", buffer: Buffer.from(xmlNota()) } } }
      : { data: dados }),
  });
  expect(resposta.ok(), `${metodo} ${caminho}`).toBeTruthy();
  const corpo = await resposta.text();
  return corpo ? JSON.parse(corpo) : null;
}

test("task 009 — código de barras no produto e prévia do XML", async ({ page }) => {
  exigirCredenciais();
  // Nunca fala com a API de produção
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());
  await login(page);

  const lista = await api(page, "GET", "/produtos?limit=1");
  const produto = (lista.data ?? lista.produtos ?? lista)[0];
  const original = (await api(page, "GET", `/produtos/${produto.id}`)).codigo_barras ?? null;

  try {
    await test.step("código de barras inválido é recusado; válido é gravado", async () => {
      await page.goto(`/produtos/${produto.id}/editar`);
      const campo = page.getByPlaceholder(/GTIN\/EAN da embalagem/);
      await campo.fill("7891234567894");
      await page.getByRole("button", { name: /Salvar/ }).first().click();
      await expect(page.getByText("Código de barras inválido", { exact: false })).toBeVisible();

      await campo.fill(EAN);
      await page.getByRole("button", { name: /Salvar/ }).first().click();
      await expect(page.getByText("Produto atualizado com sucesso!")).toBeVisible();
      expect((await api(page, "GET", `/produtos/${produto.id}`)).codigo_barras).toBe(EAN);
    });

    await test.step("prévia do XML pelo menu Notas de Entrada", async () => {
      await page.goto("/notas-entrada");
      await expect(page.getByRole("heading", { name: "Notas de Entrada" })).toBeVisible();
      await page.locator('input[type="file"]').setInputFiles({
        name: "nota.xml",
        mimeType: "text/xml",
        buffer: Buffer.from(xmlNota()),
      });

      await expect(page.getByText("Resolva antes de importar")).toBeVisible();
      await expect(
        page.getByText("Fornecedor não cadastrado: 11222333000181 – FORNECEDOR TESTE 009 LTDA"),
      ).toBeVisible();
      await expect(page.getByText("Produto não associado: Item 2 – ITEM XYZ")).toBeVisible();
      // A nota foi emitida para outro CNPJ: aviso que não bloqueia
      await expect(page.getByText(/A nota foi emitida para 99888777000166/)).toBeVisible();

      const linhas = page.getByRole("row");
      await expect(linhas.filter({ hasText: "ITEM ABC" })).toContainText(produto.nome);
      await expect(linhas.filter({ hasText: "ITEM ABC" })).toContainText("Pelo código de barras");
      await expect(linhas.filter({ hasText: "ITEM ABC" })).toContainText("6102 →");
      await expect(page.getByLabel("CFOP de entrada do item 1")).toHaveValue("2102");
      await expect(linhas.filter({ hasText: "ITEM XYZ" })).toContainText("Não associado");
      await page.screenshot({ path: "test-results/nota-entrada-previa.png", fullPage: true });
    });

    await test.step("cadastra o fornecedor pelo emitente", async () => {
      await expect(page.getByText("Cadastre o fornecedor primeiro")).toBeVisible();
      await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("FORNECEDOR TESTE 009 LTDA")).toBeVisible();
      await expect(dialog.getByLabel("Nome fantasia *")).toHaveValue("Teste 009");
      await dialog.getByRole("button", { name: "Cadastrar fornecedor" }).click();
      await expect(page.getByText("Fornecedor cadastrado!")).toBeVisible();
      await expect(page.getByText("Fornecedor não cadastrado", { exact: false })).toBeHidden();
      await expect(page.getByText("Teste 009", { exact: true })).toBeVisible();
    });

    await test.step("cadastra o produto pelo item, 1 CX = 12 UN, e grava o vínculo", async () => {
      await page.getByRole("row").filter({ hasText: "ITEM XYZ" }).getByRole("button", { name: "Associar" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Nome do produto *")).toHaveValue("ITEM XYZ");
      await dialog.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "UN", exact: true }).click();
      await dialog.getByLabel("Conversão de unidade").fill("12");
      await expect(dialog.getByText("custo R$ 0,83 por UN", { exact: false })).toBeVisible();
      await dialog.getByRole("button", { name: "Cadastrar e associar" }).click();
      await expect(page.getByText("Produto cadastrado e associado!")).toBeVisible();

      await expect(page.getByText("Tudo certo para importar")).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: "ITEM XYZ" })).toContainText(
        "Vínculo do fornecedor · 1 CX = 12 UN",
      );
    });

    await test.step("a mesma nota de novo já vem com tudo associado", async () => {
      await page.reload();
      await page.locator('input[type="file"]').setInputFiles({
        name: "nota.xml",
        mimeType: "text/xml",
        buffer: Buffer.from(xmlNota()),
      });
      await expect(page.getByText("Tudo certo para importar")).toBeVisible();
      await page.screenshot({ path: "test-results/nota-entrada-resolvida.png", fullPage: true });
    });

    await test.step("dados gravados vieram do XML", async () => {
      const previa = await api(page, "POST", "/notas-entrada/xml/previa");
      const fornecedor = await api(page, "GET", `/fornecedor/${previa.fornecedor.id}`);
      expect(fornecedor).toMatchObject({
        nome_fantasia: "Teste 009",
        cpf_cnpj: "11222333000181",
        inscricao_estadual: "123",
      });
      expect(JSON.stringify(fornecedor)).toContain("Rua A");
      expect(JSON.stringify(fornecedor)).toContain("1133334444");

      const item = previa.itens.find((i: { codigo: string }) => i.codigo === "XYZ");
      const criado = await api(page, "GET", `/produtos/${item.produto.id}`);
      expect(criado).toMatchObject({ nome: "ITEM XYZ", unidade_medida: "UN", ncm: "07041000" });
      expect(Number(criado.preco_custo)).toBeCloseTo(0.83, 2);
    });

    await test.step("arquivo que não é .xml é recusado no navegador", async () => {
      await page.locator('input[type="file"]').setInputFiles({
        name: "nota.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("x"),
      });
      await expect(page.getByText("O arquivo precisa ser .xml")).toBeVisible();
    });
  } finally {
    const previa = await api(page, "POST", "/notas-entrada/xml/previa");
    const criado = previa.itens.find((i: { codigo: string }) => i.codigo === "XYZ")?.produto;
    if (criado) await api(page, "DELETE", `/produtos/${criado.id}`);
    if (previa.fornecedor) await api(page, "DELETE", `/fornecedor/${previa.fornecedor.id}`);
    await api(page, "PATCH", `/produtos/${produto.id}`, { codigo_barras: original });
  }
});
