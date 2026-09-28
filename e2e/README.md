# Testes E2E (Playwright)

Testes que abrem o sistema num navegador de verdade e simulam o usuário.

## Colinha rápida

```bash
npm run test:e2e                                              # todos os testes
npx playwright test e2e/pedido-ordens-local.spec.ts           # um arquivo
npx playwright test e2e/pedido-ordens-local.spec.ts --headed  # vendo o navegador
npm run test:e2e:ui                                           # interface visual (escolher, rodar, depurar)
npx playwright show-report                                    # relatório da última execução (vídeos, prints)
```

## Preparação (uma vez só)

1. **Navegador do Playwright:** `npx playwright install chromium`
2. **Credenciais:** copie `env.e2e.example` para `.env.e2e`, na raiz do front, e preencha `E2E_EMAIL` e `E2E_SENHA` com um usuário do **banco local**. O `.env.e2e` fica fora do git e o `playwright.config.ts` carrega esse arquivo sozinho.
   - Também dá para passar no comando: `E2E_EMAIL=... E2E_SENHA=... npx playwright test ...`. O valor do terminal tem prioridade.
   - Sem credenciais, os testes com login são **pulados** (aparecem como `skipped`), não falham.

## Antes de rodar os testes com login

| O quê | Como conferir |
| :--- | :--- |
| **Backend local** rodando em `localhost:4000` | `npm run start:dev` no `SistemaERP---Backend` |
| **Front apontando para a API local** | `.env` do front com `VITE_API_URL=http://localhost:4000/api/v1` |
| Front (Vite) em `localhost:8080` | Opcional: se não estiver rodando, o Playwright sobe com `npm run dev` |

> ⚠️ **Nunca rode os testes `-local` contra produção.** Eles criam e excluem registros. Por segurança, esses specs bloqueiam chamadas a `api.toperp.com.br` e falham logo no login se o front estiver apontando para produção.

## Testes existentes

| Arquivo | Precisa de | O que testa |
| :--- | :--- | :--- |
| `login.spec.ts` | nada | A tela de login mostra e-mail, senha e botão Entrar. |
| `produto-dados-fiscais.spec.ts` | nada (API simulada) | Aba "Dados Fiscais" do produto: validações, envio e edição (task 036). |
| `campos-data.spec.ts` | login | Campo de data não aceita ano com mais de 4 dígitos. |
| `produto-dados-fiscais-local.spec.ts` | login + back local | Fluxo completo de dados fiscais do produto, com vídeo. **Cria um produto `[E2E 036] …`** (task 036). |
| `pedido-ordens-local.spec.ts` | login + back local | Data de entrega no pedido (validação, salvar, carregar, limpar) e download das ordens de produção e expedição, com vídeo. **Cria um pedido `[E2E 034]` e o exclui no final** (task 034). Usa o primeiro cliente e os primeiros produtos do banco. |

## Onde ficam vídeos, prints e arquivos baixados

- `test-results/<pasta do teste>/`: vídeo (`video.webm`), prints de falha, trace e arquivos baixados (ex.: os PDFs das ordens).
- `playwright-report/`: relatório HTML. Abra com `npx playwright show-report`.

Essas pastas são recriadas a cada execução e ficam fora do git.

## Variáveis de ambiente

| Variável | Padrão | Uso |
| :--- | :--- | :--- |
| `E2E_EMAIL` / `E2E_SENHA` | — | Login dos testes que precisam de usuário. |
| `E2E_API_URL` | `http://localhost:4000/api/v1` | API que os specs `-local` usam para criar/excluir dados de teste. |
| `E2E_SLOWMO` | 250–350 ms | Atraso entre ações nos specs com vídeo. Use `0` para rodar rápido. |
| `E2E_BASE_URL` | `http://localhost:8080` | Front já rodando em outra URL. Com ela, o Playwright não sobe o Vite. |

## Quando um teste falha

1. `npx playwright show-report`: abra o teste que falhou e veja o passo, o print e o vídeo.
2. Para ver o passo a passo: clique em **Trace** no relatório, ou rode com `--debug` para pausar a cada ação.
3. `Test timeout` no login costuma ser backend fora do ar ou credencial errada.
