import { useState } from 'react';
import { AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { extractApiErrorMessage } from '@/lib/api-error-message';
import { notaFiscalService } from '@/services/nota-fiscal.service';
import { NotaFiscal } from '@/types/nota-fiscal';

const MOTIVO_MIN = 15;
const MOTIVO_MAX = 255;
/** Prazo geral da SEFAZ para cancelar NF-e após a autorização. */
const PRAZO_CANCELAMENTO_HORAS = 24;

export interface NotaParaCancelar {
  pedidoId: number;
  numeroPedido?: string;
  numeroNf?: number | null;
  emitidaEm?: string | null;
}

interface CancelarNotaFiscalDialogProps {
  nota: NotaParaCancelar;
  onClose: () => void;
  onSuccess: (nota: NotaFiscal) => void;
}

function foraDoPrazo(emitidaEm?: string | null): boolean {
  if (!emitidaEm) return false;
  const emissao = new Date(emitidaEm).getTime();
  if (Number.isNaN(emissao)) return false;
  return Date.now() - emissao > PRAZO_CANCELAMENTO_HORAS * 60 * 60 * 1000;
}

export function CancelarNotaFiscalDialog({
  nota,
  onClose,
  onSuccess,
}: CancelarNotaFiscalDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const tamanho = motivo.trim().length;
  const motivoValido = tamanho >= MOTIVO_MIN && tamanho <= MOTIVO_MAX;
  const prazoVencido = foraDoPrazo(nota.emitidaEm);

  const handleCancelar = async () => {
    if (!motivoValido) {
      toast.error(`Informe o motivo com pelo menos ${MOTIVO_MIN} caracteres.`);
      return;
    }

    setCancelando(true);
    try {
      const result = await notaFiscalService.cancelar(nota.pedidoId, motivo.trim());
      if (result.status === 'canceled') {
        toast.success('Nota fiscal cancelada.');
      } else {
        toast.info('Cancelamento solicitado', {
          description:
            'Aguardando confirmação da SEFAZ. Atualize o status da nota em instantes.',
        });
      }
      onSuccess(result);
      onClose();
    } catch (err) {
      toast.error('Não foi possível cancelar a nota', {
        description: extractApiErrorMessage(err),
      });
    } finally {
      setCancelando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !cancelando && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar nota fiscal</DialogTitle>
          <DialogDescription>
            {nota.numeroNf ? `NF-e nº ${nota.numeroNf}` : 'NF-e'}
            {nota.numeroPedido ? ` do pedido ${nota.numeroPedido}` : ''}. O
            cancelamento é registrado na SEFAZ e não pode ser desfeito.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {prazoVencido && (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                Esta nota foi autorizada há mais de {PRAZO_CANCELAMENTO_HORAS}{' '}
                horas, prazo geral para cancelamento. A SEFAZ pode recusar o
                pedido; nesse caso, consulte seu contador.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo-cancelamento-nf">Motivo do cancelamento</Label>
            <Textarea
              id="motivo-cancelamento-nf"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={MOTIVO_MAX}
              rows={4}
              disabled={cancelando}
              placeholder="Ex.: Nota emitida com dados incorretos do destinatário"
            />
            <p className="text-xs text-muted-foreground">
              {tamanho}/{MOTIVO_MAX} caracteres (mínimo {MOTIVO_MIN}). O motivo
              é enviado à SEFAZ.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            O pedido não é cancelado: ele continua ativo e pode receber uma
            nova nota.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={cancelando}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancelar}
            disabled={cancelando || !motivoValido}
          >
            {cancelando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Cancelar nota
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
