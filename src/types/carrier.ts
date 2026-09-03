/**
 * Interface principal da Transportadora
 * Baseada na estrutura do backend conforme GUIA_FRONTEND_TRANSPORTADORA_COMPLETO.md
 */
export interface Transportadora {
  /** Identificador único da transportadora */
  id: number;
  
  /** Nome/Razão social da transportadora (obrigatório) */
  nome: string;
  
  /** Nome fantasia (opcional) */
  nome_fantasia?: string | null;
  
  /** Nome do contato na transportadora (obrigatório na criação, pode ser null em registros antigos) */
  contato?: string | null;
  
  /** CNPJ formatado ou apenas números (opcional, único) */
  cnpj?: string | null;
  
  /** Inscrição estadual (opcional) */
  inscricao_estadual?: string | null;
  
  /** Telefone de contato (opcional) */
  telefone?: string | null;
  
  /** E-mail principal (opcional) */
  email?: string | null;
  
  /** CEP (opcional) */
  cep?: string | null;
  
  /** Logradouro (opcional) */
  logradouro?: string | null;
  
  /** Número do endereço (opcional) */
  numero?: string | null;
  
  /** Complemento do endereço (opcional) */
  complemento?: string | null;
  
  /** Bairro (opcional) */
  bairro?: string | null;
  
  /** Cidade (opcional) */
  cidade?: string | null;
  
  /** Estado/UF (2 caracteres) (opcional) */
  estado?: string | null;
  
  /** Status ativo/inativo */
  ativo: boolean;
  
  /** Observações (opcional) */
  observacoes?: string | null;
  
  /** Pedidos vinculados (se incluído na resposta) */
  pedidos?: Pedido[];
  
  /** Data de criação do registro */
  created_at: string;
  
  /** Data da última atualização */
  updated_at: string;
}

/**
 * Interface de Pedido vinculado à transportadora
 */
export interface Pedido {
  /** Identificador único do pedido */
  id: number;
  
  /** Número do pedido */
  numero?: string;
  numero_pedido?: string;
  
  /** ID da transportadora responsável */
  transportadoraId?: number;
  transportadora_id?: number;
  
  /** Nome do cliente (pode ser string ou objeto) */
  cliente?: string | {
    id: number;
    nome: string;
    cpf_cnpj?: string;
  };
  
  /** Destino da entrega */
  destino?: string;
  
  /** Valor do frete */
  valor?: number;
  valor_total?: number;
  
  /** Status atual do pedido */
  status?: 'pendente' | 'em_transito' | 'entregue' | 'cancelado' | 'PENDENTE' | 'CONFIRMADO' | 'EM_SEPARACAO' | 'ENVIADO' | 'ENTREGUE' | 'CANCELADO' | string;
  
  /** Data de criação do pedido */
  dataCriacao?: string;
  data_pedido?: string;
  created_at?: string;
  
  /** Data de entrega (quando aplicável) */
  dataEntrega?: string;
  data_entrega_realizada?: string;
}

/**
 * DTO para criação de transportadora
 */
export interface CreateTransportadoraDto {
  /** Nome/Razão social (obrigatório, 3-255 caracteres) */
  nome: string;
  
  /** Nome do contato na transportadora (obrigatório na criação, 1-255 caracteres) */
  contato: string;
  
  /** Nome fantasia (opcional, máx 255 caracteres) */
  nome_fantasia?: string;
  
  /** CNPJ formatado ou apenas números (opcional, 14 dígitos, único) */
  cnpj?: string;
  
  /** Inscrição estadual (opcional, máx 50 caracteres) */
  inscricao_estadual?: string;
  
  /** Telefone (opcional, máx 20 caracteres) */
  telefone?: string;
  
  /** E-mail válido (opcional) */
  email?: string;
  
  /** CEP (opcional, 8-10 caracteres) */
  cep?: string;
  
  /** Logradouro (opcional, máx 255 caracteres) */
  logradouro?: string;
  
  /** Número (opcional, máx 20 caracteres) */
  numero?: string;
  
  /** Complemento (opcional, máx 100 caracteres) */
  complemento?: string;
  
  /** Bairro (opcional, máx 100 caracteres) */
  bairro?: string;
  
  /** Cidade (opcional, máx 100 caracteres) */
  cidade?: string;
  
  /** Estado/UF (opcional, exatamente 2 caracteres) */
  estado?: string;
  
  /** Status ativo (opcional, padrão: true) */
  ativo?: boolean;
  
  /** Observações (opcional) */
  observacoes?: string;
}

/**
 * DTO para atualização de transportadora (todos os campos opcionais)
 */
export type UpdateTransportadoraDto = Partial<CreateTransportadoraDto>;

/**
 * Parâmetros para listagem de transportadoras
 */
export interface ListarTransportadorasParams {
  /** Página atual (padrão: 1) */
  page?: number;
  
  /** Itens por página (padrão: 15) */
  limit?: number;
  
  /** Termo de busca (nome, nome_fantasia ou CNPJ) */
  termo?: string;
  
  /** Apenas transportadoras ativas (padrão: false) */
  apenasAtivos?: boolean;
}

/**
 * Resposta da listagem de transportadoras
 */
export interface ListarTransportadorasResponse {
  /** Lista de transportadoras */
  transportadoras: Transportadora[];
  
  /** Total de transportadoras */
  total: number;
  
  /** Página atual */
  page?: number;
  
  /** Limite por página */
  limit?: number;
}

/**
 * Tipo para dados do formulário (exclui campos gerados automaticamente)
 */
export type TransportadoraFormData = Omit<
  Transportadora,
  'id' | 'created_at' | 'updated_at' | 'pedidos'
>;



