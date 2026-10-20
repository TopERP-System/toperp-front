import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Download do PDF da carta de correção na tela Notas Fiscais — task 005.
 * API simulada: não precisa de backend nem de credenciais.
 */

type Json = Record<string, unknown> | unknown[];

function tokenFalso(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: "none" })}.${b64({ sub: "u1", email: "teste@e2e.com", role: "ADMIN", schema_name: "t_e2e", exp })}.x`;
}

const NOTA = {
  id: 1,
  pedido_id: 10,
  numero_pedido: "PV-10",
  cliente_nome: "Cliente Alfa",
  status: "authorized",
  numero_nf: 123,
  serie: "1",
  chave_acesso: "3526".padEnd(44, "0"),
  valor_total: 100,
  ambiente: "sandbox",
  mensagem_processamento: null,
  data_emissao: "2026-10-20",
  emitida_em: new Date().toISOString(),
  cancelada_em: null,
  motivo_cancelamento: null,
  cancelamento_solicitado_em: null,
  cancelamento_recusa: null,
  created_at: "2026-10-20T10:00:00Z",
  updated_at: "2026-10-20T10:00:00Z",
};

const CARTAS = [
  { id: 6, sequencia: 2, texto: "Onde se lê transportadora X, leia-se Y", created_at: "2026-10-20T12:00:00Z" },
  { id: 5, sequencia: 1, texto: "Onde se lê volume 1, leia-se volume 2", created_at: "2026-10-20T11:00:00Z" },
];

async function simularApi(page: Page, opcoes: { pdfStatus?: number } = {}) {
  const pdfs: string[] = [];
  await page.addInitScript((token) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "u1", email: "teste@e2e.com", nome: "Teste", role: "ADMIN", ativo: true }),
    );
  }, tokenFalso());

  await page.route(/\/api\/v1\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const caminho = url.pathname.replace(/^.*\/api\/v1/, "");
    const json = (body: Json, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (/^\/pedidos\/10\/nota-fiscal\/cartas-correcao\/\d+\/pdf$/.test(caminho)) {
      pdfs.push(caminho);
      if (opcoes.pdfStatus && opcoes.pdfStatus !== 200) {
        return json(
          { statusCode: opcoes.pdfStatus, message: "A Spedy ainda não registrou esta carta de correção. Aguarde alguns instantes e tente novamente." },
          opcoes.pdfStatus,
        );
      }
      return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 cce" });
    }
    if (caminho === "/pedidos/10/nota-fiscal/cartas-correcao") return json(CARTAS);
    if (caminho === "/notas-fiscais") return json({ items: [NOTA], total: 1, page: 1, limit: 20 });
    if (caminho === "/configuracoes") return json({ rotulo_roca: "Empresa" });
    return json([]);
  });
  return { pdfs };
}

async function abrirCartaCorrecao(page: Page) {
  await page.goto("/notas-fiscais");
  await page.getByRole("button", { name: "Carta de correção" }).click();
  const dialog = page.getByRole("dialog", { name: "Carta de correção" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("carta de correção — baixar PDF", () => {
  test("cada carta tem o botão e baixa o PDF da carta certa", async ({ page }) => {
    const api = await simularApi(page);
    const dialog = await abrirCartaCorrecao(page);

    await expect(dialog.getByRole("button", { name: /Baixar PDF da carta/ })).toHaveCount(2);

    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Baixar PDF da carta nº 1" }).click();
    expect((await download).suggestedFilename()).toBe("carta-correcao-nfe-123-1.pdf");
    expect(api.pdfs).toEqual(["/pedidos/10/nota-fiscal/cartas-correcao/5/pdf"]);
  });

  test("erro da API aparece para o usuário", async ({ page }) => {
    await simularApi(page, { pdfStatus: 404 });
    const dialog = await abrirCartaCorrecao(page);

    await dialog.getByRole("button", { name: "Baixar PDF da carta nº 2" }).click();
    await expect(page.getByText("Não foi possível baixar o PDF da carta de correção")).toBeVisible();
    await expect(page.getByText(/ainda não registrou esta carta/)).toBeVisible();
  });
});
