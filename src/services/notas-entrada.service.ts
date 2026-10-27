import type { FormaPagamento } from '@/types/pedido';
import { apiClient } from './api';

/** Espelha backend/src/nota-entrada (task 009). */
export interface NfeXmlItem {
  n_item: number;
  /** cProd: código do produto no fornecedor. */
  codigo: string;
  descricao: string;
  ean: string | null;
  ncm: string | null;
  cest: string | null;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto: number;
  valor_icms: number;
  valor_ipi: number;
}

export interface NfeXml {
  chave_acesso: string;
  modelo: string;
  serie: string;
  numero: string;
  natureza_operacao: string | null;
  data_emissao: string;
  data_hora_emissao: string;
  autorizada: boolean;
  protocolo: string | null;
  emitente: {
    cpf_cnpj: string;
    nome: string;
    nome_fantasia: string | null;
    inscricao_estadual: string | null;
    endereco: {
      logradouro: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      codigo_ibge: string | null;
      estado: string | null;
      cep: string | null;
      telefone: string | null;
    };
  };
  destinatario: { cpf_cnpj: string | null; nome: string | null };
  itens: NfeXmlItem[];
  totais: {
    produtos: number;
    frete: number;
    desconto: number;
    icms: number;
    st: number;
    ipi: number;
    outros: number;
    total: number;
  };
  duplicatas: Array<{ numero: string | null; vencimento: string; valor: number }>;
}

export interface ProdutoPrevia {
  id: number;
  nome: string;
  sku: string;
  unidade_medida: string;
}

export interface ItemPrevia extends NfeXmlItem {
  produto: ProdutoPrevia | null;
  vinculo_origem: 'FORNECEDOR' | 'CODIGO_BARRAS' | null;
  fator_conversao: number;
  cfop_entrada_sugerido: string | null;
}

export interface NotaEntradaPrevia {
  nota: NfeXml;
  ja_importada: { id: number; situacao: string } | null;
  fornecedor: { id: number; nome_fantasia: string; nome_razao: string | null; cpf_cnpj: string | null } | null;
  /** null quando a empresa não tem CNPJ/CPF cadastrado. */
  destinatario_confere: boolean | null;
  itens: ItemPrevia[];
  pendencias: Array<{ campo: string; mensagem: string; n_item?: number }>;
  avisos: string[];
}

class NotasEntradaService {
  /**
   * Lê o XML da NF-e de compra e devolve a prévia (não grava nada).
   * `fornecedorId`: fornecedor já cadastrado que o usuário associou ao emitente.
   */
  async previaXml(arquivo: File, fornecedorId?: number | null): Promise<NotaEntradaPrevia> {
    const fd = new FormData();
    fd.append('xml', arquivo);
    if (fornecedorId) fd.append('fornecedor_id', String(fornecedorId));
    return apiClient.postForm<NotaEntradaPrevia>('/notas-entrada/xml/previa', fd);
  }

  /** US10: confirma a entrada (pedido de compra, estoque, contas a pagar e custo). */
  async confirmar(arquivo: File, dados: ConfirmarNotaEntradaDto): Promise<NotaEntradaDetalhe> {
    const fd = new FormData();
    fd.append('xml', arquivo);
    fd.append('dados', JSON.stringify(dados));
    return apiClient.postForm<NotaEntradaDetalhe>('/notas-entrada/xml/confirmar', fd);
  }

  async listar(filtros: FiltrosNotasEntrada = {}): Promise<NotasEntradaResponse> {
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
        params.append(chave, String(valor).trim());
      }
    }
    const query = params.toString();
    return apiClient.get<NotasEntradaResponse>(`/notas-entrada${query ? `?${query}` : ''}`);
  }

  async buscar(id: number): Promise<NotaEntradaDetalhe> {
    return apiClient.get<NotaEntradaDetalhe>(`/notas-entrada/${id}`);
  }

  async baixarXml(nota: Pick<NotaEntrada, 'id' | 'chave_acesso'>): Promise<void> {
    const blob = await apiClient.getBlob(`/notas-entrada/${nota.id}/xml`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe${nota.chave_acesso}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Cancela a entrada: cancela o pedido de compra (estorna estoque e contas a pagar). */
  async cancelar(id: number): Promise<NotaEntradaDetalhe> {
    return apiClient.post<NotaEntradaDetalhe>(`/notas-entrada/${id}/cancelar`, {});
  }

  /** Associa o código do produto no fornecedor (cProd) a um produto; troca se já existir. */
  async salvarVinculo(dados: SalvarVinculoDto): Promise<unknown> {
    return apiClient.put('/notas-entrada/vinculos', dados);
  }
}

export interface SalvarVinculoDto {
  fornecedor_id: number;
  codigo_fornecedor: string;
  produto_id: number;
  fator_conversao: number;
  unidade_fornecedor?: string;
}

export const notasEntradaService = new NotasEntradaService();

export interface ConfirmarNotaEntradaDto {
  data_entrada: string;
  forma_pagamento: FormaPagamento;
  usar_parcelas_xml?: boolean;
  data_vencimento?: string;
  cfops?: Array<{ n_item: number; cfop: string }>;
  fornecedor_id?: number;
}

export interface NotaEntrada {
  id: number;
  chave_acesso: string;
  numero: string;
  serie: string;
  data_emissao: string;
  data_entrada: string | null;
  situacao: 'EFETIVADA' | 'CANCELADA' | 'RASCUNHO';
  valor_total: number;
  emitente_nome: string;
  emitente_cpf_cnpj: string;
  fornecedor: { id: number; nome_fantasia: string } | null;
  pedido_id: number | null;
  numero_pedido: string | null;
}

export interface NotaEntradaDetalhe extends NotaEntrada {
  condicao_pagamento: string | null;
  valores: { produtos: number; frete: number; seguro: number; desconto: number; ipi: number; outros: number };
  itens: Array<{
    n_item: number;
    codigo_fornecedor: string;
    descricao: string;
    cfop_nota: string | null;
    cfop_entrada: string;
    unidade_nota: string | null;
    quantidade_nota: number;
    valor_total: number;
    fator_conversao: number;
    quantidade_estoque: number;
    custo_unitario: number;
    produto: { id: number; nome: string; unidade_medida: string };
  }>;
}

export interface FiltrosNotasEntrada {
  data_inicial?: string;
  data_final?: string;
  numero?: string;
  termo?: string;
  page?: number;
  limit?: number;
}

export interface NotasEntradaResponse {
  notas: NotaEntrada[];
  total: number;
  page: number;
  limit: number;
}
