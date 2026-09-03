/**
 * Tipos para atualização parcial de Clientes e Fornecedores
 * Conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
 * e GUIA_FRONTEND_EDICAO_FORNECEDOR_ENDERECOS.md
 */

export interface UpdateEndereco {
  id?: number; // Se tiver ID, atualiza; se não tiver, cria novo
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  referencia?: string | null;
  codigo_ibge?: string | null;
}

export interface UpdateContato {
  id?: number; // Se tiver ID, atualiza; se não tiver, cria novo
  telefone?: string; // Obrigatório para criar novo
  email?: string | null;
  nomeContato?: string | null;
  outroTelefone?: string | null;
  nomeOutroTelefone?: string | null;
  observacao?: string | null;
  ativo?: boolean;
}

export interface UpdateClientePayload {
  // Campos opcionais do cliente
  nome?: string;
  tipoPessoa?: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  statusCliente?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO' | 'INADIMPLENTE';
  cpf_cnpj?: string | null; // 11 dígitos (CPF) ou 14 dígitos (CNPJ) ou null para remover
  nome_fantasia?: string | null;
  nome_razao?: string | null;
  inscricao_estadual?: string | null;
  limite_credito?: number | null; // null = sem limite; número ≥ 0 = limite em reais

  // Array de endereços (OPCIONAL - se não enviar, mantém existentes)
  enderecos?: UpdateEndereco[];
  
  // Array de contatos (OPCIONAL - se não enviar, mantém existentes)
  contatos?: UpdateContato[];
}

export interface UpdateFornecedorPayload {
  // Campos opcionais do fornecedor
  nome_fantasia?: string | null;
  nome_razao?: string | null;
  tipoFornecedor?: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  statusFornecedor?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  cpf_cnpj?: string | null; // 11 dígitos (CPF) ou 14 dígitos (CNPJ) ou null para remover
  inscricao_estadual?: string | null;
  
  // Array de endereços (OPCIONAL - se não enviar, mantém existentes)
  enderecos?: UpdateEndereco[];
  
  // Array de contatos (OPCIONAL - se não enviar, mantém existentes)
  contato?: UpdateContato[]; // Note: singular "contato" para fornecedores
}

// Tipos para formulários com flags de controle
export interface EnderecoFormState {
  id?: number;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  referencia?: string;
  codigo_ibge?: string;
  isNew?: boolean; // Flag para identificar novos endereços no frontend
}

export interface ContatoFormState {
  id?: number;
  telefone?: string;
  email?: string;
  nomeContato?: string;
  outroTelefone?: string;
  nomeOutroTelefone?: string;
  observacao?: string;
  ativo?: boolean;
  isNew?: boolean; // Flag para identificar novos contatos no frontend
}

export interface ClienteFormState {
  // Campos principais
  nome?: string;
  tipoPessoa?: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  cpf_cnpj?: string;
  nome_fantasia?: string;
  nome_razao?: string;
  inscricao_estadual?: string;
  statusCliente?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO' | 'INADIMPLENTE';
  limite_credito?: number | null;

  // Arrays de relacionamentos
  enderecos: EnderecoFormState[];
  contatos: ContatoFormState[];
}

export interface FornecedorFormState {
  // Campos principais
  nome_fantasia?: string;
  nome_razao?: string;
  tipoFornecedor?: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  statusFornecedor?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  
  // Arrays de relacionamentos
  enderecos: EnderecoFormState[];
  contato: ContatoFormState[]; // Singular para fornecedores
}





