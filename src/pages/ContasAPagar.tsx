import { EditarContaFinanceiraDialog } from "@/components/financeiro/EditarContaFinanceiraDialog";
import AppLayout from "@/components/layout/AppLayout";
import { RelatorioPeriodoFinanceiro } from "@/components/reports/RelatorioPeriodoFinanceiro";
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination";
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
    formatCurrency,
    formatDate,
    formatarDataBR,
    formatarFormaPagamento,
    formatarStatus,
    parseDateOnlyLocal,
} from "@/lib/utils";
import {
  agruparContasPorPedido,
  formatarVencimentoAgrupado,
  type ContaFinanceiraExibicao,
} from "@/lib/agrupar-contas-por-pedido";
import {
  type ContaFinanceira,
  type ContaFinanceiraAgrupada,
  CreateContaFinanceiraDto,
  financeiroService,
} from "@/services/financeiro.service";
import { controleRocaService } from "@/services/controle-roca.service";
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import { Fornecedor, fornecedoresService } from "@/services/fornecedores.service";
import type { Roca } from "@/types/roca";
import { pedidosService } from "@/services/pedidos.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    BarChart3,
    Ban,
    Calendar,
    CheckCircle,
    Circle,
    CreditCard,
    Download,
    DollarSign,
    Edit,
    Eye,
    FileText,
    Filter,
    Info,
    Loader2,
    Printer,
    Search,
    ShoppingCart,
    Trash2,
    Truck,
    XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { relatoriosClienteService } from "@/services/relatorios-cliente.service";
import { centroCustoService } from "@/services/centro-custo.service";
import { toast } from "sonner";
import { contaEhDespesaSemPedido } from "@/pages/contas-a-pagar/despesaContaUtils";
import { calcularResumoCardsPagar, contaTemSaldoAberto, contaVenceEsteMesLocal, fimDoMesYMD, toYMD } from "@/lib/contas-financeiras-listagem";

function formatarVencimentoItemAgrupado(item: ContaFinanceiraAgrupada): string {
  const qtd = item.qtd_parcelas ?? 1;
  const first = item.primeira_data_vencimento;
  const last = item.ultima_data_vencimento;
  if (!first) return "N/A";
  if (!last || first === last) {
    return qtd > 1 ? `${formatDate(first)} (${qtd} parcelas)` : formatDate(first);
  }
  return `${formatDate(first)} – ${formatDate(last)} (${qtd} parcelas)`;
}

/** Evita linhas repetidas se a API devolver duplicatas (mesmo id ou mesmo numero_conta). */
function dedupeContasFinanceirasPagar(contas: ContaFinanceira[]): ContaFinanceira[] {
  const seenId = new Set<number>();
  const seenNumero = new Set<string>();
  const out: ContaFinanceira[] = [];
  for (const c of contas) {
    const id = Number(c.id);
    const num = String(c.numero_conta || "").trim();
    if (Number.isFinite(id) && seenId.has(id)) continue;
    if (num && seenNumero.has(num)) continue;
    if (Number.isFinite(id)) seenId.add(id);
    if (num) seenNumero.add(num);
    out.push(c);
  }
  return out;
}

/** Normaliza resposta de GET /contas-financeiras para { data, total }. */
function parseListarContasResponse(response: unknown): {
  data: ContaFinanceira[];
  total: number;
} {
  if (Array.isArray(response)) {
    return { data: response, total: response.length };
  }
  const r = response as {
    data?: ContaFinanceira[];
    total?: number;
    contas?: ContaFinanceira[];
  };
  if (r?.data && Array.isArray(r.data)) {
    return { data: r.data, total: r.total ?? r.data.length };
  }
  if (r?.contas && Array.isArray(r.contas)) {
    return { data: r.contas, total: r.total ?? r.contas.length };
  }
  return { data: [], total: 0 };
}

/**
 * Busca todas as páginas para um mesmo filtro (necessário ao clicar nos cards
 * "Total Pago" / "Total a Pagar", pois filtrar só as 15 linhas da página atual falha).
 */
async function listarContasPagarTodasAsPaginas(
  base: Parameters<typeof financeiroService.listar>[0],
): Promise<ContaFinanceira[]> {
  const pageLimit = 200;
  let page = 1;
  const acc: ContaFinanceira[] = [];
  let totalEsperado = 0;
  for (;;) {
    const response = await financeiroService.listar({
      ...base,
      page,
      limit: pageLimit,
    });
    const { data, total } = parseListarContasResponse(response);
    if (page === 1) totalEsperado = total;
    acc.push(...data);
    if (data.length < pageLimit || acc.length >= totalEsperado || data.length === 0) {
      break;
    }
    page += 1;
  }
  return dedupeContasFinanceirasPagar(acc);
}

/** Chave estável para React: nunca usar só numero_conta (pode repetir em duplicatas). */
function rowKeyContasPagar(transacao: {
  id: string;
  contaId?: number;
  pedidoId?: number;
}): string {
  if (transacao.contaId != null && Number.isFinite(Number(transacao.contaId))) {
    return `conta-${transacao.contaId}`;
  }
  if (
    transacao.pedidoId != null &&
    Number.isFinite(Number(transacao.pedidoId))
  ) {
    return `pedido-${transacao.pedidoId}`;
  }
  return `row-${transacao.id}`;
}

function ContasAPagar() {
  const rotulo = useRotuloRoca();
  const dataInicialFiltroRef = useRef<HTMLInputElement | null>(null);
  const dataFinalFiltroRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [fornecedorFilterId, setFornecedorFilterId] = useState<number | null>(null);
  const [rocaFilterId, setRocaFilterId] = useState<number | null>(null);
  const [tipoDespesaFilterId, setTipoDespesaFilterId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dataInicialFilter, setDataInicialFilter] = useState<string>("");
  const [dataFinalFilter, setDataFinalFilter] = useState<string>("");
  /** Filtro por card clicável (como Contas a Receber): ao clicar no card, filtra a tabela */
  const [activeCardFilter, setActiveCardFilter] = useState<
    "todos" | "a_pagar" | "valor_pago" | "vencidas" | "vencendo_hoje" | "vencendo_este_mes"
  >("todos");
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);
  const [relatorioFornecedorPdfOpen, setRelatorioFornecedorPdfOpen] = useState(false);
  const [relatorioGeralPdfOpen, setRelatorioGeralPdfOpen] = useState(false);
  const [relatorioCentroCustoPdfOpen, setRelatorioCentroCustoPdfOpen] = useState(false);
  const [relatorioFornecedorIdSelect, setRelatorioFornecedorIdSelect] = useState<string>("");
  const [relatorioFornecedorPdfLoading, setRelatorioFornecedorPdfLoading] = useState(false);
  const [relatorioGeralPdfLoading, setRelatorioGeralPdfLoading] = useState(false);
  const [relatorioCentroCustoPdfLoading, setRelatorioCentroCustoPdfLoading] = useState(false);
  const [relatorioFornecedorDataInicial, setRelatorioFornecedorDataInicial] = useState("");
  const [relatorioFornecedorDataFinal, setRelatorioFornecedorDataFinal] = useState("");
  const [relatorioGeralDataInicial, setRelatorioGeralDataInicial] = useState("");
  const [relatorioGeralDataFinal, setRelatorioGeralDataFinal] = useState("");
  const [relatorioCentroCustoDataInicial, setRelatorioCentroCustoDataInicial] = useState("");
  const [relatorioCentroCustoDataFinal, setRelatorioCentroCustoDataFinal] = useState("");
  const [relatorioCentroCustoTipoSelect, setRelatorioCentroCustoTipoSelect] = useState("");
  const [relatorioFornecedorStatusFiltro, setRelatorioFornecedorStatusFiltro] =
    useState<string>("Todos");
  const [relatorioGeralStatusFiltro, setRelatorioGeralStatusFiltro] =
    useState<string>("Todos");
  const [relatorioGeralCampoData, setRelatorioGeralCampoData] = useState<
    "vencimento" | "emissao"
  >("vencimento");
  const [relatorioCentroCustoStatusFiltro, setRelatorioCentroCustoStatusFiltro] =
    useState<string>("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [newTransacao, setNewTransacao] = useState<CreateContaFinanceiraDto & { 
    data_emissao: string;
  }>({
    tipo: "PAGAR",
    descricao: "",
    valor_original: 0,
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: "",
    roca_id: undefined,
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: rocasData } = useQuery({
    queryKey: ["contas-pagar", "rocas-ativas"],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    retry: false,
  });
  const rocasLista: Roca[] = Array.isArray(rocasData)
    ? rocasData
    : (rocasData as { rocas?: Roca[] })?.rocas ?? [];

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

  // Buscar pedidos de compra
  const { data: pedidosData } = useQuery({
    queryKey: ["pedidos", "contas-pagar"],
    queryFn: async () => {
      try {
        const response = await pedidosService.listar({
          tipo: "COMPRA",
          page: 1,
          limit: 500,
        });
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
    queryKey: [
      "contas-pagar-relatorio-fornecedor-preview",
      relatorioFornecedorPreviewParams,
    ],
    queryFn: () =>
      financeiroService.listarAgrupado(relatorioFornecedorPreviewParams),
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

  const relatorioGeralPreviewParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      tipo: "PAGAR" as const,
      data_inicial: relatorioGeralDataInicial || undefined,
      data_final: relatorioGeralDataFinal || undefined,
      campo_data: relatorioGeralCampoData,
      status:
        relatorioGeralStatusFiltro !== "Todos"
          ? relatorioGeralStatusFiltro
          : undefined,
    }),
    [
      relatorioGeralDataInicial,
      relatorioGeralDataFinal,
      relatorioGeralStatusFiltro,
      relatorioGeralCampoData,
    ],
  );

  const {
    data: relatorioGeralPreviewData,
    isFetching: relatorioGeralPreviewFetching,
    isError: relatorioGeralPreviewError,
  } = useQuery({
    queryKey: ["contas-pagar-relatorio-geral-preview", relatorioGeralPreviewParams],
    queryFn: () => financeiroService.listar(relatorioGeralPreviewParams),
    enabled: relatorioGeralPdfOpen,
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
    if (relatorioGeralStatusFiltro !== "Todos") {
      return "Não há contas a pagar com o status selecionado.";
    }
    if (relatorioGeralDataInicial || relatorioGeralDataFinal) {
      return "Não há contas a pagar no período selecionado.";
    }
    return "Não há contas a pagar cadastradas.";
  }, [relatorioGeralStatusFiltro, relatorioGeralDataInicial, relatorioGeralDataFinal]);

  const relatorioGeralFiltrosForPdf = useMemo(
    () => ({
      dataInicial: relatorioGeralDataInicial || undefined,
      dataFinal: relatorioGeralDataFinal || undefined,
      status:
        relatorioGeralStatusFiltro !== "Todos"
          ? relatorioGeralStatusFiltro
          : undefined,
      campoData: relatorioGeralCampoData,
    }),
    [
      relatorioGeralDataInicial,
      relatorioGeralDataFinal,
      relatorioGeralStatusFiltro,
      relatorioGeralCampoData,
    ],
  );

  const { data: tiposDespesaOpcoes = [] } = useQuery({
    queryKey: ["centro-custo-tipos-opcoes"],
    queryFn: () => centroCustoService.listarTiposOpcoes(),
    retry: false,
  });
  const relatorioCentroCustoTipos = tiposDespesaOpcoes;

  const relatorioCentroCustoTipoIdParsed = useMemo(() => {
    if (!relatorioCentroCustoTipoSelect || relatorioCentroCustoTipoSelect === "todos") {
      return null;
    }
    const n = parseInt(relatorioCentroCustoTipoSelect, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [relatorioCentroCustoTipoSelect]);

  const relatorioCentroCustoPreviewParams = useMemo(
    () => ({
      dataInicial: relatorioCentroCustoDataInicial || undefined,
      dataFinal: relatorioCentroCustoDataFinal || undefined,
      status:
        relatorioCentroCustoStatusFiltro !== "Todos"
          ? relatorioCentroCustoStatusFiltro
          : undefined,
      tipoDespesaId: relatorioCentroCustoTipoIdParsed ?? undefined,
    }),
    [
      relatorioCentroCustoDataInicial,
      relatorioCentroCustoDataFinal,
      relatorioCentroCustoStatusFiltro,
      relatorioCentroCustoTipoIdParsed,
    ],
  );

  const {
    data: relatorioCentroCustoPreviewTotal,
    isFetching: relatorioCentroCustoPreviewFetching,
    isError: relatorioCentroCustoPreviewError,
    error: relatorioCentroCustoPreviewErr,
  } = useQuery({
    queryKey: [
      "contas-pagar-relatorio-centro-custo-preview",
      relatorioCentroCustoPreviewParams,
    ],
    queryFn: () =>
      relatoriosClienteService.contarRelatorioCentroCustoContasPagar(
        relatorioCentroCustoPreviewParams,
      ),
    enabled: relatorioCentroCustoPdfOpen,
    retry: 1,
  });

  const relatorioCentroCustoTemDados =
    relatorioCentroCustoPreviewTotal != null &&
    relatorioCentroCustoPreviewTotal > 0;

  const relatorioCentroCustoMensagemSemDados = useMemo(() => {
    if (relatorioCentroCustoTipoIdParsed != null) {
      if (relatorioCentroCustoStatusFiltro !== "Todos") {
        return "Não há despesas desse tipo com o status selecionado. Ajuste o status ou limpe o período.";
      }
      if (relatorioCentroCustoDataInicial || relatorioCentroCustoDataFinal) {
        return "Não há despesas desse tipo no período informado (filtro por data de vencimento/lançamento). Limpe as datas ou amplie o período — os lançamentos podem estar fora desse intervalo.";
      }
      return "Não há despesas cadastradas para esse tipo.";
    }
    if (relatorioCentroCustoStatusFiltro !== "Todos") {
      return "Não há despesas de centro de custo com o status selecionado.";
    }
    if (relatorioCentroCustoDataInicial || relatorioCentroCustoDataFinal) {
      return "Não há despesas de centro de custo no período selecionado. Limpe as datas ou amplie o intervalo.";
    }
    return "Não há despesas de centro de custo cadastradas.";
  }, [
    relatorioCentroCustoTipoIdParsed,
    relatorioCentroCustoStatusFiltro,
    relatorioCentroCustoDataInicial,
    relatorioCentroCustoDataFinal,
  ]);

  const relatorioCentroCustoFiltrosForPdf = useMemo(
    () => relatorioCentroCustoPreviewParams,
    [relatorioCentroCustoPreviewParams],
  );

  // Buscar dados do dashboard de contas a pagar (respeitando período selecionado)
  const { data: dashboardPagar, isLoading: isLoadingPagar } = useQuery({
    queryKey: ["dashboard-pagar", dataInicialFilter, dataFinalFilter],
    queryFn: () =>
      financeiroService.getDashboardPagar({
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

  // Validar parâmetros de paginação
  const validarParametrosPaginação = (page: number, limit: number): boolean => {
    if (page < 1) {
      console.error('Page deve ser maior ou igual a 1');
      return false;
    }
    if (limit < 1 || limit > 100) {
      console.error('Limit deve estar entre 1 e 100');
      return false;
    }
    return true;
  };

  // Mesmo universo do dashboard (tb_conta_financeira tipo PAGAR): pedidos de compra + despesas do centro de custo + avulsas.
  const { data: contasResponse, isLoading: isLoadingContas } = useQuery({
    queryKey: [
      "contas-financeiras",
      "pagar",
      "tabela",
      activeTab,
      currentPage,
      pageSize,
      fornecedorFilterId,
      rocaFilterId,
      tipoDespesaFilterId,
      statusFilter,
      dataInicialFilter,
      dataFinalFilter,
      activeCardFilter,
      searchTerm,
    ],
    queryFn: async () => {
      if (!validarParametrosPaginação(currentPage, pageSize)) {
        throw new Error("Parâmetros de paginação inválidos");
      }

      try {
        let status: string | undefined;
        let proximidadeVencimento: string | undefined;

        const filtro = (statusFilter ||
          (activeTab !== "Todos" ? activeTab : "")) as string;

        if (filtro) {
          if (filtro === "VENCIDO") proximidadeVencimento = "VENCIDA";
          else if (filtro === "VENCE_HOJE") proximidadeVencimento = "VENCE_HOJE";
          else if (["ABERTO", "PARCIAL", "QUITADO"].includes(filtro))
            status = filtro;
          else if (
            ["PENDENTE", "PREVISAO", "PAGO_PARCIAL", "PAGO_TOTAL", "CANCELADO"].includes(filtro)
          )
            status = filtro;
        }

        const fornecedorArg =
          fornecedorFilterId != null && fornecedorFilterId > 0
            ? fornecedorFilterId
            : undefined;
        const rocaArg =
          rocaFilterId != null && rocaFilterId > 0 ? rocaFilterId : undefined;
        const tipoDespesaArg =
          tipoDespesaFilterId != null && tipoDespesaFilterId > 0
            ? tipoDespesaFilterId
            : undefined;
        const dataInicialArg =
          dataInicialFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialFilter)
            ? dataInicialFilter
            : undefined;
        const dataFinalArg =
          dataFinalFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalFilter)
            ? dataFinalFilter
            : undefined;

        /**
         * Cards de resumo: filtros da folha (status/fornecedor/período) têm prioridade.
         * Sem filtro explícito na folha, buscamos no servidor conforme o card — não só
         * nas 15 linhas da página atual.
         */
        if (!filtro && !searchTerm.trim()) {
          if (activeCardFilter === "valor_pago") {
            const [pagasTotal, pagasParcial] = await Promise.all([
              listarContasPagarTodasAsPaginas({
                tipo: "PAGAR",
                status: "PAGO_TOTAL",
                fornecedor_id: fornecedorArg,
                roca_id: rocaArg,
                tipo_despesa_id: tipoDespesaArg,
                data_inicial: dataInicialArg,
                data_final: dataFinalArg,
              }),
              listarContasPagarTodasAsPaginas({
                tipo: "PAGAR",
                status: "PAGO_PARCIAL",
                fornecedor_id: fornecedorArg,
                roca_id: rocaArg,
                tipo_despesa_id: tipoDespesaArg,
                data_inicial: dataInicialArg,
                data_final: dataFinalArg,
              }),
            ]);
            const merged = dedupeContasFinanceirasPagar([
              ...pagasTotal,
              ...pagasParcial,
            ]);
            const agrupado = agruparContasPorPedido(merged);
            const start = (currentPage - 1) * pageSize;
            return {
              data: agrupado.slice(start, start + pageSize),
              total: agrupado.length,
            };
          }
          if (activeCardFilter === "a_pagar") {
            const [emAberto, vencidasSt, parcial] = await Promise.all([
              listarContasPagarTodasAsPaginas({
                tipo: "PAGAR",
                status: "PENDENTE",
                fornecedor_id: fornecedorArg,
                roca_id: rocaArg,
                tipo_despesa_id: tipoDespesaArg,
                data_inicial: dataInicialArg,
                data_final: dataFinalArg,
              }),
              listarContasPagarTodasAsPaginas({
                tipo: "PAGAR",
                status: "VENCIDO",
                fornecedor_id: fornecedorArg,
                roca_id: rocaArg,
                tipo_despesa_id: tipoDespesaArg,
                data_inicial: dataInicialArg,
                data_final: dataFinalArg,
              }),
              listarContasPagarTodasAsPaginas({
                tipo: "PAGAR",
                status: "PAGO_PARCIAL",
                fornecedor_id: fornecedorArg,
                roca_id: rocaArg,
                tipo_despesa_id: tipoDespesaArg,
                data_inicial: dataInicialArg,
                data_final: dataFinalArg,
              }),
            ]);
            const merged = dedupeContasFinanceirasPagar([
              ...emAberto,
              ...vencidasSt,
              ...parcial,
            ]);
            const start = (currentPage - 1) * pageSize;
            return {
              data: merged.slice(start, start + pageSize),
              total: merged.length,
            };
          }
          const paginateLocal = (merged: ContaFinanceira[]) => {
            const agrupado = agruparContasPorPedido(merged);
            const start = (currentPage - 1) * pageSize;
            return {
              data: agrupado.slice(start, start + pageSize),
              total: agrupado.length,
            };
          };

          if (activeCardFilter === "vencidas") {
            const merged = await listarContasPagarTodasAsPaginas({
              tipo: "PAGAR",
              proximidade_vencimento: "VENCIDA",
              fornecedor_id: fornecedorArg,
              roca_id: rocaArg,
              tipo_despesa_id: tipoDespesaArg,
              data_inicial: dataInicialArg,
              data_final: dataFinalArg,
            });
            return paginateLocal(merged.filter(contaTemSaldoAberto));
          }
          if (activeCardFilter === "vencendo_hoje") {
            const merged = await listarContasPagarTodasAsPaginas({
              tipo: "PAGAR",
              proximidade_vencimento: "VENCE_HOJE",
              fornecedor_id: fornecedorArg,
              roca_id: rocaArg,
              tipo_despesa_id: tipoDespesaArg,
              data_inicial: dataInicialArg,
              data_final: dataFinalArg,
            });
            return paginateLocal(merged.filter(contaTemSaldoAberto));
          }
          if (activeCardFilter === "vencendo_este_mes") {
            const hojeStr = toYMD(new Date());
            const merged = await listarContasPagarTodasAsPaginas({
              tipo: "PAGAR",
              fornecedor_id: fornecedorArg,
              roca_id: rocaArg,
              tipo_despesa_id: tipoDespesaArg,
              data_inicial: hojeStr,
              data_final: fimDoMesYMD(),
            });
            return paginateLocal(merged.filter(contaVenceEsteMesLocal));
          }
        }

        const usaVisaoAgrupada =
          !tipoDespesaArg &&
          !proximidadeVencimento &&
          !activeCardFilter;

        if (usaVisaoAgrupada) {
          const response = await financeiroService.listarAgrupado({
            page: currentPage,
            limit: pageSize,
            tipo: "PAGAR",
            status,
            fornecedor_id: fornecedorArg,
            roca_id: rocaArg,
            data_inicial: dataInicialArg,
            data_final: dataFinalArg,
          });
          return {
            data: [] as ContaFinanceira[],
            itensAgrupados: response.itens ?? [],
            total: response.total ?? 0,
            agrupado: true as const,
          };
        }

        const response = await financeiroService.listar({
          tipo: "PAGAR",
          page: currentPage,
          limit: pageSize,
          status,
          proximidade_vencimento: proximidadeVencimento as
            | "VENCIDA"
            | "VENCE_HOJE"
            | undefined,
          fornecedor_id: fornecedorArg,
          roca_id: rocaArg,
          tipo_despesa_id: tipoDespesaArg,
          data_inicial: dataInicialArg,
          data_final: dataFinalArg,
          busca: searchTerm.trim() || undefined,
        });

        let contasData: ContaFinanceira[] = [];
        let totalData = 0;

        if (Array.isArray(response)) {
          contasData = response;
          totalData = response.length;
        } else if (response?.data && Array.isArray(response.data)) {
          contasData = response.data;
          totalData = response.total || response.data.length;
        } else if (
          (response as any)?.contas &&
          Array.isArray((response as any).contas)
        ) {
          contasData = (response as any).contas;
          totalData =
            (response as any).total || (response as any).contas.length;
        }

        return {
          data: contasData,
          total: totalData,
        };
      } catch (error) {
        console.warn("API de contas financeiras não disponível:", error);
        return { data: [], total: 0 };
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response) {
        const st = error.response.status;
        if ([400, 401, 403, 404].includes(st)) {
          return false;
        }
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  const totalContas = contasResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalContas / pageSize));

  const contasResponseTyped = contasResponse as {
    data?: ContaFinanceira[];
    itensAgrupados?: ContaFinanceiraAgrupada[];
    agrupado?: boolean;
    total?: number;
  } | undefined;

  const itensAgrupadosApi =
    contasResponseTyped?.agrupado && contasResponseTyped.itensAgrupados
      ? contasResponseTyped.itensAgrupados
      : null;

  const contasFallback = useMemo(
    () => dedupeContasFinanceirasPagar(contasResponse?.data || []),
    [contasResponse],
  );

  const contasExibir = useMemo(() => {
    let base = agruparContasPorPedido(contasFallback);
    if (rocaFilterId == null || rocaFilterId <= 0) return base;
    const nomeRoca = rocasLista
      .find((r) => r.id === rocaFilterId)
      ?.nome?.trim()
      .toLowerCase();
    return base.filter((c) => {
      if (Number(c.roca_id) === rocaFilterId) return true;
      if (
        nomeRoca &&
        (c.roca_nome ?? "").trim().toLowerCase() === nomeRoca
      ) {
        return true;
      }
      return false;
    });
  }, [contasFallback, rocaFilterId, rocasLista]);

  const temFiltrosAtivos =
    (fornecedorFilterId != null && fornecedorFilterId > 0) ||
    (rocaFilterId != null && rocaFilterId > 0) ||
    (tipoDespesaFilterId != null && tipoDespesaFilterId > 0) ||
    !!statusFilter ||
    !!dataInicialFilter ||
    !!dataFinalFilter ||
    (activeTab !== "Todos");
  const handleAplicarFiltros = () => setFiltrosDialogOpen(false);
  const handleLimparFiltros = () => {
    setFornecedorFilterId(null);
    setRocaFilterId(null);
    setTipoDespesaFilterId(null);
    setStatusFilter("");
    setDataInicialFilter("");
    setDataFinalFilter("");
    setFiltrosDialogOpen(false);
  };

  const baseFiltrosContasArgs = useMemo(() => {
    const fornecedorArg =
      fornecedorFilterId != null && fornecedorFilterId > 0
        ? fornecedorFilterId
        : undefined;
    const rocaArg =
      rocaFilterId != null && rocaFilterId > 0 ? rocaFilterId : undefined;
    const tipoDespesaArg =
      tipoDespesaFilterId != null && tipoDespesaFilterId > 0
        ? tipoDespesaFilterId
        : undefined;
    const dataInicialArg =
      dataInicialFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialFilter)
        ? dataInicialFilter
        : undefined;
    const dataFinalArg =
      dataFinalFilter && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalFilter)
        ? dataFinalFilter
        : undefined;

    const filtroTabOuStatus = (statusFilter ||
      (activeTab !== "Todos" ? activeTab : "")) as string;

    let status: string | undefined;
    let proximidade_vencimento: "VENCIDA" | "VENCE_HOJE" | undefined;
    if (filtroTabOuStatus === "VENCIDO") {
      proximidade_vencimento = "VENCIDA";
    } else if (filtroTabOuStatus === "VENCE_HOJE") {
      proximidade_vencimento = "VENCE_HOJE";
    } else if (["ABERTO", "PARCIAL", "QUITADO"].includes(filtroTabOuStatus)) {
      status = filtroTabOuStatus;
    } else if (
      ["PENDENTE", "PREVISAO", "PAGO_PARCIAL", "PAGO_TOTAL", "CANCELADO"].includes(
        filtroTabOuStatus,
      )
    ) {
      status = filtroTabOuStatus;
    }

    return {
      tipo: "PAGAR" as const,
      fornecedor_id: fornecedorArg,
      roca_id: rocaArg,
      tipo_despesa_id: tipoDespesaArg,
      data_inicial: dataInicialArg,
      data_final: dataFinalArg,
          busca: searchTerm.trim() || undefined,
      status,
      proximidade_vencimento,
    };
  }, [
    fornecedorFilterId,
    rocaFilterId,
    tipoDespesaFilterId,
    dataInicialFilter,
    dataFinalFilter,
    statusFilter,
    activeTab,
  ]);

  const { data: contasParaCards, isLoading: isLoadingContasParaCards } = useQuery({
    queryKey: ["contas-financeiras", "pagar", "cards", baseFiltrosContasArgs],
    queryFn: async () => listarContasPagarTodasAsPaginas(baseFiltrosContasArgs),
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
    return contasParaCards.filter((c) => {
      if (Number(c.roca_id) === rocaFilterId) return true;
      if (
        nomeRoca &&
        (c.roca_nome ?? "").trim().toLowerCase() === nomeRoca
      ) {
        return true;
      }
      return false;
    });
  }, [contasParaCards, rocaFilterId, rocasLista]);

  const resumoCardsFiltrado = useMemo(() => {
    if (!temFiltrosAtivos) return null;
    return calcularResumoCardsPagar(contasFiltradasParaCards);
  }, [temFiltrosAtivos, contasFiltradasParaCards]);

  // Resetar página quando tab, busca ou filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, fornecedorFilterId, rocaFilterId, tipoDespesaFilterId, statusFilter, dataInicialFilter, dataFinalFilter, activeCardFilter]);

  // Função auxiliar para verificar se uma conta está vencida
  const isContaVencida = (conta: any): boolean => {
    if (!conta || conta.tipo !== "PAGAR") return false;
    
    // Se já está paga ou cancelada, não está vencida
    const st = String(conta.status ?? "").toUpperCase();
    if (st === "PAGO_TOTAL" || st === "QUITADO" || st === "CANCELADO") return false;

    if (st === "VENCIDO") return true;
    
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
    if (!conta || conta.tipo !== "PAGAR") return false;
    const stVh = String(conta.status ?? "").toUpperCase();
    if (stVh === "PAGO_TOTAL" || stVh === "QUITADO" || stVh === "CANCELADO") return false;
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
    if (!conta || conta.tipo !== "PAGAR") return false;
    const stM = String(conta.status ?? "").toUpperCase();
    if (stM === "PAGO_TOTAL" || stM === "QUITADO" || stM === "CANCELADO") return false;
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

  // Calcular estatísticas
  const stats = useMemo(() => {
    const parseValor = (valor: any): number => {
      if (valor === null || valor === undefined || valor === '') return 0;
      const num = typeof valor === 'string' ? parseFloat(valor) : Number(valor);
      return isNaN(num) ? 0 : num;
    };

    // Cards sempre usam resumo consolidado (não paginado) para não variar por página da tabela.
    const totalPagar =
      resumoCardsFiltrado != null
        ? resumoCardsFiltrado.totalPagar
        : parseValor(dashboardPagar?.valor_total_pendente) ?? 0;
    const totalPago =
      resumoCardsFiltrado != null
        ? resumoCardsFiltrado.valorPago
        : parseValor(
            dashboardPagar?.valor_total_pago_contabilizado ??
              dashboardPagar?.valor_total_pago,
          ) ?? 0;
    const totalVencidas =
      resumoCardsFiltrado != null
        ? resumoCardsFiltrado.vencidas
        : Number(dashboardPagar?.vencidas ?? 0);
    const totalVencendoHoje =
      resumoCardsFiltrado != null
        ? resumoCardsFiltrado.vencendoHoje
        : Number(dashboardPagar?.vencendo_hoje ?? 0);
    const totalVencendoEsteMes =
      resumoCardsFiltrado != null
        ? resumoCardsFiltrado.vencendoEsteMes
        : Number(dashboardPagar?.vencendo_este_mes ?? 0);
    const formatarMoedaCard = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return [
      {
        key: "a_pagar",
        filterKey: "a_pagar" as const,
        label: "Total a Pagar",
        value: formatarMoedaCard(totalPagar),
        Icon: DollarSign,
        ...statTheme.red,
      },
      {
        key: "valor_pago",
        filterKey: "valor_pago" as const,
        label: "Total Pago",
        value: formatarMoedaCard(totalPago),
        Icon: CheckCircle,
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
        ...statTheme.sky,
      },
    ];
  }, [dashboardPagar, resumoCardsFiltrado]);

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
      active: activeCardFilter === stat.filterKey,
      onClick: () =>
        setActiveCardFilter((prev) =>
          prev === stat.filterKey ? "todos" : stat.filterKey,
        ),
    }));
  }, [stats, activeCardFilter]);

  const editDialogTitle = useMemo(() => {
    if (selectedContaId == null) return "Editar Conta a Pagar";
    const conta = contasFallback.find((c) => c.id === selectedContaId);
    return contaEhDespesaSemPedido(conta)
      ? "Editar Despesa"
      : "Editar Conta a Pagar";
  }, [selectedContaId, contasFallback]);

  // Mutation para criar conta financeira
  const createContaMutation = useMutation({
    mutationFn: async (data: CreateContaFinanceiraDto) => {
      return await financeiroService.criar(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-resumo-financeiro"] });
      toast.success("Conta a pagar registrada com sucesso!");
      setDialogOpen(false);
      setNewTransacao({
        tipo: "PAGAR",
        descricao: "",
        valor_original: 0,
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: "",
        roca_id: undefined,
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao registrar conta a pagar");
    },
  });

  // Mutation para atualizar apenas o status (edição inline)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await financeiroService.atualizar(id, { status: status as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-resumo-financeiro"] });
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
      
      console.error('❌ [ContasAPagar] Erro ao atualizar status:', {
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
        queryClient.invalidateQueries({ queryKey: ["dashboard-pagar"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-resumo-financeiro"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
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
        queryClient.invalidateQueries({ queryKey: ["dashboard-pagar"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-resumo-financeiro"] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
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

  const handleStatusChange = (contaId: number, newStatus: string) => {
    setEditingStatusId(contaId);
    updateStatusMutation.mutate({ id: contaId, status: newStatus });
  };

  const abrirDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  };

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

  // Mesmas cores de status de Contas a Receber
  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pendente") return "bg-amber-500/10 text-amber-500";
    if (s === "em aberto" || s === "aberto") return "bg-blue-500/10 text-blue-500";
    if (s === "pago parcial" || s.includes("parcial")) return "bg-blue-500/10 text-blue-500";
    if (s === "quitado" || s === "concluído" || s === "concluido" || s === "pago total") return "bg-green-500/10 text-green-500";
    if (s === "vencido") return "bg-red-500/10 text-red-500";
    if (s === "cancelado") return "bg-slate-600/10 text-slate-600";
    return "bg-muted text-muted-foreground";
  };

  // Função para calcular dias até vencimento
  const calcularDiasAteVencimento = (dataVencimento: string): number | null => {
    if (!dataVencimento) return null;
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = parseDateOnlyLocal(dataVencimento);
      if (!vencimento) return null;
      vencimento.setHours(0, 0, 0, 0);
      const diffTime = vencimento.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  // Função para obter status de vencimento
  const getVencimentoStatus = (dias: number | null, status: string): { texto: string; cor: string; bgColor: string } => {
    const su = String(status ?? "").toUpperCase();
    if (su === "PAGO_TOTAL" || su === "QUITADO" || su === "CANCELADO") {
      return { texto: "", cor: "", bgColor: "" };
    }
    
    if (dias === null) {
      return { texto: "Data inválida", cor: "text-gray-500", bgColor: "bg-gray-100" };
    }
    
    if (dias < 0) {
      return { texto: "Vencida", cor: "text-red-600", bgColor: "bg-red-100" };
    }
    
    if (dias === 0) {
      return { texto: "Vence hoje", cor: "text-red-600", bgColor: "bg-red-100" };
    }
    
    if (dias <= 3) {
      return { texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, cor: "text-orange-600", bgColor: "bg-orange-100" };
    }
    
    if (dias <= 7) {
      return { texto: `Vence em ${dias} dias`, cor: "text-amber-600", bgColor: "bg-amber-100" };
    }
    
    if (dias <= 30) {
      return { texto: `Vence em ${dias} dias`, cor: "text-blue-600", bgColor: "bg-blue-100" };
    }
    
    return { texto: `Vence em ${dias} dias`, cor: "text-gray-600", bgColor: "bg-gray-100" };
  };

  // Uma linha por pedido (agrupado) ou por conta avulsa/centro de custo
  const transacoesDisplay = useMemo(() => {
    const statusMap: Record<string, string> = {
      PENDENTE: "Pendente",
      ABERTO: "Pendente",
      PAGO_PARCIAL: "Pago Parcial",
      PARCIAL: "Pago Parcial",
      PAGO_TOTAL: "Pago Total",
      QUITADO: "Quitado",
      VENCIDO: "Vencido",
      CANCELADO: "Cancelado",
    };

    if (itensAgrupadosApi && itensAgrupadosApi.length > 0) {
      return itensAgrupadosApi.map((item) => {
        const valorTotal = Number(item.valor_total ?? 0);
        const valorParcela = Number(item.valor_parcela ?? valorTotal);
        const valorPago = Number(item.valor_pago ?? 0);
        const abertoFallback = Math.max(0, valorTotal - valorPago);
        const stO = String(item.status ?? "").toUpperCase();
        const numeroPedido =
          item.numero_pedido ||
          item.descricao.match(/Pedido\s+(\S+)/i)?.[1] ||
          null;
        const podePagarConta =
          abertoFallback > 0.009 &&
          stO !== "QUITADO" &&
          stO !== "PAGO_TOTAL" &&
          stO !== "CANCELADO";

        return {
          id: numeroPedido || `PED-${item.pedido_id ?? item.id}`,
          rowKey: item.pedido_id ? `pedido-${item.pedido_id}` : `conta-${item.id}`,
          descricao: item.descricao,
          categoria: item.categoria,
          origemConta: item.pedido_id ? ("COMPRA" as const) : ("DESPESA" as const),
          valor: new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(valorParcela),
          valorPago: new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(valorPago),
          data: formatarVencimentoItemAgrupado(item),
          status: statusMap[item.status] || item.status,
          statusOriginal: item.status,
          contaId: item.id,
          fornecedor: item.cliente_nome || "N/A",
          diasAteVencimento: null,
          vencimentoStatus: { texto: "", cor: "", bgColor: "" },
          valorEmAberto: abertoFallback,
          podePagar: podePagarConta,
          pedidoId:
            item.pedido_id != null && Number.isFinite(Number(item.pedido_id))
              ? Number(item.pedido_id)
              : undefined,
          roca_nome: item.roca_nome ?? null,
        };
      });
    }

    return contasExibir.map((conta) => {
      const ex = conta as ContaFinanceiraExibicao;
      let nomeFornecedor = "N/A";
      const temPedido = !!(conta as any).pedido_id;
      let categoria = temPedido ? "Compras" : "Centro de custo";

      if (conta.tipo === "PAGAR" && conta.fornecedor_id) {
        const fornecedor = fornecedores.find(f => f.id === conta.fornecedor_id);
        nomeFornecedor = fornecedor?.nome_fantasia || fornecedor?.nome_razao || "Fornecedor não encontrado";
      }

      const valorTotalConta =
        Number((conta as any).valor_total) ||
        Number(conta.valor_original) ||
        0;
      const valorRestante = Number((conta as any).valor_restante) ?? Number((conta as any).valor_em_aberto) ?? 0;
      const valorPagoConta = (conta as any).valor_pago != null ? Number((conta as any).valor_pago) : Math.max(0, valorTotalConta - valorRestante);
      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valorTotalConta);
      const valorPagoFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valorPagoConta);

      const dataFormatada = ex._agrupadoPedido
        ? formatarVencimentoAgrupado(ex)
        : conta.data_vencimento
          ? formatDate(conta.data_vencimento)
          : "N/A";

      const statusMap: Record<string, string> = {
        PENDENTE: "Pendente",
        ABERTO: "Pendente",
        PAGO_PARCIAL: "Pago Parcial",
        PARCIAL: "Pago Parcial",
        PAGO_TOTAL: "Pago Total",
        QUITADO: "Quitado",
        VENCIDO: "Vencido",
        CANCELADO: "Cancelado",
      };
      const statusFormatado = statusMap[conta.status] || conta.status;

      const diasAteVencimento = conta.dias_ate_vencimento !== undefined 
        ? conta.dias_ate_vencimento 
        : calcularDiasAteVencimento(conta.data_vencimento);
      
      let vencimentoStatus: { texto: string; cor: string; bgColor: string };
      
      if (conta.status === "PAGO_TOTAL" || conta.status === "CANCELADO") {
        vencimentoStatus = { texto: "", cor: "", bgColor: "" };
      } else if (conta.status_vencimento && conta.proximidade_vencimento) {
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
        vencimentoStatus = getVencimentoStatus(diasAteVencimento, conta.status);
      }

      const vrRaw = (conta as any).valor_restante;
      const veRaw = (conta as any).valor_em_aberto;
      const abertoFallback =
        vrRaw != null && vrRaw !== ""
          ? Math.max(0, Number(vrRaw))
          : veRaw != null && veRaw !== ""
            ? Math.max(0, Number(veRaw))
            : Math.max(0, valorTotalConta - valorPagoConta);
      const stO = String(conta.status ?? "").toUpperCase();
      const podePagarConta =
        abertoFallback > 0.009 &&
        stO !== "QUITADO" &&
        stO !== "PAGO_TOTAL" &&
        stO !== "CANCELADO";

      const pid =
        (conta as any).pedido_id ??
        (conta as any).pedido?.id;

      /** Conta sem pedido = espelho do Centro de despesa (ou conta avulsa). */
      const origemConta = temPedido ? ("COMPRA" as const) : ("DESPESA" as const);

      return {
        id: ex._agrupadoPedido
          ? ex.numero_conta || `PED-${conta.pedido_id ?? conta.id}`
          : conta.numero_conta || `CONTA-${conta.id}`,
        rowKey: `conta-${conta.id}`,
        descricao: conta.descricao,
        categoria: categoria,
        origemConta,
        valor: valorFormatado,
        valorPago: valorPagoFormatado,
        data: dataFormatada,
        status: statusFormatado,
        statusOriginal: conta.status,
        contaId: conta.id,
        fornecedor: nomeFornecedor,
        diasAteVencimento,
        vencimentoStatus,
        valorEmAberto: abertoFallback,
        podePagar: podePagarConta,
        pedidoId: pid != null && Number.isFinite(Number(pid)) ? Number(pid) : undefined,
        roca_nome: (conta as { roca_nome?: string | null }).roca_nome ?? null,
      };
    });
  }, [contasExibir, fornecedores, itensAgrupadosApi]);

  const isNumericSearch = !isNaN(Number(searchTerm)) && searchTerm.trim() !== "";
  const searchId = isNumericSearch ? Number(searchTerm) : null;

  const { data: contaPorId } = useQuery({
    queryKey: ["conta-financeira", "busca", searchId],
    queryFn: async () => {
      if (!searchId) return null;
      try {
        return await financeiroService.buscarPorId(searchId);
      } catch (error) {
        return null;
      }
    },
    enabled: !!searchId && isNumericSearch,
    retry: false,
  });

  // Filtrar por busca, tab ativa e card clicável (como Contas a Receber)
  const filteredTransacoes = useMemo(() => {
    let filtered = transacoesDisplay;

    // Filtrar por tab ativa (especialmente para Vencidas e Vencendo Hoje)
    if (activeTab === "VENCIDO") {
      filtered = filtered.filter(t => {
        const conta = contasExibir.find((c) => c.id === t.contaId);
        if (!conta) return false;
        return isContaVencida(conta);
      });
    } else if (activeTab === "VENCE_HOJE") {
      filtered = filtered.filter(t => {
        const conta = contasExibir.find((c) => c.id === t.contaId);
        if (!conta) return false;
        return isContaVencendoHoje(conta);
      });
    }

    // Busca numérica por ID
    if (isNumericSearch && contaPorId && contaPorId.tipo === "PAGAR") {
      const contaEncontrada = contasFallback.find((c) => c.id === contaPorId.id);
      if (contaEncontrada) {
        const conta = contaEncontrada;
        let nomeFornecedor = "N/A";
        const temPedidoBusca = !!(conta as any).pedido_id;
        const categoria = temPedidoBusca ? "Compras" : "Centro de custo";

        if (conta.fornecedor_id) {
          const fornecedor = fornecedores.find(f => f.id === conta.fornecedor_id);
          nomeFornecedor = fornecedor?.nome_fantasia || fornecedor?.nome_razao || "Fornecedor não encontrado";
        }

        const valorTotalConta = Number(conta.valor_original) || 0;
        const valorRestante = Number((conta as any).valor_restante) ?? Number((conta as any).valor_em_aberto) ?? 0;
        const valorPagoConta = (conta as any).valor_pago != null ? Number((conta as any).valor_pago) : Math.max(0, valorTotalConta - valorRestante);
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalConta);
        const valorPagoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorPagoConta);

        const dataFormatada = conta.data_vencimento
          ? formatDate(conta.data_vencimento)
          : "N/A";

        const statusMap: Record<string, string> = {
          PENDENTE: "Pendente",
          ABERTO: "Pendente",
          PAGO_PARCIAL: "Pago Parcial",
          PARCIAL: "Pago Parcial",
          PAGO_TOTAL: "Pago Total",
          QUITADO: "Quitado",
          VENCIDO: "Vencido",
          CANCELADO: "Cancelado",
        };
        const statusFormatado = statusMap[conta.status] || conta.status;

        const diasAteVencimento = conta.dias_ate_vencimento !== undefined 
          ? conta.dias_ate_vencimento 
          : calcularDiasAteVencimento(conta.data_vencimento);
        
        const vencimentoStatus = getVencimentoStatus(diasAteVencimento, conta.status);

        const origemContaBusca = temPedidoBusca ? ("COMPRA" as const) : ("DESPESA" as const);

        return [{
          id: conta.numero_conta || `CONTA-${conta.id}`,
          rowKey: `conta-${conta.id}`,
          descricao: conta.descricao,
          categoria: categoria,
          origemConta: origemContaBusca,
          valor: valorFormatado,
          valorPago: valorPagoFormatado,
          data: dataFormatada,
          status: statusFormatado,
          statusOriginal: conta.status,
          contaId: conta.id,
          fornecedor: nomeFornecedor,
          diasAteVencimento,
          vencimentoStatus,
        }];
      }
    }

    return filtered;
  }, [transacoesDisplay, isNumericSearch, contaPorId, contasExibir, fornecedores, activeTab]);

  const handleCreate = () => {
    if (!newTransacao.descricao || !newTransacao.valor_original || !newTransacao.data_vencimento) {
      toast.error("Preencha os campos obrigatórios (Descrição, Valor e Data de Vencimento)");
      return;
    }

    const contaData: CreateContaFinanceiraDto = {
      tipo: "PAGAR",
      descricao: newTransacao.descricao,
      valor_original: Number(newTransacao.valor_original),
      data_emissao: newTransacao.data_emissao,
      data_vencimento: newTransacao.data_vencimento,
      fornecedor_id: newTransacao.fornecedor_id || undefined,
      pedido_id: newTransacao.pedido_id || undefined,
      roca_id: newTransacao.roca_id || undefined,
      forma_pagamento: newTransacao.forma_pagamento || undefined,
      data_pagamento: newTransacao.data_pagamento || undefined,
      observacoes: newTransacao.observacoes || undefined,
    };

    createContaMutation.mutate(contaData);
  };

  const isLoadingCards =
    isLoadingPagar || (temFiltrosAtivos && isLoadingContasParaCards);

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={CreditCard}
          title="Contas a Pagar"
          subtitle="Gerencie suas contas a pagar e acompanhe vencimentos em um só lugar."
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
                <DialogTitle>Nova Conta a Pagar</DialogTitle>
                <DialogDescription>
                  Preencha os campos abaixo para registrar uma nova conta a pagar.
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
                      placeholder="Ex: Pagamento de fornecedor"
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
                      <Label>Fornecedor</Label>
                      <Select
                        value={newTransacao.fornecedor_id?.toString() || undefined}
                        onValueChange={(value) => 
                          setNewTransacao({
                            ...newTransacao, 
                            fornecedor_id: value && value !== "none" ? Number(value) : undefined
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {fornecedores.map((fornecedor) => (
                            <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>
                              {fornecedor.nome_fantasia || fornecedor.nome_razao}
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
                          {pedidos
                            .filter((pedido) => pedido.pedido_id != null)
                            .map((pedido) => (
                              <SelectItem key={pedido.pedido_id} value={String(pedido.pedido_id)}>
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
                      placeholder="Observações adicionais sobre a conta a pagar"
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
                    "Registrar Conta a Pagar"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        {/* Search and Filters (mesmo design de Contas a Receber) */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex gap-4">
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
                  {(fornecedorFilterId != null && fornecedorFilterId > 0 ? 1 : 0) +
                    (rocaFilterId != null && rocaFilterId > 0 ? 1 : 0) +
                    (tipoDespesaFilterId != null && tipoDespesaFilterId > 0 ? 1 : 0) +
                    (statusFilter ? 1 : 0) +
                    (dataInicialFilter ? 1 : 0) +
                    (dataFinalFilter ? 1 : 0)}
                </span>
              )}
            </Button>
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
                  {/* Fornecedor */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Fornecedor</Label>
                    <Select
                      value={fornecedorFilterId == null ? "todos" : String(fornecedorFilterId)}
                      onValueChange={(v) => setFornecedorFilterId(v === "todos" ? null : parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os fornecedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os fornecedores</SelectItem>
                        {fornecedores.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.nome_fantasia || f.nome_razao}
                          </SelectItem>
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
                      onValueChange={(v) =>
                        setRocaFilterId(v === "todos" ? null : parseInt(v, 10))
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

                  {/* Centro de despesa (tipo) */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Centro de despesa</Label>
                    <Select
                      value={
                        tipoDespesaFilterId == null
                          ? "todos"
                          : String(tipoDespesaFilterId)
                      }
                      onValueChange={(v) =>
                        setTipoDespesaFilterId(
                          v === "todos" ? null : parseInt(v, 10),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        {tiposDespesaOpcoes.map((tipo) => (
                          <SelectItem key={tipo.id} value={String(tipo.id)}>
                            {tipo.nome}
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
                            onChange={(e) => setDataInicialFilter(e.target.value || "")}
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
                            onChange={(e) => setDataFinalFilter(e.target.value || "")}
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

                  {/* Status */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Status</Label>
                    <RadioGroup
                      value={statusFilter || "todos"}
                      onValueChange={(v) => setStatusFilter(v === "todos" ? "" : v)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="todos" id="status-todos-pagar" />
                        <Label htmlFor="status-todos-pagar" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-primary" />
                          <span>Todos</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ABERTO" id="status-aberto-pagar" />
                        <Label htmlFor="status-aberto-pagar" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-amber-500" />
                          <span>Pendente</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PARCIAL" id="status-parcial-pagar" />
                        <Label htmlFor="status-parcial-pagar" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-blue-500" />
                          <span>Aberto</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="QUITADO" id="status-quitado-pagar" />
                        <Label htmlFor="status-quitado-pagar" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Circle className="w-3 h-3 text-green-500" />
                          <span>Quitado</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="VENCIDO" id="status-vencido-pagar" />
                        <Label htmlFor="status-vencido-pagar" className="flex items-center gap-2 cursor-pointer flex-1">
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
                placeholder={`Buscar por número da conta, descrição, fornecedor, ${rotulo.singularLower}...`}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Relatórios
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Relatórios</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setRelatorioGeralPdfOpen(true)}>
                  Relatório geral
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRelatorioFornecedorPdfOpen(true)}>
                  Relatório financeiro por fornecedor
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRelatorioCentroCustoPdfOpen(true)}
                >
                  Relatório por centro de custo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead className="w-[120px] min-w-[120px]">Tipo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>{rotulo.singular}</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingContas ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando contas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (dataInicialFilter || dataFinalFilter) && !isLoadingContas && totalContas === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Não há contas no período selecionado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTransacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {(statusFilter || (activeTab && activeTab !== "Todos"))
                          ? (() => {
                              const labelPorStatus: Record<string, string> = {
                                ABERTO: "Pendente",
                                PARCIAL: "Aberto",
                                QUITADO: "Quitado",
                                VENCIDO: "Vencido",
                                PENDENTE: "Pendente",
                                PAGO_PARCIAL: "Pago Parcial",
                                PAGO_TOTAL: "Pago Total",
                                VENCE_HOJE: "Vencendo Hoje",
                                CANCELADO: "Cancelado",
                              };
                              const statusAtivo = statusFilter || activeTab;
                              const label = labelPorStatus[statusAtivo] || statusAtivo;
                              return `Não há contas com o status "${label}".`;
                            })()
                          : fornecedorFilterId != null && fornecedorFilterId > 0
                          ? "Não há contas desse fornecedor."
                          : transacoesDisplay.length === 0 && !isLoadingContas
                          ? "Não há contas a pagar no momento"
                          : dashboardPagar?.total === 0
                          ? "Nenhuma conta a pagar em aberto"
                          : "Nenhuma conta a pagar encontrada"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransacoes.map((transacao) => (
                  <TableRow
                    key={
                      (transacao as { rowKey?: string }).rowKey ??
                      rowKeyContasPagar(transacao as { id: string; contaId?: number; pedidoId?: number })
                    }
                  >
                    <TableCell>
                      <span className="font-medium">{transacao.id}</span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const o = (transacao as { origemConta?: string })
                          .origemConta;
                        const pedidoIdRow = (transacao as { pedidoId?: number })
                          .pedidoId;
                        const isDespesa =
                          o === "DESPESA" ||
                          (o === undefined &&
                            (pedidoIdRow == null || !Number.isFinite(pedidoIdRow)));
                        return isDespesa ? (
                          <Badge
                            variant="outline"
                            className="whitespace-nowrap border-sky-300 bg-sky-50 font-medium text-sky-900"
                            title="Conta gerada pelo Centro de despesa (ou avulsa, sem pedido de compra)"
                          >
                            Despesa
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="whitespace-nowrap border-sky-300 bg-sky-50 font-medium text-sky-900"
                            title="Conta vinculada a pedido de compra"
                          >
                            Compra
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{transacao.fornecedor}</span>
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
                      <span className="text-sm text-muted-foreground">{(transacao as any).valorPago ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      {transacao.status === "Concluído" || transacao.status === "Cancelado" ? (
                        <span className="text-sm text-muted-foreground">--</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{transacao.data}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Status do pedido - não editável diretamente, apenas visualização */}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(transacao.status)}`}>
                        {transacao.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TableRowActionsMenu>
                          <DropdownMenuItem onClick={() => {
                            if ((transacao as any).pedidoId) {
                              navigate(`/financeiro/contas-pagar/${(transacao as any).pedidoId}`);
                            } else if (transacao.contaId != null) {
                              navigate(
                                `/financeiro/contas-pagar/despesa/${transacao.contaId}`,
                              );
                            }
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                let contaId: number | null = null;
                                if ((transacao as any).pedidoId != null) {
                                  contaId = await financeiroService.getContaIdPorPedidoId(
                                    (transacao as any).pedidoId,
                                    "PAGAR",
                                  );
                                } else {
                                  contaId = transacao.contaId ?? null;
                                }
                                if (contaId == null) {
                                  toast.error(
                                    "Conta financeira não encontrada para este item.",
                                  );
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
                          {(transacao as any).podePagar &&
                            ((transacao as any).pedidoId ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(
                                    `/financeiro/contas-pagar/${(transacao as any).pedidoId}/pagamentos`,
                                  )
                                }
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pagar
                              </DropdownMenuItem>
                            ) : transacao.contaId ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(
                                    `/financeiro/contas-pagar/conta/${transacao.contaId}/pagamentos`,
                                  )
                                }
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pagar
                              </DropdownMenuItem>
                            ) : null)}
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                // Lista por pedidos: sempre obter conta pelo pedidoId (contaId na linha é pedido_id, não conta financeira)
                                let contaId: number | null = null;
                                if ((transacao as any).pedidoId != null) {
                                  contaId = await financeiroService.getContaIdPorPedidoId((transacao as any).pedidoId, 'PAGAR');
                                } else {
                                  contaId = transacao.contaId ?? null;
                                }
                                if (contaId == null) {
                                  toast.error('Conta financeira não encontrada para este item.');
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
                          {(transacao as any).pedidoId &&
                            (() => {
                              const st = String(
                                (transacao as any).statusOriginal ||
                                  transacao.status ||
                                  "",
                              ).toUpperCase();
                              const stLabel = String(transacao.status || "").toLowerCase();
                              return (
                                st !== "CANCELADO" &&
                                st !== "QUITADO" &&
                                st !== "PAGO_TOTAL" &&
                                stLabel !== "cancelado" &&
                                stLabel !== "quitado" &&
                                stLabel !== "pago total"
                              );
                            })() && (
                            <DropdownMenuItem
                              className="text-orange-600 focus:text-orange-600"
                              onClick={() =>
                                setPedidoCancelar({
                                  id: Number((transacao as any).pedidoId),
                                  label: String(
                                    transacao.id ||
                                      `Pedido #${(transacao as any).pedidoId}`,
                                  ),
                                })
                              }
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Cancelar pedido
                            </DropdownMenuItem>
                          )}
                          {(() => {
                            const st = String(
                              (transacao as any).statusOriginal ||
                                transacao.status ||
                                "",
                            ).toUpperCase();
                            const stLabel = String(transacao.status || "").toLowerCase();
                            const quitado =
                              st === "QUITADO" ||
                              st === "PAGO_TOTAL" ||
                              stLabel === "quitado" ||
                              stLabel === "pago total";
                            if (quitado) return null;
                            const pedidoId = (transacao as any).pedidoId;
                            if (pedidoId != null) {
                              return (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setItemApagar({
                                      tipo: "pedido",
                                      id: Number(pedidoId),
                                      label: String(
                                        transacao.id || `Pedido #${pedidoId}`,
                                      ),
                                    })
                                  }
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              );
                            }
                            if (transacao.contaId != null) {
                              return (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setItemApagar({
                                      tipo: "conta",
                                      id: Number(transacao.contaId),
                                      label: String(
                                        transacao.id || `Conta #${transacao.contaId}`,
                                      ),
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
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="border-t border-border p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              
              <div className="text-center text-sm text-muted-foreground mt-2">
                Mostrando {totalContas > 0 ? (currentPage - 1) * pageSize + 1 : 0} a {Math.min(currentPage * pageSize, totalContas)} de {totalContas} contas
              </div>
            </div>
          )}
        </motion.div>

        <EditarContaFinanceiraDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedContaId(null);
          }}
          contaId={selectedContaId}
          title={editDialogTitle}
          description="Edite os campos desejados da conta a pagar"
          tipoFixo="PAGAR"
          fornecedores={fornecedores}
          pedidos={pedidos}
          invalidateQueryKeys={[
            ["contas-financeiras"],
            ["dashboard-pagar"],
            ["dashboard-resumo-financeiro"],
            ["pedidos", "contas-pagar"],
          ]}
        />
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
                <Label htmlFor="relatorio-fornecedor-select">Fornecedor</Label>
                <Select
                  value={relatorioFornecedorIdSelect}
                  onValueChange={setRelatorioFornecedorIdSelect}
                >
                  <SelectTrigger id="relatorio-fornecedor-select">
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
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Todos" id="relatorio-fornecedor-status-todos" /><Label htmlFor="relatorio-fornecedor-status-todos" className="cursor-pointer">Todos</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PENDENTE" id="relatorio-fornecedor-status-pendente" /><Label htmlFor="relatorio-fornecedor-status-pendente" className="cursor-pointer">Pendente</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_PARCIAL" id="relatorio-fornecedor-status-parcial" /><Label htmlFor="relatorio-fornecedor-status-parcial" className="cursor-pointer">Pago Parcial</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_TOTAL" id="relatorio-fornecedor-status-quitado" /><Label htmlFor="relatorio-fornecedor-status-quitado" className="cursor-pointer">Quitada</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="VENCIDO" id="relatorio-fornecedor-status-vencido" /><Label htmlFor="relatorio-fornecedor-status-vencido" className="cursor-pointer">Vencido</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="CANCELADO" id="relatorio-fornecedor-status-cancelado" /><Label htmlFor="relatorio-fornecedor-status-cancelado" className="cursor-pointer">Cancelado</Label></div>
                  </RadioGroup>
                </div>
              </div>

              {relatorioFornecedorPreviewFetching &&
                relatorioFornecedorIdParsed != null && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando filtros…
                  </p>
                )}

              {relatorioFornecedorPreviewError &&
                relatorioFornecedorIdParsed != null && (
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
        <Dialog
          open={relatorioGeralPdfOpen}
          onOpenChange={(open) => {
            setRelatorioGeralPdfOpen(open);
            if (open) {
              setRelatorioGeralDataInicial(dataInicialFilter || "");
              setRelatorioGeralDataFinal(dataFinalFilter || "");
              setRelatorioGeralStatusFiltro(
                statusFilter && statusFilter !== "" ? statusFilter : "Todos",
              );
              setRelatorioGeralCampoData("vencimento");
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório geral</DialogTitle>
              <DialogDescription>
                Inclui dados da empresa e todos os lançamentos de contas a pagar conforme os
                filtros selecionados (período por data de vencimento ou emissão e status).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Filtrar período por</Label>
                  <RadioGroup
                    value={relatorioGeralCampoData}
                    onValueChange={(v) =>
                      setRelatorioGeralCampoData(v === "emissao" ? "emissao" : "vencimento")
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vencimento" id="relatorio-geral-pagar-campo-vencimento" />
                      <Label htmlFor="relatorio-geral-pagar-campo-vencimento" className="cursor-pointer">
                        Data de vencimento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="emissao" id="relatorio-geral-pagar-campo-emissao" />
                      <Label htmlFor="relatorio-geral-pagar-campo-emissao" className="cursor-pointer">
                        Data de emissão
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <RelatorioPeriodoFinanceiro
                  dataInicial={relatorioGeralDataInicial}
                  dataFinal={relatorioGeralDataFinal}
                  onDataInicial={setRelatorioGeralDataInicial}
                  onDataFinal={setRelatorioGeralDataFinal}
                />

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Status</Label>
                  <RadioGroup
                    value={relatorioGeralStatusFiltro}
                    onValueChange={setRelatorioGeralStatusFiltro}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Todos" id="relatorio-geral-status-todos" /><Label htmlFor="relatorio-geral-status-todos" className="cursor-pointer">Todos</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PENDENTE" id="relatorio-geral-status-pendente" /><Label htmlFor="relatorio-geral-status-pendente" className="cursor-pointer">Pendente</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_PARCIAL" id="relatorio-geral-status-parcial" /><Label htmlFor="relatorio-geral-status-parcial" className="cursor-pointer">Pago Parcial</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_TOTAL" id="relatorio-geral-status-quitado" /><Label htmlFor="relatorio-geral-status-quitado" className="cursor-pointer">Quitada</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="VENCIDO" id="relatorio-geral-status-vencido" /><Label htmlFor="relatorio-geral-status-vencido" className="cursor-pointer">Vencido</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="CANCELADO" id="relatorio-geral-status-cancelado" /><Label htmlFor="relatorio-geral-status-cancelado" className="cursor-pointer">Cancelado</Label></div>
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
                      relatorioGeralPdfLoading
                    }
                    onClick={async () => {
                      setRelatorioGeralPdfLoading(true);
                      try {
                        await relatoriosClienteService.downloadRelatorioGeralContasPagar(
                          relatorioGeralFiltrosForPdf,
                        );
                        toast.success("PDF baixado.");
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao gerar PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioGeralPdfLoading(false);
                      }
                    }}
                  >
                    {relatorioGeralPdfLoading ? (
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
                      relatorioGeralPdfLoading
                    }
                    onClick={async () => {
                      setRelatorioGeralPdfLoading(true);
                      try {
                        await relatoriosClienteService.imprimirRelatorioGeralContasPagar(
                          relatorioGeralFiltrosForPdf,
                        );
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao abrir PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioGeralPdfLoading(false);
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
          open={relatorioCentroCustoPdfOpen}
          onOpenChange={(open) => {
            setRelatorioCentroCustoPdfOpen(open);
            if (open) {
              setRelatorioCentroCustoDataInicial(dataInicialFilter || "");
              setRelatorioCentroCustoDataFinal(dataFinalFilter || "");
              setRelatorioCentroCustoStatusFiltro(
                statusFilter && statusFilter !== "" ? statusFilter : "Todos",
              );
              setRelatorioCentroCustoTipoSelect("todos");
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório por centro de custo</DialogTitle>
              <DialogDescription>
                Despesas do centro de custo espelhadas em contas a pagar. Filtre por tipo de
                despesa, período (vencimento) e status.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="relatorio-centro-custo-tipo">Tipo de despesa</Label>
                <Select
                  value={relatorioCentroCustoTipoSelect || "todos"}
                  onValueChange={setRelatorioCentroCustoTipoSelect}
                >
                  <SelectTrigger id="relatorio-centro-custo-tipo">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {relatorioCentroCustoTipos.map((tipo) => (
                      <SelectItem key={tipo.id} value={String(tipo.id)}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Período</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                      <Input
                        type="date"
                        className="rounded-lg border-border/80 bg-muted/50"
                        value={relatorioCentroCustoDataInicial}
                        onChange={(e) =>
                          setRelatorioCentroCustoDataInicial(e.target.value || "")
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Data Final</Label>
                      <Input
                        type="date"
                        className="rounded-lg border-border/80 bg-muted/50"
                        value={relatorioCentroCustoDataFinal}
                        onChange={(e) =>
                          setRelatorioCentroCustoDataFinal(e.target.value || "")
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#1A3B70]">Status</Label>
                  <RadioGroup
                    value={relatorioCentroCustoStatusFiltro}
                    onValueChange={setRelatorioCentroCustoStatusFiltro}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Todos" id="relatorio-cc-status-todos" /><Label htmlFor="relatorio-cc-status-todos" className="cursor-pointer">Todos</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PENDENTE" id="relatorio-cc-status-pendente" /><Label htmlFor="relatorio-cc-status-pendente" className="cursor-pointer">Pendente</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_PARCIAL" id="relatorio-cc-status-parcial" /><Label htmlFor="relatorio-cc-status-parcial" className="cursor-pointer">Pago Parcial</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PAGO_TOTAL" id="relatorio-cc-status-quitado" /><Label htmlFor="relatorio-cc-status-quitado" className="cursor-pointer">Quitada</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="VENCIDO" id="relatorio-cc-status-vencido" /><Label htmlFor="relatorio-cc-status-vencido" className="cursor-pointer">Vencido</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="CANCELADO" id="relatorio-cc-status-cancelado" /><Label htmlFor="relatorio-cc-status-cancelado" className="cursor-pointer">Cancelado</Label></div>
                  </RadioGroup>
                </div>
              </div>

              {relatorioCentroCustoPreviewFetching && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando filtros…
                </p>
              )}

              {relatorioCentroCustoPreviewError && (
                <p className="text-sm text-destructive">
                  {(relatorioCentroCustoPreviewErr as Error)?.message ||
                    "Não foi possível verificar os filtros."}{" "}
                  Você ainda pode baixar o PDF.
                </p>
              )}

              {!relatorioCentroCustoPreviewFetching &&
                !relatorioCentroCustoPreviewError &&
                relatorioCentroCustoPreviewTotal === 0 && (
                  <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm text-[#1A3B70]">
                    {relatorioCentroCustoMensagemSemDados}
                  </p>
                )}

              {!relatorioCentroCustoPreviewFetching &&
                relatorioCentroCustoTemDados && (
                  <p className="text-sm text-muted-foreground">
                    {relatorioCentroCustoPreviewTotal} lançamento(s) encontrado(s) com os filtros atuais.
                  </p>
                )}

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <Button
                    type="button"
                    variant="relatorioPrimary"
                    className="flex-1 gap-2"
                    disabled={relatorioCentroCustoPdfLoading}
                    onClick={async () => {
                      setRelatorioCentroCustoPdfLoading(true);
                      try {
                        await relatoriosClienteService.downloadRelatorioCentroCustoContasPagar(
                          relatorioCentroCustoFiltrosForPdf,
                        );
                        toast.success("PDF baixado.");
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao gerar PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioCentroCustoPdfLoading(false);
                      }
                    }}
                  >
                    {relatorioCentroCustoPdfLoading ? (
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
                    disabled={relatorioCentroCustoPdfLoading}
                    onClick={async () => {
                      setRelatorioCentroCustoPdfLoading(true);
                      try {
                        await relatoriosClienteService.imprimirRelatorioCentroCustoContasPagar(
                          relatorioCentroCustoFiltrosForPdf,
                        );
                      } catch (e: unknown) {
                        const msg =
                          e instanceof Error ? e.message : "Erro ao abrir PDF.";
                        toast.error(msg);
                      } finally {
                        setRelatorioCentroCustoPdfLoading(false);
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
                O pedido será marcado como cancelado e sairá das Contas a Pagar.
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
      </div>
    </AppLayout>
  );
}

export default ContasAPagar;
