import AppLayout from '@/components/layout/AppLayout';
import { ModulePageHeader } from '@/components/layout/ModulePageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NotaFiscalDiagnosticoDialog } from '@/components/orders/NotaFiscalDiagnosticoDialog';
import { extractApiErrorMessage } from '@/lib/api-error-message';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { notaFiscalService } from '@/services/nota-fiscal.service';
import {
  STATUS_NOTA_FISCAL_LABELS,
  isStatusNotaEmProcessamento,
  type StatusNotaFiscal,
} from '@/types/nota-fiscal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileCode2, FileJson, Loader2, Receipt, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const STATUS_FILTRO: Array<{ value: 'all' | StatusNotaFiscal; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'authorized', label: 'Autorizada' },
  { value: 'rejected', label: 'Rejeitada' },
  { value: 'enqueued', label: 'Enfileirada' },
  { value: 'created', label: 'Criada' },
  { value: 'canceled', label: 'Cancelada' },
  { value: 'denied', label: 'Denegada' },
];

function statusBadgeClass(status: StatusNotaFiscal): string {
  switch (status) {
    case 'authorized':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400';
    case 'rejected':
    case 'denied':
    case 'canceled':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
    case 'enqueued':
    case 'received':
    case 'created':
    case 'inContingent':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function NotasFiscais() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'all' | StatusNotaFiscal>('all');
  const limit = 20;

  const queryKey = ['notas-fiscais', page, busca, statusFiltro] as const;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      notaFiscalService.listar({
        page,
        limit,
        busca: busca || undefined,
        status: statusFiltro === 'all' ? undefined : statusFiltro,
      }),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((item) => isStatusNotaEmProcessamento(item.status))
        ? 30_000
        : false;
    },
  });

  const consultarMutation = useMutation({
    mutationFn: (pedidoId: number) => notaFiscalService.consultar(pedidoId),
    onSuccess: (nota) => {
      queryClient.invalidateQueries({ queryKey: ['notas-fiscais'] });
      toast.success('Status atualizado', {
        description: STATUS_NOTA_FISCAL_LABELS[nota.status] ?? nota.status,
      });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const [baixandoPdf, setBaixandoPdf] = useState<number | null>(null);
  const [baixandoXml, setBaixandoXml] = useState<number | null>(null);
  const [diagnosticoPedido, setDiagnosticoPedido] = useState<{
    id: number;
    numero: string;
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  const handleBuscar = () => {
    setPage(1);
    setBusca(buscaInput.trim());
  };

  const handleBaixarPdf = async (pedidoId: number, numeroPedido: string) => {
    setBaixandoPdf(pedidoId);
    try {
      await notaFiscalService.baixarPdf(pedidoId, numeroPedido);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setBaixandoPdf(null);
    }
  };

  const handleBaixarXml = async (pedidoId: number, numeroPedido: string) => {
    setBaixandoXml(pedidoId);
    try {
      await notaFiscalService.baixarXml(pedidoId, numeroPedido);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setBaixandoXml(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0 space-y-6">
        <ModulePageHeader
          icon={Receipt}
          title="Notas Fiscais"
          subtitle="Pedidos com tentativa de emissão de NF-e — todos os status"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Atualizar</span>
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar pedido ou cliente..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </div>
          <Select
            value={statusFiltro}
            onValueChange={(v) => {
              setStatusFiltro(v as 'all' | StatusNotaFiscal);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTRO.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBuscar}>Buscar</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Carregando emissões...</p>
              </div>
            ) : isError ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm text-destructive">
                  {extractApiErrorMessage(error)}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : !data?.items.length ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma emissão de NF-e encontrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>NF-e</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data emissão</TableHead>
                      <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                      <TableHead className="w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => {
                      const podeBaixar = item.status === 'authorized';
                      return (
                        <TableRow key={`${item.pedido_id}-${item.numero_pedido}`}>
                          <TableCell className="font-medium text-primary whitespace-nowrap">
                            {item.numero_pedido}
                          </TableCell>
                          <TableCell>{item.cliente_nome || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {item.numero_nf
                              ? `Nº ${item.numero_nf}${item.serie ? ` / Série ${item.serie}` : ''}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn('font-normal', statusBadgeClass(item.status))}
                            >
                              {STATUS_NOTA_FISCAL_LABELS[item.status] ?? item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {item.valor_total != null ? formatCurrency(item.valor_total) : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(item.data_emissao)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[220px]">
                            {item.mensagem_processamento ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground line-clamp-2 cursor-help">
                                      {item.mensagem_processamento}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    {item.mensagem_processamento}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      disabled={consultarMutation.isPending}
                                      onClick={() => consultarMutation.mutate(item.pedido_id)}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Atualizar status na Spedy</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() =>
                                        setDiagnosticoPedido({
                                          id: item.pedido_id,
                                          numero: item.numero_pedido,
                                        })
                                      }
                                    >
                                      <FileJson className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Ver payload / diagnóstico Spedy
                                  </TooltipContent>
                                </Tooltip>
                                {podeBaixar && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          disabled={baixandoPdf === item.pedido_id}
                                          onClick={() =>
                                            handleBaixarPdf(item.pedido_id, item.numero_pedido)
                                          }
                                        >
                                          {baixandoPdf === item.pedido_id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Download className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Baixar PDF (DANFE)</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          disabled={baixandoXml === item.pedido_id}
                                          onClick={() =>
                                            handleBaixarXml(item.pedido_id, item.numero_pedido)
                                          }
                                        >
                                          {baixandoXml === item.pedido_id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <FileCode2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Baixar XML</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {data && data.total > limit && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>{page}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <span className="px-2 text-sm text-muted-foreground">
                  de {totalPages} ({data.total} registros)
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <NotaFiscalDiagnosticoDialog
        open={!!diagnosticoPedido}
        onOpenChange={(open) => {
          if (!open) setDiagnosticoPedido(null);
        }}
        pedidoId={diagnosticoPedido?.id ?? 0}
        numeroPedido={diagnosticoPedido?.numero}
      />
    </AppLayout>
  );
}
