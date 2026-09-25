import type { ContextoFiscal, TipoOperacaoFiscal } from '@/services/fiscal.service';
import type { Produto, ProdutoTributacao } from '@/services/produtos.service';

export const OPERACOES_FISCAIS: TipoOperacaoFiscal[] = ['SAIDA', 'ENTRADA'];

/** Campos da tributação como texto (inputs); vazio = não informado. */
export type TributacaoForm = {
  [K in Exclude<keyof ProdutoTributacao, 'tipo_operacao'>]: string;
};

export type TributacoesForm = Record<TipoOperacaoFiscal, TributacaoForm>;

const CAMPOS_TRIBUTACAO: Array<keyof TributacaoForm> = [
  'cfop_estadual',
  'cfop_interestadual',
  'icms_cst',
  'icms_csosn',
  'icms_aliquota',
  'ipi_cst',
  'ipi_aliquota',
  'ipi_enquadramento',
  'pis_cst',
  'pis_aliquota',
  'cofins_cst',
  'cofins_aliquota',
];

const CAMPOS_ALIQUOTA = new Set<keyof TributacaoForm>([
  'icms_aliquota',
  'ipi_aliquota',
  'pis_aliquota',
  'cofins_aliquota',
]);

export function tributacaoVazia(): TributacaoForm {
  return Object.fromEntries(CAMPOS_TRIBUTACAO.map((c) => [c, ''])) as TributacaoForm;
}

export function tributacoesVazias(): TributacoesForm {
  return { SAIDA: tributacaoVazia(), ENTRADA: tributacaoVazia() };
}

export function tributacoesParaForm(tributacoes?: ProdutoTributacao[]): TributacoesForm {
  const form = tributacoesVazias();
  for (const t of tributacoes ?? []) {
    form[t.tipo_operacao] = Object.fromEntries(
      CAMPOS_TRIBUTACAO.map((c) => [c, t[c] === null || t[c] === undefined ? '' : String(t[c])]),
    ) as TributacaoForm;
  }
  return form;
}

/** "3,5" → 3.5; vazio → null. */
function aliquotaParaNumero(valor: string): number | null {
  const v = valor.trim().replace(',', '.');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function tributacaoParaPayload(
  operacao: TipoOperacaoFiscal,
  form: TributacaoForm,
): ProdutoTributacao {
  const campos: Record<string, string | number | null> = {};
  for (const campo of CAMPOS_TRIBUTACAO) {
    const valor = form[campo] ?? '';
    campos[campo] = CAMPOS_ALIQUOTA.has(campo)
      ? aliquotaParaNumero(valor)
      : valor.replace(/\D/g, '') || null;
  }
  return { tipo_operacao: operacao, ...campos } as unknown as ProdutoTributacao;
}

export function tributacaoPreenchida(form: TributacaoForm): boolean {
  return CAMPOS_TRIBUTACAO.some((c) => form[c].trim() !== '');
}

/**
 * Operações a enviar ao backend. Sem `originais` (criação): as que têm algo preenchido.
 * Com `originais` (edição): as que mudaram — o backend substitui a regra inteira da operação.
 */
export function montarTributacoesPayload(
  form: TributacoesForm,
  originais?: ProdutoTributacao[],
): ProdutoTributacao[] | undefined {
  const payload: ProdutoTributacao[] = [];
  for (const operacao of OPERACOES_FISCAIS) {
    const atual = tributacaoParaPayload(operacao, form[operacao]);
    if (!originais) {
      if (tributacaoPreenchida(form[operacao])) payload.push(atual);
      continue;
    }
    const original = tributacaoParaPayload(
      operacao,
      tributacoesParaForm(originais)[operacao],
    );
    if (JSON.stringify(original) !== JSON.stringify(atual)) payload.push(atual);
  }
  return payload.length > 0 ? payload : undefined;
}

export interface DadosFiscaisForm {
  origem?: string;
  ncm?: string;
  cest?: string;
  tributacoes: TributacoesForm;
}

export function dadosFiscaisDoProduto(produto: Produto): DadosFiscaisForm {
  return {
    origem: produto.origem === null || produto.origem === undefined ? '' : String(produto.origem),
    ncm: produto.ncm || '',
    cest: produto.cest || '',
    tributacoes: tributacoesParaForm(produto.tributacoes),
  };
}

/** Chave do erro → mensagem. Chaves: origem, ncm, cest, SAIDA.cfop_estadual, SAIDA.icms, … */
export type ErrosFiscais = Record<string, string>;

function validarAliquota(valor: string): string | null {
  if (!valor.trim()) return null;
  const n = aliquotaParaNumero(valor);
  if (n === null) return 'Alíquota inválida';
  if (n < 0 || n > 100) return 'A alíquota deve estar entre 0 e 100%';
  return null;
}

/**
 * Formato sempre; obrigatoriedade só quando a empresa emite NF-e
 * (origem, NCM e, na saída: CFOP estadual, ICMS, PIS e COFINS).
 */
export function validarDadosFiscais(
  dados: DadosFiscaisForm,
  contexto?: ContextoFiscal | null,
): ErrosFiscais {
  const erros: ErrosFiscais = {};
  const obrigatorio = Boolean(contexto?.nfeAtiva);
  const ncm = (dados.ncm ?? '').replace(/\D/g, '');
  const cest = (dados.cest ?? '').replace(/\D/g, '');

  if (ncm && ncm.length !== 8) erros.ncm = 'O NCM deve ter 8 dígitos';
  if (cest && cest.length !== 7) erros.cest = 'O CEST deve ter 7 dígitos';

  for (const operacao of OPERACOES_FISCAIS) {
    const t = dados.tributacoes[operacao];
    for (const campo of CAMPOS_ALIQUOTA) {
      const erro = validarAliquota(t[campo]);
      if (erro) erros[`${operacao}.${campo}`] = erro;
    }
  }

  if (obrigatorio) {
    if (!(dados.origem ?? '').trim()) erros.origem = 'Informe a origem da mercadoria';
    if (!ncm) erros.ncm = 'Informe o NCM';

    const saida = dados.tributacoes.SAIDA;
    if (!saida.cfop_estadual.trim()) {
      erros['SAIDA.cfop_estadual'] = 'Informe o CFOP de venda dentro do estado';
    }
    const icms = contexto?.usaCsosn ? saida.icms_csosn : saida.icms_cst;
    if (!icms.trim()) {
      erros['SAIDA.icms'] = contexto?.usaCsosn ? 'Informe o CSOSN' : 'Informe o CST do ICMS';
    }
    if (!saida.pis_cst.trim()) erros['SAIDA.pis_cst'] = 'Informe o CST do PIS';
    if (!saida.cofins_cst.trim()) erros['SAIDA.cofins_cst'] = 'Informe o CST do COFINS';
  }

  return erros;
}
