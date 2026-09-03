/**
 * Tipos para o módulo financeiro do pedido.
 * Conforme GUIA_IMPLEMENTACAO_FRONTEND_FINANCEIRO.md (seção 8).
 */

export type StatusFinanceiro =
  | 'ABERTO'
  | 'PARCIAL'
  | 'QUITADO'
  | 'VENCIDO'
  | 'CANCELADO';

/** Resumo do pedido — GET /pedidos/:id/financeiro (contrato novo) */
export interface ResumoFinanceiroPedido {
  valor_total: number;
  valor_pago: number;
  valor_em_aberto: number;
  status: StatusFinanceiro;
  data_vencimento: string | null;
  /** Boleto descontado: valor que o cliente adiantou no pedido */
  valor_adiantado?: number | null;
  /** true se já existe um pagamento com tipo_lancamento = ADIANTAMENTO */
  adiantamento_ja_pago?: boolean;
  forma_pagamento_estrutural?: string | null;
  /** true quando é BOLETO_DESCONTADO, tem valor_adiantado e ainda não foi registrado o pagamento do adiantamento */
  eh_pagamento_adiantamento?: boolean;
  /** Mensagem para exibir na tela de pagamento quando eh_pagamento_adiantamento */
  mensagem_adiantamento?: string | null;
}

/** Dados do cheque no histórico de pagamento */
export interface DadosCheque {
  banco: string;
  numero_cheque: string;
  agencia: string;
  conta: string;
  titular: string;
}

/** Item do histórico — GET /pedidos/:id/pagamentos */
export interface ItemHistoricoPagamento {
  id: number;
  valor: number;
  forma_pagamento: string;
  data_pagamento: string;
  cheque?: DadosCheque;
}

/** Dados do cheque ao registrar pagamento (quando forma = CHEQUE) */
export interface ChequeRegistro {
  banco: string;
  numero_cheque: string;
  agencia: string;
  conta: string;
  titular: string;
  data_vencimento?: string;
  cpf_cnpj_titular?: string;
}

/** Body ao registrar pagamento — POST /pedidos/:id/pagamentos */
export interface RegistrarPagamentoBody {
  valor: number;
  forma_pagamento: string;
  data_pagamento?: string;
  observacoes?: string;
  /** Conta específica quando o pedido tem múltiplas formas */
  conta_financeira_id?: number;
  /** ADIANTAMENTO = pagamento do adiantamento (boleto descontado). Backend pode preencher automaticamente. */
  tipo_lancamento?: string;
  /** Dados do cheque (obrigatório quando forma_pagamento = CHEQUE) */
  cheque?: ChequeRegistro;
}
