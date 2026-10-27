import { expect, test, type Page } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Task 009 (confirmação) contra a API LOCAL (clone): importa o XML, edita o CFOP, confirma,
 * vê na lista e no detalhe e cancela pela tela. Cria fornecedor, produto e vínculos pela API.
 * Rode só no clone: a nota cancelada, o pedido de compra cancelado, as movimentações e o produto
 * "ITEM QUILO TESTE 009" (preso ao pedido) ficam no banco: a API não apaga essas linhas.
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/nota-entrada-confirmar-local.spec.ts
 */

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
const CHAVE = "35261011222333000181550010000000111000000111";

const XML = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe><infNFe Id="NFe${CHAVE}" versao="4.00"><ide><mod>55</mod><natOp>VENDA</natOp><serie>1</serie><nNF>11</nNF>
<dhEmi>2026-10-26T09:00:00-03:00</dhEmi></ide>
<emit><CNPJ>11222333000181</CNPJ><xNome>FORNECEDOR TESTE 009 LTDA</xNome><IE>123</IE></emit>
<dest><CPF>71291953477</CPF><xNome>EDUARDO</xNome></dest>
<det nItem="1"><prod><cProd>ABC</cProd><cEAN>SEM GTIN</cEAN><xProd>ITEM CAIXA</xProd><NCM>07041000</NCM><CFOP>6102</CFOP>
<uCom>CX</uCom><qCom>2.0000</qCom><vUnCom>10.00</vUnCom><vProd>20.00</vProd></prod>
<imposto><ICMS><ICMSSN102><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto></det>
<det nItem="2"><prod><cProd>KG1</cProd><cEAN>SEM GTIN</cEAN><xProd>ITEM QUILO</xProd><NCM>07041000</NCM><CFOP>6405</CFOP>
<uCom>KG</uCom><qCom>120.5000</qCom><vUnCom>2.00</vUnCom><vProd>241.00</vProd></prod>
<imposto><ICMS><ICMSSN102><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto></det>
<total><ICMSTot><vProd>261.00</vProd><vFrete>9.00</vFrete><vNF>270.00</vNF></ICMSTot></total>
<cobr><dup><nDup>001</nDup><dVenc>2026-11-26</dVenc><vDup>135.00</vDup></dup><dup><nDup>002</nDup><dVenc>2026-12-26</dVenc><vDup>135.00</vDup></dup></cobr>
</infNFe></NFe><protNFe versao="4.00"><infProt><nProt>1</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;

async function api(page: Page, metodo: "GET" | "POST" | "PUT" | "DELETE", caminho: string, dados?: unknown) {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  const resposta = await page.request.fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}` },
    data: dados,
  });
  expect(resposta.ok(), `${metodo} ${caminho}: ${await resposta.text()}`).toBeTruthy();
  const corpo = await resposta.text();
  return corpo ? JSON.parse(corpo) : null;
}

test("task 009 — confirmar a entrada, ver na lista e cancelar", async ({ page }) => {
  exigirCredenciais();
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());
  await login(page);

  const lista = await api(page, "GET", "/produtos?limit=1");
  const caixa = (lista.data ?? lista.produtos ?? lista)[0];
  const estoqueAntes = (await api(page, "GET", `/produtos/${caixa.id}`)).estoque_atual;
  const fornecedor = await api(page, "POST", "/fornecedor", {
    nome_fantasia: "Fornecedor Teste 009", cpf_cnpj: "11.222.333/0001-81", tipoFornecedor: "PESSOA_JURIDICA",
  });
  const quilo = await api(page, "POST", "/produtos", {
    nome: "ITEM QUILO TESTE 009", sku: "", unidade_medida: "KG", statusProduto: "ATIVO", estoque_atual: 0, estoque_minimo: 0,
  });

  try {
    await api(page, "PUT", "/notas-entrada/vinculos", {
      fornecedor_id: fornecedor.id, codigo_fornecedor: "ABC", produto_id: caixa.id, fator_conversao: 12, unidade_fornecedor: "CX",
    });
    await api(page, "PUT", "/notas-entrada/vinculos", {
      fornecedor_id: fornecedor.id, codigo_fornecedor: "KG1", produto_id: quilo.id, fator_conversao: 1, unidade_fornecedor: "KG",
    });

    await page.goto("/notas-entrada");
    await page.locator('input[type="file"]').setInputFiles({ name: "nota11.xml", mimeType: "text/xml", buffer: Buffer.from(XML) });

    await test.step("CFOP sem equivalente bloqueia até o usuário digitar", async () => {
      // 6405 → 1405 não existe na tabela: o item 2 fica sem sugestão
      await expect(page.getByText("CFOP não informado: Item 2 – ITEM QUILO")).toBeVisible();
      await expect(page.getByRole("button", { name: "Confirmar entrada" })).toBeDisabled();
      await page.getByLabel("CFOP de entrada do item 2").fill("2102");
      await expect(page.getByText("Tudo certo para importar")).toBeVisible();
    });

    await test.step("parcelas do XML e confirmação", async () => {
      await expect(page.getByText("Usar as 2 parcela(s) do XML")).toBeVisible();
      await expect(page.getByText("vence 26/11/2026")).toBeVisible();
      await page.getByRole("button", { name: "Confirmar entrada" }).click();
      await expect(page.getByText(/Entrada confirmada! Pedido de compra COMP-/)).toBeVisible();
      expect((await api(page, "GET", `/produtos/${caixa.id}`)).estoque_atual).toBe(estoqueAntes + 24);
      expect((await api(page, "GET", `/produtos/${quilo.id}`)).estoque_atual).toBe(120.5);
    });

    await test.step("lista e detalhe", async () => {
      const linha = page.getByRole("row").filter({ hasText: "11 · série 1" });
      await expect(linha).toContainText("Efetivada");
      await expect(linha).toContainText("R$ 270,00");
      await linha.getByRole("button", { name: "Ver nota" }).click();
      const detalhe = page.getByRole("dialog");
      await expect(detalhe.getByRole("row").filter({ hasText: "ITEM CAIXA" })).toContainText("24");
      await expect(detalhe.getByRole("row").filter({ hasText: "ITEM QUILO" })).toContainText("120,5 KG");
      await expect(detalhe.getByRole("row").filter({ hasText: "ITEM QUILO" })).toContainText("6405 → 2102");
      await page.screenshot({ path: "test-results/nota-entrada-detalhe.png" });
      await page.keyboard.press("Escape");
    });

    await test.step("cancelar pela tela estorna o estoque", async () => {
      const linha = page.getByRole("row").filter({ hasText: "11 · série 1" });
      await linha.getByRole("button", { name: "Cancelar entrada" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar entrada" }).click();
      await expect(page.getByText("Entrada cancelada")).toBeVisible();
      await expect(linha).toContainText("Cancelada");
      expect((await api(page, "GET", `/produtos/${caixa.id}`)).estoque_atual).toBe(estoqueAntes);
      expect((await api(page, "GET", `/produtos/${quilo.id}`)).estoque_atual).toBe(0);
    });
  } finally {
    await api(page, "DELETE", `/produtos/${quilo.id}`).catch(() => undefined);
    await api(page, "DELETE", `/fornecedor/${fornecedor.id}`).catch(() => undefined);
  }
});
