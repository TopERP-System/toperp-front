import { isTokenExpired } from '@/lib/token-utils';
import { apiClient } from './api';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    nome?: string;
  };
  usuario?: {
    id: string;
    email: string;
    role: string;
    nome?: string;
  };
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/usuarios/login',
      credentials,
      { public: true }
    );

    // A API pode retornar 'user' ou 'usuario', normaliza para 'user'
    const userData = response.user || response.usuario;

    // Salva o token no localStorage
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }
    }

    // Retorna resposta normalizada
    return {
      ...response,
      user: userData,
    };
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/usuarios/logout', undefined, { public: false });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Remove todos os tokens e dados do usuário (segurança)
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Remove token e dados do usuário do storage (ex.: token expirado).
   */
  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * Verifica se há token válido (existente e não expirado).
   * Se o token estiver expirado, limpa o storage e retorna false.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (isTokenExpired(token)) {
      this.clearSession();
      return false;
    }
    return true;
  }
}

export const authService = new AuthService();

