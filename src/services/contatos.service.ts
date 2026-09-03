import { apiClient } from "./api";

export interface Contato {
  id: number;
  telefone: string;
  email?: string;
  nomeContato?: string;
  outroTelefone?: string;
  nomeOutroTelefone?: string;
  observacao?: string;
  ativo?: boolean;
  clienteId?: number;
  fornecedorId?: number;
}

export interface CreateContatoDto {
  nomeContato?: string;
  email?: string;
  telefone: string;
  outroTelefone?: string;
  nomeOutroTelefone?: string;
  observacao?: string;
  ativo?: boolean;
  clienteId?: number;
  fornecedorId?: number;
}

export interface UpdateContatoDto {
  nomeContato?: string;
  nome_contato?: string; // snake_case
  email?: string;
  telefone?: string;
  outroTelefone?: string;
  outro_telefone?: string; // snake_case
  nomeOutroTelefone?: string;
  nome_outro_telefone?: string; // snake_case
  observacao?: string;
  ativo?: boolean;
}

class ContatosService {
  async listar(params?: {
    page?: number;
    limit?: number;
    ativo?: boolean;
  }): Promise<Contato[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.ativo !== undefined)
      queryParams.append("ativo", params.ativo.toString());

    const query = queryParams.toString();
    return apiClient.get<Contato[]>(`/contatos${query ? `?${query}` : ""}`);
  }

  async buscarPorId(id: number): Promise<Contato> {
    return apiClient.get<Contato>(`/contatos/${id}`);
  }

  async buscarPorTelefone(telefone: string): Promise<Contato> {
    return apiClient.get<Contato>(`/contatos/telefone/${telefone}`);
  }

  async buscarPorEmail(email: string): Promise<Contato> {
    return apiClient.get<Contato>(`/contatos/email/${email}`);
  }

  async criar(data: CreateContatoDto): Promise<Contato> {
    // Mapear campos para snake_case conforme documentação
    const payload: Record<string, string | number | boolean | undefined> = {
      telefone: data.telefone.trim(),
    };

    if (data.nomeContato?.trim()) {
      payload.nome_contato = data.nomeContato.trim();
    }
    if (data.email?.trim()) {
      payload.email = data.email.trim();
    }
    if (data.outroTelefone?.trim()) {
      payload.outro_telefone = data.outroTelefone.trim();
    }
    if (data.nomeOutroTelefone?.trim()) {
      payload.nome_outro_telefone = data.nomeOutroTelefone.trim();
    }
    if (data.observacao?.trim()) {
      payload.observacao = data.observacao.trim();
    }
    if (data.ativo !== undefined) {
      payload.ativo = data.ativo;
    }
    if (data.clienteId) {
      payload.clienteId = data.clienteId;
    }
    if (data.fornecedorId) {
      payload.fornecedorId = data.fornecedorId;
    }

    return apiClient.post<Contato>("/contatos", payload);
  }

  async atualizar(id: number, data: UpdateContatoDto): Promise<Contato> {
    /**
     * Atualização de contato - Conforme GUIA-ATUALIZACAO-CONTATOS-ENDERECOS.md
     *
     * Permissões: ADMIN, GERENTE ou VENDEDOR
     *
     * Regras:
     * 1. Apenas campos definidos (não undefined) são enviados
     * 2. Strings vazias ("") são enviadas para limpar campos (backend trata como null)
     * 3. Campos undefined não são enviados (não alteram valores existentes)
     * 4. Backend aceita snake_case (preferencial) ou camelCase
     * 5. Todos os campos são opcionais na atualização (atualização parcial)
     */
    const payload: Record<string, string | number | boolean | undefined> = {};

    // Nome do contato - aceitar ambos os formatos (snake_case preferencial)
    if (data.nomeContato !== undefined) {
      // Strings vazias são enviadas para limpar campo (backend trata como null)
      payload.nome_contato =
        typeof data.nomeContato === "string"
          ? data.nomeContato.trim()
          : data.nomeContato;
    } else if (data.nome_contato !== undefined) {
      payload.nome_contato =
        typeof data.nome_contato === "string"
          ? data.nome_contato.trim()
          : data.nome_contato;
    }

    // Email - apenas se definido
    // Aceita strings vazias para limpar campo
    if (data.email !== undefined) {
      payload.email =
        typeof data.email === "string" ? data.email.trim() : data.email;
    }

    // Telefone - apenas se definido
    // Aceita strings vazias para limpar campo
    if (data.telefone !== undefined) {
      payload.telefone =
        typeof data.telefone === "string"
          ? data.telefone.trim()
          : data.telefone;
    }

    // Outro telefone - aceitar ambos os formatos (snake_case preferencial)
    if (data.outroTelefone !== undefined) {
      // Strings vazias são enviadas para limpar campo (backend trata como null)
      payload.outro_telefone =
        typeof data.outroTelefone === "string"
          ? data.outroTelefone.trim()
          : data.outroTelefone;
    } else if (data.outro_telefone !== undefined) {
      payload.outro_telefone =
        typeof data.outro_telefone === "string"
          ? data.outro_telefone.trim()
          : data.outro_telefone;
    }

    // Nome do outro telefone - aceitar ambos os formatos (snake_case preferencial)
    if (data.nomeOutroTelefone !== undefined) {
      // Strings vazias são enviadas para limpar campo (backend trata como null)
      payload.nome_outro_telefone =
        typeof data.nomeOutroTelefone === "string"
          ? data.nomeOutroTelefone.trim()
          : data.nomeOutroTelefone;
    } else if (data.nome_outro_telefone !== undefined) {
      payload.nome_outro_telefone =
        typeof data.nome_outro_telefone === "string"
          ? data.nome_outro_telefone.trim()
          : data.nome_outro_telefone;
    }

    // Observação - apenas se definido
    // Aceita strings vazias para limpar campo
    if (data.observacao !== undefined) {
      payload.observacao =
        typeof data.observacao === "string"
          ? data.observacao.trim()
          : data.observacao;
    }

    // Ativo - apenas se definido (boolean)
    if (data.ativo !== undefined) {
      payload.ativo = data.ativo;
    }

    // Log para debug (apenas em desenvolvimento)
    if (import.meta.env.DEV) {
      console.log("📤 [ContatosService] Atualizando contato:", {
        id,
        dadosRecebidos: data,
        payloadEnviado: payload,
        camposNoPayload: Object.keys(payload),
        payloadJSON: JSON.stringify(payload, null, 2),
        temNomeContato: "nomeContato" in data || "nome_contato" in data,
        nomeContatoNoPayload: payload.nome_contato,
        emailNoPayload: payload.email,
      });
    }

    // Validar se o payload não está vazio
    if (Object.keys(payload).length === 0) {
      console.warn(
        "⚠️ [ContatosService] Payload vazio! Nenhum campo para atualizar."
      );
      throw new Error("Nenhum campo foi modificado para atualizar");
    }

    return apiClient.patch<Contato>(`/contatos/${id}`, payload);
  }

  async deletar(id: number, clienteId?: number): Promise<void> {
    // Log detalhado em desenvolvimento
    if (import.meta.env.DEV) {
      console.log("🗑️ [ContatosService] Deletando contato:", {
        contatoId: id,
        clienteId: clienteId || "não fornecido",
      });
    }

    // O backend pode exigir clienteId no body da requisição DELETE (similar ao endereço)
    const url = `/contatos/${id}`;
    
    // Se não tiver clienteId, tentar deletar sem body primeiro
    if (!clienteId) {
      try {
        return await apiClient.delete<void>(url);
      } catch (error: any) {
        // Se der erro 400 pedindo clienteId, tentar novamente com clienteId
        if (error?.response?.status === 400 && error?.response?.data?.message?.includes('clienteId')) {
          throw new Error("clienteId é obrigatório para deletar contato");
        }
        throw error;
      }
    }
    
    try {
      // Usar request com método DELETE e body contendo clienteId
      const result = await apiClient.request<void>(url, {
        method: "DELETE",
        body: JSON.stringify({ clienteId }),
      });
      
      if (import.meta.env.DEV) {
        console.log("✅ [ContatosService] Contato deletado com sucesso:", {
          contatoId: id,
          clienteId,
        });
      }
      
      return result;
    } catch (error: any) {
      // Log detalhado do erro
      if (import.meta.env.DEV) {
        console.error("❌ [ContatosService] Erro ao deletar contato:", {
          contatoId: id,
          clienteId,
          error,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
          url,
        });
      }
      throw error;
    }
  }
}

export const contatosService = new ContatosService();
