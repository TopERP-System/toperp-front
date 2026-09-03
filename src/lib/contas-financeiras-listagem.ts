import { parseDateOnlyLocal } from '@/lib/utils';
import {
  type ContaFinanceira,
  financeiroService,
} from '@/services/financeiro.service';

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fimDoMesYMD(ref = new Date()): string {
  return toYMD(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
}

export function parseListarContasResponse(response: unknown): {
  data: ContaFinanceira[];
  total: number;
} {
  if (Array.isArray(response)) {
    return { data: response, total: response.length };
  }
  const r = response as {
    data?: ContaFinanceira[];
    total?: number;
    contas?: ContaFinanceira[];
  };
  if (r?.data && Array.isArray(r.data)) {
    return { data: r.data, total: r.total ?? r.data.length };
  }
  if (r?.contas && Array.isArray(r.contas)) {
    return { data: r.contas, total: r.total ?? r.contas.length };
  }
  return { data: [], total: 0 };
}

/** Busca todas as páginas de contas financeiras para o mesmo filtro. */
export async function listarContasTodasAsPaginas(
  base: Parameters<typeof financeiroService.listar>[0],
): Promise<ContaFinanceira[]> {
  const pageLimit = 200;
  let page = 1;
  const acc: ContaFinanceira[] = [];
  let totalEsperado = 0;

  for (;;) {
    const response = await financeiroService.listar({
      ...base,
      page,
      limit: pageLimit,
    });
    const { data, total } = parseListarContasResponse(response);
    if (page === 1) totalEsperado = total;
    acc.push(...data);
    if (data.length < pageLimit || acc.length >= totalEsperado || data.length === 0) {
      break;
    }
    page += 1;
  }

  return acc;
}

export function contaTemSaldoAberto(c: ContaFinanceira): boolean {
  const st = String(c.status ?? '').toUpperCase();
  if (st === 'QUITADO' || st === 'PAGO_TOTAL' || st === 'CANCELADO') return false;
  const aberto = Number(
    (c as { valor_restante?: number; valor_em_aberto?: number }).valor_restante ??
      (c as { valor_em_aberto?: number }).valor_em_aberto ??
      0,
  );
  if (aberto > 0.009) return true;
  if (
    st === 'PENDENTE' ||
    st === 'ABERTO' ||
    st === 'PREVISAO' ||
    st === 'PARCIAL' ||
    st === 'PAGO_PARCIAL' ||
    st === 'VENCIDO'
  ) {
    return true;
  }
  return false;
}

export function contaEstaPaga(c: ContaFinanceira): boolean {
  const st = String(c.status ?? '').toUpperCase();
  return (
    st === 'PAGO_TOTAL' ||
    st === 'PAGO_PARCIAL' ||
    st === 'QUITADO' ||
    st === 'PARCIAL'
  );
}

/** Dias até o vencimento com data local (não usa fuso do servidor). */
export function diasAteVencimentoLocal(
  dataVencimento?: string | Date | null,
  ref: Date = new Date(),
): number | null {
  const vencimento = parseDateOnlyLocal(dataVencimento ?? undefined);
  if (!vencimento) return null;
  const hoje = new Date(ref);
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);
  return Math.round(
    (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Conta em aberto com vencimento anterior a hoje (regra alinhada ao card Vencidas). */
export function contaEstaVencidaLocal(c: ContaFinanceira, ref?: Date): boolean {
  const st = String(c.status ?? '').toUpperCase();
  if (st === 'QUITADO' || st === 'PAGO_TOTAL' || st === 'CANCELADO') return false;
  if (!contaTemSaldoAberto(c)) return false;
  if (st === 'VENCIDO') return true;
  const dias = diasAteVencimentoLocal(c.data_vencimento, ref);
  return dias != null && dias < 0;
}

export function contaVenceHojeLocal(c: ContaFinanceira, ref?: Date): boolean {
  const st = String(c.status ?? '').toUpperCase();
  if (st === 'QUITADO' || st === 'PAGO_TOTAL' || st === 'CANCELADO') return false;
  if (!contaTemSaldoAberto(c)) return false;
  const dias = diasAteVencimentoLocal(c.data_vencimento, ref);
  return dias === 0;
}

/** Vence neste mês civil e ainda não venceu (alinha ao card Vencendo Este Mês). */
export function contaVenceEsteMesLocal(c: ContaFinanceira, ref: Date = new Date()): boolean {
  const st = String(c.status ?? '').toUpperCase();
  if (st === 'QUITADO' || st === 'PAGO_TOTAL' || st === 'CANCELADO') return false;
  if (!contaTemSaldoAberto(c)) return false;
  const vencimento = parseDateOnlyLocal(c.data_vencimento);
  if (!vencimento) return false;
  const hoje = new Date(ref);
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);
  if (vencimento.getMonth() !== hoje.getMonth() || vencimento.getFullYear() !== hoje.getFullYear()) {
    return false;
  }
  return vencimento.getTime() >= hoje.getTime();
}

export function valorPrincipalConta(c: ContaFinanceira): number {
  const total = Number(
    (c as { valor_total?: number | string | null }).valor_total ??
      c.valor_original ??
      0,
  );
  if (Number.isFinite(total) && total > 0) return total;
  const restante = Number(
    c.valor_restante ??
      (c as { valor_em_aberto?: number | string | null }).valor_em_aberto ??
      0,
  );
  const pago = Number(c.valor_pago ?? 0);
  const derivado = restante + pago;
  return Number.isFinite(derivado) && derivado > 0 ? derivado : 0;
}

export function valorPagoConta(c: ContaFinanceira): number {
  if (c.valor_pago != null && String(c.valor_pago).trim() !== '') {
    const pago = Number(c.valor_pago);
    if (Number.isFinite(pago) && pago >= 0) return pago;
  }
  const total = valorPrincipalConta(c);
  const aberto = saldoAbertoConta(c);
  return Math.max(0, Number((total - aberto).toFixed(2)));
}

export function saldoAbertoConta(c: ContaFinanceira): number {
  const st = String(c.status ?? '').toUpperCase();
  if (st === 'CANCELADO' || st === 'QUITADO' || st === 'PAGO_TOTAL') return 0;

  const restanteRaw = c.valor_restante;
  const emAbertoRaw = (c as { valor_em_aberto?: number | string | null })
    .valor_em_aberto;

  if (restanteRaw != null && String(restanteRaw).trim() !== '') {
    const r = Number(restanteRaw);
    if (Number.isFinite(r)) return Math.max(0, r);
  }
  if (emAbertoRaw != null && String(emAbertoRaw).trim() !== '') {
    const em = Number(emAbertoRaw);
    if (Number.isFinite(em)) return Math.max(0, em);
  }

  const total = Number(
    (c as { valor_total?: number | string | null }).valor_total ??
      c.valor_original ??
      0,
  );
  const pago = Number(c.valor_pago ?? 0);
  if (Number.isFinite(total) && total > 0) {
    return Math.max(0, Number((total - (Number.isFinite(pago) ? pago : 0)).toFixed(2)));
  }
  return 0;
}

/** Chave de agrupamento alinhada à tabela (1 linha = 1 pedido ou 1 avulso). */
export function chaveGrupoContaFinanceira(c: ContaFinanceira): string {
  const pedidoId =
    c.pedido_id != null && Number(c.pedido_id) > 0 ? Number(c.pedido_id) : null;
  return pedidoId != null ? `pedido-${pedidoId}` : `avulso-${c.id}`;
}

/**
 * Conta pedidos/avulsos (não parcelas) com a mesma regra dos filtros da tabela.
 * Usado pelos cards Vencidas / Vencendo Hoje / Vencendo Este Mês.
 */
export function contarPedidosPorVencimento(contas: ContaFinanceira[]): {
  vencidas: number;
  vencendoHoje: number;
  vencendoEsteMes: number;
} {
  const grupos = new Map<string, ContaFinanceira[]>();

  for (const conta of contas) {
    const st = String(conta.status ?? '').toUpperCase();
    if (st === 'CANCELADO') continue;
    if (!contaTemSaldoAberto(conta)) continue;

    const key = chaveGrupoContaFinanceira(conta);
    const list = grupos.get(key) ?? [];
    list.push(conta);
    grupos.set(key, list);
  }

  let vencidas = 0;
  let vencendoHoje = 0;
  let vencendoEsteMes = 0;

  for (const parcelas of grupos.values()) {
    const valorAberto = parcelas.reduce((s, p) => s + saldoAbertoConta(p), 0);
    if (valorAberto <= 0.009) continue;

    if (parcelas.some((p) => contaEstaVencidaLocal(p))) vencidas += 1;
    if (parcelas.some((p) => contaVenceHojeLocal(p))) vencendoHoje += 1;
    if (parcelas.some((p) => contaVenceEsteMesLocal(p))) vencendoEsteMes += 1;
  }

  return { vencidas, vencendoHoje, vencendoEsteMes };
}

function calcularResumoCardsPorTipo(
  contas: ContaFinanceira[],
  tipo: 'RECEBER' | 'PAGAR',
): {
  totalPendente: number;
  valorPago: number;
  vencidas: number;
  vencendoHoje: number;
  vencendoEsteMes: number;
} {
  let totalPendente = 0;
  let valorPago = 0;
  const contasDoTipo: ContaFinanceira[] = [];

  for (const conta of contas) {
    // Listagens já filtradas por tipo podem omitir o campo `tipo`.
    if (conta.tipo != null && conta.tipo !== tipo) continue;
    const st = String(conta.status ?? '').toUpperCase();
    if (st === 'CANCELADO') continue;

    valorPago += Number(conta.valor_pago) || 0;

    if (!contaTemSaldoAberto(conta)) continue;

    totalPendente += saldoAbertoConta(conta);
    contasDoTipo.push(conta);
  }

  const contagens = contarPedidosPorVencimento(contasDoTipo);

  return {
    totalPendente: Number(totalPendente.toFixed(2)),
    valorPago: Number(valorPago.toFixed(2)),
    vencidas: contagens.vencidas,
    vencendoHoje: contagens.vencendoHoje,
    vencendoEsteMes: contagens.vencendoEsteMes,
  };
}

/** Resumo dos cards de Contas a Receber a partir da listagem filtrada (mesma base da tabela). */
export function calcularResumoCardsReceber(contas: ContaFinanceira[]): {
  totalReceber: number;
  valorRecebido: number;
  vencidas: number;
  vencendoHoje: number;
  vencendoEsteMes: number;
} {
  const r = calcularResumoCardsPorTipo(contas, 'RECEBER');
  return {
    totalReceber: r.totalPendente,
    valorRecebido: r.valorPago,
    vencidas: r.vencidas,
    vencendoHoje: r.vencendoHoje,
    vencendoEsteMes: r.vencendoEsteMes,
  };
}

/** Resumo dos cards de Contas a Pagar a partir da listagem filtrada (mesma base da tabela). */
export function calcularResumoCardsPagar(contas: ContaFinanceira[]): {
  totalPagar: number;
  valorPago: number;
  vencidas: number;
  vencendoHoje: number;
  vencendoEsteMes: number;
} {
  const r = calcularResumoCardsPorTipo(contas, 'PAGAR');
  return {
    totalPagar: r.totalPendente,
    valorPago: r.valorPago,
    vencidas: r.vencidas,
    vencendoHoje: r.vencendoHoje,
    vencendoEsteMes: r.vencendoEsteMes,
  };
}

/** Cards do módulo Financeiro (receita / despesa / saldo) a partir das contas filtradas. */
export function calcularStatsFinanceiroFiltrado(
  receber: ContaFinanceira[],
  pagar: ContaFinanceira[],
): {
  receitaMes: number;
  despesaMes: number;
  saldoAtual: number;
} {
  const somaCompetencia = (contas: ContaFinanceira[]) =>
    contas
      .filter((c) => String(c.status ?? '').toUpperCase() !== 'CANCELADO')
      .reduce(
        (s, c) =>
          s +
          Number(
            (c as { valor_original?: number }).valor_original ??
              (c as { valor_total?: number }).valor_total ??
              0,
          ),
        0,
      );

  const receitaMes = Number(somaCompetencia(receber).toFixed(2));
  const despesaMes = Number(somaCompetencia(pagar).toFixed(2));
  return {
    receitaMes,
    despesaMes,
    saldoAtual: Number((receitaMes - despesaMes).toFixed(2)),
  };
}
