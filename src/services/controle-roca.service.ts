import type {
    CreateDiarioRocaDto,
    CreateLancamentoProducaoRocaDto,
    CreateMeeiroRocaDto,
    CreateProdutoRocaDto,
    CreateProdutorRocaDto,
    CreateRocaDto,
    DiarioRoca,
    EmprestimoMeeiro,
    LancamentoDetalhesRoca,
    LancamentoProducaoRoca,
    ListaDiarioRocaResponse,
    ListaEmprestimosResponse,
    MeeiroDetalhe,
    MeeiroRoca,
    ProdutoRoca,
    ProdutorRoca,
    AtualizarPagamentoMeeiroDto,
    RegistrarPagamentoMeeiroDto,
    RegistrarPagamentoMeeiroResponse,
    RelatorioMeeiroResponse,
    RelatorioMeeirosCadastroIncompletoResponse,
    ListaLancamentosRocaResponse,
    ResumoPagamentoMeeirosResponse,
    HistoricoPagamentoMeeirosResponse,
    RegistrarRelatorioMeeiroPendenteDto,
    Roca,
    RocaDetalhes,
    UpdateDiarioRocaDto,
    UpdateLancamentoProducaoRocaDto,
    UpdateMeeiroRocaDto,
    UpdateProdutorRocaDto,
    UpdateRocaDto,
} from '@/types/roca';
import { apiClient } from './api';

const BASE = '/controle-roca';

/** Padrão para listas usadas em combos/dropdowns até haver paginação na UI (máx. permitido no backend). */
const LIST_ALL_LIMIT = 500;

class ControleRocaService {
  // Produtores
  async listarProdutores(opts?: { page?: number; limit?: number }): Promise<ProdutorRoca[]> {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? LIST_ALL_LIMIT;
    const res = await apiClient.get<
      ProdutorRoca[] | { produtores: ProdutorRoca[]; total?: number }
    >(`${BASE}/produtores?page=${page}&limit=${limit}`);
    if (Array.isArray(res)) return res;
    return (res as { produtores?: ProdutorRoca[] }).produtores ?? [];
  }

  async criarProdutor(data: CreateProdutorRocaDto): Promise<ProdutorRoca> {
    return apiClient.post<ProdutorRoca>(`${BASE}/produtores`, data);
  }

  async obterProdutor(id: number): Promise<ProdutorRoca> {
    return apiClient.get<ProdutorRoca>(`${BASE}/produtores/${id}`);
  }

  async atualizarProdutor(
    id: number,
    data: UpdateProdutorRocaDto
  ): Promise<ProdutorRoca> {
    return apiClient.patch<ProdutorRoca>(`${BASE}/produtores/${id}`, data);
  }

  // Roças
  async listarRocas(
    produtorId?: number,
    incluirInativos?: boolean,
    opts?: { page?: number; limit?: number },
  ): Promise<Roca[]> {
    const params = new URLSearchParams();
    if (produtorId != null) params.set('produtorId', String(produtorId));
    if (incluirInativos) params.set('incluirInativos', 'true');
    params.set('page', String(opts?.page ?? 1));
    params.set('limit', String(opts?.limit ?? LIST_ALL_LIMIT));
    const q = `?${params.toString()}`;
    const res = await apiClient.get<Roca[] | { rocas: Roca[]; total?: number }>(
      `${BASE}/rocas${q}`,
    );
    if (Array.isArray(res)) return res;
    return (res as { rocas?: Roca[] }).rocas ?? [];
  }

  async criarRoca(data: CreateRocaDto): Promise<Roca> {
    return apiClient.post<Roca>(`${BASE}/rocas`, data);
  }

  async obterRoca(id: number): Promise<RocaDetalhes> {
    return apiClient.get<RocaDetalhes>(`${BASE}/rocas/${id}`);
  }

  async atualizarRoca(id: number, data: UpdateRocaDto): Promise<RocaDetalhes> {
    return apiClient.patch<RocaDetalhes>(`${BASE}/rocas/${id}`, data);
  }

  async excluirRoca(id: number): Promise<{ sucesso: boolean }> {
    return apiClient.delete<{ sucesso: boolean }>(`${BASE}/rocas/${id}`);
  }

  // Meeiros
  async listarMeeiros(
    produtorId?: number,
    opts?: { comEmprestimos?: boolean; page?: number; limit?: number; rocaId?: number }
  ): Promise<MeeiroRoca[]> {
    const params = new URLSearchParams();
    if (produtorId != null) params.set('produtorId', String(produtorId));
    if (opts?.rocaId != null) params.set('rocaId', String(opts.rocaId));
    if (opts?.comEmprestimos === true) params.set('comEmprestimos', 'true');
    params.set('page', String(opts?.page ?? 1));
    params.set('limit', String(opts?.limit ?? LIST_ALL_LIMIT));
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<
      MeeiroRoca[] | { items: MeeiroRoca[]; total?: number }
    >(`${BASE}/meeiros${q}`);
    return Array.isArray(res) ? res : (res?.items ?? []);
  }

  async buscarMeeiroPorCodigo(codigo: string): Promise<MeeiroRoca> {
    return apiClient.get<MeeiroRoca>(
      `${BASE}/meeiros/codigo/${encodeURIComponent(codigo)}`
    );
  }

  async criarMeeiro(data: CreateMeeiroRocaDto): Promise<MeeiroRoca> {
    return apiClient.post<MeeiroRoca>(`${BASE}/meeiros`, data);
  }

  /** Retorna detalhe do meeiro com resumo financeiro e lista de empréstimos. */
  async obterMeeiro(id: number): Promise<MeeiroDetalhe> {
    return apiClient.get<MeeiroDetalhe>(`${BASE}/meeiros/${id}`);
  }

  async atualizarMeeiro(
    id: number,
    data: UpdateMeeiroRocaDto
  ): Promise<MeeiroRoca> {
    return apiClient.patch<MeeiroRoca>(`${BASE}/meeiros/${id}`, data);
  }

  async excluirMeeiro(id: number): Promise<{ sucesso: boolean }> {
    return apiClient.delete<{ sucesso: boolean }>(`${BASE}/meeiros/${id}`);
  }

  /** Meeiros sem CPF, telefone, PIX ou endereço preenchidos. */
  async relatorioMeeirosCadastroIncompleto(opts?: {
    page?: number;
    limit?: number;
  }): Promise<RelatorioMeeirosCadastroIncompletoResponse> {
    const p = new URLSearchParams();
    p.set('page', String(opts?.page ?? 1));
    p.set('limit', String(opts?.limit ?? LIST_ALL_LIMIT));
    return apiClient.get<RelatorioMeeirosCadastroIncompletoResponse>(
      `${BASE}/relatorios/meeiros/cadastro-incompleto?${p.toString()}`,
    );
  }

  async downloadRelatorioMeeirosCadastroIncompletoPdf(): Promise<void> {
    const blob = await apiClient.getBlob(`${BASE}/relatorios/meeiros/cadastro-incompleto/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeiros-cadastro-incompleto-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Abre o PDF em nova aba para visualizar e imprimir (mesmo arquivo do download). */
  async printRelatorioMeeirosCadastroIncompletoPdf(): Promise<void> {
    const blob = await apiClient.getBlob(`${BASE}/relatorios/meeiros/cadastro-incompleto/pdf`);
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      throw new Error(
        'Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.',
      );
    }
  }

  // Empréstimos
  async criarEmprestimo(data: {
    meeiroId: number;
    valor: number;
    data: string;
    observacao?: string;
  }): Promise<EmprestimoMeeiro> {
    return apiClient.post<EmprestimoMeeiro>(`${BASE}/emprestimos`, data);
  }

  async listarEmprestimosMeeiro(
    meeiroId: number,
    opts?: { page?: number; limit?: number; status?: string }
  ): Promise<ListaEmprestimosResponse> {
    const params = new URLSearchParams();
    params.set('page', String(opts?.page ?? 1));
    params.set('limit', String(opts?.limit ?? LIST_ALL_LIMIT));
    if (opts?.status) params.set('status', opts.status);
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<ListaEmprestimosResponse>(
      `${BASE}/meeiros/${meeiroId}/emprestimos${q}`
    );
  }

  async atualizarStatusEmprestimo(
    id: number,
    data: { status: 'ABERTO' | 'LIQUIDADO' | 'CANCELADO' }
  ): Promise<EmprestimoMeeiro> {
    return apiClient.patch<EmprestimoMeeiro>(
      `${BASE}/emprestimos/${id}/status`,
      data
    );
  }

  // Diário de roça
  async listarDiarioRoca(opts?: {
    page?: number;
    limit?: number;
    rocaId?: number;
    dataInicial?: string;
    dataFinal?: string;
    procedimento?: string;
    produtosUtilizados?: string;
    busca?: string;
  }): Promise<ListaDiarioRocaResponse> {
    const params = new URLSearchParams();
    params.set('page', String(opts?.page ?? 1));
    params.set('limit', String(opts?.limit ?? LIST_ALL_LIMIT));
    if (opts?.rocaId != null && opts.rocaId > 0) {
      params.set('rocaId', String(opts.rocaId));
    }
    if (opts?.dataInicial) params.set('dataInicial', opts.dataInicial);
    if (opts?.dataFinal) params.set('dataFinal', opts.dataFinal);
    if (opts?.procedimento?.trim()) {
      params.set('procedimento', opts.procedimento.trim());
    }
    if (opts?.produtosUtilizados?.trim()) {
      params.set('produtosUtilizados', opts.produtosUtilizados.trim());
    }
    if (opts?.busca?.trim()) params.set('busca', opts.busca.trim());
    const q = `?${params.toString()}`;
    return apiClient.get<ListaDiarioRocaResponse>(`${BASE}/diario${q}`);
  }

  async criarDiarioRoca(data: CreateDiarioRocaDto): Promise<DiarioRoca> {
    return apiClient.post<DiarioRoca>(`${BASE}/diario`, data);
  }

  async atualizarDiarioRoca(
    id: number,
    data: UpdateDiarioRocaDto,
  ): Promise<DiarioRoca> {
    return apiClient.patch<DiarioRoca>(`${BASE}/diario/${id}`, data);
  }

  async excluirDiarioRoca(id: number): Promise<{ sucesso: boolean }> {
    return apiClient.delete<{ sucesso: boolean }>(`${BASE}/diario/${id}`);
  }

  async atualizarEmprestimo(
    id: number,
    data: { valor: number }
  ): Promise<EmprestimoMeeiro> {
    return apiClient.patch<EmprestimoMeeiro>(`${BASE}/emprestimos/${id}`, data);
  }

  async excluirEmprestimo(id: number): Promise<{ message?: string; sucesso?: boolean }> {
    return apiClient.delete<{ message?: string; sucesso?: boolean }>(
      `${BASE}/emprestimos/${id}`
    );
  }

  // Pagamentos de meeiros
  async listarResumoPagamentoMeeiros(params?: {
    produtorId?: number;
    meeiroId?: number;
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
    page?: number;
    limit?: number;
    subTab?: 'em-aberto' | 'quitados';
    buscaNome?: string;
    apenasComValorEmAberto?: boolean;
    apenasPagos?: boolean;
  }): Promise<ResumoPagamentoMeeirosResponse> {
    const search = new URLSearchParams();
    if (params?.produtorId != null) search.set('produtorId', String(params.produtorId));
    if (params?.meeiroId != null) search.set('meeiroId', String(params.meeiroId));
    if (params?.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params?.dataFinal) search.set('dataFinal', params.dataFinal);
    if (params?.rocas?.length) search.set('rocas', params.rocas.join(','));
    search.set('page', String(params?.page ?? 1));
    search.set('limit', String(params?.limit ?? 15));
    if (params?.subTab) search.set('subTab', params.subTab);
    if (params?.buscaNome?.trim()) search.set('buscaNome', params.buscaNome.trim());
    if (params?.apenasComValorEmAberto === true) search.set('apenasComValorEmAberto', 'true');
    if (params?.apenasPagos === true) search.set('apenasPagos', 'true');
    const q = search.toString() ? `?${search.toString()}` : '';
    return apiClient.get<ResumoPagamentoMeeirosResponse>(
      `${BASE}/pagamentos-meeiros/resumo${q}`
    );
  }

  async registrarPagamentoMeeiro(
    data: RegistrarPagamentoMeeiroDto
  ): Promise<RegistrarPagamentoMeeiroResponse> {
    return apiClient.post<RegistrarPagamentoMeeiroResponse>(
      `${BASE}/pagamentos-meeiros`,
      data
    );
  }

  async definirDescontoEmprestimoMeeiro(
    meeiroId: number,
    descEmprest: number,
  ): Promise<{ meeiroId: number; descEmprest: number; modo?: 'previsto' }> {
    return apiClient.patch(`${BASE}/pagamentos-meeiros/meeiro/${meeiroId}/desconto-emprestimo`, {
      descEmprest,
    });
  }

  async atualizarPagamentoMeeiro(
    pagamentoId: number,
    data: AtualizarPagamentoMeeiroDto
  ): Promise<{
    pagamentoId: number;
    meeiroId: number;
    dataPagamento: string;
    formaPagamento: string;
    contaCaixa: string | null;
    observacao: string | null;
    totalReceber: number;
    valesEmbalagem: number;
    valorAbatidoEmprestimo: number;
    descEmprest: number;
    valorLiquido: number;
  }> {
    return apiClient.patch(`${BASE}/pagamentos-meeiros/${pagamentoId}`, data);
  }

  async listarHistoricoPagamentosMeeiros(params?: {
    produtorId?: number;
    meeiroId?: number;
    dataPagamentoInicial?: string;
    dataPagamentoFinal?: string;
    statusHistorico?: 'pendente' | 'concluido';
    page?: number;
    limit?: number;
  }): Promise<HistoricoPagamentoMeeirosResponse> {
    const search = new URLSearchParams();
    if (params?.produtorId != null) search.set('produtorId', String(params.produtorId));
    if (params?.meeiroId != null) search.set('meeiroId', String(params.meeiroId));
    if (params?.dataPagamentoInicial) search.set('dataPagamentoInicial', params.dataPagamentoInicial);
    if (params?.dataPagamentoFinal) search.set('dataPagamentoFinal', params.dataPagamentoFinal);
    if (params?.statusHistorico) search.set('statusHistorico', params.statusHistorico);
    search.set('page', String(params?.page ?? 1));
    search.set('limit', String(params?.limit ?? 50));
    const q = search.toString() ? `?${search.toString()}` : '';
    return apiClient.get<HistoricoPagamentoMeeirosResponse>(
      `${BASE}/pagamentos-meeiros/historico${q}`
    );
  }

  async excluirItemHistoricoPagamentoMeeiro(
    origem: 'pagamento' | 'relatorio_pendente',
    id: number,
  ): Promise<{ excluido: boolean; origem: string; id: number }> {
    const pathOrigem = origem === 'relatorio_pendente' ? 'relatorio-pendente' : 'pagamento';
    return apiClient.delete(`${BASE}/pagamentos-meeiros/historico/${pathOrigem}/${id}`);
  }

  async limparHistoricoPagamentosMeeiros(params?: {
    produtorId?: number;
    meeiroId?: number;
    dataPagamentoInicial?: string;
    dataPagamentoFinal?: string;
    statusHistorico?: 'pendente' | 'concluido';
  }): Promise<{
    pagamentosExcluidos: number;
    relatoriosExcluidos: number;
    totalExcluidos: number;
  }> {
    const search = new URLSearchParams();
    if (params?.produtorId != null) search.set('produtorId', String(params.produtorId));
    if (params?.meeiroId != null) search.set('meeiroId', String(params.meeiroId));
    if (params?.dataPagamentoInicial) search.set('dataPagamentoInicial', params.dataPagamentoInicial);
    if (params?.dataPagamentoFinal) search.set('dataPagamentoFinal', params.dataPagamentoFinal);
    if (params?.statusHistorico) search.set('statusHistorico', params.statusHistorico);
    const q = search.toString() ? `?${search.toString()}` : '';
    return apiClient.delete(`${BASE}/pagamentos-meeiros/historico${q}`);
  }

  async registrarRelatorioMeeiroPendente(
    data: RegistrarRelatorioMeeiroPendenteDto
  ): Promise<{ id: number; createdAt: string }> {
    return apiClient.post<{ id: number; createdAt: string }>(
      `${BASE}/pagamentos-meeiros/relatorio-pendente`,
      data
    );
  }

  async downloadComprovantePagamentoMeeiroPdf(pagamentoId: number): Promise<void> {
    const blob = await apiClient.getBlob(
      `${BASE}/pagamentos-meeiros/${pagamentoId}/comprovante/pdf`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repasse-parceiro-meeiro-${pagamentoId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Abre o mesmo comprovante em nova aba para imprimir (visualizador de PDF do navegador). */
  async printComprovantePagamentoMeeiroPdf(pagamentoId: number): Promise<void> {
    const blob = await apiClient.getBlob(
      `${BASE}/pagamentos-meeiros/${pagamentoId}/comprovante/pdf`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }

  /** Relatório de Meeiros (múltiplos) em PDF – filtro por período e roças. */
  async downloadRelatorioMeeirosPdf(params?: {
    meeiroId?: number;
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
    /** pagos = com registro de pagamento; pendentes = sem pagamento e valor a pagar; todos = todos */
    filtroPagamento?: 'todos' | 'pagos' | 'pendentes';
    /**
     * Com `meeiroId`: valor de abatimento simulado no PDF (ex.: relatório sem pagar).
     * O backend aplica o mesmo teto do pagamento (empréstimo em aberto × produção líquida após embalagem).
     */
    valorAbatimentoEmprestimoProjetado?: number;
    /**
     * Sem meeiro: `recibos` = um único PDF com recibo detalhado por meeiro (cada um em páginas novas).
     * Ignora `meeiroId` se for enviado.
     */
    layout?: 'recibos';
  }): Promise<void> {
    const search = this.buildRelatorioMeeirosPdfSearchParams(params);
    const q = search.toString() ? `?${search.toString()}` : '';
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/meeiros/pdf${q}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const hoje = new Date().toISOString().split('T')[0];
    const sfx =
      params?.filtroPagamento === 'pagos'
        ? '-pagos'
        : params?.filtroPagamento === 'pendentes'
          ? '-pendentes'
          : '';
    a.download =
      params?.layout === 'recibos'
        ? `recibos-meeiros${sfx}-${hoje}.pdf`
        : `relatorio-meeiros${sfx}-${hoje}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async printRelatorioMeeirosPdf(params?: {
    meeiroId?: number;
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
    filtroPagamento?: 'todos' | 'pagos' | 'pendentes';
    valorAbatimentoEmprestimoProjetado?: number;
    layout?: 'recibos';
  }): Promise<void> {
    const search = this.buildRelatorioMeeirosPdfSearchParams(params);
    const q = search.toString() ? `?${search.toString()}` : '';
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/meeiros/pdf${q}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  private buildRelatorioMeeirosPdfSearchParams(params?: {
    meeiroId?: number;
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
    filtroPagamento?: 'todos' | 'pagos' | 'pendentes';
    valorAbatimentoEmprestimoProjetado?: number;
    layout?: 'recibos';
  }): URLSearchParams {
    const search = new URLSearchParams();
    const layoutRecibos = params?.layout === 'recibos';
    if (!layoutRecibos && params?.meeiroId != null) {
      search.set('meeiroId', String(params.meeiroId));
    }
    if (params?.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params?.dataFinal) search.set('dataFinal', params.dataFinal);
    if (params?.rocas?.length) search.set('rocas', params.rocas.join(','));
    if (params?.filtroPagamento && params.filtroPagamento !== 'todos') {
      search.set('filtroPagamento', params.filtroPagamento);
    }
    if (
      params?.valorAbatimentoEmprestimoProjetado != null &&
      Number.isFinite(params.valorAbatimentoEmprestimoProjetado) &&
      params.valorAbatimentoEmprestimoProjetado > 0
    ) {
      search.set(
        'valorAbatimentoEmprestimoProjetado',
        String(params.valorAbatimentoEmprestimoProjetado),
      );
    }
    if (layoutRecibos) search.set('layout', 'recibos');
    return search;
  }

  // Produtos da roça
  async listarProdutosRoca(
    produtorId?: number,
    opts?: { page?: number; limit?: number },
  ): Promise<ProdutoRoca[]> {
    const params = new URLSearchParams();
    if (produtorId != null) params.set('produtorId', String(produtorId));
    params.set('page', String(opts?.page ?? 1));
    params.set('limit', String(opts?.limit ?? LIST_ALL_LIMIT));
    const res = await apiClient.get<
      ProdutoRoca[] | { produtos: ProdutoRoca[]; total?: number }
    >(`${BASE}/produtos?${params.toString()}`);
    if (Array.isArray(res)) return res;
    return (res as { produtos?: ProdutoRoca[] }).produtos ?? [];
  }

  async criarProdutoRoca(data: CreateProdutoRocaDto): Promise<ProdutoRoca> {
    return apiClient.post<ProdutoRoca>(`${BASE}/produtos`, data);
  }

  // Lançamentos
  async listarLancamentos(params?: {
    produtorId?: number;
    rocaId?: number;
    meeiroId?: number;
    dataInicial?: string;
    dataFinal?: string;
    incluirInativos?: boolean;
    /** Quando true, envia `todos=true` ao backend (todos os lançamentos, sem LIMIT no SQL). */
    todos?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ListaLancamentosRocaResponse> {
    const search = new URLSearchParams();
    if (params?.produtorId != null) search.set('produtorId', String(params.produtorId));
    if (params?.rocaId != null) search.set('rocaId', String(params.rocaId));
    if (params?.meeiroId != null) search.set('meeiroId', String(params.meeiroId));
    if (params?.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params?.dataFinal) search.set('dataFinal', params.dataFinal);
    if (params?.incluirInativos === true) search.set('incluirInativos', 'true');
    if (params?.todos === true) {
      search.set('todos', 'true');
    } else {
      search.set('page', String(params?.page ?? 1));
      search.set('limit', String(params?.limit ?? 15));
    }
    const q = search.toString() ? `?${search.toString()}` : '';
    const res = await apiClient.get<
      LancamentoProducaoRoca[] | { lancamentos?: LancamentoProducaoRoca[]; total?: number; page?: number; limit?: number }
    >(`${BASE}/lancamentos${q}`);
    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: params?.limit ?? 15 };
    }
    const obj = res as { lancamentos?: LancamentoProducaoRoca[]; total?: number; page?: number; limit?: number };
    const items = obj.lancamentos ?? [];
    return {
      items,
      total: Number(obj.total ?? items.length),
      page: Number(obj.page ?? params?.page ?? 1),
      limit: Number(obj.limit ?? params?.limit ?? 15),
    };
  }

  /**
   * Todos os lançamentos para a UI (paginação só no cliente).
   * Usa `todos=true` no backend; se retornar 400 por limite (API antiga), pagina com `limit` máximo permitido.
   */
  async listarLancamentosTodos(params?: {
    produtorId?: number;
    rocaId?: number;
    meeiroId?: number;
    dataInicial?: string;
    dataFinal?: string;
    incluirInativos?: boolean;
  }): Promise<ListaLancamentosRocaResponse> {
    const buscarPaginadoServidor = async (): Promise<ListaLancamentosRocaResponse> => {
      const pageLimit = LIST_ALL_LIMIT;
      let page = 1;
      const items: LancamentoProducaoRoca[] = [];
      let total = 0;
      for (;;) {
        const response = await this.listarLancamentos({
          ...params,
          page,
          limit: pageLimit,
        });
        const pageItems = response.items ?? [];
        items.push(...pageItems);
        total = Number(response.total ?? items.length);
        if (
          pageItems.length === 0 ||
          items.length >= total ||
          pageItems.length < pageLimit
        ) {
          break;
        }
        page += 1;
      }
      return {
        items,
        total: Math.max(total, items.length),
        page: 1,
        limit: pageLimit,
      };
    };

    try {
      const first = await this.listarLancamentos({ ...params, todos: true });
      const itemsFirst = first.items ?? [];
      const total = Number(first.total ?? itemsFirst.length);
      if (itemsFirst.length >= total) {
        return {
          items: itemsFirst,
          total,
          page: 1,
          limit: total,
        };
      }
      // API antiga ou `todos` ignorado: veio um lote menor que o total — busca tudo paginando (sem reutilizar o primeiro lote, evita duplicar linhas).
      return buscarPaginadoServidor();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = res?.status;
      const message = String(res?.data?.message ?? (err as Error)?.message ?? '');
      const limitRejeitado =
        status === 400 && message.toLowerCase().includes('limit');
      if (!limitRejeitado) {
        throw err;
      }
      return buscarPaginadoServidor();
    }
  }

  async obterLancamento(id: number): Promise<LancamentoDetalhesRoca | null> {
    return apiClient.get<LancamentoDetalhesRoca | null>(`${BASE}/lancamentos/${id}`);
  }

  async atualizarLancamento(
    id: number,
    data: UpdateLancamentoProducaoRocaDto
  ): Promise<LancamentoProducaoRoca> {
    return apiClient.patch<LancamentoProducaoRoca>(`${BASE}/lancamentos/${id}`, data);
  }

  async criarLancamento(
    data: CreateLancamentoProducaoRocaDto
  ): Promise<LancamentoProducaoRoca> {
    return apiClient.post<LancamentoProducaoRoca>(`${BASE}/lancamentos`, data);
  }

  async excluirLancamento(id: number): Promise<{ sucesso: boolean }> {
    return apiClient.delete<{ sucesso: boolean }>(`${BASE}/lancamentos/${id}`);
  }

  /** Reajustar valor unitário de múltiplos lançamentos */
  async reajustarValorLancamentos(data: {
    idsLancamentos: number[];
    novoValorUnitario: number;
  }): Promise<{ sucesso: boolean; novoValorUnitario: number; lancamentosAtualizados: any[] }> {
    return apiClient.patch<{ sucesso: boolean; novoValorUnitario: number; lancamentosAtualizados: any[] }>(
      `${BASE}/lancamentos/reajustar-valor`,
      data
    );
  }

  // Relatório por meeiro
  async relatorioPorMeeiro(params: {
    meeiroId: number;
    dataInicial?: string;
    dataFinal?: string;
  }): Promise<RelatorioMeeiroResponse> {
    const search = new URLSearchParams({ meeiroId: String(params.meeiroId) });
    if (params.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params.dataFinal) search.set('dataFinal', params.dataFinal);
    return apiClient.get<RelatorioMeeiroResponse>(
      `${BASE}/relatorios/meeiro?${search.toString()}`
    );
  }

  /** Download do PDF "Relatório por Meeiro" (lançamentos do meeiro selecionado). */
  async downloadRelatorioPorMeeiroPdf(params: {
    meeiroId: number;
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
  }): Promise<void> {
    const search = new URLSearchParams({ meeiroId: String(params.meeiroId) });
    if (params.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params.dataFinal) search.set('dataFinal', params.dataFinal);
    if (params.rocas?.length) search.set('rocas', params.rocas.join(','));
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/meeiro/pdf?${search.toString()}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-por-meeiro-${params.meeiroId}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Abre o PDF "Relatório por Meeiro" em nova aba para impressão. */
  async printRelatorioPorMeeiroPdf(params: {
    meeiroId: number;
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
  }): Promise<void> {
    const search = new URLSearchParams({ meeiroId: String(params.meeiroId) });
    if (params.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params.dataFinal) search.set('dataFinal', params.dataFinal);
    if (params.rocas?.length) search.set('rocas', params.rocas.join(','));
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/meeiro/pdf?${search.toString()}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /**
   * Download do PDF "PAGAMENTO DE PRODUTORES" (fechamento do meeiro: tabela de lançamentos, faturas, vales, a receber).
   * Backend: GET /relatorios/pagamento-produtores/pdf
   */
  async downloadRelatorioMeeiroPdf(params: {
    meeiroId: number;
    dataInicial?: string;
    dataFinal?: string;
    /** Data exibida no campo "Pagamento em" do PDF (opcional). */
    dataPagamento?: string;
    produtorId?: number;
    rocas?: number[];
  }): Promise<void> {
    const search = new URLSearchParams({ meeiroId: String(params.meeiroId) });
    if (params.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params.dataFinal) search.set('dataFinal', params.dataFinal);
    if (params.dataPagamento?.trim()) search.set('dataPagamento', params.dataPagamento.trim());
    if (params.produtorId != null) search.set('produtorId', String(params.produtorId));
    if (params.rocas?.length) search.set('rocas', params.rocas.join(','));
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/pagamento-produtores/pdf?${search.toString()}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamento-produtores-${params.meeiroId}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Abre o PDF "PAGAMENTO DE PRODUTORES" em nova aba para impressão.
   */
  async printRelatorioMeeiroPdf(params: {
    meeiroId: number;
    dataInicial?: string;
    dataFinal?: string;
    dataPagamento?: string;
    produtorId?: number;
    rocas?: number[];
  }): Promise<void> {
    const search = new URLSearchParams({ meeiroId: String(params.meeiroId) });
    if (params.dataInicial) search.set('dataInicial', params.dataInicial);
    if (params.dataFinal) search.set('dataFinal', params.dataFinal);
    if (params.dataPagamento?.trim()) search.set('dataPagamento', params.dataPagamento.trim());
    if (params.produtorId != null) search.set('produtorId', String(params.produtorId));
    if (params.rocas?.length) search.set('rocas', params.rocas.join(','));
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/pagamento-produtores/pdf?${search.toString()}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /** Download do PDF de meeiros pagos no período. */
  async downloadRelatorioMeeirosPagosPdf(params?: {
    dataPagamentoInicial?: string;
    dataPagamentoFinal?: string;
    dataLancamentoInicial?: string;
    dataLancamentoFinal?: string;
    produtorId?: number;
    rocas?: number[];
    aplicarEmbalagem?: boolean;
  }): Promise<void> {
    const q = new URLSearchParams();
    if (params?.dataPagamentoInicial?.trim()) q.set('dataPagamentoInicial', params.dataPagamentoInicial.trim());
    if (params?.dataPagamentoFinal?.trim()) q.set('dataPagamentoFinal', params.dataPagamentoFinal.trim());
    if (params?.dataLancamentoInicial?.trim()) q.set('dataLancamentoInicial', params.dataLancamentoInicial.trim());
    if (params?.dataLancamentoFinal?.trim()) q.set('dataLancamentoFinal', params.dataLancamentoFinal.trim());
    if (params?.produtorId != null) q.set('produtorId', String(params.produtorId));
    if (params?.rocas?.length) q.set('rocas', params.rocas.join(','));
    if (params?.aplicarEmbalagem) q.set('aplicarEmbalagem', 'true');
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/meeiros-pagos/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-meeiros-pagos-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Abre o PDF de meeiros pagos em nova aba para impressão. */
  async printRelatorioMeeirosPagosPdf(params?: {
    dataPagamentoInicial?: string;
    dataPagamentoFinal?: string;
    dataLancamentoInicial?: string;
    dataLancamentoFinal?: string;
    produtorId?: number;
    rocas?: number[];
    aplicarEmbalagem?: boolean;
  }): Promise<void> {
    const q = new URLSearchParams();
    if (params?.dataPagamentoInicial?.trim()) q.set('dataPagamentoInicial', params.dataPagamentoInicial.trim());
    if (params?.dataPagamentoFinal?.trim()) q.set('dataPagamentoFinal', params.dataPagamentoFinal.trim());
    if (params?.dataLancamentoInicial?.trim()) q.set('dataLancamentoInicial', params.dataLancamentoInicial.trim());
    if (params?.dataLancamentoFinal?.trim()) q.set('dataLancamentoFinal', params.dataLancamentoFinal.trim());
    if (params?.produtorId != null) q.set('produtorId', String(params.produtorId));
    if (params?.rocas?.length) q.set('rocas', params.rocas.join(','));
    if (params?.aplicarEmbalagem) q.set('aplicarEmbalagem', 'true');
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/meeiros-pagos/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /** Download do PDF de meeiros com empréstimos. */
  async downloadRelatorioEmprestimosMeeirosPdf(params?: {
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
  }): Promise<void> {
    const q = new URLSearchParams();
    if (params?.dataInicial?.trim()) q.set('dataInicial', params.dataInicial.trim());
    if (params?.dataFinal?.trim()) q.set('dataFinal', params.dataFinal.trim());
    if (params?.rocas?.length) q.set('rocas', params.rocas.join(','));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/emprestimos-meeiros/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-emprestimos-meeiros-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Abre o PDF de meeiros com empréstimos para impressão. */
  async printRelatorioEmprestimosMeeirosPdf(params?: {
    dataInicial?: string;
    dataFinal?: string;
    rocas?: number[];
  }): Promise<void> {
    const q = new URLSearchParams();
    if (params?.dataInicial?.trim()) q.set('dataInicial', params.dataInicial.trim());
    if (params?.dataFinal?.trim()) q.set('dataFinal', params.dataFinal.trim());
    if (params?.rocas?.length) q.set('rocas', params.rocas.join(','));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorios/emprestimos-meeiros/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /** Dados do Relatório de Lançamento de Produtos (apenas produtos com lançamento no período). */
  async getRelatorioLancamentoProdutos(params?: {
    data_inicial?: string;
    data_final?: string;
    rocaId?: number;
    produtorId?: number;
    produtoId?: number;
  }): Promise<RelatorioLancamentoProdutosLinha[]> {
    const q = new URLSearchParams();
    if (params?.data_inicial) q.set('data_inicial', params.data_inicial);
    if (params?.data_final) q.set('data_final', params.data_final);
    if (params?.rocaId != null) q.set('rocaId', String(params.rocaId));
    if (params?.produtorId != null) q.set('produtorId', String(params.produtorId));
    if (params?.produtoId != null) q.set('produtoId', String(params.produtoId));
    const query = q.toString();
    return apiClient.get<RelatorioLancamentoProdutosLinha[]>(
      `${BASE}/relatorio/lancamento-produtos${query ? `?${query}` : ''}`
    );
  }

  async downloadRelatorioLancamentoProdutosPdf(
    dataInicial?: string,
    dataFinal?: string,
    rocaId?: number,
    produtorId?: number,
    produtoId?: number
  ): Promise<void> {
    const q = new URLSearchParams();
    if (dataInicial?.trim()) q.set('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) q.set('data_final', dataFinal.trim());
    if (rocaId != null) q.set('rocaId', String(rocaId));
    if (produtorId != null) q.set('produtorId', String(produtorId));
    if (produtoId != null) q.set('produtoId', String(produtoId));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorio/lancamento-produtos/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-lancamento-produtos-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async printRelatorioLancamentoProdutosPdf(
    dataInicial?: string,
    dataFinal?: string,
    rocaId?: number,
    produtorId?: number,
    produtoId?: number
  ): Promise<void> {
    const q = new URLSearchParams();
    if (dataInicial?.trim()) q.set('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) q.set('data_final', dataFinal.trim());
    if (rocaId != null) q.set('rocaId', String(rocaId));
    if (produtorId != null) q.set('produtorId', String(produtorId));
    if (produtoId != null) q.set('produtoId', String(produtoId));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorio/lancamento-produtos/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  /** Produto (nome), quantidade total e roça de origem — uma linha por produto + roça. */
  async getRelatorioProdutoPorOrigem(params?: {
    data_inicial?: string;
    data_final?: string;
    rocaId?: number;
    produtorId?: number;
    produtoId?: number;
  }): Promise<RelatorioProdutoPorOrigemLinha[]> {
    const q = new URLSearchParams();
    if (params?.data_inicial) q.set('data_inicial', params.data_inicial);
    if (params?.data_final) q.set('data_final', params.data_final);
    if (params?.rocaId != null) q.set('rocaId', String(params.rocaId));
    if (params?.produtorId != null) q.set('produtorId', String(params.produtorId));
    if (params?.produtoId != null) q.set('produtoId', String(params.produtoId));
    const query = q.toString();
    return apiClient.get<RelatorioProdutoPorOrigemLinha[]>(
      `${BASE}/relatorio/produto-por-origem${query ? `?${query}` : ''}`
    );
  }

  async downloadRelatorioProdutoPorOrigemPdf(
    dataInicial?: string,
    dataFinal?: string,
    rocaId?: number,
    produtorId?: number,
    produtoId?: number
  ): Promise<void> {
    const q = new URLSearchParams();
    if (dataInicial?.trim()) q.set('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) q.set('data_final', dataFinal.trim());
    if (rocaId != null) q.set('rocaId', String(rocaId));
    if (produtorId != null) q.set('produtorId', String(produtorId));
    if (produtoId != null) q.set('produtoId', String(produtoId));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorio/produto-por-origem/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-produto-origem-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async printRelatorioProdutoPorOrigemPdf(
    dataInicial?: string,
    dataFinal?: string,
    rocaId?: number,
    produtorId?: number,
    produtoId?: number
  ): Promise<void> {
    const q = new URLSearchParams();
    if (dataInicial?.trim()) q.set('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) q.set('data_final', dataFinal.trim());
    if (rocaId != null) q.set('rocaId', String(rocaId));
    if (produtorId != null) q.set('produtorId', String(produtorId));
    if (produtoId != null) q.set('produtoId', String(produtoId));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorio/produto-por-origem/pdf${query ? `?${query}` : ''}`
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }

  async downloadRelatorioColheitaMeeirosPdf(
    dataInicial?: string,
    dataFinal?: string,
    rocaId?: number,
    produtorId?: number,
    produtoId?: number,
    meeiroId?: number,
  ): Promise<void> {
    const q = new URLSearchParams();
    if (dataInicial?.trim()) q.set('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) q.set('data_final', dataFinal.trim());
    if (rocaId != null) q.set('rocaId', String(rocaId));
    if (produtorId != null) q.set('produtorId', String(produtorId));
    if (produtoId != null) q.set('produtoId', String(produtoId));
    if (meeiroId != null) q.set('meeiroId', String(meeiroId));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorio/colheita-meeiros/pdf${query ? `?${query}` : ''}`,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-colheita-meeiros-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async printRelatorioColheitaMeeirosPdf(
    dataInicial?: string,
    dataFinal?: string,
    rocaId?: number,
    produtorId?: number,
    produtoId?: number,
    meeiroId?: number,
  ): Promise<void> {
    const q = new URLSearchParams();
    if (dataInicial?.trim()) q.set('data_inicial', dataInicial.trim());
    if (dataFinal?.trim()) q.set('data_final', dataFinal.trim());
    if (rocaId != null) q.set('rocaId', String(rocaId));
    if (produtorId != null) q.set('produtorId', String(produtorId));
    if (produtoId != null) q.set('produtoId', String(produtoId));
    if (meeiroId != null) q.set('meeiroId', String(meeiroId));
    const query = q.toString();
    const blob = await apiClient.getBlob(
      `${BASE}/relatorio/colheita-meeiros/pdf${query ? `?${query}` : ''}`,
    );
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      throw new Error('Não foi possível abrir o PDF para impressão. Verifique o bloqueador de pop-ups.');
    }
  }
}

export interface RelatorioLancamentoProdutosLinha {
  produto_id: number;
  codigo: string;
  nome: string;
  roca_nome: string;
  estoque_inicial: number;
  qtde_lancada: number;
  valor_total_lancado: number;
  total_pagar_meeiros: number;
  estoque_atual: number;
}

export interface RelatorioProdutoPorOrigemLinha {
  nome_produto: string;
  total_quantidade: number;
  /** Média ponderada: valor_total / total_quantidade (alinha com Σ(qtd×preço) dos itens). */
  preco_unitario: number;
  /** Soma dos valor_total dos itens (= Σ quantidade × preço por lançamento). */
  valor_total: number;
  origem_roca: string;
}

export const controleRocaService = new ControleRocaService();
