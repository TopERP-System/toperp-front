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
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, FileText, Loader2, User } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type LinhaHistoricoReceber = {
  key: string;
  data: string;
  valor: number;
  formaLabel: string;
};

const ContasAReceberContaDetalhes = () => {
  const { contaId: contaIdParam } = useParams<{ contaId: string }>();
  const navigate = useNavigate();
  const contaId = contaIdParam ? Number(contaIdParam) : 0;
  const idValido = Number.isFinite(contaId) && contaId > 0;

  const { data: conta, isLoading, error } = useQuery({
    queryKey: ['conta-financeira', contaId, 'detalhe-receber-conta'],
    queryFn: () => financeiroService.buscarDetalhePorId(contaId),
    enabled: idValido,
    retry: false,
  });

  const valorAberto = Number(conta?.valor_em_aberto ?? 0);
  const historicoPagamentos = useMemo((): LinhaHistoricoReceber[] => {
    if (!conta) return [];
    const valorPago = Number(conta.valor_pago ?? 0);
    const dataPagamento = conta.datas?.data_pagamento;
    if (valorPago > 0.009 && dataPagamento) {
      return [
        {
          key: 'conta-saldo',
          data: dataPagamento,
          valor: valorPago,
          formaLabel: conta.pagamento?.forma_pagamento
            ? formatarFormaPagamento(conta.pagamento.forma_pagamento)
            : '—',
        },
      ];
    }
    return [];
  }, [conta]);

  if (!idValido) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            Identificador da conta inválido.
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !conta || String(conta.tipo).toUpperCase() !== 'RECEBER') {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contas-a-receber')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Detalhes da Conta a Receber</h1>
          </div>
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            Conta a receber não encontrada.
          </div>
        </div>
      </AppLayout>
    );
  }

  const numeroConta = conta.numero_conta ?? `CONTA-${conta.id}`;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contas-a-receber')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes da Conta a Receber</h1>
              <p className="text-muted-foreground">{numeroConta}</p>
            </div>
          </div>
          {valorAberto > 0.009 && (
            <Button onClick={() => navigate(`/financeiro/contas-receber/conta/${conta.id}/pagamentos`)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Pagamentos
            </Button>
          )}
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Informações da Conta</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </div>
              <div className="font-medium">{conta.relacionamentos?.cliente_nome ?? '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Nº da conta
              </div>
              <div className="font-medium">{numeroConta}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Forma de Pagamento</div>
              <div className="font-medium">
                {conta.pagamento?.forma_pagamento
                  ? formatarFormaPagamento(conta.pagamento.forma_pagamento)
                  : '—'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Status financeiro</div>
              <div className="font-medium">{conta.status}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-xl font-bold text-primary">{formatCurrency(Number(conta.valor_total_pedido || 0))}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Recebido</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(Number(conta.valor_pago || 0))}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor em Aberto</div>
              <div className="text-xl font-bold text-amber-600">{formatCurrency(valorAberto)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Vencimento</div>
              <div className="font-medium">
                {conta.datas?.data_vencimento
                  ? formatarDataBR(conta.datas.data_vencimento)
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Histórico de Recebimentos</h2>
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
                historicoPagamentos.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell>{formatarDataBR(item.data)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.valor)}</TableCell>
                    <TableCell>{item.formaLabel}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum recebimento registrado
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

export default ContasAReceberContaDetalhes;
