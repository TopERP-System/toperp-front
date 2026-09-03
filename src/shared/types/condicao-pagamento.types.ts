/**
 * Tipos para Condições de Pagamento do Cliente
 */

export enum FormaPagamento {
  DINHEIRO = 'DINHEIRO',
  PIX = 'PIX',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  BOLETO = 'BOLETO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
}

export interface ParcelaPagamento {
  id?: number;
  numero_parcela: number;
  dias_vencimento: number;
  percentual: number;
}

export interface CondicaoPagamento {
  id?: number;
  descricao?: string;
  forma_pagamento: FormaPagamento;
  prazo_dias?: number;
  parcelado: boolean;
  numero_parcelas?: number;
  padrao: boolean;
  parcelas?: ParcelaPagamento[];
}

export interface DadosClienteParaPedido {
  cliente: {
    id: number;
    nome: string;
    cpf_cnpj: string;
    limite_credito?: number;
  };
  condicao_pagamento_padrao: CondicaoPagamento | null;
  condicoes_pagamento: CondicaoPagamento[];
}











