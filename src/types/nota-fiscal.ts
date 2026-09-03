export type StatusNotaFiscal =
  | 'created'
  | 'enqueued'
  | 'received'
  | 'authorized'
  | 'inContingent'
  | 'rejected'
  | 'canceled'
  | 'denied'
  | 'removed'
  | 'disabled';

export interface NotaFiscal {
  id: number;
  pedido_id?: number;
  pedidoId?: number;
  spedy_order_id?: string | null;
  spedyOrderId?: string | null;
  spedy_invoice_id?: string | null;
  spedyInvoiceId?: string | null;
  transaction_id?: string | null;
  transactionId?: string | null;
  integration_id?: string | null;
  integrationId?: string | null;
  status: StatusNotaFiscal;
  numero_nf?: number | null;
  numeroNf?: number | null;
  serie?: string | null;
  chave_acesso?: string | null;
  chaveAcesso?: string | null;
  protocolo?: string | null;
  mensagem_processamento?: string | null;
  mensagemProcessamento?: string | null;
  codigo_processamento?: string | null;
  codigoProcessamento?: string | null;
  ambiente?: string | null;
  modelo?: string | null;
  valor_total?: number | null;
  valorTotal?: number | null;
  emitida_em?: string | null;
  emitidaEm?: string | null;
}

export const STATUS_NOTA_FISCAL_LABELS: Record<StatusNotaFiscal, string> = {
  created: 'Criada',
  enqueued: 'Enfileirada',
  received: 'Recebida',
  authorized: 'Autorizada',
  inContingent: 'Contingência',
  rejected: 'Rejeitada',
  canceled: 'Cancelada',
  denied: 'Denegada',
  removed: 'Removida',
  disabled: 'Inutilizada',
};

export const STATUS_NOTA_BLOQUEIA_REEMISSAO: StatusNotaFiscal[] = [
  'authorized',
  'enqueued',
  'received',
  'inContingent',
];

/** Ainda aguardando resposta da SEFAZ/Spedy. */
export const STATUS_NOTA_EM_PROCESSAMENTO: StatusNotaFiscal[] = [
  'created',
  'enqueued',
  'received',
  'inContingent',
];

export function isStatusNotaEmProcessamento(status: StatusNotaFiscal): boolean {
  return STATUS_NOTA_EM_PROCESSAMENTO.includes(status);
}

export function isStatusNotaFinal(status: StatusNotaFiscal): boolean {
  return (
    status === 'authorized' ||
    status === 'rejected' ||
    status === 'canceled' ||
    status === 'denied' ||
    status === 'disabled' ||
    status === 'removed'
  );
}

export type SecaoNotaFiscal =
  | 'empresa'
  | 'integracao'
  | 'pedido'
  | 'cliente'
  | 'endereco'
  | 'produto';

export interface CampoFaltanteNotaFiscal {
  campo: string;
  label: string;
  secao: SecaoNotaFiscal;
  produto_id?: number;
}

export interface NotaFiscalPreEmissaoEndereco {
  id?: number | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  codigo_ibge?: string | null;
}

export interface NotaFiscalPreEmissaoCliente {
  id: number;
  nome: string;
  nome_fantasia?: string | null;
  nome_razao?: string | null;
  cpf_cnpj: string;
  inscricao_estadual?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco: NotaFiscalPreEmissaoEndereco | null;
}

export interface NotaFiscalPreEmissaoItem {
  produto_id: number;
  nome: string;
  sku?: string | null;
  ncm: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface NotaFiscalPreEmissaoEmpresa {
  cnpj: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  inscricao_estadual?: string | null;
  endereco?: NotaFiscalPreEmissaoEndereco | null;
  regime_tributario?: string | null;
  cfop_interno?: string | null;
  cfop_interestadual?: string | null;
}

export interface NotaFiscalPreEmissao {
  pedido: {
    id: number;
    numero_pedido: string;
    tipo: string;
    status: string;
    subtotal: number;
    frete: number;
    desconto_valor: number;
    valor_total: number;
    data_pedido: string | null;
    forma_pagamento?: string | null;
  };
  empresa: NotaFiscalPreEmissaoEmpresa;
  spedy_configurado: boolean;
  spedy_ambiente: 'homologacao' | 'producao';
  nota_existente?: {
    status: StatusNotaFiscal;
    numero_nf?: number | null;
    bloqueia_reemissao: boolean;
  } | null;
  cliente: NotaFiscalPreEmissaoCliente | null;
  itens: NotaFiscalPreEmissaoItem[];
  campos_faltantes: CampoFaltanteNotaFiscal[];
  pode_emitir: boolean;
}

export interface EmitirNotaFiscalPayload {
  cliente?: {
    nome?: string;
    nome_fantasia?: string;
    nome_razao?: string;
    cpf_cnpj?: string;
    inscricao_estadual?: string;
    email?: string;
    telefone?: string;
  };
  endereco?: NotaFiscalPreEmissaoEndereco;
  produtos?: Array<{ produto_id: number; ncm?: string; sku?: string }>;
}

export interface NotaFiscalListItem {
  id: number;
  pedido_id: number;
  numero_pedido: string;
  cliente_nome: string | null;
  status: StatusNotaFiscal;
  numero_nf: number | null;
  serie: string | null;
  chave_acesso: string | null;
  valor_total: number | null;
  ambiente: string | null;
  mensagem_processamento: string | null;
  data_emissao: string;
  emitida_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListarNotasFiscaisResponse {
  items: NotaFiscalListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListarNotasFiscaisFiltros {
  page?: number;
  limit?: number;
  busca?: string;
  status?: StatusNotaFiscal;
}

export interface NotaFiscalDiagnostico {
  pedido_id: number;
  numero_pedido: string;
  nota_local: Record<string, unknown>;
  rejeicao: {
    status: string | null;
    mensagem: string | null;
    codigo: string | null;
    orientacao?: string[];
  } | null;
  spedy: {
    ambiente: string;
    spedy_order_id: string | null;
    spedy_invoice_id: string | null;
    pedido: Record<string, unknown> | null;
    nota: Record<string, unknown> | null;
    empresa?: Record<string, unknown> | null;
    config_nf_e?: Record<string, unknown> | null;
    erro_pedido?: string;
    erro_nota?: string;
    erro_empresa?: string;
    erro_config?: string;
  };
  payload_emissao: Record<string, unknown>;
}
