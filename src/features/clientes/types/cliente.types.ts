/**
 * Tipos específicos para a feature de Clientes
 */

export interface EnderecoFormData {
  id?: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  referencia: string;
  codigo_ibge?: string;
}

export interface ContatoFormData {
  id?: number;
  telefone: string;
  email: string;
  nomeContato: string;
  outroTelefone: string;
  nomeOutroTelefone: string;
  observacao: string;
  ativo?: boolean;
}

export interface ClienteFormData {
  nome: string;
  nome_fantasia: string;
  nome_razao: string;
  tipoPessoa: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  statusCliente: "ATIVO" | "INATIVO" | "BLOQUEADO" | "INADIMPLENTE";
  cpf_cnpj: string;
  inscricao_estadual: string;
  limite_credito?: number;
}

export interface ClienteFormStepProps {
  currentStep: number;
  formData: ClienteFormData;
  enderecos: EnderecoFormData[];
  contatos: ContatoFormData[];
  onFormDataChange: (data: Partial<ClienteFormData>) => void;
  onEnderecosChange: (enderecos: EnderecoFormData[]) => void;
  onContatosChange: (contatos: ContatoFormData[]) => void;
}
