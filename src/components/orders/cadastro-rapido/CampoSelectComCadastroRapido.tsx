import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { ReactNode } from 'react';
import { CadastroRapidoEntidade, CadastroRapidoTipo } from './CadastroRapidoEntidade';

interface CampoSelectComCadastroRapidoProps {
  label: string;
  cadastroRapidoTipo?: CadastroRapidoTipo;
  cadastroRapidoAberto: boolean;
  onToggleCadastroRapido: () => void;
  onCloseCadastroRapido: () => void;
  onCadastroCriado: Parameters<typeof CadastroRapidoEntidade>[0]['onCreated'];
  children: ReactNode;
}

export function CampoSelectComCadastroRapido({
  label,
  cadastroRapidoTipo,
  cadastroRapidoAberto,
  onToggleCadastroRapido,
  onCloseCadastroRapido,
  onCadastroCriado,
  children,
}: CampoSelectComCadastroRapidoProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {cadastroRapidoTipo && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            title={`Cadastro rápido de ${label.toLowerCase()}`}
            onClick={onToggleCadastroRapido}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {children}
      {cadastroRapidoAberto && cadastroRapidoTipo && (
        <CadastroRapidoEntidade
          tipo={cadastroRapidoTipo}
          onClose={onCloseCadastroRapido}
          onCreated={onCadastroCriado}
        />
      )}
    </div>
  );
}
