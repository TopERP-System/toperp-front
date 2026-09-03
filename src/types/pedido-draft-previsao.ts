import type { ContaFinanceira } from '@/services/financeiro.service';

/** Rascunho de pedido de venda gerado a partir de uma previsão de receita. */
export type PedidoDraftFromPrevisao = {
  draftKey: string;
  cliente_id?: number;
  roca_id?: number;
  data_prevista?: string;
  valor?: number;
  forma_pagamento?: ContaFinanceira['forma_pagamento'];
  observacoes?: string;
  descricao?: string;
};

export function draftFromContaPrevisao(
  conta: ContaFinanceira,
): PedidoDraftFromPrevisao {
  return {
    draftKey: `previsao-${conta.id}`,
    cliente_id: conta.cliente_id,
    roca_id: conta.roca_id,
    data_prevista: conta.data_prevista ?? undefined,
    valor: conta.valor_original,
    forma_pagamento: conta.forma_pagamento,
    observacoes: conta.observacoes,
    descricao: conta.descricao,
  };
}
