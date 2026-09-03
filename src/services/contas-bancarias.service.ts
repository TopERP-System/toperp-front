import { apiClient } from './api';

export type TipoContaBancaria =
  | 'CORRENTE'
  | 'POUPANCA'
  | 'PAGAMENTO'
  | 'OUTRO';

export interface ContaBancaria {
  id: number;
  nome: string;
  banco?: string;
  codigoBanco?: string;
  digitoBanco?: string;
  agencia?: string;
  digitoAgencia?: string;
  numeroConta?: string;
  digito?: string;
  tipo: TipoContaBancaria;
  tipoCobranca?: string;
  documentoTipo?: string;
  razaoSocial?: string;
  titular?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  instrucaoDoc?: string;
  aceite?: string;
  moeda?: string;
  layoutRemessa?: string;
  layoutBoleto?: string;
  tipoRegistroCobranca?: string;
  codigoCedente?: string;
  convenio?: string;
  modalidadeVariacao?: string;
  responsavelEmissao?: string;
  formaCadastramento?: string;
  codigoTransmissao?: string;
  multaPercent?: number;
  jurosDiaPercent?: number;
  taxaBanco?: number;
  taxaBoleto?: number;
  taxaAntesVencimento?: number;
  numeroUltimaRemessa?: number;
  localPagamento?: string;
  mensagemPadraoBoleto?: string;
  instrucaoBanco?: string;
  centralRastreio?: string;
  baixaDevolveBoletos?: boolean;
  imprimeLogoOutroBanco?: boolean;
  pix?: string;
  rocaId?: number | null;
  saldoInicial: number;
  ativo: boolean;
  observacoes?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export type CreateContaBancariaDto = Partial<ContaBancaria> & {
  nome: string;
};

export type UpdateContaBancariaDto = Partial<CreateContaBancariaDto>;

export interface ListarContasBancariasResponse {
  contas: ContaBancaria[];
  total: number;
  page: number;
  limit: number;
}

class ContasBancariasService {
  async listar(params?: {
    page?: number;
    limit?: number;
    termo?: string;
    apenasAtivos?: boolean;
  }): Promise<ListarContasBancariasResponse> {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.termo) q.append('termo', params.termo);
    if (params?.apenasAtivos) q.append('apenasAtivos', 'true');
    const query = q.toString();
    return apiClient.get<ListarContasBancariasResponse>(
      `/contas-bancarias${query ? `?${query}` : ''}`,
    );
  }

  async criar(data: CreateContaBancariaDto): Promise<ContaBancaria> {
    return apiClient.post<ContaBancaria>('/contas-bancarias', data);
  }

  async atualizar(
    id: number,
    data: UpdateContaBancariaDto,
  ): Promise<ContaBancaria> {
    return apiClient.patch<ContaBancaria>(`/contas-bancarias/${id}`, data);
  }

  async alterarStatus(id: number, ativo: boolean): Promise<ContaBancaria> {
    return apiClient.patch<ContaBancaria>(
      `/contas-bancarias/${id}/status?ativo=${ativo}`,
    );
  }

  async deletar(id: number): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`/contas-bancarias/${id}`);
  }
}

export const contasBancariasService = new ContasBancariasService();
