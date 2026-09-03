/**
 * Componente para gerenciar condições de pagamento do cliente
 */

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CondicaoPagamento,
    FormaPagamento,
} from "@/shared/types/condicao-pagamento.types";
import { CreditCard, Trash2 } from "lucide-react";

interface CondicaoPagamentoFormProps {
  condicao: CondicaoPagamento;
  index: number;
  onChange: (index: number, condicao: CondicaoPagamento) => void;
  onRemove: (index: number) => void;
  isPadrao: boolean;
  onSetPadrao: (index: number) => void;
}

export const CondicaoPagamentoForm: React.FC<CondicaoPagamentoFormProps> = ({
  condicao,
  index,
  onChange,
  onRemove,
  isPadrao,
  onSetPadrao,
}) => {
  const handleChange = (field: keyof CondicaoPagamento, value: any) => {
    const updated = { ...condicao, [field]: value };
    onChange(index, updated);
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">
              Condição de Pagamento {index + 1}
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`padrao-${index}`}
                checked={isPadrao}
                onCheckedChange={() => onSetPadrao(index)}
              />
              <Label
                htmlFor={`padrao-${index}`}
                className="text-sm font-normal cursor-pointer"
              >
                Padrão
              </Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Forma de Pagamento */}
        <div className="space-y-2">
          <Label htmlFor={`forma-${index}`}>
            Forma de Pagamento <span className="text-destructive">*</span>
          </Label>
          <Select
            value={condicao.forma_pagamento}
            onValueChange={(value) =>
              handleChange("forma_pagamento", value as FormaPagamento)
            }
          >
            <SelectTrigger id={`forma-${index}`}>
              <SelectValue placeholder="Selecione a forma de pagamento" />
            </SelectTrigger>
            <SelectContent position="item-aligned" className="max-h-[280px]">
              <SelectItem value={FormaPagamento.PIX}>PIX</SelectItem>
              <SelectItem value={FormaPagamento.DINHEIRO}>Dinheiro</SelectItem>
              <SelectItem value={FormaPagamento.CARTAO_CREDITO}>
                Cartão de Crédito
              </SelectItem>
              <SelectItem value={FormaPagamento.CARTAO_DEBITO}>
                Cartão de Débito
              </SelectItem>
              <SelectItem value={FormaPagamento.BOLETO}>Boleto</SelectItem>
              <SelectItem value={FormaPagamento.TRANSFERENCIA}>
                Transferência Bancária
              </SelectItem>
              <SelectItem value={FormaPagamento.CHEQUE}>Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Descrição (opcional) */}
        <div className="space-y-2">
          <Label htmlFor={`descricao-${index}`}>
            Descrição
          </Label>
          <Input
            id={`descricao-${index}`}
            type="text"
            value={condicao.descricao ?? ''}
            onChange={(e) => handleChange("descricao", e.target.value)}
            placeholder="Ex: 30 dias, À vista em 30 dias (opcional)"
          />
        </div>
      </CardContent>
    </Card>
  );
};

