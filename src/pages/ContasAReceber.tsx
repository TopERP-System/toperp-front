import { EditarContaFinanceiraDialog } from "@/components/financeiro/EditarContaFinanceiraDialog";
import { RelatorioProdutosClienteDialog } from "@/components/reports/RelatorioProdutosClienteDialog";
import { RelatorioPeriodoFinanceiro } from "@/components/reports/RelatorioPeriodoFinanceiro";
import AppLayout from "@/components/layout/AppLayout";
import { TableRowActionsMenu } from "@/components/TableRowActionsMenu";
import { ModulePageHeader } from "@/components/layout/ModulePageHeader";
import {
  ModuleStatCards,
  type ModuleStatCardItem,
} from "@/components/layout/ModuleStatCards";
import { statTheme } from "@/components/layout/module-stat-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calcularResumoCardsReceber,
  contaEhPrevisao,
  contaEstaPaga,
  contaEstaVencidaLocal,
  contaTemSaldoAberto,
  contaVenceEsteMesLocal,
  contaVenceHojeLocal,
  listarContasTodasAsPaginas,
  saldoAbertoConta,
  toYMD,
  valorPagoConta,
  valorPrincipalConta,
} from "@/lib/contas-financeiras-listagem";
import { cn, formatDate, formatarDataBR, formatarFormaPagamento, formatarStatus, parseDateOnlyLocal } from "@/lib/utils";
import ContasAReceberListaClientes from "@/pages/contas-a-receber/ContasAReceberListaClientes";
import { Cliente, clientesService } from "@/services/clientes.service";
import { controleRocaService } from "@/services/controle-roca.service";
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import { ContaFinanceira, CreateContaFinanceiraDto, financeiroService } from "@/services/financeiro.service";
import { pedidosService } from "@/services/pedidos.service";
import type { Roca } from "@/types/roca";
import { relatoriosClienteService } from "@/services/relatorios-cliente.service";
import type { ContaReceber } from "@/types/contas-financeiras.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    BarChart3,
    Ban,
    Calendar,
    Circle,
    CreditCard,
    DollarSign,
    Download,
    Edit,
    Eye,
    FileText,
    Filter,
    History,
    Info,
    Loader2,
    Printer,
    RotateCcw,
    Search,
    ShoppingCart,
    Trash2,
    XCircle,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SESSION_KEY_CRECEBER = "creceber_filtros_v2";

function getSavedCReceberState<T>(key: string, defaultValue: T): T {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_CRECEBER);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed[key] !== undefined ? parsed[key] : defaultValue;
  } catch {
    return defaultValue;
  }
}

const ContasAReceber = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const rotulo = useRotuloRoca();
  const [viewMode, setViewMode] = useState<"clientes" | "pedidos">(() => getSavedCReceberState("viewMode", "pedidos"));
  /** Guia: card Total a Receber preferir soma da lista de clientes (bate com a tabela). */
  /** Filtro por card clicável: todos | valor_pago | vencidas | vencendo_hoje | vencendo_este_mes */
  const [activeCardFilter, setActiveCardFilter] = useState<
    "todos" | "a_receber" | "valor_pago" | "vencidas" | "vencendo_hoje" | "vencendo_este_mes"
  >(() => getSavedCReceberState("activeCardFilter", "todos"));
  const [searchTerm, setSearchTerm] = useState<string>(() => getSavedCReceberState("searchTerm", ""));
  /** Filtro por cliente: null = todos; number = ID do cliente */
  const [clienteFilterId, setClienteFilterId] = useState<number | null>(() => getSavedCReceberState("clienteFilterId", null));
  /** Filtro por roça: null = todas */
  const [rocaFilterId, setRocaFilterId] = useState<number | null>(() => getSavedCReceberState("rocaFilterId", null));
  /** Filtro por status do pedido: '' = todos; ABERTO | PARCIAL | QUITADO | VENCIDO */
  const [statusFilter, setStatusFilter] = useState<string>(() => getSavedCReceberState("statusFilter", ""));
  /** Filtro por período: data_inicial e data_final (YYYY-MM-DD) */
  const [dataInicialFilter, setDataInicialFilter] = useState<string>(() => getSavedCReceberState("dataInicialFilter", ""));
  const [dataFinalFilter, setDataFinalFilter] = useState<string>(() => getSavedCReceberState("dataFinalFilter", ""));
  const [campoDataFilter, setCampoDataFilter] = useState<"vencimento" | "emissao" | "pagamento">(() => getSavedCReceberState("campoDataFilter", "vencimento"));

  useEffect(() => {
    const payload = {
      viewMode,
      activeCardFilter,
      searchTerm,
      clienteFilterId,
      rocaFilterId,
      statusFilter,
      dataInicialFilter,
      dataFinalFilter,
      campoDataFilter,
    };
    sessionStorage.setItem(SESSION_KEY_CRECEBER, JSON.stringify(payload));
  }, [
    viewMode,
    activeCardFilter,
    searchTerm,
    clienteFilterId,
    rocaFilterId,
    statusFilter,
    dataInicialFilter,
    dataFinalFilter,
    campoDataFilter,
  ]);
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);

  // Estados de Rascunho para a gaveta de Filtros Avançados (só aplicados ao clicar em "Aplicar Filtros")
  const [draftClienteFilterId, setDraftClienteFilterId] = useState<number | null>(clienteFilterId);
  const [draftRocaFilterId, setDraftRocaFilterId] = useState<number | null>(rocaFilterId);
  const [draftStatusFilter, setDraftStatusFilter] = useState<string>(statusFilter);
  const [draftDataInicialFilter, setDraftDataInicialFilter] = useState<string>(dataInicialFilter);
  const [draftDataFinalFilter, setDraftDataFinalFilter] = useState<string>(dataFinalFilter);
  const [draftCampoDataFilter, setDraftCampoDataFilter] = useState<"vencimento" | "emissao" | "pagamento">(campoDataFilter);

  const handleOpenFiltros = (open: boolean) => {
    if (open) {
      setDraftClienteFilterId(clienteFilterId);
      setDraftRocaFilterId(rocaFilterId);
      setDraftStatusFilter(statusFilter);
      setDraftDataInicialFilter(dataInicialFilter);
      setDraftDataFinalFilter(dataFinalFilter);
      setDraftCampoDataFilter(campoDataFilter);
    }
    setFiltrosDialogOpen(open);
  };
  // Dialog do relatório geral (PDF / imprimir)
  const [relatorioDialogOpen, setRelatorioDialogOpen] = useState(false);
  const [relatorioClientePdfOpen, setRelatorioClientePdfOpen] = useState(false);
  const [relatorioClienteIdSelect, setRelatorioClienteIdSelect] = useState<string>("");
  const [relatorioClientePdfLoading, setRelatorioClientePdfLoading] = useState(false);
  const [relatorioClienteDataInicial, setRelatorioClienteDataInicial] = useState("");
  const [relatorioClienteDataFinal, setRelatorioClienteDataFinal] = useState("");
  const [relatorioClienteStatusFiltro, setRelatorioClienteStatusFiltro] = useState<string>("Todos");
  const [relatorioClienteCampoData, setRelatorioClienteCampoData] = useState<
    "vencimento" | "emissao" | "pagamento"
  >("vencimento");
  const [relatorioDataInicial, setRelatorioDataInicial] = useState<string>("");
  const [relatorioDataFinal, setRelatorioDataFinal] = useState<string>("");
  const [relatorioStatusFiltro, setRelatorioStatusFiltro] = useState<string>("Todos");
  const [relatorioCampoData, setRelatorioCampoData] = useState<
    "vencimento" | "emissao" | "pagamento"
  >("vencimento");
  const [relatorioPdfLoading, setRelatorioPdfLoading] = useState(false);
  const [relatorioProdutosClienteOpen, setRelatorioProdutosClienteOpen] =
    useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContaId, setSelectedContaId] = useState<number | null>(null);
  const [pedidoCancelar, setPedidoCancelar] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [itemApagar, setItemApagar] = useState<{
    tipo: "pedido" | "conta";
    id: number;
    label: string;
  } | null>(null);
  const [contaEstornar, setContaEstornar] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState<string>("");
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [newTransacao, setNewTransacao] = useState<CreateContaFinanceiraDto & { 
    data_emissao: string;
  }>({
    tipo: "RECEBER",
    descricao: "",
    valor_original: 0,
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: "",
    roca_id: undefined,
  });

  const queryClient = useQueryClient();

  const { data: rocasData } = useQuery({
    queryKey: ["contas-receber", "rocas-ativas"],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    retry: false,
  });
  const rocasLista: Roca[] = Array.isArray(rocasData)
    ? rocasData
    : (rocasData as { rocas?: Roca[] })?.rocas ?? [];

  // Buscar clientes
  const { data: clientesData } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      try {
        const response = await clientesService.listar({
          limit: 100,
          statusCliente: "ATIVO",
        });
        if (Array.isArray(response)) return response;
        if (Array.isArray((response as any)?.data)) return (response as any).data;
        if (Array.isArray((response as any)?.clientes)) return (response as any).clientes;
        if (Array.isArray((response as any)?.items)) return (response as any).items;
        return [];
      } catch (error) {
        console.warn("API de clientes não disponível:", error);
        return [];
      }
    },
    retry: false,
  });

  const clientes: Cliente[] = Array.isArray(clientesData)
    ? clientesData
    : (clientesData as any)?.data ||
      (clientesData as any)?.clientes ||
      (clientesData as any)?.items ||
      [];

  const relatorioClienteIdParsed = useMemo(() => {
    if (!relatorioClienteIdSelect) return null;
    const n = parseInt(relatorioClienteIdSelect, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [relatorioClienteIdSelect]);

  const relatorioGeralPreviewParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      tipo: "RECEBER" as const,
      data_inicial: relatorioDataInicial || undefined,
      data_final: relatorioDataFinal || undefined,
      campo_data: relatorioCampoData,
      status:
        relatorioStatusFiltro !== "Todos" ? relatorioStatusFiltro : undefined,
    }),
    [relatorioDataInicial, relatorioDataFinal, relatorioStatusFiltro, relatorioCampoData],
  );

  const {
    data: relatorioGeralPreviewData,
    isFetching: relatorioGeralPreviewFetching,
    isError: relatorioGeralPreviewError,
  } = useQuery({
    queryKey: ["contas-receber-relatorio-geral-preview", relatorioGeralPreviewParams],
    queryFn: () => financeiroService.listar(relatorioGeralPreviewParams),
    enabled: relatorioDialogOpen,
  });

  const relatorioGeralTotalContas = useMemo(() => {
    if (!relatorioGeralPreviewData) return 0;
    if (typeof relatorioGeralPreviewData.total === "number") {
      return relatorioGeralPreviewData.total;
    }
    if (Array.isArray(relatorioGeralPreviewData)) {
      return relatorioGeralPreviewData.length;
    }
    if (Array.isArray(relatorioGeralPreviewData.data)) {
      return relatorioGeralPreviewData.total ?? relatorioGeralPreviewData.data.length;
    }
    return 0;
  }, [relatorioGeralPreviewData]);

  const relatorioGeralTemDados =
    !relatorioGeralPreviewError &&
    relatorioGeralPreviewData != null &&
    relatorioGeralTotalContas > 0;

  const relatorioGeralMensagemSemDados = useMemo(() => {
    if (relatorioStatusFiltro !== "Todos") {
      return "Não há contas a receber com o status selecionado.";
    }
    if (relatorioDataInicial || relatorioDataFinal) {
      return "Não há contas a receber no período selecionado.";
    }
    return "Não há contas a receber cadastradas.";
  }, [relatorioStatusFiltro, relatorioDataInicial, relatorioDataFinal]);

  const relatorioGeralFiltrosForPdf = useMemo(
    () => ({
      dataInicial: relatorioDataInicial || undefined,
      dataFinal: relatorioDataFinal || undefined,
      status:
        relatorioStatusFiltro !== "Todos" ? relatorioStatusFiltro : undefined,
      campoData: relatorioCampoData,
    }),
    [relatorioDataInicial, relatorioDataFinal, relatorioStatusFiltro, relatorioCampoData],
  );

  const relatorioClientePreviewParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      cliente_id: relatorioClienteIdParsed ?? undefined,
      data_inicial: relatorioClienteDataInicial || undefined,
      data_final: relatorioClienteDataFinal || undefined,
      campo_data: relatorioClienteCampoData,
      status:
        relatorioClienteStatusFiltro !== "Todos"
          ? relatorioClienteStatusFiltro
          : undefined,
    }),
    [
      relatorioClienteIdParsed,
      relatorioClienteDataInicial,
      relatorioClienteDataFinal,
      relatorioClienteStatusFiltro,
      relatorioClienteCampoData,
    ],
  );

  const {
    data: relatorioClientePreviewData,
    isFetching: relatorioClientePreviewFetching,
    isError: relatorioClientePreviewError,
  } = useQuery({
    queryKey: ["contas-receber-relatorio-financeiro-preview", relatorioClientePreviewParams],
    queryFn: () => financeiroService.listarAgrupado(relatorioClientePreviewParams),
    enabled: relatorioClientePdfOpen && relatorioClienteIdParsed != null,
  });

  const relatorioClienteTemDados =
    !relatorioClientePreviewError &&
    relatorioClientePreviewData != null &&
    relatorioClientePreviewData.total > 0;

  const relatorioClienteMensagemSemDados = useMemo(() => {
    if (relatorioClienteStatusFiltro !== "Todos") {
      return "O cliente não possui dívida naquele status selecionado.";
    }
    return "O cliente não possui dívida naquele período.";
  }, [relatorioClienteStatusFiltro]);

  const relatorioClienteFiltrosForPdf = useMemo(
    () => ({
      dataInicial: relatorioClienteDataInicial || undefined,
      dataFinal: relatorioClienteDataFinal || undefined,
      status:
        relatorioClienteStatusFiltro !== "Todos"
          ? relatorioClienteStatusFiltro
          : undefined,
      campoData: relatorioClienteCampoData,
    }),
    [
      relatorioClienteDataInicial,
      relatorioClienteDataFinal,
      relatorioClienteStatusFiltro,
      relatorioClienteCampoData,
    ],
  );

  // Removido: pedidos agora vem de pedidosContasReceber (linha 209)

  // Usar endpoint /pedidos/contas-receber (cada linha = 1 pedido) — filtro por cliente e card é enviado à API / client-side
  const { data: pedidosContasReceber, isLoading: isLoadingPedidosContasReceber } = useQuery({
    queryKey: ["pedidos", "contas-receber", clienteFilterId, rocaFilterId, statusFilter, dataInicialFilter, dataFinalFilter, searchTerm],
    queryFn: async () => {
      try {
        const params: import('@/types/contas-financeiras.types').FiltrosContasReceber = {};
        if (clienteFilterId != null && clienteFilterId > 0) {
          params.cliente_id = clienteFilterId;
        }
        if (rocaFilterId != null && rocaFilterId > 0) {
          params.roca_id = rocaFilterId;
        }
        if (dataInicialFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialFilter)) {
          params.data_inicial = dataInicialFilter;
        }
        if (dataFinalFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalFilter)) {
          params.data_final = dataFinalFilter;
        }
        if (searchTerm.trim()) {
          params.busca = searchTerm.trim();
        }
        const hasFilters =
          (params.cliente_id != null && params.cliente_id > 0) ||
          (params.roca_id != null && params.roca_id > 0) ||
          !!params.data_inicial ||
          !!params.data_final ||
          !!params.busca;
        return await pedidosService.listarContasReceber(hasFilters ? params : undefined);
      } catch (error: any) {
        if (error?.response?.status === 400) {
          console.warn("Backend retornou 400 - tratando como banco vazio:", error);
          return [];
        }
        console.warn("API contas a receber não disponível:", error);
        return [];
      }
    },
    retry: false,
  });

  const pedidos = pedidosContasReceber ?? [];
  
  // Usar sempre tb_conta_financeira na tabela para também exibir contas avulsas do Financeiro.
  // O endpoint de pedidos continua sendo usado como apoio para alguns cálculos/cards.
  const usarFallbackContasFinanceiras = true;

  // Buscar dados do dashboard de contas a receber
  const { data: dashboardReceber, isLoading: isLoadingReceber } = useQuery({
    queryKey: ["dashboard-receber", dataInicialFilter, dataFinalFilter],
    queryFn: () =>
      financeiroService.getDashboardReceber({
        data_inicial:
          dataInicialFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialFilter)
            ? dataInicialFilter
            : undefined,
        data_final:
          dataFinalFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalFilter)
            ? dataFinalFilter
            : undefined,
      }),
    refetchInterval: 30000,
    retry: false,
  });

  // Buscar TODAS as contas a receber filtradas (a paginação é feita por pedido, no cliente,
  // para que a tabela e os cards usem a mesma base de dados)
  const { data: contasResponse, isLoading: isLoadingContas } = useQuery({
    queryKey: [
      "contas-financeiras",
      "receber",
      "tabela",
      activeCardFilter,
      clienteFilterId,
      rocaFilterId,
      statusFilter,
      dataInicialFilter,
      dataFinalFilter,
      searchTerm,
    ],
    queryFn: async () => {
      try {
        const clienteArg =
          clienteFilterId != null && clienteFilterId > 0
            ? clienteFilterId
            : undefined;
        const rocaArg =
          rocaFilterId != null && rocaFilterId > 0 ? rocaFilterId : undefined;
        const dataInicialArg =
          dataInicialFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialFilter)
            ? dataInicialFilter
            : undefined;
        const dataFinalArg =
          dataFinalFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalFilter)
            ? dataFinalFilter
            : undefined;
        const baseArgs = {
          tipo: "RECEBER" as const,
          cliente_id: clienteArg,
          roca_id: rocaArg,
          data_inicial: dataInicialArg,
          data_final: dataFinalArg,
          campo_data: campoDataFilter,
          busca: searchTerm.trim() || undefined,
        };

        const comoResposta = (merged: ContaFinanceira[]) => ({
          data: merged,
          total: merged.length,
        });

        const filtroFolhaAtivo =
          !!statusFilter &&
          statusFilter !== "VENCIDO" &&
          activeCardFilter === "todos";

        /** Cards: buscar todas as páginas e paginar no cliente (evita tabela vazia com total errado). */
        if (!filtroFolhaAtivo && activeCardFilter !== "todos") {
          if (activeCardFilter === "valor_pago") {
            const [pagasTotal, pagasParcial] = await Promise.all([
              listarContasTodasAsPaginas({ ...baseArgs, status: "PAGO_TOTAL" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "PAGO_PARCIAL" }),
            ]);
            const seen = new Set<number>();
            const merged = [...pagasTotal, ...pagasParcial].filter((c) => {
              const id = Number(c.id);
              if (!Number.isFinite(id) || seen.has(id)) return false;
              seen.add(id);
              return contaEstaPaga(c);
            });
            return comoResposta(merged);
          }
          if (activeCardFilter === "a_receber") {
            const [pendentes, parciais] = await Promise.all([
              listarContasTodasAsPaginas({ ...baseArgs, status: "PENDENTE" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "PAGO_PARCIAL" }),
            ]);
            const seen = new Set<number>();
            const merged = [...pendentes, ...parciais].filter((c) => {
              const id = Number(c.id);
              if (!Number.isFinite(id) || seen.has(id)) return false;
              seen.add(id);
              // Previsões não entram no Total a Receber (card e lista iguais).
              return !contaEhPrevisao(c) && contaTemSaldoAberto(c);
            });
            return comoResposta(merged);
          }
          if (activeCardFilter === "vencidas") {
            // Busca contas em aberto e filtra vencidas no cliente (data local).
            // Evita fuso do backend e garante que o total bata com o card.
            const [pendentes, parciais, vencidos] = await Promise.all([
              listarContasTodasAsPaginas({ ...baseArgs, status: "PENDENTE" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "PAGO_PARCIAL" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "VENCIDO" }),
            ]);
            const seen = new Set<number>();
            const merged = [...pendentes, ...parciais, ...vencidos].filter((c) => {
              const id = Number(c.id);
              if (!Number.isFinite(id) || seen.has(id)) return false;
              seen.add(id);
              return contaEstaVencidaLocal(c);
            });
            return comoResposta(merged);
          }
          if (activeCardFilter === "vencendo_hoje") {
            const [pendentes, parciais, vencidos] = await Promise.all([
              listarContasTodasAsPaginas({ ...baseArgs, status: "PENDENTE" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "PAGO_PARCIAL" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "VENCIDO" }),
            ]);
            const seen = new Set<number>();
            const merged = [...pendentes, ...parciais, ...vencidos].filter((c) => {
              const id = Number(c.id);
              if (!Number.isFinite(id) || seen.has(id)) return false;
              seen.add(id);
              return contaVenceHojeLocal(c);
            });
            return comoResposta(merged);
          }
          if (activeCardFilter === "vencendo_este_mes") {
            // Inclui ABERTO/PARCIAL (modelo por saldo) além dos status legados, e VENCIDO:
            // o card considera o mês inteiro, inclusive o que já venceu no mês.
            const [pendentes, parciais, abertos, parciaisSaldo, vencidos] = await Promise.all([
              listarContasTodasAsPaginas({ ...baseArgs, status: "PENDENTE" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "PAGO_PARCIAL" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "ABERTO" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "PARCIAL" }),
              listarContasTodasAsPaginas({ ...baseArgs, status: "VENCIDO" }),
            ]);
            const seen = new Set<number>();
            const merged = [...pendentes, ...parciais, ...abertos, ...parciaisSaldo, ...vencidos].filter((c) => {
              const id = Number(c.id);
              if (!Number.isFinite(id) || seen.has(id)) return false;
              seen.add(id);
              return contaVenceEsteMesLocal(c);
            });
            return comoResposta(merged);
          }
        }

        let status: string | undefined;
        let proximidadeVencimento: string | undefined;

        if (statusFilter === "VENCIDO") {
          proximidadeVencimento = "VENCIDA";
        } else if (filtroFolhaAtivo) {
          if (statusFilter === "ABERTO") status = "ABERTO";
          else if (statusFilter === "PARCIAL") status = "PARCIAL";
          else if (statusFilter === "QUITADO") status = "QUITADO";
        }

        // Buscar todas as páginas: os cards somam a base inteira, então a tabela
        // também precisa da base inteira para os números baterem.
        const todas = await listarContasTodasAsPaginas({
          ...baseArgs,
          status,
          proximidade_vencimento: proximidadeVencimento as
            | "VENCIDA"
            | "VENCE_HOJE"
            | undefined,
        });

        return comoResposta(todas);
      } catch (error) {
        console.warn("API de contas financeiras não disponível:", error);
        return { data: [], total: 0 };
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response) {
        const status = error.response.status;
        if ([400, 401, 403, 404].includes(status)) {
          return false;
        }
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  const contas = contasResponse?.data || [];
  const matchDataRange = (
    dataStr: string | null | undefined,
    dataIni: string,
    dataFin: string
  ) => {
    if (!dataIni && !dataFin) return true;
    if (!dataStr) return false;
    const d = dataStr.slice(0, 10);
    if (dataIni && d < dataIni) return false;
    if (dataFin && d > dataFin) return false;
    return true;
  };

  const contasExibir = useMemo(() => {
    let base = contas;
    if (rocaFilterId != null && rocaFilterId > 0) {
      const nomeRoca = rocasLista
        .find((r) => r.id === rocaFilterId)
        ?.nome?.trim()
        .toLowerCase();
      const pedidoIdsRoca = new Set(
        (pedidosContasReceber ?? []).map((p) => p.pedido_id).filter((id) => id != null),
      );
      base = base.filter((c) => {
        if (Number(c.roca_id) === rocaFilterId) return true;
        if (
          nomeRoca &&
          (c.roca_nome ?? "").trim().toLowerCase() === nomeRoca
        ) {
          return true;
        }
        if (c.pedido_id != null && pedidoIdsRoca.has(c.pedido_id)) return true;
        return false;
      });
    }

    if (dataInicialFilter || dataFinalFilter) {
      base = base.filter((c: any) => {
        let dateVal: string | null | undefined;
        if (campoDataFilter === "emissao") {
          dateVal = c.data_emissao || c.created_at;
        } else if (campoDataFilter === "pagamento") {
          dateVal = c.data_pagamento || c.pagamento?.data_pagamento || (c.pagamentos?.[0]?.data) || c.data_vencimento;
        } else {
          dateVal = c.data_vencimento;
        }
        return matchDataRange(dateVal, dataInicialFilter, dataFinalFilter);
      });
    }

    return base;
  }, [
    contas,
    rocaFilterId,
    rocasLista,
    pedidosContasReceber,
    campoDataFilter,
    dataInicialFilter,
    dataFinalFilter,
  ]);
  const totalContas = contasResponse?.total || 0;

  const temFiltrosAtivos =
    (clienteFilterId != null && clienteFilterId > 0) ||
    (rocaFilterId != null && rocaFilterId > 0) ||
    !!statusFilter ||
    !!dataInicialFilter ||
    !!dataFinalFilter ||
    campoDataFilter !== "vencimento";

  const handleAplicarFiltros = () => {
    setClienteFilterId(draftClienteFilterId);
    setRocaFilterId(draftRocaFilterId);
    setStatusFilter(draftStatusFilter);
    setDataInicialFilter(draftDataInicialFilter);
    setDataFinalFilter(draftDataFinalFilter);
    setCampoDataFilter(draftCampoDataFilter);
    setFiltrosDialogOpen(false);
  };

  const handleLimparFiltros = () => {
    sessionStorage.removeItem(SESSION_KEY_CRECEBER);
    setClienteFilterId(null);
    setRocaFilterId(null);
    setStatusFilter("");
    setCampoDataFilter("vencimento");
    setDataInicialFilter("");
    setDataFinalFilter("");
    setActiveCardFilter("todos");
    setSearchTerm("");

    setDraftClienteFilterId(null);
    setDraftRocaFilterId(null);
    setDraftStatusFilter("");
    setDraftCampoDataFilter("vencimento");
    setDraftDataInicialFilter("");
    setDraftDataFinalFilter("");

    setFiltrosDialogOpen(false);
  };

  const baseFiltrosContasArgs = useMemo(() => {
    const clienteArg =
      clienteFilterId != null && clienteFilterId > 0 ? clienteFilterId : undefined;
    const rocaArg =
      rocaFilterId != null && rocaFilterId > 0 ? rocaFilterId : undefined;
    const dataInicialArg =
      dataInicialFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialFilter)
        ? dataInicialFilter
        : undefined;
    const dataFinalArg =
      dataFinalFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalFilter)
        ? dataFinalFilter
        : undefined;

    let status: string | undefined;
    let proximidade_vencimento: "VENCIDA" | undefined;
    if (statusFilter === "VENCIDO") {
      proximidade_vencimento = "VENCIDA";
    } else if (statusFilter === "ABERTO") {
      status = "ABERTO";
    } else if (statusFilter === "PARCIAL") {
      status = "PARCIAL";
    } else if (statusFilter === "QUITADO") {
      status = "QUITADO";
    }

    return {
      tipo: "RECEBER" as const,
      cliente_id: clienteArg,
      roca_id: rocaArg,
      data_inicial: dataInicialArg,
      data_final: dataFinalArg,
      status,
      proximidade_vencimento,
    };
  }, [
    clienteFilterId,
    rocaFilterId,
    dataInicialFilter,
    dataFinalFilter,
    statusFilter,
  ]);

  const { data: contasParaCards, isLoading: isLoadingContasParaCards } = useQuery({
    queryKey: ["contas-financeiras", "receber", "cards", baseFiltrosContasArgs],
    queryFn: async () => listarContasTodasAsPaginas(baseFiltrosContasArgs),
    enabled: temFiltrosAtivos,
    retry: false,
  });

  const contasFiltradasParaCards = useMemo(() => {
    if (!contasParaCards?.length) return contasParaCards ?? [];
    if (rocaFilterId == null || rocaFilterId <= 0) return contasParaCards;

    const nomeRoca = rocasLista
      .find((r) => r.id === rocaFilterId)
      ?.nome?.trim()
      .toLowerCase();
    const pedidoIdsRoca = new Set(
      (pedidosContasReceber ?? []).map((p) => p.pedido_id).filter((id) => id != null),
    );

    return contasParaCards.filter((c) => {
      if (Number(c.roca_id) === rocaFilterId) return true;
      if (nomeRoca && (c.roca_nome ?? "").trim().toLowerCase() === nomeRoca) {
        return true;
      }
      if (c.pedido_id != null && pedidoIdsRoca.has(c.pedido_id)) return true;
      return false;
    });
  }, [contasParaCards, rocaFilterId, rocasLista, pedidosContasReceber]);

  const resumoCardsFiltrado = useMemo(() => {
    if (!temFiltrosAtivos) return null;
    return calcularResumoCardsReceber(contasFiltradasParaCards);
  }, [temFiltrosAtivos, contasFiltradasParaCards]);


  const resumoCardsListagem = useMemo(() => {
    if (!usarFallbackContasFinanceiras || contasExibir.length === 0) return null;
    return calcularResumoCardsReceber(contasExibir);
  }, [usarFallbackContasFinanceiras, contasExibir]);

  // Função auxiliar para verificar se uma conta está vencida
  const isContaVencida = (conta: any): boolean => {
    if (!conta || conta.tipo !== "RECEBER") return false;
    
    // Se já está paga ou cancelada, não está vencida
    if (conta.status === "PAGO_TOTAL" || conta.status === "CANCELADO") return false;
    
    // Se tem status VENCIDO, está vencida
    if (conta.status === "VENCIDO") return true;
    
    // Verificar pela data de vencimento
    if (!conta.data_vencimento) return false;
    
    try {
      // Usar dias_ate_vencimento do backend se disponível
      if (conta.dias_ate_vencimento !== undefined && conta.dias_ate_vencimento !== null) {
        return conta.dias_ate_vencimento < 0;
      }
      
      // Calcular manualmente se não tiver o campo do backend
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = parseDateOnlyLocal(conta.data_vencimento);
      if (!vencimento) return false;
      vencimento.setHours(0, 0, 0, 0);
      return vencimento < hoje;
    } catch {
      return false;
    }
  };

  // Função auxiliar para verificar se uma conta vence hoje
  const isContaVencendoHoje = (conta: any): boolean => {
    if (!conta || conta.tipo !== "RECEBER") return false;
    if (conta.status === "PAGO_TOTAL" || conta.status === "CANCELADO") return false;
    if (!conta.data_vencimento) return false;
    
    try {
      // Usar dias_ate_vencimento do backend se disponível
      if (conta.dias_ate_vencimento !== undefined && conta.dias_ate_vencimento !== null) {
        return conta.dias_ate_vencimento === 0;
      }
      
      // Calcular manualmente
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = parseDateOnlyLocal(conta.data_vencimento);
      if (!vencimento) return false;
      vencimento.setHours(0, 0, 0, 0);
      return vencimento.getTime() === hoje.getTime();
    } catch {
      return false;
    }
  };

  // Função auxiliar para verificar se uma conta vence este mês
  const isContaVencendoEsteMes = (conta: any): boolean => {
    if (!conta || conta.tipo !== "RECEBER") return false;
    if (conta.status === "PAGO_TOTAL" || conta.status === "CANCELADO") return false;
    if (!conta.data_vencimento) return false;
    
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      
      const vencimento = parseDateOnlyLocal(conta.data_vencimento);
      if (!vencimento) return false;
      const mesVencimento = vencimento.getMonth();
      const anoVencimento = vencimento.getFullYear();
      
      // Verificar se vence neste mês e ainda não venceu
      if (mesVencimento === mesAtual && anoVencimento === anoAtual) {
        // Usar dias_ate_vencimento do backend se disponível
        if (conta.dias_ate_vencimento !== undefined && conta.dias_ate_vencimento !== null) {
          return conta.dias_ate_vencimento >= 0;
        }
        
        // Calcular manualmente
        hoje.setHours(0, 0, 0, 0);
        vencimento.setHours(0, 0, 0, 0);
        return vencimento >= hoje;
      }
      
      return false;
    } catch {
      return false;
    }
  };

  // Calcular estatísticas (guia: NUNCA valor_total_receber; SEMPRE valor_total_pendente ou soma clientes)
  const stats = useMemo(() => {
    const parseValor = (valor: any): number => {
      if (valor === null || valor === undefined || valor === '') return 0;
      const num = typeof valor === 'string' ? parseFloat(valor) : Number(valor);
      return isNaN(num) ? 0 : num;
    };

    // Com filtros / listagem carregada, cards usam a mesma base da tabela (por pedido).
    const totalReceber =
      resumoCardsFiltrado != null
        ? resumoCardsFiltrado.totalReceber
        : activeCardFilter === "todos" && resumoCardsListagem != null
            ? resumoCardsListagem.totalReceber
            : parseValor(dashboardReceber?.valor_total_pendente) ?? 0;

    const contagemCard = (
      campo: "vencidas" | "vencendoHoje" | "vencendoEsteMes",
      dashboardValor: number,
    ) => {
      if (resumoCardsFiltrado != null) return resumoCardsFiltrado[campo];
      // Sem filtros: sempre o resumo do backend (igual ao Contas a Pagar). Antes, com o
      // card ativo, a contagem vinha da lista recarregada no clique e o card piscava;
      // a contagem do backend agora separa pedido × conta avulsa e bate com a lista.
      return dashboardValor;
    };

    const totalVencidas = contagemCard(
      "vencidas",
      Number(dashboardReceber?.vencidas) ?? 0,
    );
    const totalVencendoHoje = contagemCard(
      "vencendoHoje",
      Number(dashboardReceber?.vencendo_hoje) ?? 0,
    );
    const totalVencendoEsteMes = contagemCard(
      "vencendoEsteMes",
      Number(dashboardReceber?.vencendo_este_mes) ?? 0,
    );
    const valorPagoFromPedidos =
      !usarFallbackContasFinanceiras && pedidos.length > 0
        ? pedidos.reduce((s, p) => s + (Number((p as ContaReceber).valor_pago) || 0), 0)
        : null;
    const valorPago =
      resumoCardsFiltrado != null
        ? resumoCardsFiltrado.valorRecebido
        : activeCardFilter === "todos" && resumoCardsListagem != null
          ? resumoCardsListagem.valorRecebido
          : valorPagoFromPedidos !== null
            ? valorPagoFromPedidos
            : parseValor(dashboardReceber?.valor_total_recebido) ?? 0;
    const formatarMoedaCard = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return [
      {
        key: "a_receber",
        filterKey: "a_receber" as const,
        label: "Total a Receber",
        value: formatarMoedaCard(totalReceber),
        Icon: CreditCard,
        ...statTheme.sky,
      },
      {
        key: "valor_pago",
        filterKey: "valor_pago" as const,
        label: "Valor Recebido",
        value: formatarMoedaCard(valorPago),
        Icon: DollarSign,
        ...statTheme.emerald,
      },
      {
        key: "vencidas",
        filterKey: "vencidas" as const,
        label: "Vencidas",
        value: totalVencidas.toString(),
        Icon: Calendar,
        ...statTheme.red,
      },
      {
        key: "vencendo_hoje",
        filterKey: "vencendo_hoje" as const,
        label: "Vencendo Hoje",
        value: totalVencendoHoje.toString(),
        Icon: Calendar,
        ...statTheme.amber,
      },
      {
        key: "vencendo_este_mes",
        filterKey: "vencendo_este_mes" as const,
        label: "Vencendo Este Mês",
        value: totalVencendoEsteMes.toString(),
        Icon: Calendar,
        ...statTheme.blue,
      },
    ];
  }, [
    dashboardReceber,
    usarFallbackContasFinanceiras,
    pedidos,
    resumoCardsFiltrado,
    resumoCardsListagem,
    activeCardFilter,
  ]);

  const totalReceberTooltip = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px]">
          <p className="font-medium mb-1">Origem do valor</p>
          <p className="text-xs">
            {resumoCardsFiltrado != null
              ? "Soma das contas filtradas (mesma base da tabela)."
              : "Soma das contas a receber em aberto (mesma base das visões por pedidos e por clientes)."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Query para buscar conta financeira por ID
  const { data: contaSelecionada, isLoading: isLoadingConta } = useQuery({
    queryKey: ["conta-financeira", selectedContaId],
    queryFn: async () => {
      if (!selectedContaId) return null;
      return await financeiroService.buscarPorId(selectedContaId);
    },
    enabled: !!selectedContaId && viewDialogOpen,
    retry: false,
  });

  // Query para buscar detalhe da conta financeira (com histórico de pagamentos/estornos)
  const { data: contaDetalhe, isLoading: isLoadingDetalhe } = useQuery({
    queryKey: ["conta-financeira-detalhe", selectedContaId],
    queryFn: async () => {
      if (!selectedContaId) return null;
      return await financeiroService.buscarDetalhePorId(selectedContaId);
    },
    enabled: !!selectedContaId && viewDialogOpen,
    retry: false,
  });

  // Query para buscar todas as parcelas do pedido (para contar parcelas pagas)
  const { data: parcelasDoPedido } = useQuery({
    queryKey: ["parcelas-pedido", contaSelecionada?.pedido_id],
    queryFn: async () => {
      if (!contaSelecionada?.pedido_id) return [];
      try {
        const parcelas = await financeiroService.buscarPorPedido(contaSelecionada.pedido_id);
        return Array.isArray(parcelas) ? parcelas : [];
      } catch (error) {
        console.error('Erro ao buscar parcelas do pedido:', error);
        return [];
      }
    },
    enabled: !!contaSelecionada?.pedido_id && viewDialogOpen,
    retry: false,
  });

  // Calcular quantas parcelas foram pagas
  const parcelasPagas = useMemo(() => {
    if (!parcelasDoPedido || parcelasDoPedido.length === 0) return 0;
    return parcelasDoPedido.filter(
      (parcela: any) => parcela.status === 'PAGO_TOTAL' || parcela.status === 'PAGO_PARCIAL'
    ).length;
  }, [parcelasDoPedido]);

  // Função para formatar método de pagamento
  const formatarMetodoPagamento = (metodo?: string): string => {
    if (!metodo) return 'N/A';
    
    const metodos: Record<string, string> = {
      'DINHEIRO': 'Dinheiro',
      'PIX': 'PIX',
      'CARTAO_CREDITO': 'Cartão de Crédito',
      'CARTAO_DEBITO': 'Cartão de Débito',
      'BOLETO': 'Boleto',
      'TRANSFERENCIA': 'Transferência',
      'CHEQUE': 'Cheque',
    };
    
    return metodos[metodo] || metodo;
  };

  // Mutation para criar conta financeira
  const createContaMutation = useMutation({
    mutationFn: async (data: CreateContaFinanceiraDto) => {
      return await financeiroService.criar(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-receber"] });
      toast.success("Conta a receber registrada com sucesso!");
      setDialogOpen(false);
      setNewTransacao({
        tipo: "RECEBER",
        descricao: "",
        valor_original: 0,
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: "",
        roca_id: undefined,
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao registrar conta a receber");
    },
  });

  // Mutation para atualizar apenas o status (edição inline)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await financeiroService.atualizar(id, { status: status as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-receber"] });
      toast.success("Status atualizado com sucesso!");
      setEditingStatusId(null);
    },
    onError: (error: any) => {
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        (Array.isArray(error?.response?.data?.message) 
          ? error.response.data.message.join(', ') 
          : null) ||
        (error?.response?.status === 500 
          ? "Erro interno do servidor ao atualizar status. Tente novamente." 
          : "Erro ao atualizar status");
      
      console.error('❌ [ContasAReceber] Erro ao atualizar status:', {
        error,
        status: error?.response?.status,
        data: error?.response?.data,
        message: errorMessage,
      });
      
      toast.error(errorMessage);
      setEditingStatusId(null);
    },
  });

  const cancelarPedidoMutation = useMutation({
    mutationFn: (pedidoId: number) => pedidosService.cancelar(pedidoId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-receber"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos", "contas-receber"] }),
        queryClient.invalidateQueries({ queryKey: ["contas-receber"] }),
      ]);
      toast.success("Pedido cancelado com sucesso!");
      setPedidoCancelar(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Erro ao cancelar pedido.",
      );
    },
  });

  const apagarMutation = useMutation({
    mutationFn: async (item: { tipo: "pedido" | "conta"; id: number }) => {
      if (item.tipo === "pedido") {
        return pedidosService.excluir(item.id);
      }
      return financeiroService.deletar(item.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-receber"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos", "contas-receber"] }),
        queryClient.invalidateQueries({ queryKey: ["contas-receber"] }),
      ]);
      toast.success(
        itemApagar?.tipo === "conta"
          ? "Conta apagada com sucesso!"
          : "Pedido apagado com sucesso!",
      );
      setItemApagar(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Erro ao apagar.",
      );
    },
  });

  const estornarMutation = useMutation({
    mutationFn: async (id: number) => {
      const hojeYMD = new Date().toISOString().split("T")[0];
      return await financeiroService.estornarPagamento(id, {
        motivo_estorno: motivoEstorno.trim() || undefined,
        data_estorno: hojeYMD,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-receber"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-resumo-financeiro"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos", "contas-receber"] }),
        queryClient.invalidateQueries({ queryKey: ["contas-receber"] }),
      ]);
      toast.success(
        "Recebimento estornado com sucesso! O título retornou ao status Pendente.",
      );
      setContaEstornar(null);
      setMotivoEstorno("");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Erro ao estornar recebimento.",
      );
    },
  });

  const handleStatusChange = (contaId: number, newStatus: string) => {
    setEditingStatusId(contaId);
    updateStatusMutation.mutate({ id: contaId, status: newStatus });
  };

  const formatarMoeda = (valor: number | undefined | null) => {
    const n = valor == null || Number.isNaN(Number(valor)) ? 0 : Number(valor);
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  };

  const calcularDiasAteVencimento = (dataVencimento: string | undefined | null): number | null => {
    if (!dataVencimento) return null;
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = parseDateOnlyLocal(dataVencimento);
      if (!vencimento) return null;
      vencimento.setHours(0, 0, 0, 0);
      const diffTime = vencimento.getTime() - hoje.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const getVencimentoStatus = (dias: number | null, status: string): { texto: string; cor: string; bgColor: string } => {
    if (status === "PREVISAO" || status === "Previsão") return { texto: "", cor: "", bgColor: "" };
    if (status === "QUITADO" || status === "PAGO_TOTAL" || status === "CANCELADO") return { texto: "", cor: "", bgColor: "" };
    if (dias === null) return { texto: "Data inválida", cor: "text-gray-500", bgColor: "bg-gray-100" };
    if (dias < 0) return { texto: "Vencida", cor: "text-red-600", bgColor: "bg-red-100" };
    if (dias === 0) return { texto: "Vence hoje", cor: "text-red-600", bgColor: "bg-red-100" };
    if (dias <= 3) return { texto: `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`, cor: "text-orange-600", bgColor: "bg-orange-100" };
    if (dias <= 7) return { texto: `Vence em ${dias} dias`, cor: "text-amber-600", bgColor: "bg-amber-100" };
    if (dias <= 30) return { texto: `Vence em ${dias} dias`, cor: "text-blue-600", bgColor: "bg-blue-100" };
    return { texto: `Vence em ${dias} dias`, cor: "text-gray-600", bgColor: "bg-gray-100" };
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "previsão" || s === "previsao") return "bg-violet-500/10 text-violet-600";
    if (s === "pendente") return "bg-amber-500/10 text-amber-500";
    if (s === "em aberto" || s === "aberto") return "bg-blue-500/10 text-blue-500";
    if (s === "pago parcial" || s.includes("parcial")) return "bg-blue-500/10 text-blue-500";
    if (s === "quitado" || s === "concluído" || s === "pago total") return "bg-green-500/10 text-green-500";
    if (s === "vencido" || s === "vencida") return "bg-red-500/10 text-red-500";
    if (s === "cancelado") return "bg-slate-600/10 text-slate-600";
    return "bg-muted text-muted-foreground";
  };

  const contaEhPrevisao = (conta: { status?: string; previsao?: boolean }) =>
    conta.previsao === true || conta.status === "PREVISAO";

  // Modelo sem parcelas: descrição simples (GUIA_MIGRACAO_SEM_PARCELAS)
  const formatarDescricao = (conta: any): string => conta?.descricao || '';

  // Função para obter cor do status ativo
  const getActiveTabColor = (tab: string) => {
    switch (tab.toUpperCase()) {
      case "PENDENTE": return "bg-amber-500 text-white";
      case "PAGO_PARCIAL": return "bg-blue-500 text-white";
      case "PAGO_TOTAL": return "bg-green-500 text-white";
      case "VENCIDO": return "bg-red-500 text-white";
      case "VENCE_HOJE": return "bg-orange-500 text-white";
      case "CANCELADO": return "bg-slate-600 text-white";
      default: return "bg-primary text-primary-foreground";
    }
  };

  // Função para obter cor do status inativo
  const getInactiveTabColor = (tab: string) => {
    switch (tab.toUpperCase()) {
      case "PENDENTE": return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20";
      case "PAGO_PARCIAL": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "PAGO_TOTAL": return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "VENCIDO": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      case "VENCE_HOJE": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20";
      case "CANCELADO": return "bg-slate-600/10 text-slate-600 hover:bg-slate-600/20";
      default: return "bg-card text-muted-foreground hover:bg-secondary";
    }
  };

  // Mapear contas financeiras para o formato de exibição
  const transacoesDisplay = useMemo(() => {
    return contasExibir.map((conta) => {
      let nomeCliente = "N/A";
      let categoria = "N/A";
      
      if (conta.tipo === "RECEBER" && conta.cliente_id) {
        const cliente = clientes.find(c => c.id === conta.cliente_id);
        nomeCliente = cliente?.nome || "Cliente não encontrado";
        categoria = "Vendas";
      }

      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valorPrincipalConta(conta));
      const valorPagoFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valorPagoConta(conta));

      const ehPrevisao = contaEhPrevisao(conta);

      const dataFormatada = ehPrevisao
        ? conta.data_prevista
          ? formatDate(conta.data_prevista)
          : "—"
        : conta.data_vencimento
          ? formatDate(conta.data_vencimento)
          : "N/A";

      const statusMap: Record<string, string> = {
        "PENDENTE": "Pendente",
        "ABERTO": "Pendente",
        "PREVISAO": "Previsão",
        "PAGO_PARCIAL": "Pago Parcial",
        "PARCIAL": "Pago Parcial",
        "PAGO_TOTAL": "Pago Total",
        "QUITADO": "Pago Total",
        "VENCIDO": "Vencido",
        "CANCELADO": "Cancelado",
      };
      const statusFormatado = statusMap[conta.status] || conta.status;

      // Usar campos calculados do backend se disponíveis, caso contrário calcular no frontend
      const diasAteVencimento = conta.dias_ate_vencimento !== undefined 
        ? conta.dias_ate_vencimento 
        : calcularDiasAteVencimento(conta.data_vencimento);
      
      // Se o backend forneceu status_vencimento e proximidade_vencimento, usar eles
      let vencimentoStatus: { texto: string; cor: string; bgColor: string };
      
      // Não exibir vencimento se for previsão, paga ou cancelada
      if (
        ehPrevisao ||
        conta.status === "PAGO_TOTAL" ||
        conta.status === "QUITADO" ||
        conta.status === "CANCELADO"
      ) {
        vencimentoStatus = { texto: "", cor: "", bgColor: "" };
      } else if (conta.status_vencimento && conta.proximidade_vencimento) {
        // Mapear proximidade_vencimento do backend para cores
        const proximidade = conta.proximidade_vencimento;
        let cor = "text-gray-600";
        let bgColor = "bg-gray-100";
        
        if (proximidade === 'VENCIDA' || proximidade === 'VENCE_HOJE') {
          cor = "text-red-600";
          bgColor = "bg-red-100";
        } else if (proximidade === 'CRITICO') {
          cor = "text-orange-600";
          bgColor = "bg-orange-100";
        } else if (proximidade === 'ATENCAO') {
          cor = "text-amber-600";
          bgColor = "bg-amber-100";
        } else if (proximidade === 'NORMAL') {
          cor = "text-blue-600";
          bgColor = "bg-blue-100";
        } else if (proximidade === 'LONGO_PRAZO') {
          cor = "text-gray-600";
          bgColor = "bg-gray-100";
        }
        
        vencimentoStatus = {
          texto: conta.status_vencimento,
          cor,
          bgColor,
        };
      } else {
        // Fallback: calcular no frontend
        vencimentoStatus = getVencimentoStatus(
          diasAteVencimento,
          ehPrevisao ? "PREVISAO" : conta.status,
        );
      }

      return {
        id: conta.numero_conta || `CONTA-${conta.id}`,
        descricao: formatarDescricao(conta),
        categoria: categoria,
        valor: valorFormatado,
        valorPago: valorPagoFormatado,
        data: dataFormatada,
        status: statusFormatado,
        statusOriginal: conta.status,
        contaId: conta.id,
        cliente: nomeCliente,
        diasAteVencimento,
        vencimentoStatus,
        roca_nome: conta.roca_nome ?? null,
        ehPrevisao,
      };
    });
  }, [contasExibir, clientes]);

  // Query para buscar conta por ID desativada no campo de busca global para evitar chamadas GET 404 e permitir busca por valor
  const isNumericSearch = !isNaN(Number(searchTerm)) && searchTerm.trim() !== "";
  const searchId = isNumericSearch ? Number(searchTerm) : null;
  const contaPorId = null;

  // Linhas de pedidos: cada linha = 1 pedido (novo formato)
  const linhasPedidos = useMemo(() => {
    if (!pedidosContasReceber || pedidosContasReceber.length === 0) return [];
    
    let linhasFiltradas = pedidosContasReceber;
    
    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      const termRaw = searchTerm.trim().toLowerCase();
      const termDot = termRaw.replace(',', '.');
      linhasFiltradas = pedidosContasReceber.filter((p: ContaReceber) => {
        const valTotalStr = p.valor_total != null ? String(p.valor_total).toLowerCase() : '';
        const valPagoStr = p.valor_pago != null ? String(p.valor_pago).toLowerCase() : '';
        const valAbertoStr = p.valor_em_aberto != null ? String(p.valor_em_aberto).toLowerCase() : '';

        return (
          p.numero_pedido?.toLowerCase().includes(termRaw) ||
          p.cliente_nome?.toLowerCase().includes(termRaw) ||
          p.roca_nome?.toLowerCase().includes(termRaw) ||
          p.pedido_id?.toString().includes(termRaw) ||
          valTotalStr.includes(termRaw) || valTotalStr.includes(termDot) ||
          valPagoStr.includes(termRaw) || valPagoStr.includes(termDot) ||
          valAbertoStr.includes(termRaw) || valAbertoStr.includes(termDot)
        );
      });
    }
    
    return linhasFiltradas;
  }, [pedidosContasReceber, searchTerm]);

  // Grupos de contas por pedido (fallback)
  type GrupoContas = {
    key: string;
    pedido_id?: number;
    descricaoBase: string;
    parcelas: ContaFinanceira[];
    total_parcelas: number;
    parcelas_pagas: number;
    parcelas_restantes: number;
    valor_aberto: number;
    cliente_nome: string;
    categoria: string;
    primeira_vencimento?: string;
    statusConsolidado: string;
    ehPrevisao: boolean;
    data_prevista?: string | null;
  };

  const gruposContas = useMemo(() => {
    const gruposMap = new Map<string, ContaFinanceira[]>();

    // Uma linha por pedido (parcelas do mesmo pedido somam no total)
    contasExibir.forEach((conta) => {
      const pedidoIdNum =
        conta.pedido_id != null && Number(conta.pedido_id) > 0
          ? Number(conta.pedido_id)
          : null;
      const key =
        pedidoIdNum != null ? `pedido-${pedidoIdNum}` : `avulso-${conta.id}`;
      const list = gruposMap.get(key) || [];
      list.push(conta);
      gruposMap.set(key, list);
    });

    const result: GrupoContas[] = [];
    gruposMap.forEach((parcelas, key) => {
      const primeira = parcelas[0];
      const cliente = clientes.find((c) => c.id === primeira?.cliente_id);
      const total = Math.max(...parcelas.map((p) => p.total_parcelas || 1), parcelas.length);
      const isPaga = (p: ContaFinanceira) => {
        const st = String(p.status ?? "").toUpperCase();
        if (st === "PAGO_TOTAL" || st === "QUITADO") return true;
        if (st === "CANCELADO") return false;
        const pago = valorPagoConta(p);
        const aberto = saldoAbertoConta(p);
        return pago > 0.009 && aberto <= 0.009;
      };
      const pagas = parcelas.filter(isPaga).length;
      const restantes = parcelas.filter(
        (p) => p.status !== "CANCELADO" && !isPaga(p)
      ).length;
      const valorAberto = parcelas.reduce((s, p) => s + saldoAbertoConta(p), 0);
      const descricaoBase = primeira?.descricao?.replace(/\s*-\s*\d+\/\d+\s*$/, "").trim() || primeira?.numero_conta || `Conta ${primeira?.id}`;
      const pendentes = parcelas.filter((p) => p.status !== "CANCELADO" && !isPaga(p));
      const primeiraVenc =
        pendentes
          .sort((a, b) => {
            const ka = String(a.data_vencimento ?? "").split(/[T ]/)[0];
            const kb = String(b.data_vencimento ?? "").split(/[T ]/)[0];
            return ka.localeCompare(kb);
          })[0]
          ?.data_vencimento ??
        primeira?.data_vencimento;

      const todasCanceladas =
        parcelas.length > 0 &&
        parcelas.every((p) => String(p.status ?? "").toUpperCase() === "CANCELADO");
      const valorPagoGrupo = parcelas.reduce((s, p) => s + valorPagoConta(p), 0);
      const semValorPago = valorPagoGrupo <= 0.009;
      const jaVenceu = parcelas.some((p) => contaEstaVencidaLocal(p));
      let statusConsolidado = "Pendente";
      const ehPrevisao = parcelas.some((p) => contaEhPrevisao(p));
      if (ehPrevisao) statusConsolidado = "Previsão";
      else if (todasCanceladas) statusConsolidado = "Cancelado";
      else if (restantes === 0 && pagas > 0) statusConsolidado = "Pago Total";
      else if (!semValorPago) statusConsolidado = "Pago Parcial";
      else if (semValorPago && jaVenceu) statusConsolidado = "Vencida";

      const pedidoIdNum =
        primeira?.pedido_id != null && Number(primeira.pedido_id) > 0
          ? Number(primeira.pedido_id)
          : undefined;

      result.push({
        key,
        pedido_id: pedidoIdNum,
        descricaoBase,
        parcelas: [...parcelas].sort((a, b) => (a.numero_parcela ?? 1) - (b.numero_parcela ?? 1)),
        total_parcelas: total,
        parcelas_pagas: pagas,
        parcelas_restantes: restantes,
        valor_aberto: valorAberto,
        cliente_nome:
          (primeira as ContaFinanceira & {
            cliente?: { nome?: string };
            cliente_nome?: string;
          })?.cliente?.nome ||
          (primeira as ContaFinanceira & { cliente_nome?: string })?.cliente_nome ||
          cliente?.nome ||
          "—",
        categoria: pedidoIdNum != null ? "Vendas" : "Avulso",
        primeira_vencimento: primeiraVenc,
        statusConsolidado,
        ehPrevisao,
        data_prevista: primeira?.data_prevista ?? null,
      });
    });

    if (!searchTerm.trim()) return result;
    const termRaw = searchTerm.trim().toLowerCase();
    const termDot = termRaw.replace(',', '.');
    return result.filter((g) => {
      const rocaNomes = g.parcelas
        .map((p) => p.roca_nome)
        .filter((n): n is string => !!n?.trim());
      const rocaTxt = rocaNomes.join(" ").toLowerCase();
      const valAbertoStr = String(g.valor_aberto);
      return (
        g.descricaoBase.toLowerCase().includes(termRaw) ||
        g.cliente_nome.toLowerCase().includes(termRaw) ||
        String(g.pedido_id ?? "").includes(termRaw) ||
        valAbertoStr.includes(termRaw) || valAbertoStr.includes(termDot) ||
        g.parcelas.some((p) => String(p.id ?? "").includes(termRaw)) ||
        g.parcelas.some((p) =>
          String(
            (p as ContaFinanceira & {
              pedido?: { numero_pedido?: string };
              numero_pedido?: string;
            }).pedido?.numero_pedido ??
              (p as ContaFinanceira & { numero_pedido?: string }).numero_pedido ??
              "",
          )
            .toLowerCase()
            .includes(termRaw),
        ) ||
        g.parcelas.some((p) => (p.numero_conta ?? "").toLowerCase().includes(termRaw)) ||
        g.parcelas.some((p) => String(p.valor_original ?? "").includes(termRaw) || String(p.valor_original ?? "").includes(termDot)) ||
        g.parcelas.some((p) => String(p.valor_pago ?? "").includes(termRaw) || String(p.valor_pago ?? "").includes(termDot)) ||
        rocaTxt.includes(termRaw)
      );
    });
  }, [contasExibir, clientes, searchTerm]);

  // Filtrar linhas e grupos pelo card clicado e pela folha de filtros (status)
  const filteredLinhasPedidos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return linhasPedidos.filter((p: ContaReceber) => {
      const raw = p.data_vencimento ?? p.data_pedido;
      const dataVenc = parseDateOnlyLocal(raw) ?? new Date(raw);
      dataVenc.setHours(0, 0, 0, 0);

      if (statusFilter === "ABERTO" || statusFilter === "PARCIAL" || statusFilter === "QUITADO") {
        if (p.status !== statusFilter) return false;
      }
      if (statusFilter === "VENCIDO") {
        const st = (p.status || "").toUpperCase();
        if (st === "QUITADO" || st === "PAGO_TOTAL") return false;
        if (dataVenc.getTime() >= hoje.getTime()) return false;
        return Number(p.valor_em_aberto ?? 0) > 0.009;
      }

      if (activeCardFilter === "a_receber") {
        const st = (p.status || "").toUpperCase();
        if (st === "QUITADO" || st === "PAGO_TOTAL" || st === "CANCELADO") return false;
        return Number(p.valor_em_aberto ?? 0) > 0.009;
      }
      if (activeCardFilter === "valor_pago") return p.status === "PARCIAL" || p.status === "QUITADO";
      return true;
    });
  }, [linhasPedidos, activeCardFilter, statusFilter]);

  const filteredGruposContas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return gruposContas.filter((g) => {
      if (statusFilter === "ABERTO" || statusFilter === "PARCIAL" || statusFilter === "QUITADO") {
        const match =
          (statusFilter === "ABERTO" && g.statusConsolidado === "Pendente") ||
          (statusFilter === "PARCIAL" && g.statusConsolidado === "Pago Parcial") ||
          (statusFilter === "QUITADO" && g.statusConsolidado === "Pago Total");
        if (!match) return false;
      }

      if (statusFilter === "VENCIDO") {
        if (!g.primeira_vencimento) return false;
        const dataVenc = parseDateOnlyLocal(g.primeira_vencimento);
        if (!dataVenc) return false;
        dataVenc.setHours(0, 0, 0, 0);
        if (dataVenc.getTime() >= hoje.getTime()) return false;
        return g.valor_aberto > 0.009;
      }

      if (activeCardFilter === "a_receber") return g.valor_aberto > 0.009;
      if (activeCardFilter === "valor_pago") {
        return g.statusConsolidado === "Pago Parcial" || g.statusConsolidado === "Pago Total";
      }
      if (activeCardFilter === "vencidas") {
        return g.parcelas.some((p) => contaEstaVencidaLocal(p)) && g.valor_aberto > 0.009;
      }
      if (activeCardFilter === "vencendo_hoje") {
        return g.parcelas.some((p) => contaVenceHojeLocal(p)) && g.valor_aberto > 0.009;
      }
      if (activeCardFilter === "vencendo_este_mes") {
        return g.parcelas.some((p) => contaVenceEsteMesLocal(p)) && g.valor_aberto > 0.009;
      }
      return true;
    });
  }, [gruposContas, activeCardFilter, statusFilter]);

  // Transações para exibição: Valor = total da conta; Valor Pago = valor já recebido. Ignora linhas com numero_pedido inválido (ex: "Pedido").
  const transacoesDisplayReceber = useMemo(() => {
    return filteredLinhasPedidos
      .filter((p: ContaReceber) => {
        const num = (p.numero_pedido || "").trim();
        return num.length > 0 && num.toLowerCase() !== "pedido";
      })
      .map((p: ContaReceber) => {
        const diasAteVencimento = calcularDiasAteVencimento(p.data_vencimento ?? p.data_pedido);
        const vencimentoStatus = getVencimentoStatus(diasAteVencimento, p.status);
        const statusFormatado =
          p.status === "PARCIAL"
            ? "Pago Parcial"
            : p.status === "QUITADO"
              ? "Pago Total"
            : formatarStatus(p.status);
        return {
          id: p.numero_pedido,
          descricao: `Pedido ${p.numero_pedido}`,
          cliente: p.cliente_nome || "—",
          roca_nome: (p as ContaReceber & { roca_nome?: string | null }).roca_nome ?? null,
          categoria: "Vendas",
          valorTotalNum: Number(p.valor_total ?? 0),
          valorPagoNum: Number(p.valor_pago ?? 0),
          valor: formatarMoeda(p.valor_total),
          valorPago: formatarMoeda(p.valor_pago ?? 0),
          valorAberto: Number(p.valor_em_aberto ?? 0),
          data: p.data_vencimento
            ? formatDate(p.data_vencimento)
            : formatDate(p.data_pedido),
          vencimentoStatus,
          status: statusFormatado,
          pedidoId: p.pedido_id,
        };
      });
  }, [filteredLinhasPedidos]);

  const transacoesDisplayGrupos = useMemo(() => {
    return filteredGruposContas.map((g) => {
      const diasAteVencimento = calcularDiasAteVencimento(
        g.ehPrevisao ? (g.data_prevista ?? undefined) : (g.primeira_vencimento ?? undefined),
      );
      const vencimentoStatus = getVencimentoStatus(
        diasAteVencimento,
        g.ehPrevisao
          ? "PREVISAO"
          : g.statusConsolidado === "Pago Total"
            ? "QUITADO"
            : "ABERTO",
      );
      const totalGrupo = g.parcelas.reduce(
        (s, p) => s + valorPrincipalConta(p),
        0,
      );
      const valorPagoGrupo = g.parcelas.reduce(
        (s, p) => s + valorPagoConta(p),
        0,
      );
      const primeiraParcela = g.parcelas[0];
      const numeroPedido =
        g.parcelas
          .map((p) => {
            const fromPedido = (p as ContaFinanceira & {
              pedido?: { numero_pedido?: string };
              numero_pedido?: string;
            }).pedido?.numero_pedido
              ?? (p as ContaFinanceira & { numero_pedido?: string }).numero_pedido;
            if (fromPedido?.trim()) return fromPedido.trim();
            const desc = String(p.descricao ?? "");
            const m = desc.match(/\b((?:VEND|PED)[- ]?\d{4}[- ]?\d+)\b/i);
            return m?.[1] ?? null;
          })
          .find((n): n is string => !!n) ?? null;
      const idExibicao =
        numeroPedido ||
        primeiraParcela?.numero_conta ||
        g.descricaoBase?.split(" ")[0] ||
        g.key;
      const rocaNomes = g.parcelas
        .map((p) => (p as { roca_nome?: string | null }).roca_nome)
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0);
      const rocaExibicao =
        rocaNomes.length === 0
          ? null
          : Array.from(new Set(rocaNomes)).join(", ");
      return {
        id: idExibicao,
        descricao: g.descricaoBase,
        cliente: g.cliente_nome,
        roca_nome: rocaExibicao,
        categoria: g.categoria,
        valor: formatarMoeda(totalGrupo),
        valorPago: formatarMoeda(valorPagoGrupo),
        data: g.ehPrevisao
          ? g.data_prevista
            ? formatDate(g.data_prevista)
            : "—"
          : g.primeira_vencimento
            ? formatDate(g.primeira_vencimento)
            : "—",
        vencimentoStatus,
        status: g.statusConsolidado,
        pedidoId: g.pedido_id,
        grupoKey: g.key,
        ehPrevisao: g.ehPrevisao,
        contaId: primeiraParcela?.id,
        parcelasPagas: g.parcelas_pagas,
        totalParcelas: g.total_parcelas,
      };
    });
  }, [filteredGruposContas]);

  const sortedTransacoesDisplayReceber = useMemo(() => {
    let list = transacoesDisplayReceber;
    if (!sortColumn) return list;

    const parseCurrencyOrNum = (val: any): number => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      const cleaned = String(val)
        .replace(/[^\d,-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    const parseDateBR = (val: any): number => {
      if (!val || val === "—" || val === "N/A") return 0;
      const str = String(val).trim();
      const parts = str.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
      const t = new Date(str).getTime();
      return isNaN(t) ? 0 : t;
    };

    return [...list].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortColumn) {
        case "id":
          valA = a.id ?? "";
          valB = b.id ?? "";
          break;
        case "cliente":
          valA = (a.cliente ?? "").toLowerCase();
          valB = (b.cliente ?? "").toLowerCase();
          break;
        case "empresa":
          valA = (a.roca_nome ?? "").toLowerCase();
          valB = (b.roca_nome ?? "").toLowerCase();
          break;
        case "valor":
          valA = a.valorTotalNum ?? parseCurrencyOrNum(a.valor);
          valB = b.valorTotalNum ?? parseCurrencyOrNum(b.valor);
          break;
        case "valorPago":
          valA = a.valorPagoNum ?? parseCurrencyOrNum(a.valorPago);
          valB = b.valorPagoNum ?? parseCurrencyOrNum(b.valorPago);
          break;
        case "dataVencimento":
          valA = parseDateBR(a.data);
          valB = parseDateBR(b.data);
          break;
        case "status":
          valA = (a.status ?? "").toLowerCase();
          valB = (b.status ?? "").toLowerCase();
          break;
        default:
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [transacoesDisplayReceber, sortColumn, sortDirection]);

  const sortedTransacoesDisplayGrupos = useMemo(() => {
    let list = transacoesDisplayGrupos;
    if (!sortColumn) return list;

    const parseCurrencyOrNum = (val: any): number => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      const cleaned = String(val)
        .replace(/[^\d,-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    const parseDateBR = (val: any): number => {
      if (!val || val === "—" || val === "N/A") return 0;
      const str = String(val).trim();
      const parts = str.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
      const t = new Date(str).getTime();
      return isNaN(t) ? 0 : t;
    };

    return [...list].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortColumn) {
        case "id":
          valA = a.id ?? "";
          valB = b.id ?? "";
          break;
        case "cliente":
          valA = (a.cliente ?? "").toLowerCase();
          valB = (b.cliente ?? "").toLowerCase();
          break;
        case "empresa":
          valA = (a.roca_nome ?? "").toLowerCase();
          valB = (b.roca_nome ?? "").toLowerCase();
          break;
        case "valor":
          valA = parseCurrencyOrNum(a.valor);
          valB = parseCurrencyOrNum(b.valor);
          break;
        case "valorPago":
          valA = parseCurrencyOrNum(a.valorPago);
          valB = parseCurrencyOrNum(b.valorPago);
          break;
        case "dataVencimento":
          valA = parseDateBR(a.data);
          valB = parseDateBR(b.data);
          break;
        case "status":
          valA = (a.status ?? "").toLowerCase();
          valB = (b.status ?? "").toLowerCase();
          break;
        default:
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [transacoesDisplayGrupos, sortColumn, sortDirection]);

  /** Card ativo de vencimento: valor = quantidade de pedidos na tabela (rodapé). */
  // O card ativo mantém a contagem do resumo (antes era trocada pela quantidade de
  // linhas da tabela, que fica 0 enquanto a lista recarrega após o clique).
  const statsCardItems = useMemo((): ModuleStatCardItem[] => {
    return stats.map((stat) => ({
      key: stat.key,
      label: stat.label,
      value: stat.value,
      iconWrap: stat.iconWrap,
      iconClass: stat.iconClass,
      valueClass: stat.valueClass,
      cardClassName: stat.cardClassName,
      labelClassName: stat.labelClassName,
      Icon: stat.Icon,
      labelExtra: stat.key === "a_receber" ? totalReceberTooltip : undefined,
      active: activeCardFilter === stat.filterKey,
      onClick: () =>
        setActiveCardFilter((prev) =>
          prev === stat.filterKey ? "todos" : stat.filterKey,
        ),
    }));
  }, [
    stats,
    activeCardFilter,
    totalReceberTooltip,
  ]);

  // Filtrar por busca e por card ativo (mantido para fallback contas-financeiras)
  const filteredTransacoes = useMemo(() => {
    let filtered = transacoesDisplay;

    // Busca numérica por ID
    if (isNumericSearch && contaPorId && contaPorId.tipo === "RECEBER") {
      const contaEncontrada = contas.find(c => c.id === contaPorId.id);
      if (contaEncontrada) {
        const conta = contaEncontrada;
        let nomeCliente = "N/A";
        let categoria = "N/A";
        
        if (conta.cliente_id) {
          const cliente = clientes.find(c => c.id === conta.cliente_id);
          nomeCliente = cliente?.nome || "Cliente não encontrado";
          categoria = "Vendas";
        }

        const valorFormatado = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(valorPrincipalConta(conta));
        const valorPagoFormatado = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(valorPagoConta(conta));

        const dataFormatada = conta.data_vencimento
          ? formatDate(conta.data_vencimento)
          : "N/A";

        const statusMap: Record<string, string> = {
          "PENDENTE": "Pendente",
          "PREVISAO": "Previsão",
          "PAGO_PARCIAL": "Pago Parcial",
          "PAGO_TOTAL": "Pago Total",
          "VENCIDO": "Vencido",
          "CANCELADO": "Cancelado",
        };
        const statusFormatado = statusMap[conta.status] || conta.status;
        const ehPrevisao = contaEhPrevisao(conta);

        const diasAteVencimento = conta.dias_ate_vencimento !== undefined 
          ? conta.dias_ate_vencimento 
          : calcularDiasAteVencimento(conta.data_vencimento);
        
        const vencimentoStatus = getVencimentoStatus(
          diasAteVencimento,
          ehPrevisao ? "PREVISAO" : conta.status,
        );

        return [{
          id: conta.numero_conta || `CONTA-${conta.id}`,
          descricao: formatarDescricao(conta),
          categoria: categoria,
          valor: valorFormatado,
          valorPago: valorPagoFormatado,
          data: ehPrevisao
            ? conta.data_prevista
              ? formatDate(conta.data_prevista)
              : "—"
            : dataFormatada,
          status: statusFormatado,
          statusOriginal: conta.status,
          contaId: conta.id,
          cliente: nomeCliente,
          diasAteVencimento,
          vencimentoStatus,
          ehPrevisao,
        }];
      }
    }

    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      const termRaw = searchTerm.trim().toLowerCase();
      const termDot = termRaw.replace(',', '.');
      filtered = filtered.filter(t => {
        const rocaNome = (t as { roca_nome?: string | null }).roca_nome ?? "";
        const valStr = t.valor ? String(t.valor).toLowerCase() : "";
        const valPagoStr = t.valorPago ? String(t.valorPago).toLowerCase() : "";
        
        const conta = contas.find(c => c.id === t.contaId);
        const valOrigStr = conta?.valor_original != null ? String(conta.valor_original) : "";
        const valPagoContaStr = conta?.valor_pago != null ? String(conta.valor_pago) : "";
        const valRestStr = (conta as any)?.valor_restante != null ? String((conta as any).valor_restante) : "";

        const matchesSearch = 
          t.descricao.toLowerCase().includes(termRaw) || 
          t.id.toLowerCase().includes(termRaw) ||
          t.cliente.toLowerCase().includes(termRaw) ||
          rocaNome.toLowerCase().includes(termRaw) ||
          valStr.includes(termRaw) || valStr.includes(termDot) ||
          valPagoStr.includes(termRaw) || valPagoStr.includes(termDot) ||
          valOrigStr.includes(termRaw) || valOrigStr.includes(termDot) ||
          valPagoContaStr.includes(termRaw) || valPagoContaStr.includes(termDot) ||
          valRestStr.includes(termRaw) || valRestStr.includes(termDot);
        return matchesSearch;
      });
    }

    // Aplicar ordenação por coluna
    if (sortColumn) {
      const parseCurrencyOrNum = (val: any): number => {
        if (typeof val === "number") return val;
        if (!val) return 0;
        const cleaned = String(val)
          .replace(/[^\d,-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      const parseDateBR = (val: any): number => {
        if (!val || val === "—" || val === "N/A") return 0;
        const str = String(val).trim();
        const parts = str.split("/");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          return new Date(year, month, day).getTime();
        }
        const t = new Date(str).getTime();
        return isNaN(t) ? 0 : t;
      };

      filtered = [...filtered].sort((a, b) => {
        let valA: any = "";
        let valB: any = "";

        switch (sortColumn) {
          case "id":
            valA = a.id ?? "";
            valB = b.id ?? "";
            break;
          case "cliente":
            valA = ((a as any).cliente ?? (a as any).fornecedor ?? "").toLowerCase();
            valB = ((b as any).cliente ?? (b as any).fornecedor ?? "").toLowerCase();
            break;
          case "empresa":
            valA = ((a as { roca_nome?: string | null }).roca_nome ?? "").toLowerCase();
            valB = ((b as { roca_nome?: string | null }).roca_nome ?? "").toLowerCase();
            break;
          case "valor":
            valA = parseCurrencyOrNum(a.valor);
            valB = parseCurrencyOrNum(b.valor);
            break;
          case "valorPago":
            valA = parseCurrencyOrNum(a.valorPago);
            valB = parseCurrencyOrNum(b.valorPago);
            break;
          case "dataVencimento":
            valA = parseDateBR((a as { data?: string }).data);
            valB = parseDateBR((b as { data?: string }).data);
            break;
          case "status":
            valA = (a.status ?? "").toLowerCase();
            valB = (b.status ?? "").toLowerCase();
            break;
          default:
            break;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [transacoesDisplay, searchTerm, isNumericSearch, contaPorId, contas, clientes, activeCardFilter, sortColumn, sortDirection]);

  // Debug: verificar se as contas estão sendo carregadas (após transacoesDisplay ser definido)
  useEffect(() => {
    console.log('🔍 [ContasAReceber] Contas carregadas:', contas.length, contas);
    console.log('🔍 [ContasAReceber] Total:', totalContas);
    console.log('🔍 [ContasAReceber] Transações display:', transacoesDisplay.length);
  }, [contas, totalContas, transacoesDisplay]);

  const handleCreate = () => {
    if (!newTransacao.descricao || !newTransacao.valor_original || !newTransacao.data_vencimento) {
      toast.error("Preencha os campos obrigatórios (Descrição, Valor e Data de Vencimento)");
      return;
    }

    const contaData: CreateContaFinanceiraDto = {
      tipo: "RECEBER",
      descricao: newTransacao.descricao,
      valor_original: Number(newTransacao.valor_original),
      data_emissao: newTransacao.data_emissao,
      data_vencimento: newTransacao.data_vencimento,
      cliente_id: newTransacao.cliente_id || undefined,
      pedido_id: newTransacao.pedido_id || undefined,
      roca_id: newTransacao.roca_id || undefined,
      forma_pagamento: newTransacao.forma_pagamento || undefined,
      data_pagamento: newTransacao.data_pagamento || undefined,
      observacoes: newTransacao.observacoes || undefined,
    };

    createContaMutation.mutate(contaData);
  };

  const isLoadingCards =
    isLoadingReceber || (temFiltrosAtivos && isLoadingContasParaCards);

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={DollarSign}
          title="Contas a Receber"
          subtitle="Gerencie recebimentos por cliente e parcela, com visão clara do que está em aberto."
          loadingHint={isLoadingCards ? "Carregando resumo e contas…" : undefined}
        />

        <ModuleStatCards
          isLoading={isLoadingCards}
          columns={5}
          items={statsCardItems}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Conta a Receber</DialogTitle>
                <DialogDescription>
                  Preencha os campos abaixo para registrar uma nova conta a receber.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Informações Básicas
                  </h3>
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input 
                      placeholder="Ex: Recebimento de venda"
                      value={newTransacao.descricao}
                      onChange={(e) => setNewTransacao({...newTransacao, descricao: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor Original *</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newTransacao.valor_original || ""}
                        onChange={(e) => setNewTransacao({...newTransacao, valor_original: e.target.value ? Number(e.target.value) : 0})}
                      />
                    </div>
                  </div>
                </div>

                {/* Relacionamentos */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-blue-500" />
                    Relacionamentos
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select
                        value={newTransacao.cliente_id?.toString() || undefined}
                        onValueChange={(value) => 
                          setNewTransacao({
                            ...newTransacao, 
                            cliente_id: value && value !== "none" ? Number(value) : undefined
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id.toString()}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pedido</Label>
                      <Select
                        value={newTransacao.pedido_id?.toString() || undefined}
                        onValueChange={(value) => 
                          setNewTransacao({
                            ...newTransacao, 
                            pedido_id: value && value !== "none" ? Number(value) : undefined
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um pedido" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {pedidos.map((pedido) => (
                            <SelectItem key={pedido.pedido_id} value={pedido.pedido_id.toString()}>
                              {pedido.numero_pedido || `PED-${pedido.pedido_id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{rotulo.singular} (opcional)</Label>
                      <Select
                        value={
                          newTransacao.roca_id != null
                            ? String(newTransacao.roca_id)
                            : "none"
                        }
                        onValueChange={(value) =>
                          setNewTransacao({
                            ...newTransacao,
                            roca_id:
                              value && value !== "none"
                                ? Number(value)
                                : undefined,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={rotulo.selecione} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {rocasLista
                            .filter((r) => r.ativo !== false)
                            .map((roca) => (
                              <SelectItem key={roca.id} value={String(roca.id)}>
                                {roca.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Datas
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Emissão *</Label>
                      <Input 
                        type="date"
                        value={newTransacao.data_emissao}
                        onChange={(e) => setNewTransacao({...newTransacao, data_emissao: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Vencimento *</Label>
                      <Input 
                        type="date"
                        value={newTransacao.data_vencimento}
                        onChange={(e) => setNewTransacao({...newTransacao, data_vencimento: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Pagamento</Label>
                      <Input 
                        type="date"
                        value={newTransacao.data_pagamento || ""}
                        onChange={(e) => setNewTransacao({...newTransacao, data_pagamento: e.target.value || undefined})}
                      />
                    </div>
                  </div>
                </div>

                {/* Pagamento */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    Pagamento
                  </h3>
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={newTransacao.forma_pagamento || undefined}
                      onValueChange={(value) => 
                        setNewTransacao({
                          ...newTransacao, 
                          forma_pagamento: value ? (value as any) : undefined
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                        <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                        <SelectItem value="BOLETO">Boleto</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Observações
                  </h3>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Observações adicionais sobre a conta a receber"
                      value={newTransacao.observacoes || ""}
                      onChange={(e) => setNewTransacao({...newTransacao, observacoes: e.target.value || undefined})}
                      rows={4}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreate} 
                  className="w-full" 
                  variant="gradient"
                  disabled={createContaMutation.isPending}
                >
                  {createContaMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar Conta a Receber"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        {viewMode === "clientes" ? (
          <ContasAReceberListaClientes contas={contasExibir} isLoading={isLoadingContas} />
        ) : (
          <>
        {/* Search and Filters (mesmo design da página Fornecedores) */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setFiltrosDialogOpen(true)}
              style={
                temFiltrosAtivos
                  ? { borderColor: "var(--primary)", borderWidth: "2px" }
                  : {}
              }
            >
              <Filter className="w-4 h-4" />
              Filtros
              {temFiltrosAtivos && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {(clienteFilterId != null && clienteFilterId > 0 ? 1 : 0) +
                    (rocaFilterId != null && rocaFilterId > 0 ? 1 : 0) +
                    (statusFilter ? 1 : 0) +
                    (campoDataFilter !== "vencimento" ? 1 : 0) +
                    (dataInicialFilter ? 1 : 0) +
                    (dataFinalFilter ? 1 : 0)}
                </span>
              )}
            </Button>
            <Sheet open={filtrosDialogOpen} onOpenChange={handleOpenFiltros}>
              <SheetContent
                side="right"
                className="w-[400px] sm:w-[540px] overflow-y-auto"
              >
                <SheetHeader className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Filter className="w-5 h-5 text-primary" />
                    </div>
                    <SheetTitle className="text-xl">
                      Filtros Avançados
                    </SheetTitle>
                  </div>
                  <SheetDescription>Refine sua busca</SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Cliente */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Cliente</Label>
                    <Select
                      value={draftClienteFilterId == null ? "todos" : String(draftClienteFilterId)}
                      onValueChange={(v) => setDraftClienteFilterId(v === "todos" ? null : parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os clientes</SelectItem>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Roça */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{rotulo.singular}</Label>
                    <Select
                      value={draftRocaFilterId == null ? "todos" : String(draftRocaFilterId)}
                      onValueChange={(v) =>
                        setDraftRocaFilterId(v === "todos" ? null : parseInt(v, 10))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={rotulo.todas} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">{rotulo.todas}</SelectItem>
                        {rocasLista
                          .filter((r) => r.ativo !== false)
                          .map((roca) => (
                            <SelectItem key={roca.id} value={String(roca.id)}>
                              {roca.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Filtrar período por + Período */}
                  <div className="space-y-4 rounded-xl border border-border/80 bg-muted/30 p-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-[#1A3B70]">Filtrar período por</Label>
                      <RadioGroup
                        value={draftCampoDataFilter}
                        onValueChange={(v) =>
                          setDraftCampoDataFilter(v as "vencimento" | "emissao" | "pagamento")
                        }
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="vencimento" id="filtro-avancado-receber-campo-vencimento" />
                          <Label htmlFor="filtro-avancado-receber-campo-vencimento" className="cursor-pointer">
                            Data de vencimento
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="emissao" id="filtro-avancado-receber-campo-emissao" />
                          <Label htmlFor="filtro-avancado-receber-campo-emissao" className="cursor-pointer">
                            Data de emissão
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pagamento" id="filtro-avancado-receber-campo-pagamento" />
                          <Label htmlFor="filtro-avancado-receber-campo-pagamento" className="cursor-pointer">
                            Data de pagamento
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-[#1A3B70]">Período</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                          <Input
                            type="date"
                            className="[color-scheme:light]"
                            value={draftDataInicialFilter}
                            onChange={(e) => setDraftDataInicialFilter(e.target.value || "")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Data Final</Label>
                          <Input
                            type="date"
                            className="[color-scheme:light]"
                            value={draftDataFinalFilter}
                            onChange={(e) => setDraftDataFinalFilter(e.target.value || "")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Status */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Status</Label>
                    <RadioGroup
                      value={draftStatusFilter || "todos"}
                      onValueChange={(v) => setDraftStatusFilter(v === "todos" ? "" : v)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="todos" id="status-todos" />
                        <Label htmlFor="status-todos" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-primary" />
                          <span>Todos</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ABERTO" id="status-aberto" />
                        <Label htmlFor="status-aberto" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-amber-500" />
                          <span>Pendente</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PARCIAL" id="status-parcial" />
                        <Label htmlFor="status-parcial" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-blue-500" />
                          <span>Aberto</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="QUITADO" id="status-quitado" />
                        <Label htmlFor="status-quitado" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-green-500" />
                          <span>Quitado</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="VENCIDO" id="status-vencido" />
                        <Label htmlFor="status-vencido" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-red-500" />
                          <span>Vencido</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleAplicarFiltros} className="flex-1">
                      Aplicar Filtros
                    </Button>
                    <Button onClick={handleLimparFiltros} variant="outline" className="flex-1">
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar por número do pedido, cliente, ${rotulo.singularLower}...`}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 shrink-0"
                >
                  <BarChart3 className="w-4 h-4" />
                  Relatórios
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Relatórios</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setRelatorioDataInicial(dataInicialFilter || "");
                    setRelatorioDataFinal(dataFinalFilter || "");
                    setRelatorioStatusFiltro("Todos");
                    setRelatorioCampoData("vencimento");
                    setRelatorioDialogOpen(true);
                  }}
                >
                  Relatório geral
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRelatorioClientePdfOpen(true)}>
                  Relatório financeiro por cliente
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRelatorioProdutosClienteOpen(true)}
                >
                  Relatório de produtos por cliente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Dialog open={relatorioDialogOpen} onOpenChange={setRelatorioDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório geral</DialogTitle>
              <DialogDescription>
                Inclui dados da empresa e todos os lançamentos de contas a receber conforme os
                filtros selecionados (período por data de vencimento, emissão ou pagamento e status).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Filtrar período por</Label>
                  <RadioGroup
                    value={relatorioCampoData}
                    onValueChange={(v) =>
                      setRelatorioCampoData(v as "vencimento" | "emissao" | "pagamento")
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vencimento" id="relatorio-geral-receber-campo-vencimento" />
                      <Label htmlFor="relatorio-geral-receber-campo-vencimento" className="cursor-pointer">
                        Data de vencimento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="emissao" id="relatorio-geral-receber-campo-emissao" />
                      <Label htmlFor="relatorio-geral-receber-campo-emissao" className="cursor-pointer">
                        Data de emissão
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pagamento" id="relatorio-geral-receber-campo-pagamento" />
                      <Label htmlFor="relatorio-geral-receber-campo-pagamento" className="cursor-pointer">
                        Data de pagamento
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <RelatorioPeriodoFinanceiro
                  dataInicial={relatorioDataInicial}
                  dataFinal={relatorioDataFinal}
                  onDataInicial={setRelatorioDataInicial}
                  onDataFinal={setRelatorioDataFinal}
                />

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Status</Label>
                  <RadioGroup
                    value={relatorioStatusFiltro}
                    onValueChange={setRelatorioStatusFiltro}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Todos" id="relatorio-geral-receber-status-todos" /><Label htmlFor="relatorio-geral-receber-status-todos" className="cursor-pointer">Todos</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PENDENTE" id="relatorio-geral-receber-status-pendente" /><Label htmlFor="relatorio-geral-receber-status-pendente" className="cursor-pointer">Pendente</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_PARCIAL" id="relatorio-geral-receber-status-parcial" /><Label htmlFor="relatorio-geral-receber-status-parcial" className="cursor-pointer">Pago Parcial</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_TOTAL" id="relatorio-geral-receber-status-quitado" /><Label htmlFor="relatorio-geral-receber-status-quitado" className="cursor-pointer">Quitada</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="VENCIDO" id="relatorio-geral-receber-status-vencido" /><Label htmlFor="relatorio-geral-receber-status-vencido" className="cursor-pointer">Vencido</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="CANCELADO" id="relatorio-geral-receber-status-cancelado" /><Label htmlFor="relatorio-geral-receber-status-cancelado" className="cursor-pointer">Cancelado</Label></div>
                  </RadioGroup>
                </div>
              </div>

              {relatorioGeralPreviewFetching && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando filtros…
                </p>
              )}

              {relatorioGeralPreviewError && (
                <p className="text-sm text-destructive">
                  Não foi possível verificar os filtros. Tente novamente.
                </p>
              )}

              {!relatorioGeralPreviewFetching &&
                !relatorioGeralPreviewError &&
                relatorioGeralTotalContas === 0 && (
                  <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm text-[#1A3B70]">
                    {relatorioGeralMensagemSemDados}
                  </p>
                )}

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Button
                    type="button"
                    variant="relatorioPrimary"
                    className="flex-1 gap-2"
                    disabled={
                      relatorioGeralPreviewFetching ||
                      !relatorioGeralTemDados ||
                      relatorioPdfLoading
                    }
                    onClick={async () => {
                      setRelatorioPdfLoading(true);
                      try {
                        await relatoriosClienteService.downloadRelatorioGeralContasReceber(
                          relatorioGeralFiltrosForPdf,
                        );
                        toast.success("PDF baixado.");
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao gerar PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioPdfLoading(false);
                      }
                    }}
                  >
                    {relatorioPdfLoading ? (
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
                    disabled={
                      relatorioGeralPreviewFetching ||
                      !relatorioGeralTemDados ||
                      relatorioPdfLoading
                    }
                    onClick={async () => {
                      setRelatorioPdfLoading(true);
                      try {
                        await relatoriosClienteService.imprimirRelatorioGeralContasReceber(
                          relatorioGeralFiltrosForPdf,
                        );
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao abrir relatório.";
                        toast.error(msg);
                      } finally {
                        setRelatorioPdfLoading(false);
                      }
                    }}
                  >
                    {relatorioPdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    Abrir para imprimir
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={relatorioClientePdfOpen}
          onOpenChange={(open) => {
            setRelatorioClientePdfOpen(open);
            if (open) {
              setRelatorioClienteDataInicial("");
              setRelatorioClienteDataFinal("");
              setRelatorioClienteStatusFiltro("Todos");
              setRelatorioClienteIdSelect(
                clienteFilterId != null ? String(clienteFilterId) : "",
              );
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório financeiro por cliente</DialogTitle>
              <DialogDescription>
                Inclui dados da empresa e todos os lançamentos de contas a receber do cliente
                conforme os filtros selecionados (período por data de vencimento e status).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="relatorio-cliente-select-receber">Cliente</Label>
                <Select
                  value={relatorioClienteIdSelect}
                  onValueChange={setRelatorioClienteIdSelect}
                >
                  <SelectTrigger id="relatorio-cliente-select-receber">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Filtrar período por</Label>
                  <RadioGroup
                    value={relatorioClienteCampoData}
                    onValueChange={(v) =>
                      setRelatorioClienteCampoData(v as "vencimento" | "emissao" | "pagamento")
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vencimento" id="relatorio-cliente-receber-campo-vencimento" />
                      <Label htmlFor="relatorio-cliente-receber-campo-vencimento" className="cursor-pointer">
                        Data de vencimento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="emissao" id="relatorio-cliente-receber-campo-emissao" />
                      <Label htmlFor="relatorio-cliente-receber-campo-emissao" className="cursor-pointer">
                        Data de emissão
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pagamento" id="relatorio-cliente-receber-campo-pagamento" />
                      <Label htmlFor="relatorio-cliente-receber-campo-pagamento" className="cursor-pointer">
                        Data de pagamento
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <Separator />
                <RelatorioPeriodoFinanceiro
                  dataInicial={relatorioClienteDataInicial}
                  dataFinal={relatorioClienteDataFinal}
                  onDataInicial={setRelatorioClienteDataInicial}
                  onDataFinal={setRelatorioClienteDataFinal}
                />
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Status</Label>
                  <RadioGroup value={relatorioClienteStatusFiltro} onValueChange={setRelatorioClienteStatusFiltro} className="space-y-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Todos" id="relatorio-status-todos-receber" /><Label htmlFor="relatorio-status-todos-receber" className="cursor-pointer">Todos</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PENDENTE" id="relatorio-status-pendente-receber" /><Label htmlFor="relatorio-status-pendente-receber" className="cursor-pointer">Pendente</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_PARCIAL" id="relatorio-status-parcial-receber" /><Label htmlFor="relatorio-status-parcial-receber" className="cursor-pointer">Pago Parcial</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_TOTAL" id="relatorio-status-quitado-receber" /><Label htmlFor="relatorio-status-quitado-receber" className="cursor-pointer">Quitada</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="VENCIDO" id="relatorio-status-vencido-receber" /><Label htmlFor="relatorio-status-vencido-receber" className="cursor-pointer">Vencido</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="CANCELADO" id="relatorio-status-cancelado-receber" /><Label htmlFor="relatorio-status-cancelado-receber" className="cursor-pointer">Cancelado</Label></div>
                  </RadioGroup>
                </div>
              </div>
              {relatorioClientePreviewFetching && relatorioClienteIdParsed != null && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Verificando filtros...</p>
              )}
              {relatorioClientePreviewError && relatorioClienteIdParsed != null && (
                <p className="text-sm text-destructive">Não foi possível verificar os filtros. Tente novamente.</p>
              )}
              {!relatorioClientePreviewFetching && !relatorioClientePreviewError && relatorioClienteIdParsed != null && relatorioClientePreviewData?.total === 0 && (
                <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm text-[#1A3B70]">{relatorioClienteMensagemSemDados}</p>
              )}
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Button
                    type="button"
                    variant="relatorioPrimary"
                    className="flex-1 gap-2"
                    disabled={relatorioClienteIdParsed == null || relatorioClientePreviewFetching || !relatorioClienteTemDados || relatorioClientePdfLoading}
                    onClick={async () => {
                      const id = relatorioClienteIdParsed;
                      if (id == null) {
                        toast.error("Selecione um cliente.");
                        return;
                      }
                      setRelatorioClientePdfLoading(true);
                      try {
                        await relatoriosClienteService.downloadRelatorioFinanceiro(id, relatorioClienteFiltrosForPdf);
                        toast.success("PDF baixado.");
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : "Erro ao gerar PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioClientePdfLoading(false);
                      }
                    }}
                  >
                    {relatorioClientePdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Baixar PDF
                  </Button>
                  <Button
                    type="button"
                    variant="relatorioSecondary"
                    className="flex-1 gap-2"
                    disabled={relatorioClienteIdParsed == null || relatorioClientePreviewFetching || !relatorioClienteTemDados || relatorioClientePdfLoading}
                    onClick={async () => {
                      const id = relatorioClienteIdParsed;
                      if (id == null) {
                        toast.error("Selecione um cliente.");
                        return;
                      }
                      setRelatorioClientePdfLoading(true);
                      try {
                        await relatoriosClienteService.imprimirRelatorioFinanceiro(id, relatorioClienteFiltrosForPdf);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : "Erro ao abrir PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioClientePdfLoading(false);
                      }
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Abrir para imprimir
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>ID</span>
                    {sortColumn === "id" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("cliente")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente</span>
                    {sortColumn === "cliente" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("empresa")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{rotulo.singular}</span>
                    {sortColumn === "empresa" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("valor")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Valor</span>
                    {sortColumn === "valor" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("valorPago")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Valor Pago</span>
                    {sortColumn === "valorPago" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("dataVencimento")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Data Vencimento</span>
                    {sortColumn === "dataVencimento" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {sortColumn === "status" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoadingPedidosContasReceber || (usarFallbackContasFinanceiras && isLoadingContas)) ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando contas a receber...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (clienteFilterId != null && clienteFilterId > 0 && !isLoadingPedidosContasReceber && pedidos.length === 0 && (usarFallbackContasFinanceiras ? transacoesDisplayGrupos : transacoesDisplayReceber).length === 0) ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Não há pedidos ou contas desse determinado cliente.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (dataInicialFilter || dataFinalFilter) && !isLoadingPedidosContasReceber && pedidos.length === 0 && (usarFallbackContasFinanceiras ? transacoesDisplayGrupos : transacoesDisplayReceber).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Não há contas no período selecionado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (usarFallbackContasFinanceiras ? transacoesDisplayGrupos : transacoesDisplayReceber).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {pedidos.length === 0 && !isLoadingPedidosContasReceber
                          ? "Não há contas a receber no momento"
                          : dashboardReceber?.total === 0
                          ? "Nenhum pedido em aberto"
                          : "Nenhuma conta a receber encontrada"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : usarFallbackContasFinanceiras ? (
                sortedTransacoesDisplayGrupos.map((transacao) => {
                  const grupo = gruposContas.find((g) => g.key === (transacao as any).grupoKey);
                  return (
                    <TableRow
                      key={(transacao as any).grupoKey}
                      className={cn(
                        (transacao as { ehPrevisao?: boolean }).ehPrevisao &&
                          "border-l-4 border-l-violet-500 bg-violet-500/[0.03]",
                      )}
                    >
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{transacao.id}</span>
                          {(transacao as {
                            parcelasPagas?: number;
                            totalParcelas?: number;
                          }).totalParcelas &&
                            (transacao as { totalParcelas?: number }).totalParcelas! > 1 && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {(transacao as { parcelasPagas?: number }).parcelasPagas ?? 0}/
                              {(transacao as { totalParcelas?: number }).totalParcelas} parcelas pagas
                            </span>
                          )}
                          {(transacao as { ehPrevisao?: boolean }).ehPrevisao ? (
                            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                              Previsão
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{transacao.cliente}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {(transacao as { roca_nome?: string | null }).roca_nome?.trim()
                            ? (transacao as { roca_nome?: string | null }).roca_nome
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{transacao.valor}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{transacao.valorPago}</span>
                      </TableCell>
                      <TableCell>
                        {(transacao as { ehPrevisao?: boolean }).ehPrevisao ? (
                          <span className="text-sm text-muted-foreground">{transacao.data}</span>
                        ) : transacao.status === "Pago Total" || transacao.status === "Cancelado" ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">{transacao.data}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(transacao.status)}`}>
                          {transacao.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TableRowActionsMenu>
                            <DropdownMenuItem onClick={() => {
                              if (grupo?.pedido_id != null) {
                                navigate(`/financeiro/contas-receber/${grupo.pedido_id}`, {
                                  state: { voltarPara: location.pathname + location.search },
                                });
                                return;
                              }
                              const contaIdAvulsa = grupo?.parcelas?.[0]?.id ?? null;
                              if (contaIdAvulsa != null) {
                                navigate(`/financeiro/contas-receber/conta/${contaIdAvulsa}`, {
                                  state: { voltarPara: location.pathname + location.search },
                                });
                                return;
                              }
                              setSelectedContaId(grupo?.parcelas[0]?.id ?? null);
                              setViewDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            {grupo?.parcelas?.[0]?.id != null && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContaId(grupo!.parcelas[0].id);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {grupo?.pedido_id != null && (grupo?.valor_aberto ?? 0) > 0 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(
                                    `/financeiro/contas-receber/${grupo.pedido_id}/pagamentos`,
                                    {
                                      state: { voltarPara: location.pathname + location.search },
                                    },
                                  )
                                }
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pagar
                              </DropdownMenuItem>
                            )}
                            {grupo?.pedido_id == null &&
                              (grupo?.valor_aberto ?? 0) > 0 &&
                              grupo?.parcelas?.[0]?.id != null && (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(
                                    `/financeiro/contas-receber/conta/${grupo.parcelas[0].id}/pagamentos`,
                                    {
                                      state: { voltarPara: location.pathname + location.search },
                                    },
                                  )
                                }
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pagar
                              </DropdownMenuItem>
                            )}
                            {grupo?.pedido_id != null &&
                              (grupo?.valor_aberto ?? 0) <= 0 &&
                              grupo?.statusConsolidado !== "Pago Total" &&
                              grupo?.statusConsolidado !== "Cancelado" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(
                                    `/financeiro/contas-receber/${grupo.pedido_id}/pagamentos`,
                                    {
                                      state: { voltarPara: location.pathname + location.search },
                                    },
                                  )
                                }
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pagar
                              </DropdownMenuItem>
                            )}
                            {(grupo?.parcelas?.[0]?.id != null) && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await financeiroService.downloadReciboPagamento(grupo!.parcelas![0].id);
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
                            {(() => {
                              const eOrigemManual = grupo?.pedido_id == null && (grupo?.parcelas?.[0]?.id != null || (transacao as any)?.contaId != null);
                              const contaIdEstorno = grupo?.parcelas?.[0]?.id ?? (transacao as any)?.contaId;
                              const st = String(transacao.status || grupo?.statusConsolidado || "").toUpperCase();
                              const stLabel = String(transacao.status || grupo?.statusConsolidado || "").toLowerCase();
                              const isPagoTotalOuParcial =
                                st === "PAGO_TOTAL" ||
                                st === "QUITADO" ||
                                st === "PAGO_PARCIAL" ||
                                st === "PARCIAL" ||
                                stLabel === "pago total" ||
                                stLabel === "quitado" ||
                                stLabel === "pago parcial" ||
                                stLabel === "parcial";

                              if (eOrigemManual && isPagoTotalOuParcial && contaIdEstorno != null) {
                                return (
                                  <DropdownMenuItem
                                    className="text-amber-600 focus:text-amber-600"
                                    onClick={() => {
                                      setContaEstornar({
                                        id: Number(contaIdEstorno),
                                        label: String(
                                          grupo?.parcelas?.[0]?.numero_conta || transacao.id || `Conta #${contaIdEstorno}`,
                                        ),
                                      });
                                      setMotivoEstorno("");
                                    }}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Cancelar Recebimento
                                  </DropdownMenuItem>
                                );
                              }
                              return null;
                            })()}
                            {grupo?.pedido_id != null &&
                              grupo?.statusConsolidado !== "Cancelado" &&
                              grupo?.statusConsolidado !== "Pago Total" && (
                              <DropdownMenuItem
                                className="text-orange-600 focus:text-orange-600"
                                onClick={() =>
                                  setPedidoCancelar({
                                    id: grupo.pedido_id!,
                                    label:
                                      grupo.parcelas?.[0]?.numero_conta ||
                                      `Pedido #${grupo.pedido_id}`,
                                  })
                                }
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Cancelar pedido
                              </DropdownMenuItem>
                            )}
                            {(() => {
                              const pedidoId = grupo?.pedido_id;
                              const contaId = grupo?.parcelas?.[0]?.id ?? (transacao as any)?.contaId;
                              const st = String(transacao.status || grupo?.statusConsolidado || "").toUpperCase();
                              const stLabel = String(transacao.status || grupo?.statusConsolidado || "").toLowerCase();
                              const quitado =
                                st === "QUITADO" ||
                                st === "PAGO_TOTAL" ||
                                stLabel === "quitado" ||
                                stLabel === "pago total";

                              if (pedidoId != null) {
                                if (quitado) return null;
                                return (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      setItemApagar({
                                        tipo: "pedido",
                                        id: Number(pedidoId),
                                        label:
                                          grupo?.parcelas?.[0]?.numero_conta ||
                                          `Pedido #${pedidoId}`,
                                      })
                                    }
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                );
                              }

                              if (contaId != null) {
                                return (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      setItemApagar({
                                        tipo: "conta",
                                        id: Number(contaId),
                                        label:
                                          grupo?.parcelas?.[0]?.numero_conta ||
                                          `Conta #${contaId}`,
                                      })
                                    }
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                );
                              }
                              return null;
                            })()}
                        </TableRowActionsMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                sortedTransacoesDisplayReceber.map((transacao) => (
                  <TableRow key={`${transacao.id}-${transacao.pedidoId}`}>
                    <TableCell>
                      <span className="font-medium">{transacao.id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{transacao.cliente}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {transacao.roca_nome?.trim() ? transacao.roca_nome : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{transacao.valor}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{transacao.valorPago}</span>
                    </TableCell>
                    <TableCell>
                      {transacao.status === "Quitado" || transacao.status === "Cancelado" ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{transacao.data}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(transacao.status)}`}>
                        {transacao.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TableRowActionsMenu>
                          <DropdownMenuItem onClick={() => navigate(`/financeiro/contas-receber/${transacao.pedidoId}`, { state: { voltarPara: location.pathname + location.search } })}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {transacao.pedidoId ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const contaId = await financeiroService.getContaIdPorPedidoId(
                                    transacao.pedidoId!,
                                    "RECEBER",
                                  );
                                  if (contaId == null) {
                                    toast.error("Conta financeira não encontrada para este pedido.");
                                    return;
                                  }
                                  setSelectedContaId(contaId);
                                  setEditDialogOpen(true);
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error
                                      ? e.message
                                      : "Não foi possível abrir a edição.",
                                  );
                                }
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          ) : null}
                          {(() => {
                            const t = transacao as {
                              valorAberto?: number;
                              valorTotalNum?: number;
                              valorPagoNum?: number;
                            };
                            const aberto =
                              Number(t.valorAberto ?? 0) > 0
                                ? Number(t.valorAberto ?? 0)
                                : Math.max(
                                    0,
                                    Number(t.valorTotalNum ?? 0) -
                                      Number(t.valorPagoNum ?? 0),
                                  );
                            const st = (transacao.status || "").toLowerCase();
                            const podeReceber =
                              !!transacao.pedidoId &&
                              aberto > 0 &&
                              st !== "quitado" &&
                              st !== "pago total" &&
                              st !== "cancelado";
                            return podeReceber;
                          })() ? (
                            <DropdownMenuItem onClick={() => navigate(`/financeiro/contas-receber/${transacao.pedidoId}/pagamentos`, { state: { voltarPara: location.pathname + location.search } })}>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Pagar
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const pedidoId = transacao.pedidoId;
                                if (pedidoId == null) {
                                  toast.error('Conta financeira não encontrada para este pedido.');
                                  return;
                                }
                                const contaId = await financeiroService.getContaIdPorPedidoId(pedidoId, 'RECEBER');
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
                          {(() => {
                            const contaIdEstorno = (transacao as any).contaId;
                            const eOrigemManual = !transacao.pedidoId && contaIdEstorno != null;
                            const st = String(transacao.status || "").toUpperCase();
                            const stLabel = String(transacao.status || "").toLowerCase();
                            const isPagoTotalOuParcial =
                              st === "PAGO_TOTAL" ||
                              st === "QUITADO" ||
                              st === "PAGO_PARCIAL" ||
                              st === "PARCIAL" ||
                              stLabel === "pago total" ||
                              stLabel === "quitado" ||
                              stLabel === "pago parcial" ||
                              stLabel === "parcial";

                            if (eOrigemManual && isPagoTotalOuParcial && contaIdEstorno != null) {
                              return (
                                <DropdownMenuItem
                                  className="text-amber-600 focus:text-amber-600"
                                  onClick={() => {
                                    setContaEstornar({
                                      id: Number(contaIdEstorno),
                                      label: String(transacao.id || `Conta #${contaIdEstorno}`),
                                    });
                                    setMotivoEstorno("");
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Cancelar Recebimento
                                </DropdownMenuItem>
                              );
                            }
                            return null;
                          })()}
                          {transacao.pedidoId &&
                            (() => {
                              const st = (transacao.status || "").toLowerCase();
                              return (
                                st !== "cancelado" &&
                                st !== "quitado" &&
                                st !== "pago total"
                              );
                            })() && (
                            <DropdownMenuItem
                              className="text-orange-600 focus:text-orange-600"
                              onClick={() =>
                                setPedidoCancelar({
                                  id: transacao.pedidoId!,
                                  label: String(transacao.id || `Pedido #${transacao.pedidoId}`),
                                })
                              }
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Cancelar pedido
                            </DropdownMenuItem>
                          )}
                          {(() => {
                            const pedidoId = transacao.pedidoId;
                            const contaId = (transacao as any).contaId;
                            const st = String(transacao.status || "").toUpperCase();
                            const stLabel = String(transacao.status || "").toLowerCase();
                            const quitado =
                              st === "QUITADO" ||
                              st === "PAGO_TOTAL" ||
                              stLabel === "quitado" ||
                              stLabel === "pago total";

                            if (pedidoId != null) {
                              if (quitado) return null;
                              return (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setItemApagar({
                                      tipo: "pedido",
                                      id: Number(pedidoId),
                                      label: String(transacao.id || `Pedido #${pedidoId}`),
                                    })
                                  }
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              );
                            }

                            if (contaId != null) {
                              return (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setItemApagar({
                                      tipo: "conta",
                                      id: Number(contaId),
                                      label: String(transacao.id || `Conta #${contaId}`),
                                    })
                                  }
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              );
                            }
                            return null;
                          })()}
                      </TableRowActionsMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Contador — lista completa, sem paginação que oculte contas */}
          {((!usarFallbackContasFinanceiras && transacoesDisplayReceber.length > 0) ||
            (usarFallbackContasFinanceiras && transacoesDisplayGrupos.length > 0)) && (
            <div className="border-t border-border p-4">
              <div className="text-center text-sm text-muted-foreground">
                {usarFallbackContasFinanceiras
                  ? `${transacoesDisplayGrupos.length} pedido(s)`
                  : `${transacoesDisplayReceber.length} pedido(s)`}
              </div>
            </div>
          )}
        </motion.div>
          </>
        )}

        {/* Dialog de Visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Detalhes da Conta a Receber
              </DialogTitle>
            </DialogHeader>

            {isLoadingConta ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : contaSelecionada ? (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Número da Conta</Label>
                    <p className="text-sm font-medium">{contaSelecionada.numero_conta || `CONTA-${contaSelecionada.id}`}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="text-sm font-medium">{formatarDescricao(contaSelecionada)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Original</Label>
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contaSelecionada.valor_original)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Restante</Label>
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contaSelecionada.valor_restante || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="text-sm font-medium">{contaSelecionada.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="text-sm font-medium">
                      {contaSelecionada.cliente_id 
                        ? clientes.find(c => c.id === contaSelecionada.cliente_id)?.nome || `ID: ${contaSelecionada.cliente_id}`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Pagamento</Label>
                    <p className="text-sm font-medium">
                      {contaSelecionada.data_pagamento
                        ? formatDate(contaSelecionada.data_pagamento)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Método de Pagamento</Label>
                    <p className="text-sm font-medium">{formatarMetodoPagamento(contaSelecionada.forma_pagamento)}</p>
                  </div>
                  {/* Modelo sem parcelas: não exibir bloco de parcelas */}
                </div>

                {/* Histórico de Recebimentos / Estornos */}
                <div className="bg-card border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b pb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Histórico de Recebimentos / Estornos</h3>
                      <p className="text-sm text-muted-foreground">
                        Lançamentos de recebimento e registros de estorno
                      </p>
                    </div>
                  </div>

                  {contaDetalhe?.historico_pagamentos && contaDetalhe.historico_pagamentos.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Forma de Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Detalhes do Estorno / Obs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contaDetalhe.historico_pagamentos.map((item) => {
                          const isEstornado = item.estornado || !!item.data_estorno;
                          return (
                            <TableRow key={`detalhe-rec-${item.id}`}>
                              <TableCell>{formatarDataBR(item.data_lancamento)}</TableCell>
                              <TableCell className="font-medium">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.valor_pago))}
                              </TableCell>
                              <TableCell>
                                {item.forma_pagamento ? formatarFormaPagamento(item.forma_pagamento) : '—'}
                              </TableCell>
                              <TableCell>
                                {isEstornado ? (
                                  <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400">
                                    Estornado / Cancelado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                                    Recebido
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {isEstornado ? (
                                  <div className="space-y-1">
                                    {item.data_estorno && (
                                      <div><span className="font-medium text-foreground">Data Estorno:</span> {formatarDataBR(item.data_estorno)}</div>
                                    )}
                                    {(item.motivo_estorno || item.observacoes) && (
                                      <div><span className="font-medium text-foreground">Motivo:</span> {item.motivo_estorno || item.observacoes}</div>
                                    )}
                                  </div>
                                ) : (
                                  item.observacoes || '—'
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum histórico de recebimento registrado.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Conta não encontrada
              </div>
            )}
          </DialogContent>
        </Dialog>

        <EditarContaFinanceiraDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedContaId(null);
          }}
          contaId={selectedContaId}
          title="Editar Conta a Receber"
          description="Edite os campos desejados da conta a receber"
          tipoFixo="RECEBER"
          clientes={clientes}
          pedidos={pedidos}
          invalidateQueryKeys={[
            ["contas-financeiras"],
            ["dashboard-receber"],
            ["pedidos", "contas-receber"],
          ]}
        />

        <RelatorioProdutosClienteDialog
          open={relatorioProdutosClienteOpen}
          onOpenChange={setRelatorioProdutosClienteOpen}
          clientes={clientes}
          defaultClienteId={clienteFilterId}
        />

        <Dialog
          open={pedidoCancelar != null}
          onOpenChange={(open) => {
            if (!open && !cancelarPedidoMutation.isPending) {
              setPedidoCancelar(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-amber-600" />
                Cancelar pedido
              </DialogTitle>
              <DialogDescription>
                O pedido será marcado como cancelado e sairá das Contas a Receber.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              {pedidoCancelar ? (
                <p className="text-sm font-medium">{pedidoCancelar.label}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                Deseja realmente cancelar este pedido?
              </p>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                disabled={cancelarPedidoMutation.isPending}
                onClick={() => setPedidoCancelar(null)}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={cancelarPedidoMutation.isPending || !pedidoCancelar}
                onClick={() => {
                  if (pedidoCancelar) {
                    cancelarPedidoMutation.mutate(pedidoCancelar.id);
                  }
                }}
              >
                {cancelarPedidoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Cancelar pedido
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={itemApagar != null}
          onOpenChange={(open) => {
            if (!open && !apagarMutation.isPending) {
              setItemApagar(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Excluir
              </DialogTitle>
              <DialogDescription>
                Esta ação remove o registro permanentemente e não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              {itemApagar ? (
                <p className="text-sm font-medium">{itemApagar.label}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                {itemApagar?.tipo === "conta"
                  ? "Deseja realmente excluir esta conta?"
                  : "Deseja realmente excluir este pedido? Pedidos com pagamento ou NF-e emitida não podem ser excluídos."}
              </p>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                disabled={apagarMutation.isPending}
                onClick={() => setItemApagar(null)}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={apagarMutation.isPending || !itemApagar}
                onClick={() => {
                  if (itemApagar) apagarMutation.mutate(itemApagar);
                }}
              >
                {apagarMutation.isPending ? (
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
        <Dialog
          open={contaEstornar != null}
          onOpenChange={(open) => {
            if (!open && !estornarMutation.isPending) {
              setContaEstornar(null);
              setMotivoEstorno("");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                Cancelar Recebimento (Estorno)
              </DialogTitle>
              <DialogDescription>
                Deseja estornar o recebimento deste título? O valor pago será revertido e o status retornará para 'Pendente'.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4">
              {contaEstornar ? (
                <p className="text-sm font-medium">{contaEstornar.label}</p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="motivo_estorno_rec">Motivo do Estorno (Opcional)</Label>
                <Textarea
                  id="motivo_estorno_rec"
                  placeholder="Ex: Recebimento efetuado em duplicidade, Erro no valor inserido"
                  value={motivoEstorno}
                  onChange={(e) => setMotivoEstorno(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                disabled={estornarMutation.isPending}
                onClick={() => {
                  setContaEstornar(null);
                  setMotivoEstorno("");
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={estornarMutation.isPending || !contaEstornar}
                onClick={() => {
                  if (contaEstornar) {
                    estornarMutation.mutate(contaEstornar.id);
                  }
                }}
              >
                {estornarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Estornando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Confirmar Estorno
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ContasAReceber;

