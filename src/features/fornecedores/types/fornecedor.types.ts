export interface EnderecoFormData {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  referencia: string;
}

export interface ContatoFormData {
  telefone: string;
  email: string;
  nomeContato: string;
  outroTelefone: string;
  nomeOutroTelefone: string;
  observacao: string;
  ativo?: boolean;
}

export interface FornecedorFormData {
  nome_fantasia: string;
  tipoFornecedor: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  statusFornecedor: 'ATIVO' | 'INATIVO';
  cpf_cnpj: string;
  inscricao_estadual: string;
}
