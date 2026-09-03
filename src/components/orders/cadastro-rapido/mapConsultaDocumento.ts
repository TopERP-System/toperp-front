import { formatCEP, formatTelefone } from '@/lib/validators';
import { ConsultaCnpjResponse } from '@/services/cnpj.service';

export interface DadosComplementaresConsulta {
  nomeFantasia?: string;
  nomeRazao?: string;
  inscricaoEstadual?: string;
  endereco?: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  telefone?: string;
  email?: string;
}

export function mapConsultaCnpj(dados: ConsultaCnpjResponse): DadosComplementaresConsulta {
  const result: DadosComplementaresConsulta = {};

  if (dados.nomeFantasia) result.nomeFantasia = dados.nomeFantasia;
  if (dados.razaoSocial) result.nomeRazao = dados.razaoSocial;
  if (dados.inscricaoEstadual) result.inscricaoEstadual = dados.inscricaoEstadual;

  if (dados.logradouro || dados.cep || dados.cidade) {
    result.endereco = {
      cep: dados.cep ? formatCEP(dados.cep) : '',
      logradouro: dados.logradouro || '',
      numero: dados.numero || '',
      bairro: dados.bairro || '',
      cidade: dados.cidade || '',
      estado: dados.uf || '',
    };
  }

  if (dados.telefones?.length) {
    result.telefone = formatTelefone(dados.telefones[0]);
  }

  return result;
}
