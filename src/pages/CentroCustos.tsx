import AppLayout from '@/components/layout/AppLayout';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu';
import { ModulePageHeader } from '@/components/layout/ModulePageHeader';
import {
  ModuleStatCards,
  type ModuleStatCardItem,
} from '@/components/layout/ModuleStatCards';
import { statTheme } from '@/components/layout/module-stat-themes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  buildDespesasApiFiltros,
  CENTRO_CUSTO_PAGE_SIZE,
  isDespesasFiltroVazio,
  useCentroCustos,
  statusDespesa,
  totalPagoNaDespesa,
  type CentroCustoDespesa,
  type CentroCustoTipo,
  type DespesasFiltro,
  type DespesasStatusFiltro,
} from '@/contexts/CentroCustosContext';
import { formatValorMonetarioBr, parseValorMonetarioEntrada } from '@/lib/parse-valor-monetario';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  centroCustoService,
  type ApiCentroCustoDespesa,
} from '@/services/centro-custo.service';
import { controleRocaService } from '@/services/controle-roca.service';
import { useRotuloRoca } from '@/hooks/useRotuloRoca';
import { relatoriosClienteService } from '@/services/relatorios-cliente.service';
import type { Roca } from '@/types/roca';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  BarChart3,
  Calendar,
  Check,
  ChevronsUpDown,
  Circle,
  Download,
  Eye,
  Filter,
  Landmark,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  Printer,
  Receipt,
  Scale,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const CARD_STATS = [
  {
    key: 'abertas',
    label: 'Total de despesas em aberto',
    kind: 'count' as const,
    Icon: Receipt,
    ...statTheme.amber,
  },
  {
    key: 'quitadas',
    label: 'Total de despesas quitadas',
    kind: 'count' as const,
    Icon: PiggyBank,
    ...statTheme.emerald,
  },
  {
    key: 'valorAberto',
    label: 'Valor total em aberto',
    kind: 'money' as const,
    Icon: Wallet,
    ...statTheme.rose,
  },
  {
    key: 'valorPago',
    label: 'Valor pago',
    kind: 'money' as const,
    Icon: Scale,
    ...statTheme.sky,
  },
];

function badgeStatus(st: 'ABERTO' | 'PARCIAL' | 'QUITADO') {
  const map = {
    ABERTO: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    PARCIAL: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
    QUITADO: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  };
  const label = st === 'PARCIAL' ? 'Parcial' : st === 'QUITADO' ? 'Quitado' : 'Aberto';
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', map[st])}>{label}</span>
  );
}

function DespesasTable({
  despesas,
  nomeTipo,
  onDetalhe,
  onPagar,
  onEditar,
  onExcluir,
  onAlterarDataPagamento,
  emptyMessage,
}: {
  despesas: CentroCustoDespesa[];
  nomeTipo: (d: CentroCustoDespesa) => string;
  onDetalhe: (d: CentroCustoDespesa) => void;
  onPagar: (d: CentroCustoDespesa) => void;
  onEditar: (d: CentroCustoDespesa) => void;
  onExcluir: (d: CentroCustoDespesa) => void;
  onAlterarDataPagamento: (d: CentroCustoDespesa) => void;
  /** Quando a lista veio vazia e há filtros ativos. */
  emptyMessage?: string;
}) {
  const rotulo = useRotuloRoca();
  const dataPagamentoExibicao = (d: CentroCustoDespesa): string => {
    if (d.dataPagamentoManual?.trim()) {
      return d.dataPagamentoManual.trim().slice(0, 10);
    }
    const ultimaDataPagamento = [...d.pagamentos]
      .map((p) => p.data?.slice(0, 10))
      .filter((x): x is string => Boolean(x))
      .sort((a, b) => b.localeCompare(a))[0];
    return ultimaDataPagamento ?? '';
  };

  const ordenadas = useMemo(
    () =>
      [...despesas].sort((a, b) => {
        const qa = statusDespesa(a) === 'QUITADO' ? 1 : 0;
        const qb = statusDespesa(b) === 'QUITADO' ? 1 : 0;
        if (qa !== qb) return qa - qb;
        return b.data.localeCompare(a.data);
      }),
    [despesas],
  );

  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-center">{rotulo.singular}</TableHead>
            <TableHead className="text-center">Tipo</TableHead>
            <TableHead className="text-center">Valor</TableHead>
            <TableHead className="text-center">Data</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Pago</TableHead>
            <TableHead className="text-center">Data pagamento</TableHead>
            <TableHead className="min-w-[220px] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenadas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                {emptyMessage ?? 'Nenhuma despesa lançada.'}
              </TableCell>
            </TableRow>
          ) : (
            ordenadas.map((d) => {
              const st = statusDespesa(d);
              const pago = totalPagoNaDespesa(d);
              const dataPagamento = dataPagamentoExibicao(d);
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium max-w-[180px] truncate" title={d.descricao}>
                    {d.descricao}
                  </TableCell>
                  <TableCell
                    className="text-center max-w-[160px] truncate"
                    title={d.rocaNome || undefined}
                  >
                    {d.rocaNome || '—'}
                  </TableCell>
                  <TableCell className="text-center">{nomeTipo(d)}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {formatCurrency(Number(d.valor))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-center">{formatDate(d.data)}</TableCell>
                  <TableCell className="text-center">{badgeStatus(st)}</TableCell>
                  <TableCell className="text-center tabular-nums">{formatCurrency(pago)}</TableCell>
                  <TableCell className="whitespace-nowrap text-center">
                    {dataPagamento ? formatDate(dataPagamento) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <TableRowActionsMenu icon="horizontal" contentClassName="w-44">
                        <DropdownMenuItem
                          onSelect={() => {
                            void onDetalhe(d);
                          }}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => onPagar(d)}
                          disabled={st === 'QUITADO'}
                          className="gap-2"
                        >
                          <Banknote className="w-4 h-4" />
                          Pagar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => onAlterarDataPagamento(d)}
                          className="gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Data pgto
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onEditar(d)} className="gap-2">
                          <Pencil className="w-4 h-4" />
                          Editar
                        </DropdownMenuItem>
                        {pago <= 0.009 ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => onExcluir(d)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        ) : null}
                    </TableRowActionsMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
    </Table>
  );
}

function CentroCustoTablePagination({
  page,
  setPage,
  total,
  totalPages,
}: {
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  total: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const from = total > 0 ? (page - 1) * CENTRO_CUSTO_PAGE_SIZE + 1 : 0;
  const to = Math.min(page * CENTRO_CUSTO_PAGE_SIZE, total);
  return (
    <div className="border-t border-border px-4 py-3 space-y-2">
      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                setPage((prev) => Math.max(1, prev - 1));
              }}
              className={
                page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(pageNum);
                  }}
                  isActive={page === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                setPage((prev) => Math.min(totalPages, prev + 1));
              }}
              className={
                page === totalPages
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <p className="text-center text-sm text-muted-foreground">
        Mostrando {from} a {to} de {total}
      </p>
    </div>
  );
}

function abrirSeletorDataNativo(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus();
  const el = input as HTMLInputElement & { showPicker?: () => void };
  try {
    if (typeof el.showPicker === 'function') {
      el.showPicker();
      return;
    }
  } catch {
    // falha de permissão em alguns contextos
  }
  input.click();
}

function FiltroPeriodoDateInput({
  id,
  value,
  onChange,
  compact,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  /** Layout menor (ex.: modal de relatório). */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const baseInput =
    'w-full border-2 bg-muted/40 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-moz-calendar-picker-indicator]:hidden';
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="date"
        className={cn(
          baseInput,
          compact
            ? 'h-9 rounded-lg pl-2.5 pr-9 text-sm'
            : 'h-10 rounded-xl pl-3 pr-10',
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => abrirSeletorDataNativo(inputRef.current)}
        className={cn(
          'absolute right-0.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring',
          compact ? 'h-7 w-7' : 'h-8 w-8',
        )}
        aria-label="Abrir calendário"
      >
        <Calendar className={cn('shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      </button>
    </div>
  );
}

const RELATORIO_PAGE = 100;

type RelatorioDespesaId = 'analitico' | 'resumo_periodo' | 'por_tipo';

const RELATORIOS_DESPESA: { id: RelatorioDespesaId; label: string }[] = [
  { id: 'analitico', label: 'Relatório analítico de despesas' },
  { id: 'resumo_periodo', label: 'Resumo por período' },
  { id: 'por_tipo', label: 'Consolidado por tipo de despesa' },
];

const RELATORIO_DESPESA_META: Record<
  RelatorioDespesaId,
  { titulo: string; descricao: string }
> = {
  analitico: {
    titulo: 'Relatório analítico de despesas',
    descricao: 'Listagem detalhada por período, tipo e status de pagamento.',
  },
  resumo_periodo: {
    titulo: 'Resumo por período',
    descricao: 'Totais agrupados por mês de competência (data da despesa).',
  },
  por_tipo: {
    titulo: 'Consolidado por tipo de despesa',
    descricao: 'Quantidade e valor somados por tipo de custo.',
  },
};

function statusLinhaRelatorio(d: ApiCentroCustoDespesa): string {
  const pago = (d.pagamentos ?? []).reduce((s, p) => s + Number(p.valor || 0), 0);
  const total = Number(d.valor) || 0;
  if (pago <= 0) return 'Aberto';
  if (pago >= total - 0.005) return 'Quitado';
  return 'Parcial';
}

async function fetchTodasDespesasParaRelatorio(
  filtros: ReturnType<typeof buildDespesasApiFiltros>,
): Promise<ApiCentroCustoDespesa[]> {
  const acc: ApiCentroCustoDespesa[] = [];
  let page = 1;
  for (;;) {
    const res = await centroCustoService.listarDespesas(page, RELATORIO_PAGE, filtros);
    acc.push(...res.items);
    if (res.items.length === 0 || acc.length >= res.total) break;
    page += 1;
    if (page > 500) break;
  }
  return acc;
}

function agregarDespesasPorMes(rows: ApiCentroCustoDespesa[]) {
  const map = new Map<string, { qtd: number; total: number }>();
  for (const d of rows) {
    const raw = typeof d.data === 'string' ? d.data : '';
    const ym = raw.length >= 7 ? raw.slice(0, 7) : '';
    if (!ym) continue;
    const cur = map.get(ym) ?? { qtd: 0, total: 0 };
    cur.qtd += 1;
    cur.total += Number(d.valor) || 0;
    map.set(ym, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, v]) => ({ periodo, ...v }));
}

function formatarMesReferencia(ym: string): string {
  if (ym.length < 7) return ym;
  return `${ym.slice(5, 7)}/${ym.slice(0, 4)}`;
}

function agregarDespesasPorTipo(rows: ApiCentroCustoDespesa[]) {
  const map = new Map<string, { qtd: number; total: number }>();
  for (const d of rows) {
    const nome = d.tipoNome?.trim() || `Tipo #${d.tipoId}`;
    const cur = map.get(nome) ?? { qtd: 0, total: 0 };
    cur.qtd += 1;
    cur.total += Number(d.valor) || 0;
    map.set(nome, cur);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([tipo, v]) => ({ tipo, ...v }));
}

function DespesasFiltrosBar({
  rocasAtivas,
  loadingRocas,
}: {
  rocasAtivas: Roca[];
  loadingRocas: boolean;
}) {
  const rotulo = useRotuloRoca();
  const {
    despesasFiltro,
    aplicarFiltrosDespesas,
    limparFiltrosDespesas,
    despesasBusca,
    setDespesasBusca,
    tiposOpcoes,
  } = useCentroCustos();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [rocaFiltro, setRocaFiltro] = useState<number | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<'' | DespesasStatusFiltro>('');
  const [qLocal, setQLocal] = useState(despesasBusca);

  const [relatorioPdfOpen, setRelatorioPdfOpen] = useState(false);
  const [relatorioPdfLoading, setRelatorioPdfLoading] = useState(false);
  const [relatorioPdfDataIni, setRelatorioPdfDataIni] = useState('');
  const [relatorioPdfDataFim, setRelatorioPdfDataFim] = useState('');
  const [relatorioPdfTipoSelect, setRelatorioPdfTipoSelect] = useState('todos');
  const [relatorioPdfStatus, setRelatorioPdfStatus] = useState('Todos');
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [relatorioKind, setRelatorioKind] = useState<RelatorioDespesaId | null>(null);
  const [relatorioGerando, setRelatorioGerando] = useState(false);
  const [relatorioRows, setRelatorioRows] = useState<ApiCentroCustoDespesa[] | null>(null);
  const [rDataIni, setRDataIni] = useState('');
  const [rDataFim, setRDataFim] = useState('');
  const [rTipoFiltro, setRTipoFiltro] = useState('');
  const [rRocaFiltro, setRRocaFiltro] = useState<number | null>(null);
  const [rStatusFiltro, setRStatusFiltro] = useState<'' | DespesasStatusFiltro>('');

  const relatorioPdfTipoId = useMemo(() => {
    if (!relatorioPdfTipoSelect || relatorioPdfTipoSelect === 'todos') return null;
    const n = parseInt(relatorioPdfTipoSelect, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [relatorioPdfTipoSelect]);

  const relatorioPdfParams = useMemo(
    () => ({
      dataInicial: relatorioPdfDataIni || undefined,
      dataFinal: relatorioPdfDataFim || undefined,
      status:
        relatorioPdfStatus !== 'Todos' ? relatorioPdfStatus : undefined,
      tipoDespesaId: relatorioPdfTipoId ?? undefined,
    }),
    [
      relatorioPdfDataIni,
      relatorioPdfDataFim,
      relatorioPdfStatus,
      relatorioPdfTipoId,
    ],
  );

  const {
    data: relatorioPdfPreviewTotal,
    isFetching: relatorioPdfPreviewFetching,
    isError: relatorioPdfPreviewError,
    error: relatorioPdfPreviewErr,
  } = useQuery({
    queryKey: ['centro-despesa-relatorio-pdf-preview', relatorioPdfParams],
    queryFn: () =>
      relatoriosClienteService.contarRelatorioCentroCustoContasPagar(
        relatorioPdfParams,
      ),
    enabled: relatorioPdfOpen,
    retry: false,
  });

  const relatorioPdfTemDados =
    relatorioPdfPreviewTotal != null && relatorioPdfPreviewTotal > 0;

  const abrirRelatorioPdf = () => {
    setRelatorioPdfDataIni(despesasFiltro.dataInicial ?? '');
    setRelatorioPdfDataFim(despesasFiltro.dataFinal ?? '');
    setRelatorioPdfTipoSelect(despesasFiltro.tipoId || 'todos');
    const st = despesasFiltro.status;
    if (st === 'ABERTO') setRelatorioPdfStatus('PENDENTE');
    else if (st === 'PARCIAL') setRelatorioPdfStatus('PAGO_PARCIAL');
    else if (st === 'QUITADO') setRelatorioPdfStatus('PAGO_TOTAL');
    else setRelatorioPdfStatus('Todos');
    setRelatorioPdfOpen(true);
  };

  const abrirRelatorio = useCallback(
    (kind: RelatorioDespesaId) => {
      setRelatorioKind(kind);
      setRelatorioRows(null);
      setRDataIni(despesasFiltro.dataInicial ?? '');
      setRDataFim(despesasFiltro.dataFinal ?? '');
      setRTipoFiltro(despesasFiltro.tipoId ?? '');
      setRRocaFiltro(
        despesasFiltro.rocaId != null && despesasFiltro.rocaId > 0
          ? despesasFiltro.rocaId
          : null,
      );
      setRStatusFiltro(
        despesasFiltro.status === 'ABERTO' ||
          despesasFiltro.status === 'PARCIAL' ||
          despesasFiltro.status === 'QUITADO'
          ? despesasFiltro.status
          : '',
      );
      setRelatorioOpen(true);
    },
    [despesasFiltro],
  );

  const fecharRelatorioDialog = (open: boolean) => {
    setRelatorioOpen(open);
    if (!open) {
      setRelatorioKind(null);
      setRelatorioRows(null);
    }
  };

  const handleGerarRelatorio = async () => {
    const a = rDataIni.trim();
    const b = rDataFim.trim();
    if (a && b && a > b) {
      toast.error('A data inicial não pode ser maior que a data final.');
      return;
    }
    const f: DespesasFiltro = {};
    if (a) f.dataInicial = a.slice(0, 10);
    if (b) f.dataFinal = b.slice(0, 10);
    if (rTipoFiltro) f.tipoId = rTipoFiltro;
    if (rRocaFiltro != null && rRocaFiltro > 0) f.rocaId = rRocaFiltro;
    if (rStatusFiltro) f.status = rStatusFiltro;
    const payload = buildDespesasApiFiltros(f, '');
    setRelatorioGerando(true);
    try {
      const rows = await fetchTodasDespesasParaRelatorio(payload);
      setRelatorioRows(rows);
      toast.success(
        rows.length === 0
          ? 'Nenhum lançamento encontrado com esses filtros.'
          : `Relatório gerado com ${rows.length} lançamento(s).`,
      );
    } catch (e) {
      toast.error(msgErro(e, 'Não foi possível gerar o relatório.'));
    } finally {
      setRelatorioGerando(false);
    }
  };

  const relatorioMeta = useMemo(() => {
    if (!relatorioKind) return null;
    const base = RELATORIO_DESPESA_META[relatorioKind];
    if (relatorioKind === 'analitico') {
      return {
        ...base,
        descricao: `Listagem detalhada por período, tipo, ${rotulo.singularLower} e status de pagamento.`,
      };
    }
    return base;
  }, [relatorioKind, rotulo.singularLower]);
  const totalRelatorioValor =
    relatorioRows?.reduce((s, d) => s + (Number(d.valor) || 0), 0) ?? 0;
  const porMes = relatorioRows ? agregarDespesasPorMes(relatorioRows) : [];
  const porTipoAgg = relatorioRows ? agregarDespesasPorTipo(relatorioRows) : [];

  useEffect(() => {
    setDataIni(despesasFiltro.dataInicial ?? '');
    setDataFim(despesasFiltro.dataFinal ?? '');
    setTipoFiltro(despesasFiltro.tipoId ?? '');
    setRocaFiltro(
      despesasFiltro.rocaId != null && despesasFiltro.rocaId > 0
        ? despesasFiltro.rocaId
        : null,
    );
    setStatusFiltro(
      despesasFiltro.status === 'ABERTO' ||
        despesasFiltro.status === 'PARCIAL' ||
        despesasFiltro.status === 'QUITADO'
        ? despesasFiltro.status
        : '',
    );
  }, [despesasFiltro]);

  useEffect(() => {
    setQLocal(despesasBusca);
  }, [despesasBusca]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (qLocal !== despesasBusca) {
        setDespesasBusca(qLocal);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [qLocal, despesasBusca, setDespesasBusca]);

  const handleAplicarFiltrosSheet = () => {
    const a = dataIni.trim();
    const b = dataFim.trim();
    if (a && b && a > b) {
      toast.error('A data inicial não pode ser maior que a data final.');
      return;
    }
    /** Substitui só o que o sheet controla; preserva consistência com estado local já sincronizado. */
    const f: DespesasFiltro = {};
    if (a) f.dataInicial = a.slice(0, 10);
    if (b) f.dataFinal = b.slice(0, 10);
    if (tipoFiltro) f.tipoId = tipoFiltro;
    if (rocaFiltro != null && rocaFiltro > 0) f.rocaId = rocaFiltro;
    if (statusFiltro) f.status = statusFiltro;
    aplicarFiltrosDespesas(f);
    setSheetOpen(false);
  };

  const handleLimparFiltrosSheet = () => {
    setDataIni('');
    setDataFim('');
    setTipoFiltro('');
    setRocaFiltro(null);
    setStatusFiltro('');
    limparFiltrosDespesas();
    setSheetOpen(false);
  };

  const temFiltrosAtivos = !isDespesasFiltroVazio(despesasFiltro);
  const contagemFiltrosAvancado =
    (despesasFiltro.dataInicial ? 1 : 0) +
    (despesasFiltro.dataFinal ? 1 : 0) +
    (despesasFiltro.tipoId ? 1 : 0) +
    (despesasFiltro.rocaId != null && despesasFiltro.rocaId > 0 ? 1 : 0) +
    (despesasFiltro.status ? 1 : 0);

  return (
    <>
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-stretch sm:gap-4">
        <div className="order-1 flex w-full min-w-0 sm:w-auto sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            onClick={() => setSheetOpen(true)}
            style={
              temFiltrosAtivos
                ? { borderColor: 'var(--primary)', borderWidth: '2px' }
                : undefined
            }
          >
            <Filter className="w-4 h-4" />
            Filtros
            {contagemFiltrosAvancado > 0 ? (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {contagemFiltrosAvancado}
              </span>
            ) : null}
          </Button>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="right"
            className="w-[400px] sm:w-[540px] max-w-full overflow-y-auto"
          >
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Filter className="w-5 h-5 text-primary" />
                </div>
                <SheetTitle className="text-xl">Filtros Avançados</SheetTitle>
              </div>
              <SheetDescription>Refine sua busca</SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              {/* Tipo de despesa — mesmo padrão do select “Fornecedor” em Contas a Pagar */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Tipo de despesa</Label>
                <Select
                  value={tipoFiltro || 'todos'}
                  onValueChange={(v) => setTipoFiltro(v === 'todos' ? '' : v)}
                >
                  <SelectTrigger className="w-full rounded-xl border-2">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposOpcoes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Período</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground" htmlFor="cc-filtro-data-ini">
                      Data Inicial
                    </Label>
                    <FiltroPeriodoDateInput
                      id="cc-filtro-data-ini"
                      value={dataIni}
                      onChange={setDataIni}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground" htmlFor="cc-filtro-data-fim">
                      Data Final
                    </Label>
                    <FiltroPeriodoDateInput
                      id="cc-filtro-data-fim"
                      value={dataFim}
                      onChange={setDataFim}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold">{rotulo.singular}</Label>
                <Select
                  value={rocaFiltro != null && rocaFiltro > 0 ? String(rocaFiltro) : 'todas'}
                  onValueChange={(v) => {
                    if (v === 'todas') {
                      setRocaFiltro(null);
                      return;
                    }
                    const n = parseInt(v, 10);
                    setRocaFiltro(Number.isFinite(n) && n > 0 ? n : null);
                  }}
                  disabled={loadingRocas}
                >
                  <SelectTrigger className="w-full rounded-xl border-2">
                    <SelectValue placeholder={rotulo.todas} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">{rotulo.todas}</SelectItem>
                    {rocasAtivas.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nome}
                        {r.codigo ? ` (${r.codigo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Status</Label>
                <RadioGroup
                  value={statusFiltro || 'todos'}
                  onValueChange={(v) => {
                    setStatusFiltro(
                      v === 'todos' || v === '' ? '' : (v as DespesasStatusFiltro),
                    );
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="todos" id="cc-despesa-status-todos" />
                    <Label
                      htmlFor="cc-despesa-status-todos"
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Circle className="w-3 h-3 text-primary" />
                      <span>Todos</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ABERTO" id="cc-despesa-status-aberto" />
                    <Label
                      htmlFor="cc-despesa-status-aberto"
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Circle className="w-3 h-3 text-amber-500" />
                      <span>Aberto</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PARCIAL" id="cc-despesa-status-parcial" />
                    <Label
                      htmlFor="cc-despesa-status-parcial"
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Circle className="w-3 h-3 text-sky-500" />
                      <span>Parcial</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="QUITADO" id="cc-despesa-status-quitado" />
                    <Label
                      htmlFor="cc-despesa-status-quitado"
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Circle className="w-3 h-3 text-emerald-500" />
                      <span>Quitado</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleAplicarFiltrosSheet}
                  className="flex-1 rounded-full"
                >
                  Aplicar Filtros
                </Button>
                <Button
                  type="button"
                  onClick={handleLimparFiltrosSheet}
                  variant="outline"
                  className="flex-1 rounded-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="relative order-2 min-w-0 w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={`Buscar por descrição, tipo, ${rotulo.singularLower}, número (id)…`}
            className="pl-10"
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            aria-label="Buscar despesas"
          />
        </div>

        <div className="order-3 flex w-full min-w-0 sm:w-auto sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            onClick={abrirRelatorioPdf}
          >
            <BarChart3 className="w-4 h-4" />
            Relatórios
          </Button>
        </div>
      </div>
    </div>

    <Dialog
      open={relatorioPdfOpen}
      onOpenChange={(open) => {
        setRelatorioPdfOpen(open);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório por centro de despesa</DialogTitle>
          <DialogDescription>
            Mesmo formato do relatório de Contas a Pagar: filtros, resumo e
            lançamentos financeiros em PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="cc-relatorio-pdf-tipo">Tipo de despesa</Label>
            <Select
              value={relatorioPdfTipoSelect || 'todos'}
              onValueChange={setRelatorioPdfTipoSelect}
            >
              <SelectTrigger id="cc-relatorio-pdf-tipo">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposOpcoes.map((tipo) => (
                  <SelectItem key={tipo.id} value={String(tipo.id)}>
                    {tipo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#1A3B70]">Período</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                  <Input
                    type="date"
                    className="rounded-lg border-border/80 bg-muted/50"
                    value={relatorioPdfDataIni}
                    onChange={(e) => setRelatorioPdfDataIni(e.target.value || '')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data Final</Label>
                  <Input
                    type="date"
                    className="rounded-lg border-border/80 bg-muted/50"
                    value={relatorioPdfDataFim}
                    onChange={(e) => setRelatorioPdfDataFim(e.target.value || '')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#1A3B70]">Status</Label>
              <RadioGroup
                value={relatorioPdfStatus}
                onValueChange={setRelatorioPdfStatus}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Todos" id="cc-pdf-status-todos" />
                  <Label htmlFor="cc-pdf-status-todos" className="cursor-pointer">
                    Todos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PENDENTE" id="cc-pdf-status-pendente" />
                  <Label htmlFor="cc-pdf-status-pendente" className="cursor-pointer">
                    Pendente
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PAGO_PARCIAL" id="cc-pdf-status-parcial" />
                  <Label htmlFor="cc-pdf-status-parcial" className="cursor-pointer">
                    Pago Parcial
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PAGO_TOTAL" id="cc-pdf-status-quitado" />
                  <Label htmlFor="cc-pdf-status-quitado" className="cursor-pointer">
                    Quitada
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="VENCIDO" id="cc-pdf-status-vencido" />
                  <Label htmlFor="cc-pdf-status-vencido" className="cursor-pointer">
                    Vencido
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CANCELADO" id="cc-pdf-status-cancelado" />
                  <Label htmlFor="cc-pdf-status-cancelado" className="cursor-pointer">
                    Cancelado
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {relatorioPdfPreviewFetching && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando filtros…
            </p>
          )}

          {relatorioPdfPreviewError && (
            <p className="text-sm text-destructive">
              {(relatorioPdfPreviewErr as Error)?.message ||
                'Não foi possível verificar os filtros.'}{' '}
              Você ainda pode baixar o PDF.
            </p>
          )}

          {!relatorioPdfPreviewFetching &&
            !relatorioPdfPreviewError &&
            relatorioPdfPreviewTotal === 0 && (
              <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm text-[#1A3B70]">
                Nenhum lançamento encontrado com esses filtros.
              </p>
            )}

          {!relatorioPdfPreviewFetching && relatorioPdfTemDados && (
            <p className="text-sm text-muted-foreground">
              {relatorioPdfPreviewTotal} lançamento(s) encontrado(s) com os filtros
              atuais.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Button
              type="button"
              variant="relatorioPrimary"
              className="flex-1 gap-2"
              disabled={relatorioPdfLoading}
              onClick={async () => {
                setRelatorioPdfLoading(true);
                try {
                  await relatoriosClienteService.downloadRelatorioCentroCustoContasPagar(
                    relatorioPdfParams,
                  );
                  toast.success('PDF baixado.');
                } catch (e: unknown) {
                  toast.error(
                    e instanceof Error ? e.message : 'Erro ao gerar PDF.',
                  );
                } finally {
                  setRelatorioPdfLoading(false);
                }
              }}
            >
              {relatorioPdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Baixar PDF
            </Button>
            <Button
              type="button"
              variant="relatorioSecondary"
              className="flex-1 gap-2"
              disabled={relatorioPdfLoading}
              onClick={async () => {
                setRelatorioPdfLoading(true);
                try {
                  await relatoriosClienteService.imprimirRelatorioCentroCustoContasPagar(
                    relatorioPdfParams,
                  );
                } catch (e: unknown) {
                  toast.error(
                    e instanceof Error ? e.message : 'Erro ao abrir PDF.',
                  );
                } finally {
                  setRelatorioPdfLoading(false);
                }
              }}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={relatorioOpen} onOpenChange={fecharRelatorioDialog}>
      <DialogContent
        className={cn(
          'gap-0 p-0 max-h-[min(92vh,900px)] overflow-hidden flex flex-col sm:max-w-[min(100vw-2rem,28rem)]',
          relatorioRows !== null && 'sm:max-w-[min(100vw-2rem,56rem)]',
        )}
      >
        <DialogHeader className="space-y-1 border-b border-border/60 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-lg font-semibold leading-tight text-foreground pr-8">
            {relatorioMeta?.titulo ?? 'Relatório'}
          </DialogTitle>
          <DialogDescription className="text-xs leading-snug text-muted-foreground">
            {relatorioMeta?.descricao ??
              'Escolha um relatório no menu. Os campos abaixo repetem os filtros avançados da lista.'}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-border/80 bg-muted/25 px-3 py-3.5 sm:px-4">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cc-rel-tipo" className="text-xs font-medium text-foreground">
                  Tipo de despesa
                </Label>
                <Select
                  value={rTipoFiltro || 'todos'}
                  onValueChange={(v) => setRTipoFiltro(v === 'todos' ? '' : v)}
                >
                  <SelectTrigger
                    id="cc-rel-tipo"
                    className="h-9 w-full rounded-lg border-2 border-primary/35 bg-background shadow-none"
                  >
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposOpcoes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cc-rel-roca" className="text-xs font-medium text-foreground">
                  {rotulo.singular}
                </Label>
                <Select
                  value={rRocaFiltro != null && rRocaFiltro > 0 ? String(rRocaFiltro) : 'todas'}
                  onValueChange={(v) => {
                    if (v === 'todas') {
                      setRRocaFiltro(null);
                      return;
                    }
                    const n = parseInt(v, 10);
                    setRRocaFiltro(Number.isFinite(n) && n > 0 ? n : null);
                  }}
                  disabled={loadingRocas}
                >
                  <SelectTrigger
                    id="cc-rel-roca"
                    className="h-9 w-full rounded-lg border-2 border-primary/35 bg-background shadow-none"
                  >
                    <SelectValue placeholder={rotulo.todas} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">{rotulo.todas}</SelectItem>
                    {rocasAtivas.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nome}
                        {r.codigo ? ` (${r.codigo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-foreground">Período</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label
                      className="text-[11px] font-normal text-muted-foreground"
                      htmlFor="cc-relatorio-data-ini"
                    >
                      Data inicial
                    </Label>
                    <FiltroPeriodoDateInput
                      id="cc-relatorio-data-ini"
                      value={rDataIni}
                      onChange={setRDataIni}
                      compact
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      className="text-[11px] font-normal text-muted-foreground"
                      htmlFor="cc-relatorio-data-fim"
                    >
                      Data final
                    </Label>
                    <FiltroPeriodoDateInput
                      id="cc-relatorio-data-fim"
                      value={rDataFim}
                      onChange={setRDataFim}
                      compact
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-foreground">Status</Label>
                <RadioGroup
                  value={rStatusFiltro || 'todos'}
                  onValueChange={(v) => {
                    setRStatusFiltro(
                      v === 'todos' || v === '' ? '' : (v as DespesasStatusFiltro),
                    );
                  }}
                  className="grid gap-0.5"
                >
                  <label
                    htmlFor="cc-relatorio-status-todos"
                    className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 hover:bg-muted/50"
                  >
                    <RadioGroupItem value="todos" id="cc-relatorio-status-todos" className="shrink-0" />
                    <Circle className="h-2.5 w-2.5 shrink-0 text-primary" />
                    <span className="text-sm">Todos</span>
                  </label>
                  <label
                    htmlFor="cc-relatorio-status-aberto"
                    className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 hover:bg-muted/50"
                  >
                    <RadioGroupItem value="ABERTO" id="cc-relatorio-status-aberto" className="shrink-0" />
                    <Circle className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                    <span className="text-sm">Aberto</span>
                  </label>
                  <label
                    htmlFor="cc-relatorio-status-parcial"
                    className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 hover:bg-muted/50"
                  >
                    <RadioGroupItem value="PARCIAL" id="cc-relatorio-status-parcial" className="shrink-0" />
                    <Circle className="h-2.5 w-2.5 shrink-0 text-sky-500" />
                    <span className="text-sm">Parcial</span>
                  </label>
                  <label
                    htmlFor="cc-relatorio-status-quitado"
                    className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 hover:bg-muted/50"
                  >
                    <RadioGroupItem value="QUITADO" id="cc-relatorio-status-quitado" className="shrink-0" />
                    <Circle className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                    <span className="text-sm">Quitado</span>
                  </label>
                </RadioGroup>
              </div>
            </div>
          </div>
        </div>

        {relatorioRows !== null && relatorioKind ? (
          <div className="border-t border-border/60 px-5 py-3">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resultado
                </p>
                <p className="text-xs text-muted-foreground">
                  {relatorioRows.length} lançamento(s) ·{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(totalRelatorioValor)}
                  </span>
                </p>
              </div>

              {relatorioKind === 'analitico' ? (
                <div className="max-h-[min(42vh,320px)] overflow-auto rounded-lg border border-border/80 text-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>{rotulo.singular}</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatorioRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum registro.
                          </TableCell>
                        </TableRow>
                      ) : (
                        relatorioRows.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {typeof d.data === 'string' ? formatDate(d.data) : '—'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={d.descricao}>
                              {d.descricao}
                            </TableCell>
                            <TableCell className="max-w-[140px] truncate">
                              {d.tipoNome ?? '—'}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {d.rocaNome ?? '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(Number(d.valor) || 0)}
                            </TableCell>
                            <TableCell>{statusLinhaRelatorio(d)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {relatorioKind === 'resumo_periodo' ? (
                <div className="max-h-[min(42vh,320px)] overflow-auto rounded-lg border border-border/80 text-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês (competência)</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porMes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            Nenhum registro.
                          </TableCell>
                        </TableRow>
                      ) : (
                        porMes.map((row) => (
                          <TableRow key={row.periodo}>
                            <TableCell>{formatarMesReferencia(row.periodo)}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.qtd}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(row.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {relatorioKind === 'por_tipo' ? (
                <div className="max-h-[min(42vh,320px)] overflow-auto rounded-lg border border-border/80 text-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo de despesa</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porTipoAgg.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            Nenhum registro.
                          </TableCell>
                        </TableRow>
                      ) : (
                        porTipoAgg.map((row) => (
                          <TableRow key={row.tipo}>
                            <TableCell>{row.tipo}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.qtd}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(row.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="w-full gap-2 border-t border-border/60 px-5 py-3.5 sm:flex-row sm:gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full rounded-lg sm:flex-1"
            onClick={() => fecharRelatorioDialog(false)}
            disabled={relatorioGerando}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className="h-9 w-full rounded-lg sm:flex-1"
            onClick={handleGerarRelatorio}
            disabled={relatorioGerando}
          >
            {relatorioGerando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                Gerar relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function msgErro(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export default function CentroCustos() {
  const rotulo = useRotuloRoca();
  const {
    tipos,
    tiposOpcoes,
    tiposPage,
    setTiposPage,
    tiposTotal,
    despesas,
    despesasPage,
    setDespesasPage,
    despesasTotal,
    despesasFiltro,
    despesasBusca,
    isLoading,
    isLoadingTiposTabela,
    adicionarTipo,
    atualizarTipo,
    excluirTipo,
    atualizarDespesa,
    excluirDespesa,
    resumo,
  } = useCentroCustos();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rocasApi = [], isLoading: loadingRocas } = useQuery({
    queryKey: ['centro-custos', 'rocas-ativas'],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    retry: 1,
  });

  const rocasAtivas = useMemo(
    () =>
      (rocasApi as Roca[]).filter(
        (r) => r && (r.ativo === undefined || r.ativo === true),
      ),
    [rocasApi],
  );

  const totalTiposPages = Math.max(
    1,
    Math.ceil(tiposTotal / CENTRO_CUSTO_PAGE_SIZE),
  );
  const totalDespesasPages = Math.max(
    1,
    Math.ceil(despesasTotal / CENTRO_CUSTO_PAGE_SIZE),
  );
  const msgListaDespesasVazia =
    despesas.length === 0 &&
    (!isDespesasFiltroVazio(despesasFiltro) || despesasBusca.trim() !== '')
      ? 'Nenhuma despesa encontrada com os filtros selecionados ou o termo buscado.'
      : undefined;

  const isLoadingCards = isLoading;

  const nomeTipoDespesa = (d: CentroCustoDespesa) =>
    d.tipoNome ?? tiposOpcoes.find((t) => t.id === d.tipoId)?.nome ?? '—';

  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('visao');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'despesas' || t === 'tipos' || t === 'visao') {
      setTab(t);
    }
  }, [searchParams]);

  /** Tipos */
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [tipoEdit, setTipoEdit] = useState<CentroCustoTipo | null>(null);
  const [tipoNome, setTipoNome] = useState('');
  const [tipoDelete, setTipoDelete] = useState<CentroCustoTipo | null>(null);

  /** Despesa form */
  const [descricao, setDescricao] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [dataDesp, setDataDesp] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState('');
  const [tipoIdSel, setTipoIdSel] = useState<string>('');
  const [rocaSel, setRocaSel] = useState<Roca | null>(null);

  /** Despesa dialogs */
  const [editDesp, setEditDesp] = useState<CentroCustoDespesa | null>(null);
  const [deleteDesp, setDeleteDesp] = useState<CentroCustoDespesa | null>(null);
  const [alterarDataPgDesp, setAlterarDataPgDesp] = useState<CentroCustoDespesa | null>(null);
  const [novaDataPg, setNovaDataPg] = useState('');
  const [salvandoDataPg, setSalvandoDataPg] = useState(false);

  const openNovoTipo = () => {
    setTipoEdit(null);
    setTipoNome('');
    setTipoDialogOpen(true);
  };

  const salvarTipo = async () => {
    const n = tipoNome.trim();
    if (!n) {
      toast.error('Informe o nome do tipo.');
      return;
    }
    try {
      if (tipoEdit) await atualizarTipo(tipoEdit.id, n);
      else await adicionarTipo(n);
      setTipoDialogOpen(false);
      toast.success(tipoEdit ? 'Tipo atualizado.' : 'Tipo cadastrado.');
    } catch (e) {
      toast.error(msgErro(e, 'Não foi possível salvar o tipo.'));
    }
  };

  const parseValor = (s: string): number => {
    const n = parseValorMonetarioEntrada(s);
    return n === null || !Number.isFinite(n) ? NaN : n;
  };

  /** Ao sair do campo, normaliza para pt-BR com 2 decimais (ex.: 2900 → 2.900,00). */
  const onBlurFormatarValorDespesa = () => {
    const s = valorStr.trim();
    if (s === '') return;
    const n = parseValorMonetarioEntrada(s);
    if (n === null || !Number.isFinite(n)) return;
    setValorStr(formatValorMonetarioBr(n));
  };

  const despesaNomeTipo = nomeTipoDespesa;

  const salvarEdicaoDespesa = async () => {
    if (!editDesp) return;
    const v = parseValor(valorStr);
    if (!descricao.trim()) {
      toast.error('Informe a descrição.');
      return;
    }
    if (!tipoIdSel) {
      toast.error('Selecione o tipo.');
      return;
    }
    if (!rocaSel) {
      toast.error(`Selecione a ${rotulo.singularLower}.`);
      return;
    }
    if (!Number.isFinite(v) || v < totalPagoNaDespesa(editDesp)) {
      toast.error('Valor não pode ser menor que o total já pago.');
      return;
    }
    try {
      await atualizarDespesa(editDesp.id, {
        descricao: descricao.trim(),
        tipoId: tipoIdSel,
        rocaId: rocaSel.id,
        rocaNome: rocaSel.nome,
        valor: v,
        data: dataDesp,
        observacoes: observacoes.trim() || undefined,
      });
      setEditDesp(null);
      toast.success('Despesa atualizada.');
    } catch (e) {
      toast.error(msgErro(e, 'Não foi possível atualizar a despesa.'));
    }
  };

  const abrirEditar = (d: CentroCustoDespesa) => {
    setEditDesp(d);
    setDescricao(d.descricao);
    setValorStr(formatValorMonetarioBr(Number(d.valor)));
    setDataDesp(d.data.slice(0, 10));
    setObservacoes(d.observacoes ?? '');
    setTipoIdSel(d.tipoId);
    const r = rocasAtivas.find((x) => x.id === d.rocaId);
    setRocaSel(r ?? ({ id: d.rocaId, nome: d.rocaNome, codigo: '', produtorId: 0 } as Roca));
  };

  /** Resolve o id da conta a pagar espelhada (sincroniza se necessário). */
  const resolverContaFinanceiraId = useCallback(
    async (d: CentroCustoDespesa): Promise<number | null> => {
      let contaId = d.contaFinanceiraId ?? null;
      if (contaId == null) {
        try {
          await centroCustoService.sincronizarContasFinanceiras();
          await queryClient.invalidateQueries({ queryKey: ['centro-custo'] });
          const fresh = await centroCustoService.buscarDespesaPorId(Number(d.id));
          contaId =
            fresh.contaFinanceiraId != null ? Number(fresh.contaFinanceiraId) : null;
        } catch (e) {
          toast.error(msgErro(e, 'Não foi possível vincular a conta a pagar.'));
          return null;
        }
      }
      if (contaId == null) {
        toast.error(
          'Esta despesa ainda não tem conta a pagar. Aguarde a sincronização ou contate o suporte.',
        );
        return null;
      }
      return contaId;
    },
    [queryClient],
  );

  /** Mesmo layout de detalhes que Contas a Pagar → despesa (cards + histórico). */
  const abrirDetalhe = useCallback(
    async (d: CentroCustoDespesa) => {
      const contaId = await resolverContaFinanceiraId(d);
      if (contaId == null) return;
      navigate(`/financeiro/contas-pagar/despesa/${contaId}`, {
        state: { voltarPara: '/centro-custos' },
      });
    },
    [navigate, resolverContaFinanceiraId],
  );

  /** Mesma tela de Registrar Pagamento de Contas a Pagar (parcial/total + forma + observações). */
  const abrirPagarRapido = useCallback(
    async (d: CentroCustoDespesa) => {
      if (statusDespesa(d) === 'QUITADO') {
        toast.info('Esta despesa já está quitada.');
        return;
      }
      const contaId = await resolverContaFinanceiraId(d);
      if (contaId == null) return;
      navigate(`/financeiro/contas-pagar/conta/${contaId}/pagamentos`, {
        state: { voltarPara: '/centro-custos' },
      });
    },
    [navigate, resolverContaFinanceiraId],
  );

  const fecharEdicao = () => {
    setEditDesp(null);
    setDescricao('');
    setValorStr('');
    setObservacoes('');
    setTipoIdSel('');
    setRocaSel(null);
  };

  const abrirAlterarDataPagamento = (d: CentroCustoDespesa) => {
    setAlterarDataPgDesp(d);
    const dataInicial =
      d.dataPagamentoManual ||
      [...d.pagamentos]
        .sort((a, b) => b.data.localeCompare(a.data))[0]?.data ||
      new Date().toISOString().slice(0, 10);
    setNovaDataPg(dataInicial.slice(0, 10));
  };

  const salvarAlteracaoDataPagamento = async () => {
    if (!alterarDataPgDesp) return;
    const data = novaDataPg.trim().slice(0, 10);
    if (!data) {
      toast.error('Selecione a nova data de pagamento.');
      return;
    }
    setSalvandoDataPg(true);
    try {
      await centroCustoService.alterarDataPagamento(Number(alterarDataPgDesp.id), {
        data,
      });
      await queryClient.invalidateQueries({ queryKey: ['centro-custo'] });
      setAlterarDataPgDesp(null);
      setNovaDataPg('');
      toast.success('Data de pagamento atualizada.');
    } catch (e) {
      toast.error(msgErro(e, 'Não foi possível alterar a data de pagamento.'));
    } finally {
      setSalvandoDataPg(false);
    }
  };

  const centroCustoStatItems = useMemo((): ModuleStatCardItem[] => {
    return CARD_STATS.map((c) => {
      const valNum =
        c.key === 'abertas'
          ? resumo.qAbertas
          : c.key === 'quitadas'
            ? resumo.qQuitadas
            : c.key === 'valorAberto'
              ? resumo.valorAbertoTotal
              : resumo.valorPagoTotal;
      return {
        key: c.key,
        label: c.label,
        value: c.kind === 'count' ? String(valNum) : formatCurrency(valNum),
        iconWrap: c.iconWrap,
        iconClass: c.iconClass,
        valueClass: c.valueClass,
        cardClassName: c.cardClassName,
        labelClassName: c.labelClassName,
        Icon: c.Icon,
      };
    });
  }, [resumo]);

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={Landmark}
          title="Centro de Despesa"
          subtitle={
            <>
              Cadastro de <span className="whitespace-nowrap">tipos de custo</span> e despesas por {rotulo.singularLower},
              sincronizado com o banco do seu tenant.
            </>
          }
          loadingHint={isLoadingCards ? 'Carregando resumo e despesas…' : undefined}
        />

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          {tab === 'visao' && (
            <ModuleStatCards
              isLoading={isLoadingCards}
              columns={4}
              className="mb-0"
              items={centroCustoStatItems}
            />
          )}

          <div
            className={cn(
              'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
              tab === 'visao' ? 'pt-2' : '',
            )}
          >
            <TabsList className="grid h-auto w-full max-w-lg shrink-0 grid-cols-3 p-1 sm:w-auto">
              <TabsTrigger value="visao">Visão geral</TabsTrigger>
              <TabsTrigger value="tipos">Tipos de custo</TabsTrigger>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
            </TabsList>
            {tab === 'visao' && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-end sm:self-auto"
                onClick={() => setTab('despesas')}
              >
                Ir para nova despesa
              </Button>
            )}
          </div>

          {(tab === 'visao' || tab === 'despesas') && (
            <DespesasFiltrosBar
              rocasAtivas={rocasAtivas}
              loadingRocas={loadingRocas}
            />
          )}

          {tab === 'visao' && (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <DespesasTable
                despesas={despesas}
                nomeTipo={despesaNomeTipo}
                onDetalhe={abrirDetalhe}
                onPagar={abrirPagarRapido}
                onEditar={abrirEditar}
                onExcluir={setDeleteDesp}
                onAlterarDataPagamento={abrirAlterarDataPagamento}
                emptyMessage={msgListaDespesasVazia}
              />
              <CentroCustoTablePagination
                page={despesasPage}
                setPage={setDespesasPage}
                total={despesasTotal}
                totalPages={totalDespesasPages}
              />
            </div>
          )}

          <TabsContent value="visao" className="mt-0">
            <span className="sr-only">Resumo e tabela de despesas estão acima das abas.</span>
          </TabsContent>

          <TabsContent value="tipos" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground max-w-xl">
                Tipos livres (gasolina, mudas…). Usados ao lançar despesas.
              </p>
              <Button onClick={openNovoTipo} className="shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Novo tipo
              </Button>
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTiposTabela && tipos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-10">
                        Carregando tipos…
                      </TableCell>
                    </TableRow>
                  ) : tipos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-10">
                        Nenhum tipo cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tipos.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.nome}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTipoEdit(t);
                              setTipoNome(t.nome);
                              setTipoDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setTipoDelete(t)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <CentroCustoTablePagination
                page={tiposPage}
                setPage={setTiposPage}
                total={tiposTotal}
                totalPages={totalTiposPages}
              />
            </div>
          </TabsContent>

          <TabsContent value="despesas" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground max-w-xl">
                Despesas por {rotulo.singularLower} e tipo de custo, sincronizadas com Contas a pagar.
              </p>
              <Button
                className="shrink-0 rounded-xl gap-2"
                onClick={() => navigate('/centro-custos/nova-despesa')}
              >
                <Plus className="w-4 h-4" />
                Nova despesa
              </Button>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold">Lista de despesas</h2>
              <div className="rounded-xl border bg-card overflow-x-auto">
                <DespesasTable
                  despesas={despesas}
                  nomeTipo={despesaNomeTipo}
                  onDetalhe={abrirDetalhe}
                  onPagar={abrirPagarRapido}
                  onEditar={abrirEditar}
                  onExcluir={setDeleteDesp}
                  onAlterarDataPagamento={abrirAlterarDataPagamento}
                  emptyMessage={msgListaDespesasVazia}
                />
                <CentroCustoTablePagination
                  page={despesasPage}
                  setPage={setDespesasPage}
                  total={despesasTotal}
                  totalPages={totalDespesasPages}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tipo create/edit */}
        <Dialog open={tipoDialogOpen} onOpenChange={setTipoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tipoEdit ? 'Editar tipo' : 'Novo tipo de custo'}</DialogTitle>
              <DialogDescription>Nome exibido nos lançamentos e relatórios.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={tipoNome} onChange={(e) => setTipoNome(e.target.value)} placeholder="Ex.: Gasolina" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTipoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarTipo}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Editar despesa */}
        <Dialog
          open={!!editDesp}
          onOpenChange={(o) => {
            if (!o) fecharEdicao();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar despesa</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {tipoIdSel ? tiposOpcoes.find((t) => t.id === tipoIdSel)?.nome : 'Selecione'}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                    <Command>
                      <CommandInput placeholder="Pesquisar…" />
                      <CommandList>
                        <CommandEmpty>Nenhum.</CommandEmpty>
                        <CommandGroup>
                          {tiposOpcoes.map((t) => (
                            <CommandItem key={t.id} value={t.nome} onSelect={() => setTipoIdSel(t.id)}>
                              {t.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>{rotulo.singular}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">{rocaSel?.nome ?? 'Selecione'}</span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder={`Pesquisar ${rotulo.singularLower}…`} />
                      <CommandList>
                        <CommandGroup>
                          {rocasAtivas.map((r) => (
                            <CommandItem
                              key={r.id}
                              value={`${r.nome} ${r.codigo}`}
                              onSelect={() => setRocaSel(r)}
                            >
                              {r.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Valor</Label>
                  <Input
                    value={valorStr}
                    onChange={(e) => setValorStr(e.target.value)}
                    onBlur={onBlurFormatarValorDespesa}
                    inputMode="decimal"
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data</Label>
                  <Input type="date" value={dataDesp} onChange={(e) => setDataDesp(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={fecharEdicao}>
                Cancelar
              </Button>
              <Button onClick={salvarEdicaoDespesa}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!tipoDelete} onOpenChange={(o) => !o && setTipoDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir tipo?</AlertDialogTitle>
              <AlertDialogDescription>
                Só é possível excluir um tipo que não tenha despesas vinculadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async (ev) => {
                  ev.preventDefault();
                  if (!tipoDelete) return;
                  try {
                    await excluirTipo(tipoDelete.id);
                    setTipoDelete(null);
                    toast.success('Tipo excluído.');
                  } catch (e) {
                    toast.error(msgErro(e, 'Não foi possível excluir o tipo.'));
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteDesp} onOpenChange={(o) => !o && setDeleteDesp(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação remove o lançamento e os pagamentos associados.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async (ev) => {
                  ev.preventDefault();
                  const alvo = deleteDesp;
                  if (!alvo) return;
                  try {
                    await excluirDespesa(alvo.id);
                    setDeleteDesp(null);
                    toast.success('Despesa excluída.');
                  } catch (e) {
                    toast.error(msgErro(e, 'Não foi possível excluir a despesa.'));
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={!!alterarDataPgDesp}
          onOpenChange={(open) => {
            if (!open && !salvandoDataPg) {
              setAlterarDataPgDesp(null);
              setNovaDataPg('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Alterar data de pagamento</DialogTitle>
              <DialogDescription>
                Defina manualmente a data de pagamento desta despesa, mesmo se ela já estiver parcial ou quitada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cc-nova-data-pagamento">Nova data de pagamento</Label>
              <Input
                id="cc-nova-data-pagamento"
                type="date"
                value={novaDataPg}
                onChange={(e) => setNovaDataPg(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (salvandoDataPg) return;
                  setAlterarDataPgDesp(null);
                  setNovaDataPg('');
                }}
                disabled={salvandoDataPg}
              >
                Cancelar
              </Button>
              <Button onClick={salvarAlteracaoDataPagamento} disabled={salvandoDataPg}>
                {salvandoDataPg ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
