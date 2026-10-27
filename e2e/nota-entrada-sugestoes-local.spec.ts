import { expect, test, type Page } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Task 009: sugestão de produto pelo nome (por item e "aceitar sugestões") contra o catálogo do
 * clone (tenant do usuário de E2E, que tem Abobrinha italiana, Tomate italiano e Cenoura em KG e
 * "Brócolis ninja" cadastrado duas vezes). Não confirma a nota; apaga o fornecedor (e os vínculos).
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/nota-entrada-sugestoes-local.spec.ts
 */

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
const CNPJ = "11444777000161";
const CHAVE = `352610${CNPJ}550010000000131000000131`;

const det = (n: number, codigo: string, descricao: string, unidade: string) =>
  `<det nItem="${n}"><prod><cProd>${codigo}</cProd><cEAN>SEM GTIN</cEAN><xProd>${descricao}</xProd><NCM>07041000</NCM>` +
  `<CFOP>5102</CFOP><uCom>${unidade}</uCom><qCom>1.0000</qCom><vUnCom>10.00</vUnCom><vProd>10.00</vProd></prod>` +
  `<imposto><ICMS><ICMSSN102><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto></det>`;

const XML = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe><infNFe Id="NFe${CHAVE}" versao="4.00"><ide><mod>55</mod><natOp>VENDA</natOp><serie>1</serie><nNF>13</nNF>
<dhEmi>2026-10-27T09:00:00-03:00</dhEmi></ide>
<emit><CNPJ>${CNPJ}</CNPJ><xNome>HORTA SUGESTOES LTDA</xNome><IE>123</IE></emit>
<dest><CPF>71291953477</CPF><xNome>EDUARDO</xNome></dest>
${det(1, "S1", "ABOBRINHA ITALIANA 20KG", "KG")}
${det(2, "S2", "TOMATES ITALIANOS", "CX")}
${det(3, "S3", "BROCOLIS NINJA", "UN")}
${det(4, "S4", "CENOURA EXTRA", "KG")}
<total><ICMSTot><vProd>40.00</vProd><vNF>40.00</vNF></ICMSTot></total>
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

test("task 009 — sugestão de produto pelo nome e aceitar sugestões", async ({ page }) => {
  expect(CHAVE).toHaveLength(44);
  exigirCredenciais();
  await page.route(/api\.toperp\.com\.br/, (route) => route.abort());
  await login(page);

  const fornecedor = await api(page, "POST", "/fornecedor", {
    nome_fantasia: "Horta Sugestoes 009", cpf_cnpj: CNPJ, tipoFornecedor: "PESSOA_JURIDICA",
  });

  try {
    await page.goto("/notas-entrada");
    await page.locator('input[type="file"]').setInputFiles({ name: "nota13.xml", mimeType: "text/xml", buffer: Buffer.from(XML) });
    const linha = (texto: string) => page.getByRole("row").filter({ hasText: texto });

    await test.step("cada item sem vínculo mostra a sugestão (ou nada, se empatar)", async () => {
      await expect(linha("ABOBRINHA ITALIANA 20KG")).toContainText("Abobrinha italiana 100% parecido");
      await expect(linha("TOMATES ITALIANOS")).toContainText("Tomate italiano");
      await expect(linha("TOMATES ITALIANOS").getByRole("button", { name: "Conferir conversão" })).toBeVisible();
      // "Brócolis ninja" e "BROCOLIS NINJA": empate, sem sugestão
      await expect(linha("BROCOLIS NINJA")).not.toContainText("Sugestão");
      await expect(linha("BROCOLIS NINJA").getByRole("button", { name: "Associar" })).toBeVisible();
      await expect(linha("CENOURA EXTRA")).toContainText("Cenoura 67% parecido");
      await expect(page.getByRole("button", { name: "Aceitar sugestões (3)" })).toBeVisible();
    });

    await test.step("aceitar uma sugestão pela linha", async () => {
      await linha("CENOURA EXTRA").getByRole("button", { name: "Aceitar", exact: true }).click();
      await expect(linha("CENOURA EXTRA")).toContainText("Vínculo do fornecedor");
      await expect(page.getByRole("button", { name: "Aceitar sugestões (2)" })).toBeVisible();
    });

    await test.step("aceitar as sugestões de uma vez, informando a conversão", async () => {
      await page.getByRole("button", { name: "Aceitar sugestões (2)" }).click();
      const dialogo = page.getByRole("dialog");
      await expect(dialogo.getByLabel("Aceitar sugestão do item 1")).toBeChecked();
      // Unidade diferente (CX → KG): só entra com a conversão
      await expect(dialogo.getByLabel("Aceitar sugestão do item 2")).not.toBeChecked();
      await expect(dialogo.getByRole("button", { name: "Associar 1 item(ns)" })).toBeEnabled();
      await dialogo.getByLabel("Conversão do item 2").fill("20");
      await expect(dialogo.getByLabel("Aceitar sugestão do item 2")).toBeChecked();
      await page.screenshot({ path: "test-results/nota-entrada-sugestoes.png" });
      await dialogo.getByRole("button", { name: "Associar 2 item(ns)" }).click();
      await expect(page.getByText("2 item(ns) associado(s)!")).toBeVisible();

      await expect(linha("ABOBRINHA ITALIANA 20KG")).toContainText("Vínculo do fornecedor");
      await expect(linha("TOMATES ITALIANOS")).toContainText("1 CX = 20 KG");
      await expect(page.getByRole("button", { name: /Aceitar sugestões/ })).toHaveCount(0);
      await expect(page.getByText("Produto não associado: Item 3 – BROCOLIS NINJA")).toBeVisible();
      await expect(page.getByText(/Produto não associado: Item [124]/)).toHaveCount(0);
    });
  } finally {
    await api(page, "DELETE", `/fornecedor/${fornecedor.id}`);
  }
});
