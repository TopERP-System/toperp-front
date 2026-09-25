import { RelatorioPeriodoFinanceiro } from "@/components/reports/RelatorioPeriodoFinanceiro";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { relatoriosClienteService } from "@/services/relatorios-cliente.service";
import { Download, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CampoData = "vencimento" | "emissao" | "pagamento";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** RECEBER = contas de pedidos de venda; PAGAR = contas de pedidos de compra */
  tipo: "RECEBER" | "PAGAR";
  parceiros: Array<{ id: number; nome: string }>;
  rocas: Array<{ id: number; nome: string }>;
  rotuloRoca: { singular: string; todas: string };
  defaultDataInicial?: string;
  defaultDataFinal?: string;
};

const STATUS_OPCOES: Array<[string, string]> = [
  ["Todos", "Todos"],
  ["PENDENTE", "Pendente"],
  ["PAGO_PARCIAL", "Pago Parcial"],
  ["PAGO_TOTAL", "Quitada"],
  ["VENCIDO", "Vencido"],
  ["CANCELADO", "Cancelado"],
];

const CAMPO_DATA_OPCOES: Array<[CampoData, string]> = [
  ["vencimento", "Data de vencimento"],
  ["emissao", "Data de emissão"],
  ["pagamento", "Data de pagamento"],
];

/**
 * Relatório geral de contas a receber/pagar do módulo financeiro, restrito às
 * contas geradas por pedido (origem=pedido). Usado no hub de relatórios de Pedidos.
 */
export function RelatorioContasPedidosDialog({
  open,
  onOpenChange,
  tipo,
  parceiros,
  rocas,
  rotuloRoca,
  defaultDataInicial,
  defaultDataFinal,
}: Props) {
  const [parceiroId, setParceiroId] = useState("all");
  const [rocaId, setRocaId] = useState("all");
  const [campoData, setCampoData] = useState<CampoData>("vencimento");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [status, setStatus] = useState("Todos");
  const [pdfLoading, setPdfLoading] = useState<"download" | "print" | null>(null);

  const receber = tipo === "RECEBER";
  const idPrefix = `relatorio-contas-pedidos-${tipo.toLowerCase()}`;

  useEffect(() => {
    if (!open) return;
    setParceiroId("all");
    setRocaId("all");
    setCampoData("vencimento");
    setDataInicial(defaultDataInicial?.trim() || "");
    setDataFinal(defaultDataFinal?.trim() || "");
    setStatus("Todos");
  }, [open, defaultDataInicial, defaultDataFinal]);

  const montarFiltros = () => {
    const parceiro = parceiroId !== "all" ? Number(parceiroId) : undefined;
    return {
      dataInicial: dataInicial || undefined,
      dataFinal: dataFinal || undefined,
      status: status !== "Todos" ? status : undefined,
      campoData,
      rocaId: rocaId !== "all" ? Number(rocaId) : undefined,
      origem: "pedido" as const,
      ...(receber ? { clienteId: parceiro } : { fornecedorId: parceiro }),
    };
  };

  const handleDownloadPdf = async () => {
    setPdfLoading("download");
    try {
      if (receber) {
        await relatoriosClienteService.downloadRelatorioGeralContasReceber(montarFiltros());
      } else {
        await relatoriosClienteService.downloadRelatorioGeralContasPagar(montarFiltros());
      }
      toast.success("PDF baixado.");
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
      if (receber) {
        await relatoriosClienteService.imprimirRelatorioGeralContasReceber(montarFiltros());
      } else {
        await relatoriosClienteService.imprimirRelatorioGeralContasPagar(montarFiltros());
      }
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir relatório.");
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receber ? "Recebimentos de vendas" : "Pagamentos de compras"}</DialogTitle>
          <DialogDescription>
            {receber
              ? "Contas a receber geradas por pedidos de venda. Lançamentos avulsos do financeiro não entram."
              : "Contas a pagar geradas por pedidos de compra. Despesas avulsas e de centro de custo não entram."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-parceiro`}>{receber ? "Cliente" : "Fornecedor"}</Label>
            <Select value={parceiroId} onValueChange={setParceiroId}>
              <SelectTrigger id={`${idPrefix}-parceiro`}>
                <SelectValue placeholder={receber ? "Todos os clientes" : "Todos os fornecedores"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{receber ? "Todos os clientes" : "Todos os fornecedores"}</SelectItem>
                {parceiros.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-roca`}>{rotuloRoca.singular}</Label>
            <Select value={rocaId} onValueChange={setRocaId}>
              <SelectTrigger id={`${idPrefix}-roca`}>
                <SelectValue placeholder={rotuloRoca.todas} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{rotuloRoca.todas}</SelectItem>
                {rocas.map((roca) => (
                  <SelectItem key={roca.id} value={String(roca.id)}>
                    {roca.nome}
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
                onValueChange={(v) => setCampoData(v as CampoData)}
                className="space-y-2"
              >
                {CAMPO_DATA_OPCOES.map(([valor, label]) => (
                  <div key={valor} className="flex items-center space-x-2">
                    <RadioGroupItem value={valor} id={`${idPrefix}-campo-${valor}`} />
                    <Label htmlFor={`${idPrefix}-campo-${valor}`} className="cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
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

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#1A3B70]">Status</Label>
              <RadioGroup value={status} onValueChange={setStatus} className="space-y-2">
                {STATUS_OPCOES.map(([valor, label]) => (
                  <div key={valor} className="flex items-center space-x-2">
                    <RadioGroupItem value={valor} id={`${idPrefix}-status-${valor}`} />
                    <Label htmlFor={`${idPrefix}-status-${valor}`} className="cursor-pointer">
                      {label}
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
