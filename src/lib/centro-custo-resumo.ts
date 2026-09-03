export type ResumoCentroCustoModulo = {
  qAbertas: number;
  qQuitadas: number;
  valorAbertoTotal: number;
  valorPagoTotal: number;
};

type DespesaResumoInput = {
  valor: number | string;
  pagamentos?: Array<{ valor: number | string }>;
};

function totalPago(d: DespesaResumoInput): number {
  return (d.pagamentos ?? []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
}

/** Resumo dos cards do Centro de Despesa a partir da listagem filtrada. */
export function calcularResumoModuloDespesas(
  despesas: DespesaResumoInput[],
): ResumoCentroCustoModulo {
  let qAbertas = 0;
  let qQuitadas = 0;
  let valorAbertoTotal = 0;
  let valorPagoTotal = 0;

  for (const d of despesas) {
    const total = Number(d.valor) || 0;
    const pago = totalPago(d);
    const aberto = Math.max(0, total - pago);
    valorPagoTotal += pago;
    valorAbertoTotal += aberto;
    if (pago <= 0) qAbertas += 1;
    else if (pago >= total - 0.005) qQuitadas += 1;
    else qAbertas += 1;
  }

  return {
    qAbertas,
    qQuitadas,
    valorAbertoTotal: Number(valorAbertoTotal.toFixed(2)),
    valorPagoTotal: Number(valorPagoTotal.toFixed(2)),
  };
}
