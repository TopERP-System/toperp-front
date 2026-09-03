import { cn, formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, Package, Wallet } from 'lucide-react';

export type PosicaoEstoqueMetricasProps = {
  /** Posição na data selecionada */
  quantidade: number;
  valor: number;
  dataPosicao?: string;
  loading?: boolean;
  className?: string;
  /** Dia da posição (YYYY-MM-DD) */
  data: string;
  onData: (value: string) => void;
};

function fmtQtd(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(Number(n) || 0);
}

function fmtDataBr(iso?: string): string {
  if (!iso?.trim()) return '—';
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** @deprecated use PosicaoEstoqueMetricas */
export type DreEstoqueMetricasProps = PosicaoEstoqueMetricasProps;

export function PosicaoEstoqueMetricas({
  quantidade,
  valor,
  dataPosicao,
  loading = false,
  className,
  data,
  onData,
}: PosicaoEstoqueMetricasProps) {
  const dataHint = dataPosicao
    ? `Posição em ${fmtDataBr(dataPosicao)}`
    : data
      ? `Posição em ${fmtDataBr(data)}`
      : 'Selecione um dia';

  const cards = [
    {
      key: 'quantidade',
      label: 'Quantidade do estoque',
      value: loading ? '…' : fmtQtd(quantidade),
      hint: dataHint,
      Icon: Package,
      tone: 'sky' as const,
    },
    {
      key: 'valor',
      label: 'Valor de estoque',
      value: loading ? '…' : formatCurrency(valor),
      hint: `${dataHint} × custo atual`,
      Icon: Wallet,
      tone: 'emerald' as const,
    },
  ];

  const toneClass = {
    sky: {
      wrap: 'border-sky-100 bg-sky-50/90 dark:border-sky-900/40 dark:bg-sky-950/25',
      icon: 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400',
      value: 'text-sky-800 dark:text-sky-300',
    },
    emerald: {
      wrap: 'border-emerald-100 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/25',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
      value: 'text-emerald-800 dark:text-emerald-300',
    },
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-border dark:bg-card',
        className,
      )}
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:border-border dark:bg-muted dark:text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            Estoque
          </span>
          <h3 className="text-xl font-bold tracking-tight text-[#003366] dark:text-foreground sm:text-2xl">
            Posição de Estoque
          </h3>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
            Quantidade e valor no dia selecionado. Valor = quantidade × preço de
            custo.
          </p>
        </div>
        <div className="w-full shrink-0 space-y-2 sm:w-auto sm:min-w-[14rem]">
          <Label
            htmlFor="posicao-estoque-dia"
            className="text-xs font-medium text-slate-500"
          >
            Dia
          </Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              id="posicao-estoque-dia"
              type="date"
              className="h-10 rounded-lg border-slate-200 bg-white pl-8 text-sm dark:border-border dark:bg-background"
              value={data}
              onChange={(e) => onData(e.target.value || '')}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando estoque…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((card) => {
            const t = toneClass[card.tone];
            return (
              <div
                key={card.key}
                className={cn('rounded-xl border p-4 shadow-sm', t.wrap)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    {card.label}
                  </p>
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      t.icon,
                    )}
                  >
                    <card.Icon className="h-4 w-4" />
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xl font-bold tabular-nums tracking-tight sm:text-2xl',
                    t.value,
                  )}
                >
                  {card.value}
                </p>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-muted-foreground">
                  {card.hint}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Alias para imports antigos. */
export const DreEstoqueMetricas = PosicaoEstoqueMetricas;
export default PosicaoEstoqueMetricas;
