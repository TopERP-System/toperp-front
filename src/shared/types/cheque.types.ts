/** Estrutura do cheque para pagamentos e baixas (API) */
export interface ChequeDto {
  titular: string;
  cpf_cnpj_titular: string;
  banco: string;
  agencia: string;
  conta: string;
  numero_cheque: string;
  valor: number;
  data_vencimento: string;
  observacao?: string;
}

/** Cheque retornado pela API (com id) */
export interface Cheque {
  id?: number;
  pagamento_id?: number;
  baixa_duplicata_id?: number;
  titular: string;
  cpf_cnpj_titular: string;
  banco: string;
  agencia: string;
  conta: string;
  numero_cheque: string;
  valor: number;
  data_vencimento: string;
  status?: string;
  observacao?: string;
}
