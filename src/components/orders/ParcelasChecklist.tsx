import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { Parcela } from '@/hooks/useParcelasPedido';
import { formatCurrency, normalizarStatusParcela, parseDateOnlyLocal } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Calendar, CheckCircle2, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { DarBaixaParcelaDialog, ParcelaParaBaixa } from './DarBaixaParcelaDialog';
import { HistoricoPagamentosParcela } from './HistoricoPagamentosParcela';

interface ParcelasChecklistProps {
  parcelas: Parcela[];
  onMarcarPaga: (parcelaId: number, dataPagamento?: string, observacoes?: string) => Promise<void>;
  onDesmarcarPaga: (parcelaId: number) => Promise<void>;
  onPagamentoRegistrado?: () => void;
  /** Se true, usa o fluxo de POST /pagamentos com forma de pagamento e suporte a cheque */
  usarFluxoPagamentos?: boolean;
  loading?: boolean;
}

export function ParcelasChecklist({
  parcelas,
  onMarcarPaga,
  onDesmarcarPaga,
  onPagamentoRegistrado,
  usarFluxoPagamentos = true,
  loading = false,
}: ParcelasChecklistProps) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogBaixaAberto, setDialogBaixaAberto] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<Parcela | null>(null);
  const [parcelaParaBaixa, setParcelaParaBaixa] = useState<ParcelaParaBaixa | null>(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [processando, setProcessando] = useState(false);

  const formatarData = (data: string) => {
    try {
      const date = new Date(data);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
    }
  };

  const isParcelaTotalmentePaga = (p: Parcela) =>
    p.status === 'PAGA' || (p.valor_restante !== undefined && p.valor_restante <= 0);

  const parcelaParaParcelaParaBaixa = (p: Parcela): ParcelaParaBaixa => {
    const valorRestante =
      p.valor_restante ?? (p.status === 'PAGA' ? 0 : p.valor - (p.valor_pago ?? 0));
    const valorPago = p.valor_pago ?? (p.status === 'PAGA' ? p.valor : 0);
    return {
      id: p.id,
      numero_parcela: p.numero_parcela,
      total_parcelas: p.total_parcelas,
      valor: p.valor,
      valor_pago: valorPago,
      valor_restante: valorRestante,
      status: p.status,
      data_vencimento: p.data_vencimento,
    };
  };

  const handleCheckboxChange = async (parcela: Parcela, checked: boolean) => {
    if (checked) {
      if (usarFluxoPagamentos) {
        setParcelaParaBaixa(parcelaParaParcelaParaBaixa(parcela));
        setDialogBaixaAberto(true);
      } else {
        setParcelaSelecionada(parcela);
        setDataPagamento(new Date().toISOString().split('T')[0]);
        setObservacoes('');
        setDialogAberto(true);
      }
    } else {
      if (window.confirm('Deseja realmente desmarcar esta parcela como paga?')) {
        try {
          setProcessando(true);
          await onDesmarcarPaga(parcela.id);
        } catch (error) {
          alert('Erro ao desmarcar parcela');
        } finally {
          setProcessando(false);
        }
      }
    }
  };

  const handleConfirmarPagamento = async () => {
    if (!parcelaSelecionada) return;

    try {
      setProcessando(true);
      await onMarcarPaga(parcelaSelecionada.id, dataPagamento, observacoes);
      setDialogAberto(false);
      setParcelaSelecionada(null);
      setDataPagamento('');
      setObservacoes('');
    } catch (error) {
      alert('Erro ao marcar parcela como paga');
    } finally {
      setProcessando(false);
    }
  };

  const handlePagamentoRegistrado = () => {
    onPagamentoRegistrado?.();
  };

  const getStatusBadge = (parcela: Parcela) => {
    // Normalizar status para garantir que seja válido (remover PENDENTE se existir)
    const statusNormalizado = normalizarStatusParcela(parcela.status);
    
    if (isParcelaTotalmentePaga(parcela)) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Paga
        </Badge>
      );
    }
    if (statusNormalizado === 'PARCIALMENTE_PAGA') {
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
          Parcialmente paga
        </Badge>
      );
    }
    if (statusNormalizado === 'EM_COMPENSACAO') {
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
          Em compensação
        </Badge>
      );
    }

    // Verificar se está vencida
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = parseDateOnlyLocal(parcela.data_vencimento);
    if (!vencimento) {
      return (
        <Badge variant="secondary">
          <Calendar className="w-3 h-3 mr-1" />
          Aberta
        </Badge>
      );
    }
    vencimento.setHours(0, 0, 0, 0);

    if (vencimento < hoje) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Vencida
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Calendar className="w-3 h-3 mr-1" />
        Aberta
      </Badge>
    );
  };

  return (
    <>
      <div className="space-y-2">
        {parcelas.map((parcela) => (
          <div
            key={parcela.id}
            className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
              isParcelaTotalmentePaga(parcela)
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : 'bg-card border-border'
            }`}
          >
            <Checkbox
              checked={isParcelaTotalmentePaga(parcela)}
              onCheckedChange={(checked) =>
                handleCheckboxChange(parcela, checked === true)
              }
              disabled={loading || processando}
              className="mt-1"
            />

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">
                  Parcela {parcela.numero_parcela}/{parcela.total_parcelas}
                </span>
                {getStatusBadge(parcela)}
                {usarFluxoPagamentos && !isParcelaTotalmentePaga(parcela) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setParcelaParaBaixa(parcelaParaParcelaParaBaixa(parcela));
                      setDialogBaixaAberto(true);
                    }}
                    disabled={loading || processando}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Dar baixa
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  <strong>Valor:</strong> {formatCurrency(parcela.valor)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <strong>Vencimento:</strong> {formatarData(parcela.data_vencimento)}
                </span>
                {isParcelaTotalmentePaga(parcela) && parcela.data_pagamento && (
                  <span className="text-green-600 dark:text-green-400">
                    <strong>Paga em:</strong> {formatarData(parcela.data_pagamento)}
                  </span>
                )}
              </div>

              {parcela.observacoes && (
                <p className="text-xs text-muted-foreground mt-1">
                  {parcela.observacoes}
                </p>
              )}

              {usarFluxoPagamentos && (
                <div className="mt-2">
                  <HistoricoPagamentosParcela
                    parcelaId={parcela.id}
                    parcelaLabel={`${parcela.numero_parcela}/${parcela.total_parcelas}`}
                    onEstornoSucesso={onPagamentoRegistrado}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog de Confirmação de Pagamento */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento da Parcela</DialogTitle>
            <DialogDescription>
              Preencha as informações do pagamento
            </DialogDescription>
          </DialogHeader>

          {parcelaSelecionada && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Parcela</Label>
                <p className="text-sm font-medium">
                  {parcelaSelecionada.numero_parcela}/{parcelaSelecionada.total_parcelas}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <p className="text-sm font-medium">
                  {formatCurrency(parcelaSelecionada.valor)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Vencimento</Label>
                <p className="text-sm font-medium">
                  {formatarData(parcelaSelecionada.data_vencimento)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-pagamento">Data de Pagamento</Label>
                <Input
                  id="data-pagamento"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Pagamento via PIX, referência..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogAberto(false);
                setParcelaSelecionada(null);
                setDataPagamento('');
                setObservacoes('');
              }}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarPagamento}
              disabled={processando}
            >
              {processando ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DarBaixaParcelaDialog
        open={dialogBaixaAberto}
        onOpenChange={setDialogBaixaAberto}
        parcela={parcelaParaBaixa}
        onSuccess={handlePagamentoRegistrado}
      />
    </>
  );
}
