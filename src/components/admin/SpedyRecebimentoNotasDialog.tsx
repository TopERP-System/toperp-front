import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-error-message";
import { formatDate } from "@/lib/utils";
import { SpedyAdminTenantResumo, spedyService } from "@/services/spedy.service";

interface SpedyRecebimentoNotasDialogProps {
  tenant: SpedyAdminTenantResumo;
  onClose: () => void;
}

/**
 * Task 012: liga o recebimento de NF-e na Spedy, para a empresa lançar notas de entrada pela
 * chave. Só o bloco da NF-e é reenviado; se uma nota for emitida no meio, nada é alterado.
 */
export const SpedyRecebimentoNotasDialog = ({
  tenant,
  onClose,
}: SpedyRecebimentoNotasDialogProps) => {
  const [dataInicio, setDataInicio] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["admin-spedy-recebimento", tenant.tenant_id],
    queryFn: () => spedyService.recebimentoNotasAdmin(tenant.tenant_id),
    retry: false,
  });
  const minima = status.data?.data_inicio_minima ?? "";
  // Padrão: o mais antigo possível, para pegar as compras recentes de quem já emite
  const data = dataInicio ?? minima;

  const ligar = useMutation({
    mutationFn: () => spedyService.ligarRecebimentoNotasAdmin(tenant.tenant_id, data),
    onSuccess: () => {
      toast.success("Recebimento de notas ligado na Spedy.");
      status.refetch();
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !ligar.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recebimento de notas</DialogTitle>
          <DialogDescription>
            Com o recebimento ligado, a Spedy busca na SEFAZ as NF-e emitidas
            para <strong>{tenant.nome}</strong> e a empresa lança as notas de
            entrada pela chave de acesso.
          </DialogDescription>
        </DialogHeader>

        {status.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Consultando a Spedy...
          </div>
        )}
        {status.isError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {extractApiErrorMessage(status.error)}
          </p>
        )}
        {status.data?.ligado && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Ligado
            {status.data.data_inicio
              ? ` desde ${formatDate(status.data.data_inicio)}`
              : ""}
            : notas emitidas a partir dessa data chegam da SEFAZ.
          </p>
        )}
        {status.data && !status.data.ligado && (
          <div className="space-y-2">
            <Label htmlFor="recebimento-inicio">Receber notas emitidas a partir de</Label>
            <Input
              id="recebimento-inicio"
              type="date"
              className="sm:max-w-[12rem]"
              min={minima}
              max={new Date().toISOString().slice(0, 10)}
              value={data}
              onChange={(e) => setDataInicio(e.target.value)}
              disabled={ligar.isPending}
            />
            <p className="text-xs text-muted-foreground">
              A SEFAZ guarda só 90 dias: notas anteriores a essa data não
              chegam nunca. Não muda a emissão nem a numeração da NF-e.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={ligar.isPending}>
            Fechar
          </Button>
          {status.data && !status.data.ligado && (
            <Button type="button" onClick={() => ligar.mutate()} disabled={ligar.isPending || !data}>
              {ligar.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Inbox className="h-4 w-4 mr-2" />
              )}
              Ligar recebimento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
