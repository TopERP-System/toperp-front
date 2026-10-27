import { expect, test, type Page } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Task 009 contra a API LOCAL (clone): código de barras no produto + prévia do XML da nota de entrada.
 * Grava um código de barras no primeiro produto e devolve o valor original no fim.
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
<emit><CNPJ>11222333000181</CNPJ><xNome>FORNECEDOR TESTE 009 LTDA</xNome><IE>123</IE></emit>
<dest><CNPJ>99888777000166</CNPJ><xNome>OUTRA EMPRESA</xNome></dest>
${det(1, "ABC", EAN)}${det(2, "XYZ", "SEM GTIN")}
<total><ICMSTot><vProd>40.00</vProd><vNF>40.00</vNF></ICMSTot></total></infNFe></NFe>
<protNFe versao="4.00"><infProt><nProt>1</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;
}

async function api(page: Page, metodo: "GET" | "PATCH", caminho: string, dados?: unknown) {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  const resposta = await page.request.fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}` },
    data: dados,
  });
  expect(resposta.ok(), `${metodo} ${caminho}`).toBeTruthy();
  return resposta.json();
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
      await expect(linhas.filter({ hasText: "ITEM ABC" })).toContainText("6102 → 2102");
      await expect(linhas.filter({ hasText: "ITEM XYZ" })).toContainText("Não associado");
      await page.screenshot({ path: "test-results/nota-entrada-previa.png", fullPage: true });
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
    await api(page, "PATCH", `/produtos/${produto.id}`, { codigo_barras: original });
  }
});
