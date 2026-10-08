import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-error-message";
import { SpedyAdminTenantResumo, spedyService } from "@/services/spedy.service";

interface SpedyChaveDialogProps {
  tenant: SpedyAdminTenantResumo;
  onClose: () => void;
  onSuccess: () => void;
}

/** Vincula a empresa a um emissor já existente na Spedy informando a API Key dele. */
export const SpedyChaveDialog = ({
  tenant,
  onClose,
  onSuccess,
}: SpedyChaveDialogProps) => {
  const [apiKey, setApiKey] = useState("");
  const [ambiente, setAmbiente] = useState(tenant.ambiente);
  const [salvando, setSalvando] = useState(false);

  const jaIntegrada = tenant.integracao_ativa || tenant.emissor_cadastrado;

  const handleSalvar = async () => {
    if (apiKey.trim().length < 8) {
      toast.error("Informe a API Key do emissor na Spedy.");
      return;
    }

    setSalvando(true);
    try {
      const result = await spedyService.definirIntegracaoAdmin(tenant.tenant_id, {
        apiKey: apiKey.trim(),
        ambiente,
      });
      toast.success(result.message);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !salvando && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chave de API da Spedy</DialogTitle>
          <DialogDescription>
            Vincula <strong>{tenant.nome}</strong> a um emissor que já existe
            na Spedy. A chave é validada na Spedy antes de ser gravada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {jaIntegrada && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              Esta empresa já tem uma integração gravada. Salvar substitui a
              chave, o ambiente e o emissor atuais.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="spedy-api-key">API Key do emissor</Label>
            <Input
              id="spedy-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={salvando}
              placeholder="Cole a chave gerada no painel da Spedy"
            />
          </div>
          <div className="space-y-2 sm:max-w-xs">
            <Label>Ambiente da chave</Label>
            <Select
              value={ambiente}
              onValueChange={(v) => setAmbiente(v as typeof ambiente)}
              disabled={salvando}
            >
              <SelectTrigger aria-label="Ambiente da chave">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homologacao">Homologação</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cada ambiente da Spedy tem chaves próprias: para mudar de
              ambiente, informe a chave do emissor no novo ambiente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSalvar} disabled={salvando}>
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validando chave...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4 mr-2" />
                Validar e salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
