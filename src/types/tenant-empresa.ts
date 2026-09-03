export type RegimeTributario = 'SIMPLES_NACIONAL' | 'REGIME_NORMAL';
export type SpedyAmbiente = 'homologacao' | 'producao';

export interface TenantEmpresaCadastro {
  nomeFantasia?: string | null;
  inscricaoEstadual?: string | null;
  cnae?: string | null;
}

export interface TenantEmpresaEndereco {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  codigoIbge?: string | null;
}

export interface TenantEmpresaFiscal {
  regimeTributario?: RegimeTributario | null;
  operationNature?: string | null;
  presenceType?: string | null;
  cfopInterno?: string | null;
  cfopInterestadual?: string | null;
  isFinalCustomer?: boolean | null;
  serieNfe?: string | null;
  proximoNumeroNfe?: number | null;
}

export interface TenantSpedyConfig {
  apiKey?: string | null;
  ambiente?: SpedyAmbiente | null;
  sendEmailToCustomer?: boolean | null;
  companyId?: string | null;
}

export interface TenantConfiguracoes {
  moeda?: string;
  fuso_horario?: string;
  idioma?: string;
  empresa?: TenantEmpresaCadastro;
  endereco?: TenantEmpresaEndereco;
  fiscal?: TenantEmpresaFiscal;
  spedy?: TenantSpedyConfig;
  [key: string]: unknown;
}

export interface UpdateTenantEmpresaDto {
  nome?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  cnae?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  codigoIbge?: string;
  regimeTributario?: RegimeTributario;
  operationNature?: string;
  presenceType?: string;
  cfopInterno?: string;
  cfopInterestadual?: string;
  isFinalCustomer?: boolean;
  serieNfe?: string;
  proximoNumeroNfe?: number;
  spedyApiKey?: string;
  spedyAmbiente?: SpedyAmbiente;
  sendEmailToCustomer?: boolean;
}

export const EMPRESA_FORM_PADRAO: UpdateTenantEmpresaDto = {
  nome: '',
  nomeFantasia: '',
  cnpj: '',
  inscricaoEstadual: '',
  cnae: '',
  email: '',
  telefone: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  codigoIbge: '',
  regimeTributario: 'SIMPLES_NACIONAL',
  operationNature: 'Venda de Mercadoria',
  presenceType: 'presence',
  cfopInterno: '5102',
  cfopInterestadual: '6102',
  isFinalCustomer: true,
  serieNfe: '1',
  proximoNumeroNfe: 1,
  spedyApiKey: '',
  spedyAmbiente: 'homologacao',
  sendEmailToCustomer: true,
};

export function tenantParaFormEmpresa(tenant: {
  nome?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  configuracoes?: TenantConfiguracoes;
}): UpdateTenantEmpresaDto {
  const cfg = tenant.configuracoes || {};
  const emp = cfg.empresa || {};
  const end = cfg.endereco || {};
  const fiscal = cfg.fiscal || {};
  const spedy = cfg.spedy || {};

  return {
    nome: tenant.nome || '',
    nomeFantasia: emp.nomeFantasia || '',
    cnpj: tenant.cnpj || '',
    inscricaoEstadual: emp.inscricaoEstadual || '',
    cnae: emp.cnae || '',
    email: tenant.email || '',
    telefone: tenant.telefone || '',
    cep: end.cep || '',
    logradouro: end.logradouro || '',
    numero: end.numero || '',
    complemento: end.complemento || '',
    bairro: end.bairro || '',
    cidade: end.cidade || '',
    estado: end.estado || '',
    codigoIbge: end.codigoIbge || '',
    regimeTributario: fiscal.regimeTributario || 'SIMPLES_NACIONAL',
    operationNature: fiscal.operationNature || 'Venda de Mercadoria',
    presenceType: fiscal.presenceType || 'presence',
    cfopInterno: fiscal.cfopInterno || '5102',
    cfopInterestadual: fiscal.cfopInterestadual || '6102',
    isFinalCustomer: fiscal.isFinalCustomer ?? true,
    serieNfe: fiscal.serieNfe || '1',
    proximoNumeroNfe:
      fiscal.proximoNumeroNfe != null && Number(fiscal.proximoNumeroNfe) >= 1
        ? Number(fiscal.proximoNumeroNfe)
        : 1,
    spedyApiKey: spedy.apiKey || '',
    spedyAmbiente: spedy.ambiente || 'homologacao',
    sendEmailToCustomer: spedy.sendEmailToCustomer ?? true,
  };
}
