/**
 * Serviço para relatórios de cliente
 * Implementa todas as funcionalidades de relatórios conforme GUIA_FRONTEND_RELATORIOS_CLIENTE.md
 */

import { apiClient, getApiBaseUrlPublic } from '@/services/api';

const API_BASE_URL = getApiBaseUrlPublic();

export interface CompartilharRelatorioParams {
  tipoRelatorio: 'financeiro' | 'producao';
  dataInicial?: string;
  dataFinal?: string;
  horasValidade?: number;
}

export interface CompartilharRelatorioResponse {
  token: string;
  url: string;
  linkWhatsApp: string;
  expiraEm: string;
}

export interface EnviarEmailParams {
  email: string;
  tipoRelatorio: 'financeiro' | 'producao';
  dataInicial?: string;
  dataFinal?: string;
}

export interface EnviarEmailResponse {
  success: boolean;
  message: string;
  email: string;
}

/** Mesmos filtros opcionais do GET /contas-financeiras/agrupado e do PDF financeiro. */
export interface RelatorioFinanceiroClienteQuery {
  dataInicial?: string;
  dataFinal?: string;
  /** PENDENTE, PAGO_PARCIAL, PAGO_TOTAL, VENCIDO, CANCELADO — omitir ou “Todos” = sem filtro */
  status?: string;
}

/** Mesmo filtro do relatório financeiro de cliente, aplicado ao fornecedor. */
export interface RelatorioFinanceiroFornecedorQuery {
  dataInicial?: string;
  dataFinal?: string;
  status?: string;
}

/** Filtros do relatório geral de contas a pagar. */
export interface RelatorioGeralContasPagarQuery {
  dataInicial?: string;
  dataFinal?: string;
  status?: string;
  fornecedorId?: number;
  rocaId?: number;
  /** Campo do período: vencimento (padrão) ou emissão */
  campoData?: 'vencimento' | 'emissao';
}

/** Filtros do relatório geral de contas a receber. */
export interface RelatorioGeralContasReceberQuery {
  dataInicial?: string;
  dataFinal?: string;
  status?: string;
  clienteId?: number;
  rocaId?: number;
  /** Campo do período: vencimento (padrão) ou emissão */
  campoData?: 'vencimento' | 'emissao';
}

/** Filtros do relatório por centro de custo. */
export interface RelatorioCentroCustoContasPagarQuery {
  dataInicial?: string;
  dataFinal?: string;
  status?: string;
  tipoDespesaId?: number;
}

class RelatoriosClienteService {
  private getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private async downloadPDF(
    endpoint: string,
    defaultFilename: string
  ): Promise<void> {
    const blob = await apiClient.getBlob(endpoint);

    if (!blob || blob.size === 0) {
      throw new Error('O PDF gerado está vazio');
    }

    const filename = defaultFilename.endsWith('.pdf')
      ? defaultFilename
      : `${defaultFilename}.pdf`;

    // Edge/IE legado
    const nav = window.navigator as Navigator & {
      msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean;
    };
    if (typeof nav.msSaveOrOpenBlob === 'function') {
      nav.msSaveOrOpenBlob(blob, filename);
      return;
    }

    const urlBlob = window.URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // Revogar depois para o Edge/Chrome concluírem o download
      setTimeout(() => window.URL.revokeObjectURL(urlBlob), 2500);
    }
  }

  private buildRelatorioFinanceiroQuery(filtros?: RelatorioFinanceiroClienteQuery): string {
    const params = new URLSearchParams();
    if (filtros?.dataInicial) params.append('data_inicial', filtros.dataInicial);
    if (filtros?.dataFinal) params.append('data_final', filtros.dataFinal);
    if (filtros?.status && filtros.status !== 'Todos') {
      params.append('status', filtros.status);
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  /**
   * Baixa o relatório financeiro de um cliente
   */
  async downloadRelatorioFinanceiro(
    clienteId: number,
    filtros?: RelatorioFinanceiroClienteQuery,
  ): Promise<void> {
    const query = this.buildRelatorioFinanceiroQuery(filtros);
    await this.downloadPDF(
      `/relatorios/cliente/${clienteId}/financeiro/pdf${query}`,
      `relatorio-financeiro-cliente-${clienteId}.pdf`
    );
  }

  /**
   * Abre o relatório financeiro para impressão
   */
  async imprimirRelatorioFinanceiro(
    clienteId: number,
    filtros?: RelatorioFinanceiroClienteQuery,
  ): Promise<void> {
    const query = this.buildRelatorioFinanceiroQuery(filtros);
    const blob = await apiClient.getBlob(
      `/relatorios/cliente/${clienteId}/financeiro/imprimir${query}`,
    );
    if (!blob || blob.size === 0) {
      throw new Error('O PDF gerado está vazio');
    }
    const urlBlob = window.URL.createObjectURL(blob);
    const printWindow = window.open(urlBlob, '_blank');
    if (!printWindow) {
      window.URL.revokeObjectURL(urlBlob);
      throw new Error(
        'Não foi possível abrir a janela de impressão. Permita pop-ups para este site e tente novamente.',
      );
    }
    printWindow.onload = () => {
      printWindow.print();
    };
    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 60_000);
  }

  private buildRelatorioFinanceiroFornecedorQuery(
    filtros?: RelatorioFinanceiroFornecedorQuery,
  ): string {
    const params = new URLSearchParams();
    if (filtros?.dataInicial) params.append('data_inicial', filtros.dataInicial);
    if (filtros?.dataFinal) params.append('data_final', filtros.dataFinal);
    if (filtros?.status && filtros.status !== 'Todos') {
      params.append('status', filtros.status);
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  async downloadRelatorioFinanceiroFornecedor(
    fornecedorId: number,
    filtros?: RelatorioFinanceiroFornecedorQuery,
  ): Promise<void> {
    const query = this.buildRelatorioFinanceiroFornecedorQuery(filtros);
    await this.downloadPDF(
      `/relatorios/fornecedor/${fornecedorId}/financeiro/pdf${query}`,
      `relatorio-financeiro-fornecedor-${fornecedorId}.pdf`
    );
  }

  async imprimirRelatorioFinanceiroFornecedor(
    fornecedorId: number,
    filtros?: RelatorioFinanceiroFornecedorQuery,
  ): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const query = this.buildRelatorioFinanceiroFornecedorQuery(filtros);
    const url = `${API_BASE_URL}/relatorios/fornecedor/${fornecedorId}/financeiro/imprimir${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}`);
    }

    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const printWindow = window.open(urlBlob, '_blank');

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 1000);
  }

  private buildRelatorioGeralContasPagarQuery(
    filtros?: RelatorioGeralContasPagarQuery,
  ): string {
    const params = new URLSearchParams();
    if (filtros?.dataInicial) params.append('data_inicial', filtros.dataInicial);
    if (filtros?.dataFinal) params.append('data_final', filtros.dataFinal);
    if (filtros?.status && filtros.status !== 'Todos') {
      params.append('status', filtros.status);
    }
    if (filtros?.fornecedorId != null && filtros.fornecedorId > 0) {
      params.append('fornecedor_id', String(filtros.fornecedorId));
    }
    if (filtros?.rocaId != null && filtros.rocaId > 0) {
      params.append('roca_id', String(filtros.rocaId));
    }
    if (filtros?.campoData === 'emissao' || filtros?.campoData === 'vencimento') {
      params.append('campo_data', filtros.campoData);
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  async downloadRelatorioGeralContasPagar(
    filtros?: RelatorioGeralContasPagarQuery,
  ): Promise<void> {
    const query = this.buildRelatorioGeralContasPagarQuery(filtros);
    await this.downloadPDF(
      `/relatorios/contas-pagar/geral/pdf${query}`,
      `relatorio-geral-contas-pagar.pdf`,
    );
  }

  async imprimirRelatorioGeralContasPagar(
    filtros?: RelatorioGeralContasPagarQuery,
  ): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const query = this.buildRelatorioGeralContasPagarQuery(filtros);
    const url = `${API_BASE_URL}/relatorios/contas-pagar/geral/imprimir${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}`);
    }

    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const printWindow = window.open(urlBlob, '_blank');

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 1000);
  }

  private buildRelatorioGeralContasReceberQuery(
    filtros?: RelatorioGeralContasReceberQuery,
  ): string {
    const params = new URLSearchParams();
    if (filtros?.dataInicial) params.append('data_inicial', filtros.dataInicial);
    if (filtros?.dataFinal) params.append('data_final', filtros.dataFinal);
    if (filtros?.status && filtros.status !== 'Todos') {
      params.append('status', filtros.status);
    }
    if (filtros?.clienteId != null && filtros.clienteId > 0) {
      params.append('cliente_id', String(filtros.clienteId));
    }
    if (filtros?.rocaId != null && filtros.rocaId > 0) {
      params.append('roca_id', String(filtros.rocaId));
    }
    if (filtros?.campoData === 'emissao' || filtros?.campoData === 'vencimento') {
      params.append('campo_data', filtros.campoData);
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  async downloadRelatorioGeralContasReceber(
    filtros?: RelatorioGeralContasReceberQuery,
  ): Promise<void> {
    const query = this.buildRelatorioGeralContasReceberQuery(filtros);
    await this.downloadPDF(
      `/relatorios/contas-receber/geral/pdf${query}`,
      `relatorio-geral-contas-receber.pdf`,
    );
  }

  async imprimirRelatorioGeralContasReceber(
    filtros?: RelatorioGeralContasReceberQuery,
  ): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const query = this.buildRelatorioGeralContasReceberQuery(filtros);
    const url = `${API_BASE_URL}/relatorios/contas-receber/geral/imprimir${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}`);
    }

    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const printWindow = window.open(urlBlob, '_blank');

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 1000);
  }

  private buildRelatorioCentroCustoContasPagarQuery(
    filtros?: RelatorioCentroCustoContasPagarQuery,
  ): string {
    const params = new URLSearchParams();
    if (filtros?.dataInicial) params.append('data_inicial', filtros.dataInicial);
    if (filtros?.dataFinal) params.append('data_final', filtros.dataFinal);
    if (filtros?.status && filtros.status !== 'Todos') {
      params.append('status', filtros.status);
    }
    if (filtros?.tipoDespesaId != null && filtros.tipoDespesaId > 0) {
      params.append('tipo_despesa_id', String(filtros.tipoDespesaId));
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  }

  async contarRelatorioCentroCustoContasPagar(
    filtros?: RelatorioCentroCustoContasPagarQuery,
  ): Promise<number> {
    const query = this.buildRelatorioCentroCustoContasPagarQuery(filtros);
    const data = await apiClient.get<{ total?: number | string }>(
      `/relatorios/contas-pagar/centro-custo/contagem${query}`,
    );
    const total = Number(data?.total ?? 0);
    return Number.isFinite(total) ? total : 0;
  }

  async downloadRelatorioCentroCustoContasPagar(
    filtros?: RelatorioCentroCustoContasPagarQuery,
  ): Promise<void> {
    const query = this.buildRelatorioCentroCustoContasPagarQuery(filtros);
    await this.downloadPDF(
      `/relatorios/contas-pagar/centro-custo/pdf${query}`,
      `relatorio-centro-custo.pdf`,
    );
  }

  async imprimirRelatorioCentroCustoContasPagar(
    filtros?: RelatorioCentroCustoContasPagarQuery,
  ): Promise<void> {
    const query = this.buildRelatorioCentroCustoContasPagarQuery(filtros);
    const blob = await apiClient.getBlob(
      `/relatorios/contas-pagar/centro-custo/imprimir${query}`,
    );
    if (!blob || blob.size === 0) {
      throw new Error('O PDF gerado está vazio');
    }
    const urlBlob = window.URL.createObjectURL(blob);
    const printWindow = window.open(urlBlob, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 1000);
  }

  /**
   * Baixa o relatório de produção de um cliente (com filtro de período opcional)
   */
  async downloadRelatorioProducao(
    clienteId: number,
    dataInicial?: string,
    dataFinal?: string
  ): Promise<void> {
    const params = new URLSearchParams();
    if (dataInicial) params.append('data_inicial', dataInicial);
    if (dataFinal) params.append('data_final', dataFinal);
    
    const queryString = params.toString();
    const endpoint = `/relatorios/cliente/${clienteId}/producao/pdf${queryString ? `?${queryString}` : ''}`;

    await this.downloadPDF(
      endpoint,
      `relatorio-producao-cliente-${clienteId}.pdf`
    );
  }

  /**
   * Abre o relatório de produção para impressão (com filtro de período opcional)
   */
  async imprimirRelatorioProducao(
    clienteId: number,
    dataInicial?: string,
    dataFinal?: string
  ): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const params = new URLSearchParams();
    if (dataInicial) params.append('data_inicial', dataInicial);
    if (dataFinal) params.append('data_final', dataFinal);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/relatorios/cliente/${clienteId}/producao/imprimir${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}`);
    }

    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    
    // Abrir em nova janela para impressão
    const printWindow = window.open(urlBlob, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // Limpar URL após um tempo
    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 1000);
  }

  /**
   * Gera link de compartilhamento para um relatório
   */
  async compartilharRelatorio(
    clienteId: number,
    params: CompartilharRelatorioParams
  ): Promise<CompartilharRelatorioResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const url = `${API_BASE_URL}/relatorios/cliente/${clienteId}/compartilhar`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}`);
    }

    const data: CompartilharRelatorioResponse = await response.json();
    return data;
  }

  /**
   * Envia relatório por email
   */
  async enviarRelatorioPorEmail(
    clienteId: number,
    params: EnviarEmailParams
  ): Promise<EnviarEmailResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const url = `${API_BASE_URL}/relatorios/cliente/${clienteId}/enviar-email`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}`);
    }

    const data: EnviarEmailResponse = await response.json();
    return data;
  }
}

export const relatoriosClienteService = new RelatoriosClienteService();















