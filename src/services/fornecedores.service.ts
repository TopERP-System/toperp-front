import { prepararPayloadAtualizacaoFornecedor, tratarErroAtualizacao } from "@/lib/update-payload";
import { FornecedorFormState } from "@/shared/types/update.types";
import { apiClient } from "./api";

export interface Contato {
  id?: number;
  telefone?: string;
  email?: string;
  nomeContato?: string;
  nome_contato?: string;
  outroTelefone?: string;
  outro_telefone?: string;
  nomeOutroTelefone?: string;
  nome_outro_telefone?: string;
  observacao?: string;
  ativo?: boolean;
}

export interface Endereco {
  id?: number;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  referencia?: string;
}

export interface Fornecedor {
  id: number;
  nome_fantasia: string; // Obrigatório
  nome_razao?: string | null; // Campo interno do backend (apenas leitura) - não enviar no CreateFornecedorDto
  tipoFornecedor?: "PESSOA_FISICA" | "PESSOA_JURIDICA" | null;
  statusFornecedor?: "ATIVO" | "INATIVO" | "BLOQUEADO" | null;
  cpf_cnpj?: string | null;
  inscricao_estadual?: string | null;
  criandoEm?: string;
  atualizadoEm?: string;
  enderecos?: Endereco[];
  contato?: Contato[];
}

export interface CreateEnderecoDto {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  referencia?: string;
}

export interface CreateContatoDto {
  nome_contato?: string;
  nomeContato?: string;
  email?: string;
  telefone?: string;
  outro_telefone?: string;
  outroTelefone?: string;
  nome_outro_telefone?: string;
  nomeOutroTelefone?: string;
  observacao?: string;
  ativo?: boolean;
}

export interface CreateFornecedorDto {
  // Obrigatório
  nome_fantasia: string;
  
  // Opcionais (conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md)
  // ⚠️ nome_razao NÃO DEVE SER USADO no frontend - é campo interno do backend
  // Se não enviar nome_razao, o backend usa nome_fantasia automaticamente
  tipoFornecedor?: "PESSOA_FISICA" | "PESSOA_JURIDICA" | null;
  statusFornecedor?: "ATIVO" | "INATIVO" | "BLOQUEADO" | null;
  cpf_cnpj?: string | null;
  documento?: string | null; // Alias de cpf_cnpj
  inscricao_estadual?: string | null;
  enderecos?: CreateEnderecoDto[] | null;
  contato?: CreateContatoDto[] | null;
}

export interface FornecedoresResponse {
  data?: Fornecedor[];
  fornecedores?: Fornecedor[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface FornecedoresEstatisticas {
  total: number;
  ativos: number;
  inativos: number;
  bloqueados: number;
  novosNoMes: number;
}

class FornecedoresService {
  async listar(params?: {
    page?: number;
    limit?: number;
    tipoFornecedor?: string;
    statusFornecedor?: string;
  }): Promise<FornecedoresResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.tipoFornecedor)
      queryParams.append("tipoFornecedor", params.tipoFornecedor);
    if (params?.statusFornecedor)
      queryParams.append("statusFornecedor", params.statusFornecedor);

    const query = queryParams.toString();
    return apiClient.get<FornecedoresResponse>(
      `/fornecedor${query ? `?${query}` : ""}`
    );
  }

  async buscarPorId(id: number): Promise<Fornecedor> {
    return apiClient.get<Fornecedor>(`/fornecedor/${id}`);
  }

  async criar(data: CreateFornecedorDto): Promise<Fornecedor> {
    // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: apenas nome_fantasia é obrigatório
    // Campo nome_razao NÃO EXISTE - não enviar
    // Não enviar campos vazios/undefined - apenas campos preenchidos
    const payload: any = {
      nome_fantasia: data.nome_fantasia,
    };

    // Campos opcionais - só enviar se informados
    if (data.tipoFornecedor) {
      payload.tipoFornecedor = data.tipoFornecedor;
    }
    
    if (data.statusFornecedor) {
      payload.statusFornecedor = data.statusFornecedor;
    }
    
    if (data.cpf_cnpj && data.cpf_cnpj.trim()) {
      payload.cpf_cnpj = data.cpf_cnpj;
    }

    if (data.inscricao_estadual && data.inscricao_estadual.trim()) {
      payload.inscricao_estadual = data.inscricao_estadual.trim();
    }

    // Adicionar endereços se fornecidos
    if (data.enderecos && data.enderecos.length > 0) {
      payload.enderecos = data.enderecos;
    }

    // Adicionar contatos se fornecidos
    if (data.contato && data.contato.length > 0) {
      payload.contato = data.contato;
    }

    return apiClient.post<Fornecedor>("/fornecedor", payload);
  }

  async atualizar(
    id: number,
    data: Partial<CreateFornecedorDto>
  ): Promise<Fornecedor> {
    // Debug: log detalhado do que está sendo enviado
    if (import.meta.env.DEV) {
      console.log("📤 [FornecedoresService] Atualizando fornecedor:", {
        id,
        dadosRecebidos: data,
        payloadJSON: JSON.stringify(data, null, 2),
        endpoint: `/fornecedor/${id}`,
        metodo: "PATCH",
        temEnderecos: !!data.enderecos,
        temContatos: !!data.contato,
        enderecosCount: data.enderecos?.length || 0,
        contatosCount: data.contato?.length || 0
      });
    }
    
    try {
      const response = await apiClient.patch<Fornecedor>(`/fornecedor/${id}`, data);
      
      // Debug: log da resposta
      if (import.meta.env.DEV) {
        console.log("✅ [FornecedoresService] Resposta recebida:", {
          response,
          enderecos: response.enderecos,
          contatos: response.contato
        });
      }
      
      return response;
    } catch (error: any) {
      // Debug: log detalhado do erro
      if (import.meta.env.DEV) {
        console.error("❌ [FornecedoresService] Erro ao atualizar:", {
          error,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message
        });
      }
      throw error;
    }
  }

  /**
   * Atualiza parcialmente um fornecedor conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
   * 
   * @param id - ID do fornecedor
   * @param dadosForm - Dados do formulário com estado completo
   * @param camposAlterados - Array de nomes dos campos que foram alterados
   * @returns Fornecedor atualizado
   * 
   * Comportamento:
   * - Apenas campos enviados são atualizados
   * - Campos não enviados permanecem inalterados
   * - Campos vazios são convertidos para NULL
   * - Arrays não enviados mantêm os itens existentes
   * - Arrays vazios removem todos os itens
   */
  async atualizarParcial(
    id: number,
    dadosForm: FornecedorFormState,
    camposAlterados: string[]
  ): Promise<Fornecedor> {
    try {
      const payload = prepararPayloadAtualizacaoFornecedor(dadosForm, camposAlterados);
      
      if (import.meta.env.DEV) {
        console.log("📤 [Atualizar Parcial Fornecedor] Enviando payload:", {
          id,
          payload,
          camposAlterados,
          payloadJSON: JSON.stringify(payload, null, 2),
        });
      }
      
      const response = await apiClient.patch<Fornecedor>(`/fornecedor/${id}`, payload);
      
      if (import.meta.env.DEV) {
        console.log("✅ [Atualizar Parcial Fornecedor] Fornecedor atualizado:", response);
      }
      
      return response;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("❌ [Atualizar Parcial Fornecedor] Erro:", error);
      }
      
      const erroTratado = tratarErroAtualizacao(error);
      throw new Error(erroTratado.error);
    }
  }

  async deletar(id: number): Promise<void> {
    return apiClient.delete<void>(`/fornecedor/${id}`);
  }

  async buscarSugestoes(
    termo: string,
    limit: number = 10
  ): Promise<Fornecedor[]> {
    return apiClient.get<Fornecedor[]>(
      `/fornecedor/sugestoes?termo=${termo}&limit=${limit}`
    );
  }

  async getEstatisticas(): Promise<FornecedoresEstatisticas> {
    return apiClient.get<FornecedoresEstatisticas>("/fornecedor/estatisticas");
  }

  async buscar(
    termo: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<FornecedoresResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("termo", termo);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const query = queryParams.toString();
    return apiClient.get<FornecedoresResponse>(`/fornecedor/buscar?${query}`);
  }

  async buscarAvancado(params?: {
    termo?: string;
    tipoFornecedor?: string;
    statusFornecedor?: string;
    cidade?: string;
    estado?: string;
    logradouro?: string;
    telefone?: string;
    email?: string;
    nomeContato?: string;
    page?: number;
    limit?: number;
  }): Promise<FornecedoresResponse> {
    const queryParams = new URLSearchParams();
    if (params?.termo) queryParams.append("termo", params.termo);
    if (params?.tipoFornecedor)
      queryParams.append("tipoFornecedor", params.tipoFornecedor);
    if (params?.statusFornecedor)
      queryParams.append("statusFornecedor", params.statusFornecedor);
    if (params?.cidade) queryParams.append("cidade", params.cidade);
    if (params?.estado) queryParams.append("estado", params.estado);
    if (params?.logradouro) queryParams.append("logradouro", params.logradouro);
    if (params?.telefone) queryParams.append("telefone", params.telefone);
    if (params?.email) queryParams.append("email", params.email);
    if (params?.nomeContato)
      queryParams.append("nomeContato", params.nomeContato);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const query = queryParams.toString();
    const url = `/fornecedor/buscar-avancado?${query}`;
    
    if (import.meta.env.DEV && params?.logradouro) {
      console.log('[FornecedoresService] buscarAvancado com logradouro:', {
        logradouro: params.logradouro,
        url: url,
        queryParams: queryParams.toString()
      });
    }
    
    return apiClient.get<FornecedoresResponse>(url);
  }

  // Métodos para gerenciar endereços do fornecedor
  async adicionarEndereco(
    fornecedorId: number,
    endereco: CreateEnderecoDto
  ): Promise<Endereco> {
    if (import.meta.env.DEV) {
      console.log("📤 [FornecedoresService] Adicionando endereço:", {
        fornecedorId,
        endereco,
      });
    }
    return apiClient.post<Endereco>(
      `/fornecedor/${fornecedorId}/enderecos`,
      endereco
    );
  }

  async removerEndereco(
    fornecedorId: number,
    enderecoId: number
  ): Promise<void> {
    if (import.meta.env.DEV) {
      console.log("🗑️ [FornecedoresService] Removendo endereço:", {
        fornecedorId,
        enderecoId,
      });
    }
    return apiClient.delete<void>(
      `/fornecedor/${fornecedorId}/enderecos/${enderecoId}`
    );
  }

  // Métodos para gerenciar contatos do fornecedor
  async adicionarContato(
    fornecedorId: number,
    contato: CreateContatoDto
  ): Promise<Contato> {
    if (import.meta.env.DEV) {
      console.log("📤 [FornecedoresService] Adicionando contato:", {
        fornecedorId,
        contato,
      });
    }
    return apiClient.post<Contato>(
      `/fornecedor/${fornecedorId}/contatos`,
      contato
    );
  }

  async removerContato(
    fornecedorId: number,
    contatoId: number
  ): Promise<void> {
    if (import.meta.env.DEV) {
      console.log("🗑️ [FornecedoresService] Removendo contato:", {
        fornecedorId,
        contatoId,
      });
    }
    return apiClient.delete<void>(
      `/fornecedor/${fornecedorId}/contatos/${contatoId}`
    );
  }

  /**
   * Busca cidades únicas dos fornecedores cadastrados
   * Endpoint: GET /fornecedor/cidades
   */
  async buscarCidades(termo?: string): Promise<string[]> {
    try {
      const queryParams = new URLSearchParams();
      if (termo) queryParams.append("termo", termo);
      
      const query = queryParams.toString();
      const response = await apiClient.get<string[]>(
        `/fornecedor/cidades${query ? `?${query}` : ""}`
      );
      
      return Array.isArray(response) ? response : [];
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.warn("⚠️ [FornecedoresService] Erro ao buscar cidades:", error);
      }
      // Se o endpoint não existir, retorna array vazio
      return [];
    }
  }

  /**
   * Busca estados únicos dos fornecedores cadastrados
   * Endpoint: GET /fornecedor/estados
   */
  async buscarEstados(): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>(`/fornecedor/estados`);
      return Array.isArray(response) ? response : [];
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.warn("⚠️ [FornecedoresService] Erro ao buscar estados:", error);
      }
      // Se o endpoint não existir, retorna array vazio
      return [];
    }
  }
}

export const fornecedoresService = new FornecedoresService();
