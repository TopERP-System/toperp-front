import { apiClient } from './api';

const BASE = '/centro-custo';

export type ApiCentroCustoTipo = {
  id: number;
  nome: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type ApiCentroCustoPagamento = {
  id: number;
  valor: number;
  data: string;
};

export type ApiCentroCustoDespesa = {
  id: number;
  tipoId: number;
  tipoNome: string;
  rocaId: number;
  rocaNome: string;
  fornecedorId?: number | null;
  /** Conta a pagar espelhada (CPAG-…); necessário para abrir a tela de registrar pagamento. */
  contaFinanceiraId?: number | null;
  descricao: string;
  valor: number;
  data: string;
  dataPagamentoManual?: string | null;
  observacoes?: string | null;
  pagamentos: ApiCentroCustoPagamento[];
};

export type CentroCustoResumoModulo = {
  qAbertas: number;
  qQuitadas: number;
  valorAbertoTotal: number;
  valorPagoTotal: number;
};

export type CentroCustoDespesaPorTipo = {
  tipoId: number;
  nome: string;
  valor: number;
  quantidade: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

const PAGE = 15;

class CentroCustoService {
  listarTipos(
    page = 1,
    limit = PAGE,
  ): Promise<PaginatedResult<ApiCentroCustoTipo>> {
    const q = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return apiClient.get<PaginatedResult<ApiCentroCustoTipo>>(
      `${BASE}/tipos?${q}`,
    );
  }

  listarTiposOpcoes(): Promise<ApiCentroCustoTipo[]> {
    return apiClient.get<ApiCentroCustoTipo[]>(`${BASE}/tipos/opcoes`);
  }

  criarTipo(data: { nome: string }): Promise<ApiCentroCustoTipo> {
    return apiClient.post<ApiCentroCustoTipo>(`${BASE}/tipos`, data);
  }

  atualizarTipo(id: number, data: { nome: string }): Promise<ApiCentroCustoTipo> {
    return apiClient.patch<ApiCentroCustoTipo>(`${BASE}/tipos/${id}`, data);
  }

  excluirTipo(id: number): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`${BASE}/tipos/${id}`);
  }

  listarDespesas(
    page = 1,
    limit = PAGE,
    filtros?: {
      dataInicial?: string;
      dataFinal?: string;
      tipoId?: number;
      rocaId?: number;
      busca?: string;
      status?: 'ABERTO' | 'PARCIAL' | 'QUITADO';
    },
  ): Promise<PaginatedResult<ApiCentroCustoDespesa>> {
    const q = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filtros?.dataInicial?.trim()) {
      q.set('dataInicial', filtros.dataInicial.trim().slice(0, 10));
    }
    if (filtros?.dataFinal?.trim()) {
      q.set('dataFinal', filtros.dataFinal.trim().slice(0, 10));
    }
    if (filtros?.tipoId != null && filtros.tipoId > 0) {
      q.set('tipoId', String(filtros.tipoId));
    }
    if (filtros?.rocaId != null && filtros.rocaId > 0) {
      q.set('rocaId', String(filtros.rocaId));
    }
    if (filtros?.busca?.trim()) {
      q.set('busca', filtros.busca.trim());
    }
    if (filtros?.status) {
      q.set('status', filtros.status);
    }
    return apiClient.get<PaginatedResult<ApiCentroCustoDespesa>>(
      `${BASE}/despesas?${q}`,
    );
  }

  buscarDespesaPorId(id: number): Promise<ApiCentroCustoDespesa> {
    return apiClient.get<ApiCentroCustoDespesa>(`${BASE}/despesas/${id}`);
  }

  sincronizarContasFinanceiras(): Promise<{ alvo: number; criadas: number }> {
    return apiClient.post<{ alvo: number; criadas: number }>(
      `${BASE}/despesas/sincronizar-contas-financeiras`,
      {},
    );
  }

  agregarDespesasPorTipo(filtros?: {
    dataInicial?: string;
    dataFinal?: string;
    rocaId?: number;
  }): Promise<{ items: CentroCustoDespesaPorTipo[]; total: number }> {
    const q = new URLSearchParams();
    if (filtros?.dataInicial?.trim()) {
      q.set('dataInicial', filtros.dataInicial.trim().slice(0, 10));
    }
    if (filtros?.dataFinal?.trim()) {
      q.set('dataFinal', filtros.dataFinal.trim().slice(0, 10));
    }
    if (filtros?.rocaId != null && filtros.rocaId > 0) {
      q.set('rocaId', String(filtros.rocaId));
    }
    const qs = q.toString();
    return apiClient.get<{ items: CentroCustoDespesaPorTipo[]; total: number }>(
      `${BASE}/despesas/agregado-por-tipo${qs ? `?${qs}` : ''}`,
    );
  }

  resumoModulo(
    filtros?: {
      dataInicial?: string;
      dataFinal?: string;
      tipoId?: number;
      rocaId?: number;
      busca?: string;
      status?: 'ABERTO' | 'PARCIAL' | 'QUITADO';
    },
  ): Promise<CentroCustoResumoModulo> {
    const q = new URLSearchParams();
    if (filtros?.dataInicial?.trim()) {
      q.set('dataInicial', filtros.dataInicial.trim().slice(0, 10));
    }
    if (filtros?.dataFinal?.trim()) {
      q.set('dataFinal', filtros.dataFinal.trim().slice(0, 10));
    }
    if (filtros?.tipoId != null && filtros.tipoId > 0) {
      q.set('tipoId', String(filtros.tipoId));
    }
    if (filtros?.rocaId != null && filtros.rocaId > 0) {
      q.set('rocaId', String(filtros.rocaId));
    }
    if (filtros?.busca?.trim()) {
      q.set('busca', filtros.busca.trim());
    }
    if (filtros?.status) {
      q.set('status', filtros.status);
    }
    const qs = q.toString();
    return apiClient.get<CentroCustoResumoModulo>(
      `${BASE}/resumo${qs ? `?${qs}` : ''}`,
    );
  }

  criarDespesa(data: {
    tipoId: number;
    rocaId: number;
    descricao: string;
    valor: number;
    data: string;
    observacoes?: string;
    fornecedorId?: number;
  }): Promise<ApiCentroCustoDespesa> {
    return apiClient.post<ApiCentroCustoDespesa>(`${BASE}/despesas`, data);
  }

  atualizarDespesa(
    id: number,
    data: Partial<{
      tipoId: number;
      rocaId: number;
      descricao: string;
      valor: number;
      data: string;
      observacoes: string | null;
    }>,
  ): Promise<ApiCentroCustoDespesa> {
    return apiClient.patch<ApiCentroCustoDespesa>(`${BASE}/despesas/${id}`, data);
  }

  excluirDespesa(id: number): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`${BASE}/despesas/${id}`);
  }

  registrarPagamento(
    despesaId: number,
    data: { valor: number; data: string },
  ): Promise<ApiCentroCustoPagamento> {
    return apiClient.post<ApiCentroCustoPagamento>(
      `${BASE}/despesas/${despesaId}/pagamentos`,
      data,
    );
  }

  alterarDataPagamento(
    despesaId: number,
    data: { data: string },
  ): Promise<{ id: number; dataPagamentoManual: string | null }> {
    return apiClient.patch<{ id: number; dataPagamentoManual: string | null }>(
      `${BASE}/despesas/${despesaId}/data-pagamento`,
      data,
    );
  }
}

/** Centro de custo / despesa por roça */
export const centroCustoService = new CentroCustoService();
