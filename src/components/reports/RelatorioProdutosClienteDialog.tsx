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
import {
  isStatusPedidoFiltroProdutosCliente,
  type StatusFiltroProdutosCliente,
  type StatusPedidoFiltroProdutosCliente,
} from "@/lib/relatorio-produtos-cliente";
import type { Cliente } from "@/services/clientes.service";
import type { Fornecedor } from "@/services/fornecedores.service";
import { pedidosService } from "@/services/pedidos.service";
import { Download, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type TipoParceiroProdutos = "cliente" | "fornecedor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem `clientes`, o diálogo só oferece fornecedor (e vice-versa). */
  clientes?: Cliente[];
  /** Com clientes e fornecedores, mostra a escolha Cliente / Fornecedor (task 016). */
  fornecedores?: Fornecedor[];
  defaultClienteId?: number | null;
  defaultFornecedorId?: number | null;
  /** Modo ao abrir; sem ele, fornecedor só quando há fornecedor (e não cliente) padrão. */
  modoInicial?: TipoParceiroProdutos;
  /**
   * Filtros aplicados na listagem de Pedidos (task 017). Com eles, cada abertura
   * herda parceiro, período (data do pedido; vazio = todo o histórico) e status.
   */
  filtrosListagem?: FiltrosListagemProdutos;
};

export type FiltrosListagemProdutos = {
  cliente_id?: number | null;
  fornecedor_id?: number | null;
  data_inicial?: string | null;
  data_final?: string | null;
  status?: string | null;
  /** Aba da listagem: decide o modo quando há cliente e fornecedor filtrados. */
  tipo?: "VENDA" | "COMPRA" | null;
};

function nomeFornecedor(f: Fornecedor): string {
  return f.nome_fantasia?.trim() || f.nome_razao?.trim() || `Fornecedor ${f.id}`;
}

const idValido = (id?: number | null) => (id != null && id > 0 ? id : null);

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
  fornecedores,
  defaultClienteId,
  defaultFornecedorId,
  modoInicial,
  filtrosListagem,
}: Props) {
  const { inicio: defInicio, fim: defFim } = useMemo(() => inicioFimMesAtual(), []);
  const temClientes = clientes != null;
  const temFornecedores = fornecedores != null;
  const [modo, setModo] = useState<TipoParceiroProdutos>("cliente");
  const [clienteId, setClienteId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
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

  // Recarrega a cada abertura (só no momento em que abre, para não apagar o que o
  // usuário mudar no diálogo quando a tela re-renderiza).
  useEffect(() => {
    if (!open) return;
    const fl = filtrosListagem;
    setStatusFiltro("Todos");
    if (fl) {
      setDataInicial(fl.data_inicial?.trim() || "");
      setDataFinal(fl.data_final?.trim() || "");
      setCampoData("emissao");
      setStatusPedido(
        fl.status && isStatusPedidoFiltroProdutosCliente(fl.status) ? fl.status : "Todos",
      );
    } else {
      setDataInicial(defInicio);
      setDataFinal(defFim);
      setCampoData("vencimento");
      setStatusPedido("Todos");
    }
    const cli = idValido(fl ? fl.cliente_id : defaultClienteId);
    const forn = idValido(fl ? fl.fornecedor_id : defaultFornecedorId);
    setClienteId(cli ? String(cli) : "");
    setFornecedorId(forn ? String(forn) : "");
    let m: TipoParceiroProdutos =
      modoInicial ??
      (fl?.tipo === "COMPRA"
        ? "fornecedor"
        : fl?.tipo === "VENDA"
          ? "cliente"
          : forn && !cli
            ? "fornecedor"
            : "cliente");
    if (m === "cliente" && !temClientes) m = "fornecedor";
    if (m === "fornecedor" && !temFornecedores) m = "cliente";
    setModo(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ehFornecedor = modo === "fornecedor";
  const parceiroId = ehFornecedor ? fornecedorId : clienteId;
  const rotulo = ehFornecedor ? "fornecedor" : "cliente";

  // Período opcional: sem datas = todo o histórico do parceiro (task 017)
  const podeConsultar = !!parceiroId && Number(parceiroId) > 0;
  const semPeriodo = !dataInicial?.trim() && !dataFinal?.trim();

  const paramsPdf = () => ({
    ...(ehFornecedor
      ? { fornecedor_id: Number(fornecedorId) }
      : { cliente_id: Number(clienteId) }),
    data_inicial: dataInicial.trim() || undefined,
    data_final: dataFinal.trim() || undefined,
    status: statusFiltro,
    status_pedido: statusPedido,
    campo_data: campoData,
  });

  const handleDownloadPdf = async () => {
    if (!podeConsultar) {
      toast.error(`Selecione o ${rotulo}.`);
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
      toast.error(`Selecione o ${rotulo}.`);
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
          <DialogTitle>Relatório de produtos por {rotulo}</DialogTitle>
          <DialogDescription>
            {ehFornecedor
              ? "Inclui os dados do fornecedor e os itens dos pedidos de compra feitos a ele no período, conforme os filtros selecionados."
              : "Inclui os dados do cliente e os itens dos pedidos de venda feitos a ele no período, conforme os filtros selecionados."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {temClientes && temFornecedores && (
            <RadioGroup
              value={modo}
              onValueChange={(v) => setModo(v as TipoParceiroProdutos)}
              className="flex gap-6"
              aria-label="Relatório por"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cliente" id="relatorio-produtos-modo-cliente" />
                <Label htmlFor="relatorio-produtos-modo-cliente" className="cursor-pointer">
                  Cliente (vendas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fornecedor" id="relatorio-produtos-modo-fornecedor" />
                <Label htmlFor="relatorio-produtos-modo-fornecedor" className="cursor-pointer">
                  Fornecedor (compras)
                </Label>
              </div>
            </RadioGroup>
          )}

          <div className="space-y-2">
            <Label htmlFor="relatorio-produtos-parceiro">
              {ehFornecedor ? "Fornecedor" : "Cliente"}
            </Label>
            <Select
              key={modo}
              value={parceiroId}
              onValueChange={ehFornecedor ? setFornecedorId : setClienteId}
            >
              <SelectTrigger id="relatorio-produtos-parceiro">
                <SelectValue placeholder={`Selecione o ${rotulo}`} />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {ehFornecedor
                  ? (fornecedores ?? []).map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {nomeFornecedor(f)}
                      </SelectItem>
                    ))
                  : (clientes ?? []).map((c) => (
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
                    Data do pedido (emissão)
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

            <div className="space-y-2">
              <RelatorioPeriodoFinanceiro
                dataInicial={dataInicial}
                dataFinal={dataFinal}
                onDataInicial={setDataInicial}
                onDataFinal={setDataFinal}
              />
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{semPeriodo ? "Sem período: todo o histórico." : "Deixe vazio para todo o histórico."}</span>
                {!semPeriodo && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      setDataInicial("");
                      setDataFinal("");
                    }}
                  >
                    Todo o histórico
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <FiltrosStatusProdutosCliente
              idPrefix="produtos-status"
              statusPedido={statusPedido}
              onStatusPedido={setStatusPedido}
              situacao={statusFiltro}
              onSituacao={setStatusFiltro}
              tipoParceiro={modo}
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
                Selecione o {rotulo} para habilitar o PDF.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
