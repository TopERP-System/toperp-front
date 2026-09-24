import { Button } from '@/components/ui/button';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  contaEhPrevisao,
  contaTemSaldoAberto,
  saldoAbertoConta,
} from '@/lib/contas-financeiras-listagem';
import { formatCurrency, parseDateOnlyLocal } from '@/lib/utils';
import { Cliente, clientesService } from '@/services/clientes.service';
import type { ClienteComPedidos } from '@/services/contas-receber.service';
import { financeiroService, type ContaFinanceira } from '@/services/financeiro.service';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, FileText, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ContasAReceberListaClientesProps {
  /** Contas a receber da tela (mesma base da visão "por pedidos" e dos cards). */
  contas: ContaFinanceira[];
  isLoading?: boolean;
  filtroStatus?: string;
  /** Total da lista (igual ao card, pois a base é a mesma). */
  onTotalAReceber?: (total: number, count: number) => void;
}

const ContasAReceberListaClientes = ({
  contas,
  isLoading = false,
  filtroStatus = 'todos',
  onTotalAReceber,
}: ContasAReceberListaClientesProps) => {
  const navigate = useNavigate();
  const [filtroCliente, setFiltroCliente] = useState<string>('todos');
  const [status, setStatus] = useState<string>(filtroStatus);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: clientesData } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const r = await clientesService.listar({
        limit: 500,
        statusCliente: 'ATIVO',
      });
      return Array.isArray(r) ? r : r?.data || [];
    },
  });

  const clientes: Cliente[] = useMemo(
    () => (Array.isArray(clientesData) ? clientesData : clientesData?.data || []),
    [clientesData],
  );

  const nomeCliente = useCallback(
    (cid: number, conta: ContaFinanceira): string => {
      if (!cid) return 'Sem cliente vinculado';
      const c = clientes.find((x) => x.id === cid);
      return (
        c?.nome_fantasia ||
        c?.nome_razao ||
        c?.nome ||
        (conta as { cliente?: { nome?: string } }).cliente?.nome ||
        `Cliente #${cid}`
      );
    },
    [clientes],
  );

  // Mesma base da visão "por pedidos" (e do card Total a Receber): as contas
  // financeiras a receber já carregadas pela tela, agrupadas por cliente.
  const clientesComPedidos = useMemo((): ClienteComPedidos[] => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const map = new Map<number, ClienteComPedidos & { temConta: boolean; vencMaisAntigo?: number }>();

    for (const conta of contas) {
      if (String(conta.status ?? '').toUpperCase() === 'CANCELADO') continue;
      if (contaEhPrevisao(conta)) continue;
      const cidRaw = Number(conta.cliente_id ?? (conta as { cliente?: { id?: number } }).cliente?.id ?? 0);
      const cid = Number.isFinite(cidRaw) && cidRaw > 0 ? cidRaw : 0;
      const row =
        map.get(cid) ??
        {
          cliente_id: cid,
          cliente_nome: nomeCliente(cid, conta),
          total_aberto: 0,
          parcelas_aberto: 0,
          maior_atraso_dias: 0,
          temConta: true,
        };
      map.set(cid, row);

      if (!contaTemSaldoAberto(conta)) continue;
      const saldo = saldoAbertoConta(conta);
      if (saldo <= 0.009) continue;
      row.total_aberto += saldo;
      row.parcelas_aberto += 1;

      const venc = parseDateOnlyLocal(conta.data_vencimento);
      if (venc) {
        venc.setHours(0, 0, 0, 0);
        const dias = Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000);
        if (dias > row.maior_atraso_dias) row.maior_atraso_dias = dias;
        // Ações da linha abrem o pedido em aberto de vencimento mais antigo.
        if (conta.pedido_id && (row.vencMaisAntigo == null || venc.getTime() < row.vencMaisAntigo)) {
          row.vencMaisAntigo = venc.getTime();
          row.primeiro_pedido_id = Number(conta.pedido_id);
        }
      } else if (conta.pedido_id && row.primeiro_pedido_id == null) {
        row.primeiro_pedido_id = Number(conta.pedido_id);
      }
    }

    let result: ClienteComPedidos[] = Array.from(map.values()).map(
      ({ temConta: _t, vencMaisAntigo: _v, ...r }) => ({
        ...r,
        total_aberto: Math.round(r.total_aberto * 100) / 100,
      }),
    );
    if (status === 'aberto') result = result.filter((c) => c.total_aberto > 0.009);
    if (status === 'concluido') result = result.filter((c) => c.total_aberto <= 0.009);
    return result.sort((x, y) => y.total_aberto - x.total_aberto);
  }, [contas, status, nomeCliente]);

  const totalAReceberLista = useMemo(
    () => clientesComPedidos.reduce((s, c) => s + (c.total_aberto ?? 0), 0),
    [clientesComPedidos],
  );

  useEffect(() => {
    onTotalAReceber?.(totalAReceberLista, clientesComPedidos.length);
  }, [onTotalAReceber, totalAReceberLista, clientesComPedidos.length]);

  const isLoadingList = isLoading;

  const filtrados = useMemo(() => {
    let list = clientesComPedidos;
    if (filtroCliente !== 'todos') {
      list = list.filter((c) => c.cliente_id.toString() === filtroCliente);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) =>
        c.cliente_nome?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [clientesComPedidos, filtroCliente, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="sm:w-[180px]">
            <Label className="text-xs text-muted-foreground block mb-1.5">
              Cliente
            </Label>
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.nome_fantasia || c.nome_razao || c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:w-[180px]">
            <Label className="text-xs text-muted-foreground block mb-1.5">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Em aberto</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground block mb-1.5">
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou documento"
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" size="icon" className="shrink-0" title="Buscar Cliente">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto bg-card shadow-sm">
        <p className="text-xs text-muted-foreground px-4 py-2 border-b bg-muted/30">
          {status === 'aberto'
            ? 'Totais por cliente (contas a receber em aberto — mesma base do card Total a Receber).'
            : status === 'concluido'
              ? 'Clientes sem saldo em aberto.'
              : 'Totais por cliente (contas a receber — mesma base do card Total a Receber).'}
        </p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[140px] text-right">Total em Aberto</TableHead>
              <TableHead className="w-[140px] text-center">Parcelas em Aberto</TableHead>
              <TableHead className="w-[120px] text-center">Maior Atraso</TableHead>
              <TableHead className="w-[70px] text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingList ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-2 font-medium">
                    {status === 'aberto'
                      ? 'Nenhum cliente com contas em aberto'
                      : status === 'concluido'
                        ? 'Nenhum cliente com contas quitadas'
                        : 'Nenhum cliente com contas a receber'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((row) => (
                <TableRow key={row.cliente_id || 'sem-cliente'}>
                  <TableCell className="font-medium">{row.cliente_nome}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.total_aberto)}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.parcelas_aberto}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.maior_atraso_dias > 0
                      ? `${row.maior_atraso_dias} dias`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <TableRowActionsMenu>
                        {row.primeiro_pedido_id && row.total_aberto > 0 && (
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/financeiro/contas-receber/${row.primeiro_pedido_id}/pagamentos`)
                            }
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Registrar Pagamento
                          </DropdownMenuItem>
                        )}
                        {(row.primeiro_pedido_id || row.cliente_id > 0) && (
                          <DropdownMenuItem
                            onClick={() =>
                              row.primeiro_pedido_id
                                ? navigate(`/financeiro/contas-receber/${row.primeiro_pedido_id}`)
                                : navigate(`/contas-a-receber/clientes/${row.cliente_id}`)
                            }
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                        )}
                        {row.primeiro_pedido_id && (
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const contaId = await financeiroService.getContaIdPorPedidoId(row.primeiro_pedido_id!, 'RECEBER');
                                if (contaId == null) {
                                  toast.error('Conta financeira não encontrada para este pedido.');
                                  return;
                                }
                                await financeiroService.downloadReciboPagamento(contaId);
                                toast.success('Recibo de pagamento baixado.');
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : 'Erro ao gerar recibo.');
                              }
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Recibo de pagamento
                          </DropdownMenuItem>
                        )}
                    </TableRowActionsMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ContasAReceberListaClientes;
