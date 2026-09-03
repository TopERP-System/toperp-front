import { TipoPedido } from '@/types/pedido';
import { cn } from '@/lib/utils';
import { ShoppingCart, Package } from 'lucide-react';

interface TypeBadgeProps {
  tipo: TipoPedido;
  className?: string;
}

export function TypeBadge({ tipo, className }: TypeBadgeProps) {
  const tipoConfig: Record<TipoPedido, { label: string; className: string; icon: typeof ShoppingCart }> = {
    VENDA: {
      label: 'Venda',
      className: 'bg-green-50 text-green-700 border border-green-200',
      icon: ShoppingCart,
    },
    COMPRA: {
      label: 'Compra',
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: Package,
    },
  };

  const config = tipoConfig[tipo];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

