import AppLayout from '@/components/layout/AppLayout';
import { ModulePageHeader } from '@/components/layout/ModulePageHeader';
import { EmitirNotaFiscalDialog } from '@/components/orders/EmitirNotaFiscalDialog';
import { OrderList } from '@/components/orders/OrderList';
import { OrderStats, type PedidoCardFilterKey } from '@/components/orders/OrderStats';
import { OrderViewDialog } from '@/components/orders/OrderViewDialog';
import {
  RelatorioAcoesFooter,
  RelatorioHubCard,
  RelatorioModalShell,
  RelatorioPedidoCamposSection,
  type RelatorioPedidoCampos,
} from '@/components/orders/RelatorioModalParts';
import { RelatorioPeriodoFinanceiro } from '@/components/reports/RelatorioPeriodoFinanceiro';
import { RelatorioMargemContribuicaoDialog } from '@/components/reports/RelatorioMargemContribuicaoDialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useOrders } from '@/hooks/useOrders';
import { useRelatorioPedidos } from '@/hooks/useRelatorioPedidos';
import { useRotuloRoca } from '@/hooks/useRotuloRoca';
import { formatCurrency, normalizeCurrency } from '@/lib/utils';
import { controleRocaService } from '@/services/controle-roca.service';
import { pedidosService } from '@/services/pedidos.service';
import { FiltrosPedidos, Pedido, StatusPedido, TipoPedido } from '@/types/pedido';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Download,
  FileText,
  Filter,
  Loader2,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Pedidos() {
  const rotulo = useRotuloRoca();
  const navigate = useNavigate();
  const {
    orders,
    totalOrders,
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    filters,
    isLoading,
    isViewDialogOpen,
    isCancelDialogOpen,
    isDeleteDialogOpen,
    selectedOrder,
    orderToCancel,
    orderToDelete,
    clientes,
    fornecedores,
    produtos,
    transportadoras,
    isCanceling,
    isDeleting,
    updatingStatusId,
    handleStatusChange,
    setCurrentPage,
    updateFilters,
    clearFilters,
    openViewDialog,
    openCancelDialog,
    openDeleteDialog,
    cancelOrder,
    deleteOrder,
    closeViewDialog,
    closeCancelDialog,
    closeDeleteDialog,
  } = useOrders();

  const { downloadRelatorio, loading: loadingRelatorio } = useRelatorioPedidos();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);
  const [margemDialogOpen, setMargemDialogOpen] = useState(false);
  const [reportingOrderId, setReportingOrderId] = useState<number | null>(null);
  const [relatorioPedidosDialogOpen, setRelatorioPedidosDialogOpen] = useState(false);
  const [dataInicialRelPed, setDataInicialRelPed] = useState('');
  const [dataFinalRelPed, setDataFinalRelPed] = useState('');
  const [clienteRelPed, setClienteRelPed] = useState<string>('all');
  const [fornecedorRelPed, setFornecedorRelPed] = useState<string>('all');
  const [rocaRelPed, setRocaRelPed] = useState<string>('all');
  const [relPedLoadingAction, setRelPedLoadingAction] = useState<'download' | 'print' | null>(null);
  const [camposRelPed, setCamposRelPed] = useState<RelatorioPedidoCampos>('completo');
  const [relatorioIndividualDialogOpen, setRelatorioIndividualDialogOpen] = useState(false);
  const [relatorioIndividualOrder, setRelatorioIndividualOrder] = useState<Pedido | null>(null);
  const [camposRelIndividual, setCamposRelIndividual] = useState<RelatorioPedidoCampos>('completo');
  const [relIndividualLoadingAction, setRelIndividualLoadingAction] = useState<'download' | 'print' | null>(null);
  const [relatoriosDialogOpen, setRelatoriosDialogOpen] = useState(false);
  const [notaFiscalDialogOpen, setNotaFiscalDialogOpen] = useState(false);
  const [notaFiscalOrder, setNotaFiscalOrder] = useState<Pedido | null>(null);
  const [periodoRapidoLista, setPeriodoRapidoLista] = useState<
    'all' | 'hoje' | '7d' | 'mes_atual' | 'custom'
  >('all');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromFiltersRef = useRef(false);

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const hoje = toYMD(new Date());
  const ontem = toYMD((() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })());
  const ultimos7 = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return toYMD(d); })();
  const mesAtualInicio = (() => { const d = new Date(); d.setDate(1); return toYMD(d); })();
  const mesAnteriorInicio = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return toYMD(d); })();
  const mesAnteriorFim = (() => { const d = new Date(); d.setDate(0); return toYMD(d); })();

  const montarFiltrosRelatorioPedidos = () => ({
    data_inicial: dataInicialRelPed?.trim() || undefined,
    data_final: dataFinalRelPed?.trim() || undefined,
    cliente_id:
      clienteRelPed !== 'all' ? Number(clienteRelPed) : undefined,
    fornecedor_id:
      fornecedorRelPed !== 'all' ? Number(fornecedorRelPed) : undefined,
    roca_id: rocaRelPed !== 'all' ? Number(rocaRelPed) : undefined,
    campos: camposRelPed,
  });

  const abrirDialogRelatorioPedidos = () => {
    if (clienteRelPed === 'all' && filters.cliente_id) {
      setClienteRelPed(String(filters.cliente_id));
    }
    if (fornecedorRelPed === 'all' && filters.fornecedor_id) {
      setFornecedorRelPed(String(filters.fornecedor_id));
    }
    if (rocaRelPed === 'all' && filters.roca_id) {
      setRocaRelPed(String(filters.roca_id));
    }
    // Com filtro de roça na listagem: relatório sem período para incluir todos os pedidos da roça
    if (filters.roca_id) {
      setDataInicialRelPed('');
      setDataFinalRelPed('');
    } else if (!dataInicialRelPed && !dataFinalRelPed) {
      if (filters.data_inicial || filters.data_final) {
        setDataInicialRelPed(filters.data_inicial ?? '');
        setDataFinalRelPed(filters.data_final ?? '');
      }
    }
    setRelatorioPedidosDialogOpen(true);
  };

  const abrirDialogRelatorioIndividual = (order: Pedido) => {
    setRelatorioIndividualOrder(order);
    setCamposRelIndividual('completo');
    setRelatorioIndividualDialogOpen(true);
  };

  const handleDownloadRelatorioPedido = async (
    order: Pedido,
    campos: RelatorioPedidoCampos = camposRelIndividual,
  ) => {
    setReportingOrderId(order.id);
    try {
      await pedidosService.downloadRelatorioPedidoPdf(
        order.id,
        order.numero_pedido,
        campos,
      );
      toast.success(`Relatório do pedido ${order.numero_pedido} baixado.`);
      setRelatorioIndividualDialogOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao gerar relatório do pedido';
      toast.error(message);
    } finally {
      setReportingOrderId(null);
    }
  };

  const handlePrintRelatorioPedido = async (
    order: Pedido,
    campos: RelatorioPedidoCampos = camposRelIndividual,
  ) => {
    setReportingOrderId(order.id);
    try {
      await pedidosService.printRelatorioPedidoPdf(order.id, campos);
      toast.success(`Relatório do pedido ${order.numero_pedido} aberto para impressão.`);
      setRelatorioIndividualDialogOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao abrir relatório do pedido';
      toast.error(message);
    } finally {
      setReportingOrderId(null);
    }
  };

  const { data: rocasFiltro = [] } = useQuery({
    queryKey: ['pedidos', 'rocas-filtro'],
    queryFn: () => controleRocaService.listarRocas(undefined, false, { limit: 500 }),
  });

  const temFiltrosAtivos = !!(
    filters.data_inicial ||
    filters.data_final ||
    filters.tipo ||
    filters.status ||
    filters.roca_id ||
    filters.somente_com_roca ||
    filters.cliente_id ||
    filters.fornecedor_id
  );

  const qtdFiltrosAtivos = [
    filters.status,
    filters.cliente_id,
    filters.fornecedor_id,
    filters.data_inicial,
    filters.data_final,
    filters.roca_id,
    filters.somente_com_roca,
  ].filter(Boolean).length;

  const labelStatusFiltro = (s?: StatusPedido) => {
    if (!s) return null;
    const map: Record<StatusPedido, string> = {
      ABERTO: 'Aberto',
      ATENDIDO: 'Atendido',
      CANCELADO: 'Cancelado',
      PARCIAL: 'Atendido',
      QUITADO: 'Atendido',
    };
    return map[s];
  };

  const labelClienteFiltro = () => {
    if (!filters.cliente_id) return null;
    return (
      clientes.find((c) => c.id === filters.cliente_id)?.nome ??
      `Cliente #${filters.cliente_id}`
    );
  };

  const labelFornecedorFiltro = () => {
    if (!filters.fornecedor_id) return null;
    const f = fornecedores.find((x) => x.id === filters.fornecedor_id);
    return f?.nome_fantasia || f?.nome_razao || `Fornecedor #${filters.fornecedor_id}`;
  };

  const labelRocaFiltro = () => {
    if (filters.roca_id == null || filters.roca_id <= 0) return null;
    return rocasFiltro.find((r) => r.id === filters.roca_id)?.nome ?? rotulo.comId(filters.roca_id);
  };

  const labelPeriodoFiltro = () => {
    if (periodoRapidoLista === 'all' && !filters.data_inicial && !filters.data_final) {
      return null;
    }
    if (periodoRapidoLista === 'hoje') return 'Hoje';
    if (periodoRapidoLista === '7d') return 'Últimos 7 dias';
    if (periodoRapidoLista === 'mes_atual') return 'Mês atual';
    if (filters.data_inicial && filters.data_final) {
      const fmt = (d: string) => {
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
      };
      return `${fmt(filters.data_inicial)} – ${fmt(filters.data_final)}`;
    }
    return 'Período personalizado';
  };
  const handleAplicarFiltros = () => setFiltrosDialogOpen(false);
  const handleLimparFiltros = () => {
    updateFilters({
      data_inicial: undefined,
      data_final: undefined,
      tipo: undefined,
      status: undefined,
      roca_id: undefined,
      somente_com_roca: undefined,
      cliente_id: undefined,
      fornecedor_id: undefined,
      busca: undefined,
      numero_pedido: undefined,
      cliente_nome: undefined,
    });
    setSearchTerm('');
    setPeriodoRapidoLista('all');
    setFiltrosDialogOpen(false);
  };

  const aplicarPeriodoLista = (
    tipo: 'all' | 'hoje' | '7d' | 'mes_atual' | 'custom',
  ) => {
    setPeriodoRapidoLista(tipo);
    if (tipo === 'all') {
      updateFilters({ data_inicial: undefined, data_final: undefined });
      return;
    }
    if (tipo === 'hoje') {
      updateFilters({ data_inicial: hoje, data_final: hoje });
      return;
    }
    if (tipo === '7d') {
      updateFilters({ data_inicial: ultimos7, data_final: hoje });
      return;
    }
    if (tipo === 'mes_atual') {
      updateFilters({ data_inicial: mesAtualInicio, data_final: hoje });
    }
  };

  const tabTipo =
    filters.tipo === 'VENDA'
      ? 'venda'
      : filters.tipo === 'COMPRA'
        ? 'compra'
        : 'todos';

  const handleTabTipo = (tab: string) => {
    if (tab === 'todos') updateFilters({ tipo: undefined });
    else if (tab === 'venda') updateFilters({ tipo: 'VENDA' as TipoPedido });
    else updateFilters({ tipo: 'COMPRA' as TipoPedido });
  };

  const activePedidoCard = filters.card_filtro ?? null;

  const handlePedidoCardClick = (key: PedidoCardFilterKey) => {
    const desativar = filters.card_filtro === key;
    if (desativar) {
      updateFilters({ card_filtro: undefined, status: undefined });
      return;
    }

    const base: Partial<FiltrosPedidos> = { card_filtro: key };
    switch (key) {
      case 'faturamento_venda':
        // Status filtrado no cliente (ATENDIDO + legado QUITADO/PARCIAL)
        updateFilters({ ...base, tipo: 'VENDA', status: undefined });
        break;
      case 'aberto_venda':
        updateFilters({ ...base, tipo: 'VENDA', status: 'ABERTO' });
        break;
      case 'compras_confirmadas':
        updateFilters({ ...base, tipo: 'COMPRA', status: undefined });
        break;
      case 'compras_em_aberto':
        updateFilters({ ...base, tipo: 'COMPRA', status: 'ABERTO' });
        break;
      case 'em_andamento':
        updateFilters({ ...base, status: 'ABERTO' });
        break;
      case 'cancelados':
        // Mantém o tipo da aba atual (Vendas/Compras); em Todos lista os dois
        updateFilters({ ...base, status: 'CANCELADO' });
        break;
    }
  };

  const inicioItem = totalOrders === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const fimItem = Math.min(currentPage * itemsPerPage, totalOrders);
  const exibirPaginacao =
    totalOrders > 0 && !filters.busca && !filters.numero_pedido;

  // Sincronizar searchTerm com os filtros quando os filtros mudarem externamente
  useEffect(() => {
    if (isUpdatingFromFiltersRef.current) return;
    const valor = filters.busca ?? filters.numero_pedido ?? filters.cliente_nome ?? '';
    if (valor && searchTerm !== valor) setSearchTerm(valor);
    else if (!valor && searchTerm) setSearchTerm('');
  }, [filters.busca, filters.numero_pedido, filters.cliente_nome]);

  // Limpar timeout quando o componente desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      isUpdatingFromFiltersRef.current = true;
      if (value.trim()) {
        updateFilters({
          busca: value.trim(),
          numero_pedido: undefined,
          cliente_nome: undefined,
        });
      } else {
        updateFilters({ busca: undefined, numero_pedido: undefined, cliente_nome: undefined });
      }
      setTimeout(() => { isUpdatingFromFiltersRef.current = false; }, 100);
    }, 300);
  };

  const handleCancelConfirm = () => {
    if (orderToCancel) {
      cancelOrder(orderToCancel);
    }
  };

  const handleDeleteConfirm = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
    }
  };

  const handleOpenNotaFiscal = (order: Pedido) => {
    setNotaFiscalOrder(order);
    setNotaFiscalDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="w-full min-w-0 p-3 sm:p-4 md:p-6 pb-8 gap-3 sm:gap-4 md:gap-5 flex flex-col">
        <ModulePageHeader
          icon={ShoppingCart}
          title="Pedidos"
          subtitle="Gestão completa de vendas e compras, com visão financeira e operacional."
          actions={
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                className="gap-2 bg-background shadow-sm flex-1 sm:flex-none"
                onClick={() => setRelatoriosDialogOpen(true)}
              >
                <FileText className="w-4 h-4 shrink-0" />
                Relatórios
              </Button>
              <Button
                onClick={() => navigate('/pedidos/novo')}
                variant="gradient"
                className="gap-2 shadow-sm flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">Novo Pedido</span>
              </Button>
            </div>
          }
        />

        <div className="shrink-0 mb-4">
          <Tabs value={tabTipo} onValueChange={handleTabTipo}>
            <TabsList className="bg-muted/60 h-9 w-full sm:w-auto inline-flex">
              <TabsTrigger value="todos" className="text-xs sm:text-sm px-3 sm:px-4 flex-1 sm:flex-none">
                Todos
              </TabsTrigger>
              <TabsTrigger value="venda" className="text-xs sm:text-sm px-3 sm:px-4 flex-1 sm:flex-none">
                Vendas
              </TabsTrigger>
              <TabsTrigger value="compra" className="text-xs sm:text-sm px-3 sm:px-4 flex-1 sm:flex-none">
                Compras
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="shrink-0">
          <OrderStats
            variant="hero"
            tipoFiltro={filters.tipo ?? 'all'}
            activeCardFilter={activePedidoCard}
            onCardClick={handlePedidoCardClick}
            filtrosListagem={(() => {
              const { card_filtro: _card, ...rest } = filters;
              return rest;
            })()}
            temFiltrosListagemAtivos={temFiltrosAtivos}
          />
        </div>

        {/* Barra de busca + filtros (uma linha) */}
        <div className="bg-card rounded-xl border border-border/80 shadow-sm shrink-0 overflow-hidden">
          <div className="flex items-stretch w-full min-h-[44px] sm:min-h-[48px]">
            <div className="relative flex-1 min-w-0 flex items-center">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder={`Buscar por número, cliente, fornecedor ou ${rotulo.singularLower}...`}
                className="h-11 sm:h-12 w-full rounded-none border-0 border-r-0 pl-10 sm:pl-11 pr-3 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="w-px bg-border shrink-0 self-stretch my-2" aria-hidden />
            <Button
              type="button"
              variant="ghost"
              className="h-11 sm:h-12 shrink-0 rounded-none px-3 sm:px-5 gap-2 text-foreground hover:bg-muted/80 font-medium"
              onClick={() => setFiltrosDialogOpen(true)}
            >
              <Filter className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className="hidden sm:inline">Filtros</span>
              {qtdFiltrosAtivos > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {qtdFiltrosAtivos}
                </span>
              )}
            </Button>
          </div>

          {(qtdFiltrosAtivos > 0 || searchTerm) && (
            <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-t border-border/60 bg-muted/20">
              {filters.status && labelStatusFiltro(filters.status) && (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  Status: {labelStatusFiltro(filters.status)}
                </span>
              )}
              {labelClienteFiltro() && (
                <span className="inline-flex items-center max-w-[200px] truncate rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  Cliente: {labelClienteFiltro()}
                </span>
              )}
              {labelFornecedorFiltro() && (
                <span className="inline-flex items-center max-w-[200px] truncate rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  Fornecedor: {labelFornecedorFiltro()}
                </span>
              )}
              {labelPeriodoFiltro() && (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {labelPeriodoFiltro()}
                </span>
              )}
              {labelRocaFiltro() && (
                <span className="inline-flex items-center max-w-[200px] truncate rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {rotulo.singular}: {labelRocaFiltro()}
                </span>
              )}
              {filters.somente_com_roca && (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  Com {rotulo.singularLower}
                </span>
              )}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary ml-auto shrink-0"
                onClick={handleLimparFiltros}
                disabled={!temFiltrosAtivos && !searchTerm}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>

        {/* Sheet filtros avançados (roça, etc.) */}
        <Sheet open={filtrosDialogOpen} onOpenChange={setFiltrosDialogOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Filter className="w-5 h-5 text-primary" />
                </div>
                <SheetTitle className="text-xl">Filtros</SheetTitle>
              </div>
              <SheetDescription>
                Status, cliente, período, {rotulo.singularLower} e demais critérios da listagem.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) =>
                    updateFilters({
                      status: value === 'all' ? undefined : (value as StatusPedido),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ABERTO">Aberto</SelectItem>
                    <SelectItem value="ATENDIDO">Atendido</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Cliente</Label>
                <Select
                  value={filters.cliente_id ? String(filters.cliente_id) : 'all'}
                  onValueChange={(value) =>
                    updateFilters({
                      cliente_id: value === 'all' ? undefined : Number(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Fornecedor</Label>
                <Select
                  value={filters.fornecedor_id ? String(filters.fornecedor_id) : 'all'}
                  onValueChange={(value) =>
                    updateFilters({
                      fornecedor_id: value === 'all' ? undefined : Number(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os fornecedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nome_fantasia || f.nome_razao || `Fornecedor #${f.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">{rotulo.singular}</Label>
                <Select
                  value={
                    filters.roca_id != null && filters.roca_id > 0
                      ? String(filters.roca_id)
                      : 'all'
                  }
                  onValueChange={(value) =>
                    updateFilters({
                      roca_id: value === 'all' ? undefined : Number(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={rotulo.todas} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {rocasFiltro.map((roca) => (
                      <SelectItem key={roca.id} value={String(roca.id)}>
                        {roca.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={!!filters.somente_com_roca}
                    onChange={(e) =>
                      updateFilters({
                        somente_com_roca: e.target.checked || undefined,
                      })
                    }
                  />
                  Somente pedidos com {rotulo.singularLower} vinculada
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Período</Label>
                <Select
                  value={periodoRapidoLista}
                  onValueChange={(v) =>
                    aplicarPeriodoLista(v as typeof periodoRapidoLista)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer período</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="mes_atual">Mês atual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {periodoRapidoLista === 'custom' && (
                  <div className="flex flex-wrap items-end gap-2 pt-1">
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <span className="text-xs text-muted-foreground">De</span>
                      <Input
                        type="date"
                        value={filters.data_inicial || ''}
                        onChange={(e) =>
                          updateFilters({ data_inicial: e.target.value || undefined })
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <span className="text-xs text-muted-foreground">Até</span>
                      <Input
                        type="date"
                        value={filters.data_final || ''}
                        onChange={(e) =>
                          updateFilters({ data_final: e.target.value || undefined })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleAplicarFiltros} className="flex-1">
                  Aplicar
                </Button>
                <Button onClick={handleLimparFiltros} variant="outline" className="flex-1">
                  Limpar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Tabela — rola junto com a página (dashboard não fica fixo) */}
        <div className="bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <OrderList
              orders={orders}
              isLoading={isLoading}
              onView={openViewDialog}
              onEdit={(order) => navigate(`/pedidos/${order.id}/editar`)}
              onCancel={openCancelDialog}
              onDelete={openDeleteDialog}
              onReport={abrirDialogRelatorioIndividual}
              onEmitNotaFiscal={handleOpenNotaFiscal}
              reportingOrderId={reportingOrderId}
              onStatusChange={handleStatusChange}
              updatingStatusId={updatingStatusId}
            />
          </div>

          <div className="border-t border-border px-3 sm:px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
            <p className="text-sm text-muted-foreground shrink-0">
              {totalOrders === 0
                ? 'Nenhum pedido encontrado'
                : `Mostrando ${inicioItem} a ${fimItem} de ${totalOrders} pedidos`}
            </p>
            {exibirPaginacao && (
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Pagination className="mx-0 w-full sm:w-auto justify-center overflow-x-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={
                          currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) page = i + 1;
                      else if (currentPage <= 3) page = i + 1;
                      else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                      else page = currentPage - 2 + i;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer min-w-9"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={
                          currentPage === totalPages
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(v) => setItemsPerPage(Number(v))}
                >
                  <SelectTrigger className="h-9 w-[130px] bg-background shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 por página</SelectItem>
                    <SelectItem value="15">15 por página</SelectItem>
                    <SelectItem value="25">25 por página</SelectItem>
                    <SelectItem value="50">50 por página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Relatórios */}
        <Dialog open={relatoriosDialogOpen} onOpenChange={setRelatoriosDialogOpen}>
          <RelatorioModalShell
            icon={FileText}
            title="Relatórios"
            description="Escolha o tipo de relatório que deseja gerar."
            maxWidth="md"
          >
            <div className="grid gap-3">
              <RelatorioHubCard
                icon={Filter}
                title="Relatório de pedidos"
                description="PDF premium — um pedido por página, com itens e totais. Endereço e contato só para cliente ou fornecedor."
                onClick={() => {
                  setRelatoriosDialogOpen(false);
                  abrirDialogRelatorioPedidos();
                }}
              />
              <RelatorioHubCard
                icon={FileText}
                title="Margem de contribuição"
                description="Receita, custo e margem por produto no período."
                onClick={() => {
                  setRelatoriosDialogOpen(false);
                  setMargemDialogOpen(true);
                }}
              />
            </div>
          </RelatorioModalShell>
        </Dialog>

        <RelatorioMargemContribuicaoDialog
          open={margemDialogOpen}
          onOpenChange={setMargemDialogOpen}
          defaultDataInicial={filters.data_inicial}
          defaultDataFinal={filters.data_final}
        />

        <Dialog open={relatorioPedidosDialogOpen} onOpenChange={setRelatorioPedidosDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório de pedidos</DialogTitle>
              <DialogDescription>
                PDF consolidado — um pedido por página, com itens e totais conforme os filtros
                selecionados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="relatorio-pedidos-cliente">Cliente</Label>
                <Select value={clienteRelPed} onValueChange={setClienteRelPed}>
                  <SelectTrigger id="relatorio-pedidos-cliente">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relatorio-pedidos-fornecedor">Fornecedor</Label>
                <Select value={fornecedorRelPed} onValueChange={setFornecedorRelPed}>
                  <SelectTrigger id="relatorio-pedidos-fornecedor">
                    <SelectValue placeholder="Todos os fornecedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fornecedores</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nome_fantasia || f.nome_razao || `Fornecedor #${f.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relatorio-pedidos-roca">{rotulo.singular}</Label>
                <Select value={rocaRelPed} onValueChange={setRocaRelPed}>
                  <SelectTrigger id="relatorio-pedidos-roca">
                    <SelectValue placeholder={rotulo.todas} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{rotulo.todas}</SelectItem>
                    {rocasFiltro.map((roca) => (
                      <SelectItem key={roca.id} value={String(roca.id)}>
                        {roca.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
                <RelatorioPeriodoFinanceiro
                  dataInicial={dataInicialRelPed}
                  dataFinal={dataFinalRelPed}
                  onDataInicial={setDataInicialRelPed}
                  onDataFinal={setDataFinalRelPed}
                />

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">
                    Conteúdo do relatório
                  </Label>
                  <RadioGroup
                    value={camposRelPed}
                    onValueChange={(v) => setCamposRelPed(v as RelatorioPedidoCampos)}
                    className="space-y-2"
                  >
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem
                        value="completo"
                        id="relatorio-pedidos-campos-completo"
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="relatorio-pedidos-campos-completo"
                        className="cursor-pointer space-y-0.5 font-normal"
                      >
                        <span className="block text-sm font-medium text-[#1A3B70]">
                          Todos os campos
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Inclui endereço e contato do cliente ou fornecedor.
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem
                        value="principais"
                        id="relatorio-pedidos-campos-principais"
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="relatorio-pedidos-campos-principais"
                        className="cursor-pointer space-y-0.5 font-normal"
                      >
                        <span className="block text-sm font-medium text-[#1A3B70]">
                          Apenas campos principais
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Omite endereço e contato; mantém cliente, detalhes e itens.
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Button
                  type="button"
                  variant="relatorioPrimary"
                  className="flex-1 gap-2"
                  disabled={relPedLoadingAction !== null || loadingRelatorio}
                  onClick={async () => {
                    try {
                      setRelPedLoadingAction('download');
                      await downloadRelatorio(montarFiltrosRelatorioPedidos());
                    } finally {
                      setRelPedLoadingAction(null);
                    }
                  }}
                >
                  {relPedLoadingAction === 'download' || loadingRelatorio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Baixar PDF
                </Button>
                <Button
                  type="button"
                  variant="relatorioSecondary"
                  className="flex-1 gap-2"
                  disabled={relPedLoadingAction !== null || loadingRelatorio}
                  onClick={async () => {
                    try {
                      setRelPedLoadingAction('print');
                      await pedidosService.printRelatorioPDF(montarFiltrosRelatorioPedidos());
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : 'Erro ao abrir relatório.',
                      );
                    } finally {
                      setRelPedLoadingAction(null);
                    }
                  }}
                >
                  {relPedLoadingAction === 'print' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Abrir para imprimir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={relatorioIndividualDialogOpen}
          onOpenChange={(open) => {
            setRelatorioIndividualDialogOpen(open);
            if (!open) {
              setRelatorioIndividualOrder(null);
              setRelIndividualLoadingAction(null);
            }
          }}
        >
          <RelatorioModalShell
            icon={FileText}
            title={
              relatorioIndividualOrder
                ? `Relatório — ${relatorioIndividualOrder.numero_pedido}`
                : 'Relatório de pedido'
            }
            description="Escolha quais informações incluir no PDF."
            footer={
              relatorioIndividualOrder ? (
                <RelatorioAcoesFooter
                  downloading={relIndividualLoadingAction === 'download'}
                  printing={relIndividualLoadingAction === 'print'}
                  disabled={relIndividualLoadingAction !== null}
                  onDownload={async () => {
                    if (!relatorioIndividualOrder) return;
                    try {
                      setRelIndividualLoadingAction('download');
                      await handleDownloadRelatorioPedido(
                        relatorioIndividualOrder,
                        camposRelIndividual,
                      );
                    } finally {
                      setRelIndividualLoadingAction(null);
                    }
                  }}
                  onPrint={async () => {
                    if (!relatorioIndividualOrder) return;
                    try {
                      setRelIndividualLoadingAction('print');
                      await handlePrintRelatorioPedido(
                        relatorioIndividualOrder,
                        camposRelIndividual,
                      );
                    } finally {
                      setRelIndividualLoadingAction(null);
                    }
                  }}
                />
              ) : null
            }
          >
            <RelatorioPedidoCamposSection
              value={camposRelIndividual}
              onChange={setCamposRelIndividual}
            />
          </RelatorioModalShell>
        </Dialog>

        {/* Modal de Visualização */}
        <OrderViewDialog
          isOpen={isViewDialogOpen}
          onClose={closeViewDialog}
          order={selectedOrder}
          onDownloadReport={abrirDialogRelatorioIndividual}
          onPrintReport={abrirDialogRelatorioIndividual}
          reportingOrderId={reportingOrderId}
          onRequestCancel={(order) => {
            closeViewDialog();
            openCancelDialog(order);
          }}
        />

        <EmitirNotaFiscalDialog
          open={notaFiscalDialogOpen}
          onOpenChange={(open) => {
            setNotaFiscalDialogOpen(open);
            if (!open) setNotaFiscalOrder(null);
          }}
          order={notaFiscalOrder}
        />

        {/* Modal de Confirmação de Cancelamento */}
        <Dialog
          open={isCancelDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeCancelDialog();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-amber-600" />
                Confirmar cancelamento
              </DialogTitle>
              <DialogDescription>
                O pedido será marcado como cancelado e sairá das Contas a Receber / Pagar.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Deseja realmente cancelar este pedido? O registro permanece no histórico.
              </p>
              {orderToCancel && (
                <div className="mt-2 space-y-1">
                  <p className="font-medium">Pedido #{orderToCancel.numero_pedido}</p>
                  <p className="text-xs text-muted-foreground">
                    {orderToCancel.tipo === 'VENDA'
                      ? `Cliente: ${orderToCancel.cliente?.nome || 'N/A'}`
                      : `Fornecedor: ${orderToCancel.fornecedor?.nome_fantasia || orderToCancel.fornecedor?.nome_razao || 'N/A'}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valor: {formatCurrency(normalizeCurrency(orderToCancel.valor_total, true))}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={closeCancelDialog}
                className="flex-1"
                disabled={isCanceling}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={isCanceling}
                className="flex-1"
              >
                {isCanceling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar pedido
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeDeleteDialog();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Confirmar exclusão
              </DialogTitle>
              <DialogDescription>
                Esta ação remove o pedido permanentemente e não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Pedidos com pagamento ou NF-e emitida não podem ser excluídos — use Cancelar.
              </p>
              {orderToDelete && (
                <div className="mt-2 space-y-1">
                  <p className="font-medium">Pedido #{orderToDelete.numero_pedido}</p>
                  <p className="text-xs text-muted-foreground">
                    {orderToDelete.tipo === 'VENDA'
                      ? `Cliente: ${orderToDelete.cliente?.nome || 'N/A'}`
                      : `Fornecedor: ${orderToDelete.fornecedor?.nome_fantasia || orderToDelete.fornecedor?.nome_razao || 'N/A'}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valor: {formatCurrency(normalizeCurrency(orderToDelete.valor_total, true))}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={closeDeleteDialog}
                className="flex-1"
                disabled={isDeleting}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
