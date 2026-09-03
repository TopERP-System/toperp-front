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
import { formatCurrency, parseDateOnlyLocal } from '@/lib/utils';
import { Cliente, clientesService } from '@/services/clientes.service';
import type { ClienteComPedidos } from '@/services/contas-receber.service';
import { financeiroService } from '@/services/financeiro.service';
import { pedidosService } from '@/services/pedidos.service';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, FileText, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ContasAReceberListaClientesProps {
  filtroStatus?: string;
  /** Guia: card Total a Receber preferir soma da lista para bater com a tabela. */
  onTotalAReceber?: (total: number, count: number) => void;
}

const ContasAReceberListaClientes = ({
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

  const clientes: Cliente[] = Array.isArray(clientesData)
    ? clientesData
    : clientesData?.data || [];

  // Usar endpoint /pedidos/contas-receber (sem duplicatas)
  // todos = todos os status; aberto = só em aberto; concluido = só quitados
  const { data: pedidosContasReceber, isLoading: isLoadingPedidos } = useQuery({
    queryKey: ['pedidos', 'contas-receber', status],
    queryFn: () => {
      if (status === 'aberto') return pedidosService.listarContasReceber({ situacao: 'em_aberto' });
      if (status === 'concluido') return pedidosService.listarContasReceber({ situacao: 'concluido' });
      return pedidosService.listarContasReceber({ situacao: 'todos' });
    },
    enabled: true,
  });

  // Fallback: usar contas financeiras (RECEBER) quando pedidos retornam vazio
  const { data: contasReceberData, isLoading: isLoadingContasReceber } = useQuery({
    queryKey: ['contas-financeiras', 'receber', 'lista-clientes', status],
    queryFn: async () => {
      const res = await financeiroService.listar({
        tipo: 'RECEBER',
        limit: 500,
        page: 1,
      });
      // Normalizar: API pode retornar { data }, { contas }, { itens } ou array direto
      const data = Array.isArray(res)
        ? res
        : (res as any)?.data ?? (res as any)?.contas ?? (res as any)?.itens ?? [];
      return Array.isArray(data) ? data : [];
    },
    enabled: status === 'aberto' || status === 'todos',
    retry: 1,
  });

  const pedidos = pedidosContasReceber ?? [];
  const contasReceber = contasReceberData ?? [];

  // Fallback extra: contas agrupadas (quando pedidos e listar contas retornam vazio)
  const { data: agrupadoData, isLoading: isLoadingAgrupado } = useQuery({
    queryKey: ['contas-financeiras', 'agrupado', 'receber', status],
    queryFn: () =>
      financeiroService.listarAgrupado({
        tipo: 'RECEBER',
        limit: 500,
      }),
    enabled:
      (status === 'aberto' || status === 'todos') &&
      pedidos.length === 0 &&
      contasReceber.length === 0,
    retry: 1,
  });

  const itensAgrupado = agrupadoData?.itens ?? [];

  const clientesComPedidos = useMemo((): ClienteComPedidos[] => {
    const map = new Map<number, ClienteComPedidos>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const soEmAberto = status === 'aberto';
    const soConcluido = status === 'concluido';

    // Agrupar pedidos por cliente (novo formato)
    pedidos.forEach((pedido) => {
      if (pedido.status === 'CANCELADO') return;
      if (soEmAberto && (pedido.status === 'QUITADO' || (pedido.valor_em_aberto ?? 0) <= 0)) return;
      if (soConcluido && pedido.status !== 'QUITADO') return;

      const valorAberto = pedido.valor_em_aberto ?? 0;
      if (soEmAberto && valorAberto <= 0) return;
      
      // Calcular maior atraso baseado na data do pedido (aproximação)
      // Nota: Para cálculo preciso de atraso, seria necessário buscar as parcelas do pedido
      let maiorAtraso = 0;
      try {
        const dataPedido = new Date(pedido.data_pedido);
        dataPedido.setHours(0, 0, 0, 0);
        const dias = Math.floor(
          (hoje.getTime() - dataPedido.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dias > 0) maiorAtraso = dias;
      } catch {}

      const existing = map.get(pedido.cliente_id);
      if (existing) {
        existing.total_aberto += valorAberto;
        existing.parcelas_aberto += 1; // Cada pedido conta como 1 "parcela" para agrupamento
        if (maiorAtraso > existing.maior_atraso_dias)
          existing.maior_atraso_dias = maiorAtraso;
      } else {
        map.set(pedido.cliente_id, {
          cliente_id: pedido.cliente_id,
          cliente_nome: pedido.cliente_nome || '—',
          total_aberto: valorAberto,
          parcelas_aberto: 1,
          maior_atraso_dias: maiorAtraso,
          primeiro_pedido_id: (pedido as any).pedido_id,
        });
      }
    });

    let result = Array.from(map.values());
    if (soEmAberto) result = result.filter((c) => c.total_aberto > 0);
    if (result.length > 0) return result;

    // Fallback: listar por contas financeiras (RECEBER) quando duplicatas/API de clientes retornam vazio
    const emAberto = (c: { status?: string; valor_restante?: number; valor_em_aberto?: number }) =>
      c.status !== 'PAGO_TOTAL' && c.status !== 'CANCELADO' &&
      ((c.valor_restante ?? (c as any).valor_em_aberto ?? 0) > 0);
    const cid = (c: { cliente_id?: number; clienteId?: number }) => c.cliente_id ?? (c as any).clienteId;
    contasReceber.filter((c) => cid(c) && emAberto(c)).forEach((conta) => {
      const cidNum = cid(conta)!;
      const cliente = clientes.find((c) => c.id === cidNum);
      const valorAberto = conta.valor_restante ?? (conta as any).valor_em_aberto ?? 0;
      let maiorAtraso = 0;
      try {
        const venc = parseDateOnlyLocal(conta.data_vencimento);
        if (venc) {
          venc.setHours(0, 0, 0, 0);
          const dias = Math.floor(
            (hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (dias > 0 && dias > maiorAtraso) maiorAtraso = dias;
        }
      } catch {
        /* ignora data inválida */
      }
      const existing = map.get(cidNum);
      if (existing) {
        existing.total_aberto += valorAberto;
        existing.parcelas_aberto += 1;
        if (maiorAtraso > existing.maior_atraso_dias)
          existing.maior_atraso_dias = maiorAtraso;
      } else {
        map.set(cidNum, {
          cliente_id: cidNum,
          cliente_nome:
            cliente?.nome_fantasia ||
            cliente?.nome_razao ||
            (cliente as any)?.nome ||
            '—',
          total_aberto: valorAberto,
          parcelas_aberto: 1,
          maior_atraso_dias: maiorAtraso,
          primeiro_pedido_id: (conta as any).pedido_id,
        });
      }
    });
    result = Array.from(map.values());
    if (soEmAberto) result = result.filter((c) => c.total_aberto > 0);
    if (result.length > 0) return result;

    // Fallback final: contas agrupadas (GET /contas-financeiras/agrupado) – agrupar por cliente_nome
    const statusAberto = (s: string) =>
      s !== 'PAGO_TOTAL' && s !== 'CANCELADO' && s !== 'Pago total' && s !== 'Cancelado';
    const mapAgrupado = new Map<number | string, ClienteComPedidos>();
    itensAgrupado.forEach((item) => {
      if (!statusAberto(item.status || '')) return;
      const valor = item.valor_total ?? 0;
      if (valor <= 0) return;
      const nome = item.cliente_nome || '—';
      const cliente = clientes.find(
        (c) =>
          (c.nome_fantasia || c.nome_razao || (c as any).nome || '')
            .toLowerCase()
            .trim() === nome.toLowerCase().trim()
      );
      const key = cliente?.id ?? nome;
      const existing = mapAgrupado.get(key);
      if (existing) {
        existing.total_aberto += valor;
        existing.parcelas_aberto += 1;
      } else {
        mapAgrupado.set(key, {
          cliente_id: cliente?.id ?? 0,
          cliente_nome: nome,
          total_aberto: valor,
          parcelas_aberto: 1,
          maior_atraso_dias: 0,
          primeiro_pedido_id: (item as any).pedido_id ?? undefined,
        });
      }
    });
    result = Array.from(mapAgrupado.values()).filter(
      (c) => c.total_aberto > 0 && c.cliente_nome !== '—'
    );
    return result;
  }, [pedidos, clientes, contasReceber, itensAgrupado, status]);

  const totalAReceberLista = useMemo(
    () => clientesComPedidos.reduce((s, c) => s + (c.total_aberto ?? 0), 0),
    [clientesComPedidos]
  );

  useEffect(() => {
    onTotalAReceber?.(totalAReceberLista, clientesComPedidos.length);
  }, [onTotalAReceber, totalAReceberLista, clientesComPedidos.length]);

  const emptyPedidos = pedidos.length === 0;
  const usaFallback = status === 'aberto' || status === 'todos';
  const esperandoFallbackAgrupado =
    emptyPedidos && contasReceber.length === 0 && usaFallback;
  const isLoadingList =
    isLoadingPedidos ||
    (emptyPedidos && usaFallback && isLoadingContasReceber) ||
    (esperandoFallbackAgrupado && isLoadingAgrupado);

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
            ? 'Totais por cliente (pedidos em aberto).'
            : status === 'concluido'
              ? 'Totais por cliente (pedidos quitados).'
              : 'Totais por cliente (todos os pedidos).'}
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
                      ? 'Nenhum cliente com pedidos em aberto'
                      : status === 'concluido'
                        ? 'Nenhum cliente com pedidos quitados'
                        : 'Nenhum cliente com pedidos'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((row) => (
                <TableRow key={row.cliente_id}>
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
