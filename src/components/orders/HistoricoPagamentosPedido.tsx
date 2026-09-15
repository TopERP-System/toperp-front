import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { pagamentosService } from '@/services/pagamentos.service';
import { pedidosService } from '@/services/pedidos.service';
import type { ItemHistoricoPagamento } from '@/types/pedido-financeiro.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, History, Info, Loader2, RotateCcw } from 'lucide-react';
import React, { useMemo, useState } from 'react';

const FORMAS_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
  CHEQUE: 'Cheque',
};

interface HistoricoPagamentosPedidoProps {
  pedidoId: number;
  defaultOpen?: boolean;
  onEstornoSucesso?: () => void;
}

export function HistoricoPagamentosPedido({
  pedidoId,
  defaultOpen = false,
  onEstornoSucesso,
}: HistoricoPagamentosPedidoProps) {
  const [aberto, setAberto] = useState(defaultOpen);
  const [pagamentoParaEstornar, setPagamentoParaEstornar] = useState<ItemHistoricoPagamento | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pagamentosNovo, isLoading: loadingNovo } = useQuery({
    queryKey: ['pedidos', pedidoId, 'pagamentos'],
    queryFn: () => pedidosService.listarPagamentosPedido(pedidoId),
    enabled: aberto && !!pedidoId,
    retry: false,
  });

  const { data: pagamentosLegado, isLoading: loadingLegado } = useQuery({
    queryKey: ['pagamentos', 'pedido', pedidoId],
    queryFn: () => pagamentosService.listarPorPedido(pedidoId),
    enabled: aberto && !!pedidoId,
    retry: false,
  });

  const estornarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo?: string }) => {
      const dataEstorno = new Date().toISOString().slice(0, 10);
      return pagamentosService.estornar(id, {
        motivo_estorno: motivo || undefined,
        data_estorno: dataEstorno,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Pagamento estornado com sucesso!',
        description: 'O valor foi revertido e o saldo em aberto do pedido foi recalculado.',
      });
      setPagamentoParaEstornar(null);
      setMotivoEstorno('');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['contas-a-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
      onEstornoSucesso?.();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao estornar pagamento',
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Ocorreu um erro ao tentar estornar o pagamento.',
      });
    },
  });

  const listaNormalizada = useMemo((): ItemHistoricoPagamento[] => {
    const mapa = new Map<number, ItemHistoricoPagamento>();

    // 1. Carregar pagamentos do serviço principal de pagamentos (com a coluna estornado)
    if (Array.isArray(pagamentosLegado)) {
      for (const p of pagamentosLegado) {
        const est = Boolean(
          p.estornado === true ||
          p.estornado === 1 ||
          String(p.estornado).toLowerCase() === 'true' ||
          (p as any).is_estornado === true ||
          (p as any).is_estornado === 1 ||
          (p as any).estornado_em != null ||
          (p as any).data_estorno != null ||
          (p as any).motivo_estorno != null ||
          String(p.status).toUpperCase() === 'ESTORNADO' ||
          String(p.status).toUpperCase() === 'CANCELADO'
        );
        mapa.set(p.id, {
          id: p.id,
          valor: p.valor_pago,
          forma_pagamento: p.forma_pagamento,
          data_pagamento: p.data_lancamento ?? (p as any).data_pagamento ?? '',
          status: p.status ?? (est ? 'ESTORNADO' : 'PAGO'),
          estornado: est,
          motivo_estorno: (p as any).motivo_estorno ?? null,
          data_estorno: (p as any).data_estorno ?? null,
          cheque: (p as any).cheque,
          cheques: p.cheques,
        } as any);
      }
    }

    // 2. Mesclar com pagamentos do endpoint de pedido, preservando sinalizações de estorno
    if (Array.isArray(pagamentosNovo)) {
      for (const p of pagamentosNovo) {
        const existente = mapa.get(p.id);
        const pEstornado = Boolean(
          p.estornado === true ||
          p.estornado === 1 ||
          String(p.estornado).toLowerCase() === 'true' ||
          (p as any).is_estornado === true ||
          (p as any).is_estornado === 1 ||
          (p as any).estornado_em != null ||
          (p as any).data_estorno != null ||
          (p as any).motivo_estorno != null ||
          String(p.status).toUpperCase() === 'ESTORNADO' ||
          String(p.status).toUpperCase() === 'CANCELADO' ||
          existente?.estornado ||
          false
        );

        if (existente) {
          mapa.set(p.id, {
            ...existente,
            ...p,
            estornado: pEstornado,
            status: p.status ?? (pEstornado ? 'ESTORNADO' : existente.status),
            motivo_estorno: p.motivo_estorno ?? (p as any).motivo_estorno ?? existente.motivo_estorno,
            data_estorno: p.data_estorno ?? (p as any).data_estorno ?? existente.data_estorno,
          });
        } else {
          mapa.set(p.id, {
            ...p,
            estornado: pEstornado,
            status: p.status ?? (pEstornado ? 'ESTORNADO' : 'PAGO'),
          });
        }
      }
    }

    return Array.from(mapa.values());
  }, [pagamentosNovo, pagamentosLegado]);

  const isLoading = loadingNovo && loadingLegado;

  const listaOrdenada = useMemo(() => {
    if (!listaNormalizada.length) return [];
    return [...listaNormalizada].sort(
      (a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()
    );
  }, [listaNormalizada]);

  const formatarDataPagamento = (data: string) => {
    try {
      return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
    }
  };
  const formatarData = formatarDataPagamento;

  const formatarDataHoraEstorno = (dataString?: string | null) => {
    if (!dataString) return null;
    try {
      const d = new Date(dataString);
      if (isNaN(d.getTime())) return dataString;
      return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dataString;
    }
  };

  const handleConfirmarEstorno = () => {
    if (!pagamentoParaEstornar) return;
    estornarMutation.mutate({
      id: pagamentoParaEstornar.id,
      motivo: motivoEstorno.trim(),
    });
  };

  return (
    <>
      <Collapsible open={aberto} onOpenChange={setAberto}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
            <History className="w-4 h-4" />
            Histórico de pagamentos
            {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : listaOrdenada.length === 0 ? (
              <p className="py-4 px-4 text-sm text-muted-foreground text-center">
                Nenhum pagamento registrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Data</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaOrdenada.map((p) => {
                    const ehEstornado = Boolean(
                      p.estornado === true ||
                      p.estornado === 1 ||
                      String(p.estornado).toLowerCase() === 'true' ||
                      (p as any).is_estornado === true ||
                      (p as any).is_estornado === 1 ||
                      (p as any).estornado_em != null ||
                      (p as any).data_estorno != null ||
                      (p as any).motivo_estorno != null ||
                      String(p.status).toUpperCase() === 'ESTORNADO' ||
                      String(p.status).toUpperCase() === 'CANCELADO'
                    );

                    const dataHoraEstorno = formatarDataHoraEstorno(p.data_estorno ?? (p as any).estornado_em);

                    return (
                      <React.Fragment key={p.id}>
                        <TableRow>
                          <TableCell className="text-sm">{formatarDataPagamento(p.data_pagamento)}</TableCell>
                          <TableCell className="text-sm">
                            {FORMAS_LABEL[p.forma_pagamento] || p.forma_pagamento}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(p.valor)}</TableCell>
                          <TableCell>
                            {ehEstornado ? (
                              <div className="space-y-0.5">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="inline-flex items-center gap-1 cursor-pointer">
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800">
                                          Estornado
                                        </Badge>
                                        <Info className="w-3.5 h-3.5 text-amber-600/70" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs space-y-1 text-xs">
                                      {dataHoraEstorno && (
                                        <p><strong>Data do estorno:</strong> {dataHoraEstorno}</p>
                                      )}
                                      {p.motivo_estorno ? (
                                        <p><strong>Motivo:</strong> {p.motivo_estorno}</p>
                                      ) : (
                                        <p className="italic text-muted-foreground">Sem motivo informado</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {p.motivo_estorno && (
                                  <p className="text-[11px] text-muted-foreground italic truncate max-w-[180px]" title={p.motivo_estorno}>
                                    {p.motivo_estorno}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge className="bg-green-500/10 text-green-600">Pago</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!ehEstornado ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1 text-xs"
                                onClick={() => setPagamentoParaEstornar(p)}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Estornar
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {(p as any).forma_pagamento === 'CHEQUE' && (p as any).cheques && (p as any).cheques.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/30 py-2">
                              <div className="text-sm">
                                <p className="font-medium mb-2">Cheques:</p>
                                <ul className="space-y-1">
                                  {((p as any).cheques as Array<{ id?: number; numero_cheque?: string; valor?: number; titular?: string; banco?: string; data_vencimento?: string; status?: string }>).map((ch, idx) => (
                                    <li key={ch.id ?? idx} className="flex gap-4 flex-wrap">
                                      <span><strong>{ch.numero_cheque}</strong> — {formatCurrency(ch.valor ?? 0)}</span>
                                      <span>{ch.titular}</span>
                                      <span>{ch.banco}</span>
                                      {ch.data_vencimento && <span>Venc: {formatarData(ch.data_vencimento)}</span>}
                                      {ch.status && <Badge variant="outline">{ch.status}</Badge>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Modal de Confirmação de Estorno */}
      <Dialog
        open={!!pagamentoParaEstornar}
        onOpenChange={(open) => {
          if (!open) {
            setPagamentoParaEstornar(null);
            setMotivoEstorno('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <RotateCcw className="w-5 h-5" />
              Estornar Pagamento
            </DialogTitle>
            <DialogDescription>
              Deseja estornar este pagamento? O valor será revertido e o saldo em aberto do pedido será recalculado.
            </DialogDescription>
          </DialogHeader>

          {pagamentoParaEstornar && (
            <div className="py-2 space-y-4">
              <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">{formatarDataPagamento(pagamentoParaEstornar.data_pagamento)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forma:</span>
                  <span className="font-medium">
                    {FORMAS_LABEL[pagamentoParaEstornar.forma_pagamento] || pagamentoParaEstornar.forma_pagamento}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium text-green-600">{formatCurrency(pagamentoParaEstornar.valor)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo_estorno_pedido">Motivo do Estorno (Opcional)</Label>
                <Textarea
                  id="motivo_estorno_pedido"
                  placeholder="Ex: Cancelamento de recebimento do pedido, valor informado em duplicidade"
                  value={motivoEstorno}
                  onChange={(e) => setMotivoEstorno(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPagamentoParaEstornar(null);
                setMotivoEstorno('');
              }}
              disabled={estornarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={estornarMutation.isPending || !pagamentoParaEstornar}
              onClick={handleConfirmarEstorno}
            >
              {estornarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Estornando...
                </>
              ) : (
                'Confirmar Estorno'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

