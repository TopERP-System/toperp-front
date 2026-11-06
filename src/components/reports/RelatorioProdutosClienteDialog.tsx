import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RelatorioPeriodoFinanceiro } from "@/components/reports/RelatorioPeriodoFinanceiro";
import { FiltrosStatusProdutosCliente } from "@/components/reports/FiltrosStatusProdutosCliente";
import type {
  StatusFiltroProdutosCliente,
  StatusPedidoFiltroProdutosCliente,
} from "@/lib/relatorio-produtos-cliente";
import type { Cliente } from "@/services/clientes.service";
import { pedidosService } from "@/services/pedidos.service";
import { Download, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: Cliente[];
  defaultClienteId?: number | null;
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

export function RelatorioProdutosClienteDialog({
  open,
  onOpenChange,
  clientes,
  defaultClienteId,
}: Props) {
  const { inicio: defInicio, fim: defFim } = useMemo(() => inicioFimMesAtual(), []);
  const [clienteId, setClienteId] = useState("");
  const [dataInicial, setDataInicial] = useState(defInicio);
  const [dataFinal, setDataFinal] = useState(defFim);
  const [statusFiltro, setStatusFiltro] =
    useState<StatusFiltroProdutosCliente>("Todos");
  const [statusPedido, setStatusPedido] =
    useState<StatusPedidoFiltroProdutosCliente>("Todos");
  const [campoData, setCampoData] = useState<"vencimento" | "emissao" | "pagamento">("vencimento");
  const [pdfLoading, setPdfLoading] = useState<"download" | "print" | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setDataInicial(defInicio);
    setDataFinal(defFim);
    setStatusFiltro("Todos");
    setStatusPedido("Todos");
    setCampoData("vencimento");
    setClienteId(
      defaultClienteId != null && defaultClienteId > 0
        ? String(defaultClienteId)
        : "",
    );
  }, [open, defaultClienteId, defInicio, defFim]);

  const podeConsultar =
    !!clienteId &&
    Number(clienteId) > 0 &&
    !!dataInicial?.trim() &&
    !!dataFinal?.trim();

  const paramsPdf = () => ({
    cliente_id: Number(clienteId),
    data_inicial: dataInicial.trim(),
    data_final: dataFinal.trim(),
    status: statusFiltro,
    status_pedido: statusPedido,
    campo_data: campoData,
  });

  const handleDownloadPdf = async () => {
    if (!podeConsultar) {
      toast.error("Preencha cliente e período.");
      return;
    }
    setPdfLoading("download");
    try {
      await pedidosService.downloadRelatorioComprasClientePdf(paramsPdf());
      toast.success("PDF baixado.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar PDF.";
      toast.error(msg);
    } finally {
      setPdfLoading(null);
    }
  };

  const handlePrintPdf = async () => {
    if (!podeConsultar) {
      toast.error("Preencha cliente e período.");
      return;
    }
    setPdfLoading("print");
    try {
      await pedidosService.printRelatorioComprasClientePdf(paramsPdf());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao abrir PDF.";
      toast.error(msg);
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de produtos por cliente</DialogTitle>
          <DialogDescription>
            Inclui dados da empresa e os itens de pedidos de venda do cliente no período
            (data do pedido), conforme os filtros selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="relatorio-produtos-cliente">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger id="relatorio-produtos-cliente">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
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
                value={campoData}
                onValueChange={(v) =>
                  setCampoData(v as "vencimento" | "emissao" | "pagamento")
                }
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vencimento" id="relatorio-produtos-campo-vencimento" />
                  <Label htmlFor="relatorio-produtos-campo-vencimento" className="cursor-pointer">
                    Data de vencimento
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="emissao" id="relatorio-produtos-campo-emissao" />
                  <Label htmlFor="relatorio-produtos-campo-emissao" className="cursor-pointer">
                    Data de emissão
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pagamento" id="relatorio-produtos-campo-pagamento" />
                  <Label htmlFor="relatorio-produtos-campo-pagamento" className="cursor-pointer">
                    Data de pagamento
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <RelatorioPeriodoFinanceiro
              dataInicial={dataInicial}
              dataFinal={dataFinal}
              onDataInicial={setDataInicial}
              onDataFinal={setDataFinal}
            />

            <Separator />

            <FiltrosStatusProdutosCliente
              idPrefix="produtos-status"
              statusPedido={statusPedido}
              onStatusPedido={setStatusPedido}
              situacao={statusFiltro}
              onSituacao={setStatusFiltro}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Button
                type="button"
                variant="relatorioPrimary"
                className="flex-1 gap-2"
                disabled={!podeConsultar || pdfLoading !== null}
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
                disabled={!podeConsultar || pdfLoading !== null}
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
            {!podeConsultar && (
              <p className="text-center text-xs text-[#3558a8]/85">
                Selecione o cliente e o período para habilitar o PDF.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
