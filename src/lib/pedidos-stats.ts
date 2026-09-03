import { pedidosService } from '@/services/pedidos.service';
import type {
  DashboardPedidos,
  FiltrosPedidos,
  Pedido,
  TipoPedido,
} from '@/types/pedido';

type PedidoComSaldo = Pedido & { valor_em_aberto?: number; valor_pago?: number };

export type ModoCardsPedidos = 'VENDA' | 'COMPRA' | 'MISTO';

export type ResumoHeroPedidos = Pick<
  DashboardPedidos,
  | 'faturamento_confirmado_venda'
  | 'valor_em_aberto_venda'
  | 'compras_confirmadas'
  | 'compras_em_aberto'
  | 'pedidos_em_andamento'
  | 'pedidos_cancelados'
> & {
  modoCard: ModoCardsPedidos;
};

function saldoAbertoPedido(p: PedidoComSaldo): number {
  if (p.status === 'CANCELADO') return 0;
  // Aberto ainda não gera conta: se valor_em_aberto veio 0, usa o total do pedido.
  if (p.status === 'ABERTO') {
    const emAberto =
      p.valor_em_aberto != null ? Number(p.valor_em_aberto) : NaN;
    if (Number.isFinite(emAberto) && emAberto > 0.009) {
      return Math.max(0, emAberto);
    }
    return Math.max(0, Number(p.valor_total ?? 0));
  }
  if (p.valor_em_aberto != null) return Math.max(0, Number(p.valor_em_aberto));
  const pago = Number(p.valor_pago ?? 0);
  return Math.max(0, Number(p.valor_total ?? 0) - pago);
}

function pedidoAtendido(p: Pedido): boolean {
  return (
    p.status === 'ATENDIDO' || p.status === 'QUITADO' || p.status === 'PARCIAL'
  );
}

function parsePedidosResponse(response: unknown): Pedido[] {
  if (Array.isArray(response)) return response;
  const r = response as { data?: Pedido[]; pedidos?: Pedido[] };
  if (r?.data && Array.isArray(r.data)) return r.data;
  if (r?.pedidos && Array.isArray(r.pedidos)) return r.pedidos;
  return [];
}

function inferirModoCard(
  pedidos: Pedido[],
  tipoFiltro?: TipoPedido,
): ModoCardsPedidos {
  if (tipoFiltro === 'VENDA') return 'VENDA';
  if (tipoFiltro === 'COMPRA') return 'COMPRA';
  const vendas = pedidos.filter((p) => p.tipo === 'VENDA').length;
  const compras = pedidos.filter((p) => p.tipo === 'COMPRA').length;
  if (compras > 0 && vendas === 0) return 'COMPRA';
  if (vendas > 0 && compras === 0) return 'VENDA';
  return 'MISTO';
}

/** Busca todos os pedidos que batem com os filtros da listagem (sem filtro de card). */
export async function listarPedidosTodasPaginas(
  filtros: FiltrosPedidos,
): Promise<Pedido[]> {
  const { card_filtro: _card, page: _page, limit: _limit, ...rest } = filtros;
  const pageLimit = 200;
  let page = 1;
  const acc: Pedido[] = [];
  let totalEsperado = 0;

  for (;;) {
    const response = await pedidosService.listar({
      ...rest,
      page,
      limit: pageLimit,
    });
    const data = parsePedidosResponse(response);
    const total =
      typeof (response as { total?: number })?.total === 'number'
        ? (response as { total: number }).total
        : data.length;
    if (page === 1) totalEsperado = total;
    acc.push(...data);
    if (data.length < pageLimit || acc.length >= totalEsperado || data.length === 0) {
      break;
    }
    page += 1;
  }

  return acc;
}

/**
 * Listagem para cards: a API exclui CANCELADO por padrão.
 * Sem status explícito, busca ativos + cancelados para o card de cancelados não zerar.
 */
export async function listarPedidosParaCards(
  filtros: FiltrosPedidos,
): Promise<Pedido[]> {
  const { card_filtro: _card, page: _page, limit: _limit, status, ...rest } =
    filtros;

  if (status) {
    return listarPedidosTodasPaginas({ ...rest, status });
  }

  const [ativos, cancelados] = await Promise.all([
    listarPedidosTodasPaginas(rest),
    listarPedidosTodasPaginas({ ...rest, status: 'CANCELADO' }),
  ]);

  const seen = new Set<number>();
  const merged: Pedido[] = [];
  for (const p of [...ativos, ...cancelados]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

/** Pedido com status Aberto e valor > 0 (saldo operacional em aberto). */
export function pedidoComSaldoEmAberto(p: PedidoComSaldo): boolean {
  return p.status === 'ABERTO' && saldoAbertoPedido(p) > 0.009;
}

/**
 * Resumo dos cards de Pedidos a partir da listagem filtrada.
 * Separa métricas de VENDA e COMPRA.
 * - Confirmados: pedidos Atendidos (valor total)
 * - Em aberto: só status Aberto
 * - Pedidos Abertos / Cancelados: conforme escopo do tipo
 */
export function calcularResumoCardsPedidos(
  pedidos: Pedido[],
  tipoFiltro?: TipoPedido,
): ResumoHeroPedidos {
  const vendas = pedidos.filter(
    (p) =>
      p.tipo === 'VENDA' && (!tipoFiltro || tipoFiltro === 'VENDA'),
  );
  const compras = pedidos.filter(
    (p) =>
      p.tipo === 'COMPRA' && (!tipoFiltro || tipoFiltro === 'COMPRA'),
  );
  const escopo =
    tipoFiltro === 'VENDA'
      ? vendas
      : tipoFiltro === 'COMPRA'
        ? compras
        : pedidos;

  const atendidosVenda = vendas.filter((p) => pedidoAtendido(p));
  const abertosVenda = vendas.filter((p) => p.status === 'ABERTO');
  const saldoVenda = abertosVenda.filter((p) => pedidoComSaldoEmAberto(p));

  const atendidosCompra = compras.filter((p) => pedidoAtendido(p));
  const abertosCompra = compras.filter((p) => p.status === 'ABERTO');
  const saldoCompra = abertosCompra.filter((p) => pedidoComSaldoEmAberto(p));

  const abertos = escopo.filter((p) => p.status === 'ABERTO');
  const cancelados = escopo.filter((p) => p.status === 'CANCELADO');

  return {
    modoCard: inferirModoCard(pedidos, tipoFiltro),
    faturamento_confirmado_venda: {
      valor: Number(
        atendidosVenda
          .reduce((s, p) => s + Number(p.valor_total ?? 0), 0)
          .toFixed(2),
      ),
      quantidade: atendidosVenda.length,
    },
    valor_em_aberto_venda: {
      valor: Number(
        saldoVenda.reduce((s, p) => s + saldoAbertoPedido(p), 0).toFixed(2),
      ),
      quantidade: saldoVenda.length,
    },
    compras_confirmadas: {
      valor: Number(
        atendidosCompra
          .reduce((s, p) => s + Number(p.valor_total ?? 0), 0)
          .toFixed(2),
      ),
      quantidade: atendidosCompra.length,
    },
    compras_em_aberto: {
      valor: Number(
        saldoCompra.reduce((s, p) => s + saldoAbertoPedido(p), 0).toFixed(2),
      ),
      quantidade: saldoCompra.length,
    },
    pedidos_em_andamento: {
      quantidade: abertos.length,
      detalhes: { pendente: 0, aprovado: 0, em_processamento: 0 },
    },
    pedidos_cancelados: {
      quantidade: cancelados.length,
    },
  };
}

export function labelFaturamentoCard(modo: ModoCardsPedidos, qtd: number): string {
  const sufixo = `${qtd} pedido${qtd === 1 ? '' : 's'}`;
  if (modo === 'COMPRA') return `Compras Confirmadas · ${sufixo}`;
  if (modo === 'MISTO') return `Confirmados (Vendas + Compras) · ${sufixo}`;
  return `Faturamento (Vendas) · ${sufixo}`;
}
