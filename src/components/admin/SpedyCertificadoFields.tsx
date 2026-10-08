import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SpedyCertificadoFieldsProps {
  arquivo: File | null;
  senha: string;
  onArquivoChange: (arquivo: File | null) => void;
  onSenhaChange: (senha: string) => void;
  disabled?: boolean;
  ajuda?: string;
}

/** Seleção do certificado A1 (.pfx) e senha, usada nos dialogs Spedy do painel admin. */
export const SpedyCertificadoFields = ({
  arquivo,
  senha,
  onArquivoChange,
  onSenhaChange,
  disabled,
  ajuda,
}: SpedyCertificadoFieldsProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Certificado digital (.pfx)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pfx"
            className="hidden"
            onChange={(e) => onArquivoChange(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Upload className="h-4 w-4 mr-2" />
            {arquivo ? arquivo.name : "Selecionar .pfx"}
          </Button>
          {arquivo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onArquivoChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={disabled}
            >
              Remover
            </Button>
          )}
        </div>
        {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="spedy-senha-certificado">Senha do certificado</Label>
        <Input
          id="spedy-senha-certificado"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => onSenhaChange(e.target.value)}
          disabled={disabled}
          placeholder="Senha do .pfx"
        />
      </div>
    </div>
  );
};
