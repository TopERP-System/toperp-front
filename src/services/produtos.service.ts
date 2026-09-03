import { apiClient } from './api';

export interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  sku: string;
  preco_custo: number;
  preco_venda: number;
  preco_promocional?: number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo?: number;
  localizacao?: string;
  statusProduto: 'ATIVO' | 'INATIVO';
  unidade_medida: 'UN' | 'KG' | 'LT' | 'CX';
  data_validade?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  observacoes?: string;
  peso?: number;
  altura?: number;
  largura?: number;
  categoriaId?: number;
  fornecedorId?: number;
  categoria?: {
    id: number;
    nome: string;
  };
  fornecedor?: {
    id: number;
    nome_fantasia: string;
  };
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface CreateProdutoDto {
  nome?: string;
  descricao?: string;
  sku?: string; // Opcional: se não enviado ou vazio, backend gera SKU-01, SKU-02, ...
  preco_custo?: number;
  preco_venda?: number;
  preco_promocional?: number;
  estoque_atual?: number;
  estoque_minimo?: number;
  estoque_maximo?: number;
  localizacao?: string;
  statusProduto?: 'ATIVO' | 'INATIVO';
  unidade_medida: 'UN' | 'KG' | 'LT' | 'CX';
  data_validade?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  observacoes?: string;
  peso?: number;
  altura?: number;
  largura?: number;
  categoriaId?: number;
  fornecedorId?: number;
}

export interface ProdutosResponse {
  data?: Produto[];
  produtos?: Produto[];
  total: number;
  page?: number;
  limit?: number;
}

export interface FiltrosProdutos {
  termo?: string;
  categoriaId?: number;
  fornecedorId?: number;
  nomeFornecedor?: string;
  statusProduto?: 'ATIVO' | 'INATIVO' | '';
  unidade_medida?: 'UN' | 'KG' | 'LT' | 'CX' | '';
  precoMin?: number;
  precoMax?: number;
  estoqueMin?: number;
  estoqueMax?: number;
  validadeInicial?: string;
  validadeFinal?: string;
  /** Data de cadastro (criadoEm) — YYYY-MM-DD */
  cadastroInicial?: string;
  cadastroFinal?: string;
  page?: number;
  limit?: number;
}

class ProdutosService {
  async listar(params?: {
    page?: number;
    limit?: number;
    statusProduto?: string;
  }): Promise<ProdutosResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.statusProduto) queryParams.append('statusProduto', params.statusProduto);

    const query = queryParams.toString();
    return apiClient.get<ProdutosResponse>(`/produtos${query ? `?${query}` : ''}`);
  }

  async buscarPorId(id: number): Promise<Produto> {
    return apiClient.get<Produto>(`/produtos/${id}`);
  }

  /** Produtos vinculados ao fornecedor (GET /produtos/fornecedor/:fornecedorId) - usar em pedido de COMPRA */
  async buscarPorFornecedor(
    fornecedorId: number,
    page = 1,
    limit = 100
  ): Promise<Produto[]> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
    const response = await apiClient.get<Produto[] | ProdutosResponse>(
      `/produtos/fornecedor/${fornecedorId}${query ? `?${query}` : ''}`
    );
    if (Array.isArray(response)) return response;
    return (response as ProdutosResponse).data ?? (response as ProdutosResponse).produtos ?? [];
  }

  async criar(data: CreateProdutoDto): Promise<Produto> {
    return apiClient.post<Produto>('/produtos', data);
  }

  async atualizar(id: number, data: Partial<CreateProdutoDto>): Promise<Produto> {
    return apiClient.patch<Produto>(`/produtos/${id}`, data);
  }

  async deletar(id: number): Promise<void> {
    return apiClient.delete<void>(`/produtos/${id}`);
  }

  async buscarSugestoes(termo: string, limit: number = 10): Promise<Produto[]> {
    return apiClient.get<Produto[]>(`/produtos/sugestoes?termo=${termo}&limit=${limit}`);
  }

  async buscarAvancado(params?: FiltrosProdutos): Promise<ProdutosResponse> {
    const queryParams = new URLSearchParams();
    if (params?.termo) queryParams.append('termo', params.termo);
    if (params?.categoriaId) queryParams.append('categoriaId', params.categoriaId.toString());
    if (params?.fornecedorId) queryParams.append('fornecedorId', params.fornecedorId.toString());
    if (params?.nomeFornecedor) queryParams.append('nomeFornecedor', params.nomeFornecedor);
    if (params?.statusProduto) queryParams.append('statusProduto', params.statusProduto);
    if (params?.unidade_medida) queryParams.append('unidade_medida', params.unidade_medida);
    if (params?.precoMin) queryParams.append('precoMin', params.precoMin.toString());
    if (params?.precoMax) queryParams.append('precoMax', params.precoMax.toString());
    if (params?.estoqueMin) queryParams.append('estoqueMin', params.estoqueMin.toString());
    if (params?.estoqueMax) queryParams.append('estoqueMax', params.estoqueMax.toString());
    if (params?.validadeInicial) queryParams.append('validadeInicial', params.validadeInicial);
    if (params?.validadeFinal) queryParams.append('validadeFinal', params.validadeFinal);
    if (params?.cadastroInicial) queryParams.append('cadastroInicial', params.cadastroInicial);
    if (params?.cadastroFinal) queryParams.append('cadastroFinal', params.cadastroFinal);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiClient.get<ProdutosResponse>(`/produtos/buscar-avancado${query ? `?${query}` : ''}`);
  }
}

export const produtosService = new ProdutosService();

