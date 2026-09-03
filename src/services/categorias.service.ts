import { apiClient } from './api';

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  status: 'ATIVO' | 'INATIVO';
  criado_em?: string;
  atualizado_em?: string;
}

export interface CreateCategoriaDto {
  nome: string;
  descricao?: string;
  status?: 'ATIVO' | 'INATIVO';
}

export interface CategoriasResponse {
  data: Categoria[];
  total: number;
  page: number;
  limit: number;
}

class CategoriasService {
  async listar(params?: {
    page?: number;
    limit?: number;
    statusCategoria?: 'ATIVO' | 'INATIVO';
  }): Promise<CategoriasResponse | Categoria[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.statusCategoria) queryParams.append('statusCategoria', params.statusCategoria);

    const query = queryParams.toString();
    const response = await apiClient.get<CategoriasResponse | Categoria[]>(
      `/categoria${query ? `?${query}` : ''}`
    );

    // Se retornar array direto, normaliza para o formato esperado
    if (Array.isArray(response)) {
      return response;
    }

    return response;
  }

  async buscarPorId(id: number): Promise<Categoria> {
    return apiClient.get<Categoria>(`/categoria/${id}`);
  }

  async criar(data: CreateCategoriaDto): Promise<Categoria> {
    return apiClient.post<Categoria>('/categoria', data);
  }

  async atualizar(id: number, data: Partial<CreateCategoriaDto>): Promise<Categoria> {
    return apiClient.patch<Categoria>(`/categoria/${id}`, data);
  }

  async deletar(id: number): Promise<void> {
    return apiClient.delete<void>(`/categoria/${id}`);
  }

  async buscarSugestoes(termo: string, limit: number = 10, apenasAtivos: boolean = true): Promise<Categoria[]> {
    return apiClient.get<Categoria[]>(
      `/categoria/sugestoes?termo=${termo}&limit=${limit}&apenasAtivos=${apenasAtivos}`
    );
  }
}

export const categoriasService = new CategoriasService();

