/**
 * Tipos e interfaces para Contas a Receber e Contas a Pagar
 * Conforme GUIA_MIGRACAO_FRONTEND_PRATICO.md
 */

export enum FormaPagamento {
  DINHEIRO = 'DINHEIRO',
  PIX = 'PIX',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  BOLETO = 'BOLETO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE'
}

export enum StatusPedido {
  PENDENTE = 'PENDENTE',
  APROVADO = 'APROVADO',
  EM_PROCESSAMENTO = 'EM_PROCESSAMENTO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO'
}

/** Item da listagem contas a receber — GET /financeiro/contas-receber ou GET /pedidos/contas-receber (1 linha = 1 pedido) */
export interface ContaReceber {
  pedido_id: number;
  numero_pedido: string;
  cliente_id?: number | null;
  cliente_nome?: string | null;
  valor_total: number;
  /** Valor já pago (usar do backend; não calcular no front) */
  valor_pago?: number;
  valor_em_aberto: number;
  forma_pagamento: string; // FormaPagamento enum value
  forma_pagamento_estrutural?: string; // AVISTA, PARCELADO, BOLETO_DESCONTADO
  status: string; // ABERTO | PARCIAL | QUITADO | VENCIDO | CANCELADO
  data_pedido: string; // ISO date: "2026-02-10"
  /** Data de vencimento (única por pedido no modelo sem parcelas) */
  data_vencimento?: string | null;
  roca_id?: number | null;
  roca_nome?: string | null;
}

export interface ContaPagar {
  pedido_id: number;
  numero_pedido: string;
  fornecedor_id?: number | null;
  fornecedor_nome?: string | null;
  valor_total: number;
  valor_pago?: number; // valor já pago (retornado pela API)
  valor_em_aberto: number;
  forma_pagamento: string; // FormaPagamento enum value
  status: string; // ABERTO | PARCIAL | QUITADO | VENCIDO | CANCELADO
  data_pedido: string; // ISO date: "2026-02-10"
  data_vencimento?: string | null; // data de vencimento (retornada pela API)
  roca_id?: number | null;
  roca_nome?: string | null;
}

export interface FiltrosContasReceber {
  codigo?: string;
  cliente_id?: number;
  cliente_nome?: string;
  valor_inicial?: number;
  valor_final?: number;
  forma_pagamento?: string;
  forma_pagamento_estrutural?: 'AVISTA' | 'PARCELADO' | 'BOLETO_DESCONTADO';
  situacao?: 'todos' | 'em_aberto' | 'em_atraso' | 'concluido';
  data_inicial?: string; // YYYY-MM-DD
  data_final?: string; // YYYY-MM-DD
  roca_id?: number;
}

export interface FiltrosContasPagar {
  codigo?: string;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  valor_inicial?: number;
  valor_final?: number;
  forma_pagamento?: string;
  situacao?: 'em_aberto' | 'em_atraso' | 'concluido';
  data_inicial?: string; // YYYY-MM-DD
  data_final?: string; // YYYY-MM-DD
  roca_id?: number;
}
