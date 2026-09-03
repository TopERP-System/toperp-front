import { apiClient } from './api';

export interface ContaFinanceira {
  id: number;
  numero_conta: string;
  tipo: 'RECEBER' | 'PAGAR';
  pedido_id?: number;
  cliente_id?: number;
  fornecedor_id?: number;
  roca_id?: number;
  /** Preenchido em listagens com JOIN (tb_roca). */
  roca_nome?: string | null;
  descricao: string;
  valor_original: number;
  valor_pago: number;
  valor_restante: number;
  /** Modelo por saldo — preferir sobre valor_original quando presente. */
  valor_total?: number;
  /** Modelo por saldo: pode vir preenchido quando `valor_restante` estiver 0 desatualizado. */
  valor_em_aberto?: number;
  numero_parcela?: number;
  total_parcelas?: number;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  data_prevista?: string | null;
  previsao?: boolean;
  data_pagamento?: string;
  status: 'PENDENTE' | 'PAGO_PARCIAL' | 'PAGO_TOTAL' | 'VENCIDO' | 'CANCELADO' | 'PREVISAO' | 'ABERTO' | 'PARCIAL' | 'QUITADO';
  forma_pagamento?: 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO' | 'TRANSFERENCIA' | 'CHEQUE';
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  // Campos calculados pelo backend (conforme GUIA_PRAZO_VALIDADE_PAGAMENTOS.md)
  dias_ate_vencimento?: number;        // Ex: -5 (vencida há 5 dias), 0 (vence hoje), 5 (vence em 5 dias)
  status_vencimento?: string;           // Ex: "Vencida há 5 dias", "Vence hoje", "Vence em 5 dias"
  proximidade_vencimento?: 'VENCIDA' | 'VENCE_HOJE' | 'CRITICO' | 'ATENCAO' | 'NORMAL' | 'LONGO_PRAZO';
}

export interface CreateContaFinanceiraDto {
  tipo: 'RECEBER' | 'PAGAR';
  pedido_id?: number | null;
  cliente_id?: number | null;
  fornecedor_id?: number | null;
  roca_id?: number | null;
  descricao: string;
  valor_original: number;
  previsao?: boolean;
  data_prevista?: string;
  data_emissao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  forma_pagamento?: 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO' | 'TRANSFERENCIA' | 'CHEQUE';
  observacoes?: string;
}

export interface ContasFinanceirasResponse {
  data: ContaFinanceira[];
  total: number;
  page: number;
  limit: number;
}

/** Resposta do endpoint GET /contas-financeiras/:id/detalhe (modal Visualizar) */
export interface ContaFinanceiraDetalhe {
  id: number;
  numero_conta: string;
  tipo: string;
  descricao: string;
  descricao_parcelas_quitadas: string;
  valor_total_pedido: number;
  valor_pago: number;
  valor_em_aberto: number;
  status: string;
  status_original: string;
  previsao?: boolean;
  data_prevista?: string | null;
  cliente_id?: number | null;
  roca_id?: number | null;
  forma_pagamento?: string | null;
  observacoes?: string | null;
  relacionamentos: {
    cliente_nome: string | null;
    fornecedor_nome: string | null;
    pedido_numero: string | null;
    nome_produto: string | null;
    roca_nome?: string | null;
  };
  datas: {
    data_criacao: string | null;
    data_vencimento: string | null;
    data_pagamento: string | null;
  };
  pagamento: {
    forma_pagamento: string | null;
  };
  parcelas: {
    numero_parcela_atual: number | null;
    total_parcelas: number | null;
    texto_parcelas_quitadas: string | null;
  };
  dias_ate_vencimento?: number;
  status_vencimento?: string;
  proximidade_vencimento?: string;
}

export interface ContaFinanceiraAgrupada {
  id: number;
  pedido_id: number | null;
  cliente_nome: string;
  descricao: string;
  tipo: 'RECEBER' | 'PAGAR';
  categoria: string;
  valor_total: number;
  /** Valor da parcela associada ao próximo vencimento exibido. */
  valor_parcela?: number;
  valor_pago?: number;
  status: string;
  roca_nome?: string | null;
  numero_pedido?: string | null;
  qtd_parcelas?: number;
  primeira_data_vencimento?: string | null;
  ultima_data_vencimento?: string | null;
}

export interface ContasAgrupadasResponse {
  itens: ContaFinanceiraAgrupada[];
  total: number;
}

/** Resumo de conta PAGAR órfã (centro de custo sem vínculo em despesa). */
export interface ContaOrfaCentroCustoResumo {
  id: number;
  numero_conta: string;
  descricao: string;
  valor_original: string | number;
  valor_pago: string | number;
  valor_total?: string | number | null;
  status: string;
  data_vencimento: string;
}

export interface ListarOrfasPagarCentroCustoResponse {
  total: number;
  itens: ContaOrfaCentroCustoResumo[];
}

export interface RemoverOrfasPagarCentroCustoResponse {
  removidas: number;
  ids: number[];
}

export interface DashboardFinanceiro {
  total: number;
  vencidas: number;
  vencendo_hoje: number;
  vencendo_esta_semana: number;
  vencendo_este_mes: number;
  // Campos adicionais conforme guia do backend
  valor_total_vencidas?: number;
  valor_total_vencendo_hoje?: number;
  valor_total_vencendo_esta_semana?: number;
  valor_total_vencendo_este_mes?: number;
  valor_total_pendente?: number;
  valor_total_receber?: number;
  valor_total_recebido?: number;
  valor_total_pagar?: number;
  valor_total_pago?: number;
  /** Soma de valor_pago de todas as contas a pagar (contabilizado) */
  valor_total_pago_contabilizado?: number;
}

/** Linhas do painel “acompanhamento financeiro” (planilha de referência). */
export type PainelAcompanhamentoFinanceiro = {
  linha_registrado: {
    compras: number;
    despesas: number;
    vendas: number;
    saldo: number;
  };
  linha_caixa: {
    compras: number;
    despesas: number;
    vendas: number;
    saldo: number;
  };
  linha_totais_periodo: {
    compras: number;
    despesas: number;
    vendas: number;
    saldo: number;
  };
};

export interface ResumoFinanceiro {
  contas_receber: {
    total: number;
    pendentes: number;
    pagas: number;
    vencidas: number;
    valor_total_receber: number;   // Valor original total (todas as contas)
    valor_total_recebido: number;   // ✅ Valor realmente recebido (via baixas) - total geral
    valor_total_pendente: number;  // ✅ Valor realmente em aberto
    receita_mes: number;           // ⭐ NOVO: Receita do mês atual (valor total a receber do mês)
    valor_pago_mes: number;        // Valor pago no mês atual (via pagamentos)
  };
  contas_pagar: {
    total: number;
    pendentes: number;
    pagas: number;
    vencidas: number;
    valor_total_pagar: number;     // Valor original total
    valor_total_pago: number;      // ✅ Valor realmente pago - total geral
    valor_total_pendente: number;  // ✅ Valor realmente em aberto
    despesa_mes: number;            // ⭐ NOVO: Despesa do mês atual (valor total a pagar do mês)
    valor_pago_mes: number;        // ⭐ NOVO: Valor pago no mês atual
  };
  painel_acompanhamento?: PainelAcompanhamentoFinanceiro;
}

/** Resposta GET /financeiro/dashboard — contrato unificado (GUIA_IMPLEMENTACAO_FRONTEND_FINANCEIRO) */
export interface DashboardUnificado {
  contas_receber: {
    total: number;
    pendentes: number;
    pagas: number;
    vencidas: number;
    valor_total_receber: number;
    valor_total_recebido: number;
    valor_total_pendente: number;
    receita_mes: number;
    valor_pago_mes: number;
  };
  contas_pagar: {
    total: number;
    pendentes: number;
    pagas: number;
    vencidas: number;
    valor_total_pagar: number;
    valor_total_pago: number;
    valor_total_pendente: number;
    despesa_mes?: number;
    valor_pago_mes?: number;
  };
  saldo_atual: number;
  /** Painel estilo planilha (GET /financeiro/dashboard). */
  painel_acompanhamento?: PainelAcompanhamentoFinanceiro;
}

export type FluxoCaixaLinhaTipo =
  | 'secao'
  | 'item'
  | 'subtotal'
  | 'saldo-dia'
  | 'saldo-acumulado';

export interface FluxoCaixaColuna {
  data: string;
  label: string;
  weekday: string;
}

export interface FluxoCaixaLinha {
  id: string;
  label: string;
  tipo: FluxoCaixaLinhaTipo;
  secao?: 'entradas' | 'saidas';
  valores: (number | null)[];
  indent?: boolean;
  origem?: 'pedido_venda' | 'pedido_compra' | 'centro_custo' | 'previsao_entrada';
  tipo_id?: number;
}

export interface FluxoCaixaResponse {
  periodo: { inicio: string; fim: string };
  filtros: { roca_id?: number };
  cards: {
    saldo_inicial: number;
    total_a_receber: number;
    previsao_entrada: number;
    total_a_pagar: number;
    saldo_projetado: number;
  };
  colunas: FluxoCaixaColuna[];
  linhas: FluxoCaixaLinha[];
}

export interface FluxoCaixaDetalheItem {
  id: number;
  tipo_parte: 'cliente' | 'fornecedor';
  nome: string;
  valor: number;
  descricao?: string | null;
}

export interface FluxoCaixaDetalheResponse {
  data: string;
  linha_id: string;
  label: string;
  itens: FluxoCaixaDetalheItem[];
  total: number;
}

class FinanceiroService {
  async listarAgrupado(params?: {
    page?: number;
    limit?: number;
    tipo?: string;
    status?: string;
    cliente_id?: number;
    fornecedor_id?: number;
    roca_id?: number;
    data_inicial?: string;
    data_final?: string;
    busca?: string;
  }): Promise<ContasAgrupadasResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id.toString());
    if (params?.fornecedor_id) queryParams.append('fornecedor_id', params.fornecedor_id.toString());
    if (params?.roca_id != null && params.roca_id > 0) {
      queryParams.append('roca_id', params.roca_id.toString());
    }
    if (params?.data_inicial) queryParams.append('data_inicial', params.data_inicial);
    if (params?.data_final) queryParams.append('data_final', params.data_final);
    if (params?.busca?.trim()) queryParams.append('busca', params.busca.trim());

    const query = queryParams.toString();
    return apiClient.get<ContasAgrupadasResponse>(`/contas-financeiras/agrupado${query ? `?${query}` : ''}`);
  }

  async listar(params?: {
    page?: number;
    limit?: number;
    tipo?: string;
    status?: string;
    cliente_id?: number;
    fornecedor_id?: number;
    roca_id?: number;
    tipo_despesa_id?: number;
    pedido_id?: number;
    proximidade_vencimento?: 'VENCIDA' | 'VENCE_HOJE' | 'CRITICO' | 'ATENCAO' | 'NORMAL' | 'LONGO_PRAZO';
    dias_maximos?: number;
    data_inicial?: string;
    data_final?: string;
    campo_data?: 'vencimento' | 'emissao';
    busca?: string;
  }): Promise<ContasFinanceirasResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id.toString());
    if (params?.fornecedor_id) queryParams.append('fornecedor_id', params.fornecedor_id.toString());
    if (params?.roca_id != null && params.roca_id > 0) {
      queryParams.append('roca_id', params.roca_id.toString());
    }
    if (params?.tipo_despesa_id != null && params.tipo_despesa_id > 0) {
      queryParams.append('tipo_despesa_id', params.tipo_despesa_id.toString());
    }
    if (params?.pedido_id) queryParams.append('pedido_id', params.pedido_id.toString());
    if (params?.proximidade_vencimento) queryParams.append('proximidade_vencimento', params.proximidade_vencimento);
    if (params?.dias_maximos !== undefined) queryParams.append('dias_maximos', params.dias_maximos.toString());
    if (params?.data_inicial) queryParams.append('data_inicial', params.data_inicial);
    if (params?.data_final) queryParams.append('data_final', params.data_final);
    if (params?.busca?.trim()) queryParams.append('busca', params.busca.trim());
    if (params?.campo_data === 'emissao' || params?.campo_data === 'vencimento') {
      queryParams.append('campo_data', params.campo_data);
    }

    const query = queryParams.toString();
    return apiClient.get<ContasFinanceirasResponse>(`/contas-financeiras${query ? `?${query}` : ''}`);
  }

  async buscarPorPedido(pedidoId: number): Promise<ContaFinanceira[]> {
    const response = await this.listar({ pedido_id: pedidoId, limit: 100 });
    // A API pode retornar em diferentes formatos
    if (Array.isArray(response)) {
      return response;
    }
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if ((response as any).contas && Array.isArray((response as any).contas)) {
      return (response as any).contas;
    }
    return [];
  }

  async buscarPorId(id: number): Promise<ContaFinanceira> {
    return apiClient.get<ContaFinanceira>(`/contas-financeiras/${id}`);
  }

  /** Detalhe enriquecido para o modal Visualizar (não usar para edição) */
  async buscarDetalhePorId(id: number): Promise<ContaFinanceiraDetalhe> {
    return apiClient.get<ContaFinanceiraDetalhe>(`/contas-financeiras/${id}/detalhe`);
  }

  async criar(data: CreateContaFinanceiraDto): Promise<ContaFinanceira> {
    return apiClient.post<ContaFinanceira>('/contas-financeiras', data);
  }

  async atualizar(
    id: number | string,
    data: Partial<
      CreateContaFinanceiraDto & {
        status?: ContaFinanceira['status'];
        valor_pago?: number;
      }
    >,
  ): Promise<ContaFinanceira> {
    // Garantir que o ID seja um número
    const contaId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (isNaN(contaId) || contaId <= 0) {
      const error = new Error(`ID inválido: ${id}`);
      console.error('❌ [FinanceiroService]', error.message);
      throw error;
    }
    
    // Remover campos undefined/null do payload para evitar erros no backend
    const payload: Record<string, any> = {};
    
    // Função auxiliar para verificar se um valor deve ser incluído
    const shouldInclude = (value: any): boolean => {
      return value !== undefined && value !== null && value !== '';
    };
    
    // Não enviar `tipo` no PATCH: o backend não permite alterar o tipo da conta; enviar PAGAR
    // junto com um subconjunto de campos dispara a validação de “origem obrigatória” do DTO
    // como se fosse criação parcial e falha (ex.: sem roca_id no JSON mesmo com roça no formulário).
    if (shouldInclude(data.descricao)) payload.descricao = typeof data.descricao === 'string' ? data.descricao.trim() : data.descricao;
    if (shouldInclude(data.valor_original)) payload.valor_original = Number(data.valor_original);
    if (data.valor_pago !== undefined && data.valor_pago !== null && !Number.isNaN(Number(data.valor_pago))) {
      payload.valor_pago = Number(Number(data.valor_pago).toFixed(2));
    }
    if (shouldInclude(data.data_emissao)) payload.data_emissao = data.data_emissao;
    if (shouldInclude(data.data_vencimento)) payload.data_vencimento = data.data_vencimento;
    if (shouldInclude(data.data_pagamento)) payload.data_pagamento = data.data_pagamento;
    
    // Status - garantir que seja uma string válida
    if (data.status !== undefined && data.status !== null) {
      const statusValue = typeof data.status === 'string' ? data.status.toUpperCase() : data.status;
      // Validar que o status é um dos valores permitidos
      const validStatuses = ['PENDENTE', 'PAGO_PARCIAL', 'PAGO_TOTAL', 'VENCIDO', 'CANCELADO'];
      if (validStatuses.includes(statusValue as string)) {
        payload.status = statusValue;
      } else {
        console.warn(`⚠️ [FinanceiroService] Status inválido: ${statusValue}. Valores permitidos: ${validStatuses.join(', ')}`);
      }
    }
    
    if (shouldInclude(data.forma_pagamento)) payload.forma_pagamento = data.forma_pagamento;
    const includeOptionalId = (
      field: 'cliente_id' | 'fornecedor_id' | 'pedido_id',
    ) => {
      const value = data[field];
      if (value === undefined) return;
      if (value === null) {
        payload[field] = null;
        return;
      }
      const id = Number(value);
      if (Number.isFinite(id) && id > 0) {
        payload[field] = id;
      }
    };
    includeOptionalId('cliente_id');
    includeOptionalId('fornecedor_id');
    includeOptionalId('pedido_id');
    /** Obrigatório para validação PAGAR (fornecedor | roça | pedido); antes era omitido e o PATCH falhava. */
    if (data.roca_id !== undefined) {
      if (data.roca_id === null) {
        payload.roca_id = null;
      } else {
        const rid = Number(data.roca_id);
        if (Number.isFinite(rid) && rid > 0) {
          payload.roca_id = rid;
        }
      }
    }
    if (shouldInclude(data.observacoes)) payload.observacoes = typeof data.observacoes === 'string' ? data.observacoes.trim() : data.observacoes;

    // Log detalhado em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('📤 [FinanceiroService] Atualizando conta financeira:', {
        idOriginal: id,
        idConvertido: contaId,
        dadosRecebidos: data,
        payload,
        payloadJSON: JSON.stringify(payload, null, 2),
        endpoint: `/contas-financeiras/${contaId}`,
        metodo: 'PATCH',
        camposIncluidos: Object.keys(payload),
      });
    }

    // Validar que pelo menos um campo foi incluído
    if (Object.keys(payload).length === 0) {
      const error = new Error('Nenhum campo válido para atualização');
      console.error('❌ [FinanceiroService]', error.message, { id: contaId, data });
      throw error;
    }

    try {
      const response = await apiClient.patch<ContaFinanceira>(`/contas-financeiras/${contaId}`, payload);
      
      // Log da resposta em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('✅ [FinanceiroService] Conta atualizada com sucesso:', {
          id: contaId,
          response,
        });
      }
      
      return response;
    } catch (error: any) {
      // Log detalhado do erro em desenvolvimento
      if (import.meta.env.DEV) {
        console.error('❌ [FinanceiroService] Erro ao atualizar conta:', {
          idOriginal: id,
          idConvertido: contaId,
          error,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
          payloadEnviado: payload,
          payloadJSON: JSON.stringify(payload, null, 2),
          stack: error?.stack,
        });
        
        // Tentar extrair mais informações do erro
        if (error?.response?.data) {
          console.error('📋 [FinanceiroService] Detalhes do erro do backend:', {
            errorData: error.response.data,
            errorDataJSON: JSON.stringify(error.response.data, null, 2),
            errorMessage: error.response.data?.message,
            errorError: error.response.data?.error,
            errorErrors: error.response.data?.errors,
          });
        }
      }
      throw error;
    }
  }

  async deletar(id: number): Promise<void> {
    return apiClient.delete<void>(`/contas-financeiras/${id}`);
  }

  /** Pré-visualização de contas a pagar órfãs (duplicatas de centro de custo). */
  async listarOrfasPagarCentroCusto(): Promise<ListarOrfasPagarCentroCustoResponse> {
    return apiClient.get<ListarOrfasPagarCentroCustoResponse>(
      '/contas-financeiras/pagar/orfas-centro-custo',
    );
  }

  /** Remove em lote as contas retornadas por listarOrfasPagarCentroCusto. */
  async removerOrfasPagarCentroCusto(): Promise<RemoverOrfasPagarCentroCustoResponse> {
    return apiClient.delete<RemoverOrfasPagarCentroCustoResponse>(
      '/contas-financeiras/pagar/orfas-centro-custo',
    );
  }

  async cancelar(id: number): Promise<ContaFinanceira> {
    return apiClient.patch<ContaFinanceira>(`/contas-financeiras/${id}/cancelar`, {});
  }

  async getDashboardReceber(params?: {
    mes?: number;
    ano?: number;
    mes_ano?: string;
    data_inicial?: string;
    data_final?: string;
    dataInicial?: string;
    dataFinal?: string;
  }): Promise<DashboardFinanceiro> {
    const q = new URLSearchParams();
    if (params?.mes) q.append('mes', params.mes.toString());
    if (params?.ano) q.append('ano', params.ano.toString());
    if (params?.mes_ano) q.append('mes_ano', params.mes_ano);
    if (params?.data_inicial) q.append('data_inicial', params.data_inicial);
    if (params?.data_final) q.append('data_final', params.data_final);
    if (params?.dataInicial) q.append('dataInicial', params.dataInicial);
    if (params?.dataFinal) q.append('dataFinal', params.dataFinal);
    const query = q.toString();
    return apiClient.get<DashboardFinanceiro>(`/contas-financeiras/dashboard/receber${query ? `?${query}` : ''}`);
  }

  async getDashboardPagar(params?: {
    mes?: number;
    ano?: number;
    mes_ano?: string;
    data_inicial?: string;
    data_final?: string;
    dataInicial?: string;
    dataFinal?: string;
  }): Promise<DashboardFinanceiro> {
    const q = new URLSearchParams();
    if (params?.mes) q.append('mes', params.mes.toString());
    if (params?.ano) q.append('ano', params.ano.toString());
    if (params?.mes_ano) q.append('mes_ano', params.mes_ano);
    if (params?.data_inicial) q.append('data_inicial', params.data_inicial);
    if (params?.data_final) q.append('data_final', params.data_final);
    if (params?.dataInicial) q.append('dataInicial', params.dataInicial);
    if (params?.dataFinal) q.append('dataFinal', params.dataFinal);
    const query = q.toString();
    return apiClient.get<DashboardFinanceiro>(`/contas-financeiras/dashboard/pagar${query ? `?${query}` : ''}`);
  }

  async getDashboardResumo(params?: {
    mes?: number;
    ano?: number;
    mes_ano?: string;
    data_inicial?: string;
    data_final?: string;
    tipo?: string;
    cliente_id?: number;
    fornecedor_id?: number;
  }): Promise<ResumoFinanceiro> {
    const q = new URLSearchParams();
    if (params?.mes) q.append('mes', params.mes.toString());
    if (params?.ano) q.append('ano', params.ano.toString());
    if (params?.mes_ano) q.append('mes_ano', params.mes_ano);
    if (params?.data_inicial) q.append('data_inicial', params.data_inicial);
    if (params?.data_final) q.append('data_final', params.data_final);
    if (params?.tipo) q.append('tipo', params.tipo);
    if (params?.cliente_id != null) q.append('cliente_id', params.cliente_id.toString());
    if (params?.fornecedor_id != null) q.append('fornecedor_id', params.fornecedor_id.toString());
    const query = q.toString();
    return apiClient.get<ResumoFinanceiro>(`/contas-financeiras/dashboard/resumo${query ? `?${query}` : ''}`);
  }

  async getTotalRecebido(params?: { data_inicial?: string; data_final?: string }): Promise<{ totalRecebido: number }> {
    const q = new URLSearchParams();
    if (params?.data_inicial) q.append('data_inicial', params.data_inicial);
    if (params?.data_final) q.append('data_final', params.data_final);
    const query = q.toString();
    const response = await apiClient.get<{ totalRecebido: number }>(`/contas-financeiras/dashboard/total-recebido${query ? `?${query}` : ''}`);
    
    // Debug: log para verificar resposta do backend
    if (import.meta.env.DEV) {
      console.log('[FinanceiroService] getTotalRecebido resposta:', {
        response,
        totalRecebido: response?.totalRecebido,
        tipo: typeof response?.totalRecebido,
        aviso: response?.totalRecebido === 0 
          ? '⚠️ Backend retornou 0. Verificar se há pagamentos registrados.' 
          : response?.totalRecebido === undefined
          ? '⚠️ Campo totalRecebido não encontrado na resposta'
          : '✅ Valor recebido corretamente',
      });
    }
    
    return response;
  }

  /**
   * Dashboard unificado — GET /financeiro/dashboard (GUIA_IMPLEMENTACAO_FRONTEND_FINANCEIRO).
   * Aceita filtros opcionais para cards filtráveis.
   */
  async getDashboardUnificado(params?: {
    data_inicial?: string;
    data_final?: string;
    tipo?: string;
    cliente_id?: number;
    fornecedor_id?: number;
    /** Filtra competência e centro de custo pela roça (contas e despesas do centro). */
    roca_id?: number;
    /** Quando true, o backend retorna `linha_totais_periodo` acumulado (histórico), não só o intervalo. */
    painel_totais_gerais?: boolean;
    /**
     * Com `painel_totais_gerais`: `emissao` (omitir) = competência acumulada;
     * `pagos` = caixa acumulado; `a_receber` = saldos em aberto nas contas.
     */
    painel_totais_gerais_modo?: 'emissao' | 'pagos' | 'a_receber';
  }): Promise<DashboardUnificado> {
    const q = new URLSearchParams();
    if (params?.data_inicial) q.append('data_inicial', params.data_inicial);
    if (params?.data_final) q.append('data_final', params.data_final);
    if (params?.tipo) q.append('tipo', params.tipo);
    if (params?.cliente_id != null) q.append('cliente_id', params.cliente_id.toString());
    if (params?.fornecedor_id != null) q.append('fornecedor_id', params.fornecedor_id.toString());
    if (params?.roca_id != null && params.roca_id > 0) {
      q.append('roca_id', params.roca_id.toString());
    }
    if (params?.painel_totais_gerais) q.append('painel_totais_gerais', '1');
    if (
      params?.painel_totais_gerais &&
      params?.painel_totais_gerais_modo &&
      params.painel_totais_gerais_modo !== 'emissao'
    ) {
      q.append('painel_totais_gerais_modo', params.painel_totais_gerais_modo);
    }
    const query = q.toString();
    return apiClient.get<DashboardUnificado>(`/financeiro/dashboard${query ? `?${query}` : ''}`);
  }

  /**
   * Baixa o PDF do Recibo de Pagamento (Fechamento de Fatura) da conta financeira.
   * GET /contas-financeiras/:id/recibo/pdf
   */
  async downloadReciboPagamento(contaId: number): Promise<void> {
    const blob = await apiClient.getBlob(`/contas-financeiras/${contaId}/recibo/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-pagamento-${contaId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Retorna o ID da primeira conta financeira vinculada ao pedido (para gerar recibo).
   * @param tipo Opcional: 'RECEBER' | 'PAGAR' para filtrar (ex.: Contas a Pagar usa 'PAGAR').
   */
  async getContaIdPorPedidoId(pedidoId: number, tipo?: 'RECEBER' | 'PAGAR'): Promise<number | null> {
    const contas = await this.buscarPorPedido(pedidoId);
    if (!contas?.length) return null;
    const primeira = tipo ? contas.find((c) => c.tipo === tipo) ?? contas[0] : contas[0];
    return primeira?.id ?? null;
  }

  /**
   * Listagem contas a receber do módulo financeiro — GET /financeiro/contas-receber.
   * 1 linha por pedido; mesmo formato de GET /pedidos/contas-receber.
   */
  async listarContasReceberFinanceiro(params?: Record<string, string | number | undefined>): Promise<Array<{
    pedido_id: number;
    numero_pedido: string;
    cliente_id?: number;
    cliente_nome?: string | null;
    valor_total: number;
    valor_pago: number;
    valor_em_aberto: number;
    status: string;
    data_vencimento: string | null;
    data_pedido: string;
    forma_pagamento: string;
  }>> {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') q.append(k, String(v));
      });
    }
    const query = q.toString();
    const list = await apiClient.get<any[]>(`/financeiro/contas-receber${query ? `?${query}` : ''}`);
    return Array.isArray(list) ? list : [];
  }

  /**
   * GET /financeiro/fluxo-caixa — projeção diária por vencimentos e despesas CC.
   */
  async obterFluxoCaixa(params: {
    data_inicial: string;
    data_final: string;
    roca_id?: number;
  }): Promise<FluxoCaixaResponse> {
    const q = new URLSearchParams();
    q.append('data_inicial', params.data_inicial);
    q.append('data_final', params.data_final);
    if (params.roca_id != null && params.roca_id > 0) {
      q.append('roca_id', String(params.roca_id));
    }
    return apiClient.get<FluxoCaixaResponse>(`/financeiro/fluxo-caixa?${q.toString()}`);
  }

  /**
   * GET /financeiro/fluxo-caixa/detalhe — lançamentos (nome + valor) de uma célula.
   */
  async obterFluxoCaixaDetalhe(params: {
    data: string;
    linha_id: string;
    tipo_id?: number;
    roca_id?: number;
  }): Promise<FluxoCaixaDetalheResponse> {
    const q = new URLSearchParams();
    q.append('data', params.data);
    q.append('linha_id', params.linha_id);
    if (params.tipo_id != null && params.tipo_id > 0) {
      q.append('tipo_id', String(params.tipo_id));
    }
    if (params.roca_id != null && params.roca_id > 0) {
      q.append('roca_id', String(params.roca_id));
    }
    return apiClient.get<FluxoCaixaDetalheResponse>(
      `/financeiro/fluxo-caixa/detalhe?${q.toString()}`,
    );
  }
}

export const financeiroService = new FinanceiroService();

