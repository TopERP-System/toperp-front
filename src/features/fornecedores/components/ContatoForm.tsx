/**
 * Componente reutilizável para formulário de contato
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  Mail as MailIcon,
  Phone as PhoneIcon,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { ContatoFormData } from "../types/fornecedor.types";
import { formatTelefone } from "@/lib/validators";

interface ContatoFormProps {
  contato: ContatoFormData;
  index: number;
  totalContatos: number;
  onChange: (contato: ContatoFormData) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  showAtivoSwitch?: boolean;
  showOutroTelefone?: boolean;
}

export const ContatoForm = ({
  contato,
  index,
  totalContatos,
  onChange,
  onRemove,
  showRemoveButton = true,
  showAtivoSwitch = false,
  showOutroTelefone = false,
}: ContatoFormProps) => {
  const handleChange = (
    field: keyof ContatoFormData,
    value: string | boolean
  ) => {
    onChange({
      ...contato,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Contato {index + 1}</Label>
        </div>
        <div className="flex items-center gap-3">
          {showAtivoSwitch && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`ativo-${index}`} className="text-sm font-medium">
                Ativo
              </Label>
              <Switch
                id={`ativo-${index}`}
                checked={contato.ativo !== undefined ? contato.ativo : true}
                onCheckedChange={(checked) => handleChange("ativo", checked)}
              />
            </div>
          )}
          {showRemoveButton && totalContatos > 1 && onRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 text-muted-foreground" />
              Telefone
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              placeholder="(00) 00000-0000"
              value={contato.telefone}
              onChange={(e) => {
                const formatted = formatTelefone(e.target.value);
                handleChange("telefone", formatted);
              }}
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MailIcon className="w-4 h-4 text-muted-foreground" />
              E-mail
            </Label>
            <Input
              type="email"
              placeholder="exemplo@email.com"
              value={contato.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            Nome do Contato
          </Label>
          <Input
            placeholder="Nome do responsável"
            value={contato.nomeContato}
            onChange={(e) => handleChange("nomeContato", e.target.value)}
          />
        </div>
        {showOutroTelefone && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Outro Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={contato.outroTelefone}
                onChange={(e) => {
                  const formatted = formatTelefone(e.target.value);
                  handleChange("outroTelefone", formatted);
                }}
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Outro Telefone</Label>
              <Input
                placeholder="Nome do responsável"
                value={contato.nomeOutroTelefone}
                onChange={(e) =>
                  handleChange("nomeOutroTelefone", e.target.value)
                }
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Observação</Label>
          <Input
            placeholder="Observações sobre o contato"
            value={contato.observacao}
            onChange={(e) => handleChange("observacao", e.target.value)}
            maxLength={500}
          />
        </div>
      </div>
    </div>
  );
};
