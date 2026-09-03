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
import { Textarea } from "@/components/ui/textarea";
import { useCentroCustos } from "@/contexts/CentroCustosContext";
import {
  formatValorMonetarioBr,
  parseValorMonetarioEntrada,
} from "@/lib/parse-valor-monetario";
import { cn, formatCurrency } from "@/lib/utils";
import { controleRocaService } from "@/services/controle-roca.service";
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import type { Roca } from "@/types/roca";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronsUpDown,
  FileText,
  Info,
  Layers,
  Loader2,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
      const fixedTop = bottomLimit < topOffset ? bottomLimit : topOffset;

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

const NovaDespesa = () => {
  const rotulo = useRotuloRoca();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { adicionarDespesa, adicionarTipo, tiposOpcoes } = useCentroCustos();

  const [descricao, setDescricao] = useState("");
  const [valorStr, setValorStr] = useState("");
  const [dataDesp, setDataDesp] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");
  const [tipoIdSel, setTipoIdSel] = useState("");
  const [rocaSel, setRocaSel] = useState<Roca | null>(null);
  const [tipoPopOpen, setTipoPopOpen] = useState(false);
  const [rocaPopOpen, setRocaPopOpen] = useState(false);
  const [quickTipoOpen, setQuickTipoOpen] = useState(false);
  const [quickTipoNome, setQuickTipoNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: rocasData, isLoading: loadingRocas } = useQuery({
    queryKey: ["centro-custo", "rocas-ativas"],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    retry: false,
  });

  const rocasAtivas: Roca[] = useMemo(() => {
    const lista = Array.isArray(rocasData)
      ? rocasData
      : ((rocasData as { rocas?: Roca[] })?.rocas ?? []);
    return lista.filter((r) => r.ativo !== false);
  }, [rocasData]);

  const valorNumerico = useMemo(() => {
    const n = parseValorMonetarioEntrada(valorStr.trim());
    return n === null || !Number.isFinite(n) ? 0 : n;
  }, [valorStr]);

  const resumo = useMemo(() => {
    const tipo = tiposOpcoes.find((t) => t.id === tipoIdSel);
    return {
      tipoNome: tipo?.nome,
      rocaNome: rocaSel?.nome,
    };
  }, [tiposOpcoes, tipoIdSel, rocaSel]);

  const parseValor = (s: string): number => {
    const n = parseValorMonetarioEntrada(s);
    return n === null || !Number.isFinite(n) ? NaN : n;
  };

  const onBlurFormatarValor = () => {
    const s = valorStr.trim();
    if (s === "") return;
    const n = parseValorMonetarioEntrada(s);
    if (n === null || !Number.isFinite(n)) return;
    setValorStr(formatValorMonetarioBr(n));
  };

  const salvarQuickTipo = async () => {
    const n = quickTipoNome.trim();
    if (!n) {
      toast.error("Informe o nome.");
      return;
    }
    try {
      const t = await adicionarTipo(n);
      setTipoIdSel(t.id);
      setQuickTipoNome("");
      setQuickTipoOpen(false);
      setTipoPopOpen(false);
      toast.success("Tipo cadastrado.");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Não foi possível cadastrar o tipo.";
      toast.error(msg);
    }
  };

  const handleSubmit = async () => {
    const v = parseValor(valorStr);
    if (!descricao.trim()) {
      toast.error("Preencha a descrição da despesa.");
      return;
    }
    if (!tipoIdSel) {
      toast.error("Selecione o tipo de custo.");
      return;
    }
    if (!rocaSel) {
      toast.error(`Selecione a ${rotulo.singularLower}.`);
      return;
    }
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setSalvando(true);
    try {
      await adicionarDespesa({
        descricao: descricao.trim(),
        tipoId: tipoIdSel,
        rocaId: rocaSel.id,
        rocaNome: rocaSel.nome,
        tipoNome: tiposOpcoes.find((t) => t.id === tipoIdSel)?.nome,
        valor: v,
        data: dataDesp,
        observacoes: observacoes.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-unificado-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-resumo"] });
      toast.success("Despesa cadastrada com sucesso!");
      navigate("/centro-custos?tab=despesas");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Não foi possível cadastrar a despesa.";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  const voltar = () => navigate("/centro-custos?tab=despesas");

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
                onClick={voltar}
                aria-label="Voltar para Centro de Despesa"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                  Nova Despesa
                </h1>
                <p className="text-sm text-muted-foreground">
                  Lance uma despesa de centro de custo vinculada à {rotulo.singularLower}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={voltar}
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
                    Salvando...
                  </>
                ) : (
                  "Salvar Despesa"
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <div
            className={cn(
              "relative flex flex-col items-start gap-2 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-4 shadow-sm sm:max-w-md",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Centro de Custo</p>
              <p className="text-xs text-muted-foreground">
                Despesa vinculada à {rotulo.singularLower} — sincronizada com Contas a pagar
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
            <div className="min-w-0 flex-1 space-y-6 pb-8">
              <FormSection
                icon={FileText}
                title="Informações básicas"
                description="Dados principais do lançamento."
              >
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    placeholder="Ex.: Abastecimento trator"
                    className="h-11 rounded-xl"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="valor"
                      value={valorStr}
                      onChange={(e) => setValorStr(e.target.value)}
                      onBlur={onBlurFormatarValor}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="h-11 rounded-xl pl-10 tabular-nums"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                icon={Layers}
                title="Classificação"
                description={`Tipo de custo e ${rotulo.singularLower} onde a despesa será registrada.`}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Tipo de custo *</Label>
                    <Popover open={tipoPopOpen} onOpenChange={setTipoPopOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="h-11 w-full justify-between rounded-xl font-normal"
                        >
                          <span className="truncate">
                            {tipoIdSel
                              ? (tiposOpcoes.find((t) => t.id === tipoIdSel)?.nome ??
                                "Selecione…")
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
                              {tiposOpcoes.map((t) => (
                                <CommandItem
                                  key={t.id}
                                  value={t.nome}
                                  onSelect={() => {
                                    setTipoIdSel(t.id);
                                    setTipoPopOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      tipoIdSel === t.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {t.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup>
                              <CommandItem onSelect={() => setQuickTipoOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Cadastrar novo tipo…
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {tiposOpcoes.length === 0 ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Nenhum tipo cadastrado. Use &quot;Cadastrar novo tipo&quot; ou cadastre
                        em Tipos de custo.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{rotulo.singular} (ativas) *</Label>
                    <Popover open={rocaPopOpen} onOpenChange={setRocaPopOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={loadingRocas}
                          className="h-11 w-full justify-between rounded-xl font-normal"
                        >
                          <span className="truncate">
                            {rocaSel
                              ? rocaSel.nome
                              : loadingRocas
                                ? "Carregando…"
                                : `Buscar ${rotulo.singularLower} por nome…`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder={`Pesquisar ${rotulo.singularLower}…`} />
                          <CommandList>
                            <CommandEmpty>
                              {loadingRocas
                                ? `Carregando ${rotulo.pluralLower}…`
                                : `Nenhuma ${rotulo.singularLower} ativa encontrada.`}
                            </CommandEmpty>
                            <CommandGroup>
                              {rocasAtivas.map((r) => (
                                <CommandItem
                                  key={r.id}
                                  value={`${r.nome} ${r.codigo ?? ""}`}
                                  onSelect={() => {
                                    setRocaSel(r);
                                    setRocaPopOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      rocaSel?.id === r.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <span className="truncate">{r.nome}</span>
                                  {r.codigo ? (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      ({r.codigo})
                                    </span>
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </FormSection>

              <FormSection
                icon={Calendar}
                title="Data"
                description="Data de competência da despesa."
              >
                <div className="space-y-2">
                  <Label htmlFor="data-desp">Data (competência) *</Label>
                  <Input
                    id="data-desp"
                    type="date"
                    className="h-11 rounded-xl"
                    value={dataDesp}
                    onChange={(e) => setDataDesp(e.target.value)}
                  />
                </div>
              </FormSection>

              <FormSection
                icon={Info}
                title="Observações"
                description="Informações complementares sobre este lançamento."
              >
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Opcional"
                    className="min-h-[120px] resize-y rounded-xl"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>
              </FormSection>
            </div>

            <aside className="w-full shrink-0 lg:w-[280px] lg:self-stretch xl:w-[320px]">
              <ResumoScrollFollower>
                <Card className="overflow-hidden border-border/60 shadow-md transition-shadow duration-300 hover:shadow-lg">
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 px-5 py-4 text-white">
                    <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                      Resumo
                    </p>
                    <p className="mt-1 text-lg font-semibold">Centro de Custo</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight">
                      {valorNumerico > 0 ? formatCurrency(valorNumerico) : "R$ 0,00"}
                    </p>
                  </div>
                  <CardContent className="space-y-3 p-5 pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                        <span className="text-muted-foreground">Descrição</span>
                        <span className="max-w-[55%] truncate text-right font-medium">
                          {descricao.trim() || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                        <span className="text-muted-foreground">Competência</span>
                        <span className="font-medium">
                          {dataDesp
                            ? new Date(dataDesp + "T12:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </span>
                      </div>
                      {resumo.tipoNome ? (
                        <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                          <span className="text-muted-foreground">Tipo</span>
                          <span className="max-w-[55%] truncate text-right font-medium">
                            {resumo.tipoNome}
                          </span>
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
                          Salvando...
                        </>
                      ) : (
                        "Salvar Despesa"
                      )}
                    </Button>
                    <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                      Campos com * são obrigatórios. O lançamento aparece em Centro de Despesa
                      e em Contas a pagar.
                    </p>
                  </CardContent>
                </Card>
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
            onKeyDown={(e) => e.key === "Enter" && void salvarQuickTipo()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickTipoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarQuickTipo()}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default NovaDespesa;
