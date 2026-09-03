/** Filtros de status alinhados ao relatório financeiro e ao backend (pedidos). */
export type StatusFiltroProdutosCliente =
  | "Todos"
  | "PENDENTE"
  | "PAGO_PARCIAL"
  | "PAGO_TOTAL"
  | "VENCIDO"
  | "CANCELADO";

export const STATUS_FILTRO_PRODUTOS_LABELS: Record<StatusFiltroProdutosCliente, string> = {
  Todos: "Todos",
  PENDENTE: "Pendente",
  PAGO_PARCIAL: "Pago parcial",
  PAGO_TOTAL: "Quitada",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
};

export function isStatusFiltroProdutosCliente(
  s: string,
): s is StatusFiltroProdutosCliente {
  return Object.prototype.hasOwnProperty.call(STATUS_FILTRO_PRODUTOS_LABELS, s);
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
}): string {
  const { clienteNome, dataInicial, dataFinal, statusFiltro } = params;
  const di = fmtDataBr(dataInicial);
  const df = fmtDataBr(dataFinal);
  const nome = clienteNome?.trim() || "este cliente";

  const st = (statusFiltro || "Todos") as StatusFiltroProdutosCliente;
  const label =
    STATUS_FILTRO_PRODUTOS_LABELS[st] ?? statusFiltro;

  if (!st || st === "Todos") {
    return `Não há pedidos de venda com itens para ${nome} no período de ${di} a ${df} (todos os status).`;
  }

  return `Não há pedidos de venda com itens para ${nome} no período de ${di} a ${df} com status "${label}".`;
}
