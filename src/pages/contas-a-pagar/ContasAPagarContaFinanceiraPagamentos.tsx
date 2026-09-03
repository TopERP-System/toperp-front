import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { CreateContaFinanceiraDto, financeiroService } from '@/services/financeiro.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, Loader2, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

type PagamentoContaLocationState = { voltarPara?: string };
import { toast } from 'sonner';

const FORMAS_PAGAMENTO = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'CHEQUE', label: 'Cheque' },
] as const;

/**
 * Pagamento de conta a pagar **sem pedido** (ex.: CPAG-…), mesma experiência visual
 * de Contas a Receber / pagamento por pedido (resumo + formulário + parcial).
 */
const ContasAPagarContaFinanceiraPagamentos = () => {
  const { contaId: contaIdParam } = useParams<{ contaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const voltarPara =
    (location.state as PagamentoContaLocationState | null)?.voltarPara ??
    '/contas-a-pagar';
  const queryClient = useQueryClient();
  const contaId = contaIdParam ? Number(contaIdParam) : 0;

  const [valorPago, setValorPago] = useState<number | ''>('');
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [chequeBanco, setChequeBanco] = useState<string>('');
  const [chequeNumero, setChequeNumero] = useState<string>('');
  const [chequeAgencia, setChequeAgencia] = useState<string>('');
  const [chequeConta, setChequeConta] = useState<string>('');
  const [chequeTitular, setChequeTitular] = useState<string>('');

  const { data: detalhe, isLoading } = useQuery({
    queryKey: ['contas-financeiras', contaId, 'detalhe-pagamento'],
    queryFn: () => financeiroService.buscarDetalhePorId(contaId),
    enabled: !!contaId,
    retry: false,
    /** Sempre alinhar ao servidor ao entrar (ex.: valor em aberto mudou após editar a despesa). */
    refetchOnMount: 'always',
  });

  const valorEmAberto = Number(detalhe?.valor_em_aberto ?? 0);
  const valorTotal = Number(detalhe?.valor_total_pedido ?? 0);
  const valorPagoAtual = Number(detalhe?.valor_pago ?? 0);
  const st = String(detalhe?.status_original ?? detalhe?.status ?? '').toUpperCase();
  const estaQuitado =
    st === 'QUITADO' || st === 'PAGO_TOTAL' || valorEmAberto <= 0;
  const numeroConta = detalhe?.numero_conta ?? `CONTA-${contaId}`;
  const fornecedorNome = detalhe?.relacionamentos?.fornecedor_nome ?? '—';

  /** Só deixa de syncar com a API se o usuário alterou o valor manualmente (ex.: parcial). */
  const usuarioEditouValor = useRef(false);
  const autoFilledFormaRef = useRef(false);

  useEffect(() => {
    usuarioEditouValor.current = false;
    autoFilledFormaRef.current = false;
    setValorPago('');
    setFormaPagamento('');
  }, [contaId]);

  useEffect(() => {
    if (usuarioEditouValor.current) return;
    if (valorEmAberto > 0) {
      setValorPago(Number(valorEmAberto.toFixed(2)));
    }
  }, [valorEmAberto]);

  useEffect(() => {
    if (autoFilledFormaRef.current) return;
    const formaConta = detalhe?.pagamento?.forma_pagamento;
    if (formaConta) {
      setFormaPagamento(String(formaConta));
      autoFilledFormaRef.current = true;
    }
  }, [detalhe?.pagamento?.forma_pagamento]);

  const registrarMutation = useMutation({
    mutationFn: async () => {
      if (!contaId || !detalhe) throw new Error('Conta inválida');
      const acrescimo = Number(valorPago);
      if (!acrescimo || acrescimo <= 0) throw new Error('Informe o valor pago');
      if (!formaPagamento) throw new Error('Selecione a forma de pagamento');
      if (acrescimo > valorEmAberto + 0.009) {
        throw new Error('Valor não pode ser maior que o valor em aberto');
      }
      const novoPago = Number((valorPagoAtual + acrescimo).toFixed(2));
      return financeiroService.atualizar(contaId, {
        valor_pago: novoPago,
        forma_pagamento: formaPagamento as CreateContaFinanceiraDto['forma_pagamento'],
        data_pagamento: dataPagamento,
        ...(observacoes?.trim() ? { observacoes: observacoes.trim() } : {}),
      });
    },
    onSuccess: () => {
      toast.success('Pagamento registrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', 'contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['conta-financeira', contaId] });
      queryClient.invalidateQueries({ queryKey: ['centro-custo'] });
      setTimeout(() => navigate(voltarPara), 1000);
    },
    onError: (error: any) => {
      toast.error(error?.message || error?.response?.data?.message || 'Erro ao registrar pagamento');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registrarMutation.mutate();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!detalhe || String(detalhe.tipo).toUpperCase() !== 'PAGAR') {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            Conta a pagar não encontrada ou tipo inválido.
          </div>
        </div>
      </AppLayout>
    );
  }

  const isPending = registrarMutation.isPending;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(voltarPara)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Registrar Pagamento</h1>
            <p className="text-muted-foreground">Conta {numeroConta}</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Fornecedor
              </div>
              <div className="font-medium">{fornecedorNome}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Conta</div>
              <div className="font-medium">{numeroConta}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="font-medium text-primary">{formatCurrency(valorTotal)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Pago</div>
              <div className="font-medium text-green-600">{formatCurrency(valorPagoAtual)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor em Aberto</div>
              <div className="font-medium text-amber-600">{formatCurrency(valorEmAberto)}</div>
            </div>
          </div>
        </div>

        {estaQuitado ? (
          <div className="bg-muted/50 border rounded-lg p-6 text-center text-muted-foreground">
            Esta conta já está quitada. Não é possível registrar novo pagamento.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Dados do Pagamento</h2>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={valorEmAberto}
                value={valorPago === '' ? '' : valorPago}
                onChange={(e) => {
                  usuarioEditouValor.current = true;
                  setValorPago(e.target.value ? Number(e.target.value) : '');
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Valor em aberto: {formatCurrency(valorEmAberto)}. Permite pagamento parcial.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Pagamento</Label>
                <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formaPagamento === 'CHEQUE' && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="text-sm font-semibold">Dados do Cheque (opcional)</h3>
                <p className="text-xs text-muted-foreground">
                  Contas sem pedido: os dados abaixo não geram registro de cheque no sistema; use para sua referência ou
                  prefira pagamentos vinculados a pedido para controle completo.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input
                      value={chequeBanco}
                      onChange={(e) => setChequeBanco(e.target.value)}
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº do Cheque</Label>
                    <Input
                      value={chequeNumero}
                      onChange={(e) => setChequeNumero(e.target.value)}
                      placeholder="Ex: 000123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input
                      value={chequeAgencia}
                      onChange={(e) => setChequeAgencia(e.target.value)}
                      placeholder="Ex: 1234-5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input
                      value={chequeConta}
                      onChange={(e) => setChequeConta(e.target.value)}
                      placeholder="Ex: 12345-6"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Titular</Label>
                    <Input
                      value={chequeTitular}
                      onChange={(e) => setChequeTitular(e.target.value)}
                      placeholder="Nome do titular"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Opcional"
              />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(voltarPara)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !formaPagamento || !valorPago || Number(valorPago) <= 0}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Registrar Pagamento
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default ContasAPagarContaFinanceiraPagamentos;
