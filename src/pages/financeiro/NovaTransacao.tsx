import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { toYMD } from "@/lib/contas-financeiras-listagem";
import { formatValorMonetarioBr } from "@/lib/parse-valor-monetario";
import { Cliente, clientesService } from "@/services/clientes.service";
import {
  centroCustoService,
  type ApiCentroCustoTipo,
} from "@/services/centro-custo.service";
import { controleRocaService } from "@/services/controle-roca.service";
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import {
  CreateContaFinanceiraDto,
  financeiroService,
} from "@/services/financeiro.service";
import { Fornecedor, fornecedoresService } from "@/services/fornecedores.service";
import { pedidosService } from "@/services/pedidos.service";
import type { Roca } from "@/types/roca";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  ChevronsUpDown,
  CreditCard,
  FileText,
  Info,
  Loader2,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type ModoLancamento = "RECEBER" | "PAGAR";

type NovaTransacaoForm = CreateContaFinanceiraDto & {
  data_emissao: string;
  data_prevista?: string;
  centro_custo_tipo_id?: number;
};

const FORMAS_PAGAMENTO = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARTAO_CREDITO", label: "Cartão de Crédito" },
  { value: "CARTAO_DEBITO", label: "Cartão de Débito" },
  { value: "BOLETO", label: "Boleto" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "CHEQUE", label: "Cheque" },
] as const;

function FormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/60 shadow-sm", className)}>
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-xs leading-relaxed">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">{children}</CardContent>
    </Card>
  );
}

/** Mantém o painel de resumo visível ao rolar (desktop). */
function ResumoScrollFollower({
  children,
  topOffset = 80,
}: {
  children: ReactNode;
  topOffset?: number;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [spacerHeight, setSpacerHeight] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");

    const update = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel || !mq.matches) {
        setPanelStyle({});
        setSpacerHeight(0);
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const panelWidth = anchor.offsetWidth;

      if (anchorRect.top > topOffset) {
        setPanelStyle({});
        setSpacerHeight(0);
        return;
      }

      setSpacerHeight(panelHeight);

      const bottomLimit = anchorRect.bottom - panelHeight;
      const fixedTop =
        bottomLimit < topOffset ? bottomLimit : topOffset;

      setPanelStyle({
        position: "fixed",
        top: fixedTop,
        left: anchorRect.left,
        width: panelWidth,
        zIndex: 30,
      });
    };

    const onScroll = () => requestAnimationFrame(update);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => requestAnimationFrame(update))
        : null;

    mq.addEventListener("change", update);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", update);
    if (panelRef.current && ro) ro.observe(panelRef.current);
    if (anchorRef.current && ro) ro.observe(anchorRef.current);
    update();

    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [topOffset]);

  return (
    <div ref={anchorRef} className="relative h-full w-full lg:min-h-full">
      {spacerHeight > 0 ? (
        <div style={{ height: spacerHeight }} aria-hidden="true" className="hidden lg:block" />
      ) : null}
      <div ref={panelRef} style={panelStyle} className="space-y-4">
        {children}
      </div>
    </div>
  );
}

const initialForm = (): NovaTransacaoForm => ({
  tipo: "RECEBER",
  descricao: "",
  valor_original: 0,
  data_emissao: toYMD(new Date()),
  data_vencimento: "",
  roca_id: undefined,
  centro_custo_tipo_id: undefined,
});

const NovaTransacao = () => {
  const rotulo = useRotuloRoca();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<ModoLancamento>("RECEBER");
  const [previsao, setPrevisao] = useState(false);
  const [centroCustoPopOpen, setCentroCustoPopOpen] = useState(false);
  const [quickTipoOpen, setQuickTipoOpen] = useState(false);
  const [quickTipoNome, setQuickTipoNome] = useState("");
  const [salvandoQuickTipo, setSalvandoQuickTipo] = useState(false);
  const [form, setForm] = useState<NovaTransacaoForm>(initialForm);
  const [valorOriginalInput, setValorOriginalInput] = useState("");
  const [salvandoDespesaCc, setSalvandoDespesaCc] = useState(false);

  const handleValorOriginalChange = (raw: string) => {
    const apenasNumeros = raw.replace(/\D/g, "");
    if (!apenasNumeros) {
      setValorOriginalInput("");
      setForm((prev) => ({ ...prev, valor_original: 0 }));
      return;
    }
    // Limita a 15 dígitos (centavos) para evitar overflow visual
    const digitos = apenasNumeros.slice(0, 15);
    const valorDecimal = parseInt(digitos, 10) / 100;
    setValorOriginalInput(formatValorMonetarioBr(valorDecimal));
    setForm((prev) => ({ ...prev, valor_original: valorDecimal }));
  };

  const { data: clientesData } = useQuery({
    queryKey: ["clientes", "nova-transacao"],
    queryFn: async () => {
      try {
        const response = await clientesService.listar({
          limit: 500,
          statusCliente: "ATIVO",
        });
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.clientes)) return response.clientes;
        if (Array.isArray((response as { items?: Cliente[] })?.items)) {
          return (response as { items: Cliente[] }).items;
        }
        return [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const clientes: Cliente[] = Array.isArray(clientesData)
    ? clientesData
    : (clientesData as { data?: Cliente[] })?.data ||
      (clientesData as { clientes?: Cliente[] })?.clientes ||
      (clientesData as { items?: Cliente[] })?.items ||
      [];

  const { data: fornecedoresData } = useQuery({
    queryKey: ["fornecedores", "nova-transacao"],
    queryFn: async () => {
      try {
        const response = await fornecedoresService.listar({
          limit: 500,
          statusFornecedor: "ATIVO",
        });
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.fornecedores)) return response.fornecedores;
        if (Array.isArray((response as { items?: Fornecedor[] })?.items)) {
          return (response as { items: Fornecedor[] }).items;
        }
        return [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const fornecedores: Fornecedor[] = Array.isArray(fornecedoresData)
    ? fornecedoresData
    : (fornecedoresData as { data?: Fornecedor[] })?.data ||
      (fornecedoresData as { fornecedores?: Fornecedor[] })?.fornecedores ||
      (fornecedoresData as { items?: Fornecedor[] })?.items ||
      [];

  const { data: tiposDespesaCc = [] } = useQuery({
    queryKey: ["centro-custo", "tipos-opcoes", "financeiro-nova-transacao"],
    queryFn: () => centroCustoService.listarTiposOpcoes(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const tiposDespesaLista: ApiCentroCustoTipo[] = Array.isArray(tiposDespesaCc)
    ? tiposDespesaCc
    : [];

  const { data: rocasData } = useQuery({
    queryKey: ["financeiro", "rocas-ativas"],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    retry: false,
  });

  const rocasLista: Roca[] = Array.isArray(rocasData)
    ? rocasData
    : ((rocasData as { rocas?: Roca[] })?.rocas ?? []);

  const { data: pedidosData } = useQuery({
    queryKey: ["pedidos", "financeiro"],
    queryFn: async () => {
      try {
        const response = await pedidosService.listar({ page: 1, limit: 500 });
        if (Array.isArray(response)) return response;
        if (response?.data && Array.isArray(response.data)) return response.data;
        if (
          (response as { pedidos?: unknown[] })?.pedidos &&
          Array.isArray((response as { pedidos: unknown[] }).pedidos)
        ) {
          return (response as { pedidos: unknown[] }).pedidos;
        }
        return [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const pedidos = Array.isArray(pedidosData) ? pedidosData : [];

  const createContaMutation = useMutation({
    mutationFn: (data: CreateContaFinanceiraDto) => financeiroService.criar(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["fluxo-caixa"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-receber"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-resumo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-unificado-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["centro-custo"] });
      toast.success(
        variables.previsao
          ? "Previsão registrada com sucesso!"
          : "Transação registrada com sucesso!",
      );
      navigate(
        variables.previsao
          ? "/financeiro"
          : variables.tipo === "PAGAR"
            ? "/contas-a-pagar"
            : "/contas-a-receber",
      );
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Erro ao registrar transação");
    },
  });

  const resumo = useMemo(() => {
    const cliente = clientes.find((c) => c.id === form.cliente_id);
    const fornecedor = fornecedores.find((f) => f.id === form.fornecedor_id);
    const roca = rocasLista.find((r) => r.id === form.roca_id);
    const pedido = pedidos.find((p) => {
      const pid = (p as { pedido_id?: number; id?: number }).pedido_id ?? (p as { id?: number }).id;
      return pid === form.pedido_id;
    });
    const tipoDespesa = tiposDespesaLista.find((t) => t.id === form.centro_custo_tipo_id);
    return {
      clienteNome: cliente?.nome,
      fornecedorNome: fornecedor?.nome_fantasia,
      rocaNome: roca?.nome,
      tipoDespesaNome: tipoDespesa?.nome,
      pedidoNumero:
        (pedido as { numero_pedido?: string })?.numero_pedido ??
        (form.pedido_id ? `PED-${form.pedido_id}` : undefined),
    };
  }, [form, clientes, fornecedores, rocasLista, pedidos, tiposDespesaLista]);

  const ehReceita = modo === "RECEBER";
  const ehDespesa = modo === "PAGAR";
  const temCentroCusto =
    ehDespesa &&
    form.centro_custo_tipo_id != null &&
    form.centro_custo_tipo_id > 0;
  const salvando = createContaMutation.isPending || salvandoDespesaCc;

  const selecionarModo = (novoModo: ModoLancamento) => {
    setModo(novoModo);
    if (novoModo === "PAGAR") {
      setPrevisao(false);
    }
    setForm((prev) => ({
      ...prev,
      tipo: novoModo === "RECEBER" ? "RECEBER" : "PAGAR",
      centro_custo_tipo_id: novoModo === "PAGAR" ? prev.centro_custo_tipo_id : undefined,
      cliente_id: novoModo === "PAGAR" ? undefined : prev.cliente_id,
    }));
  };

  const selecionarCentroCustoTipo = (tipoId: number | undefined) => {
    if (tipoId != null) {
      setPrevisao(false);
    }
    setForm((prev) => ({
      ...prev,
      centro_custo_tipo_id: tipoId,
    }));
    setCentroCustoPopOpen(false);
  };

  const salvarQuickTipo = async () => {
    const n = quickTipoNome.trim();
    if (!n) {
      toast.error("Informe o nome do tipo.");
      return;
    }
    setSalvandoQuickTipo(true);
    try {
      const tipo = await centroCustoService.criarTipo({ nome: n });
      await queryClient.invalidateQueries({ queryKey: ["centro-custo"] });
      selecionarCentroCustoTipo(tipo.id);
      setQuickTipoNome("");
      setQuickTipoOpen(false);
      toast.success("Tipo cadastrado.");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Não foi possível cadastrar o tipo.";
      toast.error(msg);
    } finally {
      setSalvandoQuickTipo(false);
    }
  };

  const handleSubmit = async () => {
    if (temCentroCusto) {
      if (!form.descricao || !form.valor_original || !form.data_emissao) {
        toast.error("Preencha os campos obrigatórios (Descrição, Valor e Data de Emissão)");
        return;
      }
      if (!form.centro_custo_tipo_id) {
        toast.error("Selecione o tipo de despesa do centro de custo");
        return;
      }
      if (!form.roca_id) {
        toast.error(`Selecione a ${rotulo.singularLower} (centro de custo)`);
        return;
      }
      setSalvandoDespesaCc(true);
      try {
        await centroCustoService.criarDespesa({
          tipoId: form.centro_custo_tipo_id!,
          rocaId: form.roca_id,
          descricao: form.descricao.trim(),
          valor: Number(form.valor_original),
          data: form.data_emissao,
          observacoes: form.observacoes?.trim() || undefined,
          fornecedorId: form.fornecedor_id || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
        queryClient.invalidateQueries({ queryKey: ["centro-custo"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-receber"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-pagar"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-resumo"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-unificado-financeiro"] });
        toast.success("Despesa de centro de custo registrada com sucesso!");
        navigate("/contas-a-pagar");
      } catch (error: unknown) {
        const msg =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Erro ao registrar despesa de centro de custo";
        toast.error(msg);
      } finally {
        setSalvandoDespesaCc(false);
      }
      return;
    }

    if (previsao) {
      if (!form.descricao || !form.valor_original || !form.data_prevista) {
        toast.error("Preencha descrição, valor e data prevista");
        return;
      }

      createContaMutation.mutate({
        tipo: modo === "RECEBER" ? "RECEBER" : "PAGAR",
        previsao: true,
        descricao: form.descricao,
        valor_original: Number(form.valor_original),
        data_prevista: form.data_prevista,
        data_emissao: form.data_emissao || toYMD(new Date()),
        data_vencimento: form.data_vencimento || undefined,
        cliente_id: form.cliente_id || undefined,
        fornecedor_id: form.fornecedor_id || undefined,
        pedido_id: form.pedido_id || undefined,
        roca_id: form.roca_id || undefined,
        forma_pagamento: form.forma_pagamento || undefined,
        data_pagamento: form.data_pagamento || undefined,
        observacoes: form.observacoes || undefined,
      });
      return;
    }

    if (!form.descricao || !form.valor_original || !form.data_vencimento) {
      toast.error("Preencha os campos obrigatórios (Descrição, Valor e Data de Vencimento)");
      return;
    }

    createContaMutation.mutate({
      tipo: modo === "RECEBER" ? "RECEBER" : "PAGAR",
      descricao: form.descricao,
      valor_original: Number(form.valor_original),
      data_emissao: form.data_emissao,
      data_vencimento: form.data_vencimento,
      cliente_id: form.cliente_id || undefined,
      fornecedor_id: form.fornecedor_id || undefined,
      pedido_id: form.pedido_id || undefined,
      roca_id: form.roca_id || undefined,
      forma_pagamento: form.forma_pagamento || undefined,
      data_pagamento: form.data_pagamento || undefined,
      observacoes: form.observacoes || undefined,
    });
  };

  return (
    <AppLayout>
      <div className="min-w-0 bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => navigate("/financeiro")}
                aria-label="Voltar para Financeiro"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                  Nova Transação
                </h1>
                <p className="text-sm text-muted-foreground">
                  Registre receitas ou despesas do financeiro
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate("/financeiro")}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="gradient"
                className="rounded-xl gap-2"
                onClick={handleSubmit}
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : previsao ? (
                  "Registrar previsão"
                ) : (
                  "Registrar Transação"
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selecionarModo("RECEBER")}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all",
                  ehReceita
                    ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm"
                    : "border-border/60 bg-card hover:border-emerald-500/30 hover:bg-emerald-500/5",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    ehReceita ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground group-hover:bg-emerald-500/15 group-hover:text-emerald-600",
                  )}
                >
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Receita</p>
                  <p className="text-xs text-muted-foreground">Entrada de recursos</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => selecionarModo("PAGAR")}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all",
                  ehDespesa
                    ? "border-rose-500/60 bg-rose-500/10 shadow-sm"
                    : "border-border/60 bg-card hover:border-rose-500/30 hover:bg-rose-500/5",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    ehDespesa ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground group-hover:bg-rose-500/15 group-hover:text-rose-600",
                  )}
                >
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Despesa</p>
                  <p className="text-xs text-muted-foreground">Saída de recursos</p>
                </div>
              </button>
            </div>

            {ehReceita && !temCentroCusto ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setPrevisao((ativo) => !ativo)}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-all sm:w-auto",
                    previsao
                      ? "border-violet-500/60 bg-violet-500/10 text-violet-700 shadow-sm dark:text-violet-300"
                      : "border-border/60 bg-card text-muted-foreground hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-foreground",
                  )}
                >
                  <CalendarClock className="h-4 w-4" aria-hidden />
                  {previsao ? "Desativar previsão" : "Criar previsão"}
                </button>
                {previsao ? (
                  <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-md">
                    Entrada estimada para o fluxo de caixa. Informe a data prevista; pedido e
                    vencimento são opcionais até gerar o pedido de venda.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
              <div className="min-w-0 flex-1 space-y-6 pb-8">
                <FormSection
                  icon={FileText}
                  title="Informações básicas"
                  description="Dados principais do lançamento financeiro."
                >
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      placeholder="Ex: Pagamento de venda, compra de insumos..."
                      className="h-11 rounded-xl"
                      value={form.descricao}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, descricao: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor original *</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        id="valor"
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-11 rounded-xl pl-10 tabular-nums"
                        value={valorOriginalInput}
                        onChange={(e) => handleValorOriginalChange(e.target.value)}
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  icon={ShoppingCart}
                  title="Relacionamentos"
                  description={
                    ehDespesa
                      ? `Vincule fornecedor, pedido, ${rotulo.singularLower} ou centro de custo quando aplicável.`
                      : `Vincule cliente, fornecedor, pedido ou ${rotulo.singularLower} quando aplicável.`
                  }
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {ehDespesa ? (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Centro de custo</Label>
                        <Popover open={centroCustoPopOpen} onOpenChange={setCentroCustoPopOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="h-11 w-full justify-between rounded-xl font-normal"
                            >
                              <span className="truncate">
                                {form.centro_custo_tipo_id != null
                                  ? (tiposDespesaLista.find(
                                      (t) => t.id === form.centro_custo_tipo_id,
                                    )?.nome ?? "Selecione…")
                                  : "Buscar ou selecionar tipo…"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Pesquisar tipo…" />
                              <CommandList>
                                <CommandEmpty>Nenhum tipo encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="nenhum"
                                    onSelect={() => selecionarCentroCustoTipo(undefined)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form.centro_custo_tipo_id == null
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    Nenhum
                                  </CommandItem>
                                  {tiposDespesaLista.map((tipo) => (
                                    <CommandItem
                                      key={tipo.id}
                                      value={tipo.nome}
                                      onSelect={() => selecionarCentroCustoTipo(tipo.id)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          form.centro_custo_tipo_id === tipo.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      {tipo.nome}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                                <CommandSeparator />
                                <CommandGroup>
                                  <CommandItem
                                    value="cadastrar-novo-tipo"
                                    onSelect={() => {
                                      setCentroCustoPopOpen(false);
                                      setQuickTipoOpen(true);
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Cadastrar novo tipo…
                                  </CommandItem>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {tiposDespesaLista.length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Nenhum tipo cadastrado. Use &quot;Cadastrar novo tipo&quot; ou cadastre
                            em Centro de Custos → Tipos.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Opcional. Se selecionar, informe também a {rotulo.singularLower} — a despesa entra em
                            Centro de Custos e Contas a pagar.
                          </p>
                        )}
                      </div>
                    ) : null}
                    {!ehDespesa ? (
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select
                        value={form.cliente_id != null ? String(form.cliente_id) : "none"}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            cliente_id:
                              value && value !== "none" ? Number(value) : undefined,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
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
                    ) : null}
                    <div className="space-y-2">
                      <Label>Fornecedor</Label>
                      <Select
                        value={
                          form.fornecedor_id != null ? String(form.fornecedor_id) : "none"
                        }
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            fornecedor_id:
                              value && value !== "none" ? Number(value) : undefined,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {fornecedores.map((fornecedor) => (
                            <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>
                              {fornecedor.nome_fantasia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pedido</Label>
                      <Select
                        value={form.pedido_id != null ? String(form.pedido_id) : "none"}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            pedido_id:
                              value && value !== "none" ? Number(value) : undefined,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Selecione um pedido" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {pedidos
                            .filter((pedido) => {
                              const pedidoId =
                                (pedido as { pedido_id?: number; id?: number }).pedido_id ??
                                (pedido as { id?: number }).id;
                              return pedidoId != null;
                            })
                            .map((pedido) => {
                              const pedidoId =
                                (pedido as { pedido_id?: number; id?: number }).pedido_id ??
                                (pedido as { id?: number }).id!;
                              return (
                                <SelectItem key={pedidoId} value={pedidoId.toString()}>
                                  {(pedido as { numero_pedido?: string }).numero_pedido ||
                                    `PED-${pedidoId}`}
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{rotulo.singular}{temCentroCusto ? " *" : ""}</Label>
                      <Select
                        value={form.roca_id != null ? String(form.roca_id) : "none"}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            roca_id:
                              value && value !== "none" ? Number(value) : undefined,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
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
                </FormSection>

                <FormSection
                  icon={Calendar}
                  title="Datas"
                  description={
                    temCentroCusto
                      ? "Data em que a despesa foi registrada."
                      : previsao
                        ? "Data prevista e, se quiser, emissão, vencimento ou pagamento."
                        : "Emissão, vencimento e pagamento do lançamento."
                  }
                >
                  <div
                    className={cn(
                      "grid grid-cols-1 gap-4",
                      temCentroCusto
                        ? "sm:grid-cols-1"
                        : previsao
                          ? "sm:grid-cols-2 lg:grid-cols-4"
                          : "sm:grid-cols-3",
                    )}
                  >
                    {!temCentroCusto && previsao ? (
                      <div className="space-y-2">
                        <Label htmlFor="data-prevista">Data prevista *</Label>
                        <Input
                          id="data-prevista"
                          type="date"
                          className="h-11 rounded-xl"
                          value={form.data_prevista || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              data_prevista: e.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="data-emissao">
                        Data de emissão{!previsao || temCentroCusto ? " *" : ""}
                      </Label>
                      <Input
                        id="data-emissao"
                        type="date"
                        className="h-11 rounded-xl"
                        value={form.data_emissao}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, data_emissao: e.target.value }))
                        }
                      />
                    </div>
                    {!temCentroCusto ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="data-vencimento">
                            Data de vencimento{!previsao ? " *" : ""}
                          </Label>
                          <Input
                            id="data-vencimento"
                            type="date"
                            className="h-11 rounded-xl"
                            value={form.data_vencimento}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, data_vencimento: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="data-pagamento">Data de pagamento</Label>
                          <Input
                            id="data-pagamento"
                            type="date"
                            className="h-11 rounded-xl"
                            value={form.data_pagamento || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                data_pagamento: e.target.value || undefined,
                              }))
                            }
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                </FormSection>

                {!temCentroCusto ? (
                <FormSection
                  icon={CreditCard}
                  title="Pagamento"
                  description="Forma de pagamento utilizada, se já definida."
                >
                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Select
                      value={form.forma_pagamento ?? "none"}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          forma_pagamento:
                            value === "none"
                              ? undefined
                              : (value as CreateContaFinanceiraDto["forma_pagamento"]),
                        }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {FORMAS_PAGAMENTO.map((fp) => (
                          <SelectItem key={fp.value} value={fp.value}>
                            {fp.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormSection>
                ) : null}

                <FormSection
                  icon={Info}
                  title="Observações"
                  description="Informações complementares sobre este lançamento."
                >
                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Detalhes adicionais, referências internas ou acordos..."
                      className="min-h-[120px] resize-y rounded-xl"
                      value={form.observacoes || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          observacoes: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </FormSection>
              </div>

              <aside className="w-full shrink-0 lg:w-[280px] lg:self-stretch xl:w-[320px]">
                <ResumoScrollFollower>
                  <Card className="overflow-hidden border-border/60 shadow-md transition-shadow duration-300 hover:shadow-lg">
                  <div
                    className={cn(
                      "px-5 py-4 text-white",
                      ehReceita
                        ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
                        : temCentroCusto
                          ? "bg-gradient-to-br from-amber-500 to-amber-600"
                          : "bg-gradient-to-br from-rose-600 to-rose-700",
                    )}
                  >
                    <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                      Resumo
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {ehReceita
                        ? "Receita"
                        : temCentroCusto
                          ? "Despesa · Centro de Custo"
                          : "Despesa"}
                      {previsao ? " · Previsão" : ""}
                    </p>
                    <p className="mt-3 text-3xl font-bold tracking-tight">
                      {form.valor_original > 0
                        ? formatCurrency(form.valor_original)
                        : "R$ 0,00"}
                    </p>
                  </div>
                  <CardContent className="space-y-3 p-5 pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                        <span className="text-muted-foreground">Descrição</span>
                        <span className="max-w-[55%] truncate text-right font-medium">
                          {form.descricao || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                        <span className="text-muted-foreground">
                          {temCentroCusto ? "Emissão" : previsao ? "Data prevista" : "Vencimento"}
                        </span>
                        <span className="font-medium">
                          {temCentroCusto
                            ? form.data_emissao
                              ? new Date(form.data_emissao + "T12:00:00").toLocaleDateString(
                                  "pt-BR",
                                )
                              : "—"
                            : previsao
                              ? form.data_prevista
                                ? new Date(form.data_prevista + "T12:00:00").toLocaleDateString(
                                    "pt-BR",
                                  )
                                : "—"
                              : form.data_vencimento
                                ? new Date(form.data_vencimento + "T12:00:00").toLocaleDateString(
                                    "pt-BR",
                                  )
                                : "—"}
                        </span>
                      </div>
                      {resumo.tipoDespesaNome ? (
                        <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                          <span className="text-muted-foreground">Centro de custo</span>
                          <span className="max-w-[55%] truncate text-right font-medium">
                            {resumo.tipoDespesaNome}
                          </span>
                        </div>
                      ) : null}
                      {resumo.clienteNome ? (
                        <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                          <span className="text-muted-foreground">Cliente</span>
                          <span className="max-w-[55%] truncate text-right font-medium">
                            {resumo.clienteNome}
                          </span>
                        </div>
                      ) : null}
                      {resumo.fornecedorNome ? (
                        <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                          <span className="text-muted-foreground">Fornecedor</span>
                          <span className="max-w-[55%] truncate text-right font-medium">
                            {resumo.fornecedorNome}
                          </span>
                        </div>
                      ) : null}
                      {resumo.pedidoNumero ? (
                        <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                          <span className="text-muted-foreground">Pedido</span>
                          <span className="font-medium">{resumo.pedidoNumero}</span>
                        </div>
                      ) : null}
                      {resumo.rocaNome ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{rotulo.singular}</span>
                          <span className="max-w-[55%] truncate text-right font-medium">
                            {resumo.rocaNome}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="gradient"
                      className="mt-2 w-full rounded-xl"
                      onClick={handleSubmit}
                      disabled={salvando}
                    >
                      {salvando ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        previsao ? "Registrar previsão" : "Registrar Transação"
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                  Campos marcados com * são obrigatórios. Use o menu lateral para navegar entre
                  outras áreas do sistema a qualquer momento.
                </p>
                </ResumoScrollFollower>
              </aside>
            </div>
        </div>
      </div>

      <Dialog open={quickTipoOpen} onOpenChange={setQuickTipoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastro rápido de tipo</DialogTitle>
          </DialogHeader>
          <Input
            value={quickTipoNome}
            onChange={(e) => setQuickTipoNome(e.target.value)}
            placeholder="Nome do tipo"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void salvarQuickTipo();
              }
            }}
            disabled={salvandoQuickTipo}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickTipoOpen(false)}
              disabled={salvandoQuickTipo}
            >
              Cancelar
            </Button>
            <Button onClick={() => void salvarQuickTipo()} disabled={salvandoQuickTipo}>
              {salvandoQuickTipo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default NovaTransacao;
