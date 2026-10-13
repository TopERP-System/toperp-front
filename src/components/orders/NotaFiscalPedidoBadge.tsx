import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  STATUS_NOTA_EM_PROCESSAMENTO,
  STATUS_NOTA_FISCAL_LABELS,
  type StatusNotaFiscal,
} from '@/types/nota-fiscal';
import type { Pedido } from '@/types/pedido';

type Situacao = 'emitida' | 'processando' | 'problema' | 'cancelada';

const SITUACAO_CLASS: Record<Situacao, string> = {
  emitida:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  processando:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  problema:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  cancelada: 'bg-muted text-muted-foreground border-border',
};

const SITUACAO_LABEL: Record<Situacao, string> = {
  emitida: 'Emitida',
  processando: 'Processando',
  problema: 'Rejeitada',
  cancelada: 'Cancelada',
};

function situacaoDaNota(status: StatusNotaFiscal): Situacao {
  if (status === 'authorized') return 'emitida';
  if (STATUS_NOTA_EM_PROCESSAMENTO.includes(status)) return 'processando';
  if (status === 'rejected' || status === 'denied') return 'problema';
  return 'cancelada';
}

/**
 * Situação da NF-e do pedido na listagem. NF-e só existe para venda:
 * compra e pedido cancelado sem nota mostram "—".
 */
export function NotaFiscalPedidoBadge({ order }: { order: Pedido }) {
  const status = order.nota_fiscal_status;

  if (!status) {
    const naoSeAplica = order.tipo !== 'VENDA' || order.status === 'CANCELADO';
    return (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {naoSeAplica ? '—' : 'Não emitida'}
      </span>
    );
  }

  const situacao = situacaoDaNota(status);
  const numero = order.nota_fiscal_numero;
  const detalhe = STATUS_NOTA_FISCAL_LABELS[status] ?? status;

  return (
    <Badge
      variant="outline"
      className={cn('font-normal whitespace-nowrap', SITUACAO_CLASS[situacao])}
      title={numero ? `NF-e ${numero} — ${detalhe}` : `NF-e ${detalhe.toLowerCase()}`}
    >
      {situacao === 'emitida' && numero ? `NF ${numero}` : SITUACAO_LABEL[situacao]}
    </Badge>
  );
}
