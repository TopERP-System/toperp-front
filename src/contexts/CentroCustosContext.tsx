import { useAuth } from '@/contexts/AuthContext';
import { canAccessFinanceiro } from '@/lib/role-access';
import {
  centroCustoService,
  type ApiCentroCustoDespesa,
  type ApiCentroCustoTipo,
} from '@/services/centro-custo.service';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const CENTRO_CUSTO_PAGE_SIZE = 15;

const QK_TIPOS_OPCOES = ['centro-custo', 'tipos-opcoes'] as const;
const qkTiposPagina = (page: number) => ['centro-custo', 'tipos', page] as const;

/** Filtros da listagem de despesas (alinhado ao GET /centro-custo/despesas). */
export type DespesasStatusFiltro = 'ABERTO' | 'PARCIAL' | 'QUITADO';

export type DespesasFiltro = {
  dataInicial?: string;
  dataFinal?: string;
  tipoId?: string;
  rocaId?: number;
  /** Status de pagamento (igual ao badge: Aberto / Parcial / Quitado). */
  status?: DespesasStatusFiltro;
};

export function isDespesasFiltroVazio(f: DespesasFiltro): boolean {
  return (
    !f.dataInicial?.trim() &&
    !f.dataFinal?.trim() &&
    !f.tipoId?.trim() &&
    (f.rocaId == null || f.rocaId <= 0) &&
    f.status == null
  );
}

function filtrosToApi(
  f: DespesasFiltro,
): {
  dataInicial?: string;
  dataFinal?: string;
  tipoId?: number;
  rocaId?: number;
  status?: DespesasStatusFiltro;
} {
  const out: {
    dataInicial?: string;
    dataFinal?: string;
    tipoId?: number;
    rocaId?: number;
    status?: DespesasStatusFiltro;
  } = {};
  if (f.dataInicial?.trim()) out.dataInicial = f.dataInicial.trim().slice(0, 10);
  if (f.dataFinal?.trim()) out.dataFinal = f.dataFinal.trim().slice(0, 10);
  if (f.tipoId?.trim()) {
    const n = parseInt(f.tipoId, 10);
    if (Number.isFinite(n) && n > 0) out.tipoId = n;
  }
  if (f.rocaId != null && f.rocaId > 0) out.rocaId = f.rocaId;
  if (f.status === 'ABERTO' || f.status === 'PARCIAL' || f.status === 'QUITADO') {
    out.status = f.status;
  }
  return out;
}

/** Mesmo payload de GET /centro-custo/despesas e /resumo (listagem + exportação). */
export function buildDespesasApiFiltros(
  f: DespesasFiltro,
  busca: string,
):
  | {
      dataInicial?: string;
      dataFinal?: string;
      tipoId?: number;
      rocaId?: number;
      busca?: string;
      status?: DespesasStatusFiltro;
    }
  | undefined {
  const apiF = filtrosToApi(f);
  const b = busca.trim();
  const payload = { ...apiF, ...(b ? { busca: b } : {}) };
  const hasAny =
    (payload.dataInicial != null && payload.dataInicial !== '') ||
    (payload.dataFinal != null && payload.dataFinal !== '') ||
    (payload.tipoId != null && payload.tipoId > 0) ||
    (payload.rocaId != null && payload.rocaId > 0) ||
    payload.status != null ||
    (payload.busca != null && payload.busca !== '');
  return hasAny ? payload : undefined;
}

const qkDespesasPagina = (page: number, f: DespesasFiltro, busca: string) =>
  [
    'centro-custo',
    'despesas',
    page,
    f.dataInicial ?? '',
    f.dataFinal ?? '',
    f.tipoId ?? '',
    f.rocaId ?? 0,
    f.status ?? '',
    busca,
  ] as const;

const qkResumoModulo = (f: DespesasFiltro, busca: string) =>
  [
    'centro-custo',
    'resumo',
    f.dataInicial ?? '',
    f.dataFinal ?? '',
    f.tipoId ?? '',
    f.rocaId ?? 0,
    f.status ?? '',
    busca.trim(),
  ] as const;

export type CentroCustoTipo = {
  id: string;
  nome: string;
};

export type CentroCustoPagamento = {
  id: string;
  valor: number;
  data: string;
};

export type CentroCustoDespesa = {
  id: string;
  descricao: string;
  tipoId: string;
  /** Nome do tipo vindo da API (lista paginada). */
  tipoNome?: string;
  rocaId: number;
  rocaNome: string;
  /** ID da conta a pagar (mesma usada em Contas a Pagar). */
  contaFinanceiraId?: number | null;
  valor: number;
  data: string;
  dataPagamentoManual?: string;
  observacoes?: string;
  pagamentos: CentroCustoPagamento[];
};

function mapTipo(row: ApiCentroCustoTipo): CentroCustoTipo {
  return { id: String(row.id), nome: row.nome };
}

function dataIso(d: string | Date): string {
  if (typeof d === 'string') return d.length >= 10 ? d.slice(0, 10) : d;
  return d.toISOString().slice(0, 10);
}

function mapDespesa(row: ApiCentroCustoDespesa): CentroCustoDespesa {
  return {
    id: String(row.id),
    descricao: row.descricao,
    tipoId: String(row.tipoId),
    tipoNome: row.tipoNome,
    rocaId: row.rocaId,
    rocaNome: row.rocaNome ?? '',
    contaFinanceiraId:
      row.contaFinanceiraId != null && row.contaFinanceiraId !== undefined
        ? Number(row.contaFinanceiraId)
        : null,
    valor: Number(row.valor),
    data: dataIso(row.data as string),
    dataPagamentoManual: row.dataPagamentoManual
      ? dataIso(row.dataPagamentoManual)
      : undefined,
    observacoes: row.observacoes ?? undefined,
    pagamentos: (row.pagamentos ?? []).map((p) => ({
      id: String(p.id),
      valor: Number(p.valor),
      data: dataIso(p.data as string),
    })),
  };
}

export function totalPagoNaDespesa(d: CentroCustoDespesa): number {
  return d.pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
}

export function statusDespesa(d: CentroCustoDespesa): 'ABERTO' | 'PARCIAL' | 'QUITADO' {
  const pago = totalPagoNaDespesa(d);
  const total = Number(d.valor) || 0;
  if (pago <= 0) return 'ABERTO';
  if (pago >= total - 0.005) return 'QUITADO';
  return 'PARCIAL';
}

export function valorAberto(d: CentroCustoDespesa): number {
  return Math.max(0, (Number(d.valor) || 0) - totalPagoNaDespesa(d));
}

type AtualizarDespesaInput = Partial<
  Omit<CentroCustoDespesa, 'id' | 'pagamentos'>
>;

type CentroCustosContextValue = {
  /** Página atual da tabela de tipos. */
  tiposPage: number;
  setTiposPage: (p: number | ((prev: number) => number)) => void;
  tiposTotal: number;
  /** Página atual da tabela de despesas. */
  despesasPage: number;
  setDespesasPage: (p: number | ((prev: number) => number)) => void;
  despesasTotal: number;
  /** Filtros aplicados na listagem de despesas. */
  despesasFiltro: DespesasFiltro;
  aplicarFiltrosDespesas: (f: DespesasFiltro) => void;
  limparFiltrosDespesas: () => void;
  /** Texto da busca (descrição, tipo, roça, id) — alinhada à barra principal. */
  despesasBusca: string;
  setDespesasBusca: (s: string) => void;
  /** Itens da página atual (tipos). */
  tipos: CentroCustoTipo[];
  /** Todos os tipos para selects (limitado no servidor)... */
  tiposOpcoes: CentroCustoTipo[];
  despesas: CentroCustoDespesa[];
  resumo: {
    qAbertas: number;
    qQuitadas: number;
    valorAbertoTotal: number;
    valorPagoTotal: number;
  };
  /** Carregamento da visão Despesas / resumo / opções de tipo (não inclui a tabela paginada “Tipos de custo”). */
  isLoading: boolean;
  /** Apenas a listagem da aba “Tipos de custo”. */
  isLoadingTiposTabela: boolean;
  adicionarTipo: (nome: string) => Promise<CentroCustoTipo>;
  atualizarTipo: (id: string, nome: string) => Promise<void>;
  excluirTipo: (id: string) => Promise<void>;
  adicionarDespesa: (
    data: Omit<CentroCustoDespesa, 'id' | 'pagamentos'>,
  ) => Promise<CentroCustoDespesa>;
  atualizarDespesa: (id: string, data: AtualizarDespesaInput) => Promise<void>;
  excluirDespesa: (id: string) => Promise<void>;
  registrarPagamento: (
    despesaId: string,
    valor: number,
    data: string,
  ) => Promise<CentroCustoDespesa | undefined>;
};

const CentroCustosContext = createContext<CentroCustosContextValue | null>(null);

export function CentroCustosProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const podeSincronizar =
    !authLoading && isAuthenticated && canAccessFinanceiro(user?.role);

  const [tiposPage, setTiposPage] = useState(1);
  const [despesasPage, setDespesasPage] = useState(1);
  const [despesasFiltro, setDespesasFiltro] = useState<DespesasFiltro>({});
  const [despesasBusca, setDespesasBuscaState] = useState('');

  const resumoQuery = useQuery({
    queryKey: qkResumoModulo(despesasFiltro, despesasBusca),
    enabled: podeSincronizar,
    staleTime: 15_000,
    queryFn: async () => {
      const payload = buildDespesasApiFiltros(despesasFiltro, despesasBusca);
      return centroCustoService.resumoModulo(payload);
    },
  });

  const tiposOpcoesQuery = useQuery({
    queryKey: QK_TIPOS_OPCOES,
    enabled: podeSincronizar,
    staleTime: 60_000,
    queryFn: async () => {
      const rows = await centroCustoService.listarTiposOpcoes();
      return rows.map(mapTipo);
    },
  });

  const tiposQuery = useQuery({
    queryKey: qkTiposPagina(tiposPage),
    enabled: podeSincronizar,
    queryFn: async () => {
      const res = await centroCustoService.listarTipos(
        tiposPage,
        CENTRO_CUSTO_PAGE_SIZE,
      );
      return {
        items: res.items.map(mapTipo),
        total: res.total,
        page: res.page,
        limit: res.limit,
      };
    },
  });

  const setDespesasBusca = useCallback((s: string) => {
    setDespesasBuscaState(s);
    setDespesasPage(1);
  }, []);

  const despesasQuery = useQuery({
    queryKey: qkDespesasPagina(despesasPage, despesasFiltro, despesasBusca),
    enabled: podeSincronizar,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const payload = buildDespesasApiFiltros(despesasFiltro, despesasBusca);
      const res = await centroCustoService.listarDespesas(
        despesasPage,
        CENTRO_CUSTO_PAGE_SIZE,
        payload,
      );
      return {
        items: res.items.map(mapDespesa),
        total: res.total,
        page: res.page,
        limit: res.limit,
      };
    },
  });

  const aplicarFiltrosDespesas = useCallback((f: DespesasFiltro) => {
    setDespesasFiltro(f);
    setDespesasPage(1);
  }, []);

  const limparFiltrosDespesas = useCallback(() => {
    setDespesasFiltro({});
    setDespesasPage(1);
  }, []);

  const tipos = tiposQuery.data?.items ?? [];
  const tiposTotal = tiposQuery.data?.total ?? 0;
  const tiposOpcoes = tiposOpcoesQuery.data ?? [];
  const despesas = despesasQuery.data?.items ?? [];
  const despesasTotal = despesasQuery.data?.total ?? 0;

  const resumo = resumoQuery.data ?? {
    qAbertas: 0,
    qQuitadas: 0,
    valorAbertoTotal: 0,
    valorPagoTotal: 0,
  };

  const invalidateCentroCustoLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['centro-custo'] });
  }, [queryClient]);

  const buscarDespesaPorId = useCallback(async (id: string) => {
    const first = await centroCustoService.listarDespesas(
      1,
      CENTRO_CUSTO_PAGE_SIZE,
      undefined,
    );
    const pages = Math.max(
      1,
      Math.ceil(first.total / CENTRO_CUSTO_PAGE_SIZE),
    );
    for (let p = 1; p <= pages; p++) {
      const res =
        p === 1
          ? first
          : await centroCustoService.listarDespesas(
              p,
              CENTRO_CUSTO_PAGE_SIZE,
              undefined,
            );
      const found = res.items.map(mapDespesa).find((d) => d.id === id);
      if (found) return found;
    }
    return undefined;
  }, []);

  const adicionarTipo = useCallback(
    async (nome: string) => {
      const row = await centroCustoService.criarTipo({ nome: nome.trim() });
      await invalidateCentroCustoLists();
      return mapTipo(row);
    },
    [invalidateCentroCustoLists],
  );

  const atualizarTipo = useCallback(
    async (id: string, nome: string) => {
      await centroCustoService.atualizarTipo(Number(id), { nome: nome.trim() });
      await invalidateCentroCustoLists();
    },
    [invalidateCentroCustoLists],
  );

  const excluirTipo = useCallback(
    async (id: string) => {
      await centroCustoService.excluirTipo(Number(id));
      await invalidateCentroCustoLists();
    },
    [invalidateCentroCustoLists],
  );

  const adicionarDespesa = useCallback(
    async (data: Omit<CentroCustoDespesa, 'id' | 'pagamentos'>) => {
      const row = await centroCustoService.criarDespesa({
        tipoId: Number(data.tipoId),
        rocaId: data.rocaId,
        descricao: data.descricao.trim(),
        valor: data.valor,
        data: dataIso(data.data),
        observacoes: data.observacoes?.trim() || undefined,
      });
      setDespesasPage(1);

      const r = row as ApiCentroCustoDespesa;
      const tipoNome =
        data.tipoNome?.trim() ||
        tiposOpcoesQuery.data?.find((t) => t.id === data.tipoId)?.nome ||
        r.tipoNome;
      const rocaNome = data.rocaNome?.trim() || r.rocaNome;
      const newItem = mapDespesa({
        ...r,
        tipoNome: tipoNome || '—',
        rocaNome: rocaNome || '—',
        pagamentos: r.pagamentos ?? [],
      });

      if (isDespesasFiltroVazio(despesasFiltro) && !despesasBusca?.trim()) {
        queryClient.setQueryData(
          qkDespesasPagina(1, despesasFiltro, despesasBusca),
          (
            old:
              | {
                  items: CentroCustoDespesa[];
                  total: number;
                  page: number;
                  limit: number;
                }
              | undefined,
          ) => {
            if (!old) {
              return {
                items: [newItem],
                total: 1,
                page: 1,
                limit: CENTRO_CUSTO_PAGE_SIZE,
              };
            }
            const items = [newItem, ...old.items].slice(0, CENTRO_CUSTO_PAGE_SIZE);
            return {
              ...old,
              items,
              total: old.total + 1,
              page: 1,
              limit: old.limit,
            };
          },
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: ['centro-custo', 'despesas'] });
      }

      void queryClient.invalidateQueries({ queryKey: ['centro-custo', 'resumo'] });
      return newItem;
    },
    [queryClient, tiposOpcoesQuery.data, despesasFiltro, despesasPage, despesasBusca],
  );

  const atualizarDespesa = useCallback(
    async (id: string, data: AtualizarDespesaInput) => {
      const payload: Parameters<typeof centroCustoService.atualizarDespesa>[1] = {};
      if (data.tipoId !== undefined) payload.tipoId = Number(data.tipoId);
      if (data.rocaId !== undefined) payload.rocaId = data.rocaId;
      if (data.descricao !== undefined) payload.descricao = data.descricao.trim();
      if (data.valor !== undefined) payload.valor = data.valor;
      if (data.data !== undefined) payload.data = dataIso(data.data);
      if (data.observacoes !== undefined) {
        payload.observacoes = data.observacoes?.trim() ? data.observacoes.trim() : null;
      }
      await centroCustoService.atualizarDespesa(Number(id), payload);
      await invalidateCentroCustoLists();
    },
    [invalidateCentroCustoLists],
  );

  const excluirDespesa = useCallback(
    async (id: string) => {
      await centroCustoService.excluirDespesa(Number(id));
      await invalidateCentroCustoLists();
    },
    [invalidateCentroCustoLists],
  );

  const registrarPagamento = useCallback(
    async (despesaId: string, valor: number, dataPag: string) => {
      await centroCustoService.registrarPagamento(Number(despesaId), {
        valor,
        data: dataIso(dataPag),
      });
      await invalidateCentroCustoLists();
      return buscarDespesaPorId(despesaId);
    },
    [invalidateCentroCustoLists, buscarDespesaPorId],
  );

  /** Só na primeira carga do módulo; refetch por filtro não trava o cabeçalho. */
  const isLoading =
    podeSincronizar &&
    (!despesasQuery.isFetched ||
      !resumoQuery.isFetched ||
      !tiposOpcoesQuery.isFetched) &&
    (despesasQuery.isPending ||
      resumoQuery.isPending ||
      tiposOpcoesQuery.isPending);

  const isLoadingTiposTabela = podeSincronizar && tiposQuery.isPending;

  const value = useMemo(
    () => ({
      tiposPage,
      setTiposPage,
      tiposTotal,
      despesasPage,
      setDespesasPage,
      despesasTotal,
      despesasFiltro,
      aplicarFiltrosDespesas,
      limparFiltrosDespesas,
      despesasBusca,
      setDespesasBusca,
      tipos,
      tiposOpcoes,
      despesas,
      resumo,
      isLoading,
      isLoadingTiposTabela,
      adicionarTipo,
      atualizarTipo,
      excluirTipo,
      adicionarDespesa,
      atualizarDespesa,
      excluirDespesa,
      registrarPagamento,
    }),
    [
      tiposPage,
      tiposTotal,
      despesasPage,
      despesasTotal,
      despesasFiltro,
      aplicarFiltrosDespesas,
      limparFiltrosDespesas,
      despesasBusca,
      setDespesasBusca,
      tipos,
      tiposOpcoes,
      despesas,
      resumo,
      isLoading,
      isLoadingTiposTabela,
      adicionarTipo,
      atualizarTipo,
      excluirTipo,
      adicionarDespesa,
      atualizarDespesa,
      excluirDespesa,
      registrarPagamento,
    ],
  );

  return <CentroCustosContext.Provider value={value}>{children}</CentroCustosContext.Provider>;
}

export function useCentroCustos(): CentroCustosContextValue {
  const ctx = useContext(CentroCustosContext);
  if (!ctx) {
    throw new Error('useCentroCustos deve ser usado dentro de CentroCustosProvider');
  }
  return ctx;
}
