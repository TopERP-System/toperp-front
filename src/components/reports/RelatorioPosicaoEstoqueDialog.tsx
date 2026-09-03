import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { estoqueService } from "@/services/estoque.service";
import { Produto, produtosService } from "@/services/produtos.service";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Check, ChevronsUpDown, Download, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDataInicial?: string;
  defaultDataFinal?: string;
  defaultProdutoId?: number | null;
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

export function RelatorioPosicaoEstoqueDialog({
  open,
  onOpenChange,
  defaultDataInicial,
  defaultDataFinal,
  defaultProdutoId,
}: Props) {
  const { inicio: defInicio, fim: defFim } = useMemo(() => inicioFimMesAtual(), []);
  const [dataInicial, setDataInicial] = useState(defInicio);
  const [dataFinal, setDataFinal] = useState(defFim);
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<"download" | "print" | null>(null);

  const { data: produtosData } = useQuery({
    queryKey: ["produtos-relatorio-posicao"],
    queryFn: async () => {
      const response = await produtosService.listar({
        page: 1,
        limit: 100,
        statusProduto: "ATIVO",
      });
      if (response?.data && Array.isArray(response.data)) return response.data;
      if (Array.isArray(response)) return response;
      if (response?.produtos && Array.isArray(response.produtos)) {
        return response.produtos;
      }
      return [];
    },
    enabled: open,
    staleTime: 60_000,
  });

  const produtos: Produto[] = produtosData || [];
  const produtoSelecionado = useMemo(
    () =>
      produtoId == null
        ? null
        : produtos.find((p) => Number(p.id) === Number(produtoId)) ?? null,
    [produtos, produtoId],
  );

  useEffect(() => {
    if (!open) return;
    setDataInicial(defaultDataInicial?.trim() || defInicio);
    setDataFinal(defaultDataFinal?.trim() || defFim);
    setProdutoId(
      defaultProdutoId != null && Number.isFinite(Number(defaultProdutoId))
        ? Number(defaultProdutoId)
        : null,
    );
  }, [
    open,
    defaultDataInicial,
    defaultDataFinal,
    defaultProdutoId,
    defInicio,
    defFim,
  ]);

  const paramsPdf = () => ({
    data_inicial: dataInicial.trim() || undefined,
    data_final: dataFinal.trim() || undefined,
    produto_id: produtoId ?? undefined,
  });

  const handleDownloadPdf = async () => {
    setPdfLoading("download");
    try {
      await estoqueService.downloadRelatorioPosicaoEstoquePdf(paramsPdf());
      toast.success("Relatório de posição de estoque baixado.");
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
      await estoqueService.printRelatorioPosicaoEstoquePdf(paramsPdf());
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir PDF.");
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de Posição de Estoque</DialogTitle>
          <DialogDescription>
            Produto, quantidade no início do período, quantidade no fim do mês,
            preço de compra e valor total (qtd. fim × custo).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#1A3B70]">
                Produto
              </Label>
              <Popover open={produtoOpen} onOpenChange={setProdutoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={produtoOpen}
                    className="w-full justify-between font-normal rounded-lg border-border/80 bg-muted/50"
                  >
                    <span className="truncate">
                      {produtoSelecionado
                        ? `${produtoSelecionado.nome} — ${produtoSelecionado.sku}`
                        : "Todos os produtos"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[var(--radix-popover-trigger-width)]"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Buscar produto ou SKU..." />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="todos-os-produtos"
                          onSelect={() => {
                            setProdutoId(null);
                            setProdutoOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              produtoId == null ? "opacity-100" : "opacity-0",
                            )}
                          />
                          Todos os produtos
                        </CommandItem>
                        {produtos.map((produto) => (
                          <CommandItem
                            key={produto.id}
                            value={`${produto.nome} ${produto.sku}`}
                            onSelect={() => {
                              setProdutoId(Number(produto.id));
                              setProdutoOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                Number(produtoId) === Number(produto.id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <span className="truncate">
                              {produto.nome} — {produto.sku}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#1A3B70]">
                Período
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Data Inicial
                  </Label>
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
                  <Label className="text-xs text-muted-foreground">
                    Data Final
                  </Label>
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
              <p className="text-xs text-muted-foreground">
                A quantidade no fim do período é a posição do estoque na data
                final (ex.: último dia do mês).
              </p>
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
