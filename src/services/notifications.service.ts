import { apiClient } from './api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// Interface para a resposta do backend (campos em português)
interface BackendNotification {
  id: string;
  usuario_id?: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  lida: boolean;
  criado_em: string;
  atualizado_em?: string;
  action_url?: string;
}

export interface NotificationsResponse {
  data: BackendNotification[];
  total: number;
  unread: number;
}

/**
 * Converte uma notificação do backend (português) para o formato do frontend (inglês)
 */
function mapBackendNotification(backend: BackendNotification): Notification {
  return {
    id: backend.id,
    title: backend.titulo,
    message: backend.mensagem,
    type: backend.tipo,
    read: backend.lida,
    createdAt: backend.criado_em,
    actionUrl: backend.action_url,
  };
}

class NotificationsService {
  /**
   * Busca todas as notificações do usuário
   */
  async listar(): Promise<Notification[]> {
    try {
      const response = await apiClient.get<NotificationsResponse | BackendNotification[]>('/notificacoes');
      
      // Se a API retornar um objeto com data, extrai o array
      let backendNotifications: BackendNotification[];
      if (Array.isArray(response)) {
        backendNotifications = response;
      } else {
        backendNotifications = (response as NotificationsResponse).data || [];
      }
      
      // Mapeia as notificações do formato do backend para o formato do frontend
      return backendNotifications.map(mapBackendNotification);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  /**
   * Marca uma notificação como lida
   */
  async marcarComoLida(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notificacoes/${id}/ler`);
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  async marcarTodasComoLidas(): Promise<void> {
    try {
      await apiClient.patch('/notificacoes/ler-todas');
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  }

  /**
   * Remove uma notificação
   */
  async remover(id: string): Promise<void> {
    try {
      await apiClient.delete(`/notificacoes/${id}`);
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
    }
  }

  /**
   * Remove todas as notificações
   */
  async removerTodas(): Promise<void> {
    try {
      await apiClient.delete('/notificacoes');
    } catch (error) {
      console.error('Erro ao remover todas as notificações:', error);
    }
  }
}

export const notificationsService = new NotificationsService();

