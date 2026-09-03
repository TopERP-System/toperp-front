import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  /** Status do pedido */
  status: 'pendente' | 'em_transito' | 'entregue' | 'cancelado' | string;
  
  /** Classes CSS adicionais */
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Formato minúsculo
  pendente: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  },
  em_transito: {
    label: 'Em Trânsito',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  entregue: {
    label: 'Entregue',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  // Formato maiúsculo (novos status)
  PENDENTE: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  },
  APROVADO: {
    label: 'Aprovado',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  EM_PROCESSAMENTO: {
    label: 'Em Processamento',
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  },
  CONCLUIDO: {
    label: 'Concluído',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  // Status antigos (mantidos para compatibilidade)
  EM_SEPARACAO: {
    label: 'Em Separação',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  ENVIADO: {
    label: 'Enviado',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  CONFIRMADO: {
    label: 'Confirmado',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  ENTREGUE: {
    label: 'Entregue',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  // Normalizar status para buscar no config
  const normalizedStatus = status?.toLowerCase() || '';
  const statusKey = Object.keys(statusConfig).find(
    key => key.toLowerCase() === normalizedStatus
  ) || status;

  const config = statusConfig[statusKey] || {
    label: status || 'Desconhecido',
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  };

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}



