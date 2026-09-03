// services/cnpj.service.ts

import { cleanDocument } from '@/lib/validators';
import { apiClient } from './api';

export interface ConsultaCnpjResponse {
  razaoSocial: string;
  nomeFantasia: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefones: string[];
  situacaoCadastral?: string | null;
  inscricaoEstadual?: string | null;
}

class CnpjService {
  /**
   * Consulta CNPJ na Receita Federal
   * @param cnpj CNPJ formatado (00.000.000/0000-00) ou apenas números
   * @returns Dados da empresa padronizados
   */
  async consultar(cnpj: string): Promise<ConsultaCnpjResponse> {
    // Remove máscara do CNPJ para enviar na URL
    const cnpjLimpo = cleanDocument(cnpj);

    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ inválido. Deve conter 14 dígitos.');
    }

    return apiClient.get<ConsultaCnpjResponse>(`/cnpj/consulta/${cnpjLimpo}`);
  }

  /**
   * Consulta CNPJ específico para clientes
   * GET /clientes/consulta-cnpj/:cnpj
   */
  async consultarParaCliente(cnpj: string): Promise<ConsultaCnpjResponse> {
    const cnpjLimpo = cleanDocument(cnpj);
    
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ inválido. Deve conter 14 dígitos.');
    }

    return apiClient.get<ConsultaCnpjResponse>(`/clientes/consulta-cnpj/${cnpjLimpo}`);
  }

  /**
   * Consulta CNPJ específico para fornecedores
   * GET /fornecedor/consulta-cnpj/:cnpj
   */
  async consultarParaFornecedor(cnpj: string): Promise<ConsultaCnpjResponse> {
    const cnpjLimpo = cleanDocument(cnpj);
    
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ inválido. Deve conter 14 dígitos.');
    }

    return apiClient.get<ConsultaCnpjResponse>(`/fornecedor/consulta-cnpj/${cnpjLimpo}`);
  }
}

export const cnpjService = new CnpjService();
