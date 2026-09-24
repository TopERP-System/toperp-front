import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type ModuleStatCardItem = {
  key: string;
  label: string;
  value: string | number;
  iconWrap: string;
  iconClass: string;
  valueClass: string;
  Icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  labelExtra?: ReactNode;
  /** Fundo/borda do card (ex.: cards tintidos do dashboard). */
  cardClassName?: string;
  labelClassName?: string;
  /**
   * Valor sendo (re)calculado: card acinzentado com brilho da esquerda para a
   * direita e o valor substituído por uma barra — evita piscar "R$ 0,00".
   */
  loading?: boolean;
};

type ColumnPreset = 2 | 3 | 4 | 5 | 6 | 7 | 8;

const GRID_BY_COLUMNS: Record<ColumnPreset, string> = {
  2: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  3: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
  5: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  7: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7',
  /** 8 cards: 2 linhas de 4 no desktop — evita truncar labels/valores */
  8: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

interface ModuleStatCardProps {
  item: ModuleStatCardItem;
}

export function ModuleStatCard({ item }: ModuleStatCardProps) {
  const Icon = item.Icon;
  const interactive = Boolean(item.onClick);
  const Wrapper = interactive ? 'button' : 'div';
  const loading = Boolean(item.loading);

  return (
    <Wrapper
      type={interactive ? 'button' : undefined}
      onClick={item.onClick}
      className={cn(
        'min-w-0',
        interactive && 'cursor-pointer text-left',
        item.active &&
          'rounded-xl ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
      )}
    >
      <Card
        aria-busy={loading || undefined}
        className={cn(
          'relative h-full min-w-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-[filter,opacity] duration-300',
          interactive && 'transition-shadow hover:shadow-md',
          item.cardClassName,
          loading && 'opacity-80 grayscale',
        )}
      >
        {loading ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-slate-200/40"
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        ) : null}
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'min-w-0 flex-1 text-sm font-medium leading-snug text-slate-500 break-words',
                item.labelClassName,
              )}
            >
              {item.label}
              {item.labelExtra}
            </p>
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11',
                item.iconWrap,
              )}
            >
              <Icon className={cn('h-5 w-5', item.iconClass)} aria-hidden />
            </div>
          </div>
          {loading ? (
            <div className="mt-3 sm:mt-4" role="status" aria-label="Carregando">
              <div className="h-7 w-2/3 rounded-md bg-slate-300/70 sm:h-8" />
            </div>
          ) : (
            <p
              className={cn(
                'mt-3 text-xl font-bold tabular-nums tracking-tight leading-tight break-words sm:mt-4 sm:text-2xl',
                item.valueClass,
              )}
              title={String(item.value)}
            >
              {item.value}
            </p>
          )}
        </CardContent>
      </Card>
    </Wrapper>
  );
}

interface ModuleStatCardsProps {
  items: ModuleStatCardItem[];
  isLoading?: boolean;
  loadingCount?: number;
  columns?: ColumnPreset;
  className?: string;
}

export function ModuleStatCards({
  items,
  isLoading = false,
  loadingCount,
  columns,
  className,
}: ModuleStatCardsProps) {
  const colCount = (columns ?? Math.min(Math.max(items.length, 2), 8)) as ColumnPreset;
  const skeletons = loadingCount ?? (items.length || 4);

  // Com os cards já definidos, carregamento vira o estado "loading" de cada card
  // (mantém título/ícone e layout); spinner só quando ainda não há cards.
  if (isLoading && items.length > 0) {
    return (
      <div className={cn(GRID_BY_COLUMNS[colCount], 'mb-6', className)}>
        {items.map((item) => (
          <ModuleStatCard key={item.key} item={{ ...item, loading: true }} />
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn(GRID_BY_COLUMNS[colCount], 'mb-6', className)}>
        {Array.from({ length: skeletons }, (_, i) => (
          <Card
            key={i}
            className="h-full min-w-0 rounded-2xl border-slate-200 bg-white shadow-sm"
          >
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(GRID_BY_COLUMNS[colCount], 'mb-6', className)}>
      {items.map((item) => (
        <ModuleStatCard key={item.key} item={item} />
      ))}
    </div>
  );
}
