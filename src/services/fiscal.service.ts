import { apiClient } from './api';

export type TipoOperacaoFiscal = 'ENTRADA' | 'SAIDA';

export type TabelaFiscal =
  | 'origem'
  | 'cst-icms'
  | 'csosn'
  | 'cst-ipi'
  | 'cst-pis-cofins'
  | 'cfop'
  | 'cest';

export type EscopoCfop = 'estadual' | 'interestadual';

export interface ItemTabelaFiscal {
  codigo: string;
  descricao: string;
  /** CEST: segmento do Convênio ICMS 142/18. */
  segmento?: string;
}

export interface NcmItem {
  /** 8 dígitos, sem pontos. */
  codigo: string;
  descricao: string;
  /** Posição › subposição › item (contexto para descrições como "Outros"). */
  caminho: string;
}

export interface FiltrosTabelaFiscal {
  busca?: string;
  operacao?: TipoOperacaoFiscal;
  escopo?: EscopoCfop;
  ncm?: string;
  limite?: number;
}

export interface ContextoFiscal {
  regimeTributario: string | null;
  /** ICMS por CSOSN (Simples Nacional) ou por CST (Regime Normal). */
  usaCsosn: boolean;
  /** Empresa com emissão de NF-e configurada. */
  nfeAtiva: boolean;
  cfopInterno: string | null;
  cfopInterestadual: string | null;
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const fiscalService = {
  listarTabela(
    tabela: TabelaFiscal,
    filtros: FiltrosTabelaFiscal = {},
  ): Promise<ItemTabelaFiscal[]> {
    return apiClient.get<ItemTabelaFiscal[]>(
      `/fiscal/tabelas/${tabela}${query({ ...filtros })}`,
    );
  },

  buscarNcm(busca: string, limite = 50): Promise<NcmItem[]> {
    return apiClient.get<NcmItem[]>(`/fiscal/ncm${query({ busca, limite })}`);
  },

  obterContexto(): Promise<ContextoFiscal> {
    return apiClient.get<ContextoFiscal>('/fiscal/contexto');
  },
};

/** "04061010" → "0406.10.10" (formato de exibição do NCM). */
export function formatarNcm(ncm?: string | null): string {
  const d = String(ncm ?? '').replace(/\D/g, '');
  if (d.length !== 8) return ncm ?? '';
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}
