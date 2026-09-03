import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { pedidosService } from '@/services/pedidos.service';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Loader2, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HistoricoPagamentosPedido } from './HistoricoPagamentosPedido';

interface PedidoFinanceiroResumoProps {
  pedidoId: number | null;
}

export function PedidoFinanceiroResumo({ pedidoId }: PedidoFinanceiroResumoProps) {
  const navigate = useNavigate();

  const { data: resumo, isLoading: loadingResumo, error: errorResumo } = useQuery({
    queryKey: ['pedidos', pedidoId, 'resumo-financeiro'],
    queryFn: () => pedidosService.getResumoFinanceiro(pedidoId!),
    enabled: !!pedidoId,
    retry: false,
  });

  const { data: financeiroLegado, isLoading: loadingLegado } = useQuery({
    queryKey: ['pedidos', pedidoId, 'financeiro'],
    queryFn: () => pedidosService.buscarPorIdComFinanceiro(pedidoId!),
    enabled: !!pedidoId && !!errorResumo,
  });

  const valorEmAberto = resumo?.valor_em_aberto ?? financeiroLegado?.resumo_financeiro?.valor_em_aberto ?? 0;
  const valorPago = resumo?.valor_pago ?? financeiroLegado?.resumo_financeiro?.valor_pago ?? 0;
  const valorTotal = resumo?.valor_total ?? financeiroLegado?.resumo_financeiro?.valor_total ?? financeiroLegado?.pedido?.valor_total ?? 0;
  const isLoading = loadingResumo || (!!errorResumo && loadingLegado);
  const semDados = !resumo && !financeiroLegado;

  if (!pedidoId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (semDados) {
    return null;
  }
  const estaQuitado = valorEmAberto <= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            <CardTitle>Resumo Financeiro</CardTitle>
            {estaQuitado ? (
              <Badge className="bg-green-600 hover:bg-green-700">Quitado</Badge>
            ) : (
              <Badge variant="secondary">Em aberto</Badge>
            )}
          </div>
          {!estaQuitado && (
            <Button
              size="sm"
              onClick={() => navigate(`/financeiro/contas-receber/${pedidoId}/pagamentos`)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Registrar Pagamento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Valor Total</p>
            <p className="font-semibold">{formatCurrency(valorTotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Valor Pago</p>
            <p className="font-semibold text-green-600">{formatCurrency(valorPago)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Valor em Aberto</p>
            <p className="font-semibold text-amber-600">{formatCurrency(valorEmAberto)}</p>
          </div>
        </div>
        <HistoricoPagamentosPedido pedidoId={pedidoId} />
      </CardContent>
    </Card>
  );
}
