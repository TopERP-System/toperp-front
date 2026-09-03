import { apiClient } from './api';

export interface Configuracoes {
  tema?: 'claro' | 'escuro';
  moeda?: string;
  fuso_horario?: string;
  idioma?: string;
  /** Singular exibido no lugar de "Roça" (fora do Controle de Roça). */
  rotulo_roca?: string;
  /** Oculta o item Controle de Roça no menu. */
  ocultar_menu_controle_roca?: boolean;
  [key: string]: unknown;
}

export interface UpdateConfiguracoesDto {
  configuracoes?: Configuracoes;
  tema?: 'claro' | 'escuro';
  moeda?: string;
  fuso_horario?: string;
  idioma?: string;
  rotulo_roca?: string;
  ocultar_menu_controle_roca?: boolean;
}

class ConfiguracoesService {
  async obter(): Promise<Configuracoes> {
    return apiClient.get<Configuracoes>('/configuracoes');
  }

  async atualizar(data: UpdateConfiguracoesDto): Promise<Configuracoes> {
    if (data.configuracoes) {
      return apiClient.put<Configuracoes>('/configuracoes', {
        configuracoes: data.configuracoes,
      });
    }

    const payload: Partial<Configuracoes> = {};
    if (data.tema !== undefined) payload.tema = data.tema;
    if (data.moeda !== undefined) payload.moeda = data.moeda;
    if (data.fuso_horario !== undefined) payload.fuso_horario = data.fuso_horario;
    if (data.idioma !== undefined) payload.idioma = data.idioma;
    if (data.rotulo_roca !== undefined) payload.rotulo_roca = data.rotulo_roca;
    if (data.ocultar_menu_controle_roca !== undefined) {
      payload.ocultar_menu_controle_roca = data.ocultar_menu_controle_roca;
    }

    return apiClient.put<Configuracoes>('/configuracoes', payload);
  }
}

export const configuracoesService = new ConfiguracoesService();
