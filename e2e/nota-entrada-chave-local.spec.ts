import { expect, test } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Task 012: nota de entrada pela chave. A Spedy não está ligada no clone, então a rota
 * POST /notas-entrada/chave é simulada (aguardando → confirmação → pronta); a prévia é a real.
 * Não grava nada.
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/nota-entrada-chave-local.spec.ts
 */

const CNPJ = "33444555000172";
const CHAVE = `352610${CNPJ}550010000000141000000141`;

const XML = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe><infNFe Id="NFe${CHAVE}" versao="4.00"><ide><mod>55</mod><natOp>VENDA</natOp><serie>1</serie><nNF>14</nNF>
<dhEmi>2026-10-27T09:00:00-03:00</dhEmi></ide>
<emit><CNPJ>${CNPJ}</CNPJ><xNome>HORTA DA CHAVE LTDA</xNome><IE>123</IE></emit>
<dest><CPF>71291953477</CPF><xNome>EDUARDO</xNome></dest>
<det nItem="1"><prod><cProd>K1</cProd><cEAN>SEM GTIN</cEAN><xProd>ABOBRINHA ITALIANA</xProd><NCM>07093000</NCM>
<CFOP>5102</CFOP><uCom>KG</uCom><qCom>10.0000</qCom><vUnCom>3.00</vUnCom><vProd>30.00</vProd></prod>
<imposto><ICMS><ICMSSN102><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto></det>
<total><ICMSTot><vProd>30.00</vProd><vNF>30.00</vNF></ICMSTot></total>
</infNFe></NFe><protNFe versao="4.00"><infProt><nProt>1</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;

const NOTA = {
  chave_acesso: CHAVE,
  emitente_nome: "HORTA DA CHAVE LTDA",
  emitente_cpf_cnpj: CNPJ,
  valor: 30,
  data_emissao: "2026-10-27",
};

test("task 012 — nota de entrada pela chave de acesso", async ({ page }) => {
  expect(CHAVE).toHaveLength(44);
  exigirCredenciais();
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());

  const pedidos: Array<{ chave: string; confirmar_operacao?: boolean }> = [];
  const respostas = [
    { situacao: "AGUARDANDO_XML", nota: NOTA, mensagem: "Ciência da operação registrada na SEFAZ. Busque a chave de novo mais tarde." },
    { situacao: "CONFIRMACAO_NECESSARIA", nota: NOTA, mensagem: "Passou o prazo de 10 dias da Ciência da Operação." },
    { situacao: "PRONTA", nota: NOTA, xml: XML },
  ];
  await page.route(/\/notas-entrada\/chave$/, async (route) => {
    pedidos.push(route.request().postDataJSON());
    await route.fulfill({ json: respostas[pedidos.length - 1] });
  });

  await login(page);
  await page.goto("/notas-entrada");
  const campo = page.getByLabel("Chave de acesso da NF-e");

  await test.step("a chave aparece em blocos de 4 e só busca com 44 números", async () => {
    await campo.pressSequentially(CHAVE.slice(0, 10));
    await expect(campo).toHaveValue("3526 1033 44");
    await expect(page.getByText("10/44")).toBeVisible();
    await page.getByRole("button", { name: "Buscar nota" }).click();
    await expect(page.getByText("A chave de acesso tem 44 números.")).toBeVisible();
    expect(pedidos).toHaveLength(0);
  });

  await test.step("leitor de código de barras: chave + Enter → aguardando o XML", async () => {
    await campo.fill(CHAVE);
    await campo.press("Enter");
    await expect(page.getByText("Aguardando o XML da SEFAZ")).toBeVisible();
    await expect(page.getByText(/HORTA DA CHAVE LTDA · 33\.444\.555\/0001-72 · R\$\s30,00/)).toBeVisible();
    expect(pedidos[0]).toEqual({ chave: CHAVE });
  });

  await test.step("fora do prazo da Ciência: confirma a operação depois do aviso", async () => {
    await page.getByRole("button", { name: "Buscar de novo" }).click();
    await expect(page.getByText("Confirmação necessária")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar operação na SEFAZ" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Isso não pode ser desfeito");
    await page.getByRole("button", { name: "Confirmar operação", exact: true }).click();
    expect(pedidos[2]).toEqual({ chave: CHAVE, confirmar_operacao: true });
  });

  await test.step("XML completo: abre a prévia de sempre", async () => {
    await expect(page.getByText("NFe" + CHAVE + ".xml")).toBeVisible();
    await expect(page.getByText("HORTA DA CHAVE LTDA", { exact: true })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "ABOBRINHA ITALIANA" })).toBeVisible();
    await expect(page.getByText("Aguardando o XML da SEFAZ")).toHaveCount(0);
    await page.screenshot({ path: "test-results/nota-entrada-chave.png", fullPage: true });
  });
});
