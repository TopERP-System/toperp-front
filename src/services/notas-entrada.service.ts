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
  /** Lê o XML da NF-e de compra e devolve a prévia (não grava nada). */
  async previaXml(arquivo: File): Promise<NotaEntradaPrevia> {
    const fd = new FormData();
    fd.append('xml', arquivo);
    return apiClient.postForm<NotaEntradaPrevia>('/notas-entrada/xml/previa', fd);
  }
}

export const notasEntradaService = new NotasEntradaService();
