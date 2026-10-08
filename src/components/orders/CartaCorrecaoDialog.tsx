import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FilePenLine, Loader2 } from 'lucide-react';
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
import { formatDateTime } from '@/lib/utils';
import { notaFiscalService } from '@/services/nota-fiscal.service';
import { NotaFiscal } from '@/types/nota-fiscal';

const CARTA_MIN = 15;
const CARTA_MAX = 1000;
const MAX_CARTAS = 20;
/** Prazo geral da SEFAZ para carta de correção após a autorização. */
const PRAZO_CARTA_DIAS = 30;

export interface NotaParaCartaCorrecao {
  pedidoId: number;
  numeroPedido?: string;
  numeroNf?: number | null;
  emitidaEm?: string | null;
}

interface CartaCorrecaoDialogProps {
  nota: NotaParaCartaCorrecao;
  onClose: () => void;
  onSuccess: (nota: NotaFiscal) => void;
}

function foraDoPrazo(emitidaEm?: string | null): boolean {
  if (!emitidaEm) return false;
  const emissao = new Date(emitidaEm).getTime();
  if (Number.isNaN(emissao)) return false;
  return Date.now() - emissao > PRAZO_CARTA_DIAS * 24 * 60 * 60 * 1000;
}

export function CartaCorrecaoDialog({
  nota,
  onClose,
  onSuccess,
}: CartaCorrecaoDialogProps) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const queryKey = ['pedidos', nota.pedidoId, 'cartas-correcao'] as const;
  const {
    data: cartas = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => notaFiscalService.listarCartasCorrecao(nota.pedidoId),
  });

  const tamanho = texto.trim().length;
  const textoValido = tamanho >= CARTA_MIN && tamanho <= CARTA_MAX;
  const limiteAtingido = cartas.length >= MAX_CARTAS;
  const prazoVencido = foraDoPrazo(nota.emitidaEm);

  const handleEnviar = async () => {
    if (!textoValido) {
      toast.error(`Descreva a correção com pelo menos ${CARTA_MIN} caracteres.`);
      return;
    }

    setEnviando(true);
    try {
      const result = await notaFiscalService.cartaCorrecao(
        nota.pedidoId,
        texto.trim(),
      );
      toast.success('Carta de correção enviada', {
        description: 'O registro na SEFAZ pode levar alguns instantes.',
      });
      setTexto('');
      await queryClient.invalidateQueries({ queryKey });
      onSuccess(result);
    } catch (err) {
      toast.error('Não foi possível enviar a carta de correção', {
        description: extractApiErrorMessage(err),
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle>Carta de correção</DialogTitle>
          <DialogDescription>
            {nota.numeroNf ? `NF-e nº ${nota.numeroNf}` : 'NF-e'}
            {nota.numeroPedido ? ` do pedido ${nota.numeroPedido}` : ''}.
            Corrige informações da nota sem cancelá-la.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Não pode ser corrigido:</strong>{' '}
              valores, quantidades, impostos e alíquotas, dados que mudem o
              remetente ou o destinatário, e as datas de emissão e saída.
            </p>
            <p>
              Cada nova carta substitui as anteriores: inclua nela todas as
              correções que devem valer.
            </p>
          </div>

          {prazoVencido && (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                Esta nota foi autorizada há mais de {PRAZO_CARTA_DIAS} dias,
                prazo geral para carta de correção. A SEFAZ pode recusar o
                envio.
              </p>
            </div>
          )}

          {limiteAtingido ? (
            <p className="text-sm text-destructive">
              Esta nota já atingiu o limite de {MAX_CARTAS} cartas de correção.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="texto-carta-correcao">Texto da correção</Label>
              <Textarea
                id="texto-carta-correcao"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={CARTA_MAX}
                rows={5}
                disabled={enviando}
                placeholder="Ex.: Onde se lê transportadora X, leia-se transportadora Y"
              />
              <p className="text-xs text-muted-foreground">
                {tamanho}/{CARTA_MAX} caracteres (mínimo {CARTA_MIN})
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Cartas já enviadas</h3>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isError ? (
              <p className="text-xs text-destructive">
                Não foi possível carregar o histórico.
              </p>
            ) : cartas.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma carta de correção enviada para esta nota.
              </p>
            ) : (
              <ul className="space-y-2">
                {cartas.map((carta) => (
                  <li
                    key={carta.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <p className="mb-1 text-xs text-muted-foreground">
                      Carta nº {carta.sequencia} ·{' '}
                      {formatDateTime(carta.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{carta.texto}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={enviando}>
            Fechar
          </Button>
          {!limiteAtingido && (
            <Button
              type="button"
              onClick={handleEnviar}
              disabled={enviando || !textoValido}
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <FilePenLine className="h-4 w-4 mr-2" />
                  Enviar carta de correção
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
