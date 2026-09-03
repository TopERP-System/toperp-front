import { cleanDocument } from '@/lib/validators';

export interface ConsultaCepResponse {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  codigoIbge: string;
}

class CepService {
  async buscar(cep: string): Promise<ConsultaCepResponse> {
    const limpo = cleanDocument(cep);
    if (limpo.length !== 8) {
      throw new Error('CEP inválido. Informe 8 dígitos.');
    }

    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!res.ok) {
      throw new Error('Não foi possível consultar o CEP.');
    }

    const data = (await res.json()) as {
      erro?: boolean;
      cep?: string;
      logradouro?: string;
      complemento?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      ibge?: string;
    };

    if (data.erro) {
      throw new Error('CEP não encontrado.');
    }

    return {
      cep: data.cep?.replace(/\D/g, '') || limpo,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      codigoIbge: data.ibge || '',
    };
  }
}

export const cepService = new CepService();
