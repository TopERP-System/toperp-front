import { expect, test, type Page, type Response } from "@playwright/test";
import { exigirCredenciais, login } from "./helpers/login";

/**
 * Caso de uso da task 036 contra a API LOCAL (login real), com vídeo.
 * Cria um produto "[E2E 036] …" — rode só em ambiente local/de teste.
 *
 *   E2E_EMAIL=... E2E_SENHA=... npx playwright test e2e/produto-dados-fiscais-local.spec.ts --headed
 *
 * Vídeo: test-results/<pasta do teste>/video.webm (ou `npx playwright show-report`).
 */

test.use({
  video: { mode: "on", size: { width: 1440, height: 900 } },
  viewport: { width: 1440, height: 900 },
  launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 350) },
});

interface ContextoFiscal {
  nfeAtiva: boolean;
  usaCsosn: boolean;
  regimeTributario: string | null;
}

/** Nunca deixa o teste falar com a API de produção: aborta e guarda a URL. */
async function bloquearProducao(page: Page): Promise<() => string | undefined> {
  let bloqueada: string | undefined;
  await page.route(/api\.toperp\.com\.br/, (route) => {
    bloqueada ??= route.request().url();
    return route.abort();
  });
  return () => bloqueada;
}

/** Abre a busca do campo, pesquisa e escolhe a opção cujo texto começa com `codigo`. */
async function escolherNaBusca(page: Page, botao: string, termo: string, codigo: string | RegExp) {
  await page.getByRole("button", { name: botao, exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").fill(termo);
  const opcao =
    typeof codigo === "string"
      ? dialog.getByRole("option").filter({ hasText: new RegExp(`^${codigo}`) }).first()
      : dialog.getByRole("option").filter({ hasText: codigo }).first();
  await expect(opcao).toBeVisible({ timeout: 20_000 });
  await opcao.click();
  await expect(dialog).toHaveCount(0);
}

function campoPorRotulo(page: Page, rotulo: string) {
  return page.locator("div.space-y-2", { has: page.getByText(rotulo, { exact: true }) }).locator("input").first();
}

async function abrirAcaoDoProduto(page: Page, nome: string, acao: "Visualizar" | "Editar") {
  await page.goto("/produtos");
  await page.getByPlaceholder("Buscar por nome ou SKU...").fill(nome);
  const linha = page.getByRole("row").filter({ hasText: nome });
  await expect(linha).toHaveCount(1, { timeout: 15_000 });
  await linha.getByTitle("Ações").click();
  await page.getByRole("menuitem", { name: acao }).click();
}

test("task 036 — cadastro, validação, visualização e edição dos dados fiscais", async ({ page }) => {
  exigirCredenciais();
  test.setTimeout(180_000);
  const urlProducaoBloqueada = await bloquearProducao(page);

  const nome = `[E2E 036] Queijo mozarela ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

  await test.step("login", async () => {
    await page.goto("/login");
    expect(
      urlProducaoBloqueada(),
      "O front está apontando para a API de PRODUÇÃO. Use VITE_API_URL=http://localhost:4000 no .env do front.",
    ).toBeUndefined();
    await login(page);
  });

  let contexto!: ContextoFiscal;
  await test.step("abrir Novo Produto e ler o contexto fiscal da empresa", async () => {
    const respostaContexto: Promise<Response> = page.waitForResponse((r) => r.url().includes("/fiscal/contexto"));
    await page.goto("/produtos/novo");
    contexto = await (await respostaContexto).json();
    test.info().annotations.push({
      type: "contexto fiscal",
      description: `regime=${contexto.regimeTributario} usaCsosn=${contexto.usaCsosn} nfeAtiva=${contexto.nfeAtiva}`,
    });
  });

  await test.step("aba Geral: nome e preços", async () => {
    await page.getByPlaceholder("Ex: Notebook Dell Inspiron").fill(nome);
    await campoPorRotulo(page, "Preço de Custo *").fill("28");
    await campoPorRotulo(page, "Preço de Venda *").fill("42.9");
  });

  if (contexto.nfeAtiva) {
    await test.step("NF-e ativa: salvar sem dados fiscais é bloqueado", async () => {
      await page.getByRole("button", { name: "Criar Produto" }).first().click();
      await expect(page.getByRole("tab", { name: /Dados Fiscais/ })).toHaveAttribute("data-state", "active");
      await expect(page.getByText("Informe a origem da mercadoria")).toBeVisible();
      await expect(page).toHaveURL(/\/produtos\/novo$/);
    });
  } else {
    await page.getByRole("tab", { name: /Dados Fiscais/ }).click();
    await expect(page.getByText(/os dados fiscais são opcionais/)).toBeVisible();
  }

  await test.step("classificação: origem, NCM e CEST pela busca", async () => {
    await page.getByRole("combobox").filter({ hasText: "Selecione a origem" }).click();
    await page.getByRole("option", { name: /^0 — Nacional/ }).click();
    await escolherNaBusca(page, "Buscar NCM", "queijo", /Mozarela/);
    await expect(page.getByPlaceholder("0000.00.00", { exact: true })).toHaveValue("0406.10.10");
    // CEST: a busca já lista primeiro os aplicáveis ao NCM escolhido
    await escolherNaBusca(page, "Buscar CEST", "1702401", "1702401");
  });

  await test.step("saída (venda): CFOP, ICMS, PIS e COFINS", async () => {
    await escolherNaBusca(page, "Buscar CFOP", "5102", "5102");
    await page.getByRole("button", { name: "Buscar CFOP", exact: true }).nth(1).click();
    await page.getByRole("dialog").getByRole("combobox").fill("6102");
    await page.getByRole("dialog").getByRole("option").filter({ hasText: /^6102/ }).click();

    if (contexto.usaCsosn) {
      await escolherNaBusca(page, "Buscar CSOSN", "102", "102");
      await escolherNaBusca(page, "Buscar CST do PIS", "49", "49");
      await escolherNaBusca(page, "Buscar CST do COFINS", "49", "49");
    } else {
      await escolherNaBusca(page, "Buscar CST do ICMS", "00", "00");
      await page.getByPlaceholder("0,00", { exact: true }).first().fill("18");
      await escolherNaBusca(page, "Buscar CST do PIS", "01", "01");
      await page.getByPlaceholder("0,65", { exact: true }).fill("0,65");
      await escolherNaBusca(page, "Buscar CST do COFINS", "01", "01");
      await page.getByPlaceholder("3,00", { exact: true }).fill("3");
    }
  });

  await test.step("entrada (compra): CFOP e PIS/COFINS de entrada", async () => {
    await page.getByRole("tab", { name: "Entrada (compra)" }).click();
    await escolherNaBusca(page, "Buscar CFOP", "compra para comercializa", "1102");
    await escolherNaBusca(page, "Buscar CST do PIS", "98", "98");
    await escolherNaBusca(page, "Buscar CST do COFINS", "98", "98");
    await page.getByRole("tab", { name: "Saída (venda)" }).click();
  });

  await test.step("salvar o produto", async () => {
    await page.getByRole("button", { name: "Criar Produto" }).first().click();
    await expect(page).toHaveURL(/\/produtos$/, { timeout: 15_000 });
    await expect(page.getByText(/Produto cadastrado com sucesso/)).toBeVisible();
  });

  await test.step("visualizar: origem, CFOP e resumo da tributação de saída", async () => {
    await abrirAcaoDoProduto(page, nome, "Visualizar");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tributação de saída")).toBeVisible();
    await expect(dialog.getByText(contexto.usaCsosn ? /ICMS CSOSN 102/ : /ICMS CST 00/)).toBeVisible();
    await expect(dialog.getByText("5102 / 6102")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await test.step("editar: carrega os dados e inclui IPI na saída", async () => {
    await abrirAcaoDoProduto(page, nome, "Editar");
    await expect(page).toHaveURL(/\/produtos\/\d+\/editar$/);
    await page.getByRole("tab", { name: /Dados Fiscais/ }).click();
    await expect(page.getByPlaceholder("0000.00.00", { exact: true })).toHaveValue("0406.10.10");
    await escolherNaBusca(page, "Buscar CST do IPI", "53", "53");
    await page.getByRole("button", { name: "Salvar Alterações" }).first().click();
    await expect(page).toHaveURL(/\/produtos$/, { timeout: 15_000 });
    await expect(page.getByText(/Produto atualizado com sucesso/)).toBeVisible();
  });

  await test.step("conferir a edição na visualização", async () => {
    await abrirAcaoDoProduto(page, nome, "Visualizar");
    await expect(page.getByRole("dialog").getByText(/IPI 53/)).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
