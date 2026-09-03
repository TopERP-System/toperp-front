import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatarDataBR, formatarFormaPagamento } from '@/lib/utils';
import { financeiroService } from '@/services/financeiro.service';
import { pedidosService } from '@/services/pedidos.service';
import type { ItemHistoricoPagamento } from '@/types/pedido-financeiro.types';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, FileText, Loader2, Truck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const FORMA_ESTRUTURAL_LABELS: Record<string, string> = {
  AVISTA: 'À Vista',
  PARCELADO: 'Parcelado',
  BOLETO_DESCONTADO: 'Boleto Descontado',
};

const ContasAPagarPedidoDetalhes = () => {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const id = pedidoId ? Number(pedidoId) : 0;

  const [pedidoQuery, resumoQuery, pagamentosQuery, contasPedidoQuery] = useQueries({
    queries: [
      {
        queryKey: ['pedidos', pedidoId],
        queryFn: () => pedidosService.buscarPorId(id),
        enabled: !!id,
      },
      {
        queryKey: ['pedidos', pedidoId, 'resumo-financeiro'],
        queryFn: () => pedidosService.getResumoFinanceiro(id),
        enabled: !!id,
        retry: false,
      },
      {
        queryKey: ['pedidos', pedidoId, 'pagamentos'],
        queryFn: () => pedidosService.listarPagamentosPedido(id),
        enabled: !!id,
        retry: false,
      },
      {
        queryKey: ['contas-financeiras', 'pedido', pedidoId, 'PAGAR'],
        queryFn: async () => {
          const contas = await financeiroService.buscarPorPedido(id);
          return (contas || []).filter((c) => c.tipo === 'PAGAR' || !c.tipo);
        },
        enabled: !!id,
        retry: false,
      },
    ],
  });

  const pedido = pedidoQuery.data;
  const resumoRaw = resumoQuery.data;
  const pagamentosNovo = pagamentosQuery.data;
  const contasDoPedido = contasPedidoQuery.data ?? [];

  const isLoading = pedidoQuery.isLoading || resumoQuery.isLoading;
  const error = pedidoQuery.error || resumoQuery.error;
  const resumo = resumoRaw ?? null;
  const pagamentos: ItemHistoricoPagamento[] = Array.isArray(pagamentosNovo) ? pagamentosNovo : [];

  const fallbackFinanceiro = resumoQuery.isError && !resumo;

  const [legadoQuery] = useQueries({
    queries: [
      {
        queryKey: ['pedidos', pedidoId, 'financeiro-legado'],
        queryFn: () => pedidosService.buscarPorIdComFinanceiro(id),
        enabled: !!id && !!fallbackFinanceiro,
      },
    ],
  });

  const legado = legadoQuery.data as any;
  const resumoFinal = resumo ?? (legado?.resumo_financeiro ? {
    valor_total: legado.resumo_financeiro.valor_total ?? 0,
    valor_pago: legado.resumo_financeiro.valor_pago ?? 0,
    valor_em_aberto: legado.resumo_financeiro.valor_em_aberto ?? 0,
    status: (legado.resumo_financeiro as any).status ?? 'ABERTO',
    data_vencimento: (legado.resumo_financeiro as any).data_vencimento ?? null,
  } : null);

  const historicoPagamentos: ItemHistoricoPagamento[] = pagamentos.length > 0
    ? pagamentos
    : (legado?.parcelas
      ? (legado.parcelas as any[]).flatMap((p: any) => (p.pagamentos || []).map((pg: any) => ({
          id: pg.id,
          valor: pg.valor_pago ?? 0,
          forma_pagamento: pg.forma_pagamento ?? '',
          data_pagamento: pg.data_lancamento ?? pg.data_pagamento ?? '',
        })))
      : []);

  const loadingLegado = fallbackFinanceiro && legadoQuery.isLoading;
  const isLoadingAny = isLoading || (fallbackFinanceiro && loadingLegado);
  const errorAny = error && !fallbackFinanceiro ? error : (fallbackFinanceiro && !legadoQuery.isLoading && legadoQuery.isError ? legadoQuery.error : null);
  const semDados = !pedido || !resumoFinal;

  const fornecedorNome = (pedido as any)?.fornecedor?.nome_fantasia || (pedido as any)?.fornecedor?.nome_razao || (pedido as any)?.fornecedor_id || '—';

  if (isLoadingAny) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (errorAny || semDados) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contas-a-pagar')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>
            </div>
          </div>
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="font-medium">Erro ao carregar detalhes do pedido</p>
            <p className="text-sm mt-1">
              {errorAny instanceof Error ? errorAny.message : 'Tente novamente mais tarde.'}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const formaEstrutural = (pedido as any)?.forma_pagamento_estrutural || 'AVISTA';
  const formaPagamentoPedido = (pedido as any)?.forma_pagamento;
  const formasPagamentoPlano = pedido?.formas_pagamento ?? [];
  const formasFromContas = contasDoPedido
    .filter((c) => c.forma_pagamento)
    .map((c) => ({
      forma_pagamento: String(c.forma_pagamento),
      valor: Number(
        (c as any).valor_total ?? c.valor_original ?? c.valor_restante ?? 0,
      ),
      data_vencimento: c.data_vencimento ?? undefined,
    }));
  const formasParaExibir =
    formasPagamentoPlano.length > 0
      ? formasPagamentoPlano
      : contasDoPedido.length > 1
        ? formasFromContas
        : [];
  const formaDisplay =
    formaEstrutural === 'BOLETO_DESCONTADO'
      ? 'Boleto Descontado'
      : formaPagamentoPedido
        ? `${formatarFormaPagamento(formaPagamentoPedido)}${formaEstrutural === 'PARCELADO' ? ' (Parcelado)' : ''}`
        : FORMA_ESTRUTURAL_LABELS[formaEstrutural] || formaEstrutural;

  return (
    <AppLayout>
        <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contas-a-pagar')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>
              <p className="text-muted-foreground">{pedido!.numero_pedido}</p>
            </div>
          </div>
          {resumoFinal!.valor_em_aberto > 0 && (
            <Button onClick={() => navigate(`/financeiro/contas-pagar/${pedidoId}/pagamentos`)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Pagamentos
            </Button>
          )}
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Informações do Pedido</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Fornecedor
              </div>
              <div className="font-medium">{fornecedorNome}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Nº Pedido
              </div>
              <div className="font-medium">{pedido!.numero_pedido}</div>
            </div>
            {contasDoPedido.length <= 1 && formasParaExibir.length === 0 && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Forma de Pagamento</div>
                <div className="font-medium">{formaDisplay}</div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Status financeiro</div>
              <div className="font-medium">{resumoFinal!.status}</div>
            </div>
          </div>

          {contasDoPedido.length > 1 ? (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium text-muted-foreground">
                Formas de pagamento ({contasDoPedido.length})
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasDoPedido.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="whitespace-nowrap">
                          {c.numero_conta || c.id}
                        </TableCell>
                        <TableCell>
                          {c.forma_pagamento
                            ? formatarFormaPagamento(c.forma_pagamento)
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {c.data_vencimento
                            ? formatarDataBR(c.data_vencimento)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {formatCurrency(
                            Number(
                              (c as any).valor_total ??
                                c.valor_original ??
                                c.valor_restante ??
                                0,
                            ),
                          )}
                        </TableCell>
                        <TableCell>{c.status || '—'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(
                          contasDoPedido.reduce(
                            (acc, c) =>
                              acc +
                              Number(
                                (c as any).valor_total ??
                                  c.valor_original ??
                                  c.valor_restante ??
                                  0,
                              ),
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : formasParaExibir.length > 0 ? (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium text-muted-foreground">
                Formas de pagamento ({formasParaExibir.length})
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forma</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formasParaExibir.map((fp, idx) => (
                      <TableRow key={`${fp.forma_pagamento}-${idx}`}>
                        <TableCell>
                          {formatarFormaPagamento(fp.forma_pagamento)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fp.data_vencimento
                            ? formatarDataBR(fp.data_vencimento)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {formatCurrency(Number(fp.valor || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(
                          formasParaExibir.reduce(
                            (acc, fp) => acc + Number(fp.valor || 0),
                            0,
                          ),
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-xl font-bold text-primary">{formatCurrency(resumoFinal!.valor_total)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Pago</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(resumoFinal!.valor_pago)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor em Aberto</div>
              <div className="text-xl font-bold text-amber-600">{formatCurrency(resumoFinal!.valor_em_aberto)}</div>
            </div>
            {resumoFinal!.data_vencimento && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Vencimento</div>
                <div className="font-medium">{formatarDataBR(resumoFinal!.data_vencimento)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Histórico de Pagamentos</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicoPagamentos.length > 0 ? (
                [...historicoPagamentos]
                  .sort((a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime())
                  .flatMap((item) => {
                    const rows = [
                      <TableRow key={item.id}>
                        <TableCell>{formatarDataBR(item.data_pagamento)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.valor)}</TableCell>
                        <TableCell>{formatarFormaPagamento(item.forma_pagamento)}</TableCell>
                      </TableRow>,
                    ];
                    if (item.forma_pagamento === 'CHEQUE' && item.cheque) {
                      const c = item.cheque;
                      const temAlgum = c.banco || c.numero_cheque || c.agencia || c.conta || c.titular;
                      if (temAlgum) {
                        rows.push(
                          <TableRow key={`${item.id}-cheque`} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={3} className="py-3 align-top">
                              <div className="rounded-lg border bg-card p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Detalhes do cheque</p>
                                <dl className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 text-sm">
                                  {c.banco && (
                                    <div>
                                      <dt className="text-muted-foreground">Banco</dt>
                                      <dd className="font-medium text-foreground">{c.banco}</dd>
                                    </div>
                                  )}
                                  {c.numero_cheque && (
                                    <div>
                                      <dt className="text-muted-foreground">Nº do cheque</dt>
                                      <dd className="font-medium text-foreground">{c.numero_cheque}</dd>
                                    </div>
                                  )}
                                  {c.agencia && (
                                    <div>
                                      <dt className="text-muted-foreground">Agência</dt>
                                      <dd className="font-medium text-foreground">{c.agencia}</dd>
                                    </div>
                                  )}
                                  {c.conta && (
                                    <div>
                                      <dt className="text-muted-foreground">Conta</dt>
                                      <dd className="font-medium text-foreground">{c.conta}</dd>
                                    </div>
                                  )}
                                  {c.titular && (
                                    <div>
                                      <dt className="text-muted-foreground">Titular</dt>
                                      <dd className="font-medium text-foreground">{c.titular}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            </TableCell>
                          </TableRow>,
                        );
                      }
                    }
                    return rows;
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum pagamento registrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContasAPagarPedidoDetalhes;
