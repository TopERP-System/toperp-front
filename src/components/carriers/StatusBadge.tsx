import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  /** Status da transportadora */
  ativo: boolean;
  
  /** Classes CSS adicionais */
  className?: string;
}

export function StatusBadge({ ativo, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={ativo ? 'default' : 'secondary'}
      className={cn(
        'flex items-center gap-1.5',
        ativo
          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
          : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        className
      )}
    >
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          ativo ? 'bg-green-600 dark:bg-green-400' : 'bg-gray-400 dark:bg-gray-500'
        )}
      />
      {ativo ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}



