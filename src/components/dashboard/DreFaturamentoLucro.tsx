import { cn, formatCurrency } from '@/lib/utils';
import { MonthYearSelect } from '@/components/ui/MonthYearSelect';
import {
  DollarSign,
  Equal,
  Loader2,
  Minus,
  PiggyBank,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type DreFaturamentoLucroProps = {
  faturamento: number;
  custoProduto: number;
  lucroBruto: number;
  despesasGerais: number;
  lucroLiquido: number;
  loading?: boolean;
  className?: string;
  /** YYYY-MM; vazio = todo o período. */
  mesAno?: string;
  onMesAnoChange?: (value: string) => void;
  /** Filtros extras à direita (ex.: roça). */
  filtersExtra?: ReactNode;
  periodoLabel?: string;
};

type CardTone = 'neutral' | 'cost' | 'gross' | 'expense' | 'net';

type FunnelCard = {
  key: string;
  label: string;
  value: number;
  Icon: LucideIcon;
  tone: CardTone;
  after?: 'minus' | 'equals';
};

const toneStyles: Record<
  CardTone,
  {
    wrap: string;
    iconWrap: string;
    icon: string;
    value: string;
    label: string;
  }
> = {
  neutral: {
    wrap: 'border-slate-200 bg-white dark:border-border dark:bg-card',
    iconWrap: 'bg-slate-100 dark:bg-muted',
    icon: 'text-slate-500',
    value: 'text-[#003366] dark:text-foreground',
    label: 'text-slate-500',
  },
  cost: {
    wrap: 'border-red-100 bg-red-50/90 dark:border-red-900/40 dark:bg-red-950/25',
    iconWrap: 'bg-red-100 dark:bg-red-900/50',
    icon: 'text-red-500',
    value: 'text-red-600 dark:text-red-400',
    label: 'text-red-500/90',
  },
  gross: {
    wrap: 'border-sky-100 bg-sky-50/90 dark:border-sky-900/40 dark:bg-sky-950/25',
    iconWrap: 'bg-sky-100 dark:bg-sky-900/50',
    icon: 'text-sky-600',
    value: 'text-sky-700 dark:text-sky-400',
    label: 'text-sky-600/90',
  },
  expense: {
    wrap: 'border-amber-100 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/25',
    iconWrap: 'bg-amber-100 dark:bg-amber-900/50',
    icon: 'text-amber-600',
    value: 'text-amber-700 dark:text-amber-400',
    label: 'text-amber-600/90',
  },
  net: {
    wrap: 'border-emerald-200 bg-emerald-50 shadow-md shadow-emerald-100/80 dark:border-emerald-800 dark:bg-emerald-950/35 dark:shadow-none',
    iconWrap: 'bg-emerald-100 dark:bg-emerald-900/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-400',
    label: 'text-emerald-600/90',
  },
};

function Operator({ kind }: { kind: 'minus' | 'equals' }) {
  const Icon = kind === 'minus' ? Minus : Equal;
  return (
    <div
      className="flex h-8 w-6 shrink-0 items-center justify-center self-center text-slate-400 sm:h-9 sm:w-8"
      aria-hidden
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
    </div>
  );
}

export function DreFaturamentoLucro({
  faturamento,
  custoProduto,
  lucroBruto,
  despesasGerais,
  lucroLiquido,
  loading = false,
  className,
  mesAno = '',
  onMesAnoChange,
  filtersExtra,
  periodoLabel,
}: DreFaturamentoLucroProps) {
  const cards: FunnelCard[] = [
    {
      key: 'faturamento',
      label: 'Faturamento do mês',
      value: faturamento,
      Icon: TrendingUp,
      tone: 'neutral',
      after: 'minus',
    },
    {
      key: 'custo',
      label: 'Custo de produto',
      value: custoProduto,
      Icon: ShoppingCart,
      tone: 'cost',
      after: 'equals',
    },
    {
      key: 'bruto',
      label: 'Lucro bruto',
      value: lucroBruto,
      Icon: DollarSign,
      tone: 'gross',
      after: 'minus',
    },
    {
      key: 'despesas',
      label: 'Despesas gerais',
      value: despesasGerais,
      Icon: Wallet,
      tone: 'expense',
      after: 'equals',
    },
    {
      key: 'liquido',
      label: 'Lucro líquido',
      value: lucroLiquido,
      Icon: PiggyBank,
      tone: 'net',
    },
  ];

  const showFilters = Boolean(onMesAnoChange) || Boolean(filtersExtra);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-border dark:bg-card',
        className,
      )}
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
            <PiggyBank className="h-3.5 w-3.5" />
            Resultado
          </span>
          <h3 className="text-xl font-bold tracking-tight text-[#003366] dark:text-foreground sm:text-2xl">
            Do faturamento ao lucro líquido
          </h3>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
            Faturamento = pedidos Atendidos no mês + receitas da Visão Geral
            (sem pedido). Pedidos Abertos não entram. Custo = Margem de
            Contribuição. Lucro bruto − Despesas gerais = Lucro líquido.
            {periodoLabel ? (
              <>
                {' '}
                Período: <span className="font-medium text-slate-600 dark:text-foreground">{periodoLabel}</span>.
              </>
            ) : null}
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
          <div
            className={cn(
              'inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-bold tabular-nums text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 sm:self-end',
              lucroLiquido < 0 &&
                'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400',
            )}
          >
            <PiggyBank className="h-4 w-4 shrink-0 opacity-90" />
            {loading ? '…' : formatCurrency(lucroLiquido)}
          </div>
          {showFilters ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              {onMesAnoChange ? (
                <div className="min-w-0 w-full sm:max-w-[14rem]">
                  <MonthYearSelect
                    id="dre-funil-mes-ano"
                    label="Mês"
                    value={mesAno}
                    onChange={onMesAnoChange}
                    emptyLabel="Todo o período"
                  />
                </div>
              ) : null}
              {filtersExtra}
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[8rem] items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando visão de lucro…</span>
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <div className="flex min-w-[52rem] items-stretch gap-1.5 px-1 sm:gap-2 xl:min-w-0 xl:gap-3">
            {cards.map((card) => {
              const styles = toneStyles[card.tone];
              return (
                <div
                  key={card.key}
                  className="contents"
                >
                  <div
                    className={cn(
                      'flex min-w-0 flex-1 flex-col gap-2 overflow-hidden rounded-2xl border p-3 sm:gap-3 sm:p-4',
                      styles.wrap,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'min-w-0 flex-1 text-[10px] font-semibold uppercase leading-snug tracking-wide sm:text-[11px]',
                          styles.label,
                        )}
                      >
                        {card.label}
                      </p>
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9',
                          styles.iconWrap,
                        )}
                      >
                        <card.Icon
                          className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', styles.icon)}
                        />
                      </div>
                    </div>
                    <p
                      className={cn(
                        'min-w-0 max-w-full truncate text-[clamp(0.85rem,1.6vw,1.35rem)] font-bold tabular-nums leading-snug tracking-tight',
                        styles.value,
                        card.value < 0 &&
                          card.tone !== 'cost' &&
                          card.tone !== 'expense'
                          ? 'text-destructive'
                          : null,
                      )}
                      title={formatCurrency(card.value)}
                    >
                      {formatCurrency(card.value)}
                    </p>
                  </div>
                  {card.after ? <Operator kind={card.after} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default DreFaturamentoLucro;
