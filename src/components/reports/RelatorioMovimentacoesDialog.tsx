import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  estoqueService,
  TipoMovimentacao,
} from "@/services/estoque.service";
import {
  Calendar,
  Circle,
  Download,
  Loader2,
  Printer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from page filters when opening */
  defaultDataInicial?: string;
  defaultDataFinal?: string;
  defaultTipo?: string;
};

const STATUS_OPTIONS: Array<{
  value: "Todos" | TipoMovimentacao;
  label: string;
  color: string;
}> = [
  { value: "Todos", label: "Todos", color: "text-primary" },
  { value: "ENTRADA", label: "Entrada", color: "text-emerald-500" },
  { value: "SAIDA", label: "Saída", color: "text-red-500" },
  { value: "AJUSTE", label: "Ajuste", color: "text-sky-500" },
  { value: "DEVOLUCAO", label: "Devolução", color: "text-cyan-500" },
  { value: "PERDA", label: "Perda", color: "text-amber-500" },
  { value: "TRANSFERENCIA", label: "Transferência", color: "text-violet-500" },
];

function inicioFimMesAtual(): { inicio: string; fim: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const inicio = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const ultimo = new Date(y, m + 1, 0);
  const fim = `${y}-${String(m + 1).padStart(2, "0")}-${String(ultimo.getDate()).padStart(2, "0")}`;
  return { inicio, fim };
}

export function RelatorioMovimentacoesDialog({
  open,
  onOpenChange,
  defaultDataInicial,
  defaultDataFinal,
  defaultTipo,
}: Props) {
  const { inicio: defInicio, fim: defFim } = useMemo(() => inicioFimMesAtual(), []);
  const [dataInicial, setDataInicial] = useState(defInicio);
  const [dataFinal, setDataFinal] = useState(defFim);
  const [statusFiltro, setStatusFiltro] = useState<"Todos" | TipoMovimentacao>("Todos");
  const [natureza, setNatureza] = useState<"todos" | "compra" | "venda">("todos");
  const [pdfLoading, setPdfLoading] = useState<"download" | "print" | null>(null);

  useEffect(() => {
    if (!open) return;
    setDataInicial(defaultDataInicial?.trim() || defInicio);
    setDataFinal(defaultDataFinal?.trim() || defFim);
    const tipo =
      defaultTipo && defaultTipo !== "Todos"
        ? (defaultTipo as TipoMovimentacao)
        : "Todos";
    setStatusFiltro(tipo);
    if (tipo === "ENTRADA") {
      setNatureza("compra");
    } else if (tipo === "SAIDA") {
      setNatureza("venda");
    } else {
      setNatureza("todos");
    }
  }, [open, defaultDataInicial, defaultDataFinal, defaultTipo, defInicio, defFim]);

  const paramsPdf = () => ({
    data_inicial: dataInicial.trim() || undefined,
    data_final: dataFinal.trim() || undefined,
    tipos: statusFiltro === "Todos" ? undefined : [statusFiltro],
    natureza:
      statusFiltro === "ENTRADA" && natureza === "todos"
        ? "compra"
        : natureza,
  });

  const handleDownloadPdf = async () => {
    setPdfLoading("download");
    try {
      await estoqueService.downloadRelatorioMovimentacoesPdf(paramsPdf());
      toast.success("Relatório de movimentações baixado.");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    } finally {
      setPdfLoading(null);
    }
  };

  const handlePrintPdf = async () => {
    setPdfLoading("print");
    try {
      await estoqueService.printRelatorioMovimentacoesPdf(paramsPdf());
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir PDF.");
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de Movimentações</DialogTitle>
          <DialogDescription>
            Filtre por compras/vendas, período e status da movimentação antes de baixar ou
            imprimir o PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="relatorio-mov-natureza">Compras / Vendas</Label>
            <Select
              value={natureza}
              onValueChange={(v) => {
                const nat = v as "todos" | "compra" | "venda";
                setNatureza(nat);
                if (nat === "compra") setStatusFiltro("ENTRADA");
                else if (nat === "venda") setStatusFiltro("SAIDA");
              }}
            >
              <SelectTrigger id="relatorio-mov-natureza">
                <SelectValue placeholder="Todas as operações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as operações</SelectItem>
                <SelectItem value="compra">O que comprei (compras / entradas)</SelectItem>
                <SelectItem value="venda">O que vendi (vendas / saídas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#1A3B70]">Período</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      className="pl-10 rounded-lg border-border/80 bg-muted/50"
                      value={dataInicial}
                      onChange={(e) => setDataInicial(e.target.value || "")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data Final</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      className="pl-10 rounded-lg border-border/80 bg-muted/50"
                      value={dataFinal}
                      onChange={(e) => setDataFinal(e.target.value || "")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#1A3B70]">
                Status da movimentação
              </Label>
              <RadioGroup
                value={statusFiltro}
                onValueChange={(v) => {
                  const val = v as "Todos" | TipoMovimentacao;
                  setStatusFiltro(val);
                  if (val === "ENTRADA") setNatureza("compra");
                  else if (val === "SAIDA") setNatureza("venda");
                }}
                className="space-y-2"
              >
                {STATUS_OPTIONS.map(({ value, label, color }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`mov-status-${value}`} />
                    <Label
                      htmlFor={`mov-status-${value}`}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Circle className={`w-3 h-3 ${color}`} />
                      <span className="text-[#1A3B70]">{label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Button
              type="button"
              variant="relatorioPrimary"
              className="flex-1 gap-2"
              disabled={pdfLoading !== null}
              onClick={handleDownloadPdf}
            >
              {pdfLoading === "download" ? (
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
              disabled={pdfLoading !== null}
              onClick={handlePrintPdf}
            >
              {pdfLoading === "print" ? (
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
  );
}
