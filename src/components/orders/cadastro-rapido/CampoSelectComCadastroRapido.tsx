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
            // Da altura da linha do rótulo: não empurra o select para baixo
            className="h-6 w-6 shrink-0 rounded-md"
            title={`Cadastro rápido de ${label.toLowerCase()}`}
            aria-label={`Cadastro rápido de ${label.toLowerCase()}`}
            onClick={onToggleCadastroRapido}
          >
            <Plus className="h-3.5 w-3.5" />
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
