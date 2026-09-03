/** Conta PAGAR sem pedido = despesa (centro de custo ou avulsa). */
export function contaEhDespesaSemPedido(
  conta: { tipo?: string; pedido_id?: number | null } | null | undefined,
): boolean {
  if (!conta || conta.tipo !== "PAGAR") return false;
  const pid = conta.pedido_id;
  return pid == null || Number(pid) <= 0;
}
