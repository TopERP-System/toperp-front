import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
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
import { cn } from '@/lib/utils';
import { Transportadora } from '@/types/carrier';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Eye, Loader2, Mail, MapPin, MoreVertical, Package, Power, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface CarrierTableProps {
  /** Lista de transportadoras a exibir */
  carriers: Transportadora[];
  
  /** Termo de busca atual */
  searchTerm?: string;
  
  /** Callback ao clicar em editar */
  onEdit: (carrier: Transportadora) => void;
  
  /** Callback ao clicar em excluir */
  onDelete: (carrier: Transportadora) => void;
  
  /** Callback ao alterar status */
  onStatusChange?: (carrierId: number, ativo: boolean) => void;
  
  /** Callback ao visualizar pedidos */
  onViewOrders: (carrier: Transportadora) => void;
  
  /** Callback ao visualizar dados completos */
  onView?: (carrier: Transportadora) => void;
  
  /** ID da transportadora que está atualizando status */
  updatingStatusId?: number | null;
  
  /** Classes CSS adicionais */
  className?: string;
}

export function CarrierTable({
  carriers,
  searchTerm = '',
  onEdit,
  onDelete,
  onStatusChange,
  onViewOrders,
  onView,
  updatingStatusId,
  className,
}: CarrierTableProps) {
  const hasSearchTerm = searchTerm.trim().length > 0;
  
  if (carriers.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        {hasSearchTerm ? (
          <>
            <p className="font-semibold text-destructive mb-2">Nenhuma transportadora encontrada</p>
            <p className="text-sm text-muted-foreground">
              Não foram encontradas transportadoras com o termo de busca: <strong>"{searchTerm}"</strong>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Nenhuma transportadora encontrada</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transportadora</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Atualizado em</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {carriers.map((carrier) => (
            <TableRow key={carrier.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{carrier.nome}</span>
                  {carrier.nome_fantasia && (
                    <span className="text-sm text-muted-foreground">{carrier.nome_fantasia}</span>
                  )}
                  {carrier.email && (
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{carrier.email}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{carrier.cnpj || '--'}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm">
                    {carrier.cidade || '--'}
                    {carrier.estado && `/${carrier.estado}`}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{carrier.contato || '--'}</span>
              </TableCell>
              <TableCell>
                {onStatusChange ? (
                  <Select
                    value={carrier.ativo ? 'ATIVO' : 'INATIVO'}
                    onValueChange={(value) => {
                      if (value !== (carrier.ativo ? 'ATIVO' : 'INATIVO')) {
                        onStatusChange(carrier.id, value === 'ATIVO');
                      }
                    }}
                    disabled={updatingStatusId === carrier.id}
                  >
                    <SelectTrigger
                      className={`h-7 w-[140px] text-xs font-medium rounded-full border-0 shadow-none hover:opacity-80 transition-opacity ${
                        carrier.ativo
                          ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                      }`}
                    >
                      <SelectValue>
                        {updatingStatusId === carrier.id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Atualizando...</span>
                          </div>
                        ) : (
                          carrier.ativo ? 'Ativo' : 'Inativo'
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATIVO">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Ativo
                        </div>
                      </SelectItem>
                      <SelectItem value="INATIVO">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                          Inativo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge ativo={carrier.ativo} />
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {carrier.updated_at
                    ? format(new Date(carrier.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '--'}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => onView(carrier)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onViewOrders(carrier)}>
                      <Package className="w-4 h-4 mr-2" />
                      Ver Pedidos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(carrier)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(carrier)}>
                      <Power className="w-4 h-4 mr-2" />
                      {carrier.ativo ? 'Desativar' : 'Ativar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(carrier)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


