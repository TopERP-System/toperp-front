import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { ChequeDto, FormaPagamento, pagamentosService } from '@/services/pagamentos.service';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'CHEQUE', label: 'Cheque' },
];

const chequesEmpty: ChequeDto = {
  titular: '',
  cpf_cnpj_titular: '',
  banco: '',
  agencia: '',
  conta: '',
  numero_cheque: '',
  valor: 0,
  data_vencimento: '',
};

export interface ParcelaParaBaixa {
  id: number;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  valor_pago?: number;
  valor_restante?: number;
  status: string;
  data_vencimento: string;
}

interface DarBaixaParcelaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: ParcelaParaBaixa | null;
  onSuccess: () => void;
}

export function DarBaixaParcelaDialog({
  open,
  onOpenChange,
  parcela,
  onSuccess,
}: DarBaixaParcelaDialogProps) {
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [valorPago, setValorPago] = useState(0);
  const [dataLancamento, setDataLancamento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [observacoes, setObservacoes] = useState('');
  const [cheques, setCheques] = useState<ChequeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const valorRestante = parcela
    ? (parcela.valor_restante ?? parcela.valor - (parcela.valor_pago ?? 0))
    : 0;

  useEffect(() => {
    if (open && parcela) {
      setValorPago(valorRestante);
    }
  }, [open, parcela, valorRestante]);

  const somaCheques = cheques.reduce((s, c) => s + (c.valor || 0), 0);
  const chequesValidos = formaPagamento === 'CHEQUE' ? somaCheques === valorPago && cheques.length > 0 : true;

  const resetForm = () => {
    setFormaPagamento('PIX');
    setValorPago(parcela ? valorRestante : 0);
    setDataLancamento(new Date().toISOString().split('T')[0]);
    setObservacoes('');
    setCheques([]);
    setErro('');
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetForm();
    onOpenChange(o);
  };

  const adicionarCheque = () => {
    setCheques([...cheques, { ...chequesEmpty }]);
  };

  const removerCheque = (idx: number) => {
    setCheques(cheques.filter((_, i) => i !== idx));
  };

  const atualizarCheque = (idx: number, campo: keyof ChequeDto, valor: string | number) => {
    const novos = [...cheques];
    novos[idx] = { ...novos[idx], [campo]: valor };
    setCheques(novos);
  };

  const handleSubmit = async () => {
    if (!parcela) return;
    setErro('');

    if (!valorPago || valorPago <= 0) {
      setErro('Informe o valor pago');
      return;
    }
    if (valorPago > valorRestante) {
      setErro('Valor pago não pode ser maior que o valor restante');
      return;
    }
    if (formaPagamento === 'CHEQUE') {
      if (cheques.length === 0) {
        setErro('Adicione pelo menos um cheque');
        return;
      }
      if (Math.abs(somaCheques - valorPago) > 0.01) {
        setErro(`Soma dos cheques (${formatCurrency(somaCheques)}) deve ser igual ao valor pago (${formatCurrency(valorPago)})`);
        return;
      }
      const chequesIncompletos = cheques.some(
        (c) =>
          !c.titular?.trim() ||
          !c.cpf_cnpj_titular?.trim() ||
          !c.banco?.trim() ||
          !c.agencia?.trim() ||
          !c.conta?.trim() ||
          !c.numero_cheque?.trim() ||
          !c.valor ||
          !c.data_vencimento
      );
      if (chequesIncompletos) {
        setErro('Preencha todos os campos dos cheques');
        return;
      }
    }

    setLoading(true);
    try {
      await pagamentosService.criar({
        parcela_id: parcela.id,
        forma_pagamento: formaPagamento,
        valor_pago: Math.round(valorPago * 100) / 100,
        data_lancamento: dataLancamento,
        observacoes: observacoes || undefined,
        cheques: formaPagamento === 'CHEQUE' ? cheques : undefined,
      });
      onSuccess();
      handleOpenChange(false);
    } catch (error: any) {
      setErro(error?.response?.data?.message || error?.message || 'Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (!parcela) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dar Baixa na Parcela</DialogTitle>
          <DialogDescription>
            Parcela {parcela.numero_parcela}/{parcela.total_parcelas} — Valor restante:{' '}
            {formatCurrency(valorRestante)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Forma de Pagamento *</Label>
            <Select
              value={formaPagamento}
              onValueChange={(v) => {
                setFormaPagamento(v as FormaPagamento);
                if (v !== 'CHEQUE') setCheques([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
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

          <div>
            <Label>Valor Pago *</Label>
            <Input
              type="number"
              step="0.01"
              value={valorPago || ''}
              onChange={(e) => setValorPago(Number(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label>Data do Lançamento *</Label>
            <Input
              type="date"
              value={dataLancamento}
              onChange={(e) => setDataLancamento(e.target.value)}
            />
          </div>

          {formaPagamento === 'CHEQUE' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cheques</Label>
                <Button type="button" variant="outline" size="sm" onClick={adicionarCheque}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              {cheques.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Adicione pelo menos um cheque. A soma dos valores deve ser igual ao valor pago.
                </p>
              ) : (
                <div className="space-y-4 border rounded-lg p-3">
                  {cheques.map((c, idx) => (
                    <div key={idx} className="space-y-2 border-b pb-3 last:border-0">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Cheque {idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerCheque(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Titular</Label>
                          <Input
                            value={c.titular}
                            onChange={(e) => atualizarCheque(idx, 'titular', e.target.value)}
                            placeholder="Nome do titular"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">CPF/CNPJ</Label>
                          <Input
                            value={c.cpf_cnpj_titular}
                            onChange={(e) =>
                              atualizarCheque(idx, 'cpf_cnpj_titular', e.target.value)
                            }
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Banco</Label>
                          <Input
                            value={c.banco}
                            onChange={(e) => atualizarCheque(idx, 'banco', e.target.value)}
                            placeholder="Nome do banco"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Agência</Label>
                          <Input
                            value={c.agencia}
                            onChange={(e) => atualizarCheque(idx, 'agencia', e.target.value)}
                            placeholder="1234-5"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Conta</Label>
                          <Input
                            value={c.conta}
                            onChange={(e) => atualizarCheque(idx, 'conta', e.target.value)}
                            placeholder="12345-6"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Nº Cheque</Label>
                          <Input
                            value={c.numero_cheque}
                            onChange={(e) =>
                              atualizarCheque(idx, 'numero_cheque', e.target.value)
                            }
                            placeholder="000123456"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Valor</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={c.valor || ''}
                            onChange={(e) =>
                              atualizarCheque(idx, 'valor', Number(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Vencimento</Label>
                          <Input
                            type="date"
                            value={c.data_vencimento}
                            onChange={(e) =>
                              atualizarCheque(idx, 'data_vencimento', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Soma dos cheques: {formatCurrency(somaCheques)}
                    {formaPagamento === 'CHEQUE' && valorPago > 0 && (
                      <span
                        className={
                          Math.abs(somaCheques - valorPago) < 0.01
                            ? ' text-green-600'
                            : ' text-destructive'
                        }
                      >
                        {' '}
                        ({Math.abs(somaCheques - valorPago) < 0.01 ? 'OK' : 'Deve ser ' + formatCurrency(valorPago)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
              rows={2}
            />
          </div>

          {erro && (
            <p className="text-sm text-destructive">{erro}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !chequesValidos}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Registrar Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
