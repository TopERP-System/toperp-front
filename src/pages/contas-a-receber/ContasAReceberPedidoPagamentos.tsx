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
import { formatCurrency, formatarFormaPagamento } from '@/lib/utils';
import { financeiroService } from '@/services/financeiro.service';
import { pagamentosService } from '@/services/pagamentos.service';
import { pedidosService } from '@/services/pedidos.service';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, Loader2, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

function abertoConta(c: {
  valor_restante?: number | null;
  valor_em_aberto?: number | null;
  valor_original?: number | null;
  valor_total?: number | null;
  valor_pago?: number | null;
}): number {
  const restante = Number(
    (c as any).valor_restante ??
      (c as any).valor_em_aberto ??
      Math.max(
        0,
        Number((c as any).valor_original ?? (c as any).valor_total ?? 0) -
          Number((c as any).valor_pago ?? 0),
      ),
  );
  return Number.isFinite(restante) ? restante : 0;
}

const ContasAReceberPedidoPagamentos = () => {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = pedidoId ? Number(pedidoId) : 0;

  const [valorPago, setValorPago] = useState<number | ''>('');
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [contaFinanceiraId, setContaFinanceiraId] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [chequeBanco, setChequeBanco] = useState<string>('');
  const [chequeNumero, setChequeNumero] = useState<string>('');
  const [chequeAgencia, setChequeAgencia] = useState<string>('');
  const [chequeConta, setChequeConta] = useState<string>('');
  const [chequeTitular, setChequeTitular] = useState<string>('');

  const [pedidoQuery, resumoQuery, contasQuery] = useQueries({
    queries: [
      { queryKey: ['pedidos', pedidoId], queryFn: () => pedidosService.buscarPorId(id), enabled: !!id },
      { queryKey: ['pedidos', pedidoId, 'resumo-financeiro'], queryFn: () => pedidosService.getResumoFinanceiro(id), enabled: !!id, retry: false },
      {
        queryKey: ['contas-financeiras', 'pedido', pedidoId, 'RECEBER'],
        queryFn: async () => {
          const contas = await financeiroService.buscarPorPedido(id);
          return (contas || []).filter((c) => c.tipo === 'RECEBER' || !c.tipo);
        },
        enabled: !!id,
        retry: false,
      },
    ],
  });

  const pedido = pedidoQuery.data;
  const resumo = resumoQuery.data;
  const resumoErro = resumoQuery.isError;
  const contasDoPedido = contasQuery.data ?? [];

  const legadoQuery = useQueries({
    queries: [
      {
        queryKey: ['pedidos', pedidoId, 'financeiro-legado'],
        queryFn: () => pedidosService.buscarPorIdComFinanceiro(id),
        enabled: !!id && !!resumoErro,
      },
    ],
  });
  const legado = legadoQuery[0]?.data as any;

  const valorEmAberto = resumo?.valor_em_aberto ?? legado?.resumo_financeiro?.valor_em_aberto ?? 0;
  const valorTotal = resumo?.valor_total ?? legado?.resumo_financeiro?.valor_total ?? 0;
  const valorPagoAtual = resumo?.valor_pago ?? legado?.resumo_financeiro?.valor_pago ?? 0;
  const status = resumo?.status ?? legado?.resumo_financeiro?.status;
  const estaQuitado = status === 'QUITADO' || valorEmAberto <= 0;
  const numeroPedido = pedido?.numero_pedido ?? legado?.pedido?.numero_pedido ?? `#${id}`;
  const clienteNome = pedido?.cliente?.nome ?? legado?.pedido?.cliente?.nome ?? legado?.pedido?.cliente_id ?? '—';

  const ehPagamentoAdiantamento = !!(resumo as any)?.eh_pagamento_adiantamento;
  const valorAdiantadoResumo = (resumo as any)?.valor_adiantado ?? null;
  const mensagemAdiantamento = (resumo as any)?.mensagem_adiantamento ?? null;

  const contasAbertas = useMemo(
    () => contasDoPedido.filter((c) => abertoConta(c) > 0.009),
    [contasDoPedido],
  );

  const formasDoPedido = useMemo(() => {
    const doPlano = (pedido?.formas_pagamento ?? [])
      .map((fp) => String(fp.forma_pagamento || ''))
      .filter(Boolean);
    const dasContas = contasAbertas
      .map((c) => String(c.forma_pagamento || ''))
      .filter(Boolean);
    const unica = pedido?.forma_pagamento ? [String(pedido.forma_pagamento)] : [];
    return Array.from(new Set([...doPlano, ...dasContas, ...unica]));
  }, [pedido, contasAbertas]);

  const formasSelect = useMemo(() => {
    if (formasDoPedido.length === 0) return [...FORMAS_PAGAMENTO];
    const preferidas = FORMAS_PAGAMENTO.filter((f) => formasDoPedido.includes(f.value));
    const extras = FORMAS_PAGAMENTO.filter((f) => !formasDoPedido.includes(f.value));
    return [...preferidas, ...extras];
  }, [formasDoPedido]);

  const autoFilledValorRef = useRef(false);
  const autoFilledFormaRef = useRef(false);

  useEffect(() => {
    if (autoFilledValorRef.current) return;
    if (valorEmAberto > 0 && valorPago === '') {
      if (ehPagamentoAdiantamento && valorAdiantadoResumo != null && Number(valorAdiantadoResumo) > 0) {
        setValorPago(Number(valorAdiantadoResumo));
      } else if (contasAbertas.length === 1) {
        setValorPago(Number(abertoConta(contasAbertas[0]).toFixed(2)));
      } else {
        setValorPago(valorEmAberto);
      }
      autoFilledValorRef.current = true;
    }
  }, [valorEmAberto, valorPago, ehPagamentoAdiantamento, valorAdiantadoResumo, contasAbertas]);

  useEffect(() => {
    if (autoFilledFormaRef.current) return;
    if (formaPagamento) {
      autoFilledFormaRef.current = true;
      return;
    }
    if (contasAbertas.length >= 1) {
      const primeira = contasAbertas[0];
      if (primeira.forma_pagamento) {
        setFormaPagamento(String(primeira.forma_pagamento));
      }
      setContaFinanceiraId(String(primeira.id));
      if (contasAbertas.length > 1) {
        setValorPago(Number(abertoConta(primeira).toFixed(2)));
        autoFilledValorRef.current = true;
      }
      autoFilledFormaRef.current = true;
      return;
    }
    const formaPedido =
      pedido?.formas_pagamento?.[0]?.forma_pagamento ||
      pedido?.forma_pagamento ||
      '';
    if (formaPedido) {
      setFormaPagamento(String(formaPedido));
      autoFilledFormaRef.current = true;
    }
  }, [contasAbertas, pedido, formaPagamento]);

  const selecionarConta = (contaIdStr: string) => {
    setContaFinanceiraId(contaIdStr);
    const conta = contasAbertas.find((c) => String(c.id) === contaIdStr);
    if (!conta) return;
    if (conta.forma_pagamento) {
      setFormaPagamento(String(conta.forma_pagamento));
    }
    setValorPago(Number(abertoConta(conta).toFixed(2)));
  };

  const registrarMutation = useMutation({
    mutationFn: async () => {
      if (!pedidoId || !id) throw new Error('ID do pedido não encontrado');
      const valor = Number(valorPago);
      if (!valor || valor <= 0) throw new Error('Informe o valor pago');
      if (!formaPagamento) throw new Error('Selecione a forma de pagamento');
      if (valor > valorEmAberto) throw new Error('Valor não pode ser maior que o valor em aberto');
      return pedidosService.registrarPagamentoPedido(id, {
        valor,
        forma_pagamento: formaPagamento,
        data_pagamento: dataPagamento,
        ...(contaFinanceiraId ? { conta_financeira_id: Number(contaFinanceiraId) } : {}),
        ...(observacoes?.trim() ? { observacoes: observacoes.trim() } : {}),
        ...(ehPagamentoAdiantamento ? { tipo_lancamento: 'ADIANTAMENTO' } : {}),
        ...(formaPagamento === 'CHEQUE' ? {
          cheque: {
            ...(chequeBanco?.trim() && { banco: chequeBanco.trim() }),
            ...(chequeNumero?.trim() && { numero_cheque: chequeNumero.trim() }),
            ...(chequeAgencia?.trim() && { agencia: chequeAgencia.trim() }),
            ...(chequeConta?.trim() && { conta: chequeConta.trim() }),
            ...(chequeTitular?.trim() && { titular: chequeTitular.trim() }),
            data_vencimento: dataPagamento,
          },
        } : {}),
      });
    },
    onSuccess: () => {
      toast.success('Pagamento registrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedidos', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', 'contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'unificado'] });
      setTimeout(() => navigate(`/financeiro/contas-receber/${pedidoId}`), 1000);
    },
    onError: (error: any) => {
      if (error?.response?.status === 404 || error?.response?.status === 501) {
        registrarFallback.mutate();
        return;
      }
      toast.error(error?.response?.data?.message || 'Erro ao registrar pagamento');
    },
  });

  const registrarFallback = useMutation({
    mutationFn: async () => {
      if (!pedidoId) throw new Error('ID do pedido não encontrado');
      return pagamentosService.criar({
        pedido_id: id,
        conta_financeira_id: contaFinanceiraId
          ? Number(contaFinanceiraId)
          : legado?.conta_financeira?.id,
        valor_pago: Number(valorPago),
        forma_pagamento: formaPagamento as any,
        data_lancamento: dataPagamento,
        data_pagamento: dataPagamento,
        observacoes: observacoes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Pagamento registrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedidos', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', 'contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] });
      setTimeout(() => navigate(`/financeiro/contas-receber/${pedidoId}`), 1000);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao registrar pagamento');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registrarMutation.mutate();
  };

  const isLoading =
    pedidoQuery.isLoading ||
    contasQuery.isLoading ||
    (resumoQuery.isLoading && !resumoErro) ||
    (resumoErro && legadoQuery[0]?.isLoading);
  const isPending = registrarMutation.isPending || registrarFallback.isPending;
  const semDados = !resumo && !legado;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (semDados) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            Erro ao carregar dados do pedido.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/financeiro/contas-receber/${pedidoId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Registrar Pagamento</h1>
            <p className="text-muted-foreground">Pedido {numeroPedido}</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </div>
              <div className="font-medium">{clienteNome}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Pedido</div>
              <div className="font-medium">{numeroPedido}</div>
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
            Este pedido já está quitado. Não é possível registrar novo pagamento.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-6 space-y-6">
            {ehPagamentoAdiantamento && mensagemAdiantamento && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 rounded-lg p-4 text-sm">
                {mensagemAdiantamento}
              </div>
            )}
            <h2 className="text-lg font-semibold border-b pb-2">Dados do Pagamento</h2>

            {contasAbertas.length > 1 && (
              <div className="space-y-2">
                <Label>Conta / Forma do pedido *</Label>
                <Select value={contaFinanceiraId} onValueChange={selecionarConta} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta a receber" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasAbertas.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.forma_pagamento
                          ? formatarFormaPagamento(c.forma_pagamento)
                          : 'Sem forma'}
                        {' · '}
                        {formatCurrency(abertoConta(c))}
                        {c.numero_conta ? ` (${c.numero_conta})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Formas cadastradas no pedido. Ao escolher, o valor e a forma são preenchidos.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={valorEmAberto}
                value={valorPago === '' ? '' : valorPago}
                onChange={(e) => setValorPago(e.target.value ? Number(e.target.value) : '')}
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
                    {formasSelect.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formaPagamento === 'CHEQUE' && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="text-sm font-semibold">Dados do Cheque (opcional)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input value={chequeBanco} onChange={(e) => setChequeBanco(e.target.value)} placeholder="Ex: Banco do Brasil" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº do Cheque</Label>
                    <Input value={chequeNumero} onChange={(e) => setChequeNumero(e.target.value)} placeholder="Ex: 000123456" />
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input value={chequeAgencia} onChange={(e) => setChequeAgencia(e.target.value)} placeholder="Ex: 1234-5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input value={chequeConta} onChange={(e) => setChequeConta(e.target.value)} placeholder="Ex: 12345-6" />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Titular</Label>
                    <Input value={chequeTitular} onChange={(e) => setChequeTitular(e.target.value)} placeholder="Nome do titular" />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(`/financeiro/contas-receber/${pedidoId}`)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !formaPagamento || !valorPago || Number(valorPago) <= 0}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : <><DollarSign className="w-4 h-4 mr-2" />Registrar Pagamento</>}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default ContasAReceberPedidoPagamentos;
