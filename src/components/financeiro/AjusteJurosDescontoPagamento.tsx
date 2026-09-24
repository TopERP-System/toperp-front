import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

/**
 * Juros e desconto editáveis na tela de pagamento: começam com os valores atuais
 * da conta e, se alterados, substituem os da conta ao registrar o pagamento.
 */
export function AjusteJurosDescontoPagamento({
  valorOriginal,
  valorPagoAtual,
  juros,
  desconto,
  jurosAtual,
  descontoAtual,
  onJurosChange,
  onDescontoChange,
  labelPago = "Já pago",
}: {
  valorOriginal: number;
  valorPagoAtual: number;
  juros: number | "";
  desconto: number | "";
  /** Valores gravados na conta (para indicar o que mudou). */
  jurosAtual: number;
  descontoAtual: number;
  onJurosChange: (v: number | "") => void;
  onDescontoChange: (v: number | "") => void;
  labelPago?: string;
}) {
  const j = Number(juros) || 0;
  const d = Number(desconto) || 0;
  const novoTotal = Math.round((valorOriginal + j - d) * 100) / 100;
  const emAberto = Math.max(0, Math.round((novoTotal - valorPagoAtual) * 100) / 100);
  const alterado =
    Math.abs(j - jurosAtual) > 0.001 || Math.abs(d - descontoAtual) > 0.001;

  const parse = (v: string): number | "" =>
    v === "" ? "" : Math.max(0, Number(v));

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div>
        <h3 className="text-sm font-semibold">Juros e desconto</h3>
        <p className="text-xs text-muted-foreground">
          Valores atuais da conta. Ajuste se necessário — ao registrar, eles substituem os atuais.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ajuste-juros">Juros</Label>
          <Input
            id="ajuste-juros"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={juros}
            onChange={(e) => onJurosChange(parse(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ajuste-desconto">Desconto</Label>
          <Input
            id="ajuste-desconto"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={desconto}
            onChange={(e) => onDescontoChange(parse(e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums md:grid-cols-4">
        <span className="text-muted-foreground">Valor original</span>
        <span className="text-right md:text-left">{formatCurrency(valorOriginal)}</span>
        <span className="text-muted-foreground">Valor total</span>
        <span
          className={
            novoTotal < 0
              ? "text-right font-semibold text-destructive md:text-left"
              : "text-right font-semibold md:text-left"
          }
        >
          {formatCurrency(novoTotal)}
        </span>
        <span className="text-muted-foreground">{labelPago}</span>
        <span className="text-right md:text-left">{formatCurrency(valorPagoAtual)}</span>
        <span className="text-muted-foreground">Em aberto</span>
        <span className="text-right font-semibold text-amber-600 md:text-left">
          {formatCurrency(emAberto)}
        </span>
      </div>
      {novoTotal < 0 ? (
        <p className="text-xs text-destructive">
          O desconto não pode ser maior que o valor original somado aos juros.
        </p>
      ) : alterado ? (
        <p className="text-xs text-muted-foreground">
          Juros/desconto alterados — serão gravados na conta junto com o pagamento.
        </p>
      ) : null}
    </div>
  );
}
