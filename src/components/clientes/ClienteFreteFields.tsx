import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MODALIDADES_FRETE,
  MODALIDADE_FRETE_SEM_TRANSPORTE,
} from "@/lib/modalidade-frete";
import { transportadorasService } from "@/services/transportadoras.service";

const NENHUMA = "nenhuma";

export interface ClienteFreteValores {
  transportadora_padrao_id: number | null;
  modalidade_frete_padrao: number | null;
}

interface ClienteFreteFieldsProps {
  transportadoraId: number | null | undefined;
  modalidade: number | null | undefined;
  onChange: (valores: ClienteFreteValores) => void;
}

/**
 * "Frete padrão" do cliente: transportadora e modalidade usadas no pedido novo.
 * O pedido pode trocar os dois numa exceção. Com "Sem transporte" a transportadora é limpa.
 */
export function ClienteFreteFields({ transportadoraId, modalidade, onChange }: ClienteFreteFieldsProps) {
  const { data: transportadoras = [] } = useQuery({
    queryKey: ["transportadoras", "ativas"],
    queryFn: async () => {
      const response = await transportadorasService.listar({ limit: 100, apenasAtivos: true });
      return Array.isArray(response) ? response : response.transportadoras || [];
    },
    retry: false,
  });

  const atualTransportadora = transportadoraId ?? null;
  const atualModalidade = modalidade ?? null;
  const semTransporte = atualModalidade === MODALIDADE_FRETE_SEM_TRANSPORTE;
  const selecionadaForaDaLista =
    atualTransportadora != null && !transportadoras.some((t) => t.id === atualTransportadora);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-muted-foreground" />
        Frete padrão
        <span className="text-xs text-muted-foreground">(opcional)</span>
      </Label>
      <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cliente-modalidade-frete" className="text-sm">Modalidade do frete</Label>
          <Select
            value={atualModalidade == null ? NENHUMA : String(atualModalidade)}
            onValueChange={(v) => {
              const nova = v === NENHUMA ? null : Number(v);
              onChange({
                modalidade_frete_padrao: nova,
                transportadora_padrao_id:
                  nova === MODALIDADE_FRETE_SEM_TRANSPORTE ? null : atualTransportadora,
              });
            }}
          >
            <SelectTrigger id="cliente-modalidade-frete" aria-label="Modalidade do frete padrão">
              <SelectValue placeholder="Não definida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUMA}>Não definida</SelectItem>
              {MODALIDADES_FRETE.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {atualModalidade != null && (
            <p className="text-xs text-muted-foreground">
              {MODALIDADES_FRETE.find((m) => m.value === atualModalidade)?.descricao}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliente-transportadora-padrao" className="text-sm">Transportadora</Label>
          <Select
            value={atualTransportadora == null ? NENHUMA : String(atualTransportadora)}
            onValueChange={(v) =>
              onChange({
                modalidade_frete_padrao: atualModalidade,
                transportadora_padrao_id: v === NENHUMA ? null : Number(v),
              })
            }
            disabled={semTransporte}
          >
            <SelectTrigger id="cliente-transportadora-padrao" aria-label="Transportadora padrão">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUMA}>Nenhuma</SelectItem>
              {selecionadaForaDaLista && (
                <SelectItem value={String(atualTransportadora)}>
                  Transportadora inativa ou excluída
                </SelectItem>
              )}
              {transportadoras.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome_fantasia?.trim() || t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {semTransporte
              ? "Sem transporte não usa transportadora."
              : "O pedido novo deste cliente já vem com estes dados. Dá para trocar no pedido, quando for uma exceção."}
          </p>
        </div>
      </div>
    </div>
  );
}
