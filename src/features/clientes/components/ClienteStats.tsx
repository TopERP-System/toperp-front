/**
 * Componente de estatísticas de clientes
 */

import {
  ModuleStatCards,
  type ModuleStatCardItem,
} from '@/components/layout/ModuleStatCards';
import { statTheme } from '@/components/layout/module-stat-themes';
import { ClientesEstatisticas } from '@/services/clientes.service';
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';

interface ClienteStatsProps {
  estatisticas: ClientesEstatisticas | undefined;
  isLoading: boolean;
  error?: unknown;
}

export const ClienteStats = ({
  estatisticas,
  isLoading,
}: ClienteStatsProps) => {
  const items = useMemo((): ModuleStatCardItem[] => {
    return [
      {
        key: 'total',
        label: 'Total de clientes',
        value: estatisticas?.total || 0,
        Icon: Users,
        ...statTheme.primary,
      },
      {
        key: 'ativos',
        label: 'Clientes ativos',
        value: estatisticas?.ativos || 0,
        Icon: CheckCircle,
        ...statTheme.emerald,
      },
      {
        key: 'inativos',
        label: 'Clientes inativos',
        value: estatisticas?.inativos || 0,
        Icon: XCircle,
        ...statTheme.slate,
      },
      {
        key: 'inadimplentes',
        label: 'Inadimplentes',
        value: estatisticas?.inadimplentes || 0,
        Icon: AlertTriangle,
        ...statTheme.orange,
      },
      {
        key: 'bloqueados',
        label: 'Bloqueados',
        value: estatisticas?.bloqueados || 0,
        Icon: Ban,
        ...statTheme.red,
      },
      {
        key: 'novos',
        label: 'Novos no mês',
        value: estatisticas?.novosNoMes || 0,
        Icon: Calendar,
        ...statTheme.cyan,
      },
    ];
  }, [estatisticas]);

  return (
    <ModuleStatCards isLoading={isLoading} columns={6} items={items} />
  );
};
