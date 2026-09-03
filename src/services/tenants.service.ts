import { TenantConfiguracoes, UpdateTenantEmpresaDto } from '@/types/tenant-empresa';
import { apiClient } from './api';

export interface Tenant {
  id: string;
  codigo?: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone?: string;
  subdominio?: string;
  schema_name?: string;
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
  data_expiracao?: string | null;
  configuracoes?: TenantConfiguracoes;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  dataCriacao?: string;
  updatedAt?: string;
}

export interface CreateTenantDto {
  nome: string;
  cnpj: string;
  email: string;
  senha?: string;
  admin_senha?: string;
  admin_email?: string;
  telefone?: string;
  inscricaoEstadual?: string;
}

export type UpdateTenantInfoDto = UpdateTenantEmpresaDto;

class TenantsService {
  async listar(): Promise<Tenant[]> {
    const data = await apiClient.get<any[]>('/tenants');
    // Normaliza os dados, garantindo que created_at esteja presente
    return data.map((tenant) => ({
      ...tenant,
      created_at: tenant.created_at || tenant.createdAt || tenant.dataCriacao || tenant.data_criacao,
      updated_at: tenant.updated_at || tenant.updatedAt || tenant.data_atualizacao,
    })) as Tenant[];
  }

  async buscarPorId(id: string): Promise<Tenant> {
    const data = await apiClient.get<any>(`/tenants/${id}`);
    // Normaliza os dados
    return {
      ...data,
      created_at: data.created_at || data.createdAt || data.dataCriacao || data.data_criacao,
      updated_at: data.updated_at || data.updatedAt || data.data_atualizacao,
    } as Tenant;
  }

  // Novo endpoint para ADMIN/GERENTE obter informações do próprio tenant
  async obterMeuTenant(): Promise<Tenant> {
    const data = await apiClient.get<any>('/tenant/me');
    // Normaliza os dados
    return {
      ...data,
      created_at: data.created_at || data.createdAt || data.dataCriacao || data.data_criacao,
      updated_at: data.updated_at || data.updatedAt || data.data_atualizacao,
    } as Tenant;
  }

  // Novo endpoint para ADMIN atualizar informações do próprio tenant
  async atualizarMeuTenant(data: UpdateTenantInfoDto): Promise<Tenant> {
    const response = await apiClient.put<any>('/tenant/me', data);
    // Normaliza os dados
    return {
      ...response,
      created_at: response.created_at || response.createdAt || response.dataCriacao || response.data_criacao,
      updated_at: response.updated_at || response.updatedAt || response.data_atualizacao,
    } as Tenant;
  }

  async criar(data: CreateTenantDto): Promise<Tenant> {
    const payload = {
      nome: data.nome,
      cnpj: data.cnpj,
      email: data.email,
      telefone: data.telefone,
      inscricaoEstadual: data.inscricaoEstadual,
      admin_email: data.admin_email ?? data.email,
      admin_senha: data.admin_senha ?? data.senha,
    };
    const response = await apiClient.post<any>('/tenants', payload);
    // Normaliza os dados
    return {
      ...response,
      created_at: response.created_at || response.createdAt || response.dataCriacao || response.data_criacao,
      updated_at: response.updated_at || response.updatedAt || response.data_atualizacao,
    } as Tenant;
  }

  async atualizar(id: string, data: UpdateTenantInfoDto | Partial<CreateTenantDto>): Promise<Tenant> {
    const response = await apiClient.put<any>(`/tenants/${id}`, data);
    // Normaliza os dados
    return {
      ...response,
      created_at: response.created_at || response.createdAt || response.dataCriacao || response.data_criacao,
      updated_at: response.updated_at || response.updatedAt || response.data_atualizacao,
    } as Tenant;
  }

  async bloquear(id: string): Promise<Tenant> {
    const response = await apiClient.put<any>(`/tenants/${id}/bloquear`, {});
    // Normaliza os dados
    return {
      ...response,
      created_at: response.created_at || response.createdAt || response.dataCriacao || response.data_criacao,
      updated_at: response.updated_at || response.updatedAt || response.data_atualizacao,
    } as Tenant;
  }

  async desbloquear(id: string): Promise<Tenant> {
    const response = await apiClient.put<any>(`/tenants/${id}/desbloquear`, {});
    // Normaliza os dados
    return {
      ...response,
      created_at: response.created_at || response.createdAt || response.dataCriacao || response.data_criacao,
      updated_at: response.updated_at || response.updatedAt || response.data_atualizacao,
    } as Tenant;
  }

  async ativar(id: string): Promise<Tenant> {
    const response = await apiClient.put<any>(`/tenants/${id}/ativar`, {});
    // Normaliza os dados
    return {
      ...response,
      created_at: response.created_at || response.createdAt || response.dataCriacao || response.data_criacao,
      updated_at: response.updated_at || response.updatedAt || response.data_atualizacao,
    } as Tenant;
  }

  async desativar(id: string): Promise<Tenant> {
    const response = await apiClient.put<any>(`/tenants/${id}/desativar`, {});
    // Normaliza os dados
    return {
      ...response,
      created_at: response.created_at || response.createdAt || response.dataCriacao || response.data_criacao,
      updated_at: response.updated_at || response.updatedAt || response.data_atualizacao,
    } as Tenant;
  }

  async excluir(
    id: string,
    senhaConfirmacao: string,
  ): Promise<{ message: string; schema_name: string; id: string }> {
    return apiClient.delete<{ message: string; schema_name: string; id: string }>(
      `/tenants/${id}`,
      { senha_confirmacao: senhaConfirmacao },
    );
  }
}

export const tenantsService = new TenantsService();

