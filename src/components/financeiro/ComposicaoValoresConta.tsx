import { formatCurrency } from "@/lib/utils";

/**
 * Composição financeira da conta: Valor original, (+) Juros, (−) Desconto,
 * (=) Valor total, pago/recebido e em aberto.
 *
 * O valor original é derivado do total (total − juros + desconto) para que a
 * soma sempre feche — em contas de pedido o total é o do pedido e juros/desconto são 0.
 */
export function ComposicaoValoresConta({
  valorTotal,
  juros = 0,
  desconto = 0,
  valorPago,
  valorAberto,
  labelPago = "Total Pago",
}: {
  valorTotal: number;
  juros?: number;
  desconto?: number;
  valorPago: number;
  valorAberto: number;
  labelPago?: string;
}) {
  const valorOriginal = Math.round((valorTotal - juros + desconto) * 100) / 100;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Valor Original</div>
        <div className="text-lg font-semibold tabular-nums">
          {formatCurrency(valorOriginal)}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Juros (+)</div>
        <div className="text-lg font-semibold tabular-nums text-rose-600">
          {formatCurrency(juros)}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Desconto (−)</div>
        <div className="text-lg font-semibold tabular-nums text-sky-600">
          {formatCurrency(desconto)}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Valor Total (=)</div>
        <div className="text-primary text-xl font-bold tabular-nums">
          {formatCurrency(valorTotal)}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">{labelPago}</div>
        <div className="text-xl font-bold tabular-nums text-green-600">
          {formatCurrency(valorPago)}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Valor em Aberto</div>
        <div className="text-xl font-bold tabular-nums text-amber-600">
          {formatCurrency(valorAberto)}
        </div>
      </div>
    </div>
  );
}
