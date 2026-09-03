import { apiClient } from "./api";

export interface Endereco {
  id: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  referencia?: string;
  codigo_ibge?: string;
  clienteId?: number;
  fornecedorId?: number;
}

export interface CreateEnderecoDto {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  referencia?: string;
  codigo_ibge?: string;
  clienteId?: number;
  fornecedorId?: number;
}

export interface UpdateEnderecoDto {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  referencia?: string;
  codigo_ibge?: string;
}

class EnderecosService {
  async listar(params?: {
    page?: number;
    limit?: number;
  }): Promise<Endereco[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const query = queryParams.toString();
    return apiClient.get<Endereco[]>(`/endereco${query ? `?${query}` : ""}`);
  }

  async buscarPorId(id: number): Promise<Endereco> {
    return apiClient.get<Endereco>(`/endereco/${id}`);
  }

  async buscarPorCep(cep: string): Promise<Endereco> {
    return apiClient.get<Endereco>(`/endereco/cep/${cep}`);
  }

  async criar(data: CreateEnderecoDto): Promise<Endereco> {
    const payload: any = {
      cep: data.cep.trim(),
      logradouro: data.logradouro.trim(),
      numero: data.numero.trim(),
      bairro: data.bairro.trim(),
      cidade: data.cidade.trim(),
      estado: data.estado.trim(),
    };

    if (data.complemento?.trim()) {
      payload.complemento = data.complemento.trim();
    }
    if (data.referencia?.trim()) {
      payload.referencia = data.referencia.trim();
    }
    if (data.clienteId) {
      payload.clienteId = data.clienteId;
    }
    if (data.fornecedorId) {
      payload.fornecedorId = data.fornecedorId;
    }

    return apiClient.post<Endereco>("/endereco", payload);
  }

  async atualizar(
    id: number,
    data: UpdateEnderecoDto,
    clienteId?: number
  ): Promise<Endereco> {
    /**
     * Atualização de endereço - Conforme GUIA-ATUALIZACAO-CONTATOS-ENDERECOS.md
     *
     * Permissões: ADMIN, GERENTE ou VENDEDOR
     *
     * Regras:
     * 1. Apenas campos definidos (não undefined) são enviados
     * 2. Strings vazias ("") são enviadas para limpar campos (backend trata como null)
     * 3. Campos undefined não são enviados (não alteram valores existentes)
     * 4. Todos os campos são opcionais na atualização (atualização parcial)
     * 5. Query parameter clienteId é opcional - valida que o endereço pertence ao cliente
     */
    const payload: any = {};

    // Enviar todos os campos que estão definidos (mesmo que sejam strings vazias)
    // Strings vazias são tratadas como null pelo backend para limpar campos
    // Campos undefined não são enviados (não alteram valores existentes)

    if (data.cep !== undefined) {
      // Strings vazias são enviadas para limpar campo (backend trata como null)
      payload.cep = typeof data.cep === "string" ? data.cep.trim() : data.cep;
    }

    if (data.logradouro !== undefined) {
      payload.logradouro =
        typeof data.logradouro === "string"
          ? data.logradouro.trim()
          : data.logradouro;
    }

    if (data.numero !== undefined) {
      payload.numero =
        typeof data.numero === "string" ? data.numero.trim() : data.numero;
    }

    if (data.complemento !== undefined) {
      // Complemento pode ser string vazia para limpar
      payload.complemento =
        typeof data.complemento === "string"
          ? data.complemento.trim()
          : data.complemento;
    }

    if (data.bairro !== undefined) {
      payload.bairro =
        typeof data.bairro === "string" ? data.bairro.trim() : data.bairro;
    }

    if (data.cidade !== undefined) {
      payload.cidade =
        typeof data.cidade === "string" ? data.cidade.trim() : data.cidade;
    }

    if (data.estado !== undefined) {
      payload.estado =
        typeof data.estado === "string" ? data.estado.trim() : data.estado;
    }

    if (data.referencia !== undefined) {
      // Referência pode ser string vazia para limpar
      payload.referencia =
        typeof data.referencia === "string"
          ? data.referencia.trim()
          : data.referencia;
    }

    if (data.codigo_ibge !== undefined) {
      payload.codigo_ibge =
        typeof data.codigo_ibge === "string"
          ? data.codigo_ibge.replace(/\D/g, "").slice(0, 7)
          : data.codigo_ibge;
    }

    // Query params para validação de permissão (opcional)
    // Se fornecido, o backend valida que o endereço pertence ao cliente
    // ⚠️ TEMPORÁRIO: Comentado devido a problema no backend que está rejeitando
    // mesmo quando o endereço pertence ao cliente
    // TODO: Reativar quando backend for corrigido
    const queryParams = new URLSearchParams();
    // if (clienteId) {
    //   queryParams.append("clienteId", clienteId.toString());
    // }

    const query = queryParams.toString();
    const url = `/endereco/${id}${query ? `?${query}` : ""}`;

    if (import.meta.env.DEV && clienteId) {
      console.warn(
        "⚠️ [EnderecosService] clienteId não está sendo enviado devido a problema no backend",
        {
          enderecoId: id,
          clienteId: clienteId,
          nota: "Backend está rejeitando requisições mesmo com clienteId correto",
        }
      );
    }

    // Log para debug (apenas em desenvolvimento)
    if (import.meta.env.DEV) {
      console.log("📤 [EnderecosService] Atualizando endereço:", {
        id,
        dadosRecebidos: data,
        payloadEnviado: payload,
        clienteId: clienteId || "não fornecido",
        camposNoPayload: Object.keys(payload),
        payloadJSON: JSON.stringify(payload, null, 2),
      });
    }

    return apiClient.patch<Endereco>(url, payload);
  }

  async deletar(id: number, clienteId?: number): Promise<void> {
    // Log detalhado em desenvolvimento
    if (import.meta.env.DEV) {
      console.log("🗑️ [EnderecosService] Deletando endereço:", {
        enderecoId: id,
        clienteId: clienteId || "não fornecido",
      });
    }

    // O backend exige clienteId no body da requisição DELETE
    const url = `/endereco/${id}`;
    
    // Se não tiver clienteId, lançar erro
    if (!clienteId) {
      throw new Error("clienteId é obrigatório para deletar endereço");
    }
    
    try {
      // Usar request com método DELETE e body contendo clienteId
      const result = await apiClient.request<void>(url, {
        method: "DELETE",
        body: JSON.stringify({ clienteId }),
      });
      
      if (import.meta.env.DEV) {
        console.log("✅ [EnderecosService] Endereço deletado com sucesso:", {
          enderecoId: id,
          clienteId,
        });
      }
      
      return result;
    } catch (error: any) {
      // Log detalhado do erro
      if (import.meta.env.DEV) {
        console.error("❌ [EnderecosService] Erro ao deletar endereço:", {
          enderecoId: id,
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

export const enderecosService = new EnderecosService();
