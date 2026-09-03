import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAtualizarDataVencimento } from '@/hooks/useAtualizarDataVencimento';
import { Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AtualizarDataVencimentoProps {
  pedidoId: number;
  dataVencimentoAtual?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AtualizarDataVencimento({
  pedidoId,
  dataVencimentoAtual,
  open,
  onClose,
  onSuccess,
}: AtualizarDataVencimentoProps) {
  const [dataSelecionada, setDataSelecionada] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  const atualizarDataVencimento = useAtualizarDataVencimento();

  // Inicializar data quando o dialog abrir
  useEffect(() => {
    if (open) {
      if (dataVencimentoAtual) {
        // Extrair apenas a data (YYYY-MM-DD) para evitar problemas de timezone
        const dataFormatada = dataVencimentoAtual.split('T')[0].split(' ')[0];
        setDataSelecionada(dataFormatada);
      } else {
        setDataSelecionada('');
      }
      setErro(null);
    }
  }, [open, dataVencimentoAtual]);

  const formatarDataBR = (data: string) => {
    try {
      const [year, month, day] = data.split('-');
      return format(new Date(Number(year), Number(month) - 1, Number(day)), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
    }
  };

  const validarFormatoData = (data: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(data);
  };

  const validarDataValida = (data: string): boolean => {
    const dataObj = new Date(data);
    return dataObj instanceof Date && !isNaN(dataObj.getTime());
  };

  const validarDataFutura = (data: string): boolean => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataSelecionadaObj = new Date(data);
    dataSelecionadaObj.setHours(0, 0, 0, 0);
    return dataSelecionadaObj >= hoje;
  };

  const handleSubmit = async () => {
    setErro(null);

    if (!dataSelecionada) {
      setErro('Por favor, selecione uma data de vencimento.');
      return;
    }

    // Validar formato
    if (!validarFormatoData(dataSelecionada)) {
      setErro('Formato de data inválido. Use YYYY-MM-DD.');
      return;
    }

    // Validar se a data é válida
    if (!validarDataValida(dataSelecionada)) {
      setErro('Data inválida. Por favor, selecione uma data válida.');
      return;
    }

    // Validar se não é no passado (opcional, mas recomendado)
    if (!validarDataFutura(dataSelecionada)) {
      const confirmar = window.confirm(
        'A data selecionada é no passado. Deseja continuar mesmo assim?'
      );
      if (!confirmar) {
        return;
      }
    }

    // Confirmar antes de atualizar
    const confirmar = window.confirm(
      `Ao atualizar a data de vencimento para ${formatarDataBR(dataSelecionada)}, todas as parcelas pendentes serão recalculadas automaticamente. Deseja continuar?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await atualizarDataVencimento.mutateAsync({
        pedidoId,
        dataVencimento: dataSelecionada,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      // Erro já é tratado no hook
      console.error('Erro ao atualizar data de vencimento:', error);
    }
  };

  const handleClose = () => {
    setErro(null);
    setDataSelecionada(dataVencimentoAtual?.split('T')[0].split(' ')[0] || '');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Atualizar Data de Vencimento
          </DialogTitle>
          <DialogDescription>
            Atualize a data de vencimento base do pedido. Todas as parcelas pendentes serão recalculadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {dataVencimentoAtual && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Data atual:</strong> {formatarDataBR(dataVencimentoAtual.split('T')[0].split(' ')[0])}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="data-vencimento">Nova Data de Vencimento</Label>
            <Input
              id="data-vencimento"
              type="date"
              value={dataSelecionada}
              onChange={(e) => {
                setDataSelecionada(e.target.value);
                setErro(null);
              }}
              min={new Date().toISOString().split('T')[0]}
              className={erro ? 'border-destructive' : ''}
            />
            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Importante:</strong> Ao atualizar a data de vencimento, todas as parcelas pendentes serão recalculadas automaticamente com base na nova data. Parcelas já pagas não serão alteradas.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={atualizarDataVencimento.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={atualizarDataVencimento.isPending || !dataSelecionada}
          >
            {atualizarDataVencimento.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Atualizar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
