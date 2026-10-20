/**
 * Select "Conta (Banco)" do dialog "Relatório geral" (Contas a Receber / a Pagar).
 * O valor do select é uma string: "todas" | "sem_banco" | "<id da conta bancária>".
 */
export const CONTA_BANCARIA_RELATORIO_TODAS = "todas";
export const CONTA_BANCARIA_RELATORIO_SEM_BANCO = "sem_banco";

/** Valor inicial do select a partir do filtro de banco da tela (Filtros Avançados). */
export function valorInicialContaBancariaRelatorio(
  contaBancariaFilterId: number | null | undefined,
): string {
  return contaBancariaFilterId != null && contaBancariaFilterId > 0
    ? String(contaBancariaFilterId)
    : CONTA_BANCARIA_RELATORIO_TODAS;
}

/** Converte o valor do select nos filtros do relatório / da listagem. */
export function parseContaBancariaRelatorio(valor: string): {
  contaBancariaId?: number;
  semContaBancaria?: boolean;
} {
  if (valor === CONTA_BANCARIA_RELATORIO_SEM_BANCO) return { semContaBancaria: true };
  const n = parseInt(valor, 10);
  return Number.isFinite(n) && n > 0 ? { contaBancariaId: n } : {};
}
