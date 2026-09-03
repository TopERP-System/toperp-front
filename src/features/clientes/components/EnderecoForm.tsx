/**
 * Componente reutilizável para formulário de endereço
 */

import { CepInputWithLookup } from "@/components/common/CepInputWithLookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Trash2 } from "lucide-react";
import { EnderecoFormData } from "../types/cliente.types";
import { formatCEP } from "@/lib/validators";

interface EnderecoFormProps {
  endereco: EnderecoFormData;
  index: number;
  totalEnderecos: number;
  onChange: (endereco: EnderecoFormData) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export const EnderecoForm = ({
  endereco,
  index,
  totalEnderecos,
  onChange,
  onRemove,
  showRemoveButton = true,
}: EnderecoFormProps) => {
  const handleChange = (field: keyof EnderecoFormData, value: string) => {
    onChange({
      ...endereco,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Endereço {index + 1}</Label>
        </div>
        {showRemoveButton && totalEnderecos > 1 && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CEP *</Label>
          <CepInputWithLookup
            value={endereco.cep}
            onChange={(cep) => handleChange("cep", cep)}
            onAddressFound={(dados) =>
              onChange({
                ...endereco,
                cep: formatCEP(dados.cep),
                logradouro: dados.logradouro || endereco.logradouro,
                complemento: dados.complemento || endereco.complemento,
                bairro: dados.bairro || endereco.bairro,
                cidade: dados.cidade,
                estado: dados.estado,
                codigo_ibge: dados.codigoIbge || endereco.codigo_ibge,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Logradouro *</Label>
          <Input
            placeholder="Rua, Avenida, etc."
            value={endereco.logradouro}
            onChange={(e) => handleChange("logradouro", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Número *</Label>
          <Input
            placeholder="123"
            value={endereco.numero}
            onChange={(e) => handleChange("numero", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Complemento</Label>
          <Input
            placeholder="Apto, Sala, etc."
            value={endereco.complemento}
            onChange={(e) => handleChange("complemento", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Bairro *</Label>
          <Input
            placeholder="Nome do bairro"
            value={endereco.bairro}
            onChange={(e) => handleChange("bairro", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Cidade *</Label>
          <Input
            placeholder="Nome da cidade"
            value={endereco.cidade}
            onChange={(e) => handleChange("cidade", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Estado (UF) *</Label>
          <Input
            placeholder="SP"
            maxLength={2}
            value={endereco.estado}
            onChange={(e) =>
              handleChange("estado", e.target.value.toUpperCase())
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Referência</Label>
          <Input
            placeholder="Ponto de referência"
            value={endereco.referencia}
            onChange={(e) => handleChange("referencia", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

