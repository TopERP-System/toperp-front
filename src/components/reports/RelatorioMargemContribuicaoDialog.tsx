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
import { pedidosService } from "@/services/pedidos.service";
import { Calendar, Download, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDataInicial?: string;
  defaultDataFinal?: string;
};

function inicioFimMesAtual(): { inicio: string; fim: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const inicio = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const ultimo = new Date(y, m + 1, 0);
  const fim = `${y}-${String(m + 1).padStart(2, "0")}-${String(ultimo.getDate()).padStart(2, "0")}`;
  return { inicio, fim };
}

export function RelatorioMargemContribuicaoDialog({
  open,
  onOpenChange,
  defaultDataInicial,
  defaultDataFinal,
}: Props) {
  const { inicio: defInicio, fim: defFim } = useMemo(() => inicioFimMesAtual(), []);
  const [dataInicial, setDataInicial] = useState(defInicio);
  const [dataFinal, setDataFinal] = useState(defFim);
  const [pdfLoading, setPdfLoading] = useState<"download" | "print" | null>(null);

  useEffect(() => {
    if (!open) return;
    setDataInicial(defaultDataInicial?.trim() || defInicio);
    setDataFinal(defaultDataFinal?.trim() || defFim);
  }, [open, defaultDataInicial, defaultDataFinal, defInicio, defFim]);

  const handleDownloadPdf = async () => {
    setPdfLoading("download");
    try {
      await pedidosService.downloadRelatorioMargemContribuicaoPdf(
        dataInicial.trim() || undefined,
        dataFinal.trim() || undefined,
      );
      toast.success("Relatório de Margem de Contribuição baixado.");
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
      await pedidosService.printRelatorioMargemContribuicaoPdf(
        dataInicial.trim() || undefined,
        dataFinal.trim() || undefined,
      );
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
          <DialogTitle>Margem de contribuição</DialogTitle>
          <DialogDescription>
            Defina o período e gere o PDF com receita, custo e margem por produto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
