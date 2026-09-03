import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { canManageNotaFiscal } from '@/lib/role-access';
import { extractApiErrorMessage } from '@/lib/api-error-message';
import { cn } from '@/lib/utils';
import { notaFiscalService } from '@/services/nota-fiscal.service';
import {
  STATUS_NOTA_BLOQUEIA_REEMISSAO,
  STATUS_NOTA_FISCAL_LABELS,
  isStatusNotaEmProcessamento,
  type NotaFiscal,
  type StatusNotaFiscal,
} from '@/types/nota-fiscal';
import { Pedido, StatusPedido, TipoPedido } from '@/types/pedido';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FileCheck2,
  FileJson,
  Loader2,
  RefreshCw,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmitirNotaFiscalDialog } from './EmitirNotaFiscalDialog';
import { NotaFiscalDiagnosticoDialog } from './NotaFiscalDiagnosticoDialog';
import { useState } from 'react';

interface PedidoNotaFiscalSectionProps {
  pedidoId: number;
  numeroPedido: string;
  tipo: TipoPedido;
  status: StatusPedido;
  dialogOpen: boolean;
}

function pickNotaField<T>(nota: NotaFiscal, snake: keyof NotaFiscal, camel: keyof NotaFiscal): T | null | undefined {
  const v = nota[snake] ?? nota[camel];
  return v as T | null | undefined;
}

function statusBadgeClass(status: StatusNotaFiscal): string {
  switch (status) {
    case 'authorized':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400';
    case 'rejected':
    case 'denied':
    case 'canceled':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
    case 'enqueued':
    case 'received':
    case 'created':
    case 'inContingent':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function extractErrorMessage(error: unknown): string {
  return extractApiErrorMessage(error);
}

export function PedidoNotaFiscalSection({
  pedidoId,
  numeroPedido,
  tipo,
  status,
  dialogOpen,
}: PedidoNotaFiscalSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const podeGerenciar = canManageNotaFiscal(user?.role);
  const [emitirDialogOpen, setEmitirDialogOpen] = useState(false);
  const [diagnosticoOpen, setDiagnosticoOpen] = useState(false);
  const isVenda = tipo === 'VENDA';
  const pedidoCancelado = status === 'CANCELADO';

  const queryKey = ['pedidos', pedidoId, 'nota-fiscal'] as const;

  const { data: nota, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => notaFiscalService.obterPorPedido(pedidoId),
    enabled: dialogOpen && isVenda,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status && isStatusNotaEmProcessamento(query.state.data.status)
        ? 30_000
        : false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const consultarMutation = useMutation({
    mutationFn: () => notaFiscalService.consultar(pedidoId),
    onSuccess: (result) => {
      invalidate();
      toast.success('Status atualizado', {
        description: STATUS_NOTA_FISCAL_LABELS[result.status] ?? result.status,
      });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const pdfMutation = useMutation({
    mutationFn: () => notaFiscalService.baixarPdf(pedidoId, numeroPedido),
    onSuccess: () => toast.success('PDF baixado com sucesso'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const xmlMutation = useMutation({
    mutationFn: () => notaFiscalService.baixarXml(pedidoId, numeroPedido),
    onSuccess: () => toast.success('XML baixado com sucesso'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  if (!isVenda) return null;

  const notaStatus = nota?.status;
  const bloqueiaReemissao =
    !!notaStatus && STATUS_NOTA_BLOQUEIA_REEMISSAO.includes(notaStatus);
  const podeEmitir =
    podeGerenciar &&
    !pedidoCancelado &&
    (!nota || notaStatus === 'rejected');
  const podeConsultar = podeGerenciar && !!nota;
  const temNotaNaSpedy = !!pickNotaField<string>(
    nota ?? {},
    'spedy_invoice_id',
    'spedyInvoiceId',
  );
  const busy =
    consultarMutation.isPending ||
    pdfMutation.isPending ||
    xmlMutation.isPending;

  const pedidoResumo = {
    id: pedidoId,
    numero_pedido: numeroPedido,
    tipo,
    status,
  } as Pedido;

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <CardTitle className="text-base">Nota Fiscal (NF-e)</CardTitle>
            {notaStatus && (
              <Badge
                variant="outline"
                className={cn('font-medium', statusBadgeClass(notaStatus))}
              >
                {STATUS_NOTA_FISCAL_LABELS[notaStatus]}
              </Badge>
            )}
          </div>
          {podeGerenciar && (
            <div className="flex flex-wrap gap-2">
              {podeEmitir && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => setEmitirDialogOpen(true)}
                >
                  <FileCheck2 className="w-4 h-4 mr-2" />
                  {notaStatus === 'rejected' ? 'Emitir novamente' : 'Emitir nota'}
                </Button>
              )}
              {podeConsultar && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => consultarMutation.mutate()}
                >
                  {consultarMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Consultar status
                </Button>
              )}
              {nota && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDiagnosticoOpen(true)}
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Ver payload
                </Button>
              )}
              {temNotaNaSpedy && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => pdfMutation.mutate()}
                  >
                    {pdfMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Baixar PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => xmlMutation.mutate()}
                  >
                    {xmlMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Baixar XML
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando nota fiscal...
          </div>
        )}

        {isError && (
          <div className="flex flex-wrap items-center gap-2 text-destructive">
            <span>{extractErrorMessage(error)}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !isError && !nota && (
          <p className="text-muted-foreground">
            {pedidoCancelado
              ? 'Pedido cancelado — emissão de NF-e indisponível.'
              : bloqueiaReemissao
                ? 'Nota em processamento.'
                : podeGerenciar
                  ? 'Nenhuma nota fiscal emitida para este pedido.'
                  : 'Nenhuma nota fiscal vinculada a este pedido.'}
          </p>
        )}

        {nota && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pickNotaField<number>(nota, 'numero_nf', 'numeroNf') != null && (
              <div>
                <Label className="text-muted-foreground text-xs">Número</Label>
                <p className="font-medium">
                  {pickNotaField<number>(nota, 'numero_nf', 'numeroNf')}
                  {nota.serie ? ` / Série ${nota.serie}` : ''}
                </p>
              </div>
            )}
            {pickNotaField<string>(nota, 'chave_acesso', 'chaveAcesso') && (
              <div className="md:col-span-2">
                <Label className="text-muted-foreground text-xs">Chave de acesso</Label>
                <p className="font-mono text-xs break-all">
                  {pickNotaField<string>(nota, 'chave_acesso', 'chaveAcesso')}
                </p>
              </div>
            )}
            {pickNotaField<string>(nota, 'mensagem_processamento', 'mensagemProcessamento') && (
              <div className="md:col-span-2">
                <Label className="text-muted-foreground text-xs">Detalhe</Label>
                <p className="text-muted-foreground">
                  {pickNotaField<string>(nota, 'mensagem_processamento', 'mensagemProcessamento')}
                  {pickNotaField<string>(nota, 'codigo_processamento', 'codigoProcessamento')
                    ? ` (${pickNotaField<string>(nota, 'codigo_processamento', 'codigoProcessamento')})`
                    : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {temNotaNaSpedy && (
          <p className="text-xs text-muted-foreground">
            Após emitir, use <strong>Baixar PDF</strong> ou <strong>Baixar XML</strong>.
            O arquivo será salvo na pasta Downloads do seu computador.
          </p>
        )}

        {!podeGerenciar && isVenda && (
          <p className="text-xs text-muted-foreground">
            Apenas Admin, Gerente ou Financeiro podem emitir notas fiscais.
          </p>
        )}
      </CardContent>
    </Card>

    <EmitirNotaFiscalDialog
      open={emitirDialogOpen}
      onOpenChange={setEmitirDialogOpen}
      order={pedidoResumo}
      onSuccess={(result) => {
        queryClient.setQueryData(queryKey, result);
        invalidate();
      }}
    />
    <NotaFiscalDiagnosticoDialog
      open={diagnosticoOpen}
      onOpenChange={setDiagnosticoOpen}
      pedidoId={pedidoId}
      numeroPedido={numeroPedido}
    />
    </>
  );
}
