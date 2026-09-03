import { formatDate } from '@/lib/utils';
import type { ContaFinanceira } from '@/services/financeiro.service';

export type ContaFinanceiraExibicao = ContaFinanceira & {
  _agrupadoPedido?: boolean;
  _qtdParcelas?: number;
  _vencimentosParcelas?: string[];
};

function aggregateStatus(statuses: string[]): string {
  const u = statuses.map((s) => String(s ?? '').toUpperCase());
  if (u.some((s) => s === 'VENCIDO')) return 'VENCIDO';
  if (u.some((s) => ['PENDENTE', 'ABERTO', 'PREVISAO'].includes(s))) return 'PENDENTE';
  if (u.some((s) => ['PAGO_PARCIAL', 'PARCIAL'].includes(s))) return 'PAGO_PARCIAL';
  if (u.every((s) => ['PAGO_TOTAL', 'QUITADO'].includes(s))) return 'PAGO_TOTAL';
  return u[0] || 'PENDENTE';
}

function extrairNumeroPedido(contas: ContaFinanceira[]): string | null {
  for (const c of contas) {
    const desc = String(c.descricao ?? '');
    const m = desc.match(/Pedido\s+(\S+)/i);
    if (m) return m[1];
    const np = (c as { numero_pedido?: string; pedido?: { numero_pedido?: string } })
      .numero_pedido ?? (c as { pedido?: { numero_pedido?: string } }).pedido?.numero_pedido;
    if (np) return String(np);
  }
  return null;
}

/** Agrupa contas com o mesmo pedido_id em uma única linha (valor total + parcelas). */
export function agruparContasPorPedido(
  contas: ContaFinanceira[],
): ContaFinanceiraExibicao[] {
  const semPedido: ContaFinanceira[] = [];
  const map = new Map<number, ContaFinanceira[]>();

  for (const c of contas) {
    const pid = Number(c.pedido_id ?? (c as { pedido?: { id?: number } }).pedido?.id);
    if (Number.isFinite(pid) && pid > 0) {
      const arr = map.get(pid) ?? [];
      arr.push(c);
      map.set(pid, arr);
    } else {
      semPedido.push(c);
    }
  }

  const out: ContaFinanceiraExibicao[] = [...semPedido];

  for (const [pedidoId, grupo] of map) {
    if (grupo.length <= 1) {
      out.push(grupo[0]);
      continue;
    }

    const sorted = [...grupo].sort((a, b) => a.id - b.id);
    const first = sorted[0];
    const valorTotal = grupo.reduce(
      (s, c) => s + Number((c as { valor_total?: number }).valor_total ?? c.valor_original ?? 0),
      0,
    );
    const valorPago = grupo.reduce(
      (s, c) => s + Number((c as { valor_pago?: number }).valor_pago ?? 0),
      0,
    );
    const valorRestante = Math.max(0, valorTotal - valorPago);
    const numeroPedido = extrairNumeroPedido(grupo);
    const vencimentos = grupo
      .map((c) => c.data_vencimento?.split('T')[0]?.split(' ')[0])
      .filter((d): d is string => !!d)
      .sort((a, b) => a.localeCompare(b));

    const descricao =
      numeroPedido != null
        ? `Pedido ${numeroPedido} (${grupo.length} parcelas)`
        : `Pedido #${pedidoId} (${grupo.length} parcelas)`;

    out.push({
      ...first,
      id: Math.min(...grupo.map((c) => c.id)),
      pedido_id: pedidoId,
      numero_conta: numeroPedido ?? first.numero_conta,
      descricao,
      valor_original: valorTotal,
      valor_total: valorTotal,
      valor_pago: valorPago,
      valor_restante: valorRestante,
      valor_em_aberto: valorRestante,
      status: aggregateStatus(grupo.map((c) => c.status)) as ContaFinanceira['status'],
      data_vencimento: vencimentos[0] ?? first.data_vencimento,
      _agrupadoPedido: true,
      _qtdParcelas: grupo.length,
      _vencimentosParcelas: vencimentos,
    });
  }

  return out;
}

export function formatarVencimentoAgrupado(conta: ContaFinanceiraExibicao): string {
  const v = conta._vencimentosParcelas;
  const qtd = conta._qtdParcelas ?? v?.length ?? 0;
  if (!v?.length) {
    return conta.data_vencimento ? formatDate(conta.data_vencimento) : 'N/A';
  }
  if (v.length === 1) {
    return qtd > 1 ? `${formatDate(v[0])} (${qtd} parcelas)` : formatDate(v[0]);
  }
  const first = formatDate(v[0]);
  const last = formatDate(v[v.length - 1]);
  if (first === last) return `${first} (${qtd} parcelas)`;
  return `${first} – ${last} (${qtd} parcelas)`;
}
