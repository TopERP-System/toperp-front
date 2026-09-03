import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notaFiscalService } from '@/services/nota-fiscal.service';
import type { NotaFiscalDiagnostico } from '@/types/nota-fiscal';
import { useQuery } from '@tanstack/react-query';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotaFiscalDiagnosticoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: number;
  numeroPedido?: string;
}

export function NotaFiscalDiagnosticoDialog({
  open,
  onOpenChange,
  pedidoId,
  numeroPedido,
}: NotaFiscalDiagnosticoDialogProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['pedidos', pedidoId, 'nota-fiscal', 'diagnostico'],
    queryFn: () => notaFiscalService.obterDiagnostico(pedidoId),
    enabled: open && pedidoId > 0,
  });

  const json = data ? JSON.stringify(data, null, 2) : '';

  const handleCopy = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      toast.success('Payload copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Diagnóstico NF-e — {numeroPedido ?? `Pedido ${pedidoId}`}</DialogTitle>
          <DialogDescription>
            Payload enviado à Spedy e resposta completa (inclui motivo de rejeição da SEFAZ).
          </DialogDescription>
        </DialogHeader>

        {isLoading || isFetching ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Consultando Spedy…
          </div>
        ) : isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Erro ao carregar diagnóstico'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : data ? (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            {data.rejeicao?.mensagem && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">Motivo da rejeição</p>
                <p className="mt-1">{data.rejeicao.mensagem}</p>
                {data.rejeicao.codigo && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Código: {data.rejeicao.codigo}
                  </p>
                )}
                {data.rejeicao.orientacao && data.rejeicao.orientacao.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 space-y-1 text-muted-foreground">
                    {data.rejeicao.orientacao.map((dica) => (
                      <li key={dica}>{dica}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar JSON
              </Button>
            </div>

            <pre className="flex-1 overflow-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-all">
              {json}
            </pre>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
