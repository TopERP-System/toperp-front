import {
  ModuleStatCards,
  type ModuleStatCardItem,
} from '@/components/layout/ModuleStatCards';
import { statTheme } from '@/components/layout/module-stat-themes';
import { cn } from '@/lib/utils';
import { Transportadora } from '@/types/carrier';
import { Building2, CheckCircle, TrendingUp, XCircle } from 'lucide-react';
import { useMemo } from 'react';

interface CarrierStatsProps {
  carriers: Transportadora[];
  className?: string;
}

export function CarrierStats({ carriers, className }: CarrierStatsProps) {
  const total = carriers.length;
  const ativas = carriers.filter((c) => c.ativo).length;
  const inativas = total - ativas;
  const taxaAtivacao = total > 0 ? Math.round((ativas / total) * 100) : 0;

  const items = useMemo((): ModuleStatCardItem[] => {
    return [
      {
        key: 'total',
        label: 'Total de transportadoras',
        value: total,
        Icon: Building2,
        ...statTheme.sky,
      },
      {
        key: 'ativas',
        label: 'Transportadoras ativas',
        value: ativas,
        Icon: CheckCircle,
        ...statTheme.emerald,
      },
      {
        key: 'inativas',
        label: 'Transportadoras inativas',
        value: inativas,
        Icon: XCircle,
        ...statTheme.slate,
      },
      {
        key: 'taxa',
        label: 'Taxa de ativação',
        value: `${taxaAtivacao}%`,
        Icon: TrendingUp,
        ...statTheme.purple,
      },
    ];
  }, [total, ativas, inativas, taxaAtivacao]);

  return (
    <ModuleStatCards
      className={cn(className)}
      columns={4}
      items={items}
    />
  );
}
