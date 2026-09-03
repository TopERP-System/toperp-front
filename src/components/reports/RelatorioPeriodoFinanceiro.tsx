import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

type Props = {
  dataInicial: string;
  dataFinal: string;
  onDataInicial: (value: string) => void;
  onDataFinal: (value: string) => void;
};

/**
 * Bloco de período dos relatórios financeiros:
 * apenas seleção manual de data inicial e final.
 */
export function RelatorioPeriodoFinanceiro({
  dataInicial,
  dataFinal,
  onDataInicial,
  onDataFinal,
}: Props) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-[#1A3B70]">Período</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Data Inicial</Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              className="rounded-lg border-border/80 bg-muted/50 pl-10"
              value={dataInicial}
              onChange={(e) => onDataInicial(e.target.value || '')}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Data Final</Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              className="rounded-lg border-border/80 bg-muted/50 pl-10"
              value={dataFinal}
              onChange={(e) => onDataFinal(e.target.value || '')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
