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
import { contasBancariasService } from '@/services/contas-bancarias.service';
import { pedidosService } from '@/services/pedidos.service';
import type { ItemHistoricoPagamento } from '@/types/pedido-financeiro.types';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, FileText, Loader2, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const FORMA_ESTRUTURAL_LABELS: Record<string, string> = {
  AVISTA: 'À Vista',
  PARCELADO: 'Parcelado',
  BOLETO_DESCONTADO: 'Boleto Descontado',
};

const ContasAReceberPedidoDetalhes = () => {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const id = pedidoId ? Number(pedidoId) : 0;

  const [pedidoQuery, resumoQuery, pagamentosQuery, contaDetalheQuery, contasPedidoQuery, contasBancariasQuery] = useQueries({
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
        queryKey: ['conta-financeira-detalhe-pedido', pedidoId],
        queryFn: async () => {
          const contaId = await financeiroService.getContaIdPorPedidoId(id, 'RECEBER');
          if (!contaId) return null;
          return financeiroService.buscarDetalhePorId(contaId);
        },
        enabled: !!id,
        retry: false,
      },
      {
        queryKey: ['contas-financeiras', 'pedido', pedidoId, 'RECEBER'],
        queryFn: async () => {
          const contas = await financeiroService.buscarPorPedido(id);
          return (contas || []).filter((c) => c.tipo === 'RECEBER' || !c.tipo);
        },
        enabled: !!id,
        retry: false,
      },
      {
        queryKey: ['contas-bancarias'],
        queryFn: () => contasBancariasService.listar({ limit: 100 }),
      },
    ],
  });

  const pedido = pedidoQuery.data;
  const resumoRaw = resumoQuery.data;
  const pagamentosNovo = pagamentosQuery.data;
  const contaDetalhe = contaDetalheQuery.data ?? null;
  const contasDoPedido = contasPedidoQuery.data ?? [];
  const contasBancarias = contasBancariasQuery.data?.contas ?? [];

  const getBancoLabel = (item: ItemHistoricoPagamento) => {
    const directName = item.banco || item.conta_bancaria_nome || (item as any).conta_bancaria?.nome;
    if (directName && directName.trim() !== '' && directName !== '—') {
      return directName;
    }
    const cbId = item.conta_bancaria_id ?? (item as any).conta_id;
    if (cbId) {
      const cb = contasBancarias.find((c) => c.id === Number(cbId));
      if (cb) {
        return `${cb.nome}${cb.banco ? ` (${cb.banco})` : ''}`;
      }
    }
    return item.cheque?.banco || '—';
  };

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
          conta_bancaria_id: pg.conta_bancaria_id ?? pg.conta_id,
          banco: pg.banco || pg.conta_bancaria_nome,
        })))
      : []);

  const loadingLegado = fallbackFinanceiro && legadoQuery.isLoading;
  const isLoadingAny = isLoading || (fallbackFinanceiro && loadingLegado);
  const errorAny = error && !fallbackFinanceiro ? error : (fallbackFinanceiro && !legadoQuery.isLoading && legadoQuery.isError ? legadoQuery.error : null);
  const semDados = !pedido || !resumoFinal;

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
            <Button variant="ghost" size="icon" onClick={() => navigate('/contas-a-receber')}>
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
  const formaDisplay = formaEstrutural === 'BOLETO_DESCONTADO'
    ? 'Boleto Descontado'
    : contaDetalhe?.pagamento?.forma_pagamento
      ? formatarFormaPagamento(contaDetalhe.pagamento.forma_pagamento)
      : formaPagamentoPedido
        ? `${formatarFormaPagamento(formaPagamentoPedido)}${formaEstrutural === 'PARCELADO' ? ' (Parcelado)' : ''}`
        : (FORMA_ESTRUTURAL_LABELS[formaEstrutural] || formaEstrutural);

  const totaisContas =
    contasDoPedido.length > 0
      ? {
          total: contasDoPedido.reduce(
            (s, c) =>
              s +
              Number(
                (c as any).valor_total ??
                  c.valor_original ??
                  c.valor_restante ??
                  0,
              ),
            0,
          ),
          pago: contasDoPedido.reduce(
            (s, c) => s + Number(c.valor_pago ?? 0),
            0,
          ),
          aberto: contasDoPedido.reduce((s, c) => {
            const st = String(c.status ?? '').toUpperCase();
            if (st === 'PAGO_TOTAL' || st === 'QUITADO' || st === 'CANCELADO') {
              return s;
            }
            const aberto = Number(
              c.valor_restante ??
                (c as any).valor_em_aberto ??
                Math.max(
                  0,
                  Number(
                    (c as any).valor_total ?? c.valor_original ?? 0,
                  ) - Number(c.valor_pago ?? 0),
                ),
            );
            return s + Math.max(0, aberto);
          }, 0),
        }
      : null;

  const valorTotal =
    contaDetalhe?.valor_total_pedido ??
    resumoFinal!.valor_total ??
    totaisContas?.total ;

  const valorPago =
    totaisContas?.pago ?? contaDetalhe?.valor_pago ?? resumoFinal!.valor_pago;
  const valorEmAberto =
    contaDetalhe?.valor_em_aberto ??
    resumoFinal!.valor_em_aberto
    ?? totaisContas?.aberto;

  const statusExibicao =
    valorEmAberto <= 0.009
      ? 'Quitado'
      : valorPago > 0.009
        ? 'Parcial'
        : (contaDetalhe?.status ?? resumoFinal!.status);
  const dataVencimento =
    contaDetalhe?.datas?.data_vencimento ?? resumoFinal!.data_vencimento ?? null;
  const dataCriacao =
    contaDetalhe?.datas?.data_criacao ??
    (pedido!.data_pedido ? String(pedido!.data_pedido).slice(0, 10) : null);
  const dataPagamento = contaDetalhe?.datas?.data_pagamento ?? null;
  const clienteNome =
    contaDetalhe?.relacionamentos?.cliente_nome ??
    pedido!.cliente?.nome ??
    pedido!.cliente_id ??
    '—';
  const descricaoConta =
    contaDetalhe?.descricao_parcelas_quitadas || contaDetalhe?.descricao || null;

  return (
    <AppLayout>
        <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contas-a-receber')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>
              <p className="text-muted-foreground">{pedido!.numero_pedido}</p>
            </div>
          </div>
          {resumoFinal!.valor_em_aberto > 0 && (
            <Button onClick={() => navigate(`/financeiro/contas-receber/${pedidoId}/pagamentos`)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Pagamentos
            </Button>
          )}
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Informações do Pedido</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {contaDetalhe?.numero_conta && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Número da Conta</div>
                <div className="font-medium">{contaDetalhe.numero_conta}</div>
              </div>
            )}
            {contaDetalhe?.tipo && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Tipo</div>
                <div className="font-medium">{contaDetalhe.tipo}</div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </div>
              <div className="font-medium">{clienteNome}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Nº Pedido
              </div>
              <div className="font-medium">
                {contaDetalhe?.relacionamentos?.pedido_numero ?? pedido!.numero_pedido}
              </div>
            </div>
            {descricaoConta && (
              <div className="space-y-1 md:col-span-2">
                <div className="text-sm text-muted-foreground">Descrição (parcelas quitadas)</div>
                <div className="font-medium">{descricaoConta}</div>
              </div>
            )}
            {contasDoPedido.length <= 1 && formasParaExibir.length === 0 && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Forma de Pagamento</div>
                <div className="font-medium">{formaDisplay}</div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Status financeiro</div>
              <div className="font-medium">{statusExibicao}</div>
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
              <div className="text-sm text-muted-foreground">Fornecedor</div>
              <div className="font-medium">
                {contaDetalhe?.relacionamentos?.fornecedor_nome?.trim() || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Roça</div>
              <div className="font-medium">
                {contaDetalhe?.relacionamentos?.roca_nome?.trim() || 'N/A'}
              </div>
            </div>
            {contaDetalhe?.relacionamentos?.nome_produto && (
              <div className="space-y-1 md:col-span-2">
                <div className="text-sm text-muted-foreground">Produtos</div>
                <div className="font-medium">{contaDetalhe.relacionamentos.nome_produto}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-xl font-bold text-primary">{formatCurrency(valorTotal)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Pago</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(valorPago)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor em Aberto</div>
              <div className="text-xl font-bold text-amber-600">{formatCurrency(valorEmAberto)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Data de criação</div>
              <div className="font-medium">
                {dataCriacao ? formatarDataBR(dataCriacao) : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Vencimento</div>
              <div className="font-medium">
                {dataVencimento ? formatarDataBR(dataVencimento) : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Data de pagamento</div>
              <div className="font-medium">
                {dataPagamento ? formatarDataBR(dataPagamento) : 'N/A'}
              </div>
            </div>
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
                <TableHead>Banco / Conta</TableHead>
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
                        <TableCell>{getBancoLabel(item)}</TableCell>
                      </TableRow>,
                    ];
                    if (item.forma_pagamento === 'CHEQUE' && item.cheque) {
                      const c = item.cheque;
                      const temAlgum = c.banco || c.numero_cheque || c.agencia || c.conta || c.titular;
                      if (temAlgum) {
                        rows.push(
                          <TableRow key={`${item.id}-cheque`} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={4} className="py-3 align-top">
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
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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

export default ContasAReceberPedidoDetalhes;
