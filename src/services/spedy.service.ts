import { UpdateTenantEmpresaDto } from '@/types/tenant-empresa';
import { apiClient } from './api';

export interface SpedyTenantStatus {
  integracao_ativa: boolean;
  company_id: string | null;
  ambiente: 'homologacao' | 'producao';
  cadastro_automatico_disponivel: boolean;
  pode_ativar: boolean;
  emissor_cadastrado?: boolean;
  pode_atualizar_certificado: boolean;
  send_email_to_customer: boolean;
}

export interface SpedyCertificadoResult {
  message: string;
  company_id: string;
}

export interface SpedyAtivarResult {
  tenant_codigo: string;
  company_id: string;
  ambiente: 'homologacao' | 'producao';
  message: string;
}

export interface SpedyNumeracaoNfe {
  serie: string;
  proximoNumero: number;
  maiorUsado: number;
  fonte?: 'spedy' | 'tenant' | 'padrao';
  message?: string;
}

function formParaAtivarSpedy(
  form: UpdateTenantEmpresaDto,
  senhaCertificado?: string,
): FormData {
  const fd = new FormData();
  const append = (key: string, value: string | undefined | null) => {
    if (value != null && String(value).trim() !== '') {
      fd.append(key, String(value).trim());
    }
  };

  append('nomeFantasia', form.nomeFantasia || form.nome);
  append('razaoSocial', form.nome);
  append('documento', form.cnpj?.replace(/\D/g, ''));
  append('inscricaoEstadual', form.inscricaoEstadual);
  append('email', form.email);
  append('telefone', form.telefone?.replace(/\D/g, ''));
  append('cep', form.cep?.replace(/\D/g, ''));
  append('logradouro', form.logradouro);
  append('numero', form.numero);
  append('complemento', form.complemento);
  append('bairro', form.bairro);
  append('cidade', form.cidade);
  append('estado', form.estado);
  append('codigoIbge', form.codigoIbge?.replace(/\D/g, ''));
  if (form.regimeTributario) {
    fd.append('regimeTributario', form.regimeTributario);
  }
  append('cnae', form.cnae?.replace(/\D/g, ''));
  append('senhaCertificado', senhaCertificado);
  if (form.spedyAmbiente) {
    fd.append('ambiente', form.spedyAmbiente);
  }

  return fd;
}

/** Evita bloqueio de WAF/proxy por nomes de arquivo com "senha" ou caracteres especiais. */
function anexarCertificadoSeguro(fd: FormData, certificado: File): void {
  fd.append('certificado', certificado, 'certificado.pfx');
}

export const spedyService = {
  obterStatus(): Promise<SpedyTenantStatus> {
    return apiClient.get<SpedyTenantStatus>('/tenant/me/spedy/status');
  },

  ativar(
    form: UpdateTenantEmpresaDto,
    certificado?: File,
    senhaCertificado?: string,
  ): Promise<SpedyAtivarResult> {
    const fd = formParaAtivarSpedy(form, senhaCertificado);
    if (certificado) {
      anexarCertificadoSeguro(fd, certificado);
    }
    return apiClient.postForm<SpedyAtivarResult>('/tenant/me/spedy/ativar', fd);
  },

  atualizarCertificado(certificado: File, senhaCertificado: string): Promise<SpedyCertificadoResult> {
    const fd = new FormData();
    anexarCertificadoSeguro(fd, certificado);
    fd.append('senhaCertificado', senhaCertificado.trim());
    return apiClient.postForm<SpedyCertificadoResult>('/tenant/me/spedy/certificado', fd);
  },

  obterNumeracaoNfe(): Promise<SpedyNumeracaoNfe> {
    return apiClient.get<SpedyNumeracaoNfe>('/tenant/me/spedy/numeracao-nfe');
  },

  atualizarNumeracaoNfe(data: {
    serie?: string;
    proximoNumero?: number;
  }): Promise<SpedyNumeracaoNfe> {
    return apiClient.put<SpedyNumeracaoNfe>('/tenant/me/spedy/numeracao-nfe', data);
  },
};
