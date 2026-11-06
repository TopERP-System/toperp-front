/**
 * Filtros do relatório "Produtos por cliente" (task 018): dois conceitos separados.
 * - Status do pedido: o operacional, o mesmo da listagem de Pedidos.
 * - Situação financeira: calculada pelas contas do pedido (mesmos códigos dos relatórios financeiros).
 */
export type StatusPedidoFiltroProdutosCliente =
  | "Todos"
  | "ABERTO"
  | "ATENDIDO"
  | "CANCELADO";

export const STATUS_PEDIDO_FILTRO_PRODUTOS_LABELS: Record<StatusPedidoFiltroProdutosCliente, string> = {
  Todos: "Todos",
  ABERTO: "Aberto",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
};

export type StatusFiltroProdutosCliente =
  | "Todos"
  | "PENDENTE"
  | "PAGO_PARCIAL"
  | "PAGO_TOTAL"
  | "VENCIDO";

/** Situação financeira (query param `status`). */
export const STATUS_FILTRO_PRODUTOS_LABELS: Record<StatusFiltroProdutosCliente, string> = {
  Todos: "Todas",
  PENDENTE: "Em aberto",
  PAGO_PARCIAL: "Pago parcial",
  PAGO_TOTAL: "Quitado",
  VENCIDO: "Vencido",
};

export function isStatusFiltroProdutosCliente(
  s: string,
): s is StatusFiltroProdutosCliente {
  return Object.prototype.hasOwnProperty.call(STATUS_FILTRO_PRODUTOS_LABELS, s);
}

export function isStatusPedidoFiltroProdutosCliente(
  s: string,
): s is StatusPedidoFiltroProdutosCliente {
  return Object.prototype.hasOwnProperty.call(STATUS_PEDIDO_FILTRO_PRODUTOS_LABELS, s);
}

/** Texto dos filtros de status, ex.: "status do pedido Atendido, situação financeira Quitado". */
export function descreverFiltrosStatusProdutosCliente(
  statusPedido: string,
  situacao: string,
): string | null {
  const partes: string[] = [];
  if (statusPedido && statusPedido !== "Todos") {
    const l =
      STATUS_PEDIDO_FILTRO_PRODUTOS_LABELS[statusPedido as StatusPedidoFiltroProdutosCliente] ??
      statusPedido;
    partes.push(`status do pedido "${l}"`);
  }
  if (situacao && situacao !== "Todos") {
    const l = STATUS_FILTRO_PRODUTOS_LABELS[situacao as StatusFiltroProdutosCliente] ?? situacao;
    partes.push(`situação financeira "${l}"`);
  }
  return partes.length ? partes.join(" e ") : null;
}

function fmtDataBr(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Mensagem quando a lista de itens vem vazia — considera cliente, período e status juntos.
 */
export function mensagemListaVaziaProdutosCliente(params: {
  clienteNome: string;
  dataInicial: string;
  dataFinal: string;
  statusFiltro: string;
  statusPedido?: string;
}): string {
  const { clienteNome, dataInicial, dataFinal, statusFiltro, statusPedido } = params;
  const di = fmtDataBr(dataInicial);
  const df = fmtDataBr(dataFinal);
  const nome = clienteNome?.trim() || "este cliente";
  const filtros = descreverFiltrosStatusProdutosCliente(statusPedido ?? "Todos", statusFiltro);

  if (!filtros) {
    return `Não há pedidos de venda com itens para ${nome} no período de ${di} a ${df} (todos os status).`;
  }

  return `Não há pedidos de venda com itens para ${nome} no período de ${di} a ${df} com ${filtros}.`;
}
