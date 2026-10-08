import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
import { extractApiErrorMessage } from "@/lib/api-error-message";
import { SpedyAdminTenantResumo, spedyService } from "@/services/spedy.service";
import { SpedyCertificadoFields } from "./SpedyCertificadoFields";

interface SpedyCertificadoDialogProps {
  tenant: SpedyAdminTenantResumo;
  onClose: () => void;
  onSuccess: () => void;
}

export const SpedyCertificadoDialog = ({
  tenant,
  onClose,
  onSuccess,
}: SpedyCertificadoDialogProps) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (!arquivo) {
      toast.error("Selecione o arquivo do certificado digital (.pfx).");
      return;
    }
    if (!senha.trim()) {
      toast.error("Informe a senha do certificado digital.");
      return;
    }

    setEnviando(true);
    try {
      const result = await spedyService.atualizarCertificadoAdmin(
        tenant.tenant_id,
        arquivo,
        senha,
      );
      toast.success(result.message);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Certificado digital</DialogTitle>
          <DialogDescription>
            Envie o arquivo .pfx de <strong>{tenant.nome}</strong> para a Spedy.
            Ele substitui o certificado atual do emissor.
          </DialogDescription>
        </DialogHeader>

        <SpedyCertificadoFields
          arquivo={arquivo}
          senha={senha}
          onArquivoChange={setArquivo}
          onSenhaChange={setSenha}
          disabled={enviando}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleEnviar} disabled={enviando}>
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando certificado...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Enviar certificado
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
