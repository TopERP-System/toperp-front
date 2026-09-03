/**
 * Tipos e interfaces compartilhados entre features
 */

export interface BaseEntity {
  id?: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export type StatusType = "ATIVO" | "INATIVO" | "BLOQUEADO" | "INADIMPLENTE";
export type TipoPessoa = "PESSOA_FISICA" | "PESSOA_JURIDICA";




