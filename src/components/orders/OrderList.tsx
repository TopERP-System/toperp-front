import { TableRowActionsMenu } from '@/components/TableRowActionsMenu';
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { normalizeCurrency } from '@/lib/utils';
import { Pedido, pedidoVinculadoRoca, StatusPedido } from '@/types/pedido';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Eye, FileText, Loader2, Receipt, ShoppingCart, Trash2, Ban } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { TypeBadge } from './TypeBadge';
import { canManageNotaFiscal } from '@/lib/role-access';
import { useAuth } from '@/contexts/AuthContext';

interface OrderListProps {
  orders: Pedido[];
  isLoading: boolean;
  onView: (order: Pedido) => void;
  onEdit: (order: Pedido) => void;
  onCancel: (order: Pedido) => void;
  onDelete: (order: Pedido) => void;
  onReport?: (order: Pedido) => void;
  onEmitNotaFiscal?: (order: Pedido) => void;
  reportingOrderId?: number | null;
  onStatusChange?: (id: number, status: StatusPedido) => void;
  updatingStatusId?: number | null;
}

export function OrderList({ 
  orders, 
  isLoading, 
  onView, 
  onEdit, 
  onCancel,
  onDelete,
  onReport,
  onEmitNotaFiscal,
  reportingOrderId = null,
  onStatusChange,
  updatingStatusId = null,
}: OrderListProps) {
  const { user } = useAuth();
  const podeEmitirNf = canManageNotaFiscal(user?.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[12rem] py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center min-h-[12rem] flex flex-col items-center justify-center py-12 px-4">
        <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum pedido encontrado</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--';
    try {
      // Se a data vem no formato YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS
      // Extrair apenas a parte da data para evitar problemas de timezone
      const dateOnly = dateString.split('T')[0].split(' ')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      
      // Criar data local (sem conversão de timezone)
      const localDate = new Date(year, month - 1, day);
      return format(localDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '--';
    }
  };

  const parceiroLabel = (order: Pedido) =>
    order.tipo === 'VENDA'
      ? order.cliente?.nome ||
        order.cliente?.nome_fantasia ||
        order.cliente?.nome_razao ||
        order.roca_nome ||
        order.roca?.nome ||
        (order.cliente_id
          ? `Cliente #${order.cliente_id}`
          : order.roca_id
            ? `Roça #${order.roca_id}`
            : '--')
      : order.fornecedor?.nome_fantasia ||
        order.fornecedor?.nome_razao ||
        order.roca_nome ||
        order.roca?.nome ||
        (order.fornecedor_id
          ? `Fornecedor #${order.fornecedor_id}`
          : order.roca_id
            ? `Roça #${order.roca_id}`
            : '--');

  const renderActions = (order: Pedido) => {
    const isAtendido =
      order.status === 'ATENDIDO' ||
      order.status === 'QUITADO' ||
      order.status === 'PARCIAL';
    const canEditOrCancel =
      order.status !== 'CANCELADO' && !isAtendido;
    const canDelete = !isAtendido;
    const canEmitNf =
      !!podeEmitirNf &&
      !!onEmitNotaFiscal &&
      order.tipo === 'VENDA' &&
      order.status !== 'CANCELADO';
    const showDestructiveSeparator = canEditOrCancel || canDelete;

    return (
      <div className="flex justify-end">
        <TableRowActionsMenu contentClassName="w-52">
          <DropdownMenuItem onSelect={() => onView(order)} className="gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            Visualizar
          </DropdownMenuItem>
          {onReport && (
            <DropdownMenuItem
              onSelect={() => onReport(order)}
              disabled={reportingOrderId === order.id}
              className="gap-2"
              title={
                pedidoVinculadoRoca(order)
                  ? 'Relatório PDF com itens (sem endereço/contato da roça)'
                  : 'Relatório PDF com itens e endereço'
              }
            >
              {reportingOrderId === order.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
              Relatório PDF
            </DropdownMenuItem>
          )}
          {canEmitNf && (
            <DropdownMenuItem
              onSelect={() => onEmitNotaFiscal?.(order)}
              className="gap-2"
            >
              <Receipt className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              Emitir nota fiscal
            </DropdownMenuItem>
          )}
          {canEditOrCancel && (
            <DropdownMenuItem onSelect={() => onEdit(order)} className="gap-2">
              <Edit className="w-4 h-4 text-muted-foreground" />
              Editar
            </DropdownMenuItem>
          )}
          {showDestructiveSeparator && <DropdownMenuSeparator />}
          {canEditOrCancel && (
            <DropdownMenuItem
              onSelect={() => onCancel(order)}
              className="gap-2 text-amber-700 focus:text-amber-700 dark:text-amber-500 dark:focus:text-amber-500"
            >
              <Ban className="w-4 h-4" />
              Cancelar
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onSelect={() => onDelete(order)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </DropdownMenuItem>
          )}
        </TableRowActionsMenu>
      </div>
    );
  };

  const renderStatus = (order: Pedido) => {
    const statusSelectValue =
      order.status === 'PARCIAL' || order.status === 'QUITADO'
        ? 'ATENDIDO'
        : order.status;
    const statusLabel =
      statusSelectValue === 'ABERTO'
        ? 'Aberto'
        : statusSelectValue === 'ATENDIDO'
          ? 'Atendido'
          : 'Cancelado';
    const statusTriggerClass =
      statusSelectValue === 'ABERTO'
        ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
        : statusSelectValue === 'ATENDIDO'
          ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
          : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';

    return onStatusChange ? (
      <Select
        value={statusSelectValue}
        onValueChange={(value) => {
          if (value !== statusSelectValue) {
            onStatusChange(order.id, value as StatusPedido);
          }
        }}
        disabled={updatingStatusId === order.id}
      >
        <SelectTrigger
          className={`h-7 w-full max-w-[130px] text-xs font-medium rounded-full border-0 shadow-none hover:opacity-80 transition-opacity ${statusTriggerClass}`}
        >
          <SelectValue>
            {updatingStatusId === order.id ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Atualizando...</span>
              </div>
            ) : (
              <span>{statusLabel}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ABERTO">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Aberto
            </div>
          </SelectItem>
          <SelectItem value="ATENDIDO">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Atendido
            </div>
          </SelectItem>
          <SelectItem value="CANCELADO">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Cancelado
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <StatusBadge status={order.status} />
    );
  };

  return (
    <>
      {/* Cards — mobile */}
      <div className="md:hidden divide-y divide-border">
        {orders.map((order) => (
          <article key={order.id} className="p-3 sm:p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-primary text-sm truncate">
                  {order.numero_pedido}
                </p>
                <p className="text-sm text-foreground truncate mt-0.5">{parceiroLabel(order)}</p>
              </div>
              <TypeBadge tipo={order.tipo} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {renderStatus(order)}
              <span className="text-sm font-semibold ml-auto">
                {formatCurrency(normalizeCurrency(order.valor_total, false))}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-xs text-muted-foreground">{formatDate(order.data_pedido)}</span>
              {renderActions(order)}
            </div>
          </article>
        ))}
      </div>

      {/* Tabela — tablet/desktop */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[720px] w-full">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b sticky top-0 z-[1]">
            <TableHead className="font-semibold text-foreground whitespace-nowrap">Número</TableHead>
            <TableHead className="font-semibold text-foreground whitespace-nowrap hidden lg:table-cell">Tipo</TableHead>
            <TableHead className="font-semibold text-foreground min-w-[140px]">Cliente/Fornecedor</TableHead>
            <TableHead className="font-semibold text-foreground whitespace-nowrap">Status</TableHead>
            <TableHead className="font-semibold text-foreground whitespace-nowrap">Total</TableHead>
            <TableHead className="font-semibold text-foreground whitespace-nowrap hidden lg:table-cell">Data</TableHead>
            <TableHead className="w-[72px] font-semibold text-foreground text-right whitespace-nowrap">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="whitespace-nowrap">
                <span className="font-medium text-primary">{order.numero_pedido}</span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <TypeBadge tipo={order.tipo} />
              </TableCell>
              <TableCell className="max-w-[200px] lg:max-w-none">
                <span className="text-sm truncate block max-w-[180px] lg:max-w-none">
                  {parceiroLabel(order)}
                </span>
              </TableCell>
              <TableCell>{renderStatus(order)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="font-medium">
                  {formatCurrency(normalizeCurrency(order.valor_total, false))}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell whitespace-nowrap">
                <span className="text-sm text-muted-foreground">{formatDate(order.data_pedido)}</span>
              </TableCell>
              <TableCell className="text-right">{renderActions(order)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </>
  );
}

