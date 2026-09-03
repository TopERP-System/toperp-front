/**
 * Componente do Passo 4 do formulário de cliente
 * Condições de Pagamento
 */

import { Button } from "@/components/ui/button";
import { CondicaoPagamento, FormaPagamento } from "@/shared/types/condicao-pagamento.types";
import { CreditCard, Plus } from "lucide-react";
import { CondicaoPagamentoForm } from "./CondicaoPagamentoForm";

interface ClienteFormStep4Props {
  condicoesPagamento: CondicaoPagamento[];
  onCondicoesPagamentoChange: (condicoes: CondicaoPagamento[]) => void;
  embedded?: boolean;
}

export const ClienteFormStep4 = ({
  condicoesPagamento,
  onCondicoesPagamentoChange,
  embedded = false,
}: ClienteFormStep4Props) => {
  const handleAddCondicao = () => {
    onCondicoesPagamentoChange([
      ...condicoesPagamento,
      {
        descricao: "",
        forma_pagamento: FormaPagamento.PIX,
        parcelado: false,
        padrao: condicoesPagamento.length === 0, // Primeira condição é padrão por padrão
        prazo_dias: 0,
      },
    ]);
  };

  const handleCondicaoChange = (index: number, condicao: CondicaoPagamento) => {
    const newCondicoes = [...condicoesPagamento];
    newCondicoes[index] = condicao;
    onCondicoesPagamentoChange(newCondicoes);
  };

  const handleRemoveCondicao = (index: number) => {
    onCondicoesPagamentoChange(condicoesPagamento.filter((_, i) => i !== index));
  };

  const handleSetPadrao = (index: number) => {
    const newCondicoes = condicoesPagamento.map((condicao, i) => ({
      ...condicao,
      padrao: i === index,
    }));
    onCondicoesPagamentoChange(newCondicoes);
  };

  const list =
    condicoesPagamento.length > 0 ? (
      <div className="space-y-4">
        {condicoesPagamento.map((condicao, index) => (
          <CondicaoPagamentoForm
            key={index}
            condicao={condicao}
            index={index}
            onChange={handleCondicaoChange}
            onRemove={handleRemoveCondicao}
            isPadrao={condicao.padrao}
            onSetPadrao={handleSetPadrao}
          />
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        Nenhuma condição de pagamento. Adicione se desejar definir prazos padrão para pedidos.
      </p>
    );

  if (embedded) return list;

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Condições de Pagamento</h3>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCondicao}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Condição
          </Button>
        </div>
        {list}
      </div>
    </div>
  );
};

export const ClienteFormStep4Actions = ({
  onAdd,
}: {
  onAdd: () => void;
}) => (
  <Button type="button" onClick={onAdd} variant="outline" size="sm" className="rounded-xl">
    <Plus className="mr-2 h-4 w-4" />
    Adicionar condição
  </Button>
);











