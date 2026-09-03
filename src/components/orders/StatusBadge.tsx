import { cn } from '@/lib/utils';
import { StatusPedido } from '@/types/pedido';

/** Rótulos exibidos (status operacional). Legado PARCIAL/QUITADO → Atendido. */
export const STATUS_PEDIDO_LABELS: Record<StatusPedido, string> = {
  ABERTO: 'Aberto',
  ATENDIDO: 'Atendido',
  CANCELADO: 'Cancelado',
  PARCIAL: 'Atendido',
  QUITADO: 'Atendido',
};

function resolveStatusKey(status: StatusPedido): StatusPedido {
  if (status === 'PARCIAL' || status === 'QUITADO') return 'ATENDIDO';
  return status;
}

interface StatusBadgeProps {
  status: StatusPedido;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = resolveStatusKey(status);
  const statusConfig: Record<
    'ABERTO' | 'ATENDIDO' | 'CANCELADO',
    { label: string; className: string }
  > = {
    ABERTO: {
      label: 'Aberto',
      className:
        'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    },
    ATENDIDO: {
      label: 'Atendido',
      className:
        'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400',
    },
    CANCELADO: {
      label: 'Cancelado',
      className:
        'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400',
    },
  };

  const config = statusConfig[key as 'ABERTO' | 'ATENDIDO' | 'CANCELADO'] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  };

  return (
    <span
      className={cn(
        'text-xs px-2 py-1 rounded-full font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
