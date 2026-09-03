import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { formatCurrency, normalizeCurrency, normalizeQuantity } from '@/lib/utils';
import { cleanDocument, formatCNPJ, formatCPF } from '@/lib/validators';
import { nomeRocaPedido, Pedido, pedidoVinculadoRoca } from '@/types/pedido';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Building2,
    Calendar,
    DollarSign,
    Download,
    Edit,
    FileText,
    Info,
    Loader2,
    Package,
    Printer,
    ShoppingCart,
    Sprout,
    Truck,
    User,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { AlterarCondicaoPagamento } from './AlterarCondicaoPagamento';
import { AtualizarDataVencimento } from './AtualizarDataVencimento';
import { PedidoNotaFiscalSection } from './PedidoNotaFiscalSection';
import { PedidoFinanceiroResumo } from './PedidoFinanceiroResumo';
import { StatusBadge } from './StatusBadge';
import { TypeBadge } from './TypeBadge';

interface OrderViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Pedido | null;
  /** Ao clicar em "Cancelar pedido", fecha o dialog e abre o fluxo de confirmação de cancelamento. */
  onRequestCancel?: (order: Pedido) => void;
  onDownloadReport?: (order: Pedido) => void;
  onPrintReport?: (order: Pedido) => void;
  reportingOrderId?: number | null;
}

export function OrderViewDialog({
  isOpen,
  onClose,
  order,
  onRequestCancel,
  onDownloadReport,
  onPrintReport,
  reportingOrderId = null,
}: OrderViewDialogProps) {
  const [dialogDataVencimentoAberto, setDialogDataVencimentoAberto] = useState(false);
  const [dialogCondicaoAberto, setDialogCondicaoAberto] = useState(false);

  if (!order) return null;

  const vinculadoRoca = pedidoVinculadoRoca(order);
  const nomeClienteExibicao =
    order.cliente?.nome?.trim() ||
    order.cliente?.nome_fantasia?.trim() ||
    order.cliente?.nome_razao?.trim() ||
    (order.cliente_id ? `Cliente #${order.cliente_id}` : '');
  const nomeFornecedorExibicao =
    order.fornecedor?.nome_fantasia?.trim() ||
    order.fornecedor?.nome_razao?.trim() ||
    (order.fornecedor_id ? `Fornecedor #${order.fornecedor_id}` : '');
  const temParceiroVenda =
    order.tipo === 'VENDA' &&
    (!!order.cliente ||
      (!!order.cliente_id && Number(order.cliente_id) > 0) ||
      !!nomeClienteExibicao);
  const temParceiroCompra =
    order.tipo === 'COMPRA' &&
    (!!order.fornecedor ||
      (!!order.fornecedor_id && Number(order.fornecedor_id) > 0) ||
      !!nomeFornecedorExibicao);
  // Roça complementar — não substitui cliente/fornecedor quando o pedido tem vínculo
  const tituloParceiro = temParceiroVenda
    ? 'Cliente'
    : temParceiroCompra
      ? 'Fornecedor'
      : vinculadoRoca
        ? 'Roça'
        : order.tipo === 'VENDA'
          ? 'Cliente'
          : 'Fornecedor';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--';
    try {
      // Se a data vem no formato YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS
      // Extrair apenas a parte da data para evitar problemas de timezone
      const dateOnly = dateString.split('T')[0].split(' ')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      
      // Criar data local (sem conversão de timezone)
      const localDate = new Date(year, month - 1, day);
      return format(localDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '--';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '--';
    try {
      // Para timestamps com hora, manter a hora mas tratar a data localmente
      // Formato esperado: YYYY-MM-DD HH:MM:SS ou YYYY-MM-DDTHH:MM:SS
      const datePart = dateString.split('T')[0].split(' ')[0];
      const timePart = dateString.includes('T') 
        ? dateString.split('T')[1].split('.')[0] 
        : dateString.split(' ')[1]?.split('.')[0] || '00:00:00';
      
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Criar data local com hora (sem conversão de timezone)
      const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0);
      return format(localDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return '--';
    }
  };

  const getFormaPagamentoLabel = (forma?: string) => {
    const formas: Record<string, string> = {
      DINHEIRO: 'Dinheiro',
      PIX: 'PIX',
      CARTAO_CREDITO: 'Cartão de Crédito',
      CARTAO_DEBITO: 'Cartão de Débito',
      BOLETO: 'Boleto',
      TRANSFERENCIA: 'Transferência',
      CHEQUE: 'Cheque',
    };
    return forma ? formas[forma] || forma : '--';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Pedido {order.numero_pedido}
          </DialogTitle>
          <DialogDescription>
            Visualização detalhada do pedido
          </DialogDescription>
        </DialogHeader>

        {(onDownloadReport || onPrintReport) && (
          <div className="flex flex-wrap gap-2 -mt-1">
            {onDownloadReport && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={reportingOrderId === order.id}
                onClick={() => onDownloadReport(order)}
              >
                {reportingOrderId === order.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Baixar PDF
              </Button>
            )}
            {onPrintReport && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={reportingOrderId === order.id}
                onClick={() => onPrintReport(order)}
              >
                {reportingOrderId === order.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimir
              </Button>
            )}
          </div>
        )}

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Informações Básicas</h3>
                <p className="text-sm text-muted-foreground">
                  Dados principais do pedido
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Número do Pedido</Label>
                <div className="text-sm font-medium">{order.numero_pedido}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tipo</Label>
                <div>
                  <TypeBadge tipo={order.tipo} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Data do Pedido</Label>
                <div className="text-sm">{formatDate(order.data_pedido)}</div>
              </div>
            </div>
          </div>

          {/* Cliente / Fornecedor / Roça */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                tituloParceiro === 'Roça'
                  ? 'bg-emerald-100 dark:bg-emerald-900/20'
                  : order.tipo === 'VENDA'
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : 'bg-blue-100 dark:bg-blue-900/20'
              }`}>
                {tituloParceiro === 'Roça' ? (
                  <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : order.tipo === 'VENDA' ? (
                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{tituloParceiro}</h3>
                <p className="text-sm text-muted-foreground">
                  {tituloParceiro === 'Roça'
                    ? 'Pedido vinculado à roça'
                    : `Informações do ${tituloParceiro === 'Cliente' ? 'cliente' : 'fornecedor'}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {temParceiroVenda ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nome</Label>
                    <div className="text-sm font-medium">
                      {nomeClienteExibicao || '—'}
                    </div>
                  </div>
                  {order.cliente?.cpf_cnpj && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">CPF/CNPJ</Label>
                      <div className="text-sm">
                        {(() => {
                          const cleaned = cleanDocument(order.cliente.cpf_cnpj);
                          return cleaned.length === 11 ? formatCPF(cleaned) : formatCNPJ(cleaned);
                        })()}
                      </div>
                    </div>
                  )}
                  {order.cliente?.email && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">E-mail</Label>
                      <div className="text-sm">{order.cliente.email}</div>
                    </div>
                  )}
                  {order.cliente?.telefone && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Telefone</Label>
                      <div className="text-sm">{order.cliente.telefone}</div>
                    </div>
                  )}
                  {vinculadoRoca && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Roça</Label>
                      <div className="text-sm font-medium">
                        {nomeRocaPedido(order) || '—'}
                      </div>
                    </div>
                  )}
                </>
              ) : temParceiroCompra ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nome Fantasia</Label>
                    <div className="text-sm font-medium">
                      {nomeFornecedorExibicao || '--'}
                    </div>
                  </div>
                  {order.fornecedor?.nome_razao &&
                    order.fornecedor.nome_razao !== order.fornecedor.nome_fantasia && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Razão Social</Label>
                      <div className="text-sm">{order.fornecedor.nome_razao}</div>
                    </div>
                  )}
                  {order.fornecedor?.cpf_cnpj && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">CPF/CNPJ</Label>
                      <div className="text-sm">
                        {(() => {
                          const cleaned = cleanDocument(order.fornecedor.cpf_cnpj);
                          return cleaned.length === 11 ? formatCPF(cleaned) : formatCNPJ(cleaned);
                        })()}
                      </div>
                    </div>
                  )}
                  {order.fornecedor?.email && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">E-mail</Label>
                      <div className="text-sm">{order.fornecedor.email}</div>
                    </div>
                  )}
                  {order.fornecedor?.telefone && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Telefone</Label>
                      <div className="text-sm">{order.fornecedor.telefone}</div>
                    </div>
                  )}
                  {vinculadoRoca && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Roça</Label>
                      <div className="text-sm font-medium">
                        {nomeRocaPedido(order) || '—'}
                      </div>
                    </div>
                  )}
                </>
              ) : vinculadoRoca ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nome</Label>
                  <div className="text-sm font-medium">{nomeRocaPedido(order) || '—'}</div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">--</div>
              )}
            </div>
          </div>

          {/* Transportadora */}
          {order.transportadora && (
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Transportadora</h3>
                  <p className="text-sm text-muted-foreground">
                    Informações de entrega
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nome</Label>
                  <div className="text-sm font-medium">{order.transportadora.nome}</div>
                </div>
                {order.transportadora.cnpj && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">CNPJ</Label>
                    <div className="text-sm">
                      {formatCNPJ(cleanDocument(order.transportadora.cnpj))}
                    </div>
                  </div>
                )}
                {order.prazo_entrega_dias && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Prazo de Entrega</Label>
                    <div className="text-sm">{order.prazo_entrega_dias} dias</div>
                  </div>
                )}
                {order.data_entrega_prevista && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Data Prevista</Label>
                    <div className="text-sm">{formatDate(order.data_entrega_prevista)}</div>
                  </div>
                )}
                {order.data_entrega_realizada && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Data de Entrega</Label>
                    <div className="text-sm">{formatDate(order.data_entrega_realizada)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagamento */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Pagamento</h3>
                <p className="text-sm text-muted-foreground">
                  Informações de pagamento
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.formas_pagamento && order.formas_pagamento.length > 0 ? (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-muted-foreground">Formas de Pagamento</Label>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Forma</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.formas_pagamento.map((fp, idx) => (
                          <TableRow key={`${fp.forma_pagamento}-${idx}`}>
                            <TableCell>
                              {getFormaPagamentoLabel(fp.forma_pagamento)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {fp.data_vencimento
                                ? formatDate(fp.data_vencimento)
                                : order.data_vencimento_base
                                  ? formatDate(order.data_vencimento_base)
                                  : '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(fp.valor || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={2} className="font-semibold">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(
                              order.formas_pagamento.reduce(
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
              ) : order.forma_pagamento ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Forma de Pagamento</Label>
                  <div className="text-sm">{getFormaPagamentoLabel(order.forma_pagamento)}</div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Condição de Pagamento</Label>
                <div className="text-sm">{order.condicao_pagamento || '—'}</div>
              </div>
              {(order.data_vencimento_base || (order as any).data_vencimento) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Data de Vencimento Base</Label>
                    {order.status !== 'CANCELADO' && order.status !== 'QUITADO' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDialogDataVencimentoAberto(true)}
                        className="h-7 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Atualizar
                      </Button>
                    )}
                  </div>
                  <div className="text-sm">
                    {formatDate(order.data_vencimento_base || (order as any).data_vencimento)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Itens do Pedido</h3>
                <p className="text-sm text-muted-foreground">
                  Produtos e serviços incluídos
                </p>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Preço de Compra</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.itens && order.itens.length > 0 ? (
                    order.itens.map((item, index) => {
                      // Normalizar valores monetários recebidos do backend
                      const quantidade = normalizeQuantity(item.quantidade);
                      const precoUnitario = normalizeCurrency(item.preco_unitario, false);
                      const desconto = item.desconto ? normalizeCurrency(item.desconto, false) : 0;
                      const subtotal = Math.max(0, quantidade * precoUnitario - desconto);
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {item.produto?.nome || `Produto #${item.produto_id}`}
                              </div>
                              {item.produto?.sku && (
                                <div className="text-xs text-muted-foreground">
                                  SKU: {item.produto.sku}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {quantidade}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(precoUnitario)}
                          </TableCell>
                          <TableCell className="text-right">
                            {desconto > 0 ? formatCurrency(desconto) : '--'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(subtotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Resumo Financeiro</h3>
                <p className="text-sm text-muted-foreground">
                  Valores e totais do pedido
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Subtotal</Label>
                <div className="font-medium">{formatCurrency(normalizeCurrency(order.subtotal, false))}</div>
              </div>
              {order.desconto_valor > 0 && (
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">
                    Desconto {order.desconto_percentual > 0 && `(${order.desconto_percentual.toFixed(2)}%)`}
                  </Label>
                  <div className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(normalizeCurrency(order.desconto_valor, false))}
                  </div>
                </div>
              )}
              {order.frete > 0 && (
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Frete</Label>
                  <div className="font-medium">{formatCurrency(normalizeCurrency(order.frete, false))}</div>
                </div>
              )}
              {order.outras_taxas > 0 && (
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Outras Taxas</Label>
                  <div className="font-medium">{formatCurrency(normalizeCurrency(order.outras_taxas, false))}</div>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <Label className="text-lg font-semibold">Total</Label>
                <div className="text-lg font-bold">{formatCurrency(normalizeCurrency(order.valor_total, false))}</div>
              </div>
            </div>
          </div>

          {/* Nota Fiscal (vendas) */}
          <PedidoNotaFiscalSection
            pedidoId={order.id}
            numeroPedido={order.numero_pedido}
            tipo={order.tipo}
            status={order.status}
            dialogOpen={isOpen}
          />

          {/* Resumo Financeiro do Pedido */}
          <PedidoFinanceiroResumo
            key={`financeiro-${order.id}-${(order as any).updated_at ?? ''}`}
            pedidoId={order.id}
          />

          <AlterarCondicaoPagamento
            pedidoId={order.id}
            condicaoAtual={order.condicao_pagamento}
            dataVencimentoBaseAtual={order.data_vencimento_base ?? (order as any).data_vencimento}
            dataPedido={order.data_pedido}
            open={dialogCondicaoAberto}
            onClose={() => setDialogCondicaoAberto(false)}
          />

          {/* Observações */}
          {(order.observacoes_internas || order.observacoes_cliente) && (
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Observações</h3>
                  <p className="text-sm text-muted-foreground">
                    Informações adicionais
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {order.observacoes_internas && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Observações Internas</Label>
                    <div className="text-sm bg-muted/50 p-3 rounded-md">
                      {order.observacoes_internas}
                    </div>
                  </div>
                )}
                {order.observacoes_cliente && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Observações do Cliente</Label>
                    <div className="text-sm bg-muted/50 p-3 rounded-md">
                      {order.observacoes_cliente}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informações do Sistema */}
          {(order.created_at || order.updated_at) && (
            <div className="bg-muted/30 border rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {order.created_at && (
                  <span>Criado em {formatDateTime(order.created_at)}</span>
                )}
                {order.created_at && order.updated_at && <span>•</span>}
                {order.updated_at && (
                  <span>Atualizado em {formatDateTime(order.updated_at)}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ação: Cancelar pedido (sai das Contas a Receber / Contas a Pagar) */}
        {order.status !== 'CANCELADO' && onRequestCancel && (
          <div className="flex justify-end border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onClose();
                onRequestCancel(order);
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar pedido
            </Button>
          </div>
        )}

        {/* Dialog de Atualização de Data de Vencimento */}
        {order && (
          <AtualizarDataVencimento
            pedidoId={order.id}
            dataVencimentoAtual={order.data_vencimento_base || (order as any).data_vencimento}
            open={dialogDataVencimentoAberto}
            onClose={() => setDialogDataVencimentoAberto(false)}
            onSuccess={() => {
              // O React Query já atualiza automaticamente via invalidateQueries
              setDialogDataVencimentoAberto(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

