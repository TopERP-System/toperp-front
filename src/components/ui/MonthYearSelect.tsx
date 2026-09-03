import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import { useMemo } from 'react';

const TODOS_VALUE = '__todos__';

function buildOpcoesMes(mesesAtras = 36): Array<{ value: string; label: string }> {
  const opts: Array<{ value: string; label: string }> = [];
  const agora = new Date();
  for (let i = 0; i < mesesAtras; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bruto = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    opts.push({
      value,
      label: bruto.charAt(0).toUpperCase() + bruto.slice(1),
    });
  }
  return opts;
}

type MonthYearSelectProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  className?: string;
  triggerClassName?: string;
  monthsBack?: number;
};

/**
 * Seletor de mês/ano cross-browser (substitui input type="month",
 * que some ou fica ilegível em alguns navegadores/zoom).
 */
export function MonthYearSelect({
  id,
  label = 'Mês de referência',
  value,
  onChange,
  emptyLabel = 'Todos os meses',
  className,
  triggerClassName,
  monthsBack = 36,
}: MonthYearSelectProps) {
  const opcoes = useMemo(() => buildOpcoesMes(monthsBack), [monthsBack]);
  const selectValue = value?.trim() ? value.trim() : TODOS_VALUE;

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}>
      {label ? (
        <Label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <Calendar className="h-3.5 w-3.5 opacity-70" />
          {label}
        </Label>
      ) : null}
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === TODOS_VALUE ? '' : v)}
      >
        <SelectTrigger
          id={id}
          className={cn('h-10 w-full min-w-0', triggerClassName)}
          aria-label={label}
        >
          <SelectValue placeholder={emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS_VALUE}>{emptyLabel}</SelectItem>
          {opcoes.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
