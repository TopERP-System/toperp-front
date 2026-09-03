import { apiClient } from './api';
import {
  Transportadora,
  CreateTransportadoraDto,
  UpdateTransportadoraDto,
  ListarTransportadorasParams,
  ListarTransportadorasResponse,
  Pedido,
} from '@/types/carrier';

class TransportadorasService {
  /**
   * Listar transportadoras com paginação e busca
   */
  async listar(params?: ListarTransportadorasParams): Promise<ListarTransportadorasResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.termo) queryParams.append('termo', params.termo);
    if (params?.apenasAtivos) queryParams.append('apenasAtivos', 'true');

    const query = queryParams.toString();
    const response = await apiClient.get<ListarTransportadorasResponse | Transportadora[]>(
      `/transportadoras${query ? `?${query}` : ''}`
    );

    // Se retornar array direto, normaliza para o formato esperado
    if (Array.isArray(response)) {
      return {
        transportadoras: response,
        total: response.length,
        page: params?.page || 1,
        limit: params?.limit || 15,
      };
    }

    return response;
  }

  /**
   * Buscar transportadora por ID
   */
  async buscarPorId(id: number, incluirPedidos: boolean = false): Promise<Transportadora> {
    const params = incluirPedidos ? '?incluirPedidos=true' : '';
    return apiClient.get<Transportadora>(`/transportadoras/${id}${params}`);
  }

  /**
   * Buscar por nome ou CNPJ
   */
  async buscarPorNomeOuCnpj(termo: string): Promise<Transportadora[]> {
    return apiClient.get<Transportadora[]>(
      `/transportadoras/buscar?termo=${encodeURIComponent(termo)}`
    );
  }

  /**
   * Buscar pedidos por transportadora
   */
  async buscarPedidosPorTransportadora(
    identificador: string | number,
    page: number = 1,
    limit: number = 15
  ): Promise<{ pedidos: Pedido[]; total: number }> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiClient.get<{ pedidos: Pedido[]; total: number }>(
      `/transportadoras/${identificador}/pedidos?${queryParams}`
    );
  }

  /**
   * Criar nova transportadora
   */
  async criar(data: CreateTransportadoraDto): Promise<Transportadora> {
    // Limpar strings vazias convertendo para undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    ) as CreateTransportadoraDto;

    return apiClient.post<Transportadora>('/transportadoras', cleanedData);
  }

  /**
   * Atualizar transportadora
   */
  async atualizar(id: number, data: UpdateTransportadoraDto): Promise<Transportadora> {
    // Limpar strings vazias convertendo para undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    ) as UpdateTransportadoraDto;

    return apiClient.patch<Transportadora>(`/transportadoras/${id}`, cleanedData);
  }

  /**
   * Ativar/Desativar transportadora
   */
  async alterarStatus(id: number, ativo: boolean): Promise<Transportadora> {
    return apiClient.patch<Transportadora>(
      `/transportadoras/${id}/status?ativo=${ativo}`
    );
  }

  /**
   * Deletar transportadora (soft delete)
   */
  async deletar(id: number): Promise<void> {
    return apiClient.delete<void>(`/transportadoras/${id}`);
  }
}

export const transportadorasService = new TransportadorasService();



