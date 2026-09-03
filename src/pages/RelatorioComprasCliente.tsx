import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  isStatusFiltroProdutosCliente,
  mensagemListaVaziaProdutosCliente,
  type StatusFiltroProdutosCliente,
} from "@/lib/relatorio-produtos-cliente";
import { Cliente, clientesService, extractClientesFromResponse } from "@/services/clientes.service";
import { pedidosService } from "@/services/pedidos.service";
import { useQuery } from "@tanstack/react-query";
import { Circle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

function inicioFimMesAtual(): { inicio: string; fim: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const inicio = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const ultimo = new Date(y, m + 1, 0);
  const fim = `${y}-${String(m + 1).padStart(2, "0")}-${String(ultimo.getDate()).padStart(2, "0")}`;
  return { inicio, fim };
}

const RelatorioComprasCliente = () => {
  const [searchParams] = useSearchParams();
  const { inicio: defInicio, fim: defFim } = useMemo(() => inicioFimMesAtual(), []);
  const [clienteId, setClienteId] = useState<string>("");
  const [dataInicial, setDataInicial] = useState(defInicio);
  const [dataFinal, setDataFinal] = useState(defFim);
  const [statusFiltro, setStatusFiltro] =
    useState<StatusFiltroProdutosCliente>("Todos");

  useEffect(() => {
    const c = searchParams.get("cliente_id");
    const di = searchParams.get("data_inicial");
    const df = searchParams.get("data_final");
    const st = searchParams.get("status");
    if (c) setClienteId(c);
    if (di) setDataInicial(di);
    if (df) setDataFinal(df);
    if (st && isStatusFiltroProdutosCliente(st)) {
      setStatusFiltro(st);
    }
  }, [searchParams]);

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes", "relatorio-compras-cliente"],
    queryFn: async () => {
      const pageSize = 1000;
      const acumulado: Cliente[] = [];
      let page = 1;
      for (;;) {
        const resp = await clientesService.listar({ page, limit: pageSize });
        const batch = extractClientesFromResponse(resp);
        acumulado.push(...batch);
        const total = resp.total;
        if (batch.length === 0) break;
        if (batch.length < pageSize) break;
        if (typeof total === "number" && acumulado.length >= total) break;
        page += 1;
      }
      return acumulado;
    },
  });

  const podeBuscar =
    !!clienteId &&
    Number(clienteId) > 0 &&
    !!dataInicial?.trim() &&
    !!dataFinal?.trim();

  const {
    data: relatorio,
    isLoading: loadingRelatorio,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: [
      "pedidos",
      "relatorio-compras-cliente",
      clienteId,
      dataInicial,
      dataFinal,
      statusFiltro,
    ],
    queryFn: () =>
      pedidosService.getRelatorioComprasCliente({
        cliente_id: Number(clienteId),
        data_inicial: dataInicial.trim(),
        data_final: dataFinal.trim(),
        status: statusFiltro,
      }),
    enabled: podeBuscar,
    retry: 1,
  });

  useEffect(() => {
    if (!error) return;
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "Erro ao carregar relatório";
    toast.error(typeof msg === "string" ? msg : "Erro ao carregar relatório");
  }, [error]);

  const fmtDataBr = (iso: string) => {
    if (!iso || iso.length < 10) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  };

  const statusExibicao =
    relatorio?.filtros_aplicados?.status ?? statusFiltro;

  const textoListaVazia = useMemo(() => {
    if (!podeBuscar || !relatorio || relatorio.itens.length > 0) return null;
    return mensagemListaVaziaProdutosCliente({
      clienteNome: relatorio.cliente?.nome ?? "",
      dataInicial: dataInicial.trim(),
      dataFinal: dataFinal.trim(),
      statusFiltro: statusExibicao,
    });
  }, [podeBuscar, relatorio, dataInicial, dataFinal, statusExibicao]);

  const labelStatusResumo =
    statusExibicao === "Todos"
      ? "Todos os status"
      : statusExibicao;

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Relatório de produtos por cliente
          </h1>
          <p className="text-muted-foreground">
            Filtro pela <strong>data do pedido</strong> e pelo <strong>status do pedido</strong>{" "}
            (ABERTO = Pendente, PARCIAL = Pago parcial, QUITADO = Quitada, etc.).
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Selecione o cliente, o período e o status. Os mesmos parâmetros podem vir da URL ao abrir pelo menu Relatórios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Cliente</Label>
                <Select
                  value={clienteId}
                  onValueChange={setClienteId}
                  disabled={loadingClientes}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingClientes ? "Carregando…" : "Selecione o cliente"} />
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
              <div className="space-y-2">
                <Label htmlFor="di">Data inicial</Label>
                <Input
                  id="di"
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="df">Data final</Label>
                <Input
                  id="df"
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
              <Label className="text-sm font-semibold text-[#1A3B70]">Status do pedido</Label>
              <RadioGroup
                value={statusFiltro}
                onValueChange={(v) =>
                  setStatusFiltro(v as StatusFiltroProdutosCliente)
                }
                className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Todos" id="page-prod-status-todos" />
                  <Label htmlFor="page-prod-status-todos" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Circle className="w-3 h-3 text-primary" />
                    <span className="text-[#1A3B70]">Todos</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PENDENTE" id="page-prod-status-pendente" />
                  <Label htmlFor="page-prod-status-pendente" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Circle className="w-3 h-3 text-amber-500" />
                    <span className="text-[#1A3B70]">Pendente</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PAGO_PARCIAL" id="page-prod-status-parcial" />
                  <Label htmlFor="page-prod-status-parcial" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Circle className="w-3 h-3 text-sky-500" />
                    <span className="text-[#1A3B70]">Pago parcial</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PAGO_TOTAL" id="page-prod-status-quitado" />
                  <Label htmlFor="page-prod-status-quitado" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Circle className="w-3 h-3 text-emerald-500" />
                    <span className="text-[#1A3B70]">Quitada</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="VENCIDO" id="page-prod-status-vencido" />
                  <Label htmlFor="page-prod-status-vencido" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Circle className="w-3 h-3 text-red-500" />
                    <span className="text-[#1A3B70]">Vencido</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CANCELADO" id="page-prod-status-cancelado" />
                  <Label htmlFor="page-prod-status-cancelado" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Circle className="w-3 h-3 text-slate-600" />
                    <span className="text-[#1A3B70]">Cancelado</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="relatorioPrimary"
                disabled={!podeBuscar || isFetching}
                onClick={() => refetch()}
                className="gap-2 h-10 min-h-10 rounded-lg px-4 text-sm"
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {podeBuscar && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {relatorio?.cliente?.nome ?? "Cliente"}
              </CardTitle>
              <CardDescription>
                Período: {fmtDataBr(relatorio?.periodo?.inicio ?? dataInicial)} a{" "}
                {fmtDataBr(relatorio?.periodo?.fim ?? dataFinal)}
                {" · "}
                Status: {labelStatusResumo}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRelatorio && !relatorio ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  {textoListaVazia && (
                    <p className="mb-4 rounded-lg border border-border/80 bg-muted/20 px-3 py-3 text-sm text-[#1A3B70]">
                      {textoListaVazia}
                    </p>
                  )}
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Preço de compra</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(relatorio?.itens ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                              —
                            </TableCell>
                          </TableRow>
                        ) : (
                          relatorio!.itens.map((row, idx) => (
                            <TableRow key={`${row.pedido_id}-${row.produto_nome}-${idx}`}>
                              <TableCell className="whitespace-nowrap">
                                {fmtDataBr(row.data)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {row.numero_pedido}
                              </TableCell>
                              <TableCell>{row.produto_nome}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(row.quantidade).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 3,
                                })}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(row.preco_unitario)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium">
                                {formatCurrency(row.subtotal)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {(relatorio?.itens?.length ?? 0) > 0 && (
                    <p className="mt-4 text-right font-semibold text-foreground">
                      Total: {formatCurrency(relatorio!.total_geral)}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!podeBuscar && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Escolha um cliente, as datas e o status para carregar o relatório.
          </p>
        )}
      </div>
    </AppLayout>
  );
};

export default RelatorioComprasCliente;
