import { expect, test, type Page } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Task 009: emitente sem fornecedor com o mesmo CNPJ → o usuário associa a nota a um fornecedor já
 * cadastrado (sem CNPJ). Ao confirmar, o CNPJ da nota vai para o cadastro dele e a próxima nota já
 * vem associada sozinha. Rode só no clone: o fornecedor "Horta Sem CNPJ 009", a nota cancelada e o
 * pedido de compra cancelado ficam no banco (a API não apaga fornecedor preso a pedido).
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/nota-entrada-fornecedor-existente-local.spec.ts
 */

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
const CNPJ = "11444777000161";
const CHAVE = `352610${CNPJ}550010000000121000000121`;

const XML = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe><infNFe Id="NFe${CHAVE}" versao="4.00"><ide><mod>55</mod><natOp>VENDA</natOp><serie>1</serie><nNF>12</nNF>
<dhEmi>2026-10-27T09:00:00-03:00</dhEmi></ide>
<emit><CNPJ>${CNPJ}</CNPJ><xNome>HORTA SEM CNPJ COMERCIO LTDA</xNome><IE>123</IE></emit>
<dest><CPF>71291953477</CPF><xNome>EDUARDO</xNome></dest>
<det nItem="1"><prod><cProd>ABC</cProd><cEAN>SEM GTIN</cEAN><xProd>ITEM CAIXA</xProd><NCM>07041000</NCM><CFOP>5102</CFOP>
<uCom>UN</uCom><qCom>3.0000</qCom><vUnCom>10.00</vUnCom><vProd>30.00</vProd></prod>
<imposto><ICMS><ICMSSN102><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto></det>
<total><ICMSTot><vProd>30.00</vProd><vNF>30.00</vNF></ICMSTot></total>
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

async function enviarXml(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({ name: "nota12.xml", mimeType: "text/xml", buffer: Buffer.from(XML) });
}

test("task 009 — associar a nota a um fornecedor já cadastrado", async ({ page }) => {
  expect(CHAVE).toHaveLength(44);
  exigirCredenciais();
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());
  await login(page);

  const lista = await api(page, "GET", "/produtos?limit=1");
  const caixa = (lista.data ?? lista.produtos ?? lista)[0];
  const fornecedor = await api(page, "POST", "/fornecedor", { nome_fantasia: "Horta Sem CNPJ 009" });
  expect(fornecedor.cpf_cnpj ?? null).toBeNull();
  await api(page, "PUT", "/notas-entrada/vinculos", {
    fornecedor_id: fornecedor.id, codigo_fornecedor: "ABC", produto_id: caixa.id, fator_conversao: 1, unidade_fornecedor: "UN",
  });

  await page.goto("/notas-entrada");
  await enviarXml(page);

  await test.step("emitente não encontrado: associa ao fornecedor existente", async () => {
    await expect(page.getByText("Não encontrado")).toBeVisible();
    await expect(page.getByText("Resolva o fornecedor primeiro")).toBeVisible();
    await page.getByRole("button", { name: "Cadastrar ou associar" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("tab", { name: "Fornecedor existente" }).click();
    await dialogo.getByPlaceholder("Buscar fornecedor por nome ou CNPJ/CPF").fill("Horta Sem CNPJ");
    await dialogo.getByRole("button", { name: /Horta Sem CNPJ 009/ }).click();
    await expect(dialogo.getByText(/o CNPJ\/CPF da nota é gravado no cadastro dele/)).toBeVisible();
    await dialogo.getByRole("button", { name: "Associar", exact: true }).click();

    // O vínculo salvo do fornecedor já associa o produto
    await expect(page.getByText("Tudo certo para importar")).toBeVisible();
    await expect(page.getByText("Horta Sem CNPJ 009")).toBeVisible();
    await expect(page.getByRole("button", { name: "Trocar" }).first()).toBeVisible();
  });

  await test.step("confirma e o CNPJ vai para o cadastro", async () => {
    await page.getByLabel("Vencimento").fill("2026-11-27");
    await page.getByRole("button", { name: "Confirmar entrada" }).click();
    await expect(page.getByText(/Entrada confirmada! Pedido de compra COMP-/)).toBeVisible();
    const atualizado = await api(page, "GET", `/fornecedor/${fornecedor.id}`);
    expect(atualizado.cpf_cnpj).toBe(CNPJ);
    expect(atualizado.tipoFornecedor).toBe("PESSOA_JURIDICA");
  });

  await test.step("cancelada a entrada, o mesmo XML já reconhece o fornecedor", async () => {
    const linha = page.getByRole("row").filter({ hasText: "12 · série 1" });
    await linha.getByRole("button", { name: "Cancelar entrada" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar entrada" }).click();
    await expect(page.getByText("Entrada cancelada")).toBeVisible();

    await enviarXml(page);
    await expect(page.getByText("Tudo certo para importar")).toBeVisible();
    // na prévia e na linha da nota cancelada
    await expect(page.getByText("Horta Sem CNPJ 009")).toHaveCount(2);
    await expect(page.getByText("Não encontrado")).toHaveCount(0);
  });
});
