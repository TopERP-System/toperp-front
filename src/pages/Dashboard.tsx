import AppLayout from "@/components/layout/AppLayout";
import { DashboardSectionErrorBoundary } from "@/components/dashboard/DashboardSectionErrorBoundary";
import { DreEstoqueMetricas } from "@/components/dashboard/DreEstoqueMetricas";
import { DreFaturamentoLucro } from "@/components/dashboard/DreFaturamentoLucro";
import { ModuleStatCard } from "@/components/layout/ModuleStatCards";
import { OrderStats } from "@/components/orders/OrderStats";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { downloadDrePdf, imprimirDrePdf } from "@/lib/dre-pdf";
import { canAccessFinanceiro } from "@/lib/role-access";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatISODateLocal } from "@/lib/utils";
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import {
  centroCustoService,
  type ApiCentroCustoDespesa,
} from "@/services/centro-custo.service";
import { controleRocaService } from "@/services/controle-roca.service";
import { estoqueService } from "@/services/estoque.service";
import { financeiroService } from "@/services/financeiro.service";
import { pedidosService } from "@/services/pedidos.service";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    BarChart3,
    Building2,
    Coins,
    Download,
    ListFilter,
    Loader2,
    Printer,
    ShoppingCart,
    TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { MonthYearSelect } from "@/components/ui/MonthYearSelect";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type PainelMetricKind = "compras" | "vendas" | "saldo";

/** Recorte da 3ª faixa quando "Todos os meses" (histórico geral). */
type PainelTotaisGeraisModo = "emissao" | "pagos" | "a_receber";

function painelMetricKindFromLegenda(legenda: string): PainelMetricKind {
  const l = legenda.toLowerCase();
  if (l.includes("saldo")) return "saldo";
  if (l.includes("receber") && l.includes("aberto")) return "vendas";
  if (l.includes("recebido")) return "vendas";
  if (l.includes("venda")) return "vendas";
  if (l.includes("pagar") && l.includes("aberto")) return "compras";
  if (l.includes("pago") && !l.includes("saldo")) return "compras";
  if (l.includes("compra")) return "compras";
  return "compras";
}

function tituloLegendaPainel(legenda: string): string {
  const map: Record<string, string> = {
    "compras do mês": "Compras do mês",
    "venda do mês": "Vendas do mês",
    "saldo do mês": "Saldo do mês",
    "compras paga": "Compras pagas",
    "vendas recebida": "Vendas recebidas",
    saldo: "Saldo",
    "total pago": "Total pago",
    "total recebido": "Total recebido",
    "saldo (caixa acumulado)": "Saldo (caixa acumulado)",
    "a pagar (em aberto)": "A pagar (em aberto)",
    "a receber (em aberto)": "A receber (em aberto)",
    "saldo em aberto": "Saldo em aberto",
    "saldo do período": "Saldo do período",
  };
  return map[legenda.toLowerCase()] ?? legenda;
}

type PainelCardVisual = {
  iconWrap: string;
  iconClass: string;
  valueClass: string;
  cardClassName: string;
  labelClassName: string;
  Icon: LucideIcon;
};

function painelCardVisual(kind: PainelMetricKind, valor: number): PainelCardVisual {
  const positivo = {
    cardClassName: "border-emerald-100 bg-emerald-50/90 shadow-none dark:border-emerald-900/50 dark:bg-emerald-950/30",
    iconWrap: "bg-emerald-100 dark:bg-emerald-900/50",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    valueClass: "text-emerald-700 dark:text-emerald-400",
    labelClassName: "text-emerald-800/70 dark:text-emerald-300/80",
  };
  const negativo = {
    cardClassName: "border-red-100 bg-red-50/90 shadow-none dark:border-red-900/50 dark:bg-red-950/30",
    iconWrap: "bg-red-100 dark:bg-red-900/50",
    iconClass: "text-red-600 dark:text-red-400",
    valueClass: "text-red-600 dark:text-red-400",
    labelClassName: "text-red-800/70 dark:text-red-300/80",
  };

  if (kind === "compras") {
    return { ...negativo, Icon: ShoppingCart };
  }
  if (kind === "vendas") {
    return { ...positivo, Icon: TrendingUp };
  }
  /** Saldo: verde se >= 0, vermelho se negativo (como no mock). */
  return {
    ...(valor < 0 ? negativo : positivo),
    Icon: Coins,
  };
}

/** API pode devolver número ou string decimal; JSON às vezes vem em camelCase. */
function numPainel(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mesAnoAtualLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Máximo por página na API de centro de custo (backend limita em 100). */
const CC_DRE_PAGE_LIMIT = 100;

async function agregarCentroCustoParaDre(filtros: {
  dataInicial?: string;
  dataFinal?: string;
  rocaId?: number;
}): Promise<{
  items: { tipoId: number; nome: string; valor: number }[];
  total: number;
}> {
  const toNum = (v: unknown) => {
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  try {
    const res = await centroCustoService.agregarDespesasPorTipo(filtros);
    const items = (res?.items ?? []).map((t) => ({
      tipoId: Number(t.tipoId) || 0,
      nome: String(t.nome || `Tipo #${t.tipoId}`),
      valor: Number(toNum(t.valor).toFixed(2)),
    }));
    return {
      items,
      total: Number(
        (res?.total != null
          ? toNum(res.total)
          : items.reduce((s, x) => s + x.valor, 0)
        ).toFixed(2),
      ),
    };
  } catch {
    const despesas: ApiCentroCustoDespesa[] = [];
    let totalRegistros = Infinity;
    let page = 1;
    const maxPages = 50;
    while (
      page <= maxPages &&
      (page - 1) * CC_DRE_PAGE_LIMIT < totalRegistros
    ) {
      const res = await centroCustoService.listarDespesas(
        page,
        CC_DRE_PAGE_LIMIT,
        filtros,
      );
      totalRegistros = Number(res?.total) || 0;
      const batch = res?.items ?? [];
      despesas.push(...batch);
      if (!batch.length) break;
      page += 1;
    }
    const porTipo = new Map<number, { nome: string; valor: number }>();
    for (const d of despesas) {
      const tipoId = Number(d.tipoId) || 0;
      if (tipoId <= 0) continue;
      const valor = toNum(d.valor);
      const nome = (d.tipoNome || `Tipo #${tipoId}`).trim();
      const cur = porTipo.get(tipoId);
      if (cur) cur.valor += valor;
      else porTipo.set(tipoId, { nome, valor });
    }
    const items = [...porTipo.entries()]
      .sort((a, b) =>
        a[1].nome.localeCompare(b[1].nome, 'pt-BR', { sensitivity: 'base' }),
      )
      .map(([tipoId, { nome, valor }]) => ({
        tipoId,
        nome,
        valor: Number(valor.toFixed(2)),
      }));
    return {
      items,
      total: Number(items.reduce((s, x) => s + x.valor, 0).toFixed(2)),
    };
  }
}

const Dashboard = () => {
  const { user } = useAuth();
  const acessoFinanceiro = canAccessFinanceiro(user?.role);
  const rotulo = useRotuloRoca();

  /** Vazio = totais da 3ª faixa são histórico geral; linhas 1–2 usam o mês atual como referência. */
  const [mesAnoFiltro, setMesAnoFiltro] = useState<string>("");
  /** Só aplicado com "Todos os meses" (`painel_totais_gerais` no backend). */
  const [totaisGeraisModo, setTotaisGeraisModo] =
    useState<PainelTotaisGeraisModo>("pagos");
  const [dreMesAnoFiltro, setDreMesAnoFiltro] = useState<string>(() =>
    mesAnoAtualLocal(),
  );
  /** Dia da posição de estoque no dashboard. */
  const [estoqueData, setEstoqueData] = useState(() =>
    formatISODateLocal(new Date()),
  );
  const [drePdfLoading, setDrePdfLoading] = useState<"download" | "print" | null>(
    null,
  );
  /** Filtro de roça compartilhado: painel financeiro (3 faixas) e DRE. */
  const [rocaFiltro, setRocaFiltro] = useState<string>("all");

  const refMesYyyyMm = useMemo(() => {
    const mesEscolhido = mesAnoFiltro?.trim();
    return mesEscolhido || mesAnoAtualLocal();
  }, [mesAnoFiltro]);
  const rocaIdFiltro = useMemo(() => {
    if (rocaFiltro === "all" || !Number.isFinite(Number(rocaFiltro))) return undefined;
    const id = Number(rocaFiltro);
    return id > 0 ? id : undefined;
  }, [rocaFiltro]);

  const parametrosDashboardFinanceiro = useMemo(() => {
    const mesEscolhido = mesAnoFiltro?.trim();
    const chave = mesEscolhido || mesAnoAtualLocal();
    const parts = chave.split("-").map(Number);
    const ref = parts[0] && parts[1] ? parts : mesAnoAtualLocal().split("-").map(Number);
    const [ano, mes] = ref;
    const primeiro = new Date(ano, mes - 1, 1);
    const ultimo = new Date(ano, mes, 0);
    return {
      data_inicial: formatISODateLocal(primeiro),
      data_final: formatISODateLocal(ultimo),
      painel_totais_gerais: true,
      ...(totaisGeraisModo !== "emissao"
        ? { painel_totais_gerais_modo: totaisGeraisModo }
        : {}),
      ...(rocaIdFiltro ? { roca_id: rocaIdFiltro } : {}),
    };
  }, [mesAnoFiltro, totaisGeraisModo, rocaIdFiltro]);

  const parametrosDre = useMemo(() => {
    const anoReferencia = Number(refMesYyyyMm.split("-")[0]) || new Date().getFullYear();
    const mesEscolhido = dreMesAnoFiltro?.trim();
    /** Vazio = mesmo recorte do Centro de Despesa sem filtro de data (todas as despesas). */
    if (!mesEscolhido) {
      return {
        semRecorteData: true as const,
        rotuloPeriodo: "Todo o período",
      };
    }
    const [ano, mes] = mesEscolhido.split("-").map(Number);
    const anoValido = Number.isFinite(ano) && ano > 0 ? ano : anoReferencia;
    const mesValido = Number.isFinite(mes) && mes > 0 ? mes : 1;
    const primeiro = new Date(anoValido, mesValido - 1, 1);
    const ultimo = new Date(anoValido, mesValido, 0);
    return {
      semRecorteData: false as const,
      data_inicial: formatISODateLocal(primeiro),
      data_final: formatISODateLocal(ultimo),
      rotuloPeriodo: `${String(mesValido).padStart(2, "0")}/${anoValido}`,
    };
  }, [dreMesAnoFiltro, refMesYyyyMm]);

  const { data: dashboardUnificado, isLoading: loadingUnificado } = useQuery({
    queryKey: [
      "dashboard",
      "unificado",
      parametrosDashboardFinanceiro,
      totaisGeraisModo,
      rocaFiltro,
    ],
    queryFn: () => financeiroService.getDashboardUnificado(parametrosDashboardFinanceiro),
    refetchInterval: 30000,
    retry: false,
    enabled: acessoFinanceiro,
  });

  const { data: rocasOpcoes = [] } = useQuery({
    queryKey: ["dashboard", "rocas-opcoes"],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: acessoFinanceiro,
  });

  const painelFinanceiro = useMemo(() => {
    if (!dashboardUnificado) return undefined;
    const u = dashboardUnificado as Record<string, unknown>;
    const raw =
      u.painel_acompanhamento ??
      u.painelAcompanhamento;
    if (!raw || typeof raw !== "object") return undefined;
    const p = raw as Record<string, unknown>;
    const linhaReg =
      (p.linha_registrado as Record<string, unknown>) ??
      (p.linhaRegistrado as Record<string, unknown>);
    const linhaCaixa =
      (p.linha_caixa as Record<string, unknown>) ??
      (p.linhaCaixa as Record<string, unknown>);
    const linhaTot =
      (p.linha_totais_periodo as Record<string, unknown>) ??
      (p.linhaTotaisPeriodo as Record<string, unknown>);
    if (!linhaReg || !linhaCaixa || !linhaTot) return undefined;
    const regComprasRaw = numPainel(linhaReg.compras);
    const regVendas = numPainel(linhaReg.vendas);
    const regDespesas = numPainel(linhaReg.despesas);
    const caixaComprasRaw = numPainel(linhaCaixa.compras);
    const caixaVendas = numPainel(linhaCaixa.vendas);
    const caixaDespesas = numPainel(linhaCaixa.despesas);
    const totCompras = numPainel(linhaTot.compras);
    const totVendas = numPainel(linhaTot.vendas);
    const totDespesas = numPainel(linhaTot.despesas);
    /** Com roça: despesas do centro de custo entram em "compras" (mesma lógica do DRE). */
    const regCompras = rocaIdFiltro
      ? Number(Math.max(regComprasRaw, regDespesas).toFixed(2))
      : regComprasRaw;
    const caixaCompras = rocaIdFiltro
      ? Number(Math.max(caixaComprasRaw, caixaDespesas).toFixed(2))
      : caixaComprasRaw;
    /** Mantém o saldo visual coerente com os cards exibidos: vendas - compras. */
    const saldoRegCalculado = Number((regVendas - regCompras).toFixed(2));
    const saldoCaixaCalculado = Number((caixaVendas - caixaCompras).toFixed(2));
    const saldoTotCalculado = Number((totVendas - totCompras).toFixed(2));

    return {
      linha_registrado: {
        compras: regCompras,
        despesas: regDespesas,
        vendas: regVendas,
        saldo: saldoRegCalculado,
      },
      linha_caixa: {
        compras: caixaCompras,
        despesas: caixaDespesas,
        vendas: caixaVendas,
        saldo: saldoCaixaCalculado,
      },
      linha_totais_periodo: {
        compras: totCompras,
        despesas: totDespesas,
        vendas: totVendas,
        saldo: saldoTotCalculado,
      },
    };
  }, [dashboardUnificado, rocaIdFiltro]);

  const painelBlocos = useMemo(() => {
    if (!painelFinanceiro) return null;
    const f = painelFinanceiro;

    let totaisCelulas: { legenda: string; valor: number }[];
    let totaisSubtitulo: string;
    if (totaisGeraisModo === "pagos") {
      const pagoTotal =
        f.linha_totais_periodo.compras + f.linha_totais_periodo.despesas;
      const saldoCaixaAcumulado = Number(
        (f.linha_totais_periodo.vendas - pagoTotal).toFixed(2),
      );
      totaisCelulas = [
        { legenda: "Total pago", valor: pagoTotal },
        { legenda: "Total recebido", valor: f.linha_totais_periodo.vendas },
        {
          legenda: "Saldo (caixa acumulado)",
          valor: saldoCaixaAcumulado,
        },
      ];
      totaisSubtitulo =
        "Caixa acumulado: pagamentos em contas a pagar, recebimentos de vendas e despesas pagas (centro de custo).";
    } else if (totaisGeraisModo === "a_receber") {
      totaisCelulas = [
        {
          legenda: "A pagar (em aberto)",
          valor: f.linha_totais_periodo.compras,
        },
        {
          legenda: "A receber (em aberto)",
          valor: f.linha_totais_periodo.vendas,
        },
        { legenda: "Saldo em aberto", valor: f.linha_totais_periodo.saldo },
      ];
      totaisSubtitulo =
        "Soma do valor em aberto nas contas a pagar e a receber (pendente de quitação).";
    } else {
      totaisCelulas = [
        { legenda: "Total pago", valor: f.linha_totais_periodo.compras },
        { legenda: "Total recebido", valor: f.linha_totais_periodo.vendas },
        { legenda: "saldo do período", valor: f.linha_totais_periodo.saldo },
      ];
      totaisSubtitulo =
        "Acumulado de todas as competências no sistema (independente do mês das linhas acima).";
    }

    return [
      {
        etapa: 1 as const,
        pill: "Competência",
        titulo: "Lançamentos no mês",
        subtitulo:
          "Recorte por data de emissão da conta no período (competência contábil).",
        celulas: [
          { legenda: "compras do mês", valor: f.linha_registrado.compras },
          { legenda: "venda do mês", valor: f.linha_registrado.vendas },
          { legenda: "saldo do mês", valor: f.linha_registrado.saldo },
        ],
      },
      {
        etapa: 2 as const,
        pill: "Caixa",
        titulo: "Pago / recebido no período",
        subtitulo:
          "Efetivação financeira conforme datas de pagamento e recebimentos.",
        celulas: [
          { legenda: "compras paga", valor: f.linha_caixa.compras },
          { legenda: "vendas recebida", valor: f.linha_caixa.vendas },
          { legenda: "saldo", valor: f.linha_caixa.saldo },
        ],
      },
      {
        etapa: 3 as const,
        pill: "Totais",
        titulo: "Totais gerais",
        subtitulo: totaisSubtitulo,
        celulas: totaisCelulas,
        mostrarFiltroTotais: true,
      },
    ];
  }, [painelFinanceiro, mesAnoFiltro, totaisGeraisModo]);

  const { data: dreDadosReais, isLoading: loadingDre } = useQuery({
    queryKey: ["dashboard", "dre-real", parametrosDre, rocaFiltro],
    queryFn: async () => {
      /** Período do funil = mês do DRE, ou mês atual (igual à competência do painel). */
      const periodoFunil = (() => {
        if (!parametrosDre.semRecorteData) {
          return {
            data_inicial: parametrosDre.data_inicial,
            data_final: parametrosDre.data_final,
          };
        }
        const [ano, mes] = mesAnoAtualLocal().split("-").map(Number);
        const primeiro = new Date(ano, mes - 1, 1);
        const ultimo = new Date(ano, mes, 0);
        return {
          data_inicial: formatISODateLocal(primeiro),
          data_final: formatISODateLocal(ultimo),
        };
      })();

      const filtrosCentroCusto = parametrosDre.semRecorteData
        ? { ...(rocaIdFiltro ? { rocaId: rocaIdFiltro } : {}) }
        : {
            dataInicial: parametrosDre.data_inicial,
            dataFinal: parametrosDre.data_final,
            ...(rocaIdFiltro ? { rocaId: rocaIdFiltro } : {}),
          };

      const filtrosCentroCustoFunil = {
        dataInicial: periodoFunil.data_inicial,
        dataFinal: periodoFunil.data_final,
        ...(rocaIdFiltro ? { rocaId: rocaIdFiltro } : {}),
      };

      const paramsDashboard = parametrosDre.semRecorteData
        ? {
            painel_totais_gerais: true as const,
            ...(rocaIdFiltro ? { roca_id: rocaIdFiltro } : {}),
          }
        : {
            data_inicial: parametrosDre.data_inicial,
            data_final: parametrosDre.data_final,
            painel_totais_gerais: true as const,
            ...(rocaIdFiltro ? { roca_id: rocaIdFiltro } : {}),
          };

      const [resumoFinanceiroMes, agregadoCentroCusto, margemContribuicao, agregadoFunil] =
        await Promise.all([
          financeiroService.getDashboardUnificado(paramsDashboard),
          agregarCentroCustoParaDre(filtrosCentroCusto),
          pedidosService
            .getRelatorioMargemContribuicao({
              data_inicial: periodoFunil.data_inicial,
              data_final: periodoFunil.data_final,
              ...(rocaIdFiltro ? { roca_id: rocaIdFiltro } : {}),
            })
            .catch(() => null),
          parametrosDre.semRecorteData
            ? agregarCentroCustoParaDre(filtrosCentroCustoFunil)
            : Promise.resolve(null),
        ]);

      const resumoRaw = resumoFinanceiroMes as Record<string, unknown>;
      const painelRaw =
        (resumoRaw.painel_acompanhamento as Record<string, unknown>) ??
        (resumoRaw.painelAcompanhamento as Record<string, unknown>) ??
        {};
      const linhaReg =
        (painelRaw.linha_registrado as Record<string, unknown>) ??
        (painelRaw.linhaRegistrado as Record<string, unknown>) ??
        {};
      /**
       * Faturamento = pedidos ATENDIDO (itens no período) + receitas Visão Geral.
       * Pedidos Aberto não entram.
       */
      const totalVendasEfetivas = numPainel(linhaReg.vendas);
      const totalFornecedores = numPainel(linhaReg.compras);

      const fornecedoresPorTipo = agregadoCentroCusto.items;
      const somaCentroDespesaNoPeriodo = agregadoCentroCusto.total;

      /** Com recorte mensal: diferença entre contas a pagar (competência) e centro de custo no mesmo período. */
      const fornecedoresDemaisCompras = parametrosDre.semRecorteData
        ? 0
        : Math.max(
            0,
            Number(
              (totalFornecedores - somaCentroDespesaNoPeriodo).toFixed(2),
            ),
          );

      const totalDespesasEfetivasDre = parametrosDre.semRecorteData
        ? somaCentroDespesaNoPeriodo
        : fornecedoresPorTipo.length === 0 && fornecedoresDemaisCompras <= 0.005
          ? totalFornecedores
          : Number(
              (somaCentroDespesaNoPeriodo + fornecedoresDemaisCompras).toFixed(
                2,
              ),
            );

      const receitaItens = Number(margemContribuicao?.totais?.receita ?? 0);
      const custoItens = Number(margemContribuicao?.totais?.custo_variavel ?? 0);
      // Custo pela Margem, escalado ao faturamento (só Atendidos + Visão).
      const custoProduto =
        receitaItens > 0.009 && totalVendasEfetivas > 0.009
          ? Number(
              (totalVendasEfetivas * (custoItens / receitaItens)).toFixed(2),
            )
          : Number(custoItens.toFixed(2));
      const despesasGeraisFunil = Number(
        (
          (agregadoFunil?.total ?? somaCentroDespesaNoPeriodo) || 0
        ).toFixed(2),
      );

      return {
        totalVendasEfetivas,
        totalFornecedores,
        totalDespesasEfetivasDre,
        fornecedoresPorTipo,
        fornecedoresDemaisCompras,
        /** Centro de despesa (tabela DRE; pode ser todo o período). */
        despesasGerais: somaCentroDespesaNoPeriodo,
        /** Despesas do funil: mesmo mês do faturamento/CMV. */
        despesasGeraisFunil,
        custoProduto,
      };
    },
    refetchInterval: 30000,
    retry: false,
    enabled: acessoFinanceiro,
  });

  type DreLinha = {
    key: string;
    descricao: string;
    valor: number;
    percentual: number | null;
    indent?: boolean;
  };

  const dreLinhas = useMemo((): DreLinha[] => {
    const totalVendas = dreDadosReais?.totalVendasEfetivas ?? 0;
    const calcPct = (valor: number): number =>
      totalVendas > 0 ? Math.round((valor / totalVendas) * 100) : 0;

    const porTipo = dreDadosReais?.fornecedoresPorTipo ?? [];
    const demais = dreDadosReais?.fornecedoresDemaisCompras ?? 0;

    const linhasFornecedores: DreLinha[] = porTipo.map((t) => ({
      key: `forn-cc-${t.tipoId}`,
      descricao: t.nome,
      valor: t.valor,
      percentual: calcPct(t.valor),
      indent: true,
    }));

    if (demais > 0.005) {
      linhasFornecedores.push({
        key: "forn-demais",
        descricao: "Demais (fornecedores diretos / fora do centro de despesa)",
        valor: demais,
        percentual: calcPct(demais),
        indent: true,
      });
    }

    /** Nenhum lançamento de centro de despesa no período: mantém uma linha única como antes. */
    if (porTipo.length === 0 && demais <= 0.005) {
      const tf = dreDadosReais?.totalFornecedores ?? 0;
      linhasFornecedores.push({
        key: "forn-total",
        descricao: "Fornecedores",
        valor: tf,
        percentual: calcPct(tf),
      });
    }

    return [
      { key: "vendas", descricao: "Vendas", valor: totalVendas, percentual: 100 },
      ...linhasFornecedores,
    ];
  }, [dreDadosReais]);

  /** Mesma base do painel «Lançamentos no mês» (competência): resultado = vendas − despesas (despesas espelham a tabela do DRE). */
  const dreTotais = useMemo(() => {
    const totalVendasEfetivas = dreDadosReais?.totalVendasEfetivas ?? 0;
    const totalDespesasEfetivas =
      dreDadosReais?.totalDespesasEfetivasDre ??
      dreDadosReais?.totalFornecedores ??
      0;
    const resultadoEfetivoMes = Number(
      (totalVendasEfetivas - totalDespesasEfetivas).toFixed(2),
    );
    const margemResultado =
      totalVendasEfetivas > 0
        ? Number(((resultadoEfetivoMes / totalVendasEfetivas) * 100).toFixed(0))
        : 0;

    return {
      totalVendasEfetivas,
      totalDespesasEfetivas,
      resultadoEfetivoMes,
      margemResultado,
    };
  }, [dreDadosReais]);

  /** Funil alinhado ao painel de competência: vendas do mês − CMV do mês − despesas do mês. */
  const dreFaturamentoLucro = useMemo(() => {
    const faturamento = Number((dreDadosReais?.totalVendasEfetivas ?? 0).toFixed(2));
    const custoProduto = Number((dreDadosReais?.custoProduto ?? 0).toFixed(2));
    const despesasGerais = Number(
      (
        dreDadosReais?.despesasGeraisFunil ??
        dreDadosReais?.despesasGerais ??
        0
      ).toFixed(2),
    );
    const lucroBruto = Number((faturamento - custoProduto).toFixed(2));
    const lucroLiquido = Number((lucroBruto - despesasGerais).toFixed(2));

    return {
      faturamento,
      custoProduto,
      lucroBruto,
      despesasGerais,
      lucroLiquido,
    };
  }, [dreDadosReais]);

  const { data: metricasEstoqueDre, isLoading: loadingMetricasEstoque } =
    useQuery({
      queryKey: ["dashboard", "posicao-estoque", estoqueData],
      queryFn: () =>
        estoqueService.getMetricasDre({
          data_inicial: estoqueData,
          data_final: estoqueData,
        }),
      staleTime: 0,
      retry: false,
      enabled: acessoFinanceiro && !!estoqueData?.trim(),
    });

  const rocaDreNome = useMemo(() => {
    if (!rocaIdFiltro) return undefined;
    const roca = rocasOpcoes.find((r) => r.id === rocaIdFiltro);
    return roca?.nome ?? rotulo.comId(rocaIdFiltro);
  }, [rocaIdFiltro, rocasOpcoes, rotulo]);

  const drePdfPayload = useMemo(
    () => ({
      periodoRotulo: parametrosDre.rotuloPeriodo,
      rocaNome: rocaDreNome,
      linhas: dreLinhas.map((l) => ({
        descricao: l.descricao,
        valor: l.valor,
        percentual: l.percentual,
        indent: l.indent,
      })),
      totais: dreTotais,
    }),
    [parametrosDre.rotuloPeriodo, rocaDreNome, dreLinhas, dreTotais],
  );

  const exportarDrePdf = useCallback(
    async (acao: "download" | "print") => {
      if (loadingDre) {
        toast.error("Aguarde o carregamento do DRE.");
        return;
      }
      setDrePdfLoading(acao);
      try {
        if (acao === "download") {
          downloadDrePdf(drePdfPayload);
          toast.success("PDF baixado.");
        } else {
          imprimirDrePdf(drePdfPayload);
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Não foi possível gerar o PDF do DRE.",
        );
      } finally {
        setDrePdfLoading(null);
      }
    },
    [drePdfPayload, loadingDre],
  );

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {acessoFinanceiro
              ? "Visão geral do seu negócio"
              : "Resumo de pedidos do seu perfil"}
          </p>
        </div>

        {!acessoFinanceiro ? (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm"
          >
            <OrderStats variant="hero" />
            <p className="mt-4 text-sm text-muted-foreground text-center max-w-xl mx-auto">
              Seu perfil de vendedor tem acesso a pedidos, clientes e produtos.
              Relatórios financeiros ficam disponíveis para Administrador, Gerente ou Financeiro.
            </p>
          </motion.div>
        ) : null}

        {acessoFinanceiro ? (
        <>
        <DashboardSectionErrorBoundary label="painel financeiro">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
        >
          <div className="relative border-b border-border/80 bg-gradient-to-br from-slate-50/90 via-card to-sky-50/40 px-4 py-5 sm:px-6 dark:from-muted/30 dark:via-card dark:to-sky-950/20">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 min-w-0">
                <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Financeiro
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-foreground sm:text-2xl">
                    Dashboard de acompanhamento financeiro
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Lançamentos no mês (competência), movimentação de caixa no período e totais — alinhado ao endpoint da página Financeiro.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 overflow-x-auto bg-muted/20 dark:bg-muted/10">
            {loadingUnificado && !dashboardUnificado ? (
              <div className="flex justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Carregando acompanhamento financeiro...
              </div>
            ) : !dashboardUnificado ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Não foi possível carregar o resumo unificado. Verifique o endpoint{' '}
                <code className="text-xs bg-muted px-1 rounded">GET /financeiro/dashboard</code>.
              </p>
            ) : painelFinanceiro && painelBlocos ? (
              <div className="space-y-6 sm:space-y-8">
                {painelBlocos.map((bloco, blocoIdx) => (
                  <motion.section
                    key={bloco.titulo}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + blocoIdx * 0.06 }}
                    className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-[2px] sm:p-5 dark:bg-card/60"
                  >
                    <div className="mb-4 space-y-3">
                      <div
                        className={
                          bloco.etapa === 1 || String(bloco.etapa) === "3"
                            ? "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                            : undefined
                        }
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003366] text-xs font-bold text-white">
                            {bloco.etapa}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-muted dark:text-muted-foreground">
                            {bloco.pill}
                          </span>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-foreground sm:text-lg">
                            {bloco.titulo}
                          </h3>
                        </div>
                        {bloco.etapa === 1 ? (
                          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:ml-auto lg:w-auto lg:min-w-[28rem] lg:max-w-xl lg:shrink-0">
                            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 shadow-sm dark:bg-background/50">
                              <MonthYearSelect
                                id="dashboard-mes-ano"
                                label="Mês de referência"
                                value={mesAnoFiltro}
                                onChange={setMesAnoFiltro}
                                emptyLabel="Todos os meses"
                              />
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 shadow-sm dark:bg-background/50">
                              <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <ListFilter className="h-3.5 w-3.5 opacity-70" />
                                {rotulo.singular}
                              </Label>
                              <Select value={rocaFiltro} onValueChange={setRocaFiltro}>
                                <SelectTrigger
                                  id="dashboard-painel-roca"
                                  className="h-10 w-full"
                                  aria-label={`Filtrar painel por ${rotulo.singularLower}`}
                                >
                                  <SelectValue placeholder={rotulo.todas} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">{rotulo.todas}</SelectItem>
                                  {rocasOpcoes.map((roca) => (
                                    <SelectItem key={roca.id} value={String(roca.id)}>
                                      {roca.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : null}
                        {String(bloco.etapa) === "3" ? (
                          <div className="w-full max-w-md rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 shadow-sm lg:ml-auto lg:w-[22rem] lg:max-w-none lg:shrink-0 dark:bg-background/50">
                            <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <ListFilter className="h-3.5 w-3.5 opacity-70" />
                              Visão dos totais gerais
                            </Label>
                            <Select
                              value={totaisGeraisModo}
                              onValueChange={(v) =>
                                setTotaisGeraisModo(v as PainelTotaisGeraisModo)
                              }
                            >
                              <SelectTrigger
                                id="dashboard-totais-gerais-modo"
                                className="h-10 w-full"
                                aria-label="Filtro da seção totais gerais"
                              >
                                <SelectValue placeholder="Escolher visão" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pagos">
                                  Valores pagos e recebidos (caixa)
                                </SelectItem>
                                <SelectItem value="emissao">
                                  Faturamento (competência acumulada)
                                </SelectItem>
                                <SelectItem value="a_receber">
                                  Valores a receber e a pagar (em aberto)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <p className="mb-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {bloco.subtitulo}
                    </p>
                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                      {bloco.celulas.map((c, idx) => {
                        const valorN = numPainel(c.valor);
                        const kind = painelMetricKindFromLegenda(c.legenda);
                        const visual = painelCardVisual(kind, valorN);
                        return (
                          <motion.div
                            key={`${bloco.titulo}-${c.legenda}`}
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 + blocoIdx * 0.05 + idx * 0.04 }}
                          >
                            <ModuleStatCard
                              item={{
                                key: `${bloco.titulo}-${c.legenda}`,
                                label: tituloLegendaPainel(c.legenda),
                                value: formatCurrency(valorN),
                                iconWrap: visual.iconWrap,
                                iconClass: visual.iconClass,
                                valueClass: visual.valueClass,
                                labelClassName: visual.labelClassName,
                                cardClassName: visual.cardClassName,
                                Icon: visual.Icon,
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.section>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                O backend ainda não envia{' '}
                <code className="text-xs bg-muted px-1 rounded">painel_acompanhamento</code>. Atualize a API e recarregue.
              </p>
            )}
          </div>
        </motion.div>
        </DashboardSectionErrorBoundary>

        {/* DRE simplificado: faturamento → lucro líquido */}
        <DashboardSectionErrorBoundary label="DRE faturamento lucro">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <DreFaturamentoLucro
            faturamento={dreFaturamentoLucro.faturamento}
            custoProduto={dreFaturamentoLucro.custoProduto}
            lucroBruto={dreFaturamentoLucro.lucroBruto}
            despesasGerais={dreFaturamentoLucro.despesasGerais}
            lucroLiquido={dreFaturamentoLucro.lucroLiquido}
            loading={loadingDre}
            mesAno={dreMesAnoFiltro}
            onMesAnoChange={setDreMesAnoFiltro}
            periodoLabel={parametrosDre.rotuloPeriodo}
          />
        </motion.div>
        </DashboardSectionErrorBoundary>

        <DashboardSectionErrorBoundary label="Posição de estoque">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <DreEstoqueMetricas
            quantidade={metricasEstoqueDre?.fimPeriodo?.quantidade ?? 0}
            valor={metricasEstoqueDre?.fimPeriodo?.valor ?? 0}
            dataPosicao={metricasEstoqueDre?.fimPeriodo?.data}
            loading={loadingMetricasEstoque}
            data={estoqueData}
            onData={setEstoqueData}
          />
        </motion.div>
        </DashboardSectionErrorBoundary>

        {/* DRE - Demonstrativo de Resultados */}
        <DashboardSectionErrorBoundary label="DRE tabular">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-border dark:bg-card">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:border-border dark:bg-muted dark:text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  Financeiro
                </span>
                <h3 className="text-xl font-bold tracking-tight text-[#003366] dark:text-foreground sm:text-2xl">
                  DRE — Demonstrativo de Resultados
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
                  Valores por tipo espelham o Centro de Despesa
                  {parametrosDre.semRecorteData
                    ? " (todo o período)."
                    : ` (mês ${parametrosDre.rotuloPeriodo}).`}{" "}
                  Os totais à direita seguem a soma das linhas.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2 border-slate-200 bg-white text-[#003366] hover:bg-slate-50 dark:border-border dark:bg-background dark:text-foreground"
                    disabled={loadingDre || drePdfLoading !== null}
                    onClick={() => exportarDrePdf("download")}
                  >
                    {drePdfLoading === "download" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                  <Button
                    type="button"
                    className="h-10 gap-2 bg-[#003366] text-white hover:bg-[#002244]"
                    disabled={loadingDre || drePdfLoading !== null}
                    onClick={() => exportarDrePdf("print")}
                  >
                    {drePdfLoading === "print" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    Imprimir
                  </Button>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <div className="min-w-0 flex-1 sm:max-w-[14rem]">
                    <MonthYearSelect
                      id="dashboard-dre-mes-ano"
                      label="Mês"
                      value={dreMesAnoFiltro}
                      onChange={setDreMesAnoFiltro}
                      emptyLabel="Todo o período"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[14rem]">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <ListFilter className="h-3.5 w-3.5 opacity-70" />
                      {rotulo.singular}
                    </Label>
                    <Select value={rocaFiltro} onValueChange={setRocaFiltro}>
                      <SelectTrigger className="h-10 border-slate-200 bg-white dark:border-border dark:bg-background">
                        <SelectValue placeholder={rotulo.todas} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{rotulo.todas}</SelectItem>
                        {rocasOpcoes.map((roca) => (
                          <SelectItem key={roca.id} value={String(roca.id)}>
                            {roca.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12 xl:gap-5">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 xl:col-span-8 dark:border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-border dark:bg-muted/50">
                      <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Conta
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Valor
                      </TableHead>
                      <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        %
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dreLinhas.map((linha) => (
                      <TableRow
                        key={linha.key}
                        className="border-slate-100 dark:border-border"
                      >
                        <TableCell
                          className={
                            linha.indent
                              ? "pl-6 font-medium text-slate-500"
                              : "font-semibold text-[#003366] dark:text-foreground"
                          }
                        >
                          {linha.descricao}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums font-semibold text-[#003366] dark:text-foreground">
                          {loadingDre ? "…" : formatCurrency(linha.valor)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums text-slate-500">
                          {linha.percentual === null ? "—" : `${linha.percentual}%`}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loadingDre && dreLinhas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-8 text-center text-sm text-slate-400"
                        >
                          Nenhum lançamento no período.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="xl:col-span-4 xl:self-stretch">
                <div className="space-y-3 xl:sticky xl:top-20 xl:z-10">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-border dark:bg-card">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Total de vendas efetivas
                  </p>
                  <p className="mt-2 text-right text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {loadingDre ? "…" : formatCurrency(dreTotais.totalVendasEfetivas)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-border dark:bg-card">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Total de despesas efetivas
                  </p>
                  <p className="mt-2 text-right text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                    {loadingDre ? "…" : formatCurrency(dreTotais.totalDespesasEfetivas)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-emerald-300/80">
                    Resultado efetivo do mês
                  </p>
                  <p
                    className={`mt-2 text-right text-2xl font-bold tabular-nums ${
                      dreTotais.resultadoEfetivoMes < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {loadingDre
                      ? "…"
                      : formatCurrency(dreTotais.resultadoEfetivoMes)}
                  </p>
                  <p className="mt-1 text-right text-sm text-slate-500 dark:text-muted-foreground">
                    {loadingDre ? "…" : `${dreTotais.margemResultado}% de margem`}
                  </p>
                </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </DashboardSectionErrorBoundary>
        </>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
