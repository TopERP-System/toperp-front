import { normalizeString } from '@/lib/contas-financeiras.utils';
import type { ContaPagar, ContaReceber, FiltrosContasPagar, FiltrosContasReceber } from '@/types/contas-financeiras.types';
import {
    AtualizarCondicaoPagamentoPayload,
    CreatePedidoDto,
    DashboardPedidos,
    FiltrosPedidos,
    Pedido,
    PedidosResponse,
} from '@/types/pedido';
import type { ItemHistoricoPagamento, RegistrarPagamentoBody, ResumoFinanceiroPedido } from '@/types/pedido-financeiro.types';
import { apiClient } from './api';
import type { ConfirmarPagamentoPayload } from './contas-receber.service';

/** Resposta de GET /pedidos/relatorio/compras-cliente */
export interface RelatorioComprasClienteResponse {
  cliente: { id: number; nome: string };
  periodo: { inicio: string; fim: string };
  filtros_aplicados: { status: string };
  itens: Array<{
    data: string;
    produto_nome: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    numero_pedido: string;
    pedido_id: number;
  }>;
  total_geral: number;
}

// Re-exportar tipos para compatibilidade
export type { PedidoItem as ItemPedido } from '@/types/pedido';
export type { CreatePedidoDto, DashboardPedidos, FiltrosPedidos, Pedido, PedidosResponse };

class PedidosService {
  /**
   * Relatório de produtos por cliente — GET /pedidos/relatorio/compras-cliente
   */
  async getRelatorioComprasCliente(params: {
    cliente_id: number;
    data_inicial: string;
    data_final: string;
    /** Todos | PENDENTE | PAGO_PARCIAL | PAGO_TOTAL | VENCIDO | CANCELADO */
    status?: string;
  }): Promise<RelatorioComprasClienteResponse> {
    const q = new URLSearchParams();
    q.set('cliente_id', String(params.cliente_id));
    q.set('data_inicial', params.data_inicial);
    q.set('data_final', params.data_final);
    q.set('status', params.status ?? 'Todos');
    return apiClient.get<RelatorioComprasClienteResponse>(
      `/pedidos/relatorio/compras-cliente?${q.toString()}`,
    );
  }

  /** GET /pedidos/relatorio/compras-cliente/pdf — mesmo filtro do JSON */
  async downloadRelatorioComprasClientePdf(params: {
    cliente_id: number;
    data_inicial: string;
    data_final: string;
    status?: string;
  }): Promise<void> {
    const q = new URLSearchParams();
    q.set('cliente_id', String(params.cliente_id));
    q.set('data_inicial', params.data_inicial);
    q.set('data_final', params.data_final);
    q.set('status', params.status ?? 'Todos');
    const blob = await apiClient.getBlob(
      `/pedidos/relatorio/compras-cliente/pdf?${q.toString()}`,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-produtos-cliente-${params.data_inicial}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async printRelatorioComprasClientePdf(params: {
    cliente_id: number;
    data_inicial: string;
    data_final: string;
    status?: string;
  }): Promise<void> {
    const q = new URLSearchParams();
    q.set('cliente_id', String(params.cliente_id));
    q.set('data_inicial', params.data_inicial);
    q.set('data_final', params.data_final);
    q.set('status', params.status ?? 'Todos');
    const blob = await apiClient.getBlob(
      `/pedidos/relatorio/compras-cliente/pdf?${q.toString()}`,
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error(
        'Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.',
      );
    }
  }

  async listar(params?: FiltrosPedidos): Promise<PedidosResponse> {
    const queryParams = new URLSearchParams();
    if (params?.id) queryParams.append('id', params.id.toString());
    if (params?.numero_pedido) queryParams.append('numero_pedido', params.numero_pedido);
    if (params?.busca) queryParams.append('busca', params.busca);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id.toString());
    if (params?.cliente_nome) queryParams.append('cliente_nome', params.cliente_nome);
    if (params?.fornecedor_id) queryParams.append('fornecedor_id', params.fornecedor_id.toString());
    if (params?.fornecedor_nome) queryParams.append('fornecedor_nome', params.fornecedor_nome);
    if (params?.roca_id != null && params.roca_id > 0) {
      queryParams.append('roca_id', params.roca_id.toString());
    }
    if (params?.somente_com_roca) {
      queryParams.append('somente_com_roca', 'true');
    }
    if (params?.data_inicial) {
      // Enviar em snake_case (padrão da API)
      queryParams.append('data_inicial', params.data_inicial);
    }
    if (params?.data_final) {
      // Enviar em snake_case (padrão da API)
      queryParams.append('data_final', params.data_final);
    }

    const query = queryParams.toString();
    const url = `/pedidos${query ? `?${query}` : ''}`;
    
    // Debug: log dos parâmetros de data
    if (params?.data_inicial || params?.data_final) {
      console.log('📅 [Pedidos] Filtros de data sendo enviados:', {
        data_inicial: params.data_inicial,
        data_final: params.data_final,
        formato_data: 'YYYY-MM-DD',
        url_completa: url,
        query_string: query,
        comportamento_esperado: 'Filtrar pedidos onde data_pedido está entre data_inicial e data_final',
      });
    }
    
    return apiClient.get<PedidosResponse>(url);
  }

  async buscarPorId(id: number): Promise<Pedido> {
    return apiClient.get<Pedido>(`/pedidos/${id}`);
  }

  /**
   * Resumo financeiro do pedido (contrato novo — modelo sem parcelas).
   * GET /pedidos/:id/financeiro — resposta esperada: { valor_total, valor_pago, valor_em_aberto, status, data_vencimento }.
   * Se o backend retornar estrutura antiga (com parcelas), normaliza para ResumoFinanceiroPedido.
   */
  async getResumoFinanceiro(id: number): Promise<ResumoFinanceiroPedido> {
    const res = await apiClient.get<any>(`/pedidos/${id}/financeiro`);
    if (res?.valor_total !== undefined && res?.valor_em_aberto !== undefined) {
      return res as ResumoFinanceiroPedido;
    }
    if (res?.resumo_financeiro) {
      const r = res.resumo_financeiro;
      return {
        valor_total: r.valor_total ?? 0,
        valor_pago: r.valor_pago ?? 0,
        valor_em_aberto: r.valor_em_aberto ?? 0,
        status: (r.status as ResumoFinanceiroPedido['status']) ?? 'ABERTO',
        data_vencimento: r.data_vencimento ?? null,
      };
    }
    throw new Error('Resposta inválida de GET /pedidos/:id/financeiro');
  }

  /**
   * Histórico de pagamentos do pedido (contrato novo).
   * GET /pedidos/:id/pagamentos — array de { id, valor, forma_pagamento, data_pagamento }.
   */
  async listarPagamentosPedido(pedidoId: number): Promise<ItemHistoricoPagamento[]> {
    try {
      const list = await apiClient.get<ItemHistoricoPagamento[]>(`/pedidos/${pedidoId}/pagamentos`);
      if (Array.isArray(list)) return list;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Registra pagamento no pedido (contrato novo — modelo sem parcelas).
   * POST /pedidos/:id/pagamentos com body { valor, forma_pagamento, data_pagamento? }.
   */
  async registrarPagamentoPedido(pedidoId: number, body: RegistrarPagamentoBody): Promise<unknown> {
    return apiClient.post(`/pedidos/${pedidoId}/pagamentos`, body);
  }

  /**
   * Busca pedido com dados financeiros agregados (pedido + parcelas + pagamentos)
   * GET /pedidos/:id/financeiro
   * Retorna tudo em 1 única requisição, evitando N+1 queries
   * @deprecated Preferir getResumoFinanceiro + listarPagamentosPedido para novo contrato
   */
  async buscarPorIdComFinanceiro(id: number): Promise<{
    pedido: Pedido;
    parcelas: Array<{
      id: number;
      numero_parcela: number;
      total_parcelas: number;
      valor: number;
      valor_pago: number;
      status: string;
      data_vencimento: string;
      data_pagamento: string | null;
      pagamentos: Array<{
        id: number;
        valor_pago: number;
        forma_pagamento: string;
        data_lancamento: string;
        observacoes?: string;
        estornado: boolean;
      }>;
    }>;
    resumo_financeiro: {
      valor_total: number;
      valor_pago: number;
      valor_em_aberto: number;
      total_parcelas: number;
      parcelas_pagas: number;
      parcelas_pendentes: number;
      percentual_pago: number;
    };
  }> {
    return apiClient.get(`/pedidos/${id}/financeiro`);
  }

  /**
   * Confirma pagamento da parcela com múltiplas duplicatas
   * POST /pedidos/:pedidoId/parcelas/:parcelaId/confirmar-pagamento
   * @param parcelaId - ID da parcela (tb_parcela_pedido), nunca numero_parcela
   */
  async confirmarPagamentoParcela(
    pedidoId: number,
    parcelaId: number,
    payload: ConfirmarPagamentoPayload
  ): Promise<unknown> {
    const url = `/pedidos/${pedidoId}/parcelas/${parcelaId}/confirmar-pagamento`;
    if (import.meta.env.DEV) {
      console.log('📤 [confirmarPagamentoParcela] Requisição:', {
        url,
        pedidoId,
        parcelaId,
        payload,
        payloadJSON: JSON.stringify(payload),
      });
    }
    return apiClient.post(url, payload);
  }

  /**
   * Lista parcelas do pedido (GET /pedidos/:pedidoId/parcelas)
   * Usado ao criar duplicata para vincular a uma parcela
   */
  async listarParcelas(pedidoId: number): Promise<{ parcelas: Array<{
    id: number;
    pedido_id: number;
    numero_parcela: number;
    total_parcelas: number;
    valor: number;
    valor_pago?: number;
    status: string;
    data_vencimento: string;
  }>; resumo?: unknown }> {
    return apiClient.get(`/pedidos/${pedidoId}/parcelas`);
  }

  async criar(data: CreatePedidoDto): Promise<Pedido> {
    // Log detalhado dos dados sendo enviados
    if (import.meta.env.DEV) {
      console.log('📤 [PedidosService] POST /pedidos - Payload completo:', {
        tipo: data.tipo,
        cliente_id: data.cliente_id,
        fornecedor_id: data.fornecedor_id,
        data_pedido: data.data_pedido,
        forma_pagamento: data.forma_pagamento,
        forma_pagamento_estrutural: data.forma_pagamento_estrutural,
        quantidade_parcelas: data.quantidade_parcelas,
        valor_adiantado: data.valor_adiantado,
        data_vencimento_base: data.data_vencimento_base,
        condicao_pagamento: data.condicao_pagamento,
        taxa_desconto: data.taxa_desconto,
        taxa_desconto_percentual: data.taxa_desconto_percentual,
        data_antecipacao: data.data_antecipacao,
        instituicao_financeira: data.instituicao_financeira,
        frete: data.frete,
        outras_taxas: data.outras_taxas,
        totalItens: data.itens?.length || 0,
        itens: data.itens,
        payload_completo: data,
        payload_json: JSON.stringify(data, null, 2),
      });
    }
    return apiClient.post<Pedido>('/pedidos', data);
  }

  async atualizar(id: number, data: Partial<CreatePedidoDto>): Promise<Pedido> {
    return apiClient.patch<Pedido>(`/pedidos/${id}`, data);
  }

  /**
   * Altera condição de pagamento do pedido (ex.: à vista → parcelado).
   * PATCH /pedidos/:id – backend remove parcelas em aberto e cria as novas.
   */
  async alterarCondicaoPagamento(
    pedidoId: number,
    payload: AtualizarCondicaoPagamentoPayload
  ): Promise<Pedido> {
    return apiClient.patch<Pedido>(`/pedidos/${pedidoId}`, payload);
  }

  async cancelar(id: number): Promise<Pedido> {
    return apiClient.patch<Pedido>(`/pedidos/${id}/cancelar`, {});
  }

  async excluir(id: number): Promise<{ sucesso: boolean }> {
    return apiClient.delete<{ sucesso: boolean }>(`/pedidos/${id}`);
  }

  /**
   * Baixa o PDF do Relatório de Pedidos em Aberto (Contas a Receber).
   * GET /pedidos/relatorio/em-aberto?data_inicial=YYYY-MM-DD&data_final=YYYY-MM-DD
   */
  async downloadRelatorioPedidosEmAberto(dataInicial?: string, dataFinal?: string): Promise<void> {
    const params = new URLSearchParams();
    if (dataInicial?.trim()) params.append('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) params.append('data_final', dataFinal.trim());
    const q = params.toString();
    const blob = await apiClient.getBlob(`/pedidos/relatorio/em-aberto${q ? `?${q}` : ''}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-pedidos-em-aberto-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre o PDF do Relatório de Pedidos em Aberto em nova aba para impressão.
   */
  async printRelatorioPedidosEmAberto(dataInicial?: string, dataFinal?: string): Promise<void> {
    const params = new URLSearchParams();
    if (dataInicial?.trim()) params.append('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) params.append('data_final', dataFinal.trim());
    const q = params.toString();
    const blob = await apiClient.getBlob(`/pedidos/relatorio/em-aberto${q ? `?${q}` : ''}`);
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /**
   * Dados do Relatório de Margem de Contribuição (vendas no período, agrupadas por produto).
   * GET /pedidos/relatorio/margem-contribuicao?data_inicial=YYYY-MM-DD&data_final=YYYY-MM-DD
   */
  async getRelatorioMargemContribuicao(params?: {
    data_inicial?: string;
    data_final?: string;
    roca_id?: number;
  }): Promise<RelatorioMargemContribuicaoResponse> {
    const q = new URLSearchParams();
    if (params?.data_inicial?.trim()) q.append('data_inicial', params.data_inicial.trim());
    if (params?.data_final?.trim()) q.append('data_final', params.data_final.trim());
    if (params?.roca_id != null && params.roca_id > 0) {
      q.append('roca_id', String(params.roca_id));
    }
    const query = q.toString();
    return apiClient.get<RelatorioMargemContribuicaoResponse>(
      `/pedidos/relatorio/margem-contribuicao${query ? `?${query}` : ''}`
    );
  }

  /**
   * Download do PDF do Relatório de Margem de Contribuição.
   * Data única: envie data_inicial = data_final (ex.: dia). Período: data_inicial e data_final diferentes.
   */
  async downloadRelatorioMargemContribuicaoPdf(
    dataInicial?: string,
    dataFinal?: string
  ): Promise<void> {
    const params = new URLSearchParams();
    if (dataInicial?.trim()) params.append('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) params.append('data_final', dataFinal.trim());
    const q = params.toString();
    const blob = await apiClient.getBlob(
      `/pedidos/relatorio/margem-contribuicao/pdf${q ? `?${q}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-margem-contribuicao-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre o PDF do Relatório de Margem de Contribuição em nova aba para impressão.
   */
  async printRelatorioMargemContribuicaoPdf(
    dataInicial?: string,
    dataFinal?: string
  ): Promise<void> {
    const params = new URLSearchParams();
    if (dataInicial?.trim()) params.append('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) params.append('data_final', dataFinal.trim());
    const q = params.toString();
    const blob = await apiClient.getBlob(
      `/pedidos/relatorio/margem-contribuicao/pdf${q ? `?${q}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /**
   * Atualiza apenas a data de vencimento base do pedido
   * O backend recalcula automaticamente todas as parcelas pendentes
   */
  async atualizarDataVencimento(
    pedidoId: number,
    dataVencimento: string
  ): Promise<Pedido> {
    return apiClient.patch<Pedido>(
      `/pedidos/${pedidoId}/data-vencimento`,
      {
        data_vencimento_base: dataVencimento,
      }
    );
  }

  async obterDashboard(): Promise<DashboardPedidos> {
    return apiClient.get<DashboardPedidos>('/pedidos/dashboard/resumo');
  }

  /**
   * Busca dados do cliente para preenchimento de pedido
   * Endpoint alternativo: GET /api/v1/pedidos/cliente/:clienteId/dados
   * @param clienteId - ID do cliente
   * @returns Dados do cliente para pedido
   */
  async buscarDadosClienteParaPedido(clienteId: number): Promise<any> {
    return apiClient.get<any>(`/pedidos/cliente/${clienteId}/dados`);
  }

  /**
   * Baixa o PDF de um pedido específico.
   * GET /pedidos/:id/relatorio/pdf
   */
  async downloadRelatorioPedidoPdf(
    pedidoId: number,
    numeroPedido?: string,
    campos: 'completo' | 'principais' = 'completo',
  ): Promise<void> {
    const q = new URLSearchParams();
    if (campos === 'principais') q.append('campos', 'principais');
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `/pedidos/${pedidoId}/relatorio/pdf${query ? `?${query}` : ''}`,
    );
    const safeNumero =
      numeroPedido?.replace(/[^\w-]+/g, '_') || String(pedidoId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedido-${safeNumero}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre o PDF de um pedido em nova aba para impressão.
   */
  async printRelatorioPedidoPdf(
    pedidoId: number,
    campos: 'completo' | 'principais' = 'completo',
  ): Promise<void> {
    const q = new URLSearchParams();
    if (campos === 'principais') q.append('campos', 'principais');
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `/pedidos/${pedidoId}/relatorio/pdf${query ? `?${query}` : ''}`,
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error(
        'Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.',
      );
    }
  }

  /**
   * Baixa o relatório consolidado de pedidos em PDF (com filtros opcionais).
   * GET /pedidos/relatorio/pdf
   */
  async downloadRelatorioPDF(params?: {
    cliente_id?: number;
    fornecedor_id?: number;
    roca_id?: number;
    data_inicial?: string;
    data_final?: string;
    campos?: 'completo' | 'principais';
  }): Promise<void> {
    const q = new URLSearchParams();
    if (params?.cliente_id) q.append('cliente_id', String(params.cliente_id));
    if (params?.fornecedor_id) q.append('fornecedor_id', String(params.fornecedor_id));
    if (params?.roca_id) q.append('roca_id', String(params.roca_id));
    if (params?.data_inicial?.trim()) q.append('data_inicial', params.data_inicial.trim());
    if (params?.data_final?.trim()) q.append('data_final', params.data_final.trim());
    if (params?.campos === 'principais') q.append('campos', 'principais');
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `/pedidos/relatorio/pdf${query ? `?${query}` : ''}`,
    );
    const urlBlob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlBlob;
    link.download = `relatorio-pedidos-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(urlBlob);
  }

  async printRelatorioPDF(params?: {
    cliente_id?: number;
    fornecedor_id?: number;
    roca_id?: number;
    data_inicial?: string;
    data_final?: string;
    campos?: 'completo' | 'principais';
  }): Promise<void> {
    const q = new URLSearchParams();
    if (params?.cliente_id) q.append('cliente_id', String(params.cliente_id));
    if (params?.fornecedor_id) q.append('fornecedor_id', String(params.fornecedor_id));
    if (params?.roca_id) q.append('roca_id', String(params.roca_id));
    if (params?.data_inicial?.trim()) q.append('data_inicial', params.data_inicial.trim());
    if (params?.data_final?.trim()) q.append('data_final', params.data_final.trim());
    if (params?.campos === 'principais') q.append('campos', 'principais');
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `/pedidos/relatorio/pdf${query ? `?${query}` : ''}`,
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error(
        'Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.',
      );
    }
  }

  /**
   * Lista contas a receber (pedidos de venda com valor em aberto)
   * GET /pedidos/contas-receber
   * Cada linha = 1 pedido (não agrupado por cliente)
   */
  async listarContasReceber(params?: FiltrosContasReceber): Promise<ContaReceber[]> {
    const queryParams = new URLSearchParams();
    
    // Normalizar e validar parâmetros antes de adicionar à query string
    // Conforme GUIA_CORRECAO_CONTAS_PAGAR.md - Normalização robusta
    
    // Normalizar strings primeiro
    const codigoNormalizado = normalizeString(params?.codigo);
    const clienteNomeNormalizado = normalizeString(params?.cliente_nome);
    const formaPagamentoNormalizado = normalizeString(params?.forma_pagamento);
    const situacaoNormalizado = normalizeString(params?.situacao);
    const dataInicialNormalizada = normalizeString(params?.data_inicial);
    const dataFinalNormalizada = normalizeString(params?.data_final);
    
    // Adicionar strings normalizadas
    if (codigoNormalizado) {
      queryParams.append('codigo', codigoNormalizado);
    }
    if (clienteNomeNormalizado) {
      queryParams.append('cliente_nome', clienteNomeNormalizado);
    }
    if (formaPagamentoNormalizado) {
      queryParams.append('forma_pagamento', formaPagamentoNormalizado);
    }
    if (params?.forma_pagamento_estrutural) {
      queryParams.append('forma_pagamento_estrutural', params.forma_pagamento_estrutural);
    }
    if (situacaoNormalizado) {
      queryParams.append('situacao', situacaoNormalizado);
    }
    
    // Normalizar e validar números
    // IDs devem ser números válidos e > 0
    if (params?.cliente_id !== undefined && params.cliente_id !== null) {
      const clienteIdNum = Number(params.cliente_id);
      if (!isNaN(clienteIdNum) && clienteIdNum > 0) {
        queryParams.append('cliente_id', clienteIdNum.toString());
      }
    }
    if (params?.roca_id !== undefined && params.roca_id !== null) {
      const rocaIdNum = Number(params.roca_id);
      if (!isNaN(rocaIdNum) && rocaIdNum > 0) {
        queryParams.append('roca_id', rocaIdNum.toString());
      }
    }
    
    // Valores monetários devem ser números válidos e >= 0
    if (params?.valor_inicial !== undefined && params.valor_inicial !== null) {
      const valorInicialNum = Number(params.valor_inicial);
      if (!isNaN(valorInicialNum) && valorInicialNum >= 0) {
        queryParams.append('valor_inicial', valorInicialNum.toString());
      }
    }
    if (params?.valor_final !== undefined && params.valor_final !== null) {
      const valorFinalNum = Number(params.valor_final);
      if (!isNaN(valorFinalNum) && valorFinalNum >= 0) {
        queryParams.append('valor_final', valorFinalNum.toString());
      }
    }
    
    // Validar datas: devem estar no formato YYYY-MM-DD
    if (dataInicialNormalizada && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialNormalizada)) {
      queryParams.append('data_inicial', dataInicialNormalizada);
    }
    if (dataFinalNormalizada && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalNormalizada)) {
      queryParams.append('data_final', dataFinalNormalizada);
    }

    const query = queryParams.toString();
    const url = `/pedidos/contas-receber${query ? `?${query}` : ''}`;
    
    if (import.meta.env.DEV) {
      console.log('🔍 [PedidosService] listarContasReceber:', {
        params,
        url,
        queryString: query,
      });
    }
    
    try {
      const response = await apiClient.get<any>(url);

      if (Array.isArray(response)) return response as ContaReceber[];
      if (Array.isArray(response?.contasReceber)) return response.contasReceber as ContaReceber[];
      if (Array.isArray(response?.contas_receber)) return response.contas_receber as ContaReceber[];
      if (Array.isArray(response?.data)) return response.data as ContaReceber[];
      if (Array.isArray(response?.itens)) return response.itens as ContaReceber[];
      if (Array.isArray(response?.pedidos)) return response.pedidos as ContaReceber[];
      return [];
    } catch (error: any) {
      // Se o erro for 400 (Bad Request), pode ser que o banco esteja vazio
      // Tratar como array vazio ao invés de erro para exibir 0 nos dashboards
      if (error?.response?.status === 400) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ [PedidosService] Backend retornou 400 - tratando como banco vazio:', {
            url,
            error: error.message,
          });
        }
        return [];
      }
      throw error;
    }
  }

  /**
   * Lista contas a pagar (pedidos de compra com valor em aberto)
   * GET /pedidos/contas-pagar
   * Cada linha = 1 pedido (não agrupado por fornecedor)
   */
  async listarContasPagar(params?: FiltrosContasPagar): Promise<ContaPagar[]> {
    const queryParams = new URLSearchParams();
    
    // Normalizar e validar parâmetros antes de adicionar à query string
    // Conforme GUIA_CORRECAO_CONTAS_PAGAR.md - Normalização robusta
    
    // Normalizar strings primeiro
    const codigoNormalizado = normalizeString(params?.codigo);
    const fornecedorNomeNormalizado = normalizeString(params?.fornecedor_nome);
    const formaPagamentoNormalizado = normalizeString(params?.forma_pagamento);
    const situacaoNormalizado = normalizeString(params?.situacao);
    const dataInicialNormalizada = normalizeString(params?.data_inicial);
    const dataFinalNormalizada = normalizeString(params?.data_final);
    
    // Adicionar strings normalizadas
    if (codigoNormalizado) {
      queryParams.append('codigo', codigoNormalizado);
    }
    if (fornecedorNomeNormalizado) {
      queryParams.append('fornecedor_nome', fornecedorNomeNormalizado);
    }
    if (formaPagamentoNormalizado) {
      queryParams.append('forma_pagamento', formaPagamentoNormalizado);
    }
    if (situacaoNormalizado) {
      queryParams.append('situacao', situacaoNormalizado);
    }
    
    // Normalizar e validar números
    // IDs devem ser números válidos e > 0
    if (params?.fornecedor_id !== undefined && params.fornecedor_id !== null) {
      const fornecedorIdNum = Number(params.fornecedor_id);
      if (!isNaN(fornecedorIdNum) && fornecedorIdNum > 0) {
        queryParams.append('fornecedor_id', fornecedorIdNum.toString());
      }
    }
    if (params?.roca_id !== undefined && params.roca_id !== null) {
      const rocaIdNum = Number(params.roca_id);
      if (!isNaN(rocaIdNum) && rocaIdNum > 0) {
        queryParams.append('roca_id', rocaIdNum.toString());
      }
    }
    
    // Valores monetários devem ser números válidos e >= 0
    if (params?.valor_inicial !== undefined && params.valor_inicial !== null) {
      const valorInicialNum = Number(params.valor_inicial);
      if (!isNaN(valorInicialNum) && valorInicialNum >= 0) {
        queryParams.append('valor_inicial', valorInicialNum.toString());
      }
    }
    if (params?.valor_final !== undefined && params.valor_final !== null) {
      const valorFinalNum = Number(params.valor_final);
      if (!isNaN(valorFinalNum) && valorFinalNum >= 0) {
        queryParams.append('valor_final', valorFinalNum.toString());
      }
    }
    
    // Validar datas: devem estar no formato YYYY-MM-DD
    if (dataInicialNormalizada && /^\d{4}-\d{2}-\d{2}$/.test(dataInicialNormalizada)) {
      queryParams.append('data_inicial', dataInicialNormalizada);
    }
    if (dataFinalNormalizada && /^\d{4}-\d{2}-\d{2}$/.test(dataFinalNormalizada)) {
      queryParams.append('data_final', dataFinalNormalizada);
    }

    const query = queryParams.toString();
    const url = `/pedidos/contas-pagar${query ? `?${query}` : ''}`;
    
    if (import.meta.env.DEV) {
      console.log('🔍 [PedidosService] listarContasPagar:', {
        params,
        url,
        queryString: query,
      });
    }
    
    try {
      const response = await apiClient.get<any>(url);

      if (Array.isArray(response)) return response as ContaPagar[];
      if (Array.isArray(response?.contasPagar)) return response.contasPagar as ContaPagar[];
      if (Array.isArray(response?.contas_pagar)) return response.contas_pagar as ContaPagar[];
      if (Array.isArray(response?.data)) return response.data as ContaPagar[];
      if (Array.isArray(response?.itens)) return response.itens as ContaPagar[];
      if (Array.isArray(response?.pedidos)) return response.pedidos as ContaPagar[];
      return [];
    } catch (error: any) {
      // Se o erro for 400 (Bad Request), pode ser que o banco esteja vazio
      // Tratar como array vazio ao invés de erro para exibir 0 nos dashboards
      if (error?.response?.status === 400) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ [PedidosService] Backend retornou 400 - tratando como banco vazio:', {
            url,
            error: error.message,
          });
        }
        return [];
      }
      throw error;
    }
  }

  /**
   * Resumo contas a pagar (cards filtráveis)
   * GET /pedidos/contas-pagar/resumo
   * Mesmos parâmetros da listagem; retorna totais para os cards.
   */
  async getResumoContasPagar(params?: FiltrosContasPagar): Promise<{
    valor_total_pendente: number;
    valor_total_pago_contabilizado: number;
    vencidas: number;
    vencendo_hoje: number;
    vencendo_este_mes: number;
    total: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.fornecedor_id != null && params.fornecedor_id > 0) {
      queryParams.append('fornecedor_id', params.fornecedor_id.toString());
    }
    if (params?.data_inicial && /^\d{4}-\d{2}-\d{2}$/.test(params.data_inicial)) {
      queryParams.append('data_inicial', params.data_inicial);
    }
    if (params?.data_final && /^\d{4}-\d{2}-\d{2}$/.test(params.data_final)) {
      queryParams.append('data_final', params.data_final);
    }
    if (params?.situacao) {
      queryParams.append('situacao', params.situacao);
    }
    const query = queryParams.toString();
    const url = `/pedidos/contas-pagar/resumo${query ? `?${query}` : ''}`;
    return apiClient.get(url);
  }

  /**
   * Lista receitas antecipadas (pedidos com boleto descontado)
   * GET /pedidos/receitas-antecipadas
   */
  async listarReceitasAntecipadas(params?: {
    data_inicial?: string;
    data_final?: string;
    cliente_id?: number;
  }): Promise<{ receitas: Array<{
    pedido_id: number;
    numero_pedido: string;
    cliente_id: number;
    cliente_nome: string;
    valor_total: number;
    valor_desconto: number;
    valor_antecipado: number;
    data_antecipacao: string;
    instituicao_financeira?: string;
    data_pedido: string;
    status: string;
  }> }> {
    const queryParams = new URLSearchParams();
    if (params?.data_inicial) queryParams.append('data_inicial', params.data_inicial);
    if (params?.data_final) queryParams.append('data_final', params.data_final);
    if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id.toString());
    const query = queryParams.toString();
    const url = `/pedidos/receitas-antecipadas${query ? `?${query}` : ''}`;
    const res = await apiClient.get<any>(url);
    return Array.isArray(res) ? { receitas: res } : res;
  }

  /**
   * Lista despesas de desconto de boleto
   * GET /pedidos/despesas-desconto-boleto
   */
  async listarDespesasDescontoBoleto(params?: {
    data_inicial?: string;
    data_final?: string;
    mes_ano?: string;
  }): Promise<{ despesas: Array<{
    pedido_id: number;
    numero_pedido: string;
    cliente_id: number;
    cliente_nome: string;
    valor_desconto: number;
    valor_total: number;
    percentual_desconto: number;
    data_antecipacao: string;
    instituicao_financeira?: string;
    data_pedido: string;
  }> }> {
    const queryParams = new URLSearchParams();
    if (params?.data_inicial) queryParams.append('data_inicial', params.data_inicial);
    if (params?.data_final) queryParams.append('data_final', params.data_final);
    if (params?.mes_ano) queryParams.append('mes_ano', params.mes_ano);
    const query = queryParams.toString();
    const url = `/pedidos/despesas-desconto-boleto${query ? `?${query}` : ''}`;
    const res = await apiClient.get<any>(url);
    return Array.isArray(res) ? { despesas: res } : res;
  }
}

export interface RelatorioMargemContribuicaoLinha {
  produto_id: number;
  codigo: string;
  nome: string;
  quantidade_vendida: number;
  receita: number;
  custo_variavel: number;
  margem_reais: number;
  margem_percentual: number;
}

export interface RelatorioMargemContribuicaoResponse {
  linhas: RelatorioMargemContribuicaoLinha[];
  totais: {
    quantidade_vendida: number;
    receita: number;
    custo_variavel: number;
    margem_reais: number;
  };
}

export const pedidosService = new PedidosService();

