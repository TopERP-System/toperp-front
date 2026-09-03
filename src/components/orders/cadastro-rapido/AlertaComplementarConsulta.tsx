import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface AlertaComplementarConsultaProps {
  visible: boolean;
  onAceitar: () => void;
  onRecusar: () => void;
}

export function AlertaComplementarConsulta({
  visible,
  onAceitar,
  onRecusar,
}: AlertaComplementarConsultaProps) {
  if (!visible) return null;

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-sm">Dados encontrados na consulta</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Deseja complementar o cadastro com endereço, telefone e demais informações
          automaticamente em segundo plano?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="default" onClick={onAceitar}>
            Sim, complementar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onRecusar}>
            Não, só o básico
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
