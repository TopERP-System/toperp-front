import { apiClient } from './api';

export interface Usuario {
  id: string;
  tenant_id?: string;
  nome: string;
  email: string;
  role: 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'FINANCEIRO' | 'SUPER_ADMIN';
  ativo: boolean;
  ultimo_acesso?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUsuarioDto {
  nome: string;
  email: string;
  senha: string;
  role?: 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'FINANCEIRO';
  ativo?: boolean;
}

export interface UpdateUsuarioDto {
  nome?: string;
  email?: string;
  senha?: string;
  role?: 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'FINANCEIRO';
  ativo?: boolean;
}

class UsuariosService {
  async listar(): Promise<Usuario[]> {
    return apiClient.get<Usuario[]>('/usuarios');
  }

  async buscarPorId(id: string): Promise<Usuario> {
    return apiClient.get<Usuario>(`/usuarios/${id}`);
  }

  async criar(data: CreateUsuarioDto): Promise<Usuario> {
    return apiClient.post<Usuario>('/usuarios', data);
  }

  async atualizar(id: string, data: UpdateUsuarioDto): Promise<Usuario> {
    return apiClient.put<Usuario>(`/usuarios/${id}`, data);
  }

  async ativar(id: string): Promise<Usuario> {
    return apiClient.put<Usuario>(`/usuarios/${id}/ativar`, {});
  }

  async desativar(id: string): Promise<Usuario> {
    return apiClient.put<Usuario>(`/usuarios/${id}/desativar`, {});
  }

  async deletar(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/usuarios/${id}`);
  }
}

export const usuariosService = new UsuariosService();




