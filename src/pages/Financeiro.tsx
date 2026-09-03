import { RelatorioProdutosClienteDialog } from "@/components/reports/RelatorioProdutosClienteDialog";
import { RelatorioPeriodoFinanceiro } from "@/components/reports/RelatorioPeriodoFinanceiro";
import { EditarContaFinanceiraDialog } from "@/components/financeiro/EditarContaFinanceiraDialog";
import { GerarPedidoDePrevisaoDialog } from "@/components/financeiro/GerarPedidoDePrevisaoDialog";
import AppLayout from "@/components/layout/AppLayout";
import {
  ModuleStatCards,
  type ModuleStatCardItem,
} from "@/components/layout/ModuleStatCards";
import { saldoStatTheme, statTheme } from "@/components/layout/module-stat-themes";
import { TableRowActionsMenu } from "@/components/TableRowActionsMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import { cn, compareRocaPorCodigo, formatDate } from "@/lib/utils";
import {
  calcularStatsFinanceiroFiltrado,
  fimDoMesYMD,
  listarContasTodasAsPaginas,
  toYMD,
} from "@/lib/contas-financeiras-listagem";
import { Cliente, clientesService } from "@/services/clientes.service";
import { controleRocaService } from "@/services/controle-roca.service";
import {
  type ContaFinanceira,
  CreateContaFinanceiraDto,
  financeiroService,
  ResumoFinanceiro,
} from "@/services/financeiro.service";
import type { Roca } from "@/types/roca";
import { relatoriosClienteService } from "@/services/relatorios-cliente.service";
import { Fornecedor, fornecedoresService } from "@/services/fornecedores.service";
import { pedidosService } from "@/services/pedidos.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    BarChart3,
    Calendar,
    Download,
    Circle,
    CreditCard,
    DollarSign,
    Edit,
    Eye,
    FileText,
    Filter,
    Info,
    Loader2,
    Plus,
    Printer,
    RotateCcw,
    Search,
    ShoppingCart,
    Trash2,
    TrendingDown,
    TrendingUp,
    Wallet,
    CalendarClock,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/** Período do mês corrente (mesmo critério dos cards Receita/Despesas do Mês). */
function periodoMesAtualYMD(ref = new Date()) {
  return {
    dataInicial: toYMD(new Date(ref.getFullYear(), ref.getMonth(), 1)),
    dataFinal: fimDoMesYMD(ref),
  };
}

const Financeiro = () => {
  const rotulo = useRotuloRoca();
  const navigate = useNavigate();
  const dataInicialFiltroRef = useRef<HTMLInputElement | null>(null);
  const dataFinalFiltroRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [gerarPedidoOpen, setGerarPedidoOpen] = useState(false);
  const [gerarPedidoContaId, setGerarPedidoContaId] = useState<number | null>(null);
  const [selectedContaId, setSelectedContaId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [clienteFilterId, setClienteFilterId] = useState<number | undefined>();
  const [fornecedorFilterId, setFornecedorFilterId] = useState<number | undefined>();
  const [rocaFilterId, setRocaFilterId] = useState<number | undefined>();
  const [dataInicialFilter, setDataInicialFilter] = useState<string>("");
  const [dataFinalFilter, setDataFinalFilter] = useState<string>("");
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);
  const [relatorioClientePdfOpen, setRelatorioClientePdfOpen] = useState(false);
  const [relatorioClienteIdSelect, setRelatorioClienteIdSelect] = useState<string>("");
  const [relatorioClientePdfLoading, setRelatorioClientePdfLoading] = useState(false);
  const [relatorioDataInicial, setRelatorioDataInicial] = useState("");
  const [relatorioDataFinal, setRelatorioDataFinal] = useState("");
  const [relatorioStatusFiltro, setRelatorioStatusFiltro] = useState<string>("Todos");
  const [relatorioFornecedorPdfOpen, setRelatorioFornecedorPdfOpen] = useState(false);
  const [relatorioFornecedorIdSelect, setRelatorioFornecedorIdSelect] = useState("");
  const [relatorioFornecedorPdfLoading, setRelatorioFornecedorPdfLoading] = useState(false);
  const [relatorioFornecedorDataInicial, setRelatorioFornecedorDataInicial] = useState("");
  const [relatorioFornecedorDataFinal, setRelatorioFornecedorDataFinal] = useState("");
  const [relatorioFornecedorStatusFiltro, setRelatorioFornecedorStatusFiltro] =
    useState<string>("Todos");
  const [relatorioProdutosClienteOpen, setRelatorioProdutosClienteOpen] =
    useState(false);
  /** Filtro por card clicável: Receita do Mês / Despesas do Mês (como em Contas a Receber) */
  const [cardTipoFilter, setCardTipoFilter] = useState<"todos" | "RECEBER" | "PAGAR">("todos");
  /** Filtro de seção: despesas, contas a pagar e contas a receber. */
  const [secaoTipoFilter, setSecaoTipoFilter] = useState<
    "todos" | "despesas" | "contas_pagar" | "contas_receber"
  >("todos");

  const abrirDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  };

  const queryClient = useQueryClient();

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

  // Buscar fornecedores
  const { data: fornecedoresData } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      try {
        const response = await fornecedoresService.listar({
          limit: 100,
          statusFornecedor: "ATIVO",
        });
        if (Array.isArray(response)) return response;
        if (Array.isArray((response as any)?.data)) return (response as any).data;
        if (Array.isArray((response as any)?.fornecedores)) return (response as any).fornecedores;
        if (Array.isArray((response as any)?.items)) return (response as any).items;
        return [];
      } catch (error) {
        console.warn("API de fornecedores não disponível:", error);
        return [];
      }
    },
    retry: false,
  });

  const fornecedores: Fornecedor[] = Array.isArray(fornecedoresData)
    ? fornecedoresData
    : (fornecedoresData as any)?.data ||
      (fornecedoresData as any)?.fornecedores ||
      (fornecedoresData as any)?.items ||
      [];

  const { data: rocasData } = useQuery({
    queryKey: ["financeiro", "rocas-ativas"],
    queryFn: async () => controleRocaService.listarRocas(undefined, false),
    retry: false,
  });
  const rocasLista: Roca[] = Array.isArray(rocasData)
    ? rocasData
    : (rocasData as any)?.rocas ?? [];

  const rocasFiltroOrdenadas = useMemo(
    () =>
      [...rocasLista]
        .filter((r) => r.ativo !== false)
        .sort(compareRocaPorCodigo),
    [rocasLista],
  );

  const tipoFiltroEfetivo = useMemo<"RECEBER" | "PAGAR" | undefined>(() => {
    if (secaoTipoFilter === "contas_receber") return "RECEBER";
    if (secaoTipoFilter === "despesas" || secaoTipoFilter === "contas_pagar") {
      return "PAGAR";
    }
    if (cardTipoFilter !== "todos") return cardTipoFilter;
    return undefined;
  }, [secaoTipoFilter, cardTipoFilter]);

  // Parâmetros de filtro para dashboard (tipo vem dos cards/ seção; demais do painel)
  const dashboardFiltros = useMemo(() => {
    const f: {
      data_inicial?: string;
      data_final?: string;
      tipo?: string;
      cliente_id?: number;
      fornecedor_id?: number;
      roca_id?: number;
    } = {};
    if (dataInicialFilter) f.data_inicial = dataInicialFilter;
    if (dataFinalFilter) f.data_final = dataFinalFilter;
    if (tipoFiltroEfetivo) f.tipo = tipoFiltroEfetivo;
    if (clienteFilterId != null) f.cliente_id = clienteFilterId;
    if (fornecedorFilterId != null) f.fornecedor_id = fornecedorFilterId;
    if (rocaFilterId != null) f.roca_id = rocaFilterId;
    return Object.keys(f).length ? f : undefined;
  }, [
    dataInicialFilter,
    dataFinalFilter,
    tipoFiltroEfetivo,
    clienteFilterId,
    fornecedorFilterId,
    rocaFilterId,
  ]);

  const relatorioClienteIdParsed = useMemo(() => {
    if (!relatorioClienteIdSelect) return null;
    const n = parseInt(relatorioClienteIdSelect, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [relatorioClienteIdSelect]);

  const relatorioPreviewParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      cliente_id: relatorioClienteIdParsed ?? undefined,
      data_inicial: relatorioDataInicial || undefined,
      data_final: relatorioDataFinal || undefined,
      status:
        relatorioStatusFiltro !== "Todos"
          ? relatorioStatusFiltro
          : undefined,
    }),
    [
      relatorioClienteIdParsed,
      relatorioDataInicial,
      relatorioDataFinal,
      relatorioStatusFiltro,
    ],
  );

  const {
    data: relatorioPreviewData,
    isFetching: relatorioPreviewFetching,
    isError: relatorioPreviewError,
  } = useQuery({
    queryKey: ["relatorio-financeiro-preview", relatorioPreviewParams],
    queryFn: () => financeiroService.listarAgrupado(relatorioPreviewParams),
    enabled:
      relatorioClientePdfOpen && relatorioClienteIdParsed != null,
  });

  const relatorioTemDados =
    !relatorioPreviewError &&
    relatorioPreviewData != null &&
    relatorioPreviewData.total > 0;

  /** Mensagem quando o preview não encontra contas (PDF/impressão desabilitados). */
  const relatorioMensagemSemDados = useMemo(() => {
    if (relatorioStatusFiltro !== "Todos") {
      return "O cliente não possui dívida naquele status selecionado.";
    }
    return "O cliente não possui dívida naquele período.";
  }, [relatorioStatusFiltro]);

  const relatorioFiltrosForPdf = useMemo(
    () => ({
      dataInicial: relatorioDataInicial || undefined,
      dataFinal: relatorioDataFinal || undefined,
      status:
        relatorioStatusFiltro !== "Todos"
          ? relatorioStatusFiltro
          : undefined,
    }),
    [relatorioDataInicial, relatorioDataFinal, relatorioStatusFiltro],
  );

  const relatorioFornecedorIdParsed = useMemo(() => {
    if (!relatorioFornecedorIdSelect) return null;
    const n = parseInt(relatorioFornecedorIdSelect, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [relatorioFornecedorIdSelect]);

  const relatorioFornecedorPreviewParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      fornecedor_id: relatorioFornecedorIdParsed ?? undefined,
      data_inicial: relatorioFornecedorDataInicial || undefined,
      data_final: relatorioFornecedorDataFinal || undefined,
      status:
        relatorioFornecedorStatusFiltro !== "Todos"
          ? relatorioFornecedorStatusFiltro
          : undefined,
    }),
    [
      relatorioFornecedorIdParsed,
      relatorioFornecedorDataInicial,
      relatorioFornecedorDataFinal,
      relatorioFornecedorStatusFiltro,
    ],
  );

  const {
    data: relatorioFornecedorPreviewData,
    isFetching: relatorioFornecedorPreviewFetching,
    isError: relatorioFornecedorPreviewError,
  } = useQuery({
    queryKey: ["financeiro-relatorio-fornecedor-preview", relatorioFornecedorPreviewParams],
    queryFn: () => financeiroService.listarAgrupado(relatorioFornecedorPreviewParams),
    enabled: relatorioFornecedorPdfOpen && relatorioFornecedorIdParsed != null,
  });

  const relatorioFornecedorTemDados =
    !relatorioFornecedorPreviewError &&
    relatorioFornecedorPreviewData != null &&
    relatorioFornecedorPreviewData.total > 0;

  const relatorioFornecedorMensagemSemDados = useMemo(() => {
    if (relatorioFornecedorStatusFiltro !== "Todos") {
      return "O fornecedor não possui dívida naquele status selecionado.";
    }
    return "O fornecedor não possui dívida naquele período.";
  }, [relatorioFornecedorStatusFiltro]);

  const relatorioFornecedorFiltrosForPdf = useMemo(
    () => ({
      dataInicial: relatorioFornecedorDataInicial || undefined,
      dataFinal: relatorioFornecedorDataFinal || undefined,
      status:
        relatorioFornecedorStatusFiltro !== "Todos"
          ? relatorioFornecedorStatusFiltro
          : undefined,
    }),
    [
      relatorioFornecedorDataInicial,
      relatorioFornecedorDataFinal,
      relatorioFornecedorStatusFiltro,
    ],
  );

  // GET /financeiro/dashboard (unificado) com fallback para GET /contas-financeiras/dashboard/resumo
  const { data: dashboardUnificado } = useQuery({
    queryKey: ["dashboard-unificado-financeiro", dashboardFiltros],
    queryFn: () => financeiroService.getDashboardUnificado(dashboardFiltros),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: resumoFinanceiro, isLoading: isLoadingResumo } = useQuery<ResumoFinanceiro>({
    queryKey: ["dashboard-resumo-financeiro", dashboardFiltros],
    queryFn: () => financeiroService.getDashboardResumo(dashboardFiltros),
    refetchInterval: 30000,
    staleTime: 0,
    retry: false,
    enabled: !dashboardUnificado,
  });

  const resumoParaStats = dashboardUnificado ?? resumoFinanceiro;
  const contasReceberStats = dashboardUnificado?.contas_receber ?? resumoFinanceiro?.contas_receber;
  const contasPagarStats = dashboardUnificado?.contas_pagar ?? resumoFinanceiro?.contas_pagar;

  const { data: contasPrevisaoEntrada = [] } = useQuery({
    queryKey: [
      "contas-financeiras",
      "financeiro",
      "previsao-entrada",
      clienteFilterId,
      fornecedorFilterId,
      rocaFilterId,
      dataInicialFilter,
      dataFinalFilter,
      searchTerm,
    ],
    queryFn: () =>
      listarContasTodasAsPaginas({
        tipo: "RECEBER",
        status: "PREVISAO",
        cliente_id: clienteFilterId,
        fornecedor_id: fornecedorFilterId,
        roca_id: rocaFilterId,
        data_inicial: dataInicialFilter || undefined,
        data_final: dataFinalFilter || undefined,
      }),
    refetchInterval: 30000,
    retry: false,
  });

  const totalPrevisaoEntrada = useMemo(
    () =>
      Number(
        contasPrevisaoEntrada
          .reduce((s, c) => s + (Number(c.valor_original) || 0), 0)
          .toFixed(2),
      ),
    [contasPrevisaoEntrada],
  );

  // Buscar pedidos apenas para uso na UI (seleção de pedidos em formulários)
  // NÃO usado para cálculos financeiros - os valores vêm do resumoFinanceiro
  const { data: pedidosData } = useQuery({
    queryKey: ["pedidos", "financeiro"],
    queryFn: async () => {
      try {
        const response = await pedidosService.listar({
          page: 1,
          limit: 500,
        });
        // Tratar diferentes formatos de resposta
        if (Array.isArray(response)) {
          return response;
        }
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        if ((response as any)?.pedidos && Array.isArray((response as any).pedidos)) {
          return (response as any).pedidos;
        }
        return [];
      } catch (error) {
        console.warn("API de pedidos não disponível:", error);
        return [];
      }
    },
    retry: false,
  });

  const pedidos = Array.isArray(pedidosData) ? pedidosData : [];

  /** Filtros do painel (não incluem clique nos cards de tipo/status). */
  const temFiltrosAvancados =
    secaoTipoFilter !== "todos" ||
    clienteFilterId != null ||
    fornecedorFilterId != null ||
    rocaFilterId != null ||
    !!dataInicialFilter ||
    !!dataFinalFilter;

  const temFiltrosAtivos =
    temFiltrosAvancados ||
    cardTipoFilter !== "todos" ||
    activeTab !== "Todos";

  const handleAplicarFiltros = () => setFiltrosDialogOpen(false);
  const handleLimparFiltros = () => {
    setCardTipoFilter("todos");
    setSecaoTipoFilter("todos");
    setClienteFilterId(undefined);
    setFornecedorFilterId(undefined);
    setRocaFilterId(undefined);
    setDataInicialFilter("");
    setDataFinalFilter("");
    setActiveTab("Todos");
    setPage(1);
    setFiltrosDialogOpen(false);
  };

  // Totais dos cards: só filtros avançados (sem status/tipo do clique nos cards),
  // para Previsão/Receita não zerar Despesas indevidamente.
  const filtrosTotaisCards = useMemo(
    () => ({
      cliente_id: clienteFilterId,
      fornecedor_id: fornecedorFilterId,
      roca_id: rocaFilterId,
      data_inicial: dataInicialFilter || undefined,
      data_final: dataFinalFilter || undefined,
    }),
    [
      clienteFilterId,
      fornecedorFilterId,
      rocaFilterId,
      dataInicialFilter,
      dataFinalFilter,
    ],
  );

  const { data: contasReceberCards } = useQuery({
    queryKey: [
      "contas-financeiras",
      "financeiro",
      "cards",
      "receber",
      filtrosTotaisCards,
      secaoTipoFilter,
    ],
    queryFn: () =>
      listarContasTodasAsPaginas({
        ...filtrosTotaisCards,
        tipo: "RECEBER",
      }),
    enabled: temFiltrosAvancados && secaoTipoFilter !== "despesas" && secaoTipoFilter !== "contas_pagar",
    retry: false,
  });

  const { data: contasPagarCards } = useQuery({
    queryKey: [
      "contas-financeiras",
      "financeiro",
      "cards",
      "pagar",
      filtrosTotaisCards,
      secaoTipoFilter,
    ],
    queryFn: () =>
      listarContasTodasAsPaginas({
        ...filtrosTotaisCards,
        tipo: "PAGAR",
      }),
    enabled: temFiltrosAvancados && secaoTipoFilter !== "contas_receber",
    retry: false,
  });

  const buscaContasReceberCards =
    temFiltrosAvancados &&
    secaoTipoFilter !== "despesas" &&
    secaoTipoFilter !== "contas_pagar";
  const buscaContasPagarCards =
    temFiltrosAvancados && secaoTipoFilter !== "contas_receber";

  const statsFiltrados = useMemo(() => {
    if (!temFiltrosAvancados) return null;
    if (
      (buscaContasReceberCards && contasReceberCards === undefined) ||
      (buscaContasPagarCards && contasPagarCards === undefined)
    ) {
      return null;
    }
    const receber = buscaContasReceberCards ? (contasReceberCards ?? []) : [];
    const pagar = buscaContasPagarCards ? (contasPagarCards ?? []) : [];
    return calcularStatsFinanceiroFiltrado(receber, pagar);
  }, [
    temFiltrosAvancados,
    contasReceberCards,
    contasPagarCards,
    buscaContasReceberCards,
    buscaContasPagarCards,
  ]);

  // Buscar contas agrupadas (uma linha por cliente/pedido) - visão resumida
  const { data: contasAgrupadasResponse, isLoading: isLoadingContas } = useQuery({
    queryKey: [
      "contas-financeiras",
      "agrupado",
      activeTab,
      cardTipoFilter,
      secaoTipoFilter,
      page,
      limit,
      clienteFilterId,
      fornecedorFilterId,
      rocaFilterId,
      dataInicialFilter,
      dataFinalFilter,
    ],
    queryFn: async () => {
      try {
        const tipo = tipoFiltroEfetivo;
        const statusTabs = ["PENDENTE", "PREVISAO", "PAGO_PARCIAL", "PAGO_TOTAL", "VENCIDO", "CANCELADO"];
        const status = statusTabs.includes(activeTab) ? activeTab : undefined;

        const response = await financeiroService.listarAgrupado({
          page,
          limit,
          tipo,
          status,
          cliente_id: clienteFilterId,
          fornecedor_id: fornecedorFilterId,
          roca_id: rocaFilterId,
          data_inicial: dataInicialFilter || undefined,
          data_final: dataFinalFilter || undefined,
          busca: searchTerm.trim() || undefined,
        });
        
        return {
          itens: response?.itens ?? [],
          total: response?.total ?? 0,
        };
      } catch (error) {
        console.warn("API de contas financeiras agrupadas não disponível:", error);
        return { itens: [], total: 0 };
      }
    },
    retry: (failureCount, error: any) => {
      // Não tentar novamente para erros 400, 401, 403, 404
      if (error?.response) {
        const status = error.response.status;
        if ([400, 401, 403, 404].includes(status)) {
          return false;
        }
      }
      // Tentar até 2 vezes para outros erros
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  const itensAgrupados = contasAgrupadasResponse?.itens || [];
  const totalAgrupado = contasAgrupadasResponse?.total || 0;
  const totalPages = Math.ceil(totalAgrupado / limit) || 1;

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Calcular estatísticas do topo com a mesma base de competência:
  // - Receita do Mês = receita_mes
  // - Despesas do Mês = despesa_mes
  // - Saldo Atual = Receita do Mês - Despesas do Mês
  const stats = useMemo(() => {
    // Função auxiliar para converter valor para número seguro
    const parseValor = (valor: any): number => {
      if (valor === null || valor === undefined || valor === '') return 0;
      const num = typeof valor === 'string' ? parseFloat(valor) : Number(valor);
      return isNaN(num) ? 0 : num;
    };

    const receitaMes =
      statsFiltrados != null
        ? statsFiltrados.receitaMes
        : parseValor(contasReceberStats?.receita_mes) || 0;
    const despesaMes =
      statsFiltrados != null
        ? statsFiltrados.despesaMes
        : parseValor(contasPagarStats?.despesa_mes) || 0;
    const saldoAtual =
      statsFiltrados != null
        ? statsFiltrados.saldoAtual
        : receitaMes - despesaMes;

    /** Visual pastel alinhado ao Dashboard (vendas verde / despesas vermelho / saldo dinâmico). */
    return [
      {
        key: "receita_mes",
        label: "Receita do Mês",
        value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receitaMes),
        Icon: TrendingUp,
        ...statTheme.emerald,
        cardFilter: "RECEBER" as const,
      },
      {
        key: "despesa_mes",
        label: "Despesas do Mês",
        value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(despesaMes),
        Icon: TrendingDown,
        ...statTheme.red,
        cardFilter: "PAGAR" as const,
      },
      {
        key: "previsao_entrada",
        label: "Previsão de entrada",
        value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          totalPrevisaoEntrada,
        ),
        Icon: CalendarClock,
        ...statTheme.violet,
        cardFilter: "PREVISAO" as const,
      },
      {
        key: "saldo_atual",
        label: "Saldo Atual",
        value: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(saldoAtual),
        Icon: Wallet,
        ...saldoStatTheme(saldoAtual),
        cardFilter: "todos" as const,
      },
    ];
  }, [contasReceberStats, contasPagarStats, statsFiltrados, totalPrevisaoEntrada]);

  const periodoMesAtual = useMemo(() => periodoMesAtualYMD(), []);

  const periodoEhMesAtual =
    dataInicialFilter === periodoMesAtual.dataInicial &&
    dataFinalFilter === periodoMesAtual.dataFinal;

  const aplicarPeriodoMesAtual = () => {
    setDataInicialFilter(periodoMesAtual.dataInicial);
    setDataFinalFilter(periodoMesAtual.dataFinal);
  };

  const limparPeriodoSeForMesAtual = () => {
    if (
      dataInicialFilter === periodoMesAtual.dataInicial &&
      dataFinalFilter === periodoMesAtual.dataFinal
    ) {
      setDataInicialFilter("");
      setDataFinalFilter("");
    }
  };

  const statsCardItems = useMemo((): ModuleStatCardItem[] => {
    return stats.map((stat) => {
      const cardFilter = stat.cardFilter ?? "todos";
      const isPrevisaoCard = cardFilter === "PREVISAO";
      const isSaldoCard = cardFilter === "todos" && stat.key === "saldo_atual";
      const cardTipoAtivo =
        !isPrevisaoCard &&
        !isSaldoCard &&
        cardFilter !== "todos" &&
        cardTipoFilter === cardFilter;
      return {
        key: stat.key,
        label: stat.label,
        value: stat.value,
        iconWrap: stat.iconWrap,
        iconClass: stat.iconClass,
        valueClass: stat.valueClass,
        cardClassName: stat.cardClassName,
        labelClassName: stat.labelClassName,
        Icon: stat.Icon,
        active: isPrevisaoCard
          ? activeTab === "PREVISAO" && periodoEhMesAtual
          : isSaldoCard
            ? cardTipoFilter === "todos" &&
              activeTab === "Todos" &&
              periodoEhMesAtual
            : cardTipoAtivo && periodoEhMesAtual,
        onClick: () => {
          if (isPrevisaoCard) {
            const desligar =
              activeTab === "PREVISAO" && periodoEhMesAtual;
            if (desligar) {
              setActiveTab("Todos");
              setCardTipoFilter("todos");
              limparPeriodoSeForMesAtual();
            } else {
              setActiveTab("PREVISAO");
              setCardTipoFilter("todos");
              aplicarPeriodoMesAtual();
            }
            setPage(1);
            return;
          }

          if (isSaldoCard) {
            const desligar =
              cardTipoFilter === "todos" &&
              activeTab === "Todos" &&
              periodoEhMesAtual;
            setActiveTab("Todos");
            setCardTipoFilter("todos");
            if (desligar) limparPeriodoSeForMesAtual();
            else aplicarPeriodoMesAtual();
            setPage(1);
            return;
          }

          // Receita / Despesas: filtra tipo + mês atual.
          const desligar = cardTipoAtivo && periodoEhMesAtual;
          setActiveTab("Todos");
          if (desligar) {
            setCardTipoFilter("todos");
            limparPeriodoSeForMesAtual();
          } else {
            setCardTipoFilter(cardFilter);
            aplicarPeriodoMesAtual();
          }
          setPage(1);
        },
      };
    });
  }, [
    stats,
    cardTipoFilter,
    activeTab,
    periodoEhMesAtual,
    periodoMesAtual,
    dataInicialFilter,
    dataFinalFilter,
  ]);

  // Query para detalhe enriquecido (usado apenas no modal Visualizar - GET :id/detalhe)
  const { data: contaDetalhe, isLoading: isLoadingDetalhe } = useQuery({
    queryKey: ["conta-financeira-detalhe", selectedContaId],
    queryFn: async () => {
      if (!selectedContaId) return null;
      return await financeiroService.buscarDetalhePorId(selectedContaId);
    },
    enabled: !!selectedContaId && viewDialogOpen,
    retry: false,
  });

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setSelectedContaId(null);
    }
  };

  const abrirGerarPedidoDePrevisao = (contaId: number) => {
    setViewDialogOpen(false);
    setGerarPedidoContaId(contaId);
    setGerarPedidoOpen(true);
  };

  // Função para obter cor do status ativo
  const getActiveTabColor = (tab: string) => {
    switch (tab.toUpperCase()) {
      case "PENDENTE": return "bg-amber-500 text-white";
      case "PREVISAO": return "bg-violet-500 text-white";
      case "PAGO_PARCIAL": return "bg-blue-500 text-white";
      case "PAGO_TOTAL": return "bg-green-500 text-white";
      case "VENCIDO": return "bg-red-500 text-white";
      case "CANCELADO": return "bg-slate-600 text-white";
      case "RECEITA": return "bg-primary text-primary-foreground";
      case "DESPESA": return "bg-primary text-primary-foreground";
      default: return "bg-primary text-primary-foreground";
    }
  };

  // Função para obter cor do status inativo
  const getInactiveTabColor = (tab: string) => {
    switch (tab.toUpperCase()) {
      case "PENDENTE": return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20";
      case "PREVISAO": return "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20";
      case "PAGO_PARCIAL": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "PAGO_TOTAL": return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "VENCIDO": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      case "CANCELADO": return "bg-slate-600/10 text-slate-600 hover:bg-slate-600/20";
      case "RECEITA": return "bg-card text-muted-foreground hover:bg-secondary";
      case "DESPESA": return "bg-card text-muted-foreground hover:bg-secondary";
      default: return "bg-card text-muted-foreground hover:bg-secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pendente": return "bg-amber-500/10 text-amber-500";
      case "previsão":
      case "previsao": return "bg-violet-500/10 text-violet-600";
      case "pago parcial": return "bg-blue-500/10 text-blue-500";
      case "pago total": return "bg-green-500/10 text-green-500";
      case "vencido": return "bg-red-500/10 text-red-500";
      case "cancelado": return "bg-slate-600/10 text-slate-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Mapear itens agrupados para exibição (já vêm no formato correto da API)
  const transacoesDisplay = useMemo(() => {
    const statusMap: Record<string, string> = {
      "PENDENTE": "Pendente",
      "PREVISAO": "Previsão",
      "PAGO_PARCIAL": "Pago Parcial",
      "PAGO_TOTAL": "Pago Total",
      "VENCIDO": "Vencido",
      "CANCELADO": "Cancelado",
    };
    return itensAgrupados.map((item) => ({
      id: item.id,
      cliente_nome: item.cliente_nome,
      descricao:
        item.descricao != null && String(item.descricao).trim() !== ""
          ? String(item.descricao).trim()
          : "—",
      tipo: item.tipo === "RECEBER" ? "Receita" : "Despesa",
      categoria:
        item.categoria ||
        (item.tipo === "RECEBER"
          ? "Vendas"
          : item.tipo === "PAGAR"
            ? "Compras"
            : "Outros"),
      valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_total ?? 0),
      status: statusMap[item.status] || item.status,
      statusOriginal: item.status,
      ehPrevisao: item.status === "PREVISAO",
      contaId: item.id,
      pedido_id: item.pedido_id,
      roca_nome: item.roca_nome,
    }));
  }, [itensAgrupados]);

  // A busca é aplicada no backend antes da paginação.
  const filteredTransacoes = useMemo(() => {
    return transacoesDisplay;
  }, [transacoesDisplay]);

  const filteredTransacoesComSecao = useMemo(() => {
    if (secaoTipoFilter === "todos") return filteredTransacoes;
    return filteredTransacoes.filter((t) => {
      if (secaoTipoFilter === "contas_receber") return t.tipo === "Receita";
      if (secaoTipoFilter === "despesas" || secaoTipoFilter === "contas_pagar") {
        return t.tipo === "Despesa";
      }
      return true;
    });
  }, [filteredTransacoes, secaoTipoFilter]);

  const handleDelete = async (id: string) => {
    const contaId = Number(id);
    if (isNaN(contaId)) return;
    try {
      await financeiroService.deletar(contaId);
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["fluxo-caixa"] });
      toast.success("Transação excluída!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erro ao excluir transação");
    }
  };

  const abrirTelaPagamentos = (transacao: {
    contaId: number;
    pedido_id?: number | null;
    tipo: string;
    statusOriginal: string;
  }) => {
    const statusNormalizado = String(transacao.statusOriginal || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

    if (statusNormalizado === "PAGO_TOTAL" || statusNormalizado === "CANCELADO") {
      toast.info("Essa conta não possui saldo em aberto para pagamento.");
      return;
    }
    const ehReceita = transacao.tipo === "Receita";
    if (ehReceita) {
      if (transacao.pedido_id != null) {
        navigate(`/financeiro/contas-receber/${transacao.pedido_id}/pagamentos`, {
          state: { voltarPara: "/financeiro" },
        });
        return;
      }
      navigate(`/financeiro/contas-receber/conta/${transacao.contaId}/pagamentos`, {
        state: { voltarPara: "/financeiro" },
      });
      return;
    }

    if (transacao.pedido_id != null) {
      navigate(`/financeiro/contas-pagar/${transacao.pedido_id}/pagamentos`, {
        state: { voltarPara: "/financeiro" },
      });
      return;
    }
    navigate(`/financeiro/contas-pagar/conta/${transacao.contaId}/pagamentos`, {
      state: { voltarPara: "/financeiro" },
    });
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
              <p className="text-muted-foreground">Controle suas receitas e despesas</p>
            </div>
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => navigate("/financeiro/nova-transacao")}
            >
              <Plus className="w-4 h-4" />
              Nova Transação
            </Button>
          </div>
        </div>

        <ModuleStatCards columns={4} className="mb-6" items={statsCardItems} />

        {/* Filtros e busca — barra tipo Centro de Custos */}
        <div className="mb-6 rounded-2xl border border-border/60 bg-muted/40 p-3 sm:p-4 dark:bg-muted/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              className="h-10 w-full shrink-0 gap-2 rounded-xl shadow-sm sm:w-auto"
              onClick={() => setFiltrosDialogOpen(true)}
              style={
                temFiltrosAtivos
                  ? { borderColor: "var(--primary)", borderWidth: "2px" }
                  : {}
              }
            >
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filtros
              {temFiltrosAtivos && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {(cardTipoFilter !== "todos" ? 1 : 0) +
                    (secaoTipoFilter !== "todos" ? 1 : 0) +
                    (clienteFilterId != null ? 1 : 0) +
                    (fornecedorFilterId != null ? 1 : 0) +
                    (rocaFilterId != null ? 1 : 0) +
                    (dataInicialFilter ? 1 : 0) +
                    (dataFinalFilter ? 1 : 0) +
                    (activeTab !== "Todos" ? 1 : 0)}
                </span>
              )}
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou descrição..."
                  className="h-10 rounded-xl border-border/80 bg-background pl-10 shadow-sm placeholder:text-muted-foreground/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 w-full shrink-0 gap-2 rounded-xl shadow-sm sm:w-auto"
                  >
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Relatórios
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Relatórios</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setRelatorioClientePdfOpen(true)}
                  >
                    Relatório financeiro por cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setRelatorioProdutosClienteOpen(true)}
                  >
                    Relatório de produtos por cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setRelatorioFornecedorPdfOpen(true)}
                  >
                    Relatório financeiro por fornecedor
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Sheet open={filtrosDialogOpen} onOpenChange={setFiltrosDialogOpen}>
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
                  {/* Seção */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Seção</Label>
                    <Select
                      value={secaoTipoFilter}
                      onValueChange={(v) => {
                        setSecaoTipoFilter(
                          v as
                            | "todos"
                            | "despesas"
                            | "contas_pagar"
                            | "contas_receber",
                        );
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as seções" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as seções</SelectItem>
                        <SelectItem value="despesas">Despesas</SelectItem>
                        <SelectItem value="contas_pagar">Contas a pagar</SelectItem>
                        <SelectItem value="contas_receber">Contas a receber</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Cliente */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Cliente</Label>
                    <Select
                      value={clienteFilterId == null ? "todos" : String(clienteFilterId)}
                      onValueChange={(v) => {
                        setClienteFilterId(v === "todos" ? undefined : parseInt(v, 10));
                        setPage(1);
                      }}
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

                  {/* Fornecedor */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Fornecedor</Label>
                    <Select
                      value={fornecedorFilterId == null ? "todos" : String(fornecedorFilterId)}
                      onValueChange={(v) => {
                        setFornecedorFilterId(v === "todos" ? undefined : parseInt(v, 10));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os fornecedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os fornecedores</SelectItem>
                        {fornecedores.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.nome_fantasia}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Roça */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{rotulo.singular}</Label>
                    <Select
                      value={rocaFilterId == null ? "todos" : String(rocaFilterId)}
                      onValueChange={(v) => {
                        setRocaFilterId(v === "todos" ? undefined : parseInt(v, 10));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={rotulo.todas} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">{rotulo.todas}</SelectItem>
                        {rocasFiltroOrdenadas.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {(r.codigo ? `${r.codigo} – ` : "") + (r.nome ?? rotulo.comId(r.id))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Período */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Período</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                        <div className="relative">
                          <Input
                            type="date"
                            ref={dataInicialFiltroRef}
                            className="pr-10 [color-scheme:light] [appearance:textfield] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none"
                            value={dataInicialFilter}
                            onChange={(e) => {
                              setDataInicialFilter(e.target.value || "");
                              setPage(1);
                            }}
                          />
                          <button
                            type="button"
                            aria-label="Abrir calendário da data inicial"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => abrirDatePicker(dataInicialFiltroRef.current)}
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Data Final</Label>
                        <div className="relative">
                          <Input
                            type="date"
                            ref={dataFinalFiltroRef}
                            className="pr-10 [color-scheme:light] [appearance:textfield] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none"
                            value={dataFinalFilter}
                            onChange={(e) => {
                              setDataFinalFilter(e.target.value || "");
                              setPage(1);
                            }}
                          />
                          <button
                            type="button"
                            aria-label="Abrir calendário da data final"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => abrirDatePicker(dataFinalFiltroRef.current)}
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Status — apenas: Todos, Pendente, Pago Parcial, Quitada, Vencido, Cancelado */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Status</Label>
                    <RadioGroup
                      value={["Todos", "PENDENTE", "PREVISAO", "PAGO_PARCIAL", "PAGO_TOTAL", "VENCIDO", "CANCELADO"].includes(activeTab) ? activeTab : "Todos"}
                      onValueChange={(v) => {
                        setActiveTab(v);
                        setPage(1);
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Todos" id="status-todos" />
                        <Label htmlFor="status-todos" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-primary" />
                          <span>Todos</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PENDENTE" id="status-pendente" />
                        <Label htmlFor="status-pendente" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-amber-500" />
                          <span>Pendente</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PREVISAO" id="status-previsao" />
                        <Label htmlFor="status-previsao" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-violet-500" />
                          <span>Previsão</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PAGO_PARCIAL" id="status-parcial" />
                        <Label htmlFor="status-parcial" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-blue-500" />
                          <span>Pago Parcial</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PAGO_TOTAL" id="status-quitado" />
                        <Label htmlFor="status-quitado" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-green-500" />
                          <span>Quitada</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="VENCIDO" id="status-vencido" />
                        <Label htmlFor="status-vencido" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-red-500" />
                          <span>Vencido</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CANCELADO" id="status-cancelado" />
                        <Label htmlFor="status-cancelado" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-slate-500" />
                          <span>Cancelado</span>
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

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>{rotulo.singular}</TableHead>
                <TableHead>Valor (total)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingContas ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando contas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTransacoesComSecao.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-12 h-12 text-muted-foreground/50" />
                      <p>Nenhuma transação encontrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransacoesComSecao.map((transacao) => (
                  <TableRow
                    key={transacao.contaId}
                    className={cn(
                      transacao.ehPrevisao &&
                        "border-l-4 border-l-violet-500 bg-violet-500/[0.03]",
                    )}
                  >
                    <TableCell>
                      <span className="font-medium">{transacao.cliente_nome || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{transacao.descricao}</span>
                        {transacao.ehPrevisao ? (
                          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                            Previsão
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        transacao.tipo === "Receita" 
                          ? "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
                          : "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                      }`}>
                        {transacao.tipo}
                      </span>
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
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(transacao.status)}`}>
                        {transacao.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TableRowActionsMenu>
                          <DropdownMenuItem onClick={() => {
                            setSelectedContaId(transacao.contaId);
                            setViewDialogOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {transacao.ehPrevisao && transacao.tipo === "Receita" ? (
                            <DropdownMenuItem
                              onClick={() => abrirGerarPedidoDePrevisao(transacao.contaId)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Gerar pedido
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedContaId(transacao.contaId);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => abrirTelaPagamentos(transacao)}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pagamentos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                await financeiroService.downloadReciboPagamento(transacao.contaId);
                                toast.success('Recibo de pagamento baixado.');
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : 'Erro ao gerar recibo.');
                              }
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Recibo de pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(String(transacao.contaId))}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                      </TableRowActionsMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Paginação e total */}
          {totalAgrupado > 0 && (
            <div className="border-t border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredTransacoesComSecao.length} de {totalAgrupado} {totalAgrupado === 1 ? 'grupo' : 'grupos'}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Dialog de Visualização - GET :id/detalhe; campos conforme GUIA_FRONTEND_DETALHE_CONTA_FINANCEIRA */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {contaDetalhe ? `Conta ${contaDetalhe.numero_conta || `#${contaDetalhe.id}`}` : 'Detalhes da Conta Financeira'}
                {contaDetalhe?.status_original === 'PREVISAO' ||
                contaDetalhe?.status?.toLowerCase() === 'previsão' ? (
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
                    Previsão
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription>
                Visualização detalhada da conta financeira
              </DialogDescription>
            </DialogHeader>

            {isLoadingDetalhe ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : contaDetalhe ? (
              <div className="space-y-6">
                {/* Informações Básicas: valor_total_pedido, valor_pago, valor_em_aberto, status, descricao_parcelas_quitadas */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Informações Básicas</h3>
                      <p className="text-sm text-muted-foreground">
                        Dados principais da conta
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Número da Conta</Label>
                      <div className="text-sm font-medium">{contaDetalhe.numero_conta || `CONTA-${contaDetalhe.id}`}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Tipo</Label>
                      <div className="text-sm font-medium">{contaDetalhe.tipo}</div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-muted-foreground">Descrição (parcelas quitadas)</Label>
                      <div className="text-sm font-medium">{contaDetalhe.descricao_parcelas_quitadas || contaDetalhe.descricao}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Valor total do pedido</Label>
                      <div className="text-sm font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contaDetalhe.valor_total_pedido ?? 0)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Valor pago</Label>
                      <div className="text-sm font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contaDetalhe.valor_pago ?? 0)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Valor em aberto</Label>
                      <div className="text-sm font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contaDetalhe.valor_em_aberto ?? 0)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="text-sm font-medium">{contaDetalhe.status}</div>
                    </div>
                  </div>
                </div>

                {/* Relacionamentos: cliente_nome, fornecedor_nome, pedido_numero, nome_produto */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${contaDetalhe.tipo === 'Receber' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                      <ShoppingCart className={`w-5 h-5 ${contaDetalhe.tipo === 'Receber' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Relacionamentos</h3>
                      <p className="text-sm text-muted-foreground">
                        Cliente, fornecedor e pedido vinculados
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Cliente</Label>
                      <div className="text-sm font-medium">{contaDetalhe.relacionamentos?.cliente_nome ?? 'N/A'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Fornecedor</Label>
                      <div className="text-sm font-medium">{contaDetalhe.relacionamentos?.fornecedor_nome ?? 'N/A'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Pedido</Label>
                      <div className="text-sm font-medium">{contaDetalhe.relacionamentos?.pedido_numero ?? 'N/A'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">{rotulo.singular}</Label>
                      <div className="text-sm font-medium">
                        {contaDetalhe.relacionamentos?.roca_nome?.trim()
                          ? contaDetalhe.relacionamentos.roca_nome
                          : 'N/A'}
                      </div>
                    </div>
                    {(contaDetalhe.relacionamentos?.nome_produto != null && contaDetalhe.relacionamentos.nome_produto !== '') && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-muted-foreground">Produtos</Label>
                        <div className="text-sm font-medium">{contaDetalhe.relacionamentos.nome_produto}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Datas: data_criacao, data_vencimento, data_pagamento */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                      <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Datas</h3>
                      <p className="text-sm text-muted-foreground">
                        Criação, vencimento e pagamento
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Data de criação</Label>
                      <div className="text-sm font-medium">
                        {contaDetalhe.datas?.data_criacao ? formatDate(contaDetalhe.datas.data_criacao) : 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Data de vencimento</Label>
                      <div className="text-sm font-medium">
                        {contaDetalhe.datas?.data_vencimento ? formatDate(contaDetalhe.datas.data_vencimento) : 'N/A'}
                      </div>
                    </div>
                    {(contaDetalhe.status_original === 'PREVISAO' ||
                      contaDetalhe.status?.toLowerCase() === 'previsão') && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Data prevista</Label>
                        <div className="text-sm font-medium text-violet-700">
                          {contaDetalhe.data_prevista
                            ? formatDate(contaDetalhe.data_prevista)
                            : 'N/A'}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Data de pagamento</Label>
                      <div className="text-sm font-medium">
                        {contaDetalhe.datas?.data_pagamento ? formatDate(contaDetalhe.datas.data_pagamento) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pagamento: pagamento.forma_pagamento */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <CreditCard className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Pagamento</h3>
                      <p className="text-sm text-muted-foreground">
                        Forma de pagamento
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Forma de Pagamento</Label>
                      <div className="text-sm font-medium">
                        {(() => {
                          const fp = contaDetalhe.pagamento?.forma_pagamento;
                          const map: Record<string, string> = { DINHEIRO: 'Dinheiro', PIX: 'PIX', CARTAO_CREDITO: 'Cartão de Crédito', CARTAO_DEBITO: 'Cartão de Débito', BOLETO: 'Boleto', TRANSFERENCIA: 'Transferência', CHEQUE: 'Cheque' };
                          return fp ? (map[fp] ?? fp) : 'N/A';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {(contaDetalhe.status_original === 'PREVISAO' ||
                  contaDetalhe.status?.toLowerCase() === 'previsão') &&
                contaDetalhe.tipo === 'Receber' ? (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-violet-800">
                        Previsão de entrada
                      </p>
                      <p className="text-xs text-violet-700/80">
                        Gere um pedido de venda com estes dados ou exclua a previsão manualmente.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="gap-2 bg-violet-600 hover:bg-violet-700"
                      onClick={() => abrirGerarPedidoDePrevisao(contaDetalhe.id)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Gerar pedido
                    </Button>
                  </div>
                ) : null}

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
          onOpenChange={handleEditDialogOpenChange}
          contaId={selectedContaId}
          allowTipoChange
          clientes={clientes}
          fornecedores={fornecedores}
          pedidos={pedidos}
          invalidateQueryKeys={[
            ["contas-financeiras"],
            ["fluxo-caixa"],
            ["dashboard-receber"],
            ["dashboard-pagar"],
            ["dashboard-resumo"],
          ]}
        />

        <Dialog
          open={relatorioClientePdfOpen}
          onOpenChange={(open) => {
            setRelatorioClientePdfOpen(open);
            if (open) {
              setRelatorioDataInicial("");
              setRelatorioDataFinal("");
              setRelatorioStatusFiltro("Todos");
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
                Inclui dados da empresa, cadastro do cliente e lançamentos das contas financeiras
                vinculadas a ele (campos já existentes no sistema).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="relatorio-cliente-select">Cliente</Label>
                <Select
                  value={relatorioClienteIdSelect}
                  onValueChange={setRelatorioClienteIdSelect}
                >
                  <SelectTrigger id="relatorio-cliente-select">
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
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Todos" id="relatorio-status-todos" />
                      <Label htmlFor="relatorio-status-todos" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-primary" />
                        <span className="text-[#1A3B70]">Todos</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PENDENTE" id="relatorio-status-pendente" />
                      <Label htmlFor="relatorio-status-pendente" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-amber-500" />
                        <span className="text-[#1A3B70]">Pendente</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAGO_PARCIAL" id="relatorio-status-parcial" />
                      <Label htmlFor="relatorio-status-parcial" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-blue-500" />
                        <span className="text-[#1A3B70]">Pago Parcial</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAGO_TOTAL" id="relatorio-status-quitado" />
                      <Label htmlFor="relatorio-status-quitado" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-green-500" />
                        <span className="text-[#1A3B70]">Quitada</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="VENCIDO" id="relatorio-status-vencido" />
                      <Label htmlFor="relatorio-status-vencido" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-red-500" />
                        <span className="text-[#1A3B70]">Vencido</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CANCELADO" id="relatorio-status-cancelado" />
                      <Label htmlFor="relatorio-status-cancelado" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-slate-500" />
                        <span className="text-[#1A3B70]">Cancelado</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {relatorioPreviewFetching && relatorioClienteIdParsed != null && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando filtros…
                </p>
              )}

              {relatorioPreviewError && relatorioClienteIdParsed != null && (
                <p className="text-sm text-destructive">
                  Não foi possível verificar os filtros. Tente novamente.
                </p>
              )}

              {!relatorioPreviewFetching &&
                !relatorioPreviewError &&
                relatorioClienteIdParsed != null &&
                relatorioPreviewData?.total === 0 && (
                  <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm text-[#1A3B70]">
                    {relatorioMensagemSemDados}
                  </p>
                )}

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Button
                    type="button"
                    variant="relatorioPrimary"
                    className="flex-1 gap-2"
                    disabled={
                      relatorioClienteIdParsed == null ||
                      relatorioPreviewFetching ||
                      !relatorioTemDados ||
                      relatorioClientePdfLoading
                    }
                    onClick={async () => {
                      const id = relatorioClienteIdParsed;
                      if (id == null) {
                        toast.error("Selecione um cliente.");
                        return;
                      }
                      setRelatorioClientePdfLoading(true);
                      try {
                        await relatoriosClienteService.downloadRelatorioFinanceiro(
                          id,
                          relatorioFiltrosForPdf,
                        );
                        toast.success("PDF baixado.");
                      } catch (e: unknown) {
                        let msg =
                          e instanceof Error ? e.message : "Erro ao gerar PDF.";
                        if (/erro\s*http\s*:\s*200/i.test(msg)) {
                          msg =
                            "Falha ao processar o PDF no navegador. Atualize a página com Ctrl+Shift+R e tente novamente.";
                        }
                        toast.error(msg);
                      } finally {
                        setRelatorioClientePdfLoading(false);
                      }
                    }}
                  >
                    {relatorioClientePdfLoading ? (
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
                      relatorioClienteIdParsed == null ||
                      relatorioPreviewFetching ||
                      !relatorioTemDados ||
                      relatorioClientePdfLoading
                    }
                    onClick={async () => {
                      const id = relatorioClienteIdParsed;
                      if (id == null) {
                        toast.error("Selecione um cliente.");
                        return;
                      }
                      setRelatorioClientePdfLoading(true);
                      try {
                        await relatoriosClienteService.imprimirRelatorioFinanceiro(
                          id,
                          relatorioFiltrosForPdf,
                        );
                      } catch (e: unknown) {
                        let msg =
                          e instanceof Error ? e.message : "Erro ao abrir PDF.";
                        if (/erro\s*http\s*:\s*200/i.test(msg)) {
                          msg =
                            "Falha ao abrir o PDF. Atualize a página com Ctrl+Shift+R, permita pop-ups e tente novamente.";
                        }
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

        <Dialog
          open={relatorioFornecedorPdfOpen}
          onOpenChange={(open) => {
            setRelatorioFornecedorPdfOpen(open);
            if (open) {
              setRelatorioFornecedorDataInicial("");
              setRelatorioFornecedorDataFinal("");
              setRelatorioFornecedorStatusFiltro("Todos");
              setRelatorioFornecedorIdSelect(
                fornecedorFilterId != null ? String(fornecedorFilterId) : "",
              );
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório financeiro por fornecedor</DialogTitle>
              <DialogDescription>
                Inclui dados da empresa, cadastro do fornecedor e lançamentos das contas financeiras
                vinculadas a ele (campos já existentes no sistema).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="financeiro-relatorio-fornecedor-select">Fornecedor</Label>
                <Select
                  value={relatorioFornecedorIdSelect}
                  onValueChange={setRelatorioFornecedorIdSelect}
                >
                  <SelectTrigger id="financeiro-relatorio-fornecedor-select">
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nome_fantasia || f.nome_razao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
                <RelatorioPeriodoFinanceiro
                  dataInicial={relatorioFornecedorDataInicial}
                  dataFinal={relatorioFornecedorDataFinal}
                  onDataInicial={setRelatorioFornecedorDataInicial}
                  onDataFinal={setRelatorioFornecedorDataFinal}
                />

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Status</Label>
                  <RadioGroup
                    value={relatorioFornecedorStatusFiltro}
                    onValueChange={setRelatorioFornecedorStatusFiltro}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Todos" id="financeiro-relatorio-fornecedor-status-todos" />
                      <Label htmlFor="financeiro-relatorio-fornecedor-status-todos" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-primary" />
                        <span className="text-[#1A3B70]">Todos</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PENDENTE" id="financeiro-relatorio-fornecedor-status-pendente" />
                      <Label htmlFor="financeiro-relatorio-fornecedor-status-pendente" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-amber-500" />
                        <span className="text-[#1A3B70]">Pendente</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAGO_PARCIAL" id="financeiro-relatorio-fornecedor-status-parcial" />
                      <Label htmlFor="financeiro-relatorio-fornecedor-status-parcial" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-blue-500" />
                        <span className="text-[#1A3B70]">Pago Parcial</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAGO_TOTAL" id="financeiro-relatorio-fornecedor-status-quitado" />
                      <Label htmlFor="financeiro-relatorio-fornecedor-status-quitado" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-green-500" />
                        <span className="text-[#1A3B70]">Quitada</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="VENCIDO" id="financeiro-relatorio-fornecedor-status-vencido" />
                      <Label htmlFor="financeiro-relatorio-fornecedor-status-vencido" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-red-500" />
                        <span className="text-[#1A3B70]">Vencido</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CANCELADO" id="financeiro-relatorio-fornecedor-status-cancelado" />
                      <Label htmlFor="financeiro-relatorio-fornecedor-status-cancelado" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Circle className="w-3 h-3 text-slate-500" />
                        <span className="text-[#1A3B70]">Cancelado</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {relatorioFornecedorPreviewFetching && relatorioFornecedorIdParsed != null && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando filtros…
                </p>
              )}

              {relatorioFornecedorPreviewError && relatorioFornecedorIdParsed != null && (
                <p className="text-sm text-destructive">
                  Não foi possível verificar os filtros. Tente novamente.
                </p>
              )}

              {!relatorioFornecedorPreviewFetching &&
                !relatorioFornecedorPreviewError &&
                relatorioFornecedorIdParsed != null &&
                relatorioFornecedorPreviewData?.total === 0 && (
                  <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm text-[#1A3B70]">
                    {relatorioFornecedorMensagemSemDados}
                  </p>
                )}

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Button
                    type="button"
                    variant="relatorioPrimary"
                    className="flex-1 gap-2"
                    disabled={
                      relatorioFornecedorIdParsed == null ||
                      relatorioFornecedorPreviewFetching ||
                      !relatorioFornecedorTemDados ||
                      relatorioFornecedorPdfLoading
                    }
                    onClick={async () => {
                      const id = relatorioFornecedorIdParsed;
                      if (id == null) {
                        toast.error("Selecione um fornecedor.");
                        return;
                      }
                      setRelatorioFornecedorPdfLoading(true);
                      try {
                        await relatoriosClienteService.downloadRelatorioFinanceiroFornecedor(
                          id,
                          relatorioFornecedorFiltrosForPdf,
                        );
                        toast.success("PDF baixado.");
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao gerar PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioFornecedorPdfLoading(false);
                      }
                    }}
                  >
                    {relatorioFornecedorPdfLoading ? (
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
                      relatorioFornecedorIdParsed == null ||
                      relatorioFornecedorPreviewFetching ||
                      !relatorioFornecedorTemDados ||
                      relatorioFornecedorPdfLoading
                    }
                    onClick={async () => {
                      const id = relatorioFornecedorIdParsed;
                      if (id == null) {
                        toast.error("Selecione um fornecedor.");
                        return;
                      }
                      setRelatorioFornecedorPdfLoading(true);
                      try {
                        await relatoriosClienteService.imprimirRelatorioFinanceiroFornecedor(
                          id,
                          relatorioFornecedorFiltrosForPdf,
                        );
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao abrir PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioFornecedorPdfLoading(false);
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

        <RelatorioProdutosClienteDialog
          open={relatorioProdutosClienteOpen}
          onOpenChange={setRelatorioProdutosClienteOpen}
          clientes={clientes}
          defaultClienteId={clienteFilterId ?? null}
        />

        <GerarPedidoDePrevisaoDialog
          contaId={gerarPedidoContaId}
          open={gerarPedidoOpen}
          onOpenChange={(open) => {
            setGerarPedidoOpen(open);
            if (!open) setGerarPedidoContaId(null);
          }}
          onSuccess={() => {
            setSelectedContaId(null);
            queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
          }}
        />
      </div>
    </AppLayout>
  );
};

export default Financeiro;


















