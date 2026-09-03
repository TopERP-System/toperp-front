import { CampoCnpjComConsulta } from '@/components/CampoCnpjComConsulta';
import AppLayout from '@/components/layout/AppLayout';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu';
import {
  RocaEnderecoContatoFields,
  ROCA_ENDERECO_CONTATO_VAZIO,
  type RocaEnderecoContatoData,
} from '@/components/roca/RocaEnderecoContatoFields';
import { DiarioRocaTab } from '@/components/roca/DiarioRocaTab';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
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
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn, compareRocaPorCodigo, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  cleanDocument,
  formatCPF,
  formatTelefone,
  normalizarTelefoneWhatsappEnvio,
  telefoneArmazenadoParaCampo,
} from '@/lib/validators';
import { ConsultaCnpjResponse } from '@/services/cnpj.service';
import { controleRocaService } from '@/services/controle-roca.service';
import { produtosService } from '@/services/produtos.service';
import type {
    CampoCadastroMeeiroPendente,
    CreateLancamentoProducaoRocaDto,
    CreateMeeiroRocaDto,
    CreateProdutorRocaDto,
    CreateRocaDto,
    MeeiroRoca,
    ProdutorRoca,
    RelatorioMeeiroResponse,
    AtualizarPagamentoMeeiroDto,
    HistoricoPagamentoMeeiroItem,
    ResumoPagamentoMeeiro,
    Roca,
    RocaDetalhes,
    UpdateMeeiroRocaDto,
    UpdateProdutorRocaDto,
    UpdateRocaDto
} from '@/types/roca';
import {
    VALOR_DE_EMBA_PADRAO,
    calcValorParteMeeiroLiquido,
} from '@/types/roca';

function valorDeEmbaPadraoDeMeeiro(
  m: Pick<MeeiroRoca, 'valor_de_emba_padrao' | 'valorDeEmbaPadrao'> | {
    valor_de_emba_padrao?: number;
    valorDeEmbaPadrao?: number;
  },
): number {
  const v = m.valor_de_emba_padrao ?? m.valorDeEmbaPadrao;
  return v != null && Number.isFinite(Number(v))
    ? Number(v)
    : VALOR_DE_EMBA_PADRAO;
}

function rocaEnderecoParaApi(data: RocaEnderecoContatoData) {
  return {
    cep: data.cep?.trim() || undefined,
    logradouro: data.logradouro?.trim() || undefined,
    numero: data.numero?.trim() || undefined,
    complemento: data.complemento?.trim() || undefined,
    bairro: data.bairro?.trim() || undefined,
    cidade: data.cidade?.trim() || undefined,
    estado: data.estado?.trim() || undefined,
    referencia: data.referencia?.trim() || undefined,
    telefone: data.telefone?.trim() || undefined,
    email: data.email?.trim() || undefined,
  };
}

function rocaEnderecoDeRegistro(
  r: Partial<RocaEnderecoContatoData> | null | undefined,
): RocaEnderecoContatoData {
  return {
    cep: r?.cep ?? '',
    logradouro: r?.logradouro ?? '',
    numero: r?.numero ?? '',
    complemento: r?.complemento ?? '',
    bairro: r?.bairro ?? '',
    cidade: r?.cidade ?? '',
    estado: r?.estado ?? '',
    referencia: r?.referencia ?? '',
    telefone: r?.telefone ?? '',
    email: r?.email ?? '',
  };
}
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    Archive,
    BarChart3,
    Banknote,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronsUpDown,
    ClipboardList,
    Copy,
    Download,
    Eye,
    FileText,
    Files,
    Filter,
    Hash,
    Loader2,
    MapPin,
    MoreHorizontal,
    NotebookPen,
    Package,
    Pencil,
    Phone,
    Plus,
    Printer,
    Search,
    Sprout,
    TrendingUp,
    Trash2,
    User,
    UserX,
    Wallet,
    Users,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

/** Cores estáveis por roça no gráfico de lançamentos por período (ordem das séries no legenda). */
const CORES_GRAFICO_ROCA_DASHBOARD = [
  '#2563eb',
  '#ec4899',
  '#16a34a',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#64748b',
  '#d946ef',
  '#0d9488',
];

/** Permite registrar liquidação (dinheiro ou abate da produção na dívida). */
function podeRegistrarPagamentoMeeiro(m: ResumoPagamentoMeeiro): boolean {
  const tr = m.totalReceber ?? 0;
  const emp = m.totalEmprestimosAbertos ?? 0;
  if (tr <= 0 && emp <= 0) return false;
  const vl = m.valorLiquido ?? 0;
  if (vl > 0) return true;
  if (vl < 0 && emp > 0) return true;
  if (vl === 0 && emp > 0) return true;
  if (tr > 0) return true;
  return false;
}

/** Produção já zerada nos cálculos, mas ainda há empréstimo em aberto (valor final pode ficar negativo). */
function apenasDividaEmprestimoSemProducaoRemanescente(m: ResumoPagamentoMeeiro): boolean {
  return (m.totalReceber ?? 0) <= 0 && (m.totalEmprestimosAbertos ?? 0) > 0;
}

/** Teto de abatimento no registro de pagamento (mesma lógica do servidor: empréstimo × produção líquida após embalagem). */
function maxAbaterEmprestimoResumoMeeiro(m: ResumoPagamentoMeeiro): number {
  const totalReceber = Number(m.totalReceber ?? 0);
  const valesEmb = Number(m.valesEmbalagem ?? 0);
  const totalEmp = Number(m.totalEmprestimosAbertos ?? 0);
  const disponivel = totalReceber;
  return Math.min(Math.max(0, totalEmp), disponivel);
}

/**
 * Valor inicial no campo "abater empréstimo": usa a coluna Desc emprést. da grade quando &gt; 0
 * (limitada ao máximo permitido); senão sugere o máximo abatível.
 */
function valorAbaterEmprestimoInicialString(m: ResumoPagamentoMeeiro): string {
  const max = maxAbaterEmprestimoResumoMeeiro(m);
  if (max <= 0) return '';
  const fromGradeDesc = Number(m.descEmprest ?? 0);
  const target =
    Number.isFinite(fromGradeDesc) && fromGradeDesc > 0
      ? Math.min(fromGradeDesc, max)
      : max;
  const rounded = Math.round(target * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

/** Abatimento com limites alinhados ao backend (registrar pagamento). */
function parsePagamentoMeeiroResumoForm(
  m: ResumoPagamentoMeeiro,
  form: { valorAbaterEmprestimo: string },
) {
  const totalReceber = Number(m.totalReceber ?? 0);
  const valesEmb = Number(m.valesEmbalagem ?? 0);
  const totalEmp = Number(m.totalEmprestimosAbertos ?? 0);
  const disponivel = totalReceber;
  const maxAbater = Math.min(Math.max(0, totalEmp), disponivel);
  const vRaw = form.valorAbaterEmprestimo;
  const v = vRaw === '' ? 0 : Number(vRaw);
  const vSafe = Number.isFinite(v) ? Math.max(0, Math.min(v, maxAbater)) : 0;
  const liquido = Math.max(0, totalReceber - vSafe);
  return {
    totalReceber,
    valesEmb,
    totalEmp,
    disponivel,
    maxAbater,
    vSafe,
    liquido,
  };
}

const PAGAMENTO_MEEIROS_PAGE_SIZE = 15;

/** Retorna a data de hoje no fuso local em YYYY-MM-DD (evita deslocamento de 1 dia do toISOString/UTC). */
function getDataHojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPrimeiroDiaMesLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Total colhido nos lançamentos ativos (soma das quantidades dos itens). */
function formatQuantidadeColhida(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

/** Exibe percentual colhido (valor já formatado pelo backend, ex.: "80%"). */
function formatPercentualColhido(v: string | null | undefined): string {
  if (v == null || v === '') return '0%';
  return v;
}

function formatDataIsoPt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return String(iso);
}

type PagamentoMeeirosFiltros = {
  dataInicial: string;
  dataFinal: string;
  produtorId: number | '';
  meeiroId: number | '';
  rocaIds: number[];
};

function createDefaultPagamentoMeeirosFiltros(): PagamentoMeeirosFiltros {
  return {
    // Sem datas por padrão: evita esconder meeiros com lançamentos fora do mês corrente.
    dataInicial: '',
    dataFinal: '',
    produtorId: '',
    meeiroId: '',
    rocaIds: [],
  };
}

const UNIDADES = ['KG', 'SC', 'ARROBA', 'UN', 'LT', 'CX'] as const;

function labelCampoMeeiroPendente(c: CampoCadastroMeeiroPendente): string {
  const m: Record<CampoCadastroMeeiroPendente, string> = {
    cpf: 'CPF',
    telefone: 'Telefone',
    chavePix: 'Chave PIX',
    endereco: 'Endereço',
  };
  return m[c];
}

export default function ControleRoca() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [dashboardMes, setDashboardMes] = useState('all');
  /** Filtro do dashboard por roça (vazio = todas). */
  const [dashboardRocaId, setDashboardRocaId] = useState<number | ''>('');

  // Busca e painéis de filtro (layout igual ao de Lançamentos)
  const [searchProdutor, setSearchProdutor] = useState('');
  const [searchRoca, setSearchRoca] = useState('');
  const [searchMeeiro, setSearchMeeiro] = useState('');
  const [searchProdutoCatalogo, setSearchProdutoCatalogo] = useState('');
  const [filtrosProdutorOpen, setFiltrosProdutorOpen] = useState(false);
  const [filtrosRocaOpen, setFiltrosRocaOpen] = useState(false);
  const [filtrosMeeiroOpen, setFiltrosMeeiroOpen] = useState(false);

  // Produtores
  const { data: produtores = [], isLoading: loadingProdutores } = useQuery({
    queryKey: ['controle-roca', 'produtores'],
    queryFn: () => controleRocaService.listarProdutores(),
  });
  const [openProdutor, setOpenProdutor] = useState(false);
  const [tipoPessoaProdutor, setTipoPessoaProdutor] = useState<
    'PESSOA_FISICA' | 'PESSOA_JURIDICA'
  >('PESSOA_FISICA');
  const [formProdutor, setFormProdutor] = useState<CreateProdutorRocaDto>({
    codigo: '',
    nome_razao: '',
    cpf_cnpj: '',
    telefone: '',
    whatsapp: '',
    endereco: '',
    inscricao_estadual: '',
  });
  const createProdutor = useMutation({
    mutationFn: (data: CreateProdutorRocaDto) =>
      controleRocaService.criarProdutor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Produtor cadastrado com sucesso');
      setOpenProdutor(false);
      setTipoPessoaProdutor('PESSOA_FISICA');
      setFormProdutor({
        codigo: '',
        nome_razao: '',
        cpf_cnpj: '',
        telefone: '',
        whatsapp: '',
        endereco: '',
        inscricao_estadual: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao cadastrar produtor');
    },
  });

  const [detailProdutor, setDetailProdutor] = useState<ProdutorRoca | null>(null);
  const [openDetailProdutor, setOpenDetailProdutor] = useState(false);
  const [editProdutor, setEditProdutor] = useState<ProdutorRoca | null>(null);
  const [openEditProdutor, setOpenEditProdutor] = useState(false);
  const [tipoPessoaEdit, setTipoPessoaEdit] = useState<
    'PESSOA_FISICA' | 'PESSOA_JURIDICA'
  >('PESSOA_FISICA');
  const [formEditProdutor, setFormEditProdutor] = useState<
    UpdateProdutorRocaDto & { nome_razao: string }
  >({
    codigo: '',
    nome_razao: '',
    cpf_cnpj: '',
    telefone: '',
    whatsapp: '',
    endereco: '',
    inscricao_estadual: '',
  });

  const updateProdutor = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProdutorRocaDto }) =>
      controleRocaService.atualizarProdutor(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Produtor atualizado com sucesso');
      setOpenEditProdutor(false);
      setEditProdutor(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao atualizar produtor');
    },
  });

  const filteredProdutores = useMemo(() => {
    const s = searchProdutor.trim().toLowerCase();
    if (!s) return produtores;
    return produtores.filter(
      (p) =>
        (p.nome_razao ?? '').toLowerCase().includes(s) ||
        (p.codigo ?? '').toLowerCase().includes(s) ||
        (p.cpf_cnpj ?? '').replace(/\D/g, '').includes(s.replace(/\D/g, ''))
    );
  }, [produtores, searchProdutor]);

  // Roças
  const [produtorIdRocas, setProdutorIdRocas] = useState<number | ''>('');
  const [filtroRocaProdutorSearch, setFiltroRocaProdutorSearch] = useState('');
  const [filtroRocaProdutorOpen, setFiltroRocaProdutorOpen] = useState(false);
  const [incluirRocasInativas, setIncluirRocasInativas] = useState(false);
  const { data: rocas = [], isLoading: loadingRocas } = useQuery({
    queryKey: ['controle-roca', 'rocas', produtorIdRocas, incluirRocasInativas],
    queryFn: () =>
      controleRocaService.listarRocas(
        produtorIdRocas === '' ? undefined : Number(produtorIdRocas),
        incluirRocasInativas,
      ),
  });
  const [openRoca, setOpenRoca] = useState(false);
  const [formRoca, setFormRoca] = useState<CreateRocaDto>({
    codigo: '',
    nome: '',
    localizacao: '',
    produtorId: 0,
    quantidadeMudasPlantadas: undefined,
    dataPlantio: undefined,
    dataInicioColheita: undefined,
    ...ROCA_ENDERECO_CONTATO_VAZIO,
  });
  const createRoca = useMutation({
    mutationFn: (data: CreateRocaDto) => controleRocaService.criarRoca(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Roça cadastrada com sucesso');
      setOpenRoca(false);
      setFormRoca({
        codigo: '',
        nome: '',
        localizacao: '',
        produtorId: 0,
        quantidadeMudasPlantadas: undefined,
        dataPlantio: undefined,
        dataInicioColheita: undefined,
        ...ROCA_ENDERECO_CONTATO_VAZIO,
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao cadastrar roça');
    },
  });

  const [detailRocaId, setDetailRocaId] = useState<number | null>(null);
  const [openDetailRoca, setOpenDetailRoca] = useState(false);
  const { data: detailRoca, isLoading: loadingDetailRoca } = useQuery({
    queryKey: ['controle-roca', 'roca', detailRocaId],
    queryFn: () => controleRocaService.obterRoca(detailRocaId!),
    enabled: openDetailRoca && detailRocaId != null,
  });

  const [editRoca, setEditRoca] = useState<RocaDetalhes | null>(null);
  const [openEditRoca, setOpenEditRoca] = useState(false);
  const [formEditRoca, setFormEditRoca] = useState<
    UpdateRocaDto & {
      nome: string;
      quantidadeMudasPlantadas?: number | null;
      dataPlantio?: string | null;
      dataInicioColheita?: string | null;
    }
  >({
    codigo: '',
    nome: '',
    localizacao: '',
    produtorId: 0,
    ativo: true,
    quantidadeMudasPlantadas: null,
    dataPlantio: null,
    dataInicioColheita: null,
    ...ROCA_ENDERECO_CONTATO_VAZIO,
  });

  const updateRoca = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRocaDto }) =>
      controleRocaService.atualizarRoca(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Roça atualizada com sucesso');
      setOpenEditRoca(false);
      setEditRoca(null);
      setOpenDeleteRoca(false);
      setRocaToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao atualizar roça');
    },
  });

  const deleteRoca = useMutation({
    mutationFn: (id: number) => controleRocaService.excluirRoca(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Roça excluída com sucesso');
      setOpenDetailRoca(false);
      setDetailRocaId(null);
      setRocaToDelete(null);
      setOpenDeleteRoca(false);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível excluir a roça. Verifique se não há lançamentos vinculados.';
      toast.error(msg);
    },
  });

  const [rocaToDelete, setRocaToDelete] = useState<Roca | null>(null);
  const [openDeleteRoca, setOpenDeleteRoca] = useState(false);

  const filteredRocas = useMemo(() => {
    const s = searchRoca.trim().toLowerCase();
    let list = rocas;
    if (s) {
      list = rocas.filter((r) => {
        const prod = produtores.find((p) => p.id === r.produtorId);
        const prodNome = (prod?.nome_razao ?? '').toLowerCase();
        const prodCodigo = (prod?.codigo ?? '').toLowerCase();
        return (
          (r.nome ?? '').toLowerCase().includes(s) ||
          (r.codigo ?? '').toLowerCase().includes(s) ||
          (r.localizacao ?? '').toLowerCase().includes(s) ||
          prodNome.includes(s) ||
          prodCodigo.includes(s)
        );
      });
    }
    return [...list].sort(compareRocaPorCodigo);
  }, [rocas, produtores, searchRoca]);

  // Meeiros
  const [produtorIdMeeiros, setProdutorIdMeeiros] = useState<number | ''>('');
  const [rocaIdMeeiros, setRocaIdMeeiros] = useState<number | ''>('');
  const [apenasComEmprestimosMeeiros, setApenasComEmprestimosMeeiros] = useState(false);
  const [filtroMeeiroProdutorSearch, setFiltroMeeiroProdutorSearch] = useState('');
  const [filtroMeeiroProdutorOpen, setFiltroMeeiroProdutorOpen] = useState(false);
  const [filtroMeeiroRocaSearch, setFiltroMeeiroRocaSearch] = useState('');
  const [filtroMeeiroRocaOpen, setFiltroMeeiroRocaOpen] = useState(false);
  const [filtroMeeiroId, setFiltroMeeiroId] = useState<number | ''>('');
  const [filtroMeeiroItemSearch, setFiltroMeeiroItemSearch] = useState('');
  const [filtroMeeiroItemOpen, setFiltroMeeiroItemOpen] = useState(false);
  const [meeiroIncompletoDialogOpen, setMeeiroIncompletoDialogOpen] = useState(false);
  const { data: meeiroFiltroRocas = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas', 'meeiros-tab-filtro', produtorIdMeeiros],
    queryFn: () =>
      controleRocaService.listarRocas(produtorIdMeeiros === '' ? undefined : Number(produtorIdMeeiros)),
    enabled: tab === 'meeiros',
  });
  const rocasFiltroMeeiroOrdenadas = useMemo(() => {
    const term = filtroMeeiroRocaSearch.trim().toLowerCase();
    const sorted = [...meeiroFiltroRocas].sort(compareRocaPorCodigo);
    if (!term) return sorted;
    return sorted.filter(
      (r) =>
        (r.nome ?? '').toLowerCase().includes(term) || (r.codigo ?? '').toLowerCase().includes(term),
    );
  }, [meeiroFiltroRocas, filtroMeeiroRocaSearch]);
  const meeirosFiltrosAtivosCount = useMemo(() => {
    let n = 0;
    if (produtorIdMeeiros !== '') n++;
    if (rocaIdMeeiros !== '') n++;
    if (filtroMeeiroId !== '') n++;
    if (apenasComEmprestimosMeeiros) n++;
    return n;
  }, [produtorIdMeeiros, rocaIdMeeiros, filtroMeeiroId, apenasComEmprestimosMeeiros]);
  const { data: meeiros = [], isLoading: loadingMeeiros } = useQuery({
    queryKey: ['controle-roca', 'meeiros', produtorIdMeeiros, rocaIdMeeiros, apenasComEmprestimosMeeiros],
    queryFn: () =>
      controleRocaService.listarMeeiros(
        produtorIdMeeiros === '' ? undefined : Number(produtorIdMeeiros),
        {
          comEmprestimos: apenasComEmprestimosMeeiros,
          rocaId: rocaIdMeeiros === '' ? undefined : Number(rocaIdMeeiros),
        },
      ),
  });
  const meeirosFiltroPainelOrdenados = useMemo(() => {
    const term = filtroMeeiroItemSearch.trim().toLowerCase();
    const sorted = [...meeiros].sort((a, b) =>
      (a.nome ?? a.codigo ?? '').localeCompare(b.nome ?? b.codigo ?? '', 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter(
      (m) =>
        (m.nome ?? '').toLowerCase().includes(term) ||
        (m.nomeFantasia ?? '').toLowerCase().includes(term) ||
        (m.codigo ?? '').toLowerCase().includes(term)
    );
  }, [meeiros, filtroMeeiroItemSearch]);
  const { data: meeirosCadastroIncompleto, isLoading: loadingMeeirosIncompleto } = useQuery({
    queryKey: ['controle-roca', 'meeiros-cadastro-incompleto'],
    queryFn: () => controleRocaService.relatorioMeeirosCadastroIncompleto(),
    enabled: tab === 'meeiros' && meeiroIncompletoDialogOpen,
  });
  /** Lista de meeiros para métricas do dashboard (independe dos filtros da aba Meeiros). */
  const { data: meeirosDashboard = [] } = useQuery({
    queryKey: ['controle-roca', 'meeiros', 'dashboard', dashboardRocaId],
    queryFn: () =>
      dashboardRocaId === ''
        ? controleRocaService.listarMeeiros()
        : controleRocaService.listarMeeiros(undefined, { rocaId: Number(dashboardRocaId) }),
    enabled: tab === 'dashboard',
  });
  const produtoresFiltroRocaOrdenados = useMemo(() => {
    const term = filtroRocaProdutorSearch.trim().toLowerCase();
    const sorted = [...produtores].sort((a, b) =>
      (a.nome_razao ?? a.codigo ?? '').localeCompare(b.nome_razao ?? b.codigo ?? '', 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter(
      (p) =>
        (p.nome_razao ?? '').toLowerCase().includes(term) ||
        (p.codigo ?? '').toLowerCase().includes(term)
    );
  }, [produtores, filtroRocaProdutorSearch]);
  const produtoresFiltroMeeiroOrdenados = useMemo(() => {
    const term = filtroMeeiroProdutorSearch.trim().toLowerCase();
    const sorted = [...produtores].sort((a, b) =>
      (a.nome_razao ?? a.codigo ?? '').localeCompare(b.nome_razao ?? b.codigo ?? '', 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter(
      (p) =>
        (p.nome_razao ?? '').toLowerCase().includes(term) ||
        (p.codigo ?? '').toLowerCase().includes(term)
    );
  }, [produtores, filtroMeeiroProdutorSearch]);
  const meeirosOrdenados = useMemo(() => {
    const sorted = [...meeiros].sort((a, b) =>
      (a.nome ?? a.codigo ?? '').localeCompare(b.nome ?? b.codigo ?? '', 'pt-BR', { sensitivity: 'base' })
    );
    const filtradosPorMeeiro =
      filtroMeeiroId === ''
        ? sorted
        : sorted.filter((m) => Number(m.id) === Number(filtroMeeiroId));
    const term = searchMeeiro.trim().toLowerCase();
    if (!term) return filtradosPorMeeiro;
    return filtradosPorMeeiro.filter(
      (m) =>
        (m.nome ?? '').toLowerCase().includes(term) ||
        (m.nomeFantasia ?? '').toLowerCase().includes(term) ||
        (m.codigo ?? '').toLowerCase().includes(term)
    );
  }, [meeiros, searchMeeiro, filtroMeeiroId]);
  const [openMeeiro, setOpenMeeiro] = useState(false);
  const [formMeeiro, setFormMeeiro] = useState<CreateMeeiroRocaDto>({
    codigo: '',
    nome: '',
    nomeFantasia: '',
    cpf: '',
    telefone: '',
    pixChave: '',
    endereco: '',
    quantidadeMudasPlantadas: undefined,
    porcentagem_padrao: 40,
    valor_de_emba_padrao: VALOR_DE_EMBA_PADRAO,
    produtorId: 0,
  });
  const createMeeiro = useMutation({
    mutationFn: (data: CreateMeeiroRocaDto) =>
      controleRocaService.criarMeeiro(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Meeiro cadastrado com sucesso');
      setOpenMeeiro(false);
      setFormMeeiro({
        codigo: '',
        nome: '',
        nomeFantasia: '',
        cpf: '',
        telefone: '',
        pixChave: '',
        endereco: '',
        quantidadeMudasPlantadas: undefined,
        porcentagem_padrao: 40,
        valor_de_emba_padrao: VALOR_DE_EMBA_PADRAO,
        produtorId: 0,
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao cadastrar meeiro');
    },
  });
  const [detailMeeiroId, setDetailMeeiroId] = useState<number | null>(null);
  const { data: detailMeeiro = null, isLoading: loadingDetailMeeiro } = useQuery({
    queryKey: ['controle-roca', 'meeiro-detail', detailMeeiroId],
    queryFn: () => controleRocaService.obterMeeiro(detailMeeiroId!),
    enabled: !!detailMeeiroId,
  });
  const [openDetailMeeiro, setOpenDetailMeeiro] = useState(false);
  const [editMeeiro, setEditMeeiro] = useState<MeeiroRoca | null>(null);
  const [openEditMeeiro, setOpenEditMeeiro] = useState(false);
  const [formEditMeeiro, setFormEditMeeiro] = useState<
    UpdateMeeiroRocaDto & {
      nome: string;
      produtorId: number;
      porcentagem_padrao: number;
      valor_de_emba_padrao: number;
      pixChave?: string;
      quantidadeMudasPlantadas?: number | null;
    }
  >({
    codigo: '',
    nome: '',
    nomeFantasia: '',
    cpf: '',
    telefone: '',
    pixChave: '',
    endereco: '',
    quantidadeMudasPlantadas: null,
    porcentagem_padrao: 40,
    valor_de_emba_padrao: VALOR_DE_EMBA_PADRAO,
    produtorId: 0,
  });
  const [openEmprestimo, setOpenEmprestimo] = useState(false);
  const [meeiroEmprestimo, setMeeiroEmprestimo] = useState<MeeiroRoca | null>(null);
  const [formEmprestimo, setFormEmprestimo] = useState({ meeiroId: 0, valor: 0, data: '', observacao: '' });
  const [openEditEmprestimo, setOpenEditEmprestimo] = useState(false);
  const [emprestimoEditando, setEmprestimoEditando] = useState<{ id: number; valor: number } | null>(null);
  const [formEditEmprestimo, setFormEditEmprestimo] = useState<{ valor: number }>({ valor: 0 });
  const createEmprestimo = useMutation({
    mutationFn: (data: { meeiroId: number; valor: number; data: string; observacao?: string }) =>
      controleRocaService.criarEmprestimo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Empréstimo registrado');
      setOpenEmprestimo(false);
      setMeeiroEmprestimo(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao registrar empréstimo');
    },
  });
  const liquidarEmprestimo = useMutation({
    mutationFn: (id: number) =>
      controleRocaService.atualizarStatusEmprestimo(id, { status: 'LIQUIDADO' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca', 'meeiro-detail', detailMeeiroId] });
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Empréstimo marcado como quitado');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erro ao atualizar');
    },
  });
  const updateEmprestimo = useMutation({
    mutationFn: ({ id, valor }: { id: number; valor: number }) =>
      controleRocaService.atualizarEmprestimo(id, { valor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca', 'meeiro-detail', detailMeeiroId] });
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Valor do empréstimo atualizado');
      setOpenEditEmprestimo(false);
      setEmprestimoEditando(null);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erro ao atualizar empréstimo');
    },
  });
  const deleteEmprestimo = useMutation({
    mutationFn: (id: number) => controleRocaService.excluirEmprestimo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca', 'meeiro-detail', detailMeeiroId] });
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Empréstimo excluído com sucesso');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erro ao excluir empréstimo');
    },
  });
  const updateMeeiro = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMeeiroRocaDto }) =>
      controleRocaService.atualizarMeeiro(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Meeiro atualizado com sucesso');
      setOpenEditMeeiro(false);
      setEditMeeiro(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao atualizar meeiro');
    },
  });
  const deleteMeeiro = useMutation({
    mutationFn: (id: number) => controleRocaService.excluirMeeiro(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Meeiro excluído com sucesso');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao excluir meeiro. Verifique se não há lançamentos vinculados.',
      );
    },
  });
  // Catálogo unificado de produtos (todos do sistema, incluindo os do Controle de Roça)
  const { data: produtosCatalogo = [], isLoading: loadingProdutosCatalogo } = useQuery({
    queryKey: ['controle-roca', 'produtos-catalogo'],
    queryFn: async () => {
      const resp = await produtosService.listar({ page: 1, limit: 500, statusProduto: 'ATIVO' });
      return resp.data ?? resp.produtos ?? [];
    },
  });
  const [catalogPage, setCatalogPage] = useState(1);
  const CATALOG_PAGE_SIZE = 10;
  const LANC_PAGE_SIZE = 15;
  const [lancPage, setLancPage] = useState(1);
  const produtosCatalogoFiltrados = useMemo(() => {
    const s = searchProdutoCatalogo.trim().toLowerCase();
    if (!s) return produtosCatalogo;
    return produtosCatalogo.filter(
      (p) =>
        (p.nome ?? '').toLowerCase().includes(s) ||
        (p.sku ?? '').toLowerCase().includes(s)
    );
  }, [produtosCatalogo, searchProdutoCatalogo]);
  const produtosParaFiltroLancamento = useMemo(() => {
    if (!Array.isArray(produtosCatalogo)) return [];
    return produtosCatalogo
      .filter((p: any) => (p?.nome ?? '').trim() !== '')
      .sort((a: any, b: any) =>
        String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR')
      );
  }, [produtosCatalogo]);
  const totalCatalogPages =
    produtosCatalogoFiltrados.length > 0
      ? Math.ceil(produtosCatalogoFiltrados.length / CATALOG_PAGE_SIZE)
      : 1;
  const produtosCatalogoPagina = produtosCatalogoFiltrados.slice(
    (catalogPage - 1) * CATALOG_PAGE_SIZE,
    catalogPage * CATALOG_PAGE_SIZE,
  );

  useEffect(() => {
    setCatalogPage(1);
  }, [searchProdutoCatalogo]);
  const [openProduto, setOpenProduto] = useState(false);
  const [formProduto, setFormProduto] = useState<{
    codigo: string;
    nome: string;
    unidade_medida: string;
    produtorId: number | '';
  }>({
    codigo: '',
    nome: '',
    unidade_medida: 'KG',
    produtorId: '',
  });
  const createProduto = useMutation({
    mutationFn: async (data: { codigo?: string; nome: string; unidade_medida?: string; produtorId: number | '' }) => {
      const temProdutor = data.produtorId !== '' && data.produtorId !== undefined && Number(data.produtorId) > 0;
      if (temProdutor) {
        return controleRocaService.criarProdutoRoca({
          nome: data.nome,
          codigo: data.codigo?.trim() || undefined,
          unidade_medida: (data.unidade_medida as 'KG' | 'UN' | 'LT' | 'CX' | 'SC' | 'ARROBA') || 'KG',
          produtorId: Number(data.produtorId),
        });
      }
      const unidadeCatalogo = ['UN', 'KG', 'LT', 'CX'].includes(data.unidade_medida ?? '')
        ? (data.unidade_medida as 'UN' | 'KG' | 'LT' | 'CX')
        : 'UN';
      return produtosService.criar({
        nome: data.nome.trim(),
        unidade_medida: unidadeCatalogo,
        preco_custo: 0,
        preco_venda: 0,
        estoque_atual: 0,
        estoque_minimo: 0,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      queryClient.invalidateQueries({ queryKey: ['controle-roca', 'produtos-catalogo'] });
      toast.success(
        variables.produtorId !== '' && Number(variables.produtorId) > 0
          ? 'Produto cadastrado com sucesso'
          : 'Produto cadastrado no catálogo geral (disponível para qualquer produtor)'
      );
      setOpenProduto(false);
      setFormProduto({
        codigo: '',
        nome: '',
        unidade_medida: 'KG',
        produtorId: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao cadastrar produto');
    },
  });

  // Lançamentos
  const [produtorIdLanc, setProdutorIdLanc] = useState<number | ''>('');
  const [produtorLancPopoverOpen, setProdutorLancPopoverOpen] = useState(false);
  const [produtorLancSearchTerm, setProdutorLancSearchTerm] = useState('');
  const [searchLancamento, setSearchLancamento] = useState('');
  const [filtrosLancamentoOpen, setFiltrosLancamentoOpen] = useState(false);
  const [filtrosLancamento, setFiltrosLancamento] = useState<{
    produtorId: number | '';
    rocaId: number | '';
    meeiroId: number | '';
    produto: string;
    dataInicio: string;
    dataFim: string;
  }>({ produtorId: '', rocaId: '', meeiroId: '', produto: '', dataInicio: '', dataFim: '' });
  const [filtroProdutorSearch, setFiltroProdutorSearch] = useState('');
  const [filtroProdutoSearch, setFiltroProdutoSearch] = useState('');
  const [filtroRocaSearch, setFiltroRocaSearch] = useState('');
  const [filtroMeeiroSearch, setFiltroMeeiroSearch] = useState('');
  const [filtroProdutorOpen, setFiltroProdutorOpen] = useState(false);
  const [filtroProdutoOpen, setFiltroProdutoOpen] = useState(false);
  const [filtroRocaOpen, setFiltroRocaOpen] = useState(false);
  const [filtroMeeiroOpen, setFiltroMeeiroOpen] = useState(false);
  const { data: rocasParaLancamento = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas', produtorIdLanc],
    queryFn: () =>
      controleRocaService.listarRocas(
        produtorIdLanc === '' ? undefined : Number(produtorIdLanc)
      ),
  });
  /** Todas as roças para o dropdown do filtro de lançamentos (sempre todas, sem filtrar por produtor) */
  const { data: rocasParaFiltroLancamento = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas-filtro'],
    queryFn: () => controleRocaService.listarRocas(undefined),
  });
  const { data: meeirosParaRelatorio = [] } = useQuery({
    queryKey: ['controle-roca', 'meeiros'],
    queryFn: () => controleRocaService.listarMeeiros(),
  });
  const { data: rocasParaRelatorioPdf = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas-all'],
    queryFn: () => controleRocaService.listarRocas(),
    enabled: tab === 'relatorio',
  });
  const { data: lancamentosResponse, isLoading: loadingLancamentos } = useQuery({
    queryKey: [
      'controle-roca',
      'lancamentos',
      filtrosLancamento.produtorId,
      filtrosLancamento.rocaId,
      filtrosLancamento.meeiroId,
      filtrosLancamento.dataInicio,
      filtrosLancamento.dataFim,
    ],
    queryFn: () =>
      controleRocaService.listarLancamentosTodos({
        ...(filtrosLancamento.produtorId !== ''
          ? { produtorId: Number(filtrosLancamento.produtorId) }
          : {}),
        ...(filtrosLancamento.rocaId !== ''
          ? { rocaId: Number(filtrosLancamento.rocaId) }
          : {}),
        ...(filtrosLancamento.meeiroId !== ''
          ? { meeiroId: Number(filtrosLancamento.meeiroId) }
          : {}),
        ...(filtrosLancamento.dataInicio !== ''
          ? { dataInicial: filtrosLancamento.dataInicio }
          : {}),
        ...(filtrosLancamento.dataFim !== ''
          ? { dataFinal: filtrosLancamento.dataFim }
          : {}),
      }),
  });
  /**
   * Base exclusiva do Dashboard (independente da paginação/filtros da aba Lançamentos),
   * para evitar "sumiço" de meses quando a lista de lançamentos muda.
   */
  const { data: lancamentosDashboardResponse } = useQuery({
    queryKey: ['controle-roca', 'lancamentos-dashboard', dashboardRocaId],
    queryFn: () =>
      controleRocaService.listarLancamentosTodos({
        ...(dashboardRocaId !== '' ? { rocaId: Number(dashboardRocaId) } : {}),
      }),
    enabled: tab === 'dashboard',
  });
  const lancamentos = lancamentosResponse?.items ?? [];
  const lancamentosDashboardTodos = lancamentosDashboardResponse?.items ?? [];
  const [detalheLancamentoId, setDetalheLancamentoId] = useState<number | null>(null);
  const { data: detalheLancamento } = useQuery({
    queryKey: ['controle-roca', 'lancamento', detalheLancamentoId],
    queryFn: () =>
      detalheLancamentoId != null
        ? controleRocaService.obterLancamento(detalheLancamentoId)
        : Promise.resolve(null),
    enabled: detalheLancamentoId != null,
  });
  const updateLancamento = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: import('@/types/roca').UpdateLancamentoProducaoRocaDto;
    }) => controleRocaService.atualizarLancamento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Lançamento atualizado');
      setEditLancamentoId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao atualizar');
    },
  });
  const deleteLancamento = useMutation({
    mutationFn: (id: number) => controleRocaService.excluirLancamento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Lançamento excluído');
      setLancamentoParaExcluirId(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao excluir lançamento.'
      );
    },
  });
  const [lancamentoParaExcluirId, setLancamentoParaExcluirId] = useState<number | null>(null);
  // Seleção múltipla e reajuste em massa
  const [lancamentosSelecionados, setLancamentosSelecionados] = useState<Set<number>>(new Set());
  const [openReajuste, setOpenReajuste] = useState(false);
  const [novoValorReajuste, setNovoValorReajuste] = useState('');
  const reajustarValor = useMutation({
    mutationFn: (data: { idsLancamentos: number[]; novoValorUnitario: number }) =>
      controleRocaService.reajustarValorLancamentos(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success(`Reajuste aplicado com sucesso! ${res.lancamentosAtualizados?.length ?? 0} lançamento(s) atualizado(s).`);
      setOpenReajuste(false);
      setNovoValorReajuste('');
      setLancamentosSelecionados(new Set());
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao reajustar valores');
    },
  });
  const toggleSelecionarLancamento = (id: number) => {
    setLancamentosSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const [editLancamentoId, setEditLancamentoId] = useState<number | null>(null);
  const { data: editLancamento } = useQuery({
    queryKey: ['controle-roca', 'lancamento-edit', editLancamentoId],
    queryFn: () =>
      editLancamentoId != null
        ? controleRocaService.obterLancamento(editLancamentoId)
        : Promise.resolve(null),
    enabled: editLancamentoId != null,
  });
  const { data: rocasParaEdit = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas', editLancamento?.produtorId],
    queryFn: () =>
      controleRocaService.listarRocas(
        editLancamento!.produtorId,
        true
      ),
    enabled: !!editLancamento?.produtorId,
  });
  const { data: meeirosParaEdit = [] } = useQuery({
    queryKey: ['controle-roca', 'meeiros-edit', editLancamento?.produtorId],
    queryFn: () =>
      controleRocaService.listarMeeiros(editLancamento!.produtorId),
    enabled: !!editLancamento?.produtorId,
  });
  const { data: produtosParaEdit = [] } = useQuery({
    queryKey: ['controle-roca', 'produtos-edit', editLancamento?.produtorId],
    queryFn: () =>
      controleRocaService.listarProdutosRoca(editLancamento!.produtorId),
    enabled: !!editLancamento?.produtorId,
  });
  const produtosDisponiveisEdit =
    produtosParaEdit.length > 0 ? produtosParaEdit : produtosCatalogo;
  const [editLancData, setEditLancData] = useState('');
  const [editLancRocaId, setEditLancRocaId] = useState<number | ''>('');
  const [editLancMeeiros, setEditLancMeeiros] = useState<
    { meeiroId: number; porcentagem?: number; nome?: string }[]
  >([]);
  const [editLancMeeiroSelecionado, setEditLancMeeiroSelecionado] = useState('');
  const [editLancProdutos, setEditLancProdutos] = useState<
    {
      produtoId: number;
      quantidade: number;
      preco_unitario: number;
      nome?: string;
      meeiros: {
        meeiroId: number;
        nome?: string;
        porcentagem: number;
        valor_de_emba: number;
      }[];
    }[]
  >([]);
  useEffect(() => {
    if (!editLancamento || editLancamentoId == null) return;
    const dataStr =
      typeof editLancamento.data === 'string'
        ? editLancamento.data
        : (editLancamento.data as string).slice(0, 10);
    setEditLancData(dataStr);
    setEditLancRocaId(editLancamento.rocaId);
    const itens = editLancamento.itens ?? [];
    const meeirosUnicos = itens.flatMap((item) => item.meeiros ?? []);
    const seen = new Set<number>();
    const listaMeeiros = meeirosUnicos.filter((m) => {
      if (seen.has(m.meeiroId)) return false;
      seen.add(m.meeiroId);
      return true;
    });
    setEditLancMeeiros(
      listaMeeiros.map((m) => ({
        meeiroId: m.meeiroId,
        porcentagem: m.porcentagem,
        nome: m.meeiroNome,
      }))
    );
    setEditLancProdutos(
      itens.map((item) => ({
        produtoId: item.produtoId ?? 0,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario ?? 0,
        nome: item.produto,
        meeiros: (item.meeiros ?? []).map((m) => ({
          meeiroId: m.meeiroId,
          nome: m.meeiroNome,
          porcentagem: m.porcentagem,
          valor_de_emba: Number(
            m.valor_de_emba ??
              m.valorDeEmba ??
              VALOR_DE_EMBA_PADRAO,
          ),
        })),
      }))
    );
  }, [editLancamento, editLancamentoId]);
  const [openLancamento, setOpenLancamento] = useState(false);
  const [relatorioEstoqueDataInicio, setRelatorioEstoqueDataInicio] = useState(() => getDataHojeLocal());
  const [relatorioEstoqueDataFim, setRelatorioEstoqueDataFim] = useState(() => getDataHojeLocal());
  const [relatorioEstoqueRocaId, setRelatorioEstoqueRocaId] = useState<number | ''>('');
  const [relatorioSheetProdutorId, setRelatorioSheetProdutorId] = useState<number | ''>('');
  const [relatorioSheetProdutoId, setRelatorioSheetProdutoId] = useState<number | ''>('');
  const [relatorioEstoqueLoading, setRelatorioEstoqueLoading] = useState<'download' | 'print' | null>(null);
  const [relatorioProdutoOrigemLoading, setRelatorioProdutoOrigemLoading] = useState<'download' | 'print' | null>(
    null
  );
  const [relatorioColheitaMeeiroLoading, setRelatorioColheitaMeeiroLoading] = useState<
    'download' | 'print' | null
  >(null);
  const [relColheitaMeeiroId, setRelColheitaMeeiroId] = useState<number | ''>('');
  /** Painel com todos os relatórios voltados a lançamentos (produtos e meeiros). */
  const [relLancamentosSheetOpen, setRelLancamentosSheetOpen] = useState(false);
  const { data: rocasRelatorioFiltros = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas', 'relatorios-lancamento', relatorioSheetProdutorId],
    queryFn: () =>
      controleRocaService.listarRocas(
        relatorioSheetProdutorId === '' ? undefined : Number(relatorioSheetProdutorId),
      ),
  });
  /** Produtos do filtro: pelo produtor escolhido ou, se só houver roça, pelo produtor daquela roça. */
  const produtorIdCatalogoRelatorioLancamento = useMemo(() => {
    if (relatorioSheetProdutorId !== '') return Number(relatorioSheetProdutorId);
    if (relatorioEstoqueRocaId === '') return undefined;
    const roca = rocasRelatorioFiltros.find((r) => r.id === Number(relatorioEstoqueRocaId));
    return roca?.produtorId;
  }, [relatorioSheetProdutorId, relatorioEstoqueRocaId, rocasRelatorioFiltros]);
  const { data: produtosRelatorioFiltros = [] } = useQuery({
    queryKey: ['controle-roca', 'produtos', 'relatorios-lancamento', produtorIdCatalogoRelatorioLancamento],
    queryFn: () =>
      controleRocaService.listarProdutosRoca(
        produtorIdCatalogoRelatorioLancamento === undefined ? undefined : produtorIdCatalogoRelatorioLancamento,
      ),
  });
  const produtosRelatorioFiltrosOrdenados = useMemo(
    () =>
      [...produtosRelatorioFiltros].sort((a, b) =>
        (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base' }),
      ),
    [produtosRelatorioFiltros],
  );
  const meeirosColheitaRelatorio = useMemo(() => {
    let list = [...meeirosParaRelatorio];
    if (relatorioSheetProdutorId !== '') {
      list = list.filter(
        (m) => Number(m.produtorId) === Number(relatorioSheetProdutorId),
      );
    }
    return list.sort((a, b) =>
      (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base' }),
    );
  }, [meeirosParaRelatorio, relatorioSheetProdutorId]);
  useEffect(() => {
    if (relColheitaMeeiroId === '') return;
    const m = meeirosParaRelatorio.find((x) => Number(x.id) === Number(relColheitaMeeiroId));
    if (
      relatorioSheetProdutorId !== '' &&
      m != null &&
      Number(m.produtorId) !== Number(relatorioSheetProdutorId)
    ) {
      setRelColheitaMeeiroId('');
    }
  }, [relatorioSheetProdutorId, relColheitaMeeiroId, meeirosParaRelatorio]);
  const [produtoPreselecionadoLancamento, setProdutoPreselecionadoLancamento] = useState<{
    id: number;
    nome: string;
  } | null>(null);
  const [lancData, setLancData] = useState('');
  const [lancRocaId, setLancRocaId] = useState<number | ''>('');
  const [lancMeeiros, setLancMeeiros] = useState<
    {
      meeiroId: number;
      nome?: string;
      porcentagem_padrao: number;
      valor_de_emba_padrao: number;
    }[]
  >([]);
  const [lancMeeiroSelecionado, setLancMeeiroSelecionado] = useState('');
  const [lancMeeiroPopoverOpen, setLancMeeiroPopoverOpen] = useState(false);
  const [lancMeeiroSearchTerm, setLancMeeiroSearchTerm] = useState('');
  const [lancProdutos, setLancProdutos] = useState<
    {
      produtoId: number;
      quantidade: number;
      preco_unitario: number;
      nome?: string;
      meeiros: {
        meeiroId: number;
        nome?: string;
        porcentagem: number;
        valor_de_emba: number;
      }[];
    }[]
  >([]);
  // Lista unificada: todos os produtos do sistema (roça + módulo Produtos) para usar no lançamento
  const produtosDisponiveisLancamento = produtosCatalogo;

  // Sempre que o modal de novo lançamento abrir, preencher a data com hoje (onOpenChange nem sempre é chamado ao abrir por código)
  useEffect(() => {
    if (openLancamento) {
      setLancData(new Date().toISOString().slice(0, 10));
    }
  }, [openLancamento]);

  // Produto pré-selecionado é passado ao AddProdutoLanc para preencher o Select; o pai limpa quando o filho avisa que consumiu
  const { data: meeirosParaLancamento = [] } = useQuery({
    queryKey: ['controle-roca', 'meeiros', produtorIdLanc],
    queryFn: () =>
      controleRocaService.listarMeeiros(
        produtorIdLanc === '' ? undefined : Number(produtorIdLanc)
      ),
  });
  const meeirosLancamentoOrdenadosEFiltrados = useMemo(() => {
    const term = lancMeeiroSearchTerm.trim().toLowerCase();
    const sorted = [...meeirosParaLancamento].sort((a, b) =>
      (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter(
      (m) =>
        (m.nome ?? '').toLowerCase().includes(term) ||
        (m.nomeFantasia ?? '').toLowerCase().includes(term) ||
        (m.codigo ?? '').toLowerCase().includes(term)
    );
  }, [meeirosParaLancamento, lancMeeiroSearchTerm]);
  const submittingLancamentoRef = useRef(false);
  const createLancamento = useMutation({
    mutationFn: (data: CreateLancamentoProducaoRocaDto) =>
      controleRocaService.criarLancamento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Lançamento registrado com sucesso');
      // Mantém o modal aberto para continuar lançando; limpa só os produtos
      setLancProdutos([]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao registrar lançamento');
    },
    onSettled: () => {
      submittingLancamentoRef.current = false;
    },
  });

  // Meeiros únicos nos lançamentos (para filtro)
  const meeirosUnicosLancamentos = useMemo(() => {
    const map = new Map<number, string>();
    lancamentos.forEach((l) => {
      (l.itens ?? []).forEach((item) => {
        (item.meeiros ?? []).forEach((m) => {
          if (!map.has(m.meeiroId)) map.set(m.meeiroId, m.meeiroNome ?? `Meeiro ${m.meeiroId}`);
        });
      });
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ meeiroId: id, nome }));
  }, [lancamentos]);

  const produtoresFiltroOrdenados = useMemo(() => {
    const term = filtroProdutorSearch.trim().toLowerCase();
    const sorted = [...produtores].sort((a, b) =>
      (a.nome_razao ?? a.codigo ?? '').localeCompare(b.nome_razao ?? b.codigo ?? '', 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter(
      (p) =>
        (p.nome_razao ?? '').toLowerCase().includes(term) ||
        (p.codigo ?? '').toLowerCase().includes(term)
    );
  }, [produtores, filtroProdutorSearch]);

  const produtoresRelatorioOrdenados = useMemo(
    () =>
      [...produtores].sort((a, b) =>
        (a.nome_razao ?? a.codigo ?? '').localeCompare(b.nome_razao ?? b.codigo ?? '', 'pt-BR', {
          sensitivity: 'base',
        }),
      ),
    [produtores],
  );

  const produtosFiltroOrdenados = useMemo(() => {
    const term = filtroProdutoSearch.trim().toLowerCase();
    const sorted = [...produtosParaFiltroLancamento].sort((a: any, b: any) =>
      String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter((p: any) => (p.nome ?? '').toLowerCase().includes(term));
  }, [produtosParaFiltroLancamento, filtroProdutoSearch]);

  const rocasFiltroOrdenadas = useMemo(() => {
    const term = filtroRocaSearch.trim().toLowerCase();
    const sorted = [...rocasParaFiltroLancamento].sort(compareRocaPorCodigo);
    if (!term) return sorted;
    return sorted.filter((r) => (r.nome ?? '').toLowerCase().includes(term));
  }, [rocasParaFiltroLancamento, filtroRocaSearch]);

  const meeirosFiltroOrdenados = useMemo(() => {
    const term = filtroMeeiroSearch.trim().toLowerCase();
    const sorted = [...meeirosUnicosLancamentos].sort((a, b) =>
      (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter((m) => (m.nome ?? '').toLowerCase().includes(term));
  }, [meeirosUnicosLancamentos, filtroMeeiroSearch]);

  /** Lista completa de meeiros para o filtro de lançamentos (permite selecionar qualquer meeiro e buscar na API) */
  const meeirosParaFiltroLancamentoOrdenados = useMemo(() => {
    const term = filtroMeeiroSearch.trim().toLowerCase();
    const list = meeirosParaRelatorio.map((m) => ({
      meeiroId: Number(m.id),
      nome: m.nome ?? '',
      codigo: m.codigo ?? '',
    }));
    const sorted = [...list].sort((a, b) =>
      (a.nome || a.codigo).localeCompare(b.nome || b.codigo, 'pt-BR', { sensitivity: 'base' })
    );
    if (!term) return sorted;
    return sorted.filter(
      (m) =>
        (m.nome ?? '').toLowerCase().includes(term) ||
        (m.codigo ?? '').toLowerCase().includes(term)
    );
  }, [meeirosParaRelatorio, filtroMeeiroSearch]);

  const [lancOrdenacao, setLancOrdenacao] = useState<'desc' | 'asc'>('desc');

  const temFiltrosLancamentoAtivos =
    filtrosLancamento.produtorId !== '' ||
    filtrosLancamento.rocaId !== '' ||
    filtrosLancamento.meeiroId !== '' ||
    filtrosLancamento.produto.trim() !== '' ||
    filtrosLancamento.dataInicio !== '' ||
    filtrosLancamento.dataFim !== '';

  const filteredLancamentos = useMemo(() => {
    let list = [...lancamentos];
    const search = searchLancamento.trim().toLowerCase();
    if (search) {
      list = list.filter((l) => {
        const roca = rocasParaLancamento.find((r) => r.id === l.rocaId);
        const rocaNome = (roca?.nome ?? l.rocaNome ?? '').toLowerCase();
        const itens = l.itens ?? [];
        const produtosStr = itens.map((i) => i.produto).join(' ').toLowerCase();
        const meeirosStr = itens
          .flatMap((i) => i.meeiros ?? [])
          .map((m) => (m.meeiroNome ?? '').toLowerCase())
          .join(' ');
        return (
          rocaNome.includes(search) ||
          produtosStr.includes(search) ||
          meeirosStr.includes(search)
        );
      });
    }
    // produtor/roça/meeiro/data já chegam filtrados do backend.
    if (filtrosLancamento.produto.trim() !== '') {
      const produtoSelecionado = filtrosLancamento.produto.trim().toLowerCase();
      list = list.filter((l) =>
        (l.itens ?? []).some(
          (item) => (item.produto ?? '').toLowerCase() === produtoSelecionado
        )
      );
    }
    if (filtrosLancamento.dataInicio !== '') {
      list = list.filter((l) => (l.data.slice(0, 10)) >= filtrosLancamento.dataInicio);
    }
    if (filtrosLancamento.dataFim !== '') {
      list = list.filter((l) => (l.data.slice(0, 10)) <= filtrosLancamento.dataFim);
    }
    // ordenação por data
    list.sort((a, b) => {
      const da = a.data?.slice(0, 10) ?? '';
      const db = b.data?.slice(0, 10) ?? '';
      if (da === db) return 0;
      if (lancOrdenacao === 'desc') {
        // mais recentes primeiro
        return da < db ? 1 : -1;
      }
      // mais antigos primeiro
      return da < db ? -1 : 1;
    });
    return list;
  }, [
    lancamentos,
    rocasParaLancamento,
    searchLancamento,
    filtrosLancamento.produto,
    filtrosLancamento.dataInicio,
    filtrosLancamento.dataFim,
    lancOrdenacao,
  ]);

  useEffect(() => {
    setLancPage(1);
  }, [
    filtrosLancamento.produtorId,
    filtrosLancamento.rocaId,
    filtrosLancamento.meeiroId,
    filtrosLancamento.dataInicio,
    filtrosLancamento.dataFim,
    searchLancamento,
    filtrosLancamento.produto,
  ]);

  const valorTotalFiltrado = useMemo(
    () => filteredLancamentos.reduce((acc, l) => acc + (Number(l.total_geral) || 0), 0),
    [filteredLancamentos]
  );

  const somaQuantidadeFiltrada = useMemo(
    () =>
      filteredLancamentos.reduce((acc, l) => {
        const itens = l.itens ?? [];
        return acc + itens.reduce((s, i) => s + (Number(i.quantidade) || 0), 0);
      }, 0),
    [filteredLancamentos]
  );

  /** Sempre o tamanho da lista em memória (filtros locais + ordenação); paginação é só visual na tabela. */
  const totalLancamentosLista = filteredLancamentos.length;
  const totalLancPages =
    totalLancamentosLista > 0
      ? Math.ceil(totalLancamentosLista / LANC_PAGE_SIZE)
      : 1;
  const lancamentosPagina = useMemo(() => {
    const start = (lancPage - 1) * LANC_PAGE_SIZE;
    const end = start + LANC_PAGE_SIZE;
    return filteredLancamentos.slice(start, end);
  }, [filteredLancamentos, lancPage]);

  /** Uma linha por produto: lançamentos com mais de um produto viram várias linhas */
  const linhasExpandidas = useMemo(
    () =>
      lancamentosPagina.flatMap((l) => {
        const produtoSelecionado = filtrosLancamento.produto.trim().toLowerCase();
        const itensOriginais = l.itens ?? [];
        const itens =
          produtoSelecionado === ''
            ? itensOriginais
            : itensOriginais.filter(
                (item) => (item.produto ?? '').trim().toLowerCase() === produtoSelecionado
              );
        if (itens.length === 0) return [{ l, item: null, itemIndex: 0, rowKey: `${l.id}-0` }];
        return itens.map((item, idx) => ({
          l,
          item,
          itemIndex: idx,
          rowKey: `${l.id}-${(item as { itemId?: number }).itemId ?? idx}`,
        }));
      }),
    [lancamentosPagina, filtrosLancamento.produto]
  );

  const toggleSelecionarTodosLancamentos = () => {
    const idsVisiveis = lancamentosPagina.map((l) => l.id);
    const todosSelecionados = idsVisiveis.every((id) => lancamentosSelecionados.has(id));
    if (todosSelecionados) {
      setLancamentosSelecionados((prev) => {
        const next = new Set(prev);
        idsVisiveis.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setLancamentosSelecionados((prev) => {
        const next = new Set(prev);
        idsVisiveis.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleAddMeeiro = (meeiroId: number | string) => {
    const idNum = Number(meeiroId);
    const m = meeirosParaLancamento.find((x) => Number(x.id) === idNum);
    if (!m) return;
    if (lancMeeiros.some((x) => Number(x.meeiroId) === idNum)) {
      toast.error('Meeiro já adicionado');
      return;
    }
    const pctEmb = valorDeEmbaPadraoDeMeeiro(m);
    const novo = {
      meeiroId: Number(m.id),
      nome: m.nome,
      porcentagem_padrao: Number(m.porcentagem_padrao ?? 0),
      valor_de_emba_padrao: pctEmb,
    };
    setLancMeeiros((prev) => [...prev, novo]);
    setLancProdutos((prev) =>
      prev.map((p) => ({
        ...p,
        meeiros: [
          ...p.meeiros,
          {
            meeiroId: novo.meeiroId,
            nome: novo.nome,
            porcentagem: novo.porcentagem_padrao,
            valor_de_emba: pctEmb,
          },
        ],
      }))
    );
    setLancMeeiroSelecionado('');
  };

  const handleRemoveMeeiroLanc = (meeiroId: number) => {
    setLancMeeiros((prev) => prev.filter((x) => x.meeiroId !== meeiroId));
    setLancProdutos((prev) =>
      prev.map((p) => ({
        ...p,
        meeiros: p.meeiros.filter((m) => m.meeiroId !== meeiroId),
      }))
    );
  };

  const handleAddProdutoLanc = (produtoId: number, qtd: number, preco: number) => {
    const p = produtosDisponiveisLancamento.find(
      (x) => Number(x.id) === Number(produtoId)
    ) as { id: number; nome?: string; unidade_medida?: string } | undefined;
    if (!p) {
      toast.error('Produto não encontrado na lista');
      return;
    }
    const meeirosDoProduto = lancMeeiros.map((m) => ({
      meeiroId: m.meeiroId,
      nome: m.nome,
      porcentagem: m.porcentagem_padrao,
      valor_de_emba: m.valor_de_emba_padrao,
    }));
    setLancProdutos((prev) => [
      ...prev,
      {
        produtoId: Number(p.id),
        quantidade: qtd,
        preco_unitario: preco,
        nome: p.nome ?? '—',
        meeiros: meeirosDoProduto,
      },
    ]);
    toast.success('Produto adicionado');
  };

  const totalGeralLanc =
    lancProdutos.reduce(
      (s, i) => s + i.quantidade * i.preco_unitario,
      0
    );
  const handleSubmitLancamento = () => {
    if (submittingLancamentoRef.current || createLancamento.isPending) return; // evita duplo envio (ref é síncrono)
    submittingLancamentoRef.current = true;
    if (!lancData || !lancRocaId || lancMeeiros.length === 0 || lancProdutos.length === 0) {
      submittingLancamentoRef.current = false;
      toast.error('Preencha data, roça, ao menos um meeiro e ao menos um produto');
      return;
    }
    const produtosComMeeiros = lancProdutos.filter((p) => p.meeiros.length > 0);
    if (produtosComMeeiros.length !== lancProdutos.length) {
      submittingLancamentoRef.current = false;
      toast.error('Cada produto deve ter ao menos um meeiro (adicione meeiros antes dos produtos)');
      return;
    }
    createLancamento.mutate({
      data: lancData,
      rocaId: Number(lancRocaId),
      produtos: lancProdutos.map((p) => ({
        produtoId: p.produtoId,
        quantidade: p.quantidade,
        preco_unitario: p.preco_unitario,
        meeiros: p.meeiros.map((m) => ({
          meeiroId: m.meeiroId,
          porcentagem: Number(m.porcentagem ?? 0),
          valor_de_emba: Number(
            m.valor_de_emba ?? VALOR_DE_EMBA_PADRAO,
          ),
        })),
      })),
    });
  };

  // Relatório por meeiro
  const [relMeeiroId, setRelMeeiroId] = useState<number | ''>('');
  const [relMeeiroSearchTerm, setRelMeeiroSearchTerm] = useState('');
  const [relMeeiroPopoverOpen, setRelMeeiroPopoverOpen] = useState(false);
  const [relPagMeeiroId, setRelPagMeeiroId] = useState<number | ''>('');
  const [relPagMeeiroSearchTerm, setRelPagMeeiroSearchTerm] = useState('');
  const [relPagMeeiroPopoverOpen, setRelPagMeeiroPopoverOpen] = useState(false);
  const [relDataInicial, setRelDataInicial] = useState('');
  const [relDataFinal, setRelDataFinal] = useState('');
  /** Vazio por padrão: o backend gera o PDF em lista (“comissão”). Datas preenchidas → repasse ao parceiro com lançamentos. */
  const [relMeeirosPdfDataInicial, setRelMeeirosPdfDataInicial] = useState('');
  const [relMeeirosPdfDataFinal, setRelMeeirosPdfDataFinal] = useState('');
  const [relMeeirosPdfRocaIds, setRelMeeirosPdfRocaIds] = useState<number[]>([]);
  const [relMeeirosPdfRocaBusca, setRelMeeirosPdfRocaBusca] = useState('');
  const rocasParaRelatorioPdfFiltradas = useMemo(() => {
    const t = relMeeirosPdfRocaBusca.trim().toLowerCase();
    if (!t) return rocasParaRelatorioPdf;
    return rocasParaRelatorioPdf.filter((r) => (r.nome ?? '').toLowerCase().includes(t));
  }, [rocasParaRelatorioPdf, relMeeirosPdfRocaBusca]);
  const [pagamentoFiltrosDraft, setPagamentoFiltrosDraft] = useState<PagamentoMeeirosFiltros>(() =>
    createDefaultPagamentoMeeirosFiltros(),
  );
  const [pagamentoFiltrosAplicados, setPagamentoFiltrosAplicados] = useState<PagamentoMeeirosFiltros>(() =>
    createDefaultPagamentoMeeirosFiltros(),
  );
  const [pagamentoFiltrosSheetOpen, setPagamentoFiltrosSheetOpen] = useState(false);
  /** Sidebar "Pagamento de meeiro" — PDF consolidado (endpoint relatorios/meeiros/pdf). */
  const [relPagamentoMeeiroSheetOpen, setRelPagamentoMeeiroSheetOpen] = useState(false);
  const [relPagMeeiroFiltroId, setRelPagMeeiroFiltroId] = useState<number | ''>('');
  const [relPagRocaFiltroId, setRelPagRocaFiltroId] = useState<number | ''>('');
  const [relPagDataInicial, setRelPagDataInicial] = useState('');
  const [relPagDataFinal, setRelPagDataFinal] = useState('');
  const [relPagFiltroPagamento, setRelPagFiltroPagamento] = useState<'todos' | 'pagos' | 'pendentes'>('todos');
  const onRelPagFiltroPagamentoChange = useCallback((value: string) => {
    if (value === 'todos' || value === 'pagos' || value === 'pendentes') {
      setRelPagFiltroPagamento(value);
    }
  }, []);
  const [relPagMeeiroComboOpen, setRelPagMeeiroComboOpen] = useState(false);
  const [relPagMeeiroComboSearch, setRelPagMeeiroComboSearch] = useState('');
  const [relPagRocaComboOpen, setRelPagRocaComboOpen] = useState(false);
  const [relPagRocaComboSearch, setRelPagRocaComboSearch] = useState('');
  const [relPagPdfLoading, setRelPagPdfLoading] = useState<
    null | 'download' | 'print' | 'download-recibos' | 'print-recibos'
  >(null);
  /** Carrega resumo na API ao abrir o modal a partir do painel lateral (não depende da lista da aba). */
  const [sheetModalPagamentoLoading, setSheetModalPagamentoLoading] = useState(false);
  const [pagamentoPdfMeeiroDialogOpen, setPagamentoPdfMeeiroDialogOpen] = useState(false);
  const [historicoPagamentosOpen, setHistoricoPagamentosOpen] = useState(false);
  const [historicoComprovanteBusy, setHistoricoComprovanteBusy] = useState<{
    rowKey: string;
    action: 'download' | 'print';
  } | null>(null);
  const [historicoPendenteGerarBusy, setHistoricoPendenteGerarBusy] = useState<string | null>(null);
  const [historicoFiltroMeeiroId, setHistoricoFiltroMeeiroId] = useState<number | ''>('');
  const [historicoFiltroStatus, setHistoricoFiltroStatus] = useState<'todos' | 'pendente' | 'concluido'>('todos');
  const [historicoFiltroDataInicial, setHistoricoFiltroDataInicial] = useState('');
  const [historicoFiltroDataFinal, setHistoricoFiltroDataFinal] = useState('');
  const [historicoExcluirItem, setHistoricoExcluirItem] = useState<{
    origem: 'pagamento' | 'relatorio_pendente';
    id: number;
    meeiroNome: string;
  } | null>(null);
  const [historicoLimparPeriodoOpen, setHistoricoLimparPeriodoOpen] = useState(false);
  const [relatorioSemPagamentoLoading, setRelatorioSemPagamentoLoading] = useState(false);
  const [pdfPagMeeiroId, setPdfPagMeeiroId] = useState<number | ''>('');
  const [pdfPagDataInicial, setPdfPagDataInicial] = useState('');
  const [pdfPagDataFinal, setPdfPagDataFinal] = useState('');
  const [pdfPagDataPagamento, setPdfPagDataPagamento] = useState('');
  /** Roças enviadas na query do PDF (independente do rascunho dos filtros da tela). */
  const [pdfPagRocaIds, setPdfPagRocaIds] = useState<number[]>([]);
  const [pdfPagMeeiroDownloading, setPdfPagMeeiroDownloading] = useState(false);
  const [pdfPagMeeiroPrinting, setPdfPagMeeiroPrinting] = useState(false);
  const pagamentoFiltrosAtivosCount = useMemo(() => {
    let n = 0;
    if (pagamentoFiltrosAplicados.produtorId !== '') n++;
    if (pagamentoFiltrosAplicados.meeiroId !== '') n++;
    if (pagamentoFiltrosAplicados.rocaIds.length > 0) n++;
    return n;
  }, [pagamentoFiltrosAplicados]);
  const [pagamentoDraftMeeiroSearch, setPagamentoDraftMeeiroSearch] = useState('');
  const [pagamentoDraftMeeiroOpen, setPagamentoDraftMeeiroOpen] = useState(false);
  const meeirosOpcoesFiltroPagamento = useMemo(() => {
    const term = pagamentoDraftMeeiroSearch.trim().toLowerCase();
    let list = meeirosParaRelatorio;
    if (pagamentoFiltrosDraft.produtorId !== '') {
      list = list.filter((m) => m.produtorId === Number(pagamentoFiltrosDraft.produtorId));
    }
    const sorted = [...list].sort((a, b) =>
      `${a.codigo ?? ''} ${a.nome ?? ''}`.localeCompare(`${b.codigo ?? ''} ${b.nome ?? ''}`, 'pt-BR', {
        sensitivity: 'base',
      }),
    );
    if (!term) return sorted;
    return sorted.filter(
      (m) =>
        (m.nome ?? '').toLowerCase().includes(term) || (m.codigo ?? '').toLowerCase().includes(term),
    );
  }, [meeirosParaRelatorio, pagamentoFiltrosDraft.produtorId, pagamentoDraftMeeiroSearch]);
  const [pagamentoSubTab, setPagamentoSubTab] = useState<'em-aberto' | 'quitados'>('em-aberto');
  const [pagamentoBuscaMeeiro, setPagamentoBuscaMeeiro] = useState('');
  const [pagamentoMeeirosPage, setPagamentoMeeirosPage] = useState(1);
  const [debouncedPagamentoBusca, setDebouncedPagamentoBusca] = useState('');
  const [openPagarModal, setOpenPagarModal] = useState(false);
  const [meeiroParaPagar, setMeeiroParaPagar] = useState<ResumoPagamentoMeeiro | null>(null);
  const [formPagamento, setFormPagamento] = useState({
    formaPagamento: 'PIX',
    contaCaixa: '',
    dataPagamento: '',
    observacao: '',
    valorAbaterEmprestimo: '',
  });
  const [openEditarPagamentoModal, setOpenEditarPagamentoModal] = useState(false);
  const [meeiroEditarPagamento, setMeeiroEditarPagamento] = useState<ResumoPagamentoMeeiro | null>(
    null,
  );
  const [editarPagamentoId, setEditarPagamentoId] = useState<number | null>(null);
  const [formEditarPagamento, setFormEditarPagamento] = useState({
    dataPagamento: '',
    formaPagamento: 'PIX',
    contaCaixa: '',
    observacao: '',
    descEmprest: '',
  });
  /** Evita spinner global: só o meeiro clicado entra em loading ao buscar o histórico. */
  const [editPagamentoLoadingMeeiroId, setEditPagamentoLoadingMeeiroId] = useState<number | null>(
    null,
  );
  /** Snapshot do item de histórico usado para o resumo financeiro (valores congelados do pagamento). */
  const [editPagamentoHistoricoRow, setEditPagamentoHistoricoRow] =
    useState<HistoricoPagamentoMeeiroItem | null>(null);
  /** Sem pagamento registrado: salva só o desconto previsto (coluna Desc emprést.). */
  const [editPagamentoApenasPrevisto, setEditPagamentoApenasPrevisto] = useState(false);
  const [relResult, setRelResult] = useState<RelatorioMeeiroResponse | null>(null);
  const [relLoading, setRelLoading] = useState(false);
  const [relPdfDialogOpen, setRelPdfDialogOpen] = useState(false);
  const [relPdfLoadingAction, setRelPdfLoadingAction] = useState<'download' | 'print' | null>(null);
  const [relPagPdfLoadingAction, setRelPagPdfLoadingAction] = useState<
    null | 'download' | 'print' | 'download-recibos' | 'print-recibos'
  >(null);
  const [relEmprestimosDataInicial, setRelEmprestimosDataInicial] = useState('');
  const [relEmprestimosDataFinal, setRelEmprestimosDataFinal] = useState('');
  const [relEmprestimosRocaId, setRelEmprestimosRocaId] = useState<number | ''>('');
  const [relEmprestimosLoadingAction, setRelEmprestimosLoadingAction] = useState<'download' | 'print' | null>(null);
  const meeirosRelatorioFiltrados = useMemo(() => {
    const term = relMeeiroSearchTerm.trim().toLowerCase();
    const list = [...meeirosParaRelatorio].sort((a, b) =>
      `${a.codigo ?? ''} ${a.nome ?? ''}`.localeCompare(`${b.codigo ?? ''} ${b.nome ?? ''}`)
    );
    if (!term) return list;
    return list.filter(
      (m) =>
        (m.codigo ?? '').toLowerCase().includes(term) ||
        (m.nome ?? '').toLowerCase().includes(term)
    );
  }, [meeirosParaRelatorio, relMeeiroSearchTerm]);
  const meeirosRelatorioPagFiltrados = useMemo(() => {
    const term = relPagMeeiroSearchTerm.trim().toLowerCase();
    const list = [...meeirosParaRelatorio].sort((a, b) =>
      `${a.codigo ?? ''} ${a.nome ?? ''}`.localeCompare(`${b.codigo ?? ''} ${b.nome ?? ''}`)
    );
    if (!term) return list;
    return list.filter(
      (m) =>
        (m.codigo ?? '').toLowerCase().includes(term) ||
        (m.nome ?? '').toLowerCase().includes(term)
    );
  }, [meeirosParaRelatorio, relPagMeeiroSearchTerm]);
  const meeirosRelPagamentoMeeiroSheet = useMemo(() => {
    const term = relPagMeeiroComboSearch.trim().toLowerCase();
    const sorted = [...meeirosParaRelatorio].sort((a, b) =>
      (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base' }),
    );
    if (!term) return sorted;
    return sorted.filter((m) => (m.nome ?? '').toLowerCase().includes(term));
  }, [meeirosParaRelatorio, relPagMeeiroComboSearch]);
  const rocasRelPagamentoMeeiroSheet = useMemo(() => {
    const term = relPagRocaComboSearch.trim().toLowerCase();
    const sorted = [...rocasParaFiltroLancamento].sort(compareRocaPorCodigo);
    if (!term) return sorted;
    return sorted.filter((r) => (r.nome ?? '').toLowerCase().includes(term));
  }, [rocasParaFiltroLancamento, relPagRocaComboSearch]);
  const runRelatorio = () => {
    if (relMeeiroId === '') {
      toast.error('Selecione um meeiro');
      return;
    }
    setRelLoading(true);
    controleRocaService
      .relatorioPorMeeiro({
        meeiroId: Number(relMeeiroId),
        dataInicial: relDataInicial || undefined,
        dataFinal: relDataFinal || undefined,
      })
      .then(setRelResult)
      .catch((err) => {
        toast.error(err?.response?.data?.message || err?.message || 'Erro ao gerar relatório');
      })
      .finally(() => setRelLoading(false));
  };

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedPagamentoBusca(pagamentoBuscaMeeiro.trim()), 350);
    return () => window.clearTimeout(id);
  }, [pagamentoBuscaMeeiro]);

  const pagamentoResumoFiltrosApi = useMemo(
    () => ({
      dataInicial: pagamentoFiltrosAplicados.dataInicial || undefined,
      dataFinal: pagamentoFiltrosAplicados.dataFinal || undefined,
      produtorId:
        pagamentoFiltrosAplicados.produtorId === ''
          ? undefined
          : Number(pagamentoFiltrosAplicados.produtorId),
      meeiroId:
        pagamentoFiltrosAplicados.meeiroId === ''
          ? undefined
          : Number(pagamentoFiltrosAplicados.meeiroId),
      rocas: pagamentoFiltrosAplicados.rocaIds.length
        ? pagamentoFiltrosAplicados.rocaIds
        : undefined,
      buscaNome: debouncedPagamentoBusca || undefined,
    }),
    [
      pagamentoFiltrosAplicados.dataInicial,
      pagamentoFiltrosAplicados.dataFinal,
      pagamentoFiltrosAplicados.produtorId,
      pagamentoFiltrosAplicados.meeiroId,
      pagamentoFiltrosAplicados.rocaIds,
      debouncedPagamentoBusca,
    ],
  );

  useEffect(() => {
    setPagamentoMeeirosPage(1);
  }, [
    debouncedPagamentoBusca,
    pagamentoSubTab,
    pagamentoFiltrosAplicados.dataInicial,
    pagamentoFiltrosAplicados.dataFinal,
    pagamentoFiltrosAplicados.produtorId,
    pagamentoFiltrosAplicados.meeiroId,
    pagamentoFiltrosAplicados.rocaIds.join(','),
  ]);

  const { data: pagamentoRocas = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas', pagamentoFiltrosDraft.produtorId],
    queryFn: () =>
      controleRocaService.listarRocas(
        pagamentoFiltrosDraft.produtorId === ''
          ? undefined
          : Number(pagamentoFiltrosDraft.produtorId),
      ),
    enabled: tab === 'pagamento-meeiros',
  });
  const { data: pdfPagDialogRocas = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas', 'pdf-pagamento-meeiro', pagamentoFiltrosAplicados.produtorId],
    queryFn: () =>
      controleRocaService.listarRocas(
        pagamentoFiltrosAplicados.produtorId === ''
          ? undefined
          : Number(pagamentoFiltrosAplicados.produtorId),
      ),
    enabled: tab === 'pagamento-meeiros' && pagamentoPdfMeeiroDialogOpen,
  });
  const { data: historicoPagamentosData, isLoading: loadingHistoricoPagamentos } = useQuery({
    queryKey: [
      'controle-roca',
      'pagamentos-meeiros',
      'historico',
      historicoPagamentosOpen,
      pagamentoFiltrosAplicados.produtorId,
      historicoFiltroMeeiroId,
      historicoFiltroStatus,
      historicoFiltroDataInicial,
      historicoFiltroDataFinal,
    ],
    queryFn: () =>
      controleRocaService.listarHistoricoPagamentosMeeiros({
        produtorId:
          pagamentoFiltrosAplicados.produtorId === ''
            ? undefined
            : Number(pagamentoFiltrosAplicados.produtorId),
        meeiroId:
          historicoFiltroMeeiroId === '' ? undefined : Number(historicoFiltroMeeiroId),
        dataPagamentoInicial: historicoFiltroDataInicial.trim() || undefined,
        dataPagamentoFinal: historicoFiltroDataFinal.trim() || undefined,
        statusHistorico: historicoFiltroStatus === 'todos' ? undefined : historicoFiltroStatus,
        page: 1,
        limit: 200,
      }),
    enabled: tab === 'pagamento-meeiros' && historicoPagamentosOpen,
  });

  const historicoFiltrosParams = useMemo(
    () => ({
      produtorId:
        pagamentoFiltrosAplicados.produtorId === ''
          ? undefined
          : Number(pagamentoFiltrosAplicados.produtorId),
      meeiroId: historicoFiltroMeeiroId === '' ? undefined : Number(historicoFiltroMeeiroId),
      dataPagamentoInicial: historicoFiltroDataInicial.trim() || undefined,
      dataPagamentoFinal: historicoFiltroDataFinal.trim() || undefined,
      statusHistorico:
        historicoFiltroStatus === 'todos' ? undefined : historicoFiltroStatus,
    }),
    [
      pagamentoFiltrosAplicados.produtorId,
      historicoFiltroMeeiroId,
      historicoFiltroDataInicial,
      historicoFiltroDataFinal,
      historicoFiltroStatus,
    ],
  );

  const excluirHistoricoItemMut = useMutation({
    mutationFn: (vars: { origem: 'pagamento' | 'relatorio_pendente'; id: number }) =>
      controleRocaService.excluirItemHistoricoPagamentoMeeiro(vars.origem, vars.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Registro removido do histórico.');
      setHistoricoExcluirItem(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao excluir registro do histórico',
      );
    },
  });

  const historicoPendentesNoPeriodo =
    historicoPagamentosData?.resumo?.registrosRelatorioPendenteNoPeriodo ?? 0;

  const limparHistoricoPeriodoMut = useMutation({
    mutationFn: () =>
      controleRocaService.limparHistoricoPagamentosMeeiros({
        ...historicoFiltrosParams,
        statusHistorico:
          historicoFiltrosParams.statusHistorico === 'concluido'
            ? 'concluido'
            : 'pendente',
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success(
        res.relatoriosExcluidos > 0
          ? `${res.relatoriosExcluidos} relatório(s) pendente(s) removido(s) do histórico.`
          : 'Nenhum relatório pendente encontrado para os filtros informados.',
      );
      setHistoricoLimparPeriodoOpen(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao limpar relatórios pendentes',
      );
    },
  });

  const {
    data: resumoPagamentoMeeiros,
    isLoading: loadingResumoPagamento,
    isFetching: fetchingResumoPagamento,
  } = useQuery({
    queryKey: [
      'controle-roca',
      'pagamentos-meeiros',
      'resumo',
      pagamentoResumoFiltrosApi,
      pagamentoSubTab,
      pagamentoMeeirosPage,
    ],
    queryFn: () =>
      controleRocaService.listarResumoPagamentoMeeiros({
        ...pagamentoResumoFiltrosApi,
        subTab: pagamentoSubTab,
        page: pagamentoMeeirosPage,
        limit: PAGAMENTO_MEEIROS_PAGE_SIZE,
      }),
    enabled: tab === 'pagamento-meeiros',
  });

  const totalPagamentoEmAbertoBadge = resumoPagamentoMeeiros?.totalEmAberto ?? 0;
  const totalPagamentoQuitadosBadge = resumoPagamentoMeeiros?.totalQuitados ?? 0;

  const totalPagamentoMeeirosLista = resumoPagamentoMeeiros?.total ?? 0;
  const totalPagamentoMeeirosPages = Math.max(
    1,
    Math.ceil(totalPagamentoMeeirosLista / PAGAMENTO_MEEIROS_PAGE_SIZE),
  );

  useEffect(() => {
    if (totalPagamentoMeeirosLista === 0) return;
    if (pagamentoMeeirosPage > totalPagamentoMeeirosPages) {
      setPagamentoMeeirosPage(totalPagamentoMeeirosPages);
    }
  }, [totalPagamentoMeeirosLista, totalPagamentoMeeirosPages, pagamentoMeeirosPage]);

  const aplicarFiltrosPagamentoMeeiros = () => {
    setPagamentoFiltrosAplicados({ ...pagamentoFiltrosDraft });
    setPagamentoFiltrosSheetOpen(false);
    void queryClient.invalidateQueries({ queryKey: ['controle-roca', 'pagamentos-meeiros'] });
  };

  const limparFiltrosPagamentoMeeiros = () => {
    const def = createDefaultPagamentoMeeirosFiltros();
    setPagamentoFiltrosDraft(def);
    setPagamentoFiltrosAplicados(def);
    setPagamentoFiltrosSheetOpen(false);
    void queryClient.invalidateQueries({ queryKey: ['controle-roca', 'pagamentos-meeiros'] });
  };

  const carregarMeeiroEAbrirModalPagamento = useCallback(
    async (
      meeiroId: number,
      overrides?: { dataInicial?: string; dataFinal?: string; rocas?: number[] },
    ) => {
      setSheetModalPagamentoLoading(true);
      try {
        const produtorTab =
          pagamentoFiltrosAplicados.produtorId === ''
            ? undefined
            : Number(pagamentoFiltrosAplicados.produtorId);
        const meta = meeirosParaRelatorio.find((m) => Number(m.id) === Number(meeiroId));
        /** Prioriza o produtor do cadastro do meeiro; filtro da aba Pagamento pode divergir e zerar o resumo. */
        const produtorId =
          meta?.produtorId != null && !Number.isNaN(Number(meta.produtorId))
            ? Number(meta.produtorId)
            : produtorTab;

        const dataInicial =
          overrides?.dataInicial?.trim() ||
          relPagDataInicial.trim() ||
          pagamentoFiltrosAplicados.dataInicial.trim() ||
          undefined;
        const dataFinal =
          overrides?.dataFinal?.trim() ||
          relPagDataFinal.trim() ||
          pagamentoFiltrosAplicados.dataFinal.trim() ||
          undefined;
        let rocas: number[] | undefined;
        if (overrides?.rocas !== undefined) {
          rocas = overrides.rocas.length ? overrides.rocas : undefined;
        } else if (pagamentoFiltrosAplicados.rocaIds.length > 0) {
          rocas = pagamentoFiltrosAplicados.rocaIds;
        } else {
          rocas = relPagRocaFiltroId === '' ? undefined : [Number(relPagRocaFiltroId)];
        }

        const baseParams = {
          produtorId,
          meeiroId,
          dataInicial,
          dataFinal,
          rocas,
          page: 1,
          limit: 50,
        };

        /** Sem subTab: busca o meeiro independente das abas Em aberto / Quitados. */
        let res = await controleRocaService.listarResumoPagamentoMeeiros(baseParams);
        let row =
          res.items.find((x) => Number(x.meeiroId) === Number(meeiroId)) ?? null;
        if (!row && produtorId != null) {
          res = await controleRocaService.listarResumoPagamentoMeeiros({
            ...baseParams,
            produtorId: undefined,
          });
          row =
            res.items.find((x) => Number(x.meeiroId) === Number(meeiroId)) ?? null;
        }
        if (!row) {
          toast.error(
            'Não foi possível carregar os valores deste meeiro para o período e filtros atuais. Ajuste datas ou roça na lateral, ou os filtros da aba Pagamento.',
          );
          return;
        }
        setMeeiroParaPagar(row);
        setFormPagamento({
          formaPagamento: 'PIX',
          contaCaixa: '',
          dataPagamento: getDataHojeLocal(),
          observacao: '',
          valorAbaterEmprestimo: valorAbaterEmprestimoInicialString(row),
        });
        setRelPagamentoMeeiroSheetOpen(false);
        setHistoricoPagamentosOpen(false);
        setOpenPagarModal(true);
        void queryClient.invalidateQueries({ queryKey: ['controle-roca', 'pagamentos-meeiros'] });
      } catch (e: any) {
        toast.error(
          e?.response?.data?.message || e?.message || 'Erro ao carregar dados para pagamento.',
        );
      } finally {
        setSheetModalPagamentoLoading(false);
      }
    },
    [
      pagamentoFiltrosAplicados.produtorId,
      meeirosParaRelatorio,
      relPagDataInicial,
      relPagDataFinal,
      relPagRocaFiltroId,
      pagamentoFiltrosAplicados.dataInicial,
      pagamentoFiltrosAplicados.dataFinal,
      pagamentoFiltrosAplicados.rocaIds,
      queryClient,
    ],
  );

  const registrarPagamento = useMutation({
    mutationFn: async (vars: {
      data: {
        meeiroId: number;
        formaPagamento: string;
        contaCaixa?: string;
        dataPagamento: string;
        observacao?: string;
        valorAbaterEmprestimo?: number;
      };
      gerarComprovantePdf: boolean;
    }) => {
      const res = await controleRocaService.registrarPagamentoMeeiro(vars.data);
      if (vars.gerarComprovantePdf && res.pagamentoId != null && res.pagamentoId > 0) {
        await controleRocaService.downloadComprovantePagamentoMeeiroPdf(res.pagamentoId);
      }
      return res;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success(
        vars.gerarComprovantePdf
          ? 'Pagamento registrado e relatório Repasse ao parceiro baixado.'
          : 'Pagamento registrado. Você pode baixar o relatório em Histórico de pagamentos.',
      );
      setOpenPagarModal(false);
      setMeeiroParaPagar(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao registrar pagamento');
    },
  });

  const atualizarPagamentoMeeiroMut = useMutation({
    mutationFn: async (vars: { id: number; data: AtualizarPagamentoMeeiroDto }) =>
      controleRocaService.atualizarPagamentoMeeiro(vars.id, vars.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Pagamento atualizado.');
      setOpenEditarPagamentoModal(false);
      setMeeiroEditarPagamento(null);
      setEditarPagamentoId(null);
      setEditPagamentoApenasPrevisto(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao atualizar pagamento',
      );
    },
  });

  const definirDescontoEmprestimoMut = useMutation({
    mutationFn: async (vars: { meeiroId: number; descEmprest: number }) =>
      controleRocaService.definirDescontoEmprestimoMeeiro(vars.meeiroId, vars.descEmprest),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
      toast.success('Desconto de empréstimo salvo.');
      setOpenEditarPagamentoModal(false);
      setMeeiroEditarPagamento(null);
      setEditarPagamentoId(null);
      setEditPagamentoApenasPrevisto(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao salvar desconto de empréstimo',
      );
    },
  });

  const abrirEditarPagamento = useCallback(async (m: ResumoPagamentoMeeiro) => {
    const pid = m.ultimoPagamentoId;
    setEditPagamentoLoadingMeeiroId(m.meeiroId);
    try {
      if (pid == null || Number.isNaN(Number(pid))) {
        setMeeiroEditarPagamento(m);
        setEditarPagamentoId(null);
        setEditPagamentoHistoricoRow(null);
        setEditPagamentoApenasPrevisto(true);
        setFormEditarPagamento({
          dataPagamento: getDataHojeLocal(),
          formaPagamento: 'PIX',
          contaCaixa: '',
          observacao: '',
          descEmprest:
            m.descEmprest != null && !Number.isNaN(Number(m.descEmprest)) && Number(m.descEmprest) > 0
              ? String(m.descEmprest)
              : '',
        });
        setOpenEditarPagamentoModal(true);
        return;
      }
      const hist = await controleRocaService.listarHistoricoPagamentosMeeiros({
        meeiroId: m.meeiroId,
        statusHistorico: 'concluido',
        limit: 100,
      });
      const row = hist.items.find(
        (i) => i.origem === 'pagamento' && Number(i.id) === Number(pid),
      );
      if (!row) {
        toast.error('Não foi possível carregar o pagamento para edição.');
        return;
      }
      const dataStr = String(row.dataPagamento ?? '').split('T')[0];
      setMeeiroEditarPagamento(m);
      setEditarPagamentoId(Number(pid));
      setEditPagamentoApenasPrevisto(false);
      setFormEditarPagamento({
        dataPagamento: dataStr || getDataHojeLocal(),
        formaPagamento: row.formaPagamento ?? 'PIX',
        contaCaixa: row.contaCaixa ?? '',
        observacao: row.observacao ?? '',
        descEmprest:
          row.descEmprest != null && !Number.isNaN(Number(row.descEmprest))
            ? String(row.descEmprest)
            : '',
      });
      setEditPagamentoHistoricoRow(row);
      setOpenEditarPagamentoModal(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Erro ao carregar pagamento');
    } finally {
      setEditPagamentoLoadingMeeiroId(null);
    }
  }, []);

  const totalProdutoresAtivos = useMemo(
    () => produtores.filter((p) => p.ativo !== false).length,
    [produtores]
  );
  const totalRocasAtivas = useMemo(
    () => rocas.filter((r) => r.ativo !== false).length,
    [rocas]
  );
  const valorMedioLancamento = useMemo(
    () => (filteredLancamentos.length ? valorTotalFiltrado / filteredLancamentos.length : 0),
    [filteredLancamentos.length, valorTotalFiltrado]
  );
  const lancamentosPorRocaDashboard = useMemo(
    () =>
      dashboardRocaId === ''
        ? lancamentosDashboardTodos
        : lancamentosDashboardTodos.filter((l) => Number(l.rocaId) === Number(dashboardRocaId)),
    [dashboardRocaId, lancamentosDashboardTodos]
  );
  const rocasDashboardSelectOrdenadas = useMemo(
    () => [...rocasParaFiltroLancamento].sort(compareRocaPorCodigo),
    [rocasParaFiltroLancamento]
  );
  const mesesDisponiveisDashboard = useMemo(() => {
    const meses = new Set<string>();
    lancamentosPorRocaDashboard.forEach((l) => {
      const data = String(l.data ?? '');
      if (data.length >= 7) meses.add(data.slice(0, 7));
    });
    return Array.from(meses)
      .sort((a, b) => b.localeCompare(a))
      .map((mes) => ({
        value: mes,
        label: `${mes.slice(5, 7)}/${mes.slice(0, 4)}`,
      }));
  }, [lancamentosPorRocaDashboard]);
  const lancamentosDashboardFiltrados = useMemo(
    () =>
      dashboardMes === 'all'
        ? lancamentosPorRocaDashboard
        : lancamentosPorRocaDashboard.filter((l) => String(l.data ?? '').startsWith(dashboardMes)),
    [dashboardMes, lancamentosPorRocaDashboard]
  );
  useEffect(() => {
    if (dashboardMes === 'all') return;
    const existe = mesesDisponiveisDashboard.some((m) => m.value === dashboardMes);
    if (!existe) setDashboardMes('all');
  }, [dashboardMes, mesesDisponiveisDashboard]);
  /** Nome da roça vindo da API (útil quando o cadastro não está nas listas do filtro). */
  const rocaNomePorIdDosLancamentos = useMemo(() => {
    const m = new Map<number, string>();
    for (const l of lancamentosDashboardFiltrados) {
      const id = Number(l.rocaId);
      const raw = l.rocaNome?.trim();
      if (raw && !m.has(id)) m.set(id, raw);
    }
    return m;
  }, [lancamentosDashboardFiltrados]);
  const somaQuantidadeDashboard = useMemo(
    () =>
      lancamentosDashboardFiltrados.reduce((acc, l) => {
        const itens = l.itens ?? [];
        return acc + itens.reduce((s, i) => s + (Number(i.quantidade) || 0), 0);
      }, 0),
    [lancamentosDashboardFiltrados]
  );
  const valorTotalDashboardParcial = useMemo(
    () =>
      lancamentosDashboardFiltrados.reduce((acc, l) => acc + (Number(l.total_geral) || 0), 0),
    [lancamentosDashboardFiltrados]
  );
  const valorMedioDashboard = useMemo(
    () =>
      somaQuantidadeDashboard > 0
        ? valorTotalDashboardParcial / somaQuantidadeDashboard
        : 0,
    [somaQuantidadeDashboard, valorTotalDashboardParcial]
  );
  const mesReferenciaMetricas = useMemo(
    () => (dashboardMes === 'all' ? 'all' : dashboardMes),
    [dashboardMes]
  );
  const lancamentosMesReferencia = useMemo(() => {
    if (mesReferenciaMetricas === 'all') return lancamentosPorRocaDashboard;
    return lancamentosPorRocaDashboard.filter((l) =>
      String(l.data ?? '').startsWith(mesReferenciaMetricas)
    );
  }, [lancamentosPorRocaDashboard, mesReferenciaMetricas]);
  const referenciaMetricasLabel = useMemo(() => {
    if (mesReferenciaMetricas === 'all') return 'Todos os meses';
    return `${mesReferenciaMetricas.slice(5, 7)}/${mesReferenciaMetricas.slice(0, 4)}`;
  }, [mesReferenciaMetricas]);
  const metricasProducaoMensal = useMemo(() => {
    const quantidade = lancamentosMesReferencia.reduce((acc, l) => {
      const qtd = (l.itens ?? []).reduce((s, item) => s + (Number(item.quantidade) || 0), 0);
      return acc + qtd;
    }, 0);
    const valor = lancamentosMesReferencia.reduce((acc, l) => acc + (Number(l.total_geral) || 0), 0);
    /** Valor médio por unidade de produção (total R$ ÷ quantidade somada nos itens). */
    const ticketMedio = quantidade > 0 ? valor / quantidade : 0;
    const totalLancamentos = lancamentosMesReferencia.length;

    const datasLancamento = lancamentosMesReferencia
      .map((l) => String(l.data ?? '').slice(0, 10))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    /** Quantidade de datas distintas com pelo menos um lançamento (não dias do calendário do mês). */
    const diasComLancamento = new Set(datasLancamento).size;

    const mediaDiariaCaixas =
      diasComLancamento > 0 ? quantidade / diasComLancamento : 0;

    return {
      quantidade,
      valor,
      ticketMedio,
      totalLancamentos,
      diasComLancamento,
      mediaDiariaCaixas,
    };
  }, [lancamentosMesReferencia]);
  const resumoRocasDashboard = useMemo(() => {
    const mapa = new Map<
      number,
      { rocaId: number; lancamentos: number; quantidade: number; valor: number; ultimaData: string }
    >();
    lancamentosDashboardFiltrados.forEach((l) => {
      const id = Number(l.rocaId);
      const atual = mapa.get(id) ?? {
        rocaId: id,
        lancamentos: 0,
        quantidade: 0,
        valor: 0,
        ultimaData: String(l.data ?? ''),
      };
      atual.lancamentos += 1;
      atual.quantidade += (l.itens ?? []).reduce((s, item) => s + (Number(item.quantidade) || 0), 0);
      atual.valor += Number(l.total_geral) || 0;
      const data = String(l.data ?? '');
      if (data > atual.ultimaData) atual.ultimaData = data;
      mapa.set(id, atual);
    });

    return Array.from(mapa.values())
      .map((item) => {
        const roca =
          rocasParaFiltroLancamento.find((r) => r.id === item.rocaId) ||
          rocas.find((r) => r.id === item.rocaId) ||
          rocasParaLancamento.find((r) => r.id === item.rocaId);
        const produtor = produtores.find((p) => p.id === roca?.produtorId);
        return {
          ...item,
          codigo: roca?.codigo ?? `R${item.rocaId}`,
          nome:
            roca?.nome ??
            rocaNomePorIdDosLancamentos.get(item.rocaId) ??
            `Roça ${item.rocaId}`,
          produtor: produtor?.nome_razao ?? '—',
        };
      })
      .sort((a, b) => {
        const da = a.ultimaData?.trim() || '';
        const db = b.ultimaData?.trim() || '';
        if (!da && !db) return b.valor - a.valor;
        if (!da) return 1;
        if (!db) return -1;
        const porData = db.localeCompare(da);
        if (porData !== 0) return porData;
        return b.valor - a.valor;
      })
      .slice(0, 8);
  }, [
    lancamentosDashboardFiltrados,
    produtores,
    rocas,
    rocasParaFiltroLancamento,
    rocasParaLancamento,
    rocaNomePorIdDosLancamentos,
  ]);
  /** Gráfico: soma das quantidades (caixas) por roça em cada período (mês ou dia). */
  const graficoLancamentosPorRocaDashboard = useMemo(() => {
    const src = lancamentosDashboardFiltrados;
    type Row = Record<string, string | number>;
    type Serie = { dataKey: string; name: string; fill: string };

    if (src.length === 0) {
      return { data: [] as Row[], series: [] as Serie[] };
    }

    const bucketToCaixasPorRoca = new Map<string, Map<number, number>>();

    const somarCaixas = (bucket: string, rocaId: number, qtd: number) => {
      if (!Number.isFinite(rocaId)) return;
      let porRoca = bucketToCaixasPorRoca.get(bucket);
      if (!porRoca) {
        porRoca = new Map();
        bucketToCaixasPorRoca.set(bucket, porRoca);
      }
      const add = Number.isFinite(qtd) && qtd > 0 ? qtd : 0;
      porRoca.set(rocaId, (porRoca.get(rocaId) ?? 0) + add);
    };

    src.forEach((l) => {
      const dataStr = String(l.data ?? '');
      const rocaId = Number(l.rocaId);
      const qtdCaixas = (l.itens ?? []).reduce(
        (s, item) => s + (Number(item.quantidade) || 0),
        0,
      );
      if (dashboardMes !== 'all') {
        const chave = dataStr.length >= 10 ? dataStr.slice(0, 10) : 'sem-data';
        somarCaixas(chave, rocaId, qtdCaixas);
      } else {
        const chave = dataStr.length >= 7 ? dataStr.slice(0, 7) : 'sem-data';
        somarCaixas(chave, rocaId, qtdCaixas);
      }
    });

    let periodos = Array.from(bucketToCaixasPorRoca.keys()).sort((a, b) => a.localeCompare(b));
    if (dashboardMes === 'all') {
      periodos = periodos.slice(-6);
    }

    const rocaIdsNoGrafico = new Set<number>();
    periodos.forEach((p) => {
      bucketToCaixasPorRoca.get(p)?.forEach((_, id) => rocaIdsNoGrafico.add(id));
    });

    const resolverRoca = (id: number) =>
      rocasParaFiltroLancamento.find((r) => r.id === id) ||
      rocas.find((r) => r.id === id) ||
      rocasParaLancamento.find((r) => r.id === id);

    const rocaIdsOrdenados = Array.from(rocaIdsNoGrafico).sort((a, b) => {
      const ra = resolverRoca(a);
      const rb = resolverRoca(b);
      return compareRocaPorCodigo(
        { codigo: ra?.codigo, nome: ra?.nome ?? rocaNomePorIdDosLancamentos.get(a) },
        { codigo: rb?.codigo, nome: rb?.nome ?? rocaNomePorIdDosLancamentos.get(b) },
      );
    });

    const series: Serie[] = rocaIdsOrdenados.map((id, i) => {
      const r = resolverRoca(id);
      const nomeRoca =
        rocaNomePorIdDosLancamentos.get(id) ?? r?.nome ?? `Roça ${id}`;
      const nome = (r?.codigo ? `${r.codigo} – ` : '') + nomeRoca;
      return {
        dataKey: `r_${id}`,
        name: nome,
        fill: CORES_GRAFICO_ROCA_DASHBOARD[i % CORES_GRAFICO_ROCA_DASHBOARD.length],
      };
    });

    const data: Row[] = periodos.map((periodo) => {
      const porRoca = bucketToCaixasPorRoca.get(periodo) ?? new Map();
      const row: Row = {
        label:
          periodo === 'sem-data'
            ? 'Sem data'
            : dashboardMes !== 'all'
              ? `${periodo.slice(8, 10)}/${periodo.slice(5, 7)}`
              : `${periodo.slice(5, 7)}/${periodo.slice(0, 4)}`,
      };
      rocaIdsOrdenados.forEach((id) => {
        row[`r_${id}`] = porRoca.get(id) ?? 0;
      });
      return row;
    });

    return { data, series };
  }, [
    dashboardMes,
    lancamentosDashboardFiltrados,
    rocas,
    rocasParaFiltroLancamento,
    rocasParaLancamento,
    rocaNomePorIdDosLancamentos,
  ]);

  /** Roças com plantio/produtividade para o dashboard (filtra pela roça do topo, se houver). */
  const rocasPlantioDashboard = useMemo(() => {
    let list = rocasParaFiltroLancamento.filter((r) => r.ativo !== false);
    if (dashboardRocaId !== '') {
      list = list.filter((r) => Number(r.id) === Number(dashboardRocaId));
    }
    return [...list].sort(compareRocaPorCodigo);
  }, [rocasParaFiltroLancamento, dashboardRocaId]);

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
            <Sprout className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
            Controle de Roça
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Cadastros de produtor, roça, meeiro, produtos e lançamento da produção
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 overflow-x-auto overflow-y-hidden -mx-1 px-1 w-full sm:w-auto">
            <TabsTrigger value="dashboard" className="gap-1">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="produtores" className="gap-1">
              <User className="w-4 h-4" />
              Produtores
            </TabsTrigger>
            <TabsTrigger value="rocas" className="gap-1">
              <MapPin className="w-4 h-4" />
              Roças
            </TabsTrigger>
            <TabsTrigger value="meeiros" className="gap-1">
              <Users className="w-4 h-4" />
              Meeiros
            </TabsTrigger>
            <TabsTrigger value="produtos" className="gap-1">
              <Package className="w-4 h-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="lancamentos" className="gap-1">
              <ClipboardList className="w-4 h-4" />
              Lançamentos
            </TabsTrigger>
            <TabsTrigger value="pagamento-meeiros" className="gap-1">
              <Banknote className="w-4 h-4" />
              Pagamento Meeiros
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="gap-1">
              <FileText className="w-4 h-4" />
              Notas de lançamento
            </TabsTrigger>
            <TabsTrigger value="diario-roca" className="gap-1">
              <NotebookPen className="w-4 h-4" />
              Diário de roça
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:max-w-xs sm:shrink-0">
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground sm:sr-only">
                  Roça no dashboard
                </Label>
                <Select
                  value={dashboardRocaId === '' ? 'all' : String(dashboardRocaId)}
                  onValueChange={(v) => {
                    setDashboardRocaId(v === 'all' ? '' : Number(v));
                    setDashboardMes('all');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as roças" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as roças</SelectItem>
                    {rocasDashboardSelectOrdenadas.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {(r.codigo ? `${r.codigo} – ` : '') + (r.nome ?? `Roça ${r.id}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Produtores ativos</p>
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{totalProdutoresAtivos}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Roças ativas</p>
                  <Sprout className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{totalRocasAtivas}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Lançamentos filtrados</p>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{lancamentosDashboardFiltrados.length}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Valor total filtrado</p>
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(valorTotalDashboardParcial)}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-xl border bg-card px-5 py-6 sm:px-6 sm:py-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="space-y-2 pr-2">
                    <h3 className="font-semibold text-foreground text-lg leading-snug">
                      Visão geral da produção
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Resumo rápido para acompanhar o status operacional da roça.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setTab('lancamentos')}>
                    Ver lançamentos
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Quantidade total de caixa</p>
                    <p className="mt-1 text-lg font-semibold">
                      {somaQuantidadeDashboard.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Valor médio por caixa</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatCurrency(valorMedioDashboard)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Meeiros cadastrados</p>
                    <p className="mt-1 text-lg font-semibold">{meeirosDashboard.length}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border/60 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Sprout className="h-5 w-5 text-primary shrink-0" />
                        Plantio, colheita e produtividade
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Datas de plantio e início da colheita, mudas plantadas, quantidade colhida e
                        colheita por pé (mesmo filtro de roça do topo).
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => setTab('rocas')}>
                      Editar roças
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="whitespace-nowrap min-w-[140px]">Roça</TableHead>
                          <TableHead className="text-center whitespace-nowrap min-w-[100px]">
                            Data do plantio
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap min-w-[100px]">
                            Início da colheita
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap">Mudas plantadas</TableHead>
                          <TableHead className="text-center whitespace-nowrap">Qtd. colhida</TableHead>
                          <TableHead className="text-center whitespace-nowrap">% colhida</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rocasPlantioDashboard.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="py-10 text-center text-sm text-muted-foreground"
                            >
                              {dashboardRocaId !== ''
                                ? 'Nenhuma roça ativa corresponde ao filtro.'
                                : 'Nenhuma roça ativa cadastrada.'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          rocasPlantioDashboard.map((rItem) => (
                            <TableRow key={rItem.id}>
                              <TableCell className="font-medium max-w-[280px]">
                                {(rItem.codigo ? `${rItem.codigo} – ` : '') +
                                  (rItem.nome ?? `Roça ${rItem.id}`)}
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap tabular-nums text-sm">
                                {formatDataIsoPt(rItem.dataPlantio ?? undefined)}
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap tabular-nums text-sm">
                                {formatDataIsoPt(rItem.dataInicioColheita ?? undefined)}
                              </TableCell>
                              <TableCell className="text-center tabular-nums">
                                {rItem.quantidadeMudasPlantadas != null
                                  ? String(rItem.quantidadeMudasPlantadas)
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-center tabular-nums">
                                {formatQuantidadeColhida(rItem.quantidadeColhidaTotal)}
                              </TableCell>
                              <TableCell className="text-center tabular-nums">
                                {formatPercentualColhido(rItem.percentualColhido)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    % colhida: quantidade colhida ÷ mudas plantadas cadastradas na roça.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Produção por período</h3>
                  <p className="text-sm text-muted-foreground">
                    {dashboardMes === 'all'
                      ? 'Últimos 6 meses: quantidade de caixas (soma das quantidades dos lançamentos) por roça.'
                      : 'Por dia no mês selecionado: quantidade de caixas por roça.'}{' '}
                    Mesmos filtros de roça do topo e o resumo das roças abaixo.
                  </p>
                </div>
                <div className="w-full md:w-[220px] md:shrink-0">
                  <Select value={dashboardMes} onValueChange={setDashboardMes}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {mesesDisponiveisDashboard.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {graficoLancamentosPorRocaDashboard.data.length === 0 ||
              graficoLancamentosPorRocaDashboard.series.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Sem dados para exibir no gráfico.
                </div>
              ) : (
                <div className="h-80 w-full min-h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={graficoLancamentosPorRocaDashboard.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis
                        allowDecimals
                        tickFormatter={(v) => Number(v).toLocaleString('pt-BR')}
                      />
                      <Tooltip
                        formatter={(value: number | string, name: string) => [
                          `${Number(value).toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 3,
                          })} caixa(s)`,
                          name,
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {graficoLancamentosPorRocaDashboard.series.map((s) => (
                        <Bar
                          key={s.dataKey}
                          dataKey={s.dataKey}
                          name={s.name}
                          fill={s.fill}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">Produção do mês (quantidade)</p>
                <p className="mt-2 text-2xl font-semibold">
                  {metricasProducaoMensal.quantidade.toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Referência: {referenciaMetricasLabel}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">Produção do mês (valor)</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(metricasProducaoMensal.valor)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Referência: {referenciaMetricasLabel}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">Valor médio por caixa</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(metricasProducaoMensal.ticketMedio)}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                  Média diária (só dias com lançamento)
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {Math.round(metricasProducaoMensal.mediaDiariaCaixas).toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metricasProducaoMensal.diasComLancamento > 0
                    ? `${metricasProducaoMensal.quantidade.toLocaleString(
                        'pt-BR'
                      )} caixas ÷ ${metricasProducaoMensal.diasComLancamento.toLocaleString(
                        'pt-BR'
                      )} dia(s) com produção registrada · referência: ${referenciaMetricasLabel}`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card px-5 py-6 sm:px-6 sm:py-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground text-lg leading-snug pr-2">
                  Resumo das roças
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setTab('rocas')}
                >
                  Ver cadastro de roças
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Roça</TableHead>
                      <TableHead>Produtor</TableHead>
                      <TableHead className="text-right">Lançamentos</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Último lançamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoRocasDashboard.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Nenhum resumo de roça para o filtro selecionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      resumoRocasDashboard.map((r) => (
                        <TableRow key={r.rocaId}>
                          <TableCell className="font-medium">{r.codigo}</TableCell>
                          <TableCell>{r.nome}</TableCell>
                          <TableCell>{r.produtor}</TableCell>
                          <TableCell className="text-right">{r.lancamentos}</TableCell>
                          <TableCell className="text-right">
                            {r.quantidade.toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(r.valor)}</TableCell>
                          <TableCell className="text-right">
                            {r.ultimaData ? formatDate(r.ultimaData) : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Tab Produtores */}
          <TabsContent value="produtores" className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, código ou CPF/CNPJ..."
                    className="pl-10"
                    value={searchProdutor}
                    onChange={(e) => setSearchProdutor(e.target.value)}
                  />
                </div>
                <Button variant="gradient" onClick={() => setOpenProdutor(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produtor
                </Button>
              </div>
            </div>
            <div className="bg-card border rounded-xl overflow-x-auto min-w-0">
              {loadingProdutores ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome / Razão social</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead className="w-[70px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {searchProdutor.trim()
                            ? 'Nenhum resultado para a busca.'
                            : 'Nenhum produtor cadastrado'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProdutores.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.codigo}</TableCell>
                          <TableCell>{p.nome_razao}</TableCell>
                          <TableCell>{p.cpf_cnpj || '—'}</TableCell>
                          <TableCell>{p.telefone || p.whatsapp || '—'}</TableCell>
                          <TableCell className="max-w-[200px] truncate xl:max-w-none xl:overflow-visible xl:whitespace-normal xl:text-clip">
                            {p.endereco || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <TableRowActionsMenu icon="horizontal">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDetailProdutor(p);
                                    setOpenDetailProdutor(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditProdutor(p);
                                    setFormEditProdutor({
                                      codigo: p.codigo,
                                      nome_razao: p.nome_razao,
                                      cpf_cnpj: p.cpf_cnpj ?? '',
                                      telefone: telefoneArmazenadoParaCampo(
                                        p.telefone ?? p.whatsapp,
                                      ),
                                      whatsapp: '',
                                      endereco: p.endereco ?? '',
                                      inscricao_estadual: p.inscricao_estadual ?? '',
                                    });
                                    setTipoPessoaEdit(
                                      p.cpf_cnpj && cleanDocument(p.cpf_cnpj).length === 14
                                        ? 'PESSOA_JURIDICA'
                                        : 'PESSOA_FISICA'
                                    );
                                    setOpenEditProdutor(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (window.confirm('Deixar este produtor inativo? Ele não aparecerá mais na listagem.')) {
                                      updateProdutor.mutate({
                                        id: p.id,
                                        data: { ativo: false },
                                      });
                                    }
                                  }}
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Deixar inativo
                                </DropdownMenuItem>
                            </TableRowActionsMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Tab Roças */}
          <TabsContent value="rocas" className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFiltrosRocaOpen(true)}
                  style={
                    produtorIdRocas !== '' || incluirRocasInativas
                      ? { borderColor: 'var(--primary)', borderWidth: '2px' }
                      : {}
                  }
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {(produtorIdRocas !== '' || incluirRocasInativas) && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {[produtorIdRocas !== '', incluirRocasInativas].filter(Boolean).length}
                    </span>
                  )}
                </Button>
                <Sheet open={filtrosRocaOpen} onOpenChange={setFiltrosRocaOpen}>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Filter className="w-5 h-5 text-primary" />
                        </div>
                        <SheetTitle className="text-xl">Filtros de roças</SheetTitle>
                      </div>
                      <SheetDescription>Refine por produtor e status</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Produtor</Label>
                        <Popover open={filtroRocaProdutorOpen} onOpenChange={(o) => { setFiltroRocaProdutorOpen(o); if (!o) setFiltroRocaProdutorSearch(''); }} modal>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={filtroRocaProdutorOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {produtorIdRocas === ''
                                  ? 'Todos os produtores'
                                  : (() => {
                                      const p = produtores.find((x) => x.id === produtorIdRocas);
                                      return p ? `${p.codigo} – ${p.nome_razao}` : 'Todos os produtores';
                                    })()}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Buscar por nome ou código..."
                                value={filtroRocaProdutorSearch}
                                onValueChange={setFiltroRocaProdutorSearch}
                                className="h-10"
                              />
                              <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                                <CommandEmpty>Nenhum produtor encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="todos"
                                    onSelect={() => {
                                      setProdutorIdRocas('');
                                      setFiltroRocaProdutorOpen(false);
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', produtorIdRocas === '' ? 'opacity-100' : 'opacity-0')} />
                                    Todos os produtores
                                  </CommandItem>
                                  {produtoresFiltroRocaOrdenados.map((p) => (
                                    <CommandItem
                                      key={p.id}
                                      value={String(p.id)}
                                      onSelect={() => {
                                        setProdutorIdRocas(p.id);
                                        setFiltroRocaProdutorOpen(false);
                                      }}
                                    >
                                      <Check className={cn('mr-2 h-4 w-4', produtorIdRocas === p.id ? 'opacity-100' : 'opacity-0')} />
                                      {p.codigo} – {p.nome_razao}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="filtro-rocas-inativas"
                          checked={incluirRocasInativas}
                          onCheckedChange={setIncluirRocasInativas}
                        />
                        <Label htmlFor="filtro-rocas-inativas" className="cursor-pointer text-sm">
                          Exibir desativadas
                        </Label>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, código, localização ou produtor..."
                    className="pl-10"
                    value={searchRoca}
                    onChange={(e) => setSearchRoca(e.target.value)}
                  />
                </div>
                <Button variant="gradient" onClick={() => setOpenRoca(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Roça
                </Button>
              </div>
            </div>
            <div className="bg-card border rounded-xl overflow-x-auto min-w-0">
              {loadingRocas ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Produtor</TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden md:table-cell">
                        Qtd. colhida
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden lg:table-cell">
                        % colhida
                      </TableHead>
                      <TableHead className="w-[70px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRocas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {searchRoca.trim()
                            ? 'Nenhum resultado para a busca.'
                            : 'Nenhuma roça cadastrada'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRocas.map((r) => {
                        const prod = produtores.find((p) => p.id === r.produtorId);
                        return (
                          <TableRow
                            key={r.id}
                            className={r.ativo === false ? 'opacity-60 bg-muted/30' : ''}
                          >
                            <TableCell className="font-medium">
                              {r.codigo}
                              {r.ativo === false && (
                                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  Desativada
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{r.nome}</TableCell>
                            <TableCell className="max-w-[200px] truncate xl:max-w-none xl:overflow-visible xl:whitespace-normal xl:text-clip">
                              {r.localizacao || '—'}
                            </TableCell>
                            <TableCell>{prod ? `${prod.codigo} – ${prod.nome_razao}` : r.produtorId}</TableCell>
                            <TableCell className="text-right tabular-nums hidden md:table-cell">
                              {formatQuantidadeColhida(r.quantidadeColhidaTotal)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums hidden lg:table-cell">
                              {formatPercentualColhido(r.percentualColhido)}
                            </TableCell>
                            <TableCell className="text-right">
                              <TableRowActionsMenu icon="horizontal">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDetailRocaId(r.id);
                                      setOpenDetailRoca(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditRoca(r);
                                      setFormEditRoca({
                                        codigo: r.codigo,
                                        nome: r.nome,
                                        localizacao: r.localizacao ?? '',
                                        produtorId: r.produtorId,
                                        ativo: r.ativo ?? true,
                                        quantidadeMudasPlantadas: r.quantidadeMudasPlantadas ?? null,
                                        dataPlantio: r.dataPlantio ?? null,
                                        dataInicioColheita: r.dataInicioColheita ?? null,
                                        ...rocaEnderecoDeRegistro(r),
                                      });
                                      setOpenEditRoca(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  {r.ativo === false ? (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        updateRoca.mutate({
                                          id: r.id,
                                          data: { ativo: true },
                                        });
                                      }}
                                      disabled={updateRoca.isPending}
                                    >
                                      <Check className="w-4 h-4 mr-2" />
                                      Ativar
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setRocaToDelete(r);
                                        setOpenDeleteRoca(true);
                                      }}
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Desativar
                                    </DropdownMenuItem>
                                  )}
                              </TableRowActionsMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Tab Meeiros */}
          <TabsContent value="meeiros" className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por meeiro ou nome fantasia..."
                    className="pl-10"
                    value={searchMeeiro}
                    onChange={(e) => setSearchMeeiro(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFiltrosMeeiroOpen(true)}
                  style={
                    meeirosFiltrosAtivosCount > 0
                      ? { borderColor: 'var(--primary)', borderWidth: '2px' }
                      : {}
                  }
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {meeirosFiltrosAtivosCount > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {meeirosFiltrosAtivosCount}
                    </span>
                  )}
                </Button>
                <Sheet open={filtrosMeeiroOpen} onOpenChange={setFiltrosMeeiroOpen}>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Filter className="w-5 h-5 text-primary" />
                        </div>
                        <SheetTitle className="text-xl">Filtros de meeiros</SheetTitle>
                      </div>
                      <SheetDescription>Refine por produtor, roça e empréstimos</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Produtor</Label>
                        <Popover open={filtroMeeiroProdutorOpen} onOpenChange={(o) => { setFiltroMeeiroProdutorOpen(o); if (!o) setFiltroMeeiroProdutorSearch(''); }} modal>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={filtroMeeiroProdutorOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {produtorIdMeeiros === ''
                                  ? 'Todos os produtores'
                                  : (() => {
                                      const p = produtores.find((x) => x.id === produtorIdMeeiros);
                                      return p ? `${p.codigo} – ${p.nome_razao}` : 'Todos os produtores';
                                    })()}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Buscar por nome ou código..."
                                value={filtroMeeiroProdutorSearch}
                                onValueChange={setFiltroMeeiroProdutorSearch}
                                className="h-10"
                              />
                              <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                                <CommandEmpty>Nenhum produtor encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="todos"
                                    onSelect={() => {
                                      setProdutorIdMeeiros('');
                                      setRocaIdMeeiros('');
                                      setFiltroMeeiroId('');
                                      setFiltroMeeiroProdutorOpen(false);
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', produtorIdMeeiros === '' ? 'opacity-100' : 'opacity-0')} />
                                    Todos os produtores
                                  </CommandItem>
                                  {produtoresFiltroMeeiroOrdenados.map((p) => (
                                    <CommandItem
                                      key={p.id}
                                      value={String(p.id)}
                                      onSelect={() => {
                                        setProdutorIdMeeiros(p.id);
                                        setRocaIdMeeiros('');
                                        setFiltroMeeiroId('');
                                        setFiltroMeeiroProdutorOpen(false);
                                      }}
                                    >
                                      <Check className={cn('mr-2 h-4 w-4', produtorIdMeeiros === p.id ? 'opacity-100' : 'opacity-0')} />
                                      {p.codigo} – {p.nome_razao}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Roça (opcional)</Label>
                        <Popover open={filtroMeeiroRocaOpen} onOpenChange={(o) => { setFiltroMeeiroRocaOpen(o); if (!o) setFiltroMeeiroRocaSearch(''); }} modal>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={filtroMeeiroRocaOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {rocaIdMeeiros === ''
                                  ? 'Todas as roças'
                                  : (() => {
                                      const r = meeiroFiltroRocas.find((x) => x.id === rocaIdMeeiros);
                                      return r ? `${r.codigo ?? ''} – ${r.nome}`.trim() : 'Todas as roças';
                                    })()}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Buscar roça..."
                                value={filtroMeeiroRocaSearch}
                                onValueChange={setFiltroMeeiroRocaSearch}
                                className="h-10"
                              />
                              <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                                <CommandEmpty>Nenhuma roça encontrada.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="todas"
                                    onSelect={() => {
                                      setRocaIdMeeiros('');
                                      setFiltroMeeiroRocaOpen(false);
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', rocaIdMeeiros === '' ? 'opacity-100' : 'opacity-0')} />
                                    Todas as roças
                                  </CommandItem>
                                  {rocasFiltroMeeiroOrdenadas.map((r) => (
                                    <CommandItem
                                      key={r.id}
                                      value={String(r.id)}
                                      onSelect={() => {
                                        setRocaIdMeeiros(r.id);
                                        setFiltroMeeiroRocaOpen(false);
                                      }}
                                    >
                                      <Check className={cn('mr-2 h-4 w-4', rocaIdMeeiros === r.id ? 'opacity-100' : 'opacity-0')} />
                                      {r.codigo ? `${r.codigo} – ${r.nome}` : r.nome}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          Lista só meeiros com lançamento na roça. O valor “a receber” considera apenas essa roça.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Meeiro (opcional)</Label>
                        <Popover
                          open={filtroMeeiroItemOpen}
                          onOpenChange={(o) => {
                            setFiltroMeeiroItemOpen(o);
                            if (!o) setFiltroMeeiroItemSearch('');
                          }}
                          modal
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={filtroMeeiroItemOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate">
                                {filtroMeeiroId === ''
                                  ? 'Todos os meeiros'
                                  : (() => {
                                      const m = meeiros.find((x) => x.id === filtroMeeiroId);
                                      return m ? `${m.codigo ?? ''} – ${m.nome ?? ''}`.trim() : 'Todos os meeiros';
                                    })()}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Buscar meeiro..."
                                value={filtroMeeiroItemSearch}
                                onValueChange={setFiltroMeeiroItemSearch}
                                className="h-10"
                              />
                              <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                                <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="todos"
                                    onSelect={() => {
                                      setFiltroMeeiroId('');
                                      setFiltroMeeiroItemOpen(false);
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', filtroMeeiroId === '' ? 'opacity-100' : 'opacity-0')} />
                                    Todos os meeiros
                                  </CommandItem>
                                  {meeirosFiltroPainelOrdenados.map((m) => (
                                    <CommandItem
                                      key={m.id}
                                      value={String(m.id)}
                                      onSelect={() => {
                                        setFiltroMeeiroId(m.id);
                                        setFiltroMeeiroItemOpen(false);
                                      }}
                                    >
                                      <Check className={cn('mr-2 h-4 w-4', filtroMeeiroId === m.id ? 'opacity-100' : 'opacity-0')} />
                                      <span className="truncate">
                                        {m.codigo ?? ''} – {m.nome ?? ''}
                                        {m.nomeFantasia?.trim() ? ` (${m.nomeFantasia})` : ''}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="filtro-com-emprestimos"
                          checked={apenasComEmprestimosMeeiros}
                          onCheckedChange={(c) => setApenasComEmprestimosMeeiros(!!c)}
                        />
                        <Label htmlFor="filtro-com-emprestimos" className="text-sm font-normal cursor-pointer">
                          Apenas meeiros com empréstimos em aberto
                        </Label>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="gap-2 shrink-0">
                      <ClipboardList className="w-4 h-4" />
                      Cadastro incompleto
                      <ChevronDown className="w-4 h-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="bottom" className="z-[100]">
                    <DropdownMenuItem
                      onClick={() => {
                        setMeeiroIncompletoDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver na tela
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          await controleRocaService.printRelatorioMeeirosCadastroIncompletoPdf();
                        } catch (e: unknown) {
                          const err = e as { message?: string; response?: { data?: { message?: string } } };
                          toast.error(err?.response?.data?.message || err?.message || 'Erro ao abrir PDF');
                        }
                      }}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          await controleRocaService.downloadRelatorioMeeirosCadastroIncompletoPdf();
                          toast.success('PDF baixado');
                        } catch (e: unknown) {
                          const err = e as { message?: string; response?: { data?: { message?: string } } };
                          toast.error(err?.response?.data?.message || err?.message || 'Erro ao gerar PDF');
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="gradient" onClick={() => setOpenMeeiro(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Meeiro
                </Button>
              </div>
            </div>
            <Dialog open={meeiroIncompletoDialogOpen} onOpenChange={setMeeiroIncompletoDialogOpen}>
              <DialogContent className="max-w-lg sm:max-w-xl w-[calc(100vw-2rem)] max-h-[min(90vh,720px)] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-4 pt-5 pb-3 sm:px-6 shrink-0 border-b border-border/60 text-left">
                  <DialogTitle className="text-lg sm:text-xl pr-8">Meeiros com cadastro incompleto</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm leading-relaxed">
                    Falta ao menos um destes dados: CPF, telefone, chave PIX ou endereço. Imprimir ou baixar o PDF abre
                    a planilha completa — no leitor, use o menu Imprimir ou Ctrl+P.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 sm:px-6">
                  {loadingMeeirosIncompleto ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (meeirosCadastroIncompleto?.itens ?? []).length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-10">
                      Todos os meeiros estão com esses campos preenchidos.
                    </p>
                  ) : (
                    <ul className="space-y-2.5 min-w-0">
                      {(meeirosCadastroIncompleto?.itens ?? []).map((row) => {
                        const pend = (row.camposPendentes ?? []).map(labelCampoMeeiroPendente).join(', ');
                        return (
                          <li
                            key={row.meeiroId}
                            className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 text-sm min-w-0 text-center"
                          >
                            <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 min-w-0">
                              <span className="font-mono text-xs font-semibold tabular-nums shrink-0 bg-background/80 px-1.5 py-0.5 rounded border border-border/60">
                                {row.codigo}
                              </span>
                              <span
                                className="font-medium text-foreground max-w-[min(100%,28rem)] truncate"
                                title={row.nome}
                              >
                                {row.nome}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 break-words">
                              <span className="font-medium text-foreground/80">Produtor:</span>{' '}
                              {row.produtorNome?.trim() ? row.produtorNome : '—'}
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-400 mt-1.5 break-words leading-snug">
                              <span className="font-semibold">Falta preencher:</span> {pend}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <DialogFooter className="px-4 py-3 sm:px-6 border-t border-border/60 shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:flex-wrap">
                  <Button type="button" variant="secondary" onClick={() => setMeeiroIncompletoDialogOpen(false)}>
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await controleRocaService.downloadRelatorioMeeirosCadastroIncompletoPdf();
                        toast.success('PDF baixado');
                      } catch (e: unknown) {
                        const err = e as { message?: string; response?: { data?: { message?: string } } };
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao gerar PDF');
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await controleRocaService.printRelatorioMeeirosCadastroIncompletoPdf();
                      } catch (e: unknown) {
                        const err = e as { message?: string; response?: { data?: { message?: string } } };
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao abrir PDF');
                      }
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="bg-card border rounded-xl overflow-x-auto min-w-0">
              {loadingMeeiros ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-center whitespace-nowrap min-w-[7rem]">Mudas plantadas</TableHead>
                      <TableHead>Nome fantasia</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>% padrão</TableHead>
                      <TableHead>Valor emba</TableHead>
                      <TableHead className="w-[70px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meeirosOrdenados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhum meeiro cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      meeirosOrdenados.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.codigo}</TableCell>
                          <TableCell className="max-w-[min(320px,55vw)]">
                            <span className="block truncate" title={m.nome}>
                              {m.nome}
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums font-medium">
                            {m.quantidadeMudasPlantadas != null
                              ? String(m.quantidadeMudasPlantadas)
                              : '—'}
                          </TableCell>
                          <TableCell className="max-w-[min(280px,45vw)]">
                            <span className="block truncate" title={m.nomeFantasia || '—'}>
                              {m.nomeFantasia || '—'}
                            </span>
                          </TableCell>
                          <TableCell>{m.cpf || '—'}</TableCell>
                          <TableCell>{m.telefone || '—'}</TableCell>
                          <TableCell>{m.porcentagem_padrao}%</TableCell>
                          <TableCell>
                            {formatCurrency(valorDeEmbaPadraoDeMeeiro(m))}
                          </TableCell>
                          <TableCell className="text-right">
                            <TableRowActionsMenu icon="horizontal">
                                                <DropdownMenuItem
                                  onClick={() => {
                                    setDetailMeeiroId(m.id);
                                    setOpenDetailMeeiro(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDetailMeeiroId(m.id);
                                    setOpenDetailMeeiro(true);
                                  }}
                                >
                                  <Wallet className="w-4 h-4 mr-2" />
                                  Gerenciar Empréstimos
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditMeeiro(m);
                                    setFormEditMeeiro({
                                      codigo: m.codigo,
                                      nome: m.nome,
                                      nomeFantasia: m.nomeFantasia ?? '',
                                      cpf: m.cpf ?? '',
                                      telefone: m.telefone ?? '',
                                      pixChave: m.pixChave ?? '',
                                      endereco: m.endereco ?? '',
                                      quantidadeMudasPlantadas: m.quantidadeMudasPlantadas ?? null,
                                      porcentagem_padrao: m.porcentagem_padrao,
                                      valor_de_emba_padrao:
                                        valorDeEmbaPadraoDeMeeiro(m),
                                      produtorId: m.produtorId,
                                    });
                                    setOpenEditMeeiro(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        'Tem certeza que deseja excluir este meeiro? Essa ação não pode ser desfeita.',
                                      )
                                    ) {
                                      deleteMeeiro.mutate(m.id);
                                    }
                                  }}
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                            </TableRowActionsMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Tab Produtos — lista unificada (todos os produtos do sistema) */}
          <TabsContent value="produtos" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou SKU..."
                    className="pl-10"
                    value={searchProdutoCatalogo}
                    onChange={(e) => setSearchProdutoCatalogo(e.target.value)}
                  />
                </div>
                <Button variant="gradient" onClick={() => setOpenProduto(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Todos os produtos do sistema em uma única lista (incluindo os cadastrados no Controle de Roça).
            </p>
            <div className="bg-card border rounded-xl overflow-x-auto min-w-0">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
                <div>
                  <h3 className="text-sm font-semibold">Catálogo de produtos</h3>
                  <p className="text-xs text-muted-foreground">
                    Lista unificada — todos os produtos, independente de produtor.
                  </p>
                </div>
              </div>
              {loadingProdutosCatalogo ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Código / SKU</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Pr. compra prod</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead className="text-right w-[140px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosCatalogoFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            {searchProdutoCatalogo.trim()
                              ? 'Nenhum resultado para a busca.'
                              : 'Nenhum produto cadastrado. Use "Novo Produto" para cadastrar.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        produtosCatalogoPagina.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.nome}</TableCell>
                            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                            <TableCell>{p.unidade_medida || '—'}</TableCell>
                            <TableCell>{formatCurrency(p.preco_venda ?? 0)}</TableCell>
                            <TableCell>{p.estoque_atual ?? 0}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => {
                                  setProdutoPreselecionadoLancamento({
                                    id: p.id,
                                    nome: p.nome,
                                  });
                                  setTab('lancamentos');
                                  setOpenLancamento(true);
                                }}
                              >
                                <ClipboardList className="w-4 h-4" />
                                Fazer lançamento
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {produtosCatalogoFiltrados.length > CATALOG_PAGE_SIZE && (
                    <div className="border-t px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        Mostrando{' '}
                        {produtosCatalogoFiltrados.length > 0
                          ? (catalogPage - 1) * CATALOG_PAGE_SIZE + 1
                          : 0}{' '}
                        a{' '}
                        {Math.min(catalogPage * CATALOG_PAGE_SIZE, produtosCatalogoFiltrados.length)} de{' '}
                        {produtosCatalogoFiltrados.length}{' '}
                        produtos
                      </div>
                      <Pagination className="justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCatalogPage((prev) => Math.max(1, prev - 1));
                              }}
                              className={catalogPage === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCatalogPage((prev) =>
                                  Math.min(totalCatalogPages, prev + 1),
                                );
                              }}
className={
                          catalogPage === totalCatalogPages
                            ? 'pointer-events-none opacity-50'
                            : ''
                        }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Tab Lançamentos */}
          <TabsContent value="lancamentos" className="space-y-4">
            {/* Barra de pesquisa e filtros - mesmo design de Produtos */}
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFiltrosLancamentoOpen(true)}
                  style={
                    temFiltrosLancamentoAtivos
                      ? { borderColor: 'var(--primary)', borderWidth: '2px' }
                      : {}
                  }
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {temFiltrosLancamentoAtivos && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {[
                        filtrosLancamento.produtorId,
                        filtrosLancamento.rocaId,
                        filtrosLancamento.meeiroId,
                        filtrosLancamento.produto.trim(),
                        filtrosLancamento.dataInicio,
                        filtrosLancamento.dataFim,
                      ].filter((v) => v !== '').length}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    setLancOrdenacao((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                  }
                >
                  {lancOrdenacao === 'desc'
                    ? 'Mais recentes primeiro'
                    : 'Mais antigos primeiro'}
                </Button>
                <Sheet open={filtrosLancamentoOpen} onOpenChange={setFiltrosLancamentoOpen}>
                  <SheetContent
                    side="right"
                    className="w-[400px] sm:w-[540px] overflow-y-auto"
                  >
                <SheetHeader className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Filter className="w-5 h-5 text-primary" />
                    </div>
                    <SheetTitle className="text-xl">Filtros de lançamentos</SheetTitle>
                  </div>
                  <SheetDescription>Refine sua busca</SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Produtor */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Produtor</Label>
                    <Popover open={filtroProdutorOpen} onOpenChange={(o) => { setFiltroProdutorOpen(o); if (!o) setFiltroProdutorSearch(''); }} modal>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={filtroProdutorOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {filtrosLancamento.produtorId === ''
                              ? 'Todos os produtores'
                              : (() => {
                                  const p = produtores.find((x) => x.id === filtrosLancamento.produtorId);
                                  return p ? `${p.codigo} – ${p.nome_razao}` : 'Todos os produtores';
                                })()}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome ou código..."
                            value={filtroProdutorSearch}
                            onValueChange={setFiltroProdutorSearch}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhum produtor encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="todos"
                                onSelect={() => {
                                  setFiltrosLancamento((prev) => ({ ...prev, produtorId: '' }));
                                  setFiltroProdutorOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', filtrosLancamento.produtorId === '' ? 'opacity-100' : 'opacity-0')} />
                                Todos os produtores
                              </CommandItem>
                              {produtoresFiltroOrdenados.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={String(p.id)}
                                  onSelect={() => {
                                    setFiltrosLancamento((prev) => ({ ...prev, produtorId: p.id }));
                                    setFiltroProdutorOpen(false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', filtrosLancamento.produtorId === p.id ? 'opacity-100' : 'opacity-0')} />
                                  {p.codigo} – {p.nome_razao}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator />

                  {/* Produto */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Produto</Label>
                    <Popover open={filtroProdutoOpen} onOpenChange={(o) => { setFiltroProdutoOpen(o); if (!o) setFiltroProdutoSearch(''); }} modal>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={filtroProdutoOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {filtrosLancamento.produto.trim() === ''
                              ? 'Todos os produtos'
                              : filtrosLancamento.produto}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome do produto..."
                            value={filtroProdutoSearch}
                            onValueChange={setFiltroProdutoSearch}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="todos"
                                onSelect={() => {
                                  setFiltrosLancamento((prev) => ({ ...prev, produto: '' }));
                                  setFiltroProdutoOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', filtrosLancamento.produto.trim() === '' ? 'opacity-100' : 'opacity-0')} />
                                Todos os produtos
                              </CommandItem>
                              {produtosFiltroOrdenados.map((p: any) => (
                                <CommandItem
                                  key={p.id}
                                  value={String(p.nome)}
                                  onSelect={() => {
                                    setFiltrosLancamento((prev) => ({ ...prev, produto: p.nome ?? '' }));
                                    setFiltroProdutoOpen(false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', filtrosLancamento.produto === (p.nome ?? '') ? 'opacity-100' : 'opacity-0')} />
                                  {p.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator />

                  {/* Roça */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Roça</Label>
                    <Popover open={filtroRocaOpen} onOpenChange={(o) => { setFiltroRocaOpen(o); if (!o) setFiltroRocaSearch(''); }} modal>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={filtroRocaOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {filtrosLancamento.rocaId === ''
                              ? 'Todas as roças'
                              : rocasParaFiltroLancamento.find((r) => r.id === filtrosLancamento.rocaId)?.nome ?? 'Todas as roças'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome da roça..."
                            value={filtroRocaSearch}
                            onValueChange={setFiltroRocaSearch}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhuma roça encontrada.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="todas"
                                onSelect={() => {
                                  setFiltrosLancamento((prev) => ({ ...prev, rocaId: '' }));
                                  setFiltroRocaOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', filtrosLancamento.rocaId === '' ? 'opacity-100' : 'opacity-0')} />
                                Todas as roças
                              </CommandItem>
                              {rocasFiltroOrdenadas.map((r) => (
                                <CommandItem
                                  key={r.id}
                                  value={String(r.id)}
                                  onSelect={() => {
                                    setFiltrosLancamento((prev) => ({ ...prev, rocaId: r.id }));
                                    setFiltroRocaOpen(false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', filtrosLancamento.rocaId === r.id ? 'opacity-100' : 'opacity-0')} />
                                  {r.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator />

                  {/* Meeiro */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Meeiro</Label>
                    <Popover open={filtroMeeiroOpen} onOpenChange={(o) => { setFiltroMeeiroOpen(o); if (!o) setFiltroMeeiroSearch(''); }} modal>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={filtroMeeiroOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {filtrosLancamento.meeiroId === ''
                              ? 'Todos os meeiros'
                              : meeirosParaRelatorio.find((m) => Number(m.id) === Number(filtrosLancamento.meeiroId))?.nome ?? 'Todos os meeiros'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome do meeiro..."
                            value={filtroMeeiroSearch}
                            onValueChange={setFiltroMeeiroSearch}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="todos"
                                onSelect={() => {
                                  setFiltrosLancamento((prev) => ({ ...prev, meeiroId: '' }));
                                  setFiltroMeeiroOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', filtrosLancamento.meeiroId === '' ? 'opacity-100' : 'opacity-0')} />
                                Todos os meeiros
                              </CommandItem>
                              {meeirosParaFiltroLancamentoOrdenados.map((m) => (
                                <CommandItem
                                  key={m.meeiroId}
                                  value={String(m.meeiroId)}
                                  onSelect={() => {
                                    setFiltrosLancamento((prev) => ({ ...prev, meeiroId: m.meeiroId }));
                                    setFiltroMeeiroOpen(false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', Number(filtrosLancamento.meeiroId) === m.meeiroId ? 'opacity-100' : 'opacity-0')} />
                                  {m.codigo ? `${m.codigo} – ${m.nome}` : m.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator />

                  {/* Data */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      DATA
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={
                          (() => {
                            const hoje = new Date().toISOString().slice(0, 10);
                            return filtrosLancamento.dataInicio === hoje && filtrosLancamento.dataFim === hoje
                              ? 'default'
                              : 'outline';
                          })()
                        }
                        size="sm"
                        onClick={() => {
                          const hoje = new Date().toISOString().slice(0, 10);
                          setFiltrosLancamento((prev) => ({
                            ...prev,
                            dataInicio: hoje,
                            dataFim: hoje,
                          }));
                        }}
                      >
                        Hoje
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const d = new Date();
                          const fim = d.toISOString().slice(0, 10);
                          const ini = new Date(d);
                          ini.setDate(ini.getDate() - 6);
                          setFiltrosLancamento((prev) => ({
                            ...prev,
                            dataInicio: ini.toISOString().slice(0, 10),
                            dataFim: fim,
                          }));
                        }}
                      >
                        Esta semana
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const d = new Date();
                          const ano = d.getFullYear();
                          const mes = d.getMonth();
                          const primeiro = new Date(ano, mes, 1).toISOString().slice(0, 10);
                          const ultimo = new Date(ano, mes + 1, 0).toISOString().slice(0, 10);
                          setFiltrosLancamento((prev) => ({
                            ...prev,
                            dataInicio: primeiro,
                            dataFim: ultimo,
                          }));
                        }}
                      >
                        Este mês
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFiltrosLancamento((prev) => ({
                            ...prev,
                            dataInicio: '',
                            dataFim: '',
                          }));
                        }}
                      >
                        Limpar datas
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data Inicial</Label>
                        <Input
                          type="date"
                          value={filtrosLancamento.dataInicio}
                          onChange={(e) =>
                            setFiltrosLancamento((prev) => ({
                              ...prev,
                              dataInicio: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data Final</Label>
                        <Input
                          type="date"
                          value={filtrosLancamento.dataFim}
                          onChange={(e) =>
                            setFiltrosLancamento((prev) => ({
                              ...prev,
                              dataFim: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Botões de ação */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => setFiltrosLancamentoOpen(false)}
                      className="flex-1"
                      variant="gradient"
                    >
                      Aplicar Filtros
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFiltrosLancamento({
                          produtorId: '',
                          rocaId: '',
                          meeiroId: '',
                          produto: '',
                          dataInicio: '',
                          dataFim: '',
                        });
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
                  </SheetContent>
                </Sheet>
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por roça, meeiro ou produto..."
                    className="pl-10"
                    value={searchLancamento}
                    onChange={(e) => setSearchLancamento(e.target.value)}
                  />
                </div>
                {lancamentosSelecionados.size > 0 && (
                  <Button
                    variant="outline"
                    className="shrink-0 border-primary text-primary hover:bg-primary/10"
                    onClick={() => setOpenReajuste(true)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Reajustar valor ({lancamentosSelecionados.size})
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="shrink-0 gap-2"
                  onClick={() => setRelLancamentosSheetOpen(true)}
                >
                  <Files className="w-4 h-4" />
                  Relatórios de lançamento
                </Button>
                <Button
                  variant="gradient"
                  className="shrink-0"
                  onClick={() => {
                    setLancData(new Date().toISOString().slice(0, 10));
                    setOpenLancamento(true);
                  }}
                  disabled={produtores.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lançamento
                </Button>
              </div>
            </div>

            {/* Resumo: quantidade de lançamentos, soma dos produtos e valor total no período */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
              <span className="font-medium text-foreground">
                <span className="text-muted-foreground">Lançamentos no período:</span>{' '}
                {filteredLancamentos.length}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="font-medium text-foreground">
                <span className="text-muted-foreground">Soma dos produtos (qtde):</span>{' '}
                {somaQuantidadeFiltrada.toLocaleString('pt-BR')}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="font-medium text-foreground">
                <span className="text-muted-foreground">Valor total:</span>{' '}
                {formatCurrency(valorTotalFiltrado)}
              </span>
            </div>

            <div className="bg-card border rounded-xl min-w-0 overflow-hidden">
              {loadingLancamentos ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full min-w-[76rem] table-fixed text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 min-w-10 max-w-10 px-1 sticky left-0 z-40 bg-card border-r border-border shadow-[1px_0_0_0_hsl(var(--border))]">
                        <Checkbox
                          checked={
                            lancamentosPagina.length > 0 &&
                            lancamentosPagina.every((l) => lancamentosSelecionados.has(l.id))
                          }
                          onCheckedChange={toggleSelecionarTodosLancamentos}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead className="min-w-[5.25rem] w-[7%] whitespace-nowrap px-2">Data</TableHead>
                      <TableHead className="min-w-[7rem] w-[11%] whitespace-nowrap px-2">Roça</TableHead>
                      <TableHead className="min-w-[6rem] w-[12%] whitespace-nowrap px-2">Produtos</TableHead>
                      <TableHead className="min-w-[3rem] w-[5%] whitespace-nowrap px-1 text-center">Qtde</TableHead>
                      <TableHead className="min-w-[5rem] w-[8%] whitespace-nowrap text-right px-2">Preço compra</TableHead>
                      <TableHead className="min-w-[6.5rem] w-[12%] whitespace-nowrap px-2 text-center">Meeiro</TableHead>
                      <TableHead className="min-w-[4.75rem] w-[6%] text-center whitespace-nowrap py-2 px-2">
                        % meeiro
                      </TableHead>
                      <TableHead className="min-w-[4.75rem] w-[6%] text-center whitespace-nowrap py-2 px-2">
                        R$ emba
                      </TableHead>
                      <TableHead
                        className="min-w-[8rem] w-[11%] text-right whitespace-nowrap px-2 sm:px-3"
                        title="Valor do meeiro"
                      >
                        Valor meeiro
                      </TableHead>
                      <TableHead className="min-w-[6.5rem] w-[10%] text-right whitespace-nowrap px-2 sm:px-3">
                        Valor total
                      </TableHead>
                      <TableHead className="w-[72px] min-w-[72px] max-w-[72px] text-right pl-2 pr-3 sticky right-0 z-20 bg-card border-l border-border">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentosPagina.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                          Nenhum lançamento no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      linhasExpandidas.map(({ l, item, itemIndex, rowKey }) => {
                        const roca = rocasParaLancamento.find((r) => r.id === l.rocaId);
                        const isPrimeiraLinhaDoLancamento = itemIndex === 0;
                        const valorTotalItem = item ? (Number(item.valor_total) || 0) : 0;
                        const meeirosDoItem = item?.meeiros ?? [];
                        const nomeRoca =
                          roca?.nome ?? l.rocaNome?.trim() ?? String(l.rocaId);
                        return (
                          <TableRow key={rowKey} className="group/lanc">
                            <TableCell className="w-10 min-w-10 max-w-10 px-1 sticky left-0 z-30 bg-card group-hover/lanc:bg-muted/50 border-r border-border align-middle shadow-[1px_0_0_0_hsl(var(--border))]">
                              <Checkbox
                                checked={lancamentosSelecionados.has(l.id)}
                                onCheckedChange={() => toggleSelecionarLancamento(l.id)}
                                aria-label={`Selecionar lançamento ${l.id}`}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">{formatDate(l.data)}</TableCell>
                            <TableCell className="max-w-0 min-w-0 overflow-hidden px-2">
                              <span
                                className="block truncate whitespace-nowrap"
                                title={nomeRoca}
                              >
                                {nomeRoca}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-0 min-w-0 overflow-hidden px-2">
                              {item ? (
                                <span
                                  className="block truncate whitespace-nowrap"
                                  title={item.produto}
                                >
                                  {item.produto}
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-center tabular-nums">
                              {item != null ? item.quantidade : '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {item != null ? formatCurrency(item.preco_unitario ?? 0) : '—'}
                            </TableCell>
                            <TableCell className="max-w-0 min-w-0 overflow-hidden px-2 text-center">
                              {meeirosDoItem.length === 0
                                ? '—'
                                : (
                                    <>
                                      {meeirosDoItem.map((m, i) => {
                                        const nomeMeeiro = m.meeiroNome ?? `ID ${m.meeiroId}`;
                                        return (
                                          <div key={i} className="truncate text-center" title={nomeMeeiro}>
                                            {nomeMeeiro}
                                          </div>
                                        );
                                      })}
                                    </>
                                  )}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap py-2 px-2 tabular-nums">
                              {meeirosDoItem.length === 0
                                ? '—'
                                : meeirosDoItem.map((m, i) => (
                                    <div key={i}>{m.porcentagem ?? 0}%</div>
                                  ))}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap py-2 px-2 tabular-nums">
                              {meeirosDoItem.length === 0
                                ? '—'
                                : meeirosDoItem.map((m, i) => (
                                    <div key={i}>
                                      {formatCurrency(
                                        Number(
                                          m.valor_de_emba ??
                                            m.valorDeEmba ??
                                            VALOR_DE_EMBA_PADRAO,
                                        ),
                                      )}
                                    </div>
                                  ))}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap px-2 sm:px-3 tabular-nums">
                              {meeirosDoItem.length === 0
                                ? '—'
                                : meeirosDoItem.map((m, i) => (
                                    <div
                                      key={i}
                                      className="truncate"
                                      title={formatCurrency(m.valor_parte ?? 0)}
                                    >
                                      {formatCurrency(m.valor_parte ?? 0)}
                                    </div>
                                  ))}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap px-2 sm:px-3 tabular-nums font-medium">
                              {item != null ? formatCurrency(valorTotalItem) : formatCurrency(Number(l.total_geral))}
                            </TableCell>
                            <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right p-2 sticky right-0 z-10 bg-card group-hover/lanc:bg-muted/50 align-middle border-l border-border">
                              <TableRowActionsMenu icon="horizontal">
                                  <DropdownMenuItem
                                    onClick={() => setDetalheLancamentoId(l.id)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setEditLancamentoId(l.id)}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setLancamentoParaExcluirId(l.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                              </TableRowActionsMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </div>
            {!loadingLancamentos && totalLancamentosLista > 0 && (
              <div className="border-t border-border p-4">
                {totalLancPages > 1 && (
                  <Pagination className="justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setLancPage((prev) => Math.max(1, prev - 1));
                          }}
                          className={
                            lancPage === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalLancPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalLancPages <= 5) {
                          pageNum = i + 1;
                        } else if (lancPage <= 3) {
                          pageNum = i + 1;
                        } else if (lancPage >= totalLancPages - 2) {
                          pageNum = totalLancPages - 4 + i;
                        } else {
                          pageNum = lancPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setLancPage(pageNum);
                              }}
                              isActive={lancPage === pageNum}
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
                          onClick={(e) => {
                            e.preventDefault();
                            setLancPage((prev) =>
                              Math.min(totalLancPages, prev + 1)
                            );
                          }}
                          className={
                            lancPage === totalLancPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
                <div
                  className={cn(
                    'text-center text-sm text-muted-foreground',
                    totalLancPages > 1 && 'mt-2'
                  )}
                >
                  Mostrando{' '}
                  {totalLancamentosLista > 0
                    ? (lancPage - 1) * LANC_PAGE_SIZE + 1
                    : 0}{' '}
                  a{' '}
                  {Math.min(
                    lancPage * LANC_PAGE_SIZE,
                    totalLancamentosLista
                  )}{' '}
                  de {totalLancamentosLista} lançamentos
                  {totalLancPages > 1
                    ? ` · Página ${lancPage} de ${totalLancPages}`
                    : ''}
                </div>
              </div>
            )}

            {/* Dialog Ver detalhes do lançamento - mesmo design de Visualizar Produtor */}
            <Dialog
              open={detalheLancamentoId != null}
              onOpenChange={(open) => !open && setDetalheLancamentoId(null)}
            >
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Visualizar Lançamento
                  </DialogTitle>
                  <DialogDescription>
                    Informações completas do lançamento: data, roça, produtos e meeiros.
                  </DialogDescription>
                </DialogHeader>
                {detalheLancamentoId != null && (
                  <>
                    {!detalheLancamento ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-8 mt-6">
                        {/* Informações do lançamento */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Informações do Lançamento
                          </h3>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label className="text-sm text-muted-foreground">Data</Label>
                              <p className="font-medium text-base">
                                {formatDate(detalheLancamento.data)}
                              </p>
                            </div>
                            <div className="space-y-3">
                              <Label className="text-sm text-muted-foreground">Roça</Label>
                              <p className="font-medium text-base">
                                {rocasParaLancamento.find((r) => r.id === detalheLancamento.rocaId)?.nome ??
                                  detalheLancamento.rocaNome?.trim() ??
                                  detalheLancamento.rocaId}
                              </p>
                            </div>
                            <div className="space-y-3">
                              <Label className="text-sm text-muted-foreground">Total geral</Label>
                              <p className="font-medium text-base text-primary font-semibold">
                                {formatCurrency(Number(detalheLancamento.total_geral))}
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground">Status</Label>
                                <span
                                  className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${
                                    detalheLancamento.ativo !== false
                                      ? 'bg-green-500/10 text-green-500'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {detalheLancamento.ativo !== false ? 'ATIVO' : 'INATIVO'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Produtos e meeiros por item */}
                        {detalheLancamento.itens && detalheLancamento.itens.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Package className="w-5 h-5 text-primary" />
                              Produtos e participação dos meeiros
                            </h3>
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead>Qtd</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">
                                      Pés (1/lanç.)
                                    </TableHead>
                                    <TableHead className="text-right">Preço compra</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {detalheLancamento.itens.map((item, i) => (
                                    <React.Fragment key={i}>
                                      <TableRow>
                                        <TableCell className="font-medium">{item.produto}</TableCell>
                                        <TableCell>{item.unidade_medida || 'UN'}</TableCell>
                                        <TableCell>{item.quantidade}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                          {item.quantidadePesColhidos != null
                                            ? item.quantidadePesColhidos
                                            : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(item.preco_unitario ?? 0)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatCurrency(item.valor_total ?? 0)}
                                        </TableCell>
                                      </TableRow>
                                      <TableRow>
                                        <TableCell colSpan={6} className="bg-muted/30 p-0">
                                          <div className="px-4 py-3 border-t border-border/50">
                                            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-6 gap-y-1 text-sm text-muted-foreground items-baseline">
                                              <span className="font-medium text-foreground/80">Meeiro</span>
                                              <span className="font-medium text-foreground/80 text-right">% meeiro</span>
                                              <span className="font-medium text-foreground/80 text-right">R$ emba</span>
                                              <span className="font-medium text-foreground/80 text-right">Valor</span>
                                              {(item.meeiros ?? []).length === 0 ? (
                                                <span className="col-span-4 text-muted-foreground">—</span>
                                              ) : (
                                                <>
                                                  {(item.meeiros ?? []).map((m, j) => (
                                                    <React.Fragment key={j}>
                                                      <span>{m.meeiroNome ?? m.meeiroId}</span>
                                                      <span className="text-right">{m.porcentagem}%</span>
                                                      <span className="text-right">
                                                        {formatCurrency(
                                                          Number(
                                                            m.valor_de_emba ??
                                                              m.valorDeEmba ??
                                                              VALOR_DE_EMBA_PADRAO,
                                                          ),
                                                        )}
                                                      </span>
                                                      <span className="text-right">{formatCurrency(m.valor_parte)}</span>
                                                    </React.Fragment>
                                                  ))}
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    </React.Fragment>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {detalheLancamento && detalheLancamentoId != null && (
                      <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setDetalheLancamentoId(null)}
                        >
                          Fechar
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => {
                            setDetalheLancamentoId(null);
                            setEditLancamentoId(detalheLancamentoId);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </DialogContent>
            </Dialog>

            {/* Dialog Editar lançamento */}
            <Dialog
              open={editLancamentoId != null}
              onOpenChange={(open) => !open && setEditLancamentoId(null)}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 space-y-1 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Pencil className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">Editar lançamento</DialogTitle>
                      <DialogDescription className="mt-0.5">
                        Altere data, roça, meeiros e produtos. Salve para aplicar.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                {editLancamentoId != null && (
                  <>
                    {!editLancamento ? (
                      <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="p-6 space-y-8">
                        {/* Seção: Informações do lançamento */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">
                              Informações do lançamento
                            </h3>
                          </div>
                          <div className="rounded-xl border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Data</Label>
                              <Input
                                type="date"
                                value={editLancData}
                                onChange={(e) => setEditLancData(e.target.value)}
                                className="h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Roça</Label>
                              <Select
                                value={editLancRocaId === '' ? '' : String(editLancRocaId)}
                                onValueChange={(v) =>
                                  setEditLancRocaId(v === '' ? '' : Number(v))
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Selecione a roça" />
                                </SelectTrigger>
                                <SelectContent>
                                  {rocasParaEdit.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
                                      {r.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </section>

                        {/* Seção: Meeiros participantes */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">
                              Meeiros participantes
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground -mt-2">
                            A porcentagem de cada meeiro é definida ao lado de cada produto abaixo.
                          </p>
                          <div className="rounded-xl border bg-card p-4 space-y-4">
                            {editLancMeeiros.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {editLancMeeiros.map((m, idx) => (
                                  <div
                                    key={idx}
                                    className="inline-flex items-center gap-2 rounded-lg border bg-background pl-3 pr-1 py-1.5 text-sm"
                                  >
                                    <span className="font-medium">
                                      {m.nome ??
                                        meeirosParaEdit.find(
                                          (x) => Number(x.id) === Number(m.meeiroId)
                                        )?.nome ??
                                        m.meeiroId}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => {
                                        setEditLancMeeiros((prev) =>
                                          prev.filter((_, i) => i !== idx)
                                        );
                                        setEditLancProdutos((prev) =>
                                          prev.map((p) => ({
                                            ...p,
                                            meeiros: (p.meeiros ?? []).filter(
                                              (mm) => mm.meeiroId !== m.meeiroId
                                            ),
                                          }))
                                        );
                                      }}
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                              <Select
                                value={editLancMeeiroSelecionado}
                                onValueChange={(v) => setEditLancMeeiroSelecionado(v)}
                              >
                                <SelectTrigger className="h-10 flex-1 min-w-[180px] max-w-[240px]">
                                  <SelectValue placeholder="Selecione um meeiro para adicionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {meeirosParaEdit
                                    .filter(
                                      (x) =>
                                        !editLancMeeiros.some(
                                          (m) => Number(m.meeiroId) === Number(x.id)
                                        )
                                    )
                                    .map((x) => (
                                      <SelectItem key={x.id} value={String(x.id)}>
                                        {x.nome} ({x.porcentagem_padrao}%)
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-10 shrink-0"
                                onClick={() => {
                                  const id = Number(editLancMeeiroSelecionado);
                                  const m = meeirosParaEdit.find((x) => Number(x.id) === id);
                                  if (!m) return;
                                  const pctEmb = valorDeEmbaPadraoDeMeeiro(m);
                                  setEditLancMeeiros((prev) => [
                                    ...prev,
                                    {
                                      meeiroId: m.id,
                                      porcentagem: m.porcentagem_padrao,
                                      nome: m.nome,
                                    },
                                  ]);
                                  setEditLancProdutos((prev) =>
                                    prev.map((p) => ({
                                      ...p,
                                      meeiros: [
                                        ...(p.meeiros ?? []),
                                        {
                                          meeiroId: m.id,
                                          nome: m.nome,
                                          porcentagem: m.porcentagem_padrao,
                                          valor_de_emba: pctEmb,
                                        },
                                      ],
                                    }))
                                  );
                                  setEditLancMeeiroSelecionado('');
                                }}
                                disabled={!editLancMeeiroSelecionado}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        </section>

                        {/* Seção: Produtos */}
                        <section className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">
                              Produtos (porcentagem por meeiro ao lado de cada um)
                            </h3>
                          </div>
                          <div className="rounded-xl border bg-card divide-y max-h-80 overflow-y-auto">
                            {editLancProdutos.map((item, idx) => {
                              const valorItem = item.quantidade * item.preco_unitario;
                              return (
                                <div
                                  key={idx}
                                  className="p-4 space-y-4 first:pt-4 last:pb-4 bg-background hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1 min-w-0">
                                      <p className="font-semibold text-foreground truncate">
                                        {item.nome ?? item.produtoId}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                          <Label className="text-muted-foreground text-xs w-8">Qtd</Label>
                                          <Input
                                            type="number"
                                            min={0.001}
                                            step="any"
                                            className="w-20 h-9 text-right tabular-nums"
                                            value={item.quantidade}
                                            onChange={(e) => {
                                              const v = parseFloat(e.target.value.replace(',', '.')) || 0;
                                              setEditLancProdutos((prev) =>
                                                prev.map((p, i) =>
                                                  i !== idx ? p : { ...p, quantidade: v }
                                                )
                                              );
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Label className="text-muted-foreground text-xs">Preço de compra</Label>
                                          <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            className="w-24 h-9 text-right tabular-nums"
                                            value={item.preco_unitario}
                                            onChange={(e) => {
                                              const v = parseFloat(e.target.value.replace(',', '.')) || 0;
                                              setEditLancProdutos((prev) =>
                                                prev.map((p, i) =>
                                                  i !== idx ? p : { ...p, preco_unitario: v }
                                                )
                                              );
                                            }}
                                          />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">
                                          Total: {formatCurrency(valorItem)}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                      onClick={() =>
                                        setEditLancProdutos((prev) =>
                                          prev.filter((_, i) => i !== idx)
                                        )
                                      }
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                  {(item.meeiros ?? []).length > 0 && (
                                    <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Porcentagem e valor de emba por meeiro
                                      </p>
                                      <div className="flex flex-col gap-3">
                                        {(item.meeiros ?? []).map((mm) => {
                                          const valorEmb = Number(
                                            mm.valor_de_emba ?? VALOR_DE_EMBA_PADRAO,
                                          );
                                          const valorParte = calcValorParteMeeiroLiquido(
                                            valorItem,
                                            Number(mm.porcentagem ?? 0),
                                            item.quantidade,
                                            valorEmb,
                                          );
                                          return (
                                            <div
                                              key={mm.meeiroId}
                                              className="flex flex-wrap items-center gap-2 text-sm"
                                            >
                                              <span className="text-muted-foreground min-w-[70px]">
                                                {mm.nome ?? mm.meeiroId}:
                                              </span>
                                              <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                placeholder="0"
                                                className="w-20 h-9 text-center tabular-nums"
                                                value={mm.porcentagem !== undefined && mm.porcentagem !== null && mm.porcentagem !== 0 ? String(mm.porcentagem) : ''}
                                                onChange={(e) => {
                                                  const v =
                                                    e.target.value === '' ? 0 : Number(e.target.value);
                                                  setEditLancProdutos((prev) =>
                                                    prev.map((p, i) =>
                                                      i !== idx
                                                        ? p
                                                        : {
                                                            ...p,
                                                            meeiros: (p.meeiros ?? []).map((mmm) =>
                                                              mmm.meeiroId === mm.meeiroId
                                                                ? { ...mmm, porcentagem: v }
                                                                : mmm
                                                            ),
                                                          }
                                                    )
                                                  );
                                                }}
                                              />
                                              <span className="text-muted-foreground">% meeiro</span>
                                              <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                placeholder="1.20"
                                                className="w-24 h-9 text-center tabular-nums"
                                                value={
                                                  mm.valor_de_emba !== undefined &&
                                                  mm.valor_de_emba !== null
                                                    ? String(mm.valor_de_emba)
                                                    : ''
                                                }
                                                onChange={(e) => {
                                                  const v =
                                                    e.target.value === ''
                                                      ? VALOR_DE_EMBA_PADRAO
                                                      : Number(e.target.value);
                                                  setEditLancProdutos((prev) =>
                                                    prev.map((p, i) =>
                                                      i !== idx
                                                        ? p
                                                        : {
                                                            ...p,
                                                            meeiros: (p.meeiros ?? []).map((mmm) =>
                                                              mmm.meeiroId === mm.meeiroId
                                                                ? { ...mmm, valor_de_emba: v }
                                                                : mmm
                                                            ),
                                                          }
                                                    )
                                                  );
                                                }}
                                              />
                                              <span className="text-muted-foreground">R$ emba/un</span>
                                              <span className="text-muted-foreground tabular-nums">
                                                = {formatCurrency(valorParte)}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
                            <AddProdutoLanc
                              produtos={produtosDisponiveisEdit}
                              onAdd={(produtoId, qtd, preco) => {
                                const p = produtosDisponiveisEdit.find(
                                  (x) => Number(x.id) === Number(produtoId)
                                ) as { id: number; nome?: string } | undefined;
                                const meeirosDoProduto = editLancMeeiros.map((m) => {
                                  const meeiroRef = meeirosParaEdit.find(
                                    (x) => Number(x.id) === Number(m.meeiroId),
                                  );
                                  return {
                                    meeiroId: m.meeiroId,
                                    nome: m.nome,
                                    porcentagem: Number(m.porcentagem ?? 0),
                                    valor_de_emba: meeiroRef
                                      ? valorDeEmbaPadraoDeMeeiro(meeiroRef)
                                      : VALOR_DE_EMBA_PADRAO,
                                  };
                                });
                                setEditLancProdutos((prev) => [
                                  ...prev,
                                  {
                                    produtoId: Number(produtoId),
                                    quantidade: qtd,
                                    preco_unitario: preco,
                                    nome: p?.nome ?? '—',
                                    meeiros: meeirosDoProduto,
                                  },
                                ]);
                              }}
                              disabled={editLancMeeiros.length === 0}
                            />
                          </div>
                          <div className="flex justify-end rounded-xl border bg-primary/5 px-4 py-3">
                            <p className="text-sm font-semibold">
                              Total geral:{' '}
                              <span className="text-primary">
                                {formatCurrency(
                                  editLancProdutos.reduce(
                                    (s, i) => s + i.quantidade * i.preco_unitario,
                                    0
                                  )
                                )}
                              </span>
                            </p>
                          </div>
                        </section>
                        <DialogFooter className="gap-3 pt-4 sm:pt-6 border-t px-6 pb-6 -mx-0">
                          <Button
                            variant="outline"
                            onClick={() => setEditLancamentoId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="gradient"
                            onClick={() => {
                              if (!editLancData || !editLancRocaId) {
                                toast.error('Preencha data e roça');
                                return;
                              }
                              if (editLancMeeiros.length === 0) {
                                toast.error('Adicione ao menos um meeiro');
                                return;
                              }
                              if (editLancProdutos.length === 0) {
                                toast.error('Adicione ao menos um produto');
                                return;
                              }
                              const produtosComMeeiros = editLancProdutos.filter(
                                (p) => p.meeiros?.length > 0
                              );
                              if (produtosComMeeiros.length !== editLancProdutos.length) {
                                toast.error('Cada produto deve ter ao menos um meeiro');
                                return;
                              }
                              const produtosValidos = editLancProdutos.filter(
                                (p) => p.produtoId > 0 && (p.meeiros?.length ?? 0) > 0
                              );
                              if (produtosValidos.length === 0) {
                                toast.error('Adicione ao menos um produto válido com meeiros');
                                return;
                              }
                              updateLancamento.mutate({
                                id: editLancamentoId,
                                data: {
                                  data: editLancData,
                                  rocaId: Number(editLancRocaId),
                                  produtos: produtosValidos.map((p) => ({
                                    produtoId: p.produtoId,
                                    quantidade: p.quantidade,
                                    preco_unitario: p.preco_unitario,
                                    meeiros: (p.meeiros ?? []).map((m) => ({
                                      meeiroId: m.meeiroId,
                                      porcentagem: Number(m.porcentagem ?? 0),
                                      valor_de_emba: Number(
                                        m.valor_de_emba ?? VALOR_DE_EMBA_PADRAO,
                                      ),
                                    })),
                                  })),
                                },
                              });
                            }}
                            disabled={updateLancamento.isPending}
                          >
                            {updateLancamento.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Salvar
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Tab Pagamento de Meeiros */}
          <TabsContent value="pagamento-meeiros" className="space-y-4">
            <Sheet
              open={pagamentoFiltrosSheetOpen}
              onOpenChange={(open) => {
                setPagamentoFiltrosSheetOpen(open);
                if (open) {
                  setPagamentoFiltrosDraft({ ...pagamentoFiltrosAplicados });
                } else {
                  setPagamentoFiltrosDraft({ ...pagamentoFiltrosAplicados });
                }
              }}
            >
              <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Filter className="w-5 h-5 text-primary" />
                    </div>
                    <SheetTitle className="text-xl">Filtros</SheetTitle>
                  </div>
                  <SheetDescription>
                    Refine o período, produtor, meeiro e roças. Os totais vêm dos lançamentos no intervalo
                    (participação de cada meeiro).
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Produtor</Label>
                    <Select
                      value={pagamentoFiltrosDraft.produtorId === '' ? 'todos' : String(pagamentoFiltrosDraft.produtorId)}
                      onValueChange={(v) => {
                        setPagamentoFiltrosDraft((prev) => ({
                          ...prev,
                          produtorId: v === 'todos' ? '' : Number(v),
                          meeiroId: '',
                          rocaIds: [],
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os produtores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os produtores</SelectItem>
                        {produtores.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.codigo} – {p.nome_razao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Meeiro (opcional)</Label>
                    <Popover
                      open={pagamentoDraftMeeiroOpen}
                      onOpenChange={(o) => {
                        setPagamentoDraftMeeiroOpen(o);
                        if (!o) setPagamentoDraftMeeiroSearch('');
                      }}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={pagamentoDraftMeeiroOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {pagamentoFiltrosDraft.meeiroId === ''
                              ? 'Todos os meeiros'
                              : (() => {
                                  const mm = meeirosParaRelatorio.find(
                                    (x) => x.id === pagamentoFiltrosDraft.meeiroId,
                                  );
                                  return mm ? `${mm.nome} (${mm.codigo})` : 'Todos os meeiros';
                                })()}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar meeiro..."
                            value={pagamentoDraftMeeiroSearch}
                            onValueChange={setPagamentoDraftMeeiroSearch}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="todos"
                                onSelect={() => {
                                  setPagamentoFiltrosDraft((prev) => ({ ...prev, meeiroId: '' }));
                                  setPagamentoDraftMeeiroOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    pagamentoFiltrosDraft.meeiroId === '' ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                Todos os meeiros
                              </CommandItem>
                              {meeirosOpcoesFiltroPagamento.map((mm) => (
                                <CommandItem
                                  key={mm.id}
                                  value={String(mm.id)}
                                  onSelect={() => {
                                    setPagamentoFiltrosDraft((prev) => ({ ...prev, meeiroId: mm.id }));
                                    setPagamentoDraftMeeiroOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      pagamentoFiltrosDraft.meeiroId === mm.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {mm.nome} ({mm.codigo})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Período</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data inicial</Label>
                        <Input
                          type="date"
                          value={pagamentoFiltrosDraft.dataInicial}
                          onChange={(e) =>
                            setPagamentoFiltrosDraft((prev) => ({ ...prev, dataInicial: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data final</Label>
                        <Input
                          type="date"
                          value={pagamentoFiltrosDraft.dataFinal}
                          onChange={(e) =>
                            setPagamentoFiltrosDraft((prev) => ({ ...prev, dataFinal: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Roças (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between font-normal">
                          <span className="truncate">
                            {pagamentoFiltrosDraft.rocaIds.length === 0
                              ? 'Todas as roças'
                              : `${pagamentoFiltrosDraft.rocaIds.length} roça(s) selecionada(s)`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                        <div className="max-h-[240px] overflow-y-auto space-y-1">
                          {pagamentoRocas.map((r) => (
                            <label
                              key={r.id}
                              className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={pagamentoFiltrosDraft.rocaIds.includes(r.id)}
                                onCheckedChange={(c) => {
                                  setPagamentoFiltrosDraft((prev) => ({
                                    ...prev,
                                    rocaIds: c
                                      ? [...prev.rocaIds, r.id]
                                      : prev.rocaIds.filter((id) => id !== r.id),
                                  }));
                                }}
                              />
                              <span className="text-sm">{r.nome}</span>
                            </label>
                          ))}
                          {pagamentoRocas.length === 0 && (
                            <p className="text-sm text-muted-foreground px-2 py-1">
                              Nenhuma roça encontrada. Cadastre roças ou ajuste o produtor.
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      type="button"
                      className="flex-1"
                      variant="gradient"
                      onClick={aplicarFiltrosPagamentoMeeiros}
                      disabled={fetchingResumoPagamento}
                    >
                      {fetchingResumoPagamento ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Aplicar filtros
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={limparFiltrosPagamentoMeeiros}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={relPagamentoMeeiroSheetOpen} onOpenChange={setRelPagamentoMeeiroSheetOpen}>
              <SheetContent
                side="right"
                className="w-[400px] sm:w-[540px] sm:max-w-[540px] flex min-h-0 flex-col gap-0"
              >
                <SheetHeader className="shrink-0 space-y-2 text-left pb-4 border-b border-border/60">
                  <SheetTitle className="text-xl">Pagamento de meeiro</SheetTitle>
                  <SheetDescription className="text-xs sm:text-sm leading-relaxed">
                    Com <strong className="font-medium text-foreground">um meeiro selecionado</strong>, ao{' '}
                    <strong className="font-medium text-foreground">imprimir ou baixar</strong> o PDF abrimos em seguida a
                    tela de registro (valores, empréstimo, forma de pagamento). Lá você pode{' '}
                    <strong className="font-medium text-foreground">gerar relatório sem pagar</strong> (fica pendente no
                    histórico) ou <strong className="font-medium text-foreground">confirmar o pagamento</strong>{' '}
                    (concluído no histórico). Campos vazios incluem todos os meeiros/roças; datas em branco seguem a regra
                    do relatório.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-6">
                  <section className="rounded-xl border border-border/60 bg-muted/15 px-4 py-4 space-y-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Filtros
                    </h3>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Meeiro (opcional)</Label>
                    <Popover
                      open={relPagMeeiroComboOpen}
                      onOpenChange={(o) => {
                        setRelPagMeeiroComboOpen(o);
                        if (!o) setRelPagMeeiroComboSearch('');
                      }}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={relPagMeeiroComboOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {relPagMeeiroFiltroId === ''
                              ? 'Todos os meeiros'
                              : (meeirosParaRelatorio.find((m) => m.id === relPagMeeiroFiltroId)?.nome ??
                                'Todos os meeiros')}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome..."
                            value={relPagMeeiroComboSearch}
                            onValueChange={setRelPagMeeiroComboSearch}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__todos"
                                onSelect={() => {
                                  setRelPagMeeiroFiltroId('');
                                  setRelPagMeeiroComboOpen(false);
                                  setRelPagMeeiroComboSearch('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    relPagMeeiroFiltroId === '' ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                Todos os meeiros
                              </CommandItem>
                              {meeirosRelPagamentoMeeiroSheet.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={`m-${m.id}`}
                                  onSelect={() => {
                                    setRelPagMeeiroFiltroId(m.id);
                                    setRelPagMeeiroComboOpen(false);
                                    setRelPagMeeiroComboSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      relPagMeeiroFiltroId === m.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {m.nome ?? '—'}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Roça (opcional)</Label>
                    <Popover
                      open={relPagRocaComboOpen}
                      onOpenChange={(o) => {
                        setRelPagRocaComboOpen(o);
                        if (!o) setRelPagRocaComboSearch('');
                      }}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={relPagRocaComboOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {relPagRocaFiltroId === ''
                              ? 'Todas as roças'
                              : (rocasParaFiltroLancamento.find((r) => r.id === relPagRocaFiltroId)?.nome ??
                                'Todas as roças')}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome..."
                            value={relPagRocaComboSearch}
                            onValueChange={setRelPagRocaComboSearch}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhuma roça encontrada.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__todas"
                                onSelect={() => {
                                  setRelPagRocaFiltroId('');
                                  setRelPagRocaComboOpen(false);
                                  setRelPagRocaComboSearch('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    relPagRocaFiltroId === '' ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                Todas as roças
                              </CommandItem>
                              {rocasRelPagamentoMeeiroSheet.map((r) => (
                                <CommandItem
                                  key={r.id}
                                  value={`r-${r.id}`}
                                  onSelect={() => {
                                    setRelPagRocaFiltroId(r.id);
                                    setRelPagRocaComboOpen(false);
                                    setRelPagRocaComboSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      relPagRocaFiltroId === r.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {r.nome ?? '—'}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Data inicial</Label>
                      <Input
                        type="date"
                        value={relPagDataInicial}
                        onChange={(e) => setRelPagDataInicial(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Data final</Label>
                      <Input
                        type="date"
                        value={relPagDataFinal}
                        onChange={(e) => setRelPagDataFinal(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Status no relatório</Label>
                    <Select value={relPagFiltroPagamento} onValueChange={onRelPagFiltroPagamentoChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pagos">Quitados</SelectItem>
                        <SelectItem value="pendentes">Pendentes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                      Gerar documento
                    </h3>

                    {relPagMeeiroFiltroId === '' ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm space-y-3 dark:bg-card/40">
                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                Lista consolidada
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Uma tabela com todos os meeiros, totais e valores finais — ideal para conferência
                                rápida ou pagamento em lote.
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2 w-full"
                              disabled={relPagPdfLoading !== null}
                              onClick={async () => {
                                try {
                                  setRelPagPdfLoading('print');
                                  await controleRocaService.printRelatorioMeeirosPdf({
                                    dataInicial: relPagDataInicial.trim() || undefined,
                                    dataFinal: relPagDataFinal.trim() || undefined,
                                    rocas:
                                      relPagRocaFiltroId === '' ? undefined : [Number(relPagRocaFiltroId)],
                                    filtroPagamento: relPagFiltroPagamento,
                                  });
                                  setRelPagamentoMeeiroSheetOpen(false);
                                } catch (e: any) {
                                  toast.error(e?.message || e?.response?.data?.message || 'Erro ao abrir PDF');
                                } finally {
                                  setRelPagPdfLoading(null);
                                }
                              }}
                            >
                              {relPagPdfLoading === 'print' ? (
                                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                              ) : (
                                <Printer className="w-4 h-4 shrink-0" />
                              )}
                              Imprimir lista
                            </Button>
                            <Button
                              type="button"
                              variant="gradient"
                              className="gap-2 w-full"
                              disabled={relPagPdfLoading !== null}
                              onClick={async () => {
                                try {
                                  setRelPagPdfLoading('download');
                                  await controleRocaService.downloadRelatorioMeeirosPdf({
                                    dataInicial: relPagDataInicial.trim() || undefined,
                                    dataFinal: relPagDataFinal.trim() || undefined,
                                    rocas:
                                      relPagRocaFiltroId === '' ? undefined : [Number(relPagRocaFiltroId)],
                                    filtroPagamento: relPagFiltroPagamento,
                                  });
                                  toast.success('PDF baixado');
                                  setRelPagamentoMeeiroSheetOpen(false);
                                } catch (e: any) {
                                  toast.error(e?.message || e?.response?.data?.message || 'Erro ao gerar PDF');
                                } finally {
                                  setRelPagPdfLoading(null);
                                }
                              }}
                            >
                              {relPagPdfLoading === 'download' ? (
                                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 shrink-0" />
                              )}
                              Baixar lista
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.06] p-4 shadow-sm space-y-3 dark:bg-primary/10">
                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                              <Files className="h-4 w-4 text-primary" aria-hidden />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                Repasses ao parceiro (1 PDF)
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Um único arquivo com repasse detalhado por meeiro (páginas separadas). Com status
                                &quot;Todos&quot;, a API interpreta como pendentes neste modo.
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="gap-2 w-full"
                              disabled={relPagPdfLoading !== null}
                              onClick={async () => {
                                try {
                                  setRelPagPdfLoading('print-recibos');
                                  await controleRocaService.printRelatorioMeeirosPdf({
                                    layout: 'recibos',
                                    dataInicial: relPagDataInicial.trim() || undefined,
                                    dataFinal: relPagDataFinal.trim() || undefined,
                                    rocas:
                                      relPagRocaFiltroId === '' ? undefined : [Number(relPagRocaFiltroId)],
                                    filtroPagamento: relPagFiltroPagamento,
                                  });
                                  setRelPagamentoMeeiroSheetOpen(false);
                                } catch (e: any) {
                                  toast.error(e?.message || e?.response?.data?.message || 'Erro ao abrir PDF');
                                } finally {
                                  setRelPagPdfLoading(null);
                                }
                              }}
                            >
                              {relPagPdfLoading === 'print-recibos' ? (
                                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                              ) : (
                                <Printer className="w-4 h-4 shrink-0" />
                              )}
                              Imprimir recibos
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2 w-full border-primary/25 bg-background/80"
                              disabled={relPagPdfLoading !== null}
                              onClick={async () => {
                                try {
                                  setRelPagPdfLoading('download-recibos');
                                  await controleRocaService.downloadRelatorioMeeirosPdf({
                                    layout: 'recibos',
                                    dataInicial: relPagDataInicial.trim() || undefined,
                                    dataFinal: relPagDataFinal.trim() || undefined,
                                    rocas:
                                      relPagRocaFiltroId === '' ? undefined : [Number(relPagRocaFiltroId)],
                                    filtroPagamento: relPagFiltroPagamento,
                                  });
                                  toast.success('PDF baixado');
                                  setRelPagamentoMeeiroSheetOpen(false);
                                } catch (e: any) {
                                  toast.error(e?.message || e?.response?.data?.message || 'Erro ao gerar PDF');
                                } finally {
                                  setRelPagPdfLoading(null);
                                }
                              }}
                            >
                              {relPagPdfLoading === 'download-recibos' ? (
                                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 shrink-0" />
                              )}
                              Baixar 1 PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm space-y-3 dark:bg-card/40">
                        <div className="flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <FileText className="h-4 w-4 text-primary" aria-hidden />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              Relatório do meeiro selecionado
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              PDF com lançamentos e resumo apenas para o meeiro escolhido nos filtros.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 w-full"
                            disabled={relPagPdfLoading !== null || sheetModalPagamentoLoading}
                            onClick={async () => {
                              try {
                                setRelPagPdfLoading('print');
                                await carregarMeeiroEAbrirModalPagamento(Number(relPagMeeiroFiltroId));
                              } catch (e: any) {
                                toast.error(e?.message || e?.response?.data?.message || 'Erro ao abrir registro');
                              } finally {
                                setRelPagPdfLoading(null);
                              }
                            }}
                          >
                            {relPagPdfLoading === 'print' ? (
                              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4 shrink-0" />
                            )}
                            Imprimir PDF
                          </Button>
                          <Button
                            type="button"
                            variant="gradient"
                            className="gap-2 w-full"
                            disabled={relPagPdfLoading !== null || sheetModalPagamentoLoading}
                            onClick={async () => {
                              try {
                                setRelPagPdfLoading('download');
                                await carregarMeeiroEAbrirModalPagamento(Number(relPagMeeiroFiltroId));
                              } catch (e: any) {
                                toast.error(e?.message || e?.response?.data?.message || 'Erro ao abrir registro');
                              } finally {
                                setRelPagPdfLoading(null);
                              }
                            }}
                          >
                            {relPagPdfLoading === 'download' ? (
                              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 shrink-0" />
                            )}
                            Baixar PDF
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
                          Não precisa gerar PDF antes? Abra só o registro de pagamento com os valores do período.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full gap-2"
                          disabled={relPagPdfLoading !== null || sheetModalPagamentoLoading}
                          onClick={() => void carregarMeeiroEAbrirModalPagamento(Number(relPagMeeiroFiltroId))}
                        >
                          {sheetModalPagamentoLoading ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                          ) : null}
                          Abrir registro de pagamento (sem PDF)
                        </Button>
                      </div>
                    )}
                  </section>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={historicoPagamentosOpen} onOpenChange={setHistoricoPagamentosOpen}>
              <SheetContent
                side="right"
                className="w-full sm:max-w-[min(100vw-1rem,720px)] flex min-h-0 flex-col gap-0 p-0"
              >
                <SheetHeader className="shrink-0 space-y-3 text-left px-6 pt-6 pb-4 border-b border-border/60">
                  <SheetTitle className="text-xl">Histórico de pagamentos ao meeiro</SheetTitle>
                  <SheetDescription className="text-xs sm:text-sm leading-relaxed">
                    Combina <strong className="font-medium text-foreground">pagamentos concluídos</strong> e{' '}
                    <strong className="font-medium text-foreground">relatórios gerados sem pagamento</strong> (pendentes).
                    O produtor segue o filtro da aba. Comprovante PDF só existe após pagamento efetivado.
                  </SheetDescription>
                  {historicoPagamentosData?.resumo ? (
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm pt-1">
                      <span className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1">
                        Pagamentos no período:{' '}
                        <strong className="text-foreground">
                          {historicoPagamentosData.resumo.registrosPagamentoNoPeriodo ??
                            historicoPagamentosData.resumo.meeirosDistintosConcluidosNoPeriodo}
                        </strong>
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          (
                          {historicoPagamentosData.resumo.meeirosDistintosConcluidosNoPeriodo}{' '}
                          {historicoPagamentosData.resumo.meeirosDistintosConcluidosNoPeriodo === 1
                            ? 'meeiro'
                            : 'meeiros'}
                          )
                        </span>
                      </span>
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
                        Relatórios pendentes:{' '}
                        <strong className="text-foreground">
                          {historicoPagamentosData.resumo.registrosRelatorioPendenteNoPeriodo ??
                            historicoPagamentosData.resumo.meeirosDistintosPendentesNoPeriodo}
                        </strong>
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          (
                          {historicoPagamentosData.resumo.meeirosDistintosPendentesNoPeriodo}{' '}
                          {historicoPagamentosData.resumo.meeirosDistintosPendentesNoPeriodo === 1
                            ? 'meeiro'
                            : 'meeiros'}
                          )
                        </span>
                      </span>
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Meeiro</Label>
                      <Select
                        value={historicoFiltroMeeiroId === '' ? '_todos' : String(historicoFiltroMeeiroId)}
                        onValueChange={(v) =>
                          setHistoricoFiltroMeeiroId(v === '_todos' ? '' : Number(v))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_todos">Todos os meeiros</SelectItem>
                          {meeirosParaRelatorio.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                      <Select
                        value={historicoFiltroStatus}
                        onValueChange={(v) =>
                          setHistoricoFiltroStatus(v as 'todos' | 'pendente' | 'concluido')
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="pendente">Pendente (só relatório)</SelectItem>
                          <SelectItem value="concluido">Concluído (pagamento)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Data inicial</Label>
                        <Input
                          type="date"
                          className="h-9 mt-1"
                          value={historicoFiltroDataInicial}
                          onChange={(e) => setHistoricoFiltroDataInicial(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Data final</Label>
                        <Input
                          type="date"
                          className="h-9 mt-1"
                          value={historicoFiltroDataFinal}
                          onChange={(e) => setHistoricoFiltroDataFinal(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                        disabled={
                          limparHistoricoPeriodoMut.isPending ||
                          historicoFiltroStatus === 'concluido' ||
                          historicoPendentesNoPeriodo === 0
                        }
                        title={
                          historicoFiltroStatus === 'concluido'
                            ? 'Pagamentos concluídos não podem ser excluídos.'
                            : historicoPendentesNoPeriodo === 0
                              ? 'Não há relatórios pendentes no período.'
                              : 'Remove apenas relatórios gerados sem pagamento.'
                        }
                        onClick={() => setHistoricoLimparPeriodoOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Limpar pendentes do período
                      </Button>
                    </div>
                  </div>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
                  {loadingHistoricoPagamentos ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Carregando…
                    </div>
                  ) : (historicoPagamentosData?.items?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Nenhum registro encontrado para este filtro.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {(historicoPagamentosData?.items ?? []).map((row) => {
                        const origem = row.origem ?? 'pagamento';
                        const isPendente = origem === 'relatorio_pendente';
                        const rowKey = `${origem}-${row.id}`;
                        return (
                        <li
                          key={rowKey}
                          className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-4"
                        >
                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0 flex-1">
                              <span
                                className={cn(
                                  'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded shrink-0',
                                  isPendente
                                    ? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
                                    : 'bg-primary/10 text-primary',
                                )}
                              >
                                {isPendente ? 'Pendente' : 'Concluído'}
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                                {row.createdAt
                                  ? formatDateTime(row.createdAt)
                                  : formatDate(row.dataPagamento)}
                              </span>
                              <span className="text-muted-foreground hidden sm:inline shrink-0">·</span>
                              <span className="font-medium leading-snug break-words min-w-0" title={row.meeiroNome}>
                                {row.meeiroNome}
                              </span>
                            </div>
                            {isPendente ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                title="Excluir relatório pendente"
                                disabled={excluirHistoricoItemMut.isPending}
                                onClick={() =>
                                  setHistoricoExcluirItem({
                                    origem: 'relatorio_pendente',
                                    id: row.id,
                                    meeiroNome: row.meeiroNome,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {isPendente
                                ? 'Relatório gerado sem registro de pagamento. Efetive o pagamento na aba quando houver quitação.'
                                : 'Comprovante com repasse, vales, abatimentos e valor líquido gravados no pagamento.'}
                            </p>
                          </div>
                          {!isPendente ? (
                          <div className="flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
                            <Button
                              type="button"
                              variant="default"
                              className="h-10 w-full gap-2 sm:h-9 sm:w-auto sm:min-w-[12rem] sm:max-w-[min(100%,20rem)]"
                              disabled={historicoComprovanteBusy?.rowKey === rowKey}
                              onClick={async () => {
                                try {
                                  setHistoricoComprovanteBusy({ rowKey, action: 'download' });
                                  await controleRocaService.downloadComprovantePagamentoMeeiroPdf(row.id);
                                  toast.success('Relatório Repasse ao parceiro baixado.');
                                } catch (e: any) {
                                  toast.error(
                                    e?.response?.data?.message ||
                                      e?.message ||
                                      'Erro ao baixar comprovante',
                                  );
                                } finally {
                                  setHistoricoComprovanteBusy(null);
                                }
                              }}
                            >
                              {historicoComprovanteBusy?.rowKey === rowKey &&
                              historicoComprovanteBusy.action === 'download' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              Baixar comprovante (PDF)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 w-full gap-2 sm:h-9 sm:w-auto sm:min-w-[9rem]"
                              disabled={historicoComprovanteBusy?.rowKey === rowKey}
                              onClick={async () => {
                                try {
                                  setHistoricoComprovanteBusy({ rowKey, action: 'print' });
                                  await controleRocaService.printComprovantePagamentoMeeiroPdf(row.id);
                                  toast.success('Comprovante aberto em nova aba para impressão.');
                                } catch (e: any) {
                                  toast.error(
                                    e?.response?.data?.message ||
                                      e?.message ||
                                      'Erro ao abrir comprovante para impressão',
                                  );
                                } finally {
                                  setHistoricoComprovanteBusy(null);
                                }
                              }}
                            >
                              {historicoComprovanteBusy?.rowKey === rowKey &&
                              historicoComprovanteBusy.action === 'print' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                              Imprimir
                            </Button>
                          </div>
                          ) : (
                            <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Gere o PDF de novo (registra outra pendência no histórico) ou abra o pagamento com
                                valores do período.
                              </p>
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-10 w-full gap-2 sm:h-9 sm:w-auto sm:min-w-[11rem]"
                                  disabled={historicoPendenteGerarBusy === rowKey}
                                  onClick={async () => {
                                    const produtorIdNum =
                                      row.produtorId != null && !Number.isNaN(Number(row.produtorId))
                                        ? Number(row.produtorId)
                                        : meeirosParaRelatorio.find(
                                            (m) => Number(m.id) === Number(row.meeiroId),
                                          )?.produtorId;
                                    if (produtorIdNum == null || Number.isNaN(Number(produtorIdNum))) {
                                      toast.error(
                                        'Não foi possível identificar o produtor. Aplique o filtro de produtor na aba Pagamento.',
                                      );
                                      return;
                                    }
                                    const dataIniRel =
                                      (row.periodoDataInicial && String(row.periodoDataInicial).trim()) ||
                                      pagamentoFiltrosAplicados.dataInicial.trim() ||
                                      undefined;
                                    const dataFimRel =
                                      (row.periodoDataFinal && String(row.periodoDataFinal).trim()) ||
                                      pagamentoFiltrosAplicados.dataFinal.trim() ||
                                      undefined;
                                    const rocasRel =
                                      pagamentoFiltrosAplicados.rocaIds.length > 0
                                        ? pagamentoFiltrosAplicados.rocaIds.map(Number)
                                        : undefined;
                                    try {
                                      setHistoricoPendenteGerarBusy(rowKey);
                                      await controleRocaService.downloadRelatorioMeeirosPdf({
                                        meeiroId: row.meeiroId,
                                        dataInicial: dataIniRel,
                                        dataFinal: dataFimRel,
                                        rocas: rocasRel,
                                        filtroPagamento: 'pendentes',
                                      });
                                      await controleRocaService.registrarRelatorioMeeiroPendente({
                                        meeiroId: row.meeiroId,
                                        produtorId: Number(produtorIdNum),
                                        periodoDataInicial: dataIniRel,
                                        periodoDataFinal: dataFimRel,
                                        observacao: row.observacao?.trim() || undefined,
                                      });
                                      toast.success('Relatório gerado e pendência registrada no histórico.');
                                      void queryClient.invalidateQueries({
                                        queryKey: ['controle-roca', 'pagamentos-meeiros', 'historico'],
                                      });
                                    } catch (e: any) {
                                      toast.error(
                                        e?.response?.data?.message ||
                                          e?.message ||
                                          'Erro ao gerar relatório',
                                      );
                                    } finally {
                                      setHistoricoPendenteGerarBusy(null);
                                    }
                                  }}
                                >
                                  {historicoPendenteGerarBusy === rowKey ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  Gerar sem pagar
                                </Button>
                                <Button
                                  type="button"
                                  variant="default"
                                  className="h-10 w-full gap-2 sm:h-9 sm:w-auto sm:min-w-[11rem]"
                                  disabled={sheetModalPagamentoLoading}
                                  onClick={() => {
                                    void carregarMeeiroEAbrirModalPagamento(row.meeiroId, {
                                      dataInicial:
                                        (row.periodoDataInicial && String(row.periodoDataInicial).trim()) ||
                                        undefined,
                                      dataFinal:
                                        (row.periodoDataFinal && String(row.periodoDataFinal).trim()) ||
                                        undefined,
                                      rocas:
                                        pagamentoFiltrosAplicados.rocaIds.length > 0
                                          ? [...pagamentoFiltrosAplicados.rocaIds]
                                          : undefined,
                                    });
                                  }}
                                >
                                  {sheetModalPagamentoLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : null}
                                  Gerar e pagar
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <AlertDialog
              open={historicoExcluirItem != null}
              onOpenChange={(open) => {
                if (!open) setHistoricoExcluirItem(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir relatório pendente?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      Será removido o relatório gerado sem pagamento de{' '}
                      <strong className="text-foreground">{historicoExcluirItem?.meeiroNome}</strong>.
                      Pagamentos concluídos não podem ser excluídos.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={excluirHistoricoItemMut.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={excluirHistoricoItemMut.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!historicoExcluirItem) return;
                      excluirHistoricoItemMut.mutate({
                        origem: historicoExcluirItem.origem,
                        id: historicoExcluirItem.id,
                      });
                    }}
                  >
                    {excluirHistoricoItemMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
              open={historicoLimparPeriodoOpen}
              onOpenChange={setHistoricoLimparPeriodoOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar relatórios pendentes do período?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        Serão excluídos apenas os relatórios{' '}
                        <strong className="text-foreground">gerados sem pagamento</strong> que correspondem
                        aos filtros atuais
                        {historicoFiltroDataInicial || historicoFiltroDataFinal ? (
                          <>
                            {' '}
                            (datas
                            {historicoFiltroDataInicial
                              ? ` de ${historicoFiltroDataInicial}`
                              : ''}
                            {historicoFiltroDataFinal ? ` até ${historicoFiltroDataFinal}` : ''})
                          </>
                        ) : (
                          ' (sem filtro de data)'
                        )}
                        . Pagamentos concluídos permanecem no histórico.
                      </p>
                      {historicoPagamentosData?.resumo ? (
                        <p className="font-medium text-foreground">
                          Até {historicoPendentesNoPeriodo} relatório(s) pendente(s) no período.
                        </p>
                      ) : null}
                      <p className="text-amber-800 dark:text-amber-200">
                        Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={limparHistoricoPeriodoMut.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={limparHistoricoPeriodoMut.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      limparHistoricoPeriodoMut.mutate();
                    }}
                  >
                    {limparHistoricoPeriodoMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Limpar pendentes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog
              open={pagamentoPdfMeeiroDialogOpen}
              onOpenChange={(open) => {
                setPagamentoPdfMeeiroDialogOpen(open);
                if (!open) {
                  setPdfPagMeeiroDownloading(false);
                  setPdfPagMeeiroPrinting(false);
                }
              }}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Pagamento de produtores (PDF)</DialogTitle>
                  <DialogDescription>
                    Selecione o meeiro, opcionalmente as roças e confira o período. O PDF inclui linha para assinatura
                    do meeiro. Produtor segue o filtro já aplicado na tela de pagamento.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Meeiro</Label>
                    <Select
                      value={pdfPagMeeiroId === '' ? '_none' : String(pdfPagMeeiroId)}
                      onValueChange={(v) => setPdfPagMeeiroId(v === '_none' ? '' : Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o meeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Selecione o meeiro</SelectItem>
                        {[...meeirosParaRelatorio]
                          .sort((a, b) =>
                            `${a.codigo ?? ''} ${a.nome ?? ''}`.localeCompare(
                              `${b.codigo ?? ''} ${b.nome ?? ''}`,
                            ),
                          )
                          .map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.nome} ({m.porcentagem_padrao}%)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Roças (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between font-normal">
                          <span className="truncate">
                            {pdfPagRocaIds.length === 0
                              ? 'Todas as roças'
                              : `${pdfPagRocaIds.length} roça(s) selecionada(s)`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                        <div className="max-h-[240px] overflow-y-auto space-y-1">
                          {pdfPagDialogRocas.map((r) => (
                            <label
                              key={r.id}
                              className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={pdfPagRocaIds.includes(r.id)}
                                onCheckedChange={(c) => {
                                  setPdfPagRocaIds((prev) =>
                                    c ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                                  );
                                }}
                              />
                              <span className="text-sm">{r.nome}</span>
                            </label>
                          ))}
                          {pdfPagDialogRocas.length === 0 && (
                            <p className="text-sm text-muted-foreground px-2 py-1">
                              {pagamentoFiltrosAplicados.produtorId === ''
                                ? 'Nenhuma roça encontrada.'
                                : 'Nenhuma roça para este produtor.'}
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Data inicial</Label>
                      <Input
                        type="date"
                        value={pdfPagDataInicial}
                        onChange={(e) => setPdfPagDataInicial(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Data final</Label>
                      <Input
                        type="date"
                        value={pdfPagDataFinal}
                        onChange={(e) => setPdfPagDataFinal(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pagamento em (opcional)</Label>
                    <Input
                      type="date"
                      value={pdfPagDataPagamento}
                      onChange={(e) => setPdfPagDataPagamento(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O produtor é o do filtro aplicado na tela; as roças acima refinam só este PDF.
                  </p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPagamentoPdfMeeiroDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pdfPagMeeiroDownloading || pdfPagMeeiroPrinting || pdfPagMeeiroId === ''}
                    onClick={async () => {
                      if (pdfPagMeeiroId === '') {
                        toast.error('Selecione um meeiro');
                        return;
                      }
                      try {
                        setPdfPagMeeiroPrinting(true);
                        await controleRocaService.printRelatorioMeeiroPdf({
                          meeiroId: Number(pdfPagMeeiroId),
                          dataInicial: pdfPagDataInicial || undefined,
                          dataFinal: pdfPagDataFinal || undefined,
                          dataPagamento: pdfPagDataPagamento || undefined,
                          produtorId:
                            pagamentoFiltrosAplicados.produtorId === ''
                              ? undefined
                              : Number(pagamentoFiltrosAplicados.produtorId),
                          rocas: pdfPagRocaIds.length ? pdfPagRocaIds : undefined,
                        });
                      } catch (err: any) {
                        toast.error(
                          err?.response?.data?.message || err?.message || 'Erro ao abrir PDF',
                        );
                      } finally {
                        setPdfPagMeeiroPrinting(false);
                      }
                    }}
                  >
                    {pdfPagMeeiroPrinting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Printer className="w-4 h-4 mr-2" />
                    )}
                    Imprimir
                  </Button>
                  <Button
                    type="button"
                    variant="gradient"
                    disabled={pdfPagMeeiroDownloading || pdfPagMeeiroPrinting || pdfPagMeeiroId === ''}
                    onClick={async () => {
                      if (pdfPagMeeiroId === '') {
                        toast.error('Selecione um meeiro');
                        return;
                      }
                      try {
                        setPdfPagMeeiroDownloading(true);
                        await controleRocaService.downloadRelatorioMeeiroPdf({
                          meeiroId: Number(pdfPagMeeiroId),
                          dataInicial: pdfPagDataInicial || undefined,
                          dataFinal: pdfPagDataFinal || undefined,
                          dataPagamento: pdfPagDataPagamento || undefined,
                          produtorId:
                            pagamentoFiltrosAplicados.produtorId === ''
                              ? undefined
                              : Number(pagamentoFiltrosAplicados.produtorId),
                          rocas: pdfPagRocaIds.length ? pdfPagRocaIds : undefined,
                        });
                        toast.success('PDF baixado');
                        setPagamentoPdfMeeiroDialogOpen(false);
                      } catch (err: any) {
                        toast.error(
                          err?.response?.data?.message || err?.message || 'Erro ao gerar PDF',
                        );
                      } finally {
                        setPdfPagMeeiroDownloading(false);
                      }
                    }}
                  >
                    {pdfPagMeeiroDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Baixar PDF
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Tabs value={pagamentoSubTab} onValueChange={(v) => setPagamentoSubTab(v as 'em-aberto' | 'quitados')} className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                <TabsList className="bg-muted/50 h-auto w-fit max-w-full flex-wrap justify-start shrink-0">
                  <TabsTrigger value="em-aberto" className="gap-2">
                    <Banknote className="w-4 h-4" />
                    Em aberto
                    <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-2 py-0.5">
                      {totalPagamentoEmAbertoBadge}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="quitados" className="gap-2">
                    <Archive className="w-4 h-4" />
                    Quitados
                    <span className="ml-1 text-xs bg-muted-foreground/20 rounded-full px-2 py-0.5">
                      {totalPagamentoQuitadosBadge}
                    </span>
                  </TabsTrigger>
                </TabsList>
                <div className="relative w-full min-w-0 flex-1 lg:max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder="Buscar por meeiro..."
                    value={pagamentoBuscaMeeiro}
                    onChange={(e) => setPagamentoBuscaMeeiro(e.target.value)}
                    className="h-9 pl-9"
                    aria-label="Buscar meeiro na lista de pagamento"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setPagamentoFiltrosSheetOpen(true)}
                    style={
                      pagamentoFiltrosAtivosCount > 0
                        ? { borderColor: 'var(--primary)', borderWidth: '2px' }
                        : {}
                    }
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {pagamentoFiltrosAtivosCount > 0 && (
                      <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                        {pagamentoFiltrosAtivosCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setRelPagMeeiroFiltroId(
                        pagamentoFiltrosAplicados.meeiroId === ''
                          ? ''
                          : Number(pagamentoFiltrosAplicados.meeiroId),
                      );
                      setRelPagRocaFiltroId(
                        pagamentoFiltrosAplicados.rocaIds.length === 1
                          ? Number(pagamentoFiltrosAplicados.rocaIds[0])
                          : '',
                      );
                      setRelPagDataInicial(pagamentoFiltrosAplicados.dataInicial);
                      setRelPagDataFinal(pagamentoFiltrosAplicados.dataFinal);
                      setRelPagFiltroPagamento(
                        pagamentoSubTab === 'quitados'
                          ? 'pagos'
                          : pagamentoSubTab === 'em-aberto'
                            ? 'pendentes'
                            : 'todos',
                      );
                      setRelPagMeeiroComboSearch('');
                      setRelPagRocaComboSearch('');
                      setRelPagamentoMeeiroSheetOpen(true);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Relatórios
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setHistoricoPagamentosOpen(true)}
                  >
                    <Archive className="w-4 h-4" />
                    Histórico de pagamentos
                  </Button>
                </div>
              </div>

              <TabsContent value="em-aberto" className="mt-0">
                <div className="bg-card border rounded-xl min-w-0 overflow-hidden">
                  {loadingResumoPagamento ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                    <div className="overflow-x-auto bg-muted/50 [&_tbody_tr]:bg-card">
                    <Table
                      noGutter
                      className="w-full min-w-[max(100%,44rem)] table-fixed border-collapse"
                    >
                      <TableHeader>
                        <TableRow className="bg-muted/50 [&>th]:!h-auto [&>th]:min-h-10 [&>th]:md:min-h-12 [&>th]:bg-muted/50 [&>th]:align-middle [&>th]:py-2 md:[&>th]:py-3">
                          <TableHead className="min-w-0 w-[18%]">Meeiro</TableHead>
                          <TableHead className="min-w-0 w-[16%]">Chave PIX</TableHead>
                          <TableHead className="min-w-0 w-[12%] text-right">Valor a receber</TableHead>
                          <TableHead className="min-w-0 w-[14%] text-center">Emprést aberto</TableHead>
                          <TableHead className="min-w-0 w-[10%] text-right">Desc emprést.</TableHead>
                          <TableHead className="min-w-0 w-[18%] text-right whitespace-nowrap">
                            Valor final a pagar
                          </TableHead>
                          <TableHead className="hidden min-[1200px]:table-cell w-[12%] min-w-[5.5rem] text-right sticky right-0 z-30">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {totalPagamentoMeeirosLista === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              Nenhum meeiro em aberto neste período (valor líquido a pagar ou empréstimo pendente, ainda não quitado no sistema). Verifique filtros, lançamentos e datas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (resumoPagamentoMeeiros?.items ?? []).map((m) => (
                            <TableRow key={m.meeiroId} className="group/pag-aberto">
                                  <TableCell className="font-medium max-w-[14rem] sm:max-w-[18rem] xl:max-w-[22rem]">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {apenasDividaEmprestimoSemProducaoRemanescente(m) && (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button
                                              type="button"
                                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-orange-600 p-0 text-white shadow-md ring-2 ring-amber-200/90 transition hover:from-amber-500 hover:to-orange-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:from-amber-500 dark:to-orange-600 dark:ring-amber-400/50"
                                              aria-label="Entenda o saldo: só empréstimo em aberto, sem produção remanescente"
                                            >
                                              <AlertTriangle
                                                className="h-4 w-4 drop-shadow-sm"
                                                strokeWidth={2.5}
                                                aria-hidden
                                              />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent className="max-w-md text-sm" align="start" side="bottom">
                                            <p className="leading-relaxed text-foreground">
                                              <span className="font-semibold">Só resta empréstimo em aberto.</span>{' '}
                                              A produção deste período já foi considerada nos pagamentos; o valor final negativo
                                              indica saldo de dívida, não pagamento em dinheiro. Para abater de novo por aqui, é
                                              preciso ter{' '}
                                              <span className="font-semibold">novos lançamentos</span> com valor a receber. Para
                                              quitar a dívida em dinheiro, use o cadastro do meeiro em{' '}
                                              <span className="font-semibold">Empréstimos</span>.
                                            </p>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                      <span className="min-w-0 flex-1 truncate" title={m.nome}>
                                        {m.nome}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm max-w-[180px] truncate" title={m.chavePix ?? undefined}>
                                    {m.chavePix || '—'}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{formatCurrency(m.totalReceber)}</TableCell>
                                  <TableCell className="text-center tabular-nums">{formatCurrency(m.totalEmprestimosAbertos)}</TableCell>
                                  <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {formatCurrency(m.descEmprest ?? 0)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums font-semibold">
                                    {formatCurrency(m.valorLiquido)}
                                  </TableCell>
                                  <TableCell className="hidden min-[1200px]:table-cell w-[12%] min-w-[5.5rem] text-right sticky right-0 z-20 bg-card align-middle group-hover/pag-aberto:bg-muted/50">
                                    <div className="flex justify-end">
                                      <TableRowActionsMenu icon="horizontal">
                                        <DropdownMenuItem
                                            disabled={!podeRegistrarPagamentoMeeiro(m)}
                                            title={
                                              !podeRegistrarPagamentoMeeiro(m)
                                                ? 'É necessário valor de produção ou empréstimo em aberto para definir o desconto.'
                                                : undefined
                                            }
                                            onClick={() => {
                                              if (!podeRegistrarPagamentoMeeiro(m)) return;
                                              void abrirEditarPagamento(m);
                                            }}
                                          >
                                            {editPagamentoLoadingMeeiroId === m.meeiroId ? (
                                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                              <Pencil className="w-4 h-4 mr-2" />
                                            )}
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            disabled={!podeRegistrarPagamentoMeeiro(m)}
                                            onClick={() => {
                                              if (!podeRegistrarPagamentoMeeiro(m)) return;
                                              setMeeiroParaPagar(m);
                                              setFormPagamento({
                                                formaPagamento: 'PIX',
                                                contaCaixa: '',
                                                dataPagamento: getDataHojeLocal(),
                                                observacao: '',
                                                valorAbaterEmprestimo: valorAbaterEmprestimoInicialString(m),
                                              });
                                              setOpenPagarModal(true);
                                            }}
                                            title={
                                              !podeRegistrarPagamentoMeeiro(m)
                                                ? apenasDividaEmprestimoSemProducaoRemanescente(m)
                                                  ? 'Sem produção remanescente. Clique no ícone de alerta (triângulo) ao lado do nome.'
                                                  : 'É necessário valor de produção; se a dívida for maior, use Pagar para abater a produção nos empréstimos.'
                                                : undefined
                                            }
                                          >
                                            <Wallet className="w-4 h-4 mr-2" />
                                            Pagar
                                          </DropdownMenuItem>
                                      </TableRowActionsMenu>
                                    </div>
                                  </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    </div>
                    {totalPagamentoMeeirosLista > 0 && totalPagamentoMeeirosPages > 1 && (
                      <div className="border-t px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">
                          Mostrando{' '}
                          {(pagamentoMeeirosPage - 1) * PAGAMENTO_MEEIROS_PAGE_SIZE + 1} a{' '}
                          {Math.min(
                            pagamentoMeeirosPage * PAGAMENTO_MEEIROS_PAGE_SIZE,
                            totalPagamentoMeeirosLista,
                          )}{' '}
                          de {totalPagamentoMeeirosLista} meeiros
                        </div>
                        <Pagination className="justify-end">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPagamentoMeeirosPage((prev) => Math.max(1, prev - 1));
                                }}
                                className={
                                  pagamentoMeeirosPage === 1 ? 'pointer-events-none opacity-50' : ''
                                }
                              />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPagamentoMeeirosPage((prev) =>
                                    Math.min(totalPagamentoMeeirosPages, prev + 1),
                                  );
                                }}
                                className={
                                  pagamentoMeeirosPage === totalPagamentoMeeirosPages
                                    ? 'pointer-events-none opacity-50'
                                    : ''
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="quitados" className="mt-0">
                <div className="bg-card border rounded-xl min-w-0 overflow-hidden">
                  {loadingResumoPagamento ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                    <div className="overflow-x-auto bg-muted/50 [&_tbody_tr]:bg-card">
                    <Table
                      noGutter
                      className="w-full min-w-[max(100%,44rem)] table-fixed border-collapse"
                    >
                      <TableHeader>
                        <TableRow className="bg-muted/50 [&>th]:!h-auto [&>th]:min-h-10 [&>th]:md:min-h-12 [&>th]:bg-muted/50 [&>th]:align-middle [&>th]:py-2 md:[&>th]:py-3">
                          <TableHead className="min-w-0 w-[26%]">Meeiro</TableHead>
                          <TableHead className="min-w-0 w-[24%]">Chave PIX</TableHead>
                          <TableHead className="min-w-0 w-[18%] text-right">Valor total pago</TableHead>
                          <TableHead className="min-w-0 w-[16%] text-center">Teve empréstimo</TableHead>
                          <TableHead className="min-w-0 w-[16%] text-right sticky right-0 z-30 border-l border-border shadow-[inset_1px_0_0_0_hsl(var(--border))]">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {totalPagamentoMeeirosLista === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Nenhum meeiro totalmente quitado (pagamento registrado e sem empréstimo em aberto). Quem ainda tiver dívida aparece em Em aberto.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (resumoPagamentoMeeiros?.items ?? []).map((m) => (
                            <TableRow key={m.meeiroId} className="group/pag-quit">
                              <TableCell className="font-medium max-w-[14rem] sm:max-w-[18rem] xl:max-w-[22rem] truncate" title={m.nome}>
                                {m.nome}
                              </TableCell>
                              <TableCell className="font-mono text-sm max-w-[220px] truncate" title={m.chavePix ?? undefined}>
                                {m.chavePix || '—'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">
                                {formatCurrency(m.valorTotalPago ?? m.valorLiquido)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={cn(
                                    'text-xs font-medium px-2 py-1 rounded',
                                    m.teveEmprestimoNoPagamento
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                      : 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  {m.teveEmprestimoNoPagamento ? 'Sim' : 'Não'}
                                </span>
                              </TableCell>
                              <TableCell className="w-[16%] min-w-[10rem] text-right sticky right-0 z-20 border-l border-border bg-card align-middle shadow-[inset_1px_0_0_0_hsl(var(--border))] group-hover/pag-quit:bg-muted/50">
                                <div className="flex justify-end gap-1.5 flex-wrap">
                                  {m.ultimoPagamentoId != null && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      type="button"
                                      className="h-8 gap-1"
                                      disabled={editPagamentoLoadingMeeiroId === m.meeiroId}
                                      onClick={() => void abrirEditarPagamento(m)}
                                    >
                                      {editPagamentoLoadingMeeiroId === m.meeiroId ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Pencil className="w-4 h-4" />
                                      )}
                                      Editar
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                      setDetailMeeiroId(m.meeiroId);
                                      setOpenDetailMeeiro(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Ver detalhes
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    </div>
                    {totalPagamentoMeeirosLista > 0 && totalPagamentoMeeirosPages > 1 && (
                      <div className="border-t px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">
                          Mostrando{' '}
                          {(pagamentoMeeirosPage - 1) * PAGAMENTO_MEEIROS_PAGE_SIZE + 1} a{' '}
                          {Math.min(
                            pagamentoMeeirosPage * PAGAMENTO_MEEIROS_PAGE_SIZE,
                            totalPagamentoMeeirosLista,
                          )}{' '}
                          de {totalPagamentoMeeirosLista} meeiros
                        </div>
                        <Pagination className="justify-end">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPagamentoMeeirosPage((prev) => Math.max(1, prev - 1));
                                }}
                                className={
                                  pagamentoMeeirosPage === 1 ? 'pointer-events-none opacity-50' : ''
                                }
                              />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPagamentoMeeirosPage((prev) =>
                                    Math.min(totalPagamentoMeeirosPages, prev + 1),
                                  );
                                }}
                                className={
                                  pagamentoMeeirosPage === totalPagamentoMeeirosPages
                                    ? 'pointer-events-none opacity-50'
                                    : ''
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tab Relatório */}
          <TabsContent value="relatorio" className="space-y-4">
            <div id="rel-notas-lancamento" className="bg-card border rounded-xl p-4 sm:p-5 scroll-mt-24">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">Notas de lançamento</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Produto, quantidades, preço de compra e total (PDF). Os filtros abaixo são os mesmos do relatório
                    geral seguinte e da sidebar de lançamentos.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Produtor</Label>
                    <RelatorioTabComboProdutor
                      value={relatorioSheetProdutorId}
                      onChange={(id) => {
                        setRelatorioSheetProdutorId(id);
                        setRelatorioEstoqueRocaId('');
                        setRelatorioSheetProdutoId('');
                      }}
                      produtores={produtoresRelatorioOrdenados}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Roça (opcional)</Label>
                    <RelatorioTabComboRoca
                      value={relatorioEstoqueRocaId}
                      onChange={(id) => {
                        setRelatorioEstoqueRocaId(id);
                        setRelatorioSheetProdutoId('');
                      }}
                      rocas={rocasRelatorioFiltros}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Produto (opcional)</Label>
                    <RelatorioTabComboProduto
                      value={relatorioSheetProdutoId}
                      onChange={setRelatorioSheetProdutoId}
                      produtos={produtosRelatorioFiltrosOrdenados}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data inicial</Label>
                    <Input
                      type="date"
                      value={relatorioEstoqueDataInicio}
                      onChange={(e) => setRelatorioEstoqueDataInicio(e.target.value)}
                      className="h-9 w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data final</Label>
                    <Input
                      type="date"
                      value={relatorioEstoqueDataFim}
                      onChange={(e) => setRelatorioEstoqueDataFim(e.target.value)}
                      className="h-9 w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-border/60">
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[160px]"
                    disabled={
                      relatorioProdutoOrigemLoading !== null || relatorioEstoqueLoading !== null
                    }
                    onClick={async () => {
                      try {
                        setRelatorioProdutoOrigemLoading('download');
                        await controleRocaService.downloadRelatorioProdutoPorOrigemPdf(
                          relatorioEstoqueDataInicio || undefined,
                          relatorioEstoqueDataFim || undefined,
                          relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                          relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                          relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId,
                        );
                        toast.success('PDF baixado');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao gerar PDF');
                      } finally {
                        setRelatorioProdutoOrigemLoading(null);
                      }
                    }}
                  >
                    {relatorioProdutoOrigemLoading === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[120px]"
                    disabled={
                      relatorioProdutoOrigemLoading !== null || relatorioEstoqueLoading !== null
                    }
                    onClick={async () => {
                      try {
                        setRelatorioProdutoOrigemLoading('print');
                        await controleRocaService.printRelatorioProdutoPorOrigemPdf(
                          relatorioEstoqueDataInicio || undefined,
                          relatorioEstoqueDataFim || undefined,
                          relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                          relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                          relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId,
                        );
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao abrir PDF');
                      } finally {
                        setRelatorioProdutoOrigemLoading(null);
                      }
                    }}
                  >
                    {relatorioProdutoOrigemLoading === 'print' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

            <div id="rel-colheita-meeiros" className="bg-card border rounded-xl p-4 sm:p-5 scroll-mt-24">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sprout className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">Relatório de colheita por meeiro</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nome do meeiro, quantidade colhida, mudas plantadas e valor total colhido (PDF). Usa os mesmos
                    filtros de produtor, roça, produto e período acima.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Meeiro</Label>
                    <RelatorioTabComboMeeiro
                      value={relColheitaMeeiroId}
                      onChange={setRelColheitaMeeiroId}
                      meeiros={meeirosColheitaRelatorio}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[160px]"
                    disabled={
                      relatorioColheitaMeeiroLoading !== null ||
                      relatorioProdutoOrigemLoading !== null ||
                      relatorioEstoqueLoading !== null
                    }
                    onClick={async () => {
                      try {
                        setRelatorioColheitaMeeiroLoading('download');
                        await controleRocaService.downloadRelatorioColheitaMeeirosPdf(
                          relatorioEstoqueDataInicio || undefined,
                          relatorioEstoqueDataFim || undefined,
                          relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                          relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                          relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId,
                          relColheitaMeeiroId === '' ? undefined : relColheitaMeeiroId,
                        );
                        toast.success('PDF baixado');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao gerar PDF');
                      } finally {
                        setRelatorioColheitaMeeiroLoading(null);
                      }
                    }}
                  >
                    {relatorioColheitaMeeiroLoading === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[120px]"
                    disabled={
                      relatorioColheitaMeeiroLoading !== null ||
                      relatorioProdutoOrigemLoading !== null ||
                      relatorioEstoqueLoading !== null
                    }
                    onClick={async () => {
                      try {
                        setRelatorioColheitaMeeiroLoading('print');
                        await controleRocaService.printRelatorioColheitaMeeirosPdf(
                          relatorioEstoqueDataInicio || undefined,
                          relatorioEstoqueDataFim || undefined,
                          relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                          relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                          relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId,
                          relColheitaMeeiroId === '' ? undefined : relColheitaMeeiroId,
                        );
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao abrir PDF');
                      } finally {
                        setRelatorioColheitaMeeiroLoading(null);
                      }
                    }}
                  >
                    {relatorioColheitaMeeiroLoading === 'print' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

            <div id="rel-lancamento-produtos" className="bg-card border rounded-xl p-4 sm:p-5 scroll-mt-24">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">Relatório geral de lançamento</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Período, produtor, roça e produto (opcionais). Mesmos filtros das Notas de lançamento acima e da
                    sidebar de lançamentos.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Produtor</Label>
                    <RelatorioTabComboProdutor
                      value={relatorioSheetProdutorId}
                      onChange={(id) => {
                        setRelatorioSheetProdutorId(id);
                        setRelatorioEstoqueRocaId('');
                        setRelatorioSheetProdutoId('');
                      }}
                      produtores={produtoresRelatorioOrdenados}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Roça (opcional)</Label>
                    <RelatorioTabComboRoca
                      value={relatorioEstoqueRocaId}
                      onChange={(id) => {
                        setRelatorioEstoqueRocaId(id);
                        setRelatorioSheetProdutoId('');
                      }}
                      rocas={rocasRelatorioFiltros}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Produto (opcional)</Label>
                    <RelatorioTabComboProduto
                      value={relatorioSheetProdutoId}
                      onChange={setRelatorioSheetProdutoId}
                      produtos={produtosRelatorioFiltrosOrdenados}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data inicial</Label>
                    <Input
                      type="date"
                      value={relatorioEstoqueDataInicio}
                      onChange={(e) => setRelatorioEstoqueDataInicio(e.target.value)}
                      className="h-9 w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data final</Label>
                    <Input
                      type="date"
                      value={relatorioEstoqueDataFim}
                      onChange={(e) => setRelatorioEstoqueDataFim(e.target.value)}
                      className="h-9 w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-border/60">
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[160px]"
                    disabled={
                      relatorioEstoqueLoading !== null || relatorioProdutoOrigemLoading !== null
                    }
                    onClick={async () => {
                      try {
                        setRelatorioEstoqueLoading('download');
                        await controleRocaService.downloadRelatorioLancamentoProdutosPdf(
                          relatorioEstoqueDataInicio || undefined,
                          relatorioEstoqueDataFim || undefined,
                          relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                          relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                          relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId
                        );
                        toast.success('PDF baixado');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao gerar PDF');
                      } finally {
                        setRelatorioEstoqueLoading(null);
                      }
                    }}
                  >
                    {relatorioEstoqueLoading === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Baixar PDF
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[120px]"
                    disabled={
                      relatorioEstoqueLoading !== null || relatorioProdutoOrigemLoading !== null
                    }
                    onClick={async () => {
                      try {
                        setRelatorioEstoqueLoading('print');
                        await controleRocaService.printRelatorioLancamentoProdutosPdf(
                          relatorioEstoqueDataInicio || undefined,
                          relatorioEstoqueDataFim || undefined,
                          relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                          relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                          relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId
                        );
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao abrir PDF');
                      } finally {
                        setRelatorioEstoqueLoading(null);
                      }
                    }}
                  >
                    {relatorioEstoqueLoading === 'print' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Imprimir
                  </Button>

                </div>
              </div>
            </div>

            {/* Relatório de lançamentos de meeiros */}
            <div id="rel-lancamentos-meeiros" className="bg-card border rounded-xl p-4 sm:p-5 scroll-mt-24">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">Relatório de lançamentos de meeiros</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gera o relatório por meeiro selecionado com os lançamentos do período e permite exportar em PDF.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5 min-w-[240px]">
                    <Label className="text-xs font-medium">Meeiro</Label>
                  <Popover
                    open={relMeeiroPopoverOpen}
                    onOpenChange={(o) => {
                      setRelMeeiroPopoverOpen(o);
                      if (!o) setRelMeeiroSearchTerm('');
                    }}
                    modal
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={relMeeiroPopoverOpen}
                        className="h-9 w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {relMeeiroId === ''
                            ? 'Selecione o meeiro'
                            : (() => {
                                const m = meeirosParaRelatorio.find((x) => Number(x.id) === Number(relMeeiroId));
                                return m ? `${m.nome ?? ''} (${m.porcentagem_padrao}%)` : 'Selecione o meeiro';
                              })()}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar por código ou nome..."
                          value={relMeeiroSearchTerm}
                          onValueChange={setRelMeeiroSearchTerm}
                          className="h-10"
                        />
                        <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                          <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
                          <CommandGroup>
                            {meeirosRelatorioFiltrados.map((m) => (
                              <CommandItem
                                key={m.id}
                                value={String(m.id)}
                                onSelect={() => {
                                  setRelMeeiroId(Number(m.id));
                                  setRelMeeiroPopoverOpen(false);
                                  setRelMeeiroSearchTerm('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    Number(relMeeiroId) === Number(m.id) ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {m.nome} ({m.porcentagem_padrao}%)
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data inicial</Label>
                    <Input
                      type="date"
                      value={relDataInicial}
                      onChange={(e) => setRelDataInicial(e.target.value)}
                      className="h-9 w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data final</Label>
                    <Input
                      type="date"
                      value={relDataFinal}
                      onChange={(e) => setRelDataFinal(e.target.value)}
                      className="h-9 w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-border/60">
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[160px]"
                    disabled={relPdfLoadingAction !== null}
                    onClick={async () => {
                      if (relMeeiroId === '') {
                        toast.error('Selecione um meeiro');
                        return;
                      }
                      try {
                        setRelPdfLoadingAction('download');
                        await controleRocaService.downloadRelatorioPorMeeiroPdf({
                          meeiroId: Number(relMeeiroId),
                          dataInicial: relDataInicial || undefined,
                          dataFinal: relDataFinal || undefined,
                        });
                        toast.success('PDF baixado');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao gerar PDF');
                      } finally {
                        setRelPdfLoadingAction(null);
                      }
                    }}
                  >
                    {relPdfLoadingAction === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Baixar PDF
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[120px]"
                    disabled={relPdfLoadingAction !== null}
                    onClick={async () => {
                      if (relMeeiroId === '') {
                        toast.error('Selecione um meeiro');
                        return;
                      }
                      try {
                        setRelPdfLoadingAction('print');
                        await controleRocaService.printRelatorioPorMeeiroPdf({
                          meeiroId: Number(relMeeiroId),
                          dataInicial: relDataInicial || undefined,
                          dataFinal: relDataFinal || undefined,
                        });
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || err?.message || 'Erro ao abrir PDF');
                      } finally {
                        setRelPdfLoadingAction(null);
                      }
                    }}
                  >
                    {relPdfLoadingAction === 'print' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Imprimir
                  </Button>
                </div>
              </div>

              {relMeeiroId !== '' && (() => {
                const meeiroSel = meeirosParaRelatorio.find((m) => Number(m.id) === Number(relMeeiroId));
                if (!meeiroSel) return null;
                return (
                  <p className="text-sm text-muted-foreground mt-3">
                    Meeiro selecionado: <span className="font-medium text-foreground">{meeiroSel.nome}</span>
                  </p>
                );
              })()}
            </div>

            {/* Relatório de Meeiros (múltiplos) em PDF – período e roças */}
            <div id="relatorio-meeiros-pdf" className="bg-card border rounded-xl p-4 sm:p-5 scroll-mt-24">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">Relatório de repasse ao parceiro</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sem meeiro e sem datas: PDF em lista consolidada. Com um meeiro e período: repasse ao parceiro
                    detalhado. Com &quot;Todos os meeiros&quot;, use os botões{' '}
                    <span className="font-medium">Repasses ao parceiro (1 PDF)</span> para um único arquivo com um documento por
                    parceiro (páginas separadas). Roças e status são opcionais.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Meeiro</Label>
                    <Popover
                      open={relPagMeeiroPopoverOpen}
                      onOpenChange={(o) => {
                        setRelPagMeeiroPopoverOpen(o);
                        if (!o) setRelPagMeeiroSearchTerm('');
                      }}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={relPagMeeiroPopoverOpen}
                          className="h-9 w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {relPagMeeiroId === ''
                              ? 'Todos os meeiros'
                              : (() => {
                                  const m = meeirosParaRelatorio.find((x) => Number(x.id) === Number(relPagMeeiroId));
                                  return m ? `${m.nome ?? ''} (${m.porcentagem_padrao}%)` : 'Todos os meeiros';
                                })()}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por código ou nome..."
                            value={relPagMeeiroSearchTerm}
                            onValueChange={setRelPagMeeiroSearchTerm}
                            className="h-10"
                          />
                          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="todos-meeiros"
                                onSelect={() => {
                                  setRelPagMeeiroId('');
                                  setRelPagMeeiroPopoverOpen(false);
                                  setRelPagMeeiroSearchTerm('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    relPagMeeiroId === '' ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                Todos os meeiros
                              </CommandItem>
                              {meeirosRelatorioPagFiltrados.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={String(m.id)}
                                  onSelect={() => {
                                    setRelPagMeeiroId(Number(m.id));
                                    setRelPagMeeiroPopoverOpen(false);
                                    setRelPagMeeiroSearchTerm('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      Number(relPagMeeiroId) === Number(m.id) ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {m.nome} ({m.porcentagem_padrao}%)
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data inicial</Label>
                    <Input
                      type="date"
                      className="h-9"
                      value={relMeeirosPdfDataInicial}
                      onChange={(e) => setRelMeeirosPdfDataInicial(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data final</Label>
                    <Input
                      type="date"
                      className="h-9"
                      value={relMeeirosPdfDataFinal}
                      onChange={(e) => setRelMeeirosPdfDataFinal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Status</Label>
                    <Select value={relPagFiltroPagamento} onValueChange={onRelPagFiltroPagamentoChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pagos">Quitados</SelectItem>
                        <SelectItem value="pendentes">Pendentes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Roças (opcional)</Label>
                    <Popover
                      onOpenChange={(open) => {
                        if (!open) setRelMeeirosPdfRocaBusca('');
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 w-full justify-between font-normal">
                          <span className="truncate">
                            {relMeeirosPdfRocaIds.length === 0
                              ? 'Todas as roças'
                              : `${relMeeirosPdfRocaIds.length} roça(s)`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <div className="border-b p-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <Input
                              type="search"
                              placeholder="Buscar roça..."
                              value={relMeeirosPdfRocaBusca}
                              onChange={(e) => setRelMeeirosPdfRocaBusca(e.target.value)}
                              className="h-9 pl-8"
                              aria-label="Filtrar lista de roças"
                            />
                          </div>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto space-y-1 p-2">
                          {rocasParaRelatorioPdfFiltradas.length === 0 ? (
                            <p className="text-sm text-muted-foreground px-1 py-2">Nenhuma roça encontrada.</p>
                          ) : (
                            rocasParaRelatorioPdfFiltradas.map((r) => (
                              <label
                                key={r.id}
                                className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={relMeeirosPdfRocaIds.includes(r.id)}
                                  onCheckedChange={(c) => {
                                    setRelMeeirosPdfRocaIds((prev) =>
                                      c ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                                    );
                                  }}
                                />
                                <span className="text-sm">{r.nome}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-border/60">
                  <Button
                    variant="outline"
                    className="gap-2 min-w-[120px]"
                    disabled={relPagPdfLoadingAction !== null}
                    onClick={async () => {
                      try {
                        setRelPagPdfLoadingAction('download');
                        await controleRocaService.downloadRelatorioMeeirosPdf({
                          meeiroId: relPagMeeiroId === '' ? undefined : Number(relPagMeeiroId),
                          dataInicial: relMeeirosPdfDataInicial || undefined,
                          dataFinal: relMeeirosPdfDataFinal || undefined,
                          rocas: relMeeirosPdfRocaIds.length ? relMeeirosPdfRocaIds : undefined,
                          filtroPagamento: relPagFiltroPagamento,
                        });
                        toast.success('PDF baixado');
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || e?.message || 'Erro ao gerar PDF');
                      } finally {
                        setRelPagPdfLoadingAction(null);
                      }
                    }}
                  >
                    {relPagPdfLoadingAction === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 min-w-[120px]"
                    disabled={relPagPdfLoadingAction !== null}
                    onClick={async () => {
                      try {
                        setRelPagPdfLoadingAction('print');
                        await controleRocaService.printRelatorioMeeirosPdf({
                          meeiroId: relPagMeeiroId === '' ? undefined : Number(relPagMeeiroId),
                          dataInicial: relMeeirosPdfDataInicial || undefined,
                          dataFinal: relMeeirosPdfDataFinal || undefined,
                          rocas: relMeeirosPdfRocaIds.length ? relMeeirosPdfRocaIds : undefined,
                          filtroPagamento: relPagFiltroPagamento,
                        });
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || e?.message || 'Erro ao abrir PDF');
                      } finally {
                        setRelPagPdfLoadingAction(null);
                      }
                    }}
                  >
                    {relPagPdfLoadingAction === 'print' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Imprimir
                  </Button>
                  {relPagMeeiroId === '' && (
                    <>
                      <Button
                        variant="secondary"
                        className="gap-2 min-w-[120px]"
                        disabled={relPagPdfLoadingAction !== null}
                        onClick={async () => {
                          try {
                            setRelPagPdfLoadingAction('download-recibos');
                            await controleRocaService.downloadRelatorioMeeirosPdf({
                              layout: 'recibos',
                              dataInicial: relMeeirosPdfDataInicial || undefined,
                              dataFinal: relMeeirosPdfDataFinal || undefined,
                              rocas: relMeeirosPdfRocaIds.length ? relMeeirosPdfRocaIds : undefined,
                              filtroPagamento: relPagFiltroPagamento,
                            });
                            toast.success('PDF baixado');
                          } catch (e: any) {
                            toast.error(e?.message || e?.response?.data?.message || 'Erro ao gerar PDF');
                          } finally {
                            setRelPagPdfLoadingAction(null);
                          }
                        }}
                      >
                        {relPagPdfLoadingAction === 'download-recibos' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Repasses ao parceiro (1 PDF)
                      </Button>
                      <Button
                        variant="secondary"
                        className="gap-2 min-w-[120px]"
                        disabled={relPagPdfLoadingAction !== null}
                        onClick={async () => {
                          try {
                            setRelPagPdfLoadingAction('print-recibos');
                            await controleRocaService.printRelatorioMeeirosPdf({
                              layout: 'recibos',
                              dataInicial: relMeeirosPdfDataInicial || undefined,
                              dataFinal: relMeeirosPdfDataFinal || undefined,
                              rocas: relMeeirosPdfRocaIds.length ? relMeeirosPdfRocaIds : undefined,
                              filtroPagamento: relPagFiltroPagamento,
                            });
                          } catch (e: any) {
                            toast.error(e?.message || e?.response?.data?.message || 'Erro ao abrir PDF');
                          } finally {
                            setRelPagPdfLoadingAction(null);
                          }
                        }}
                      >
                        {relPagPdfLoadingAction === 'print-recibos' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                        Imprimir repasses ao parceiro
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">Relatório de empréstimos de meeiros</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Exibe os meeiros que pediram empréstimo com data e valor, permitindo exportar em PDF.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data inicial</Label>
                    <Input
                      type="date"
                      className="h-9"
                      value={relEmprestimosDataInicial}
                      onChange={(e) => setRelEmprestimosDataInicial(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data final</Label>
                    <Input
                      type="date"
                      className="h-9"
                      value={relEmprestimosDataFinal}
                      onChange={(e) => setRelEmprestimosDataFinal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Roça (opcional)</Label>
                    <RelatorioTabComboRoca
                      value={relEmprestimosRocaId}
                      onChange={setRelEmprestimosRocaId}
                      rocas={rocas}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-border/60">
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[160px]"
                    disabled={relEmprestimosLoadingAction !== null}
                    onClick={async () => {
                      try {
                        setRelEmprestimosLoadingAction('download');
                        await controleRocaService.downloadRelatorioEmprestimosMeeirosPdf({
                          dataInicial: relEmprestimosDataInicial || undefined,
                          dataFinal: relEmprestimosDataFinal || undefined,
                          rocas: relEmprestimosRocaId === '' ? undefined : [relEmprestimosRocaId],
                        });
                        toast.success('PDF baixado');
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || e?.message || 'Erro ao gerar PDF');
                      } finally {
                        setRelEmprestimosLoadingAction(null);
                      }
                    }}
                  >
                    {relEmprestimosLoadingAction === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-9 min-w-[120px]"
                    disabled={relEmprestimosLoadingAction !== null}
                    onClick={async () => {
                      try {
                        setRelEmprestimosLoadingAction('print');
                        await controleRocaService.printRelatorioEmprestimosMeeirosPdf({
                          dataInicial: relEmprestimosDataInicial || undefined,
                          dataFinal: relEmprestimosDataFinal || undefined,
                          rocas: relEmprestimosRocaId === '' ? undefined : [relEmprestimosRocaId],
                        });
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || e?.message || 'Erro ao abrir PDF');
                      } finally {
                        setRelEmprestimosLoadingAction(null);
                      }
                    }}
                  >
                    {relEmprestimosLoadingAction === 'print' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>

            {relResult && (
              <div className="bg-card border rounded-xl overflow-hidden space-y-4">
                {relMeeiroId !== '' && (() => {
                  const meeiroSel = meeirosParaRelatorio.find((m) => Number(m.id) === Number(relMeeiroId));
                  if (!meeiroSel) return null;
                  const meeiroLabel = meeiroSel.nome;
                  return (
                    <div className="p-4 pb-0">
                      <p className="text-sm text-muted-foreground">Meeiro</p>
                      <p className="text-base font-semibold text-foreground">{meeiroLabel}</p>
                    </div>
                  );
                })()}
                <div className="p-4 border-b grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor bruto</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(relResult.resumo.valorBruto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">% do meeiro</p>
                    <p className="text-lg font-semibold">
                      {relResult.resumo.percentualMedio.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor total a receber</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(relResult.resumo.valorTotalReceber)}
                    </p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Meeiro</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Preço de compra</TableHead>
                      <TableHead>Valor total</TableHead>
                      <TableHead className="text-right">Porcentagem</TableHead>
                      <TableHead className="text-right">Valor a receber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relResult.linhas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                          Nenhum lançamento no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      relResult.linhas.map((linha, idx) => {
                        const meeiroSel = meeirosParaRelatorio.find((m) => Number(m.id) === Number(relMeeiroId));
                        const meeiroNome = meeiroSel ? meeiroSel.nome : '-';
                        return (
                          <TableRow key={idx}>
                            <TableCell>{formatDate(linha.data)}</TableCell>
                            <TableCell>{meeiroNome}</TableCell>
                            <TableCell>{linha.produto}</TableCell>
                            <TableCell>{linha.quantidade}</TableCell>
                            <TableCell>{formatCurrency(linha.preco_unitario)}</TableCell>
                            <TableCell>{formatCurrency(linha.valor_total)}</TableCell>
                            <TableCell className="text-right">{linha.porcentagem ?? 0}%</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(linha.valorParte ?? linha.valor_parte ?? 0))}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="diario-roca" className="space-y-4">
            <DiarioRocaTab />
          </TabsContent>
        </Tabs>

        {/* Dialog Novo Produtor - mesmo design do Novo Cliente: tipo PF/PJ, CPF/CNPJ separados, consulta CNPJ */}
        <Dialog
        open={openProdutor}
        onOpenChange={(open) => {
          setOpenProdutor(open);
          if (!open) {
            setFormProdutor({
              nome: '',
              codigo: '',
              tipo_pessoa: 'pessoa_fisica',
              cpf: '',
              telefone: '',
              endereco: '',
              nome_razao: '',
              cnpj: '',
            });
          }
        }}
      >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Novo Produtor</DialogTitle>
                  <DialogDescription className="mt-1">
                    Cadastre o responsável pela roça.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Código - opcional: deixar em branco para gerar automaticamente (ex: P001, P002) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  Código do produtor
                  <span className="text-xs text-muted-foreground font-normal">
                    (opcional – deixe em branco para gerar automaticamente)
                  </span>
                </Label>
                <Input
                  value={formProdutor.codigo}
                  onChange={(e) =>
                    setFormProdutor((p) => ({ ...p, codigo: e.target.value }))
                  }
                  placeholder="Ex: P001 – ou em branco para o sistema gerar"
                />
              </div>

              {/* Tipo de Produtor: Pessoa Jurídica (CNPJ) / Pessoa Física (CPF) */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Tipo de Produtor</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoPessoaProdutor('PESSOA_JURIDICA');
                      setFormProdutor((p) => ({ ...p, cpf_cnpj: '' }));
                    }}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      tipoPessoaProdutor === 'PESSOA_JURIDICA'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    {tipoPessoaProdutor === 'PESSOA_JURIDICA' && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-3">
                      <Building2
                        className={`w-8 h-8 ${
                          tipoPessoaProdutor === 'PESSOA_JURIDICA'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <div className="text-center">
                        <p
                          className={`font-semibold ${
                            tipoPessoaProdutor === 'PESSOA_JURIDICA'
                              ? 'text-primary'
                              : 'text-foreground'
                          }`}
                        >
                          Pessoa Jurídica
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">CNPJ</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipoPessoaProdutor('PESSOA_FISICA');
                      setFormProdutor((p) => ({ ...p, cpf_cnpj: '' }));
                    }}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      tipoPessoaProdutor === 'PESSOA_FISICA'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    {tipoPessoaProdutor === 'PESSOA_FISICA' && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-3">
                      <User
                        className={`w-8 h-8 ${
                          tipoPessoaProdutor === 'PESSOA_FISICA'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <div className="text-center">
                        <p
                          className={`font-semibold ${
                            tipoPessoaProdutor === 'PESSOA_FISICA'
                              ? 'text-primary'
                              : 'text-foreground'
                          }`}
                        >
                          Pessoa Física
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">CPF</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Nome / Razão social */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  {tipoPessoaProdutor === 'PESSOA_JURIDICA' ? (
                    <>Razão Social / Nome Fantasia <span className="text-destructive">*</span></>
                  ) : (
                    <>Nome <span className="text-destructive">*</span></>
                  )}
                </Label>
                <Input
                  placeholder={
                    tipoPessoaProdutor === 'PESSOA_JURIDICA'
                      ? 'Razão Social ou Nome Fantasia da empresa'
                      : 'Nome completo do produtor'
                  }
                  value={formProdutor.nome_razao}
                  onChange={(e) =>
                    setFormProdutor((p) => ({ ...p, nome_razao: e.target.value }))
                  }
                />
              </div>

              {/* CPF ou CNPJ - separado: PJ com consulta, PF com máscara */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  {tipoPessoaProdutor === 'PESSOA_JURIDICA' ? 'CNPJ' : 'CPF'}
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                {tipoPessoaProdutor === 'PESSOA_JURIDICA' ? (
                  <CampoCnpjComConsulta
                    value={formProdutor.cpf_cnpj || ''}
                    onChange={(value) =>
                      setFormProdutor((p) => ({ ...p, cpf_cnpj: value }))
                    }
                    tipoConsulta="geral"
                    placeholder="00.000.000/0000-00"
                    onPreencherCampos={(dados: ConsultaCnpjResponse) => {
                      if (dados.razaoSocial) {
                        setFormProdutor((p) => ({ ...p, nome_razao: dados.razaoSocial }));
                      }
                      if (dados.nomeFantasia && !formProdutor.nome_razao) {
                        setFormProdutor((p) => ({ ...p, nome_razao: dados.nomeFantasia }));
                      }
                      if (dados.logradouro || dados.cep || dados.cidade) {
                        const partes = [
                          dados.logradouro,
                          dados.numero && `nº ${dados.numero}`,
                          dados.bairro,
                          dados.cep,
                          dados.cidade && dados.uf && `${dados.cidade}/${dados.uf}`,
                        ].filter(Boolean);
                        setFormProdutor((p) => ({
                          ...p,
                          endereco: partes.join(', '),
                        }));
                      }
                      if (dados.telefones && dados.telefones.length > 0) {
                        const digits = dados.telefones[0].replace(/\D/g, '').slice(0, 11);
                        const tel = digits ? formatTelefone(digits) : '';
                        setFormProdutor((p) => ({ ...p, telefone: tel }));
                      }
                    }}
                  />
                ) : (
                  <Input
                    placeholder="000.000.000-00"
                    value={formProdutor.cpf_cnpj || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const cleaned = cleanDocument(v);
                      const limited = cleaned.slice(0, 11);
                      const formatted =
                        limited.length === 11
                          ? formatCPF(limited)
                          : limited
                            .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
                            .replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3')
                            .replace(/^(\d{3})(\d{3})$/, '$1.$2')
                            .replace(/^(\d{3})$/, '$1');
                      setFormProdutor((p) => ({ ...p, cpf_cnpj: formatted }));
                    }}
                  />
                )}
                {tipoPessoaProdutor === 'PESSOA_JURIDICA' &&
                  formProdutor.cpf_cnpj &&
                  cleanDocument(formProdutor.cpf_cnpj).length > 0 &&
                  cleanDocument(formProdutor.cpf_cnpj).length !== 14 && (
                    <p className="text-xs text-destructive mt-1">CNPJ deve ter 14 dígitos.</p>
                  )}
                {tipoPessoaProdutor === 'PESSOA_FISICA' &&
                  formProdutor.cpf_cnpj &&
                  cleanDocument(formProdutor.cpf_cnpj).length > 0 &&
                  cleanDocument(formProdutor.cpf_cnpj).length !== 11 && (
                    <p className="text-xs text-destructive mt-1">CPF deve ter 11 dígitos.</p>
                  )}
              </div>

              {/* Telefone / WhatsApp */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Telefone / WhatsApp
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  inputMode="tel"
                  autoComplete="tel"
                  value={formProdutor.telefone || ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const formatted = digits ? formatTelefone(digits) : '';
                    setFormProdutor((p) => ({ ...p, telefone: formatted }));
                  }}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Endereço
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  value={formProdutor.endereco || ''}
                  onChange={(e) =>
                    setFormProdutor((p) => ({ ...p, endereco: e.target.value }))
                  }
                  placeholder="Endereço completo"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Inscrição estadual
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  value={formProdutor.inscricao_estadual || ''}
                  onChange={(e) =>
                    setFormProdutor((p) => ({
                      ...p,
                      inscricao_estadual: e.target.value.slice(0, 30),
                    }))
                  }
                  placeholder="Ex.: 123.456.789.012"
                  maxLength={30}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenProdutor(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (!formProdutor.nome_razao.trim()) {
                    toast.error('Nome é obrigatório');
                    return;
                  }
                  const telWa = normalizarTelefoneWhatsappEnvio(
                    formProdutor.telefone || '',
                  );
                  createProdutor.mutate({
                    ...formProdutor,
                    codigo: formProdutor.codigo?.trim() || undefined,
                    telefone: telWa.telefone,
                    whatsapp: telWa.whatsapp,
                    inscricao_estadual: formProdutor.inscricao_estadual?.trim() || undefined,
                  });
                }}
                disabled={createProdutor.isPending}
              >
                {createProdutor.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Detalhes do Produtor - mesmo design de Visualizar Cliente */}
        <Dialog
          open={openDetailProdutor}
          onOpenChange={(open) => {
            setOpenDetailProdutor(open);
            if (!open) setDetailProdutor(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Visualizar Produtor
              </DialogTitle>
              <DialogDescription>
                Informações completas do produtor
              </DialogDescription>
            </DialogHeader>
            {detailProdutor && (
              <div className="space-y-8 mt-6">
                {/* Informações Básicas */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Código</Label>
                      <p className="font-medium text-base font-mono">{detailProdutor.codigo}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Nome / Razão social</Label>
                      <p className="font-medium text-base">{detailProdutor.nome_razao}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">CPF/CNPJ</Label>
                      <p className="font-medium text-base font-mono">{detailProdutor.cpf_cnpj || '—'}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Tipo</Label>
                      <p className="font-medium text-base">
                        {detailProdutor.cpf_cnpj && cleanDocument(detailProdutor.cpf_cnpj).length === 14
                          ? 'Pessoa Jurídica'
                          : detailProdutor.cpf_cnpj && cleanDocument(detailProdutor.cpf_cnpj).length === 11
                            ? 'Pessoa Física'
                            : '—'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Telefone / WhatsApp</Label>
                      <p className="font-medium text-base">{detailProdutor.telefone || detailProdutor.whatsapp || '—'}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Inscrição estadual</Label>
                      <p className="font-medium text-base font-mono">
                        {detailProdutor.inscricao_estadual?.trim() || '—'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <span
                          className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${
                            detailProdutor.ativo !== false
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {detailProdutor.ativo !== false ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Endereço
                  </h3>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-base whitespace-pre-wrap">
                      {detailProdutor.endereco || '—'}
                    </p>
                  </div>
                </div>

                {/* Roças vinculadas */}
                {rocas.filter((r) => r.produtorId === detailProdutor.id).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sprout className="w-5 h-5 text-primary" />
                      Roças do produtor
                    </h3>
                    <div className="space-y-2">
                      {rocas
                        .filter((r) => r.produtorId === detailProdutor.id)
                        .map((r) => (
                          <div
                            key={r.id}
                            className="p-3 border rounded-lg flex flex-wrap items-center justify-between gap-4 text-sm"
                          >
                            <div>
                              <p className="text-xs text-muted-foreground">Código</p>
                              <p className="font-medium">{r.codigo}</p>
                            </div>
                            <div className="flex-1 min-w-[180px]">
                              <p className="text-xs text-muted-foreground">Nome</p>
                              <p className="font-medium truncate">{r.nome}</p>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <p className="text-xs text-muted-foreground">Localização</p>
                              <p className="font-medium truncate">
                                {r.localizacao || '—'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Informações do Sistema */}
                {(detailProdutor.criadoEm || detailProdutor.atualizadoEm) && (
                  <div className="space-y-2 pt-4 border-t">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Informações do Sistema
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {detailProdutor.criadoEm && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Criado em</Label>
                          <p>{new Date(detailProdutor.criadoEm).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                      {detailProdutor.atualizadoEm && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                          <p>{new Date(detailProdutor.atualizadoEm).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {detailProdutor && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                <Button
                  variant="default"
                  onClick={() => {
                    setOpenDetailProdutor(false);
                    setEditProdutor(detailProdutor);
                    setFormEditProdutor({
                      codigo: detailProdutor.codigo,
                      nome_razao: detailProdutor.nome_razao,
                      cpf_cnpj: detailProdutor.cpf_cnpj ?? '',
                      telefone: telefoneArmazenadoParaCampo(
                        detailProdutor.telefone ?? detailProdutor.whatsapp,
                      ),
                      whatsapp: '',
                      endereco: detailProdutor.endereco ?? '',
                      inscricao_estadual: detailProdutor.inscricao_estadual ?? '',
                    });
                    setTipoPessoaEdit(
                      detailProdutor.cpf_cnpj && cleanDocument(detailProdutor.cpf_cnpj).length === 14
                        ? 'PESSOA_JURIDICA'
                        : 'PESSOA_FISICA'
                    );
                    setOpenEditProdutor(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Produtor */}
        <Dialog
          open={openEditProdutor}
          onOpenChange={(open) => {
            setOpenEditProdutor(open);
            if (!open) setEditProdutor(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Pencil className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Editar produtor</DialogTitle>
                  <DialogDescription className="mt-1">
                    Altere os dados do produtor.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {editProdutor && (
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    Código do produtor
                  </Label>
                  <Input
                    value={formEditProdutor.codigo ?? ''}
                    onChange={(e) =>
                      setFormEditProdutor((p) => ({ ...p, codigo: e.target.value }))
                    }
                    placeholder="Ex: P001"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Tipo de Produtor</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoPessoaEdit('PESSOA_JURIDICA');
                        setFormEditProdutor((p) => ({ ...p, cpf_cnpj: '' }));
                      }}
                      className={`relative p-6 rounded-lg border-2 transition-all ${
                        tipoPessoaEdit === 'PESSOA_JURIDICA'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      {tipoPessoaEdit === 'PESSOA_JURIDICA' && (
                        <div className="absolute top-3 right-3">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-3">
                        <Building2 className={`w-8 h-8 ${tipoPessoaEdit === 'PESSOA_JURIDICA' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-center">
                          <p className={`font-semibold ${tipoPessoaEdit === 'PESSOA_JURIDICA' ? 'text-primary' : 'text-foreground'}`}>Pessoa Jurídica</p>
                          <p className="text-xs text-muted-foreground mt-1">CNPJ</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoPessoaEdit('PESSOA_FISICA');
                        setFormEditProdutor((p) => ({ ...p, cpf_cnpj: '' }));
                      }}
                      className={`relative p-6 rounded-lg border-2 transition-all ${
                        tipoPessoaEdit === 'PESSOA_FISICA'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      {tipoPessoaEdit === 'PESSOA_FISICA' && (
                        <div className="absolute top-3 right-3">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-3">
                        <User className={`w-8 h-8 ${tipoPessoaEdit === 'PESSOA_FISICA' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-center">
                          <p className={`font-semibold ${tipoPessoaEdit === 'PESSOA_FISICA' ? 'text-primary' : 'text-foreground'}`}>Pessoa Física</p>
                          <p className="text-xs text-muted-foreground mt-1">CPF</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {tipoPessoaEdit === 'PESSOA_JURIDICA' ? 'Razão Social / Nome Fantasia' : 'Nome'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={tipoPessoaEdit === 'PESSOA_JURIDICA' ? 'Razão Social ou Nome Fantasia' : 'Nome completo'}
                    value={formEditProdutor.nome_razao ?? ''}
                    onChange={(e) =>
                      setFormEditProdutor((p) => ({ ...p, nome_razao: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    {tipoPessoaEdit === 'PESSOA_JURIDICA' ? 'CNPJ' : 'CPF'} <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  {tipoPessoaEdit === 'PESSOA_JURIDICA' ? (
                    <CampoCnpjComConsulta
                      value={formEditProdutor.cpf_cnpj ?? ''}
                      onChange={(value) =>
                        setFormEditProdutor((p) => ({ ...p, cpf_cnpj: value }))
                      }
                      tipoConsulta="geral"
                      placeholder="00.000.000/0000-00"
                      onPreencherCampos={(dados: ConsultaCnpjResponse) => {
                        if (dados.razaoSocial) setFormEditProdutor((p) => ({ ...p, nome_razao: dados.razaoSocial ?? '' }));
                        if (dados.logradouro || dados.cep || dados.cidade) {
                          const partes = [dados.logradouro, dados.numero && `nº ${dados.numero}`, dados.bairro, dados.cep, dados.cidade && dados.uf && `${dados.cidade}/${dados.uf}`].filter(Boolean);
                          setFormEditProdutor((p) => ({ ...p, endereco: partes.join(', ') }));
                        }
                        if (dados.telefones?.length) {
                          const digits = dados.telefones[0].replace(/\D/g, '').slice(0, 11);
                          const tel = digits ? formatTelefone(digits) : '';
                          setFormEditProdutor((p) => ({ ...p, telefone: tel }));
                        }
                      }}
                    />
                  ) : (
                    <Input
                      placeholder="000.000.000-00"
                      value={formEditProdutor.cpf_cnpj ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const cleaned = cleanDocument(v);
                        const limited = cleaned.slice(0, 11);
                        const formatted = limited.length === 11 ? formatCPF(limited) : limited.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4').replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3').replace(/^(\d{3})(\d{3})$/, '$1.$2').replace(/^(\d{3})$/, '$1');
                        setFormEditProdutor((p) => ({ ...p, cpf_cnpj: formatted }));
                      }}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Telefone / WhatsApp <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    inputMode="tel"
                    autoComplete="tel"
                    value={formEditProdutor.telefone ?? ''}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      const formatted = digits ? formatTelefone(digits) : '';
                      setFormEditProdutor((p) => ({ ...p, telefone: formatted }));
                    }}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Endereço <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    value={formEditProdutor.endereco ?? ''}
                    onChange={(e) =>
                      setFormEditProdutor((p) => ({ ...p, endereco: e.target.value }))
                    }
                    placeholder="Endereço completo"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Inscrição estadual <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    value={formEditProdutor.inscricao_estadual ?? ''}
                    onChange={(e) =>
                      setFormEditProdutor((p) => ({
                        ...p,
                        inscricao_estadual: e.target.value.slice(0, 30),
                      }))
                    }
                    placeholder="Ex.: 123.456.789.012"
                    maxLength={30}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditProdutor(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (!formEditProdutor.nome_razao?.trim()) {
                    toast.error('Nome é obrigatório');
                    return;
                  }
                  if (!editProdutor) return;
                  const telWaEdit = normalizarTelefoneWhatsappEnvio(
                    formEditProdutor.telefone ?? '',
                  );
                  updateProdutor.mutate({
                    id: editProdutor.id,
                    data: {
                      codigo: formEditProdutor.codigo?.trim() || undefined,
                      nome_razao: formEditProdutor.nome_razao,
                      cpf_cnpj: formEditProdutor.cpf_cnpj || undefined,
                      telefone: telWaEdit.telefone,
                      whatsapp: telWaEdit.whatsapp,
                      // Permite enviar endereço vazio para limpar o campo
                      endereco: formEditProdutor.endereco?.trim() ?? '',
                      inscricao_estadual:
                        (formEditProdutor.inscricao_estadual ?? '').trim() || null,
                    },
                  });
                }}
                disabled={updateProdutor.isPending}
              >
                {updateProdutor.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Nova Roça */}
        <Dialog
        open={openRoca}
        onOpenChange={(open) => {
          setOpenRoca(open);
          if (!open)
            setFormRoca({
              produtorId: 0,
              nome: '',
              codigo: '',
              localizacao: '',
              quantidadeMudasPlantadas: undefined,
              dataPlantio: undefined,
              dataInicioColheita: undefined,
              ...ROCA_ENDERECO_CONTATO_VAZIO,
            });
        }}
      >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sprout className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Nova Roça</DialogTitle>
                  <DialogDescription className="mt-1">
                    Cadastre a roça vinculada ao produtor.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-8 pt-6">
              {/* Informações da roça */}
              <div className="bg-card border rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sprout className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Informações da roça</h3>
                    <p className="text-xs text-muted-foreground">
                      Identificação, localização (cadastro interno), datas de plantio/colheita e mudas.
                    </p>
                  </div>
                </div>
                {/* Produtor vinculado */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Produtor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formRoca.produtorId ? String(formRoca.produtorId) : ''}
                    onValueChange={(v) =>
                      setFormRoca((p) => ({ ...p, produtorId: Number(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtores.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.codigo} – {p.nome_razao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      Código da roça
                    </Label>
                    <Input
                      value={formRoca.codigo}
                      onChange={(e) =>
                        setFormRoca((p) => ({ ...p, codigo: e.target.value }))
                      }
                      placeholder="Ex: R001 – ou em branco para o sistema gerar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Nome ou identificação <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formRoca.nome}
                      onChange={(e) =>
                        setFormRoca((p) => ({ ...p, nome: e.target.value }))
                      }
                      placeholder="Ex: Roça do Fundão"
                    />
                  </div>
                </div>

                <RocaEnderecoContatoFields
                  embedded
                  value={formRoca}
                  onChange={(next) => setFormRoca((p) => ({ ...p, ...next }))}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-muted-foreground" />
                      Quantidade de mudas plantadas
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Ex: 5000"
                      value={
                        formRoca.quantidadeMudasPlantadas != null
                          ? String(formRoca.quantidadeMudasPlantadas)
                          : ''
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormRoca((p) => ({
                          ...p,
                          quantidadeMudasPlantadas:
                            v === '' ? undefined : Math.max(0, Math.floor(Number(v)) || 0),
                        }));
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Data do plantio
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      type="date"
                      value={formRoca.dataPlantio ?? ''}
                      onChange={(e) =>
                        setFormRoca((p) => ({
                          ...p,
                          dataPlantio: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Início da colheita
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      type="date"
                      value={formRoca.dataInicioColheita ?? ''}
                      onChange={(e) =>
                        setFormRoca((p) => ({
                          ...p,
                          dataInicioColheita: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenRoca(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (!formRoca.nome.trim() || !formRoca.produtorId) {
                    toast.error('Produtor e nome da roça são obrigatórios');
                    return;
                  }
                  createRoca.mutate({
                    nome: formRoca.nome.trim(),
                    produtorId: formRoca.produtorId,
                    codigo: formRoca.codigo.trim() || undefined,
                    ...rocaEnderecoParaApi(formRoca),
                    ...(formRoca.quantidadeMudasPlantadas != null
                      ? { quantidadeMudasPlantadas: formRoca.quantidadeMudasPlantadas }
                      : {}),
                    ...(formRoca.dataPlantio?.trim()
                      ? { dataPlantio: formRoca.dataPlantio.trim() }
                      : {}),
                    ...(formRoca.dataInicioColheita?.trim()
                      ? { dataInicioColheita: formRoca.dataInicioColheita.trim() }
                      : {}),
                  });
                }}
                disabled={createRoca.isPending}
              >
                {createRoca.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Ver detalhes da Roça */}
        <Dialog
          open={openDetailRoca}
          onOpenChange={(open) => {
            setOpenDetailRoca(open);
            if (!open) setDetailRocaId(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Visualizar Roça
              </DialogTitle>
              <DialogDescription>
                Informações completas da roça.
              </DialogDescription>
            </DialogHeader>
            {loadingDetailRoca ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              detailRoca && (
                <>
                  <div className="space-y-8 mt-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sprout className="w-5 h-5 text-primary" />
                        Informações Básicas
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-sm text-muted-foreground">Código</Label>
                          <p className="font-medium text-base font-mono">{detailRoca.codigo}</p>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm text-muted-foreground">Nome</Label>
                          <p className="font-medium text-base">{detailRoca.nome}</p>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm text-muted-foreground">Produtor</Label>
                          <p className="font-medium text-base">
                            {detailRoca.produtorCodigo && detailRoca.produtorNome
                              ? `${detailRoca.produtorCodigo} – ${detailRoca.produtorNome}`
                              : produtores.find((p) => p.id === detailRoca.produtorId)
                                ? `${produtores.find((p) => p.id === detailRoca.produtorId)!.codigo} – ${produtores.find((p) => p.id === detailRoca.produtorId)!.nome_razao}`
                                : detailRoca.produtorId}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sprout className="w-5 h-5 text-primary" />
                        Produção e mudas
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <Label className="text-xs text-muted-foreground">Mudas plantadas</Label>
                          <p className="font-medium">
                            {detailRoca.quantidadeMudasPlantadas != null
                              ? String(detailRoca.quantidadeMudasPlantadas)
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Data do plantio</Label>
                          <p className="font-medium">{formatDataIsoPt(detailRoca.dataPlantio ?? undefined)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Início da colheita</Label>
                          <p className="font-medium">
                            {formatDataIsoPt(detailRoca.dataInicioColheita ?? undefined)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Total colhido (lançamentos)</Label>
                          <p className="font-medium tabular-nums">
                            {detailRoca.quantidadeColhidaTotal != null
                              ? String(detailRoca.quantidadeColhidaTotal)
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Pés colhidos (soma nos lançamentos)</Label>
                          <p className="font-medium tabular-nums">
                            {detailRoca.quantidadePesColhidosTotal != null
                              ? String(detailRoca.quantidadePesColhidosTotal)
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Percentual colhido</Label>
                          <p className="font-medium tabular-nums">
                            {formatPercentualColhido(detailRoca.percentualColhido)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Quantidade colhida ÷ mudas plantadas cadastradas nesta roça.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Endereço e contato
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <Label className="text-xs text-muted-foreground">CEP</Label>
                          <p className="font-medium">{detailRoca.cep?.trim() || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground">Logradouro</Label>
                          <p className="font-medium">{detailRoca.logradouro?.trim() || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Número</Label>
                          <p className="font-medium">{detailRoca.numero?.trim() || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Complemento</Label>
                          <p className="font-medium">{detailRoca.complemento?.trim() || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Bairro</Label>
                          <p className="font-medium">{detailRoca.bairro?.trim() || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Cidade</Label>
                          <p className="font-medium">{detailRoca.cidade?.trim() || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">UF</Label>
                          <p className="font-medium">{detailRoca.estado?.trim() || '—'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground">Referência</Label>
                          <p className="font-medium whitespace-pre-wrap">
                            {detailRoca.referencia?.trim() || '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            Telefone
                          </Label>
                          <p className="font-medium">
                            {detailRoca.telefone?.trim()
                              ? telefoneArmazenadoParaCampo(detailRoca.telefone) ||
                                detailRoca.telefone
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">E-mail</Label>
                          <p className="font-medium break-all">{detailRoca.email?.trim() || '—'}</p>
                        </div>
                      </div>
                      {detailRoca.localizacao?.trim() ? (
                        <div className="p-4 border rounded-lg border-dashed">
                          <Label className="text-xs text-muted-foreground">Localização (texto livre)</Label>
                          <p className="font-medium text-base whitespace-pre-wrap mt-1">
                            {detailRoca.localizacao}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {(detailRoca.criadoEm || detailRoca.atualizadoEm) && (
                      <div className="space-y-2 pt-4 border-t">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          Informações do Sistema
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {detailRoca.criadoEm && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Criado em</Label>
                              <p>
                                {new Date(detailRoca.criadoEm).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          )}
                          {detailRoca.atualizadoEm && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                              <p>
                                {new Date(detailRoca.atualizadoEm).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                    <Button
                      variant="default"
                      onClick={() => {
                        setOpenDetailRoca(false);
                        setEditRoca(detailRoca);
                        setFormEditRoca({
                          codigo: detailRoca.codigo,
                          nome: detailRoca.nome,
                          localizacao: detailRoca.localizacao ?? '',
                          produtorId: detailRoca.produtorId,
                          ativo: detailRoca.ativo ?? true,
                          quantidadeMudasPlantadas: detailRoca.quantidadeMudasPlantadas ?? null,
                          dataPlantio: detailRoca.dataPlantio ?? null,
                          dataInicioColheita: detailRoca.dataInicioColheita ?? null,
                          ...rocaEnderecoDeRegistro(detailRoca),
                        });
                        setOpenEditRoca(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </>
              )
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Roça */}
        <Dialog
          open={openEditRoca}
          onOpenChange={(open) => {
            setOpenEditRoca(open);
            if (!open) setEditRoca(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Pencil className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Editar Roça</DialogTitle>
                  <DialogDescription className="mt-1">
                    Altere os dados da roça.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {editRoca && (
              <div className="space-y-8 pt-6">
                <div className="bg-card border rounded-xl p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Produtor <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={
                        formEditRoca.produtorId ? String(formEditRoca.produtorId) : ''
                      }
                      onValueChange={(v) =>
                        setFormEditRoca((p) => ({ ...p, produtorId: Number(v) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produtor responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtores.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.codigo} – {p.nome_razao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        Código da roça
                      </Label>
                      <Input
                        value={formEditRoca.codigo ?? ''}
                        onChange={(e) =>
                          setFormEditRoca((p) => ({ ...p, codigo: e.target.value }))
                        }
                        placeholder="Ex: R001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Nome <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={formEditRoca.nome ?? ''}
                        onChange={(e) =>
                          setFormEditRoca((p) => ({ ...p, nome: e.target.value }))
                        }
                        placeholder="Ex: Roça do Fundão"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Localização
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Textarea
                      value={formEditRoca.localizacao ?? ''}
                      onChange={(e) =>
                        setFormEditRoca((p) => ({ ...p, localizacao: e.target.value }))
                      }
                      placeholder="Onde fica a roça"
                      rows={2}
                    />
                  </div>

                  <RocaEnderecoContatoFields
                    embedded
                    value={formEditRoca}
                    onChange={(next) => setFormEditRoca((p) => ({ ...p, ...next }))}
                  />

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label className="text-base">Roça ativa</Label>
                      <p className="text-sm text-muted-foreground">
                        Roças desativadas não aparecem na listagem. Ative para exibir novamente.
                      </p>
                    </div>
                    <Switch
                      checked={formEditRoca.ativo ?? true}
                      onCheckedChange={(checked) =>
                        setFormEditRoca((p) => ({ ...p, ativo: checked }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Mudas plantadas (opcional)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Ex: 5000"
                        value={
                          formEditRoca.quantidadeMudasPlantadas != null
                            ? String(formEditRoca.quantidadeMudasPlantadas)
                            : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormEditRoca((p) => ({
                            ...p,
                            quantidadeMudasPlantadas:
                              v === '' ? null : Math.max(0, Math.floor(Number(v)) || 0),
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Data do plantio</Label>
                      <Input
                        type="date"
                        value={formEditRoca.dataPlantio?.slice(0, 10) ?? ''}
                        onChange={(e) =>
                          setFormEditRoca((p) => ({
                            ...p,
                            dataPlantio: e.target.value ? e.target.value : null,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Início da colheita</Label>
                      <Input
                        type="date"
                        value={formEditRoca.dataInicioColheita?.slice(0, 10) ?? ''}
                        onChange={(e) =>
                          setFormEditRoca((p) => ({
                            ...p,
                            dataInicioColheita: e.target.value ? e.target.value : null,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditRoca(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (!editRoca) return;
                  if (!formEditRoca.nome?.trim() || !formEditRoca.produtorId) {
                    toast.error('Nome e produtor são obrigatórios');
                    return;
                  }
                  const codigoVal = formEditRoca.codigo?.trim();
                  const localizacaoVal = formEditRoca.localizacao?.trim();
                  updateRoca.mutate({
                    id: editRoca.id,
                    data: {
                      codigo: codigoVal || undefined,
                      nome: formEditRoca.nome,
                      // Envia null quando o usuário limpou o campo para o backend gravar vazio
                      localizacao:
                        localizacaoVal === '' || formEditRoca.localizacao === ''
                          ? null
                          : localizacaoVal || undefined,
                      ...rocaEnderecoParaApi(formEditRoca),
                      produtorId: formEditRoca.produtorId || undefined,
                      ativo: formEditRoca.ativo,
                      quantidadeMudasPlantadas:
                        formEditRoca.quantidadeMudasPlantadas == null
                          ? null
                          : Number(formEditRoca.quantidadeMudasPlantadas),
                      dataPlantio: formEditRoca.dataPlantio?.trim()
                        ? formEditRoca.dataPlantio
                        : null,
                      dataInicioColheita: formEditRoca.dataInicioColheita?.trim()
                        ? formEditRoca.dataInicioColheita
                        : null,
                    },
                  });
                }}
                disabled={updateRoca.isPending}
              >
                {updateRoca.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmação para excluir lançamento */}
        <AlertDialog
          open={lancamentoParaExcluirId != null}
          onOpenChange={(open) => {
            if (!open) setLancamentoParaExcluirId(null);
          }}
        >
          <AlertDialogContent className="max-w-md rounded-2xl border shadow-xl">
            <AlertDialogHeader>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <AlertDialogTitle className="text-xl">
                    Excluir lançamento?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <p className="text-sm text-muted-foreground">
                      Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
                    </p>
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2 sm:gap-2">
              <AlertDialogCancel className="mt-4 sm:mt-0">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (lancamentoParaExcluirId != null) {
                    deleteLancamento.mutate(lancamentoParaExcluirId);
                  }
                }}
                disabled={deleteLancamento.isPending || lancamentoParaExcluirId == null}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteLancamento.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de reajuste em massa */}
        <Dialog open={openReajuste} onOpenChange={setOpenReajuste}>
          <DialogContent className="max-w-md" overlayClassName="bg-black/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                Reajustar preço de compra
              </DialogTitle>
              <DialogDescription>
                Defina o novo preço de compra que será aplicado a todos os itens dos {lancamentosSelecionados.size} lançamento(s) selecionado(s).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="novoValorReajuste">Novo preço de compra (R$)</Label>
                <Input
                  id="novoValorReajuste"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="Ex: 5.00"
                  value={novoValorReajuste}
                  onChange={(e) => setNovoValorReajuste(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Este valor será aplicado como preço de compra de todos os produtos em todos os lançamentos selecionados. Os totais serão recalculados automaticamente.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenReajuste(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                disabled={reajustarValor.isPending || !novoValorReajuste || parseFloat(novoValorReajuste) <= 0}
                onClick={() => {
                  const valor = parseFloat(novoValorReajuste.replace(',', '.'));
                  if (!valor || valor <= 0) {
                    toast.error('Informe um valor válido maior que zero');
                    return;
                  }
                  reajustarValor.mutate({
                    idsLancamentos: Array.from(lancamentosSelecionados).map(Number),
                    novoValorUnitario: Number(valor),
                  });
                }}
              >
                {reajustarValor.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reajustando...
                  </>
                ) : (
                  'Aplicar reajuste'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmação para desativar roça */}
        <AlertDialog
          open={openDeleteRoca}
          onOpenChange={(open) => {
            setOpenDeleteRoca(open);
            if (!open) setRocaToDelete(null);
          }}
        >
          <AlertDialogContent className="max-w-md rounded-2xl border shadow-xl">
            <AlertDialogHeader>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Archive className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <AlertDialogTitle className="text-xl">
                    Desativar roça?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {rocaToDelete && (
                        <p>
                          A roça <strong className="font-semibold text-foreground">{rocaToDelete.nome}</strong>{' '}
                          (<span className="font-mono">{rocaToDelete.codigo}</span>) será desativada e não aparecerá mais na listagem.
                        </p>
                      )}
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        Você pode reativá-la depois pela opção Editar, marcando a roça como ativa novamente.
                      </p>
                      <p>Tem certeza que deseja desativar?</p>
                    </div>
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2 sm:gap-2">
              <AlertDialogCancel className="mt-4 sm:mt-0">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (rocaToDelete) {
                    updateRoca.mutate({
                      id: rocaToDelete.id,
                      data: { ativo: false },
                    });
                  }
                }}
                disabled={updateRoca.isPending || !rocaToDelete}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {updateRoca.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desativando...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Desativar roça
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog Novo Meeiro - mesmo design de criar cliente */}
        <Dialog
        open={openMeeiro}
        onOpenChange={(open) => {
          setOpenMeeiro(open);
          if (!open) {
            setFormMeeiro({
              codigo: '',
              nome: '',
              nomeFantasia: '',
              cpf: '',
              telefone: '',
              pixChave: '',
              endereco: '',
              quantidadeMudasPlantadas: undefined,
              porcentagem_padrao: 40,
              valor_de_emba_padrao: VALOR_DE_EMBA_PADRAO,
              produtorId: 0,
            });
          }
        }}
      >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Novo Meeiro</DialogTitle>
                  <DialogDescription className="mt-1">
                    Cadastre o meeiro (mantenedor) vinculado ao produtor.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-10 pt-6">
              <div className="bg-card border rounded-xl p-7 space-y-7">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Informações do meeiro</h3>
                    <p className="text-xs text-muted-foreground">
                      Defina o produtor responsável, código, nome e dados básicos do meeiro.
                    </p>
                  </div>
                </div>

                {/* Produtor */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Produtor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formMeeiro.produtorId ? String(formMeeiro.produtorId) : ''}
                    onValueChange={(v) =>
                      setFormMeeiro((p) => ({ ...p, produtorId: Number(v) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtores.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.codigo} – {p.nome_razao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Código e nome */}
                <div className="grid grid-cols-2 gap-7">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      Código do meeiro
                    </Label>
                    <Input
                      value={formMeeiro.codigo}
                      onChange={(e) =>
                        setFormMeeiro((p) => ({ ...p, codigo: e.target.value }))
                      }
                      placeholder="Ex: M001 – ou em branco para o sistema gerar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Nome <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formMeeiro.nome}
                      onChange={(e) =>
                        setFormMeeiro((p) => ({ ...p, nome: e.target.value }))
                      }
                      placeholder="Nome completo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Nome fantasia
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    value={formMeeiro.nomeFantasia || ''}
                    onChange={(e) =>
                      setFormMeeiro((p) => ({ ...p, nomeFantasia: e.target.value }))
                    }
                    placeholder="Nome fantasia"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-muted-foreground" />
                    Quantidade de mudas plantadas
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Ex: 5000"
                    value={
                      formMeeiro.quantidadeMudasPlantadas != null
                        ? String(formMeeiro.quantidadeMudasPlantadas)
                        : ''
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormMeeiro((p) => ({
                        ...p,
                        quantidadeMudasPlantadas:
                          v === '' ? undefined : Math.max(0, Math.floor(Number(v)) || 0),
                      }));
                    }}
                  />
                </div>

                {/* CPF e porcentagens */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-7">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      CPF
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formMeeiro.cpf || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const cleaned = cleanDocument(v);
                        const limited = cleaned.slice(0, 11);
                        const formatted =
                          limited.length === 11
                            ? formatCPF(limited)
                            : limited
                                .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
                                .replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3')
                                .replace(/^(\d{3})(\d{3})$/, '$1.$2')
                                .replace(/^(\d{3})$/, '$1');
                        setFormMeeiro((p) => ({ ...p, cpf: formatted }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      Porcentagem padrão (%)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="40"
                      value={
                        formMeeiro.porcentagem_padrao === 0
                          ? ''
                          : formMeeiro.porcentagem_padrao
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormMeeiro((p) => ({
                          ...p,
                          porcentagem_padrao: val === '' ? 0 : Number(val),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      Valor de emba (R$)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="1.20"
                      value={
                        formMeeiro.valor_de_emba_padrao === 0
                          ? ''
                          : formMeeiro.valor_de_emba_padrao
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormMeeiro((p) => ({
                          ...p,
                          valor_de_emba_padrao:
                            val === '' ? 0 : Number(val),
                        }));
                      }}
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Telefone
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={formMeeiro.telefone || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const digits = v.replace(/\D/g, '').slice(0, 11);
                      const formatted = digits ? formatTelefone(digits) : '';
                      setFormMeeiro((p) => ({ ...p, telefone: formatted }));
                    }}
                  />
                </div>

                {/* Chave PIX */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    Chave PIX
                    <span className="text-xs text-muted-foreground">(opcional, até 140 caracteres)</span>
                  </Label>
                  <Input
                    placeholder="CPF, celular, e-mail ou chave aleatória"
                    value={formMeeiro.pixChave || ''}
                    onChange={(e) =>
                      setFormMeeiro((p) => ({ ...p, pixChave: e.target.value.slice(0, 140) }))
                    }
                    maxLength={140}
                  />
                </div>

                {/* Endereço */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Endereço
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    value={formMeeiro.endereco || ''}
                    onChange={(e) =>
                      setFormMeeiro((p) => ({ ...p, endereco: e.target.value }))
                    }
                    placeholder="Endereço completo"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenMeeiro(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (!formMeeiro.nome.trim() || !formMeeiro.produtorId) {
                    toast.error('Nome e produtor são obrigatórios');
                    return;
                  }
                  createMeeiro.mutate({
                    ...formMeeiro,
                    codigo: formMeeiro.codigo?.toString().trim() || undefined,
                    nomeFantasia: formMeeiro.nomeFantasia?.trim() || undefined,
                    pixChave: formMeeiro.pixChave?.trim() || undefined,
                    ...(formMeeiro.quantidadeMudasPlantadas != null
                      ? { quantidadeMudasPlantadas: formMeeiro.quantidadeMudasPlantadas }
                      : {}),
                  });
                }}
                disabled={createMeeiro.isPending}
              >
                {createMeeiro.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Detalhes do Meeiro */}
        <Dialog
          open={openDetailMeeiro}
          onOpenChange={(open) => {
            setOpenDetailMeeiro(open);
            if (!open) setDetailMeeiroId(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Visualizar Meeiro
              </DialogTitle>
              <DialogDescription>
                Informações completas do meeiro e resumo financeiro.
              </DialogDescription>
            </DialogHeader>
            {loadingDetailMeeiro ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : detailMeeiro ? (
              <div className="space-y-8 mt-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Código</Label>
                      <p className="font-medium text-base font-mono">{detailMeeiro.codigo}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Nome</Label>
                      <p className="font-medium text-base">{detailMeeiro.nome}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Nome fantasia</Label>
                      <p className="font-medium text-base">{detailMeeiro.nomeFantasia?.trim() || '—'}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Documento (CPF)</Label>
                      <p className="font-medium text-base font-mono">
                        {detailMeeiro.documento ?? detailMeeiro.cpf ?? '—'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Chave PIX</Label>
                      <p className="font-medium text-base break-all">
                        {detailMeeiro.pixChave?.trim() || '—'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Porcentagem padrão (%)</Label>
                      <p className="font-medium text-base">{detailMeeiro.porcentagem_padrao ?? 0}%</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Valor de emba (R$)</Label>
                      <p className="font-medium text-base">
                        {formatCurrency(valorDeEmbaPadraoDeMeeiro(detailMeeiro))}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Quantidade de mudas plantadas</Label>
                      <p className="font-medium text-base">
                        {detailMeeiro.quantidadeMudasPlantadas != null
                          ? String(detailMeeiro.quantidadeMudasPlantadas)
                          : '—'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Telefone</Label>
                      <p className="font-medium text-base">{detailMeeiro.telefone || '—'}</p>
                    </div>
                  </div>
                </div>

                {detailMeeiro.resumoFinanceiro && (
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-primary" />
                      Resumo financeiro
                    </h3>
                    {detailMeeiro.resumoFinanceiro.jaPago ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Valor total pago</Label>
                          <p className="font-semibold text-base text-primary">
                            {formatCurrency(detailMeeiro.resumoFinanceiro.valorTotalPago)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Teve empréstimo</Label>
                          <p className="font-semibold text-base">
                            {detailMeeiro.resumoFinanceiro.teveEmprestimoNoPagamento ? 'Sim' : 'Não'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Total a receber</Label>
                          <p className="font-semibold text-base">{formatCurrency(detailMeeiro.resumoFinanceiro.totalReceber)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Emprést aberto</Label>
                          <p className="font-semibold text-base">{formatCurrency(detailMeeiro.resumoFinanceiro.totalEmprestimosAbertos)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Valor líquido a pagar</Label>
                          <p className="font-semibold text-base text-primary">{formatCurrency(detailMeeiro.resumoFinanceiro.valorLiquido)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {Array.isArray(detailMeeiro.emprestimos) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">Empréstimos</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMeeiroEmprestimo(detailMeeiro);
                          setFormEmprestimo({
                            meeiroId: detailMeeiro.id,
                            valor: 0,
                            data: getDataHojeLocal(),
                            observacao: '',
                          });
                          setOpenEmprestimo(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Novo empréstimo
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailMeeiro.emprestimos.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                Nenhum empréstimo cadastrado.
                              </TableCell>
                            </TableRow>
                          ) : (
                            detailMeeiro.emprestimos.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell>{formatDate(emp.data)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(Number(emp.valor))}</TableCell>
                                <TableCell>
                                  <span className={cn(
                                    'text-xs font-medium px-2 py-1 rounded',
                                    emp.status === 'ABERTO' && 'bg-amber-100 text-amber-800',
                                    emp.status === 'LIQUIDADO' && 'bg-green-100 text-green-800',
                                    emp.status === 'CANCELADO' && 'bg-gray-100 text-gray-600'
                                  )}>
                                    {emp.status === 'ABERTO' ? 'Em aberto' : emp.status === 'LIQUIDADO' ? 'Liquidado' : 'Cancelado'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {emp.status === 'ABERTO' && (
                                    <DropdownMenu modal={false}>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <MoreHorizontal className="w-4 h-4 mr-1" />
                                          Ações
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" side="bottom" className="z-[100]">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setEmprestimoEditando({ id: emp.id, valor: Number(emp.valor) });
                                            setFormEditEmprestimo({ valor: Number(emp.valor) });
                                            setOpenEditEmprestimo(true);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => liquidarEmprestimo.mutate(emp.id)}
                                          disabled={liquidarEmprestimo.isPending}
                                        >
                                          <Check className="w-4 h-4 mr-2" />
                                          Marcar quitado
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => {
                                            const ok = window.confirm('Deseja excluir este empréstimo?');
                                            if (!ok) return;
                                            deleteEmprestimo.mutate(emp.id);
                                          }}
                                          disabled={deleteEmprestimo.isPending}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Endereço
                  </h3>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-base whitespace-pre-wrap">{detailMeeiro.endereco || '—'}</p>
                  </div>
                </div>

                {(detailMeeiro.criadoEm || detailMeeiro.atualizadoEm) && (
                  <div className="space-y-2 pt-4 border-t">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Informações do Sistema
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {detailMeeiro.criadoEm && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Criado em</Label>
                          <p>{new Date(detailMeeiro.criadoEm).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                      {detailMeeiro.atualizadoEm && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                          <p>{new Date(detailMeeiro.atualizadoEm).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-6 border-t">
                  <Button
                    variant="default"
                    onClick={() => {
                      setOpenDetailMeeiro(false);
                      setDetailMeeiroId(null);
                      setEditMeeiro(detailMeeiro);
                      setFormEditMeeiro({
                        codigo: detailMeeiro.codigo,
                        nome: detailMeeiro.nome,
                        nomeFantasia: detailMeeiro.nomeFantasia ?? '',
                        cpf: detailMeeiro.cpf ?? '',
                        telefone: detailMeeiro.telefone ?? '',
                        pixChave: detailMeeiro.pixChave ?? '',
                        endereco: detailMeeiro.endereco ?? '',
                        quantidadeMudasPlantadas: detailMeeiro.quantidadeMudasPlantadas ?? null,
                        porcentagem_padrao: detailMeeiro.porcentagem_padrao,
                        valor_de_emba_padrao:
                          valorDeEmbaPadraoDeMeeiro(detailMeeiro),
                        produtorId: detailMeeiro.produtorId,
                      });
                      setOpenEditMeeiro(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Empréstimo */}
        <Dialog
          open={openEditEmprestimo}
          onOpenChange={(open) => {
            setOpenEditEmprestimo(open);
            if (!open) setEmprestimoEditando(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar valor do empréstimo</DialogTitle>
              <DialogDescription>
                Informe o novo valor para o empréstimo selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              <Label>Novo valor</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={formEditEmprestimo.valor || ''}
                onChange={(e) =>
                  setFormEditEmprestimo({ valor: Number(e.target.value) || 0 })
                }
                placeholder="0,00"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditEmprestimo(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                disabled={
                  updateEmprestimo.isPending ||
                  !emprestimoEditando ||
                  !(formEditEmprestimo.valor > 0)
                }
                onClick={() => {
                  if (!emprestimoEditando) return;
                  if (!(formEditEmprestimo.valor > 0)) {
                    toast.error('Informe um valor maior que zero.');
                    return;
                  }
                  updateEmprestimo.mutate({
                    id: emprestimoEditando.id,
                    valor: formEditEmprestimo.valor,
                  });
                }}
              >
                {updateEmprestimo.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Registrar Empréstimo */}
        <Dialog open={openEmprestimo} onOpenChange={setOpenEmprestimo}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Empréstimo</DialogTitle>
              <DialogDescription>
                {meeiroEmprestimo ? `Registrar empréstimo para ${meeiroEmprestimo.nome}` : 'Preencha os dados do empréstimo.'}
              </DialogDescription>
            </DialogHeader>
            {meeiroEmprestimo && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Valor do empréstimo</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={formEmprestimo.valor || ''}
                    onChange={(e) => setFormEmprestimo((p) => ({ ...p, valor: Number(e.target.value) || 0 }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data do empréstimo</Label>
                  <Input
                    type="date"
                    value={formEmprestimo.data}
                    onChange={(e) => setFormEmprestimo((p) => ({ ...p, data: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observação (opcional)</Label>
                  <Textarea
                    value={formEmprestimo.observacao}
                    onChange={(e) => setFormEmprestimo((p) => ({ ...p, observacao: e.target.value }))}
                    placeholder="Ex: adiantamento safra"
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEmprestimo(false)}>Cancelar</Button>
              <Button
                variant="gradient"
                disabled={createEmprestimo.isPending || !formEmprestimo.valor || !formEmprestimo.data}
                onClick={() => {
                  if (!formEmprestimo.meeiroId || formEmprestimo.valor <= 0 || !formEmprestimo.data) {
                    toast.error('Preencha valor e data.');
                    return;
                  }
                  createEmprestimo.mutate({
                    meeiroId: formEmprestimo.meeiroId,
                    valor: formEmprestimo.valor,
                    data: formEmprestimo.data,
                    observacao: formEmprestimo.observacao?.trim() || undefined,
                  });
                }}
              >
                {createEmprestimo.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Meeiro */}
        <Dialog
          open={openEditMeeiro}
          onOpenChange={(open) => {
            setOpenEditMeeiro(open);
            if (!open) setEditMeeiro(null);
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Pencil className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Editar Meeiro</DialogTitle>
                  <DialogDescription className="mt-1">
                    Altere os dados do meeiro.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {editMeeiro && (
              <div className="space-y-10 pt-6">
                <div className="bg-card border rounded-xl p-7 space-y-7">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Informações do meeiro</h3>
                      <p className="text-xs text-muted-foreground">
                        Atualize o produtor responsável, código, nome e dados básicos.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Produtor <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={
                        formEditMeeiro.produtorId
                          ? String(formEditMeeiro.produtorId)
                          : ''
                      }
                      onValueChange={(v) =>
                        setFormEditMeeiro((p) => ({ ...p, produtorId: Number(v) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produtor responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtores.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.codigo} – {p.nome_razao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-7">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        Código do meeiro
                      </Label>
                      <Input
                        value={formEditMeeiro.codigo ?? ''}
                        onChange={(e) =>
                          setFormEditMeeiro((p) => ({ ...p, codigo: e.target.value }))
                        }
                        placeholder="Ex: M001 – ou em branco para o sistema gerar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Nome <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={formEditMeeiro.nome ?? ''}
                        onChange={(e) =>
                          setFormEditMeeiro((p) => ({ ...p, nome: e.target.value }))
                        }
                        placeholder="Nome completo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Nome fantasia
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      value={formEditMeeiro.nomeFantasia ?? ''}
                      onChange={(e) =>
                        setFormEditMeeiro((p) => ({ ...p, nomeFantasia: e.target.value }))
                      }
                      placeholder="Nome fantasia"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-muted-foreground" />
                      Quantidade de mudas plantadas
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Ex: 5000"
                      value={
                        formEditMeeiro.quantidadeMudasPlantadas != null
                          ? String(formEditMeeiro.quantidadeMudasPlantadas)
                          : ''
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormEditMeeiro((p) => ({
                          ...p,
                          quantidadeMudasPlantadas:
                            v === '' ? null : Math.max(0, Math.floor(Number(v)) || 0),
                        }));
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-7">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        CPF
                        <span className="text-xs text-muted-foreground">
                          (opcional)
                        </span>
                      </Label>
                      <Input
                        placeholder="000.000.000-00"
                        value={formEditMeeiro.cpf ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const cleaned = cleanDocument(v);
                          const limited = cleaned.slice(0, 11);
                          const formatted =
                            limited.length === 11
                              ? formatCPF(limited)
                              : limited
                                  .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
                                  .replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3')
                                  .replace(/^(\d{3})(\d{3})$/, '$1.$2')
                                  .replace(/^(\d{3})$/, '$1');
                          setFormEditMeeiro((p) => ({ ...p, cpf: formatted }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                        Porcentagem padrão (%)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="40"
                        value={
                          formEditMeeiro.porcentagem_padrao === 0
                            ? ''
                            : formEditMeeiro.porcentagem_padrao ?? ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormEditMeeiro((p) => ({
                            ...p,
                            porcentagem_padrao: val === '' ? 0 : Number(val),
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                        Valor de emba (R$)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="1.20"
                        value={
                          formEditMeeiro.valor_de_emba_padrao === 0
                            ? ''
                            : formEditMeeiro.valor_de_emba_padrao ?? ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormEditMeeiro((p) => ({
                            ...p,
                            valor_de_emba_padrao: val === '' ? 0 : Number(val),
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      Telefone
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={formEditMeeiro.telefone ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const digits = v.replace(/\D/g, '').slice(0, 11);
                        const formatted = digits ? formatTelefone(digits) : '';
                        setFormEditMeeiro((p) => ({ ...p, telefone: formatted }));
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-muted-foreground" />
                      Chave PIX
                      <span className="text-xs text-muted-foreground">(opcional, até 140 caracteres)</span>
                    </Label>
                    <Input
                      placeholder="CPF, celular, e-mail ou chave aleatória"
                      value={formEditMeeiro.pixChave ?? ''}
                      onChange={(e) =>
                        setFormEditMeeiro((p) => ({ ...p, pixChave: e.target.value.slice(0, 140) }))
                      }
                      maxLength={140}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Endereço
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Textarea
                      value={formEditMeeiro.endereco ?? ''}
                      onChange={(e) =>
                        setFormEditMeeiro((p) => ({ ...p, endereco: e.target.value }))
                      }
                      placeholder="Endereço completo"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditMeeiro(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (!editMeeiro) return;
                  if (!formEditMeeiro.nome?.trim() || !formEditMeeiro.produtorId) {
                    toast.error('Nome e produtor são obrigatórios');
                    return;
                  }
                  updateMeeiro.mutate({
                    id: editMeeiro.id,
                    data: {
                      codigo: formEditMeeiro.codigo?.trim() || undefined,
                      nome: formEditMeeiro.nome,
                      nomeFantasia: formEditMeeiro.nomeFantasia?.trim() || undefined,
                      cpf: formEditMeeiro.cpf || undefined,
                      telefone: formEditMeeiro.telefone || undefined,
                      pixChave: formEditMeeiro.pixChave?.trim() || undefined,
                      endereco: formEditMeeiro.endereco || undefined,
                      porcentagem_padrao:
                        formEditMeeiro.porcentagem_padrao ?? editMeeiro.porcentagem_padrao,
                      valor_de_emba_padrao:
                        formEditMeeiro.valor_de_emba_padrao ??
                        valorDeEmbaPadraoDeMeeiro(editMeeiro),
                      produtorId: formEditMeeiro.produtorId || editMeeiro.produtorId,
                      quantidadeMudasPlantadas:
                        formEditMeeiro.quantidadeMudasPlantadas == null
                          ? null
                          : Number(formEditMeeiro.quantidadeMudasPlantadas),
                    },
                  });
                }}
                disabled={updateMeeiro.isPending}
              >
                {updateMeeiro.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Pagar Meeiro */}
        <Dialog
          open={openPagarModal}
          onOpenChange={(open) => {
            setOpenPagarModal(open);
            if (!open) setMeeiroParaPagar(null);
          }}
        >
          <DialogContent className="w-[calc(100%-1rem)] max-w-4xl gap-10 p-8 sm:p-12 max-h-[min(96dvh,960px)] overflow-y-auto">
            <DialogHeader className="space-y-3 sm:space-y-4 pr-10">
              <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">Registrar pagamento</DialogTitle>
              <DialogDescription className="text-base sm:text-lg leading-relaxed text-muted-foreground">
                {meeiroParaPagar ? `Pagamento para ${meeiroParaPagar.nome}` : 'Confirme os dados do pagamento.'}
              </DialogDescription>
            </DialogHeader>
            {meeiroParaPagar && (
              <div className="space-y-10 pt-1">
                <div className="rounded-xl border bg-muted/30 p-7 sm:p-10 text-sm sm:text-base leading-relaxed shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 pb-6 border-b border-border/60">
                    <span className="text-muted-foreground font-medium">Chave PIX</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1.5 self-start sm:self-auto shrink-0"
                      onClick={() => {
                        if (meeiroParaPagar.chavePix) {
                          navigator.clipboard.writeText(meeiroParaPagar.chavePix);
                          toast.success('Chave PIX copiada');
                        }
                      }}
                      disabled={!meeiroParaPagar.chavePix}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </Button>
                  </div>
                  <p className="font-mono break-all text-foreground text-[13px] sm:text-sm tracking-tight pb-6 border-b border-border/60 -mt-2 pt-1">
                    {meeiroParaPagar.chavePix || '—'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-8 gap-y-1 py-4 border-b border-border/40 items-start sm:items-center">
                    <span className="text-muted-foreground">Valor total a receber (repasse)</span>
                    <span className="text-foreground font-semibold tabular-nums text-left sm:text-right pt-1 sm:pt-0">
                      {formatCurrency(meeiroParaPagar.totalReceber)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-8 gap-y-1 py-4 border-b border-border/40 items-start sm:items-center">
                    <span className="text-muted-foreground">Vale de embalagem (desconto)</span>
                    <span className="text-foreground font-medium tabular-nums text-left sm:text-right">
                      {formatCurrency(Number(meeiroParaPagar.valesEmbalagem ?? 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-8 gap-y-1 py-4 border-b border-border/40 items-start sm:items-center">
                    <span className="text-muted-foreground">Emprést aberto</span>
                    <span className="text-foreground font-medium tabular-nums text-left sm:text-right">
                      {formatCurrency(meeiroParaPagar.totalEmprestimosAbertos)}
                    </span>
                  </div>
                  {(() => {
                    const p = parsePagamentoMeeiroResumoForm(meeiroParaPagar, formPagamento);
                    if (p.totalEmp <= 0) return null;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-8 gap-y-1 py-4 border-b border-border/40 items-start sm:items-center">
                        <span className="text-muted-foreground">Abater do empréstimo (neste pagamento)</span>
                        <span className="text-foreground font-medium tabular-nums text-left sm:text-right">
                          {formatCurrency(p.vSafe)}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-8 gap-y-1 py-6 border-t border-border/60 mt-1 items-start sm:items-center bg-muted/20 -mx-7 sm:-mx-10 px-7 sm:px-10 rounded-b-xl">
                    <span className="text-muted-foreground font-medium">Valor líquido a pagar ao meeiro</span>
                    <span
                      className={cn(
                        'font-semibold tabular-nums text-left sm:text-right text-lg',
                        (() => {
                          const p = parsePagamentoMeeiroResumoForm(meeiroParaPagar, formPagamento);
                          return p.liquido < 0 ? 'text-amber-700 dark:text-amber-300' : 'text-primary';
                        })(),
                      )}
                    >
                      {formatCurrency(
                        parsePagamentoMeeiroResumoForm(meeiroParaPagar, formPagamento).liquido,
                      )}
                    </span>
                  </div>
                  {(meeiroParaPagar.totalEmprestimosAbertos ?? 0) > 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-5 pt-1">
                      Informe quanto deseja <span className="font-medium text-foreground/90">abater do empréstimo</span>{' '}
                      agora. O restante do empréstimo permanece em aberto.
                    </p>
                  )}
                </div>
                {(() => {
                  const p = parsePagamentoMeeiroResumoForm(meeiroParaPagar, formPagamento);
                  if (p.totalEmp <= 0) return null;
                  return (
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Valor a abater do empréstimo (opcional)</Label>
                      <Input
                        className="h-11"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={p.maxAbater}
                        step="0.01"
                        placeholder={`Máx: ${formatCurrency(p.maxAbater)}`}
                        value={formPagamento.valorAbaterEmprestimo}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setFormPagamento((prev) => ({ ...prev, valorAbaterEmprestimo: raw }));
                        }}
                      />
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Máximo (empréstimo e produção líquida após embalagem):{' '}
                        <span className="font-medium">{formatCurrency(p.maxAbater)}</span>. Se a grade tiver{' '}
                        <span className="font-medium">Desc emprést.</span>, esse valor é sugerido aqui (até o teto).
                      </p>
                    </div>
                  );
                })()}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Forma de pagamento</Label>
                  <Select
                    value={formPagamento.formaPagamento}
                    onValueChange={(v) => setFormPagamento((p) => ({ ...p, formaPagamento: v }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-medium">Conta ou caixa utilizado (opcional)</Label>
                  <Input
                    className="h-11"
                    value={formPagamento.contaCaixa}
                    onChange={(e) => setFormPagamento((p) => ({ ...p, contaCaixa: e.target.value }))}
                    placeholder="Ex: Caixa Geral"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-medium">Data do pagamento</Label>
                  <Input
                    className="h-11"
                    type="date"
                    value={formPagamento.dataPagamento}
                    onChange={(e) => setFormPagamento((p) => ({ ...p, dataPagamento: e.target.value }))}
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-medium">Observação (opcional)</Label>
                  <Textarea
                    value={formPagamento.observacao}
                    onChange={(e) => setFormPagamento((p) => ({ ...p, observacao: e.target.value }))}
                    placeholder="Observação"
                    rows={3}
                    className="min-h-[5.5rem] resize-y leading-relaxed"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-amber-500/35 bg-amber-500/[0.07] p-4 sm:p-5 space-y-3">
                  <p className="text-sm font-medium text-foreground">Gerar relatório sem pagar</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Baixa o PDF do meeiro (mesmos filtros de período e roças da aba) e registra no histórico como{' '}
                    <span className="font-medium text-foreground">pendente</span> até você confirmar o pagamento
                    abaixo.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto gap-2"
                    disabled={relatorioSemPagamentoLoading || !meeiroParaPagar}
                    onClick={async () => {
                      if (!meeiroParaPagar) return;
                      const produtorDoMeeiro = meeirosParaRelatorio.find(
                        (m) => Number(m.id) === Number(meeiroParaPagar.meeiroId),
                      )?.produtorId;
                      const produtorIdNum =
                        produtorDoMeeiro != null && !Number.isNaN(Number(produtorDoMeeiro))
                          ? Number(produtorDoMeeiro)
                          : pagamentoFiltrosAplicados.produtorId !== ''
                            ? Number(pagamentoFiltrosAplicados.produtorId)
                            : undefined;
                      if (produtorIdNum == null || Number.isNaN(Number(produtorIdNum))) {
                        toast.error('Não foi possível identificar o produtor deste meeiro. Use o filtro de produtor na aba.');
                        return;
                      }
                      const dataIniRel =
                        relPagDataInicial.trim() ||
                        pagamentoFiltrosAplicados.dataInicial.trim() ||
                        undefined;
                      const dataFimRel =
                        relPagDataFinal.trim() ||
                        pagamentoFiltrosAplicados.dataFinal.trim() ||
                        undefined;
                      const rocasRel =
                        relPagRocaFiltroId !== ''
                          ? [Number(relPagRocaFiltroId)]
                          : pagamentoFiltrosAplicados.rocaIds.length > 0
                            ? pagamentoFiltrosAplicados.rocaIds.map(Number)
                            : undefined;
                      try {
                        setRelatorioSemPagamentoLoading(true);
                        const totalReceberRel = Number(meeiroParaPagar.totalReceber ?? 0);
                        const valesEmbRel = Number(meeiroParaPagar.valesEmbalagem ?? 0);
                        const totalEmpRel = Number(meeiroParaPagar.totalEmprestimosAbertos ?? 0);
                        const disponivelRel = totalReceberRel;
                        const maxAbaterRel = Math.min(Math.max(0, totalEmpRel), disponivelRel);
                        const vRawRel = formPagamento.valorAbaterEmprestimo;
                        const vRel = vRawRel === '' ? 0 : Number(vRawRel);
                        const vSafeRel = Number.isFinite(vRel)
                          ? Math.max(0, Math.min(vRel, maxAbaterRel))
                          : 0;
                        await controleRocaService.downloadRelatorioMeeirosPdf({
                          meeiroId: meeiroParaPagar.meeiroId,
                          dataInicial: dataIniRel,
                          dataFinal: dataFimRel,
                          rocas: rocasRel,
                          filtroPagamento: 'pendentes',
                          ...(vSafeRel > 0
                            ? { valorAbatimentoEmprestimoProjetado: vSafeRel }
                            : {}),
                        });
                        await controleRocaService.registrarRelatorioMeeiroPendente({
                          meeiroId: meeiroParaPagar.meeiroId,
                          produtorId: Number(produtorIdNum),
                          periodoDataInicial: dataIniRel,
                          periodoDataFinal: dataFimRel,
                          observacao: formPagamento.observacao?.trim() || undefined,
                        });
                        toast.success('Relatório baixado e registrado como pendente no histórico.');
                        void queryClient.invalidateQueries({ queryKey: ['controle-roca'] });
                        setOpenPagarModal(false);
                        setMeeiroParaPagar(null);
                      } catch (e: any) {
                        toast.error(
                          e?.response?.data?.message || e?.message || 'Erro ao gerar relatório',
                        );
                      } finally {
                        setRelatorioSemPagamentoLoading(false);
                      }
                    }}
                  >
                    {relatorioSemPagamentoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Gerar relatório sem pagar
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter className="flex-col gap-4 sm:flex-row sm:justify-end pt-10 mt-6 border-t border-border/60">
              <Button variant="outline" onClick={() => setOpenPagarModal(false)}>Cancelar</Button>
              <Button
                variant="gradient"
                disabled={registrarPagamento.isPending || !meeiroParaPagar || !formPagamento.dataPagamento}
                onClick={() => {
                  if (!meeiroParaPagar || !formPagamento.dataPagamento) return;
                  const p = parsePagamentoMeeiroResumoForm(meeiroParaPagar, formPagamento);
                  registrarPagamento.mutate({
                    gerarComprovantePdf: true,
                    data: {
                      meeiroId: meeiroParaPagar.meeiroId,
                      formaPagamento: formPagamento.formaPagamento,
                      contaCaixa: formPagamento.contaCaixa?.trim() || undefined,
                      dataPagamento: formPagamento.dataPagamento,
                      observacao: formPagamento.observacao?.trim() || undefined,
                      ...(p.vSafe > 0 ? { valorAbaterEmprestimo: p.vSafe } : {}),
                    },
                  });
                }}
              >
                {registrarPagamento.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar e baixar comprovante
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar pagamento (último registro do meeiro) */}
        <Dialog
          open={openEditarPagamentoModal}
          onOpenChange={(open) => {
            setOpenEditarPagamentoModal(open);
            if (!open) {
              setMeeiroEditarPagamento(null);
              setEditarPagamentoId(null);
              setEditPagamentoHistoricoRow(null);
              setEditPagamentoApenasPrevisto(false);
            }
          }}
        >
          <DialogContent className="w-[calc(100%-1rem)] max-w-4xl gap-8 p-6 sm:p-10 max-h-[min(96dvh,920px)] overflow-y-auto">
            <DialogHeader className="space-y-3 sm:space-y-4 pr-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="space-y-2">
                  <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    {editPagamentoApenasPrevisto
                      ? 'Definir desconto de empréstimo'
                      : 'Editar pagamento'}
                  </DialogTitle>
                  <DialogDescription className="text-base sm:text-lg leading-relaxed text-muted-foreground">
                    {meeiroEditarPagamento
                      ? editPagamentoApenasPrevisto
                        ? `Quanto descontar do empréstimo de ${meeiroEditarPagamento.nome} (coluna Desc emprést. na grade, antes de pagar).`
                        : `Pagamento para ${meeiroEditarPagamento.nome}`
                      : 'Confirme os dados do pagamento.'}
                  </DialogDescription>
                </div>
                {editarPagamentoId != null && (
                  <span className="shrink-0 self-start rounded-lg border border-border/80 bg-muted/50 px-3 py-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                    Registro #{editarPagamentoId}
                  </span>
                )}
              </div>
            </DialogHeader>

            {meeiroEditarPagamento &&
              (editPagamentoApenasPrevisto ||
                (editPagamentoHistoricoRow != null && editarPagamentoId != null)) && (
              <div className="space-y-10 pt-1">
                {(() => {
                  const m = meeiroEditarPagamento;
                  const h = editPagamentoHistoricoRow;
                  const trGrade = Number(m.totalReceber ?? 0);
                  const valesGrade = Number(m.valesEmbalagem ?? 0);
                  const empAbertoGrade = Number(m.totalEmprestimosAbertos ?? 0);
                  const descGrade = Number(m.descEmprest ?? 0);
                  const liqGrade = Number(m.valorLiquido ?? 0);
                  const abatUltimo = Number(m.ultimoPagamentoValorAbatidoEmprestimo ?? 0);

                  /** Mesma regra do backend para o último pagamento: remanescente atual − embalagem − abatido no registro. */
                  const maxDescEmprest = Math.max(0, trGrade - abatUltimo);

                  return (
                    <>
                      <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-sm space-y-3">
                        <p className="font-medium text-foreground leading-snug">
                          Mesmos valores da linha do meeiro na grade (Em aberto)
                        </p>
                        <ul className="space-y-1.5 text-muted-foreground">
                          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                            <span>Valor a receber</span>
                            <span className="tabular-nums font-medium text-foreground">
                              {formatCurrency(trGrade)}
                            </span>
                          </li>
                          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                            <span>Vale de embalagem</span>
                            <span className="tabular-nums">{formatCurrency(valesGrade)}</span>
                          </li>
                          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                            <span>Emprést aberto</span>
                            <span className="tabular-nums">{formatCurrency(empAbertoGrade)}</span>
                          </li>
                          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                            <span>
                              {editPagamentoApenasPrevisto
                                ? 'Desc emprést. (na grade)'
                                : 'Desc emprést. (último pagamento)'}
                            </span>
                            <span className="tabular-nums">{formatCurrency(descGrade)}</span>
                          </li>
                          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                            <span>Valor final a pagar</span>
                            <span className="tabular-nums font-medium text-foreground">
                              {formatCurrency(liqGrade)}
                            </span>
                          </li>
                          {abatUltimo > 0 && (
                            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-xs">
                              <span>Abatido do empréstimo no último registro</span>
                              <span className="tabular-nums">{formatCurrency(abatUltimo)}</span>
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-base font-medium" htmlFor="edit-pag-desc-emprest">
                          Desconto empréstimo (opcional)
                        </Label>
                        <Input
                          id="edit-pag-desc-emprest"
                          className="h-11"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={maxDescEmprest}
                          step="0.01"
                          placeholder={`Máx: ${formatCurrency(maxDescEmprest)}`}
                          value={formEditarPagamento.descEmprest}
                          onChange={(e) =>
                            setFormEditarPagamento((p) => ({ ...p, descEmprest: e.target.value }))
                          }
                        />
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {editPagamentoApenasPrevisto
                            ? 'O valor aparece na coluna Desc emprést. e é sugerido ao registrar o pagamento.'
                            : 'Não altera o abatimento já registrado nesse pagamento.'}
                        </p>
                      </div>
                    </>
                  );
                })()}

                {!editPagamentoApenasPrevisto && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">Dados do pagamento</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Forma de pagamento</Label>
                      <Select
                        value={formEditarPagamento.formaPagamento}
                        onValueChange={(v) =>
                          setFormEditarPagamento((p) => ({ ...p, formaPagamento: v }))
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Transferência">Transferência</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Data do pagamento</Label>
                      <Input
                        className="h-11"
                        type="date"
                        value={formEditarPagamento.dataPagamento}
                        onChange={(e) =>
                          setFormEditarPagamento((p) => ({ ...p, dataPagamento: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Conta ou caixa utilizado (opcional)</Label>
                    <Input
                      className="h-11"
                      value={formEditarPagamento.contaCaixa}
                      onChange={(e) =>
                        setFormEditarPagamento((p) => ({ ...p, contaCaixa: e.target.value }))
                      }
                      placeholder="Ex: Caixa Geral"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Observação (opcional)</Label>
                    <Textarea
                      value={formEditarPagamento.observacao}
                      onChange={(e) =>
                        setFormEditarPagamento((p) => ({ ...p, observacao: e.target.value }))
                      }
                      rows={3}
                      placeholder="Observação"
                      className="min-h-[5.5rem] resize-y leading-relaxed"
                    />
                  </div>
                </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setOpenEditarPagamentoModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="gradient"
                className="w-full sm:w-auto"
                disabled={
                  definirDescontoEmprestimoMut.isPending ||
                  atualizarPagamentoMeeiroMut.isPending ||
                  (!editPagamentoApenasPrevisto &&
                    (editarPagamentoId == null ||
                      !formEditarPagamento.dataPagamento ||
                      !editPagamentoHistoricoRow))
                }
                onClick={() => {
                  const m = meeiroEditarPagamento;
                  if (!m) return;
                  const maxDescEmprest = Math.max(
                    0,
                    Number(m.totalReceber ?? 0) -
                      Number(m.ultimoPagamentoValorAbatidoEmprestimo ?? 0),
                  );
                  const rawDesc = formEditarPagamento.descEmprest.trim();
                  const descNum = rawDesc === '' ? 0 : Number(rawDesc.replace(',', '.'));
                  if (!Number.isFinite(descNum) || descNum < 0) {
                    toast.error('Informe um desconto de empréstimo válido (≥ 0).');
                    return;
                  }
                  if (descNum > maxDescEmprest + 0.01) {
                    toast.error(
                      `O desconto não pode ser maior que ${formatCurrency(maxDescEmprest)}.`,
                    );
                    return;
                  }
                  if (editPagamentoApenasPrevisto) {
                    definirDescontoEmprestimoMut.mutate({
                      meeiroId: m.meeiroId,
                      descEmprest: descNum,
                    });
                    return;
                  }
                  if (editarPagamentoId == null || !formEditarPagamento.dataPagamento) return;
                  const h = editPagamentoHistoricoRow;
                  if (!h) return;
                  const payload: AtualizarPagamentoMeeiroDto = {
                    dataPagamento: formEditarPagamento.dataPagamento,
                    formaPagamento: formEditarPagamento.formaPagamento,
                    contaCaixa: formEditarPagamento.contaCaixa?.trim() || undefined,
                    observacao: formEditarPagamento.observacao?.trim() || undefined,
                    descEmprest: descNum,
                  };
                  atualizarPagamentoMeeiroMut.mutate({ id: editarPagamentoId, data: payload });
                }}
              >
                {(definirDescontoEmprestimoMut.isPending ||
                  atualizarPagamentoMeeiroMut.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Novo Produto */}
        <Dialog
          open={openProduto}
          onOpenChange={(open) => {
            setOpenProduto(open);
            if (!open) {
              setProdutorIdProduto('');
              setFormProduto({ produtorId: '', nome: '', codigo: '', unidade_medida: 'KG' });
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Produto</DialogTitle>
              <DialogDescription>
                Cadastre um produto no catálogo geral (disponível para qualquer produtor) ou vincule a um produtor específico. Produtos do catálogo podem ser usados em qualquer lançamento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Onde cadastrar</Label>
                <Select
                  value={formProduto.produtorId === '' ? 'catalogo' : String(formProduto.produtorId)}
                  onValueChange={(v) =>
                    setFormProduto((p) => ({
                      ...p,
                      produtorId: v === 'catalogo' ? '' : Number(v),
                      codigo: '',
                      nome: p.nome,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="catalogo">
                      Catálogo geral (qualquer produtor)
                    </SelectItem>
                    {produtores.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.codigo} – {p.nome_razao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formProduto.produtorId === ''
                    ? 'O produto ficará disponível para todos os produtores nos lançamentos.'
                    : 'O produto será vinculado a este produtor e criado no catálogo.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código do produto</Label>
                  <Input
                    value={formProduto.codigo ?? ''}
                    onChange={(e) =>
                      setFormProduto((p) => ({ ...p, codigo: e.target.value }))
                    }
                    placeholder="Deixe em branco para gerar automaticamente"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do produto</Label>
                  <Input
                    value={formProduto.nome}
                    onChange={(e) =>
                      setFormProduto((p) => ({ ...p, nome: e.target.value }))
                    }
                    placeholder="Ex: Milho"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unidade de medida</Label>
                <Select
                  value={formProduto.unidade_medida || 'KG'}
                  onValueChange={(v) =>
                    setFormProduto((p) => ({ ...p, unidade_medida: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenProduto(false)}>
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (!formProduto.nome?.trim()) {
                    toast.error('Nome do produto é obrigatório');
                    return;
                  }
                  createProduto.mutate({
                    ...formProduto,
                    codigo: formProduto.codigo?.trim() || undefined,
                  });
                }}
                disabled={createProduto.isPending}
              >
                {createProduto.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Novo Lançamento - simplified: need produtor selected first, then roça, date, meeiros by code, products with qty/price */}
        <Dialog
        open={openLancamento}
        onOpenChange={(open) => {
          setOpenLancamento(open);
          if (open) {
            setLancData(new Date().toISOString().slice(0, 10));
          } else {
            setProdutoPreselecionadoLancamento(null);
            setProdutorIdLanc('');
            setProdutorLancPopoverOpen(false);
            setProdutorLancSearchTerm('');
            setLancData('');
            setLancRocaId('');
            setLancMeeiros([]);
            setLancMeeiroSelecionado('');
            setLancMeeiroPopoverOpen(false);
            setLancMeeiroSearchTerm('');
            setLancProdutos([]);
          }
        }}
      >
          <DialogContent
            className="max-w-3xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Novo Lançamento de Produção</DialogTitle>
              <DialogDescription>
                Registre a produção: roça, data, meeiros e produtos (quantidade, preço e, se quiser,
                pés colhidos por item para calcular produtividade).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-6 px-1 min-w-0">
              {/* Bloco: Produtor em uma linha; Data + Roça na linha abaixo (Roça com mais espaço) */}
              <div className="space-y-5 rounded-lg border border-border/60 bg-muted/10 p-5">
                <div className="space-y-2 min-w-0">
                  <Label>Produtor</Label>
                  <Popover open={produtorLancPopoverOpen} onOpenChange={setProdutorLancPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={produtorLancPopoverOpen}
                        className="w-full justify-between font-normal min-h-11 py-3 text-base"
                      >
                        <span className={cn('truncate', 'max-[1366px]:text-sm')}>
                          {produtorIdLanc !== ''
                            ? (() => {
                                const p = produtores.find((x) => x.id === produtorIdLanc);
                                return p ? p.nome_razao : 'Selecione';
                              })()
                            : 'Selecione o produtor'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="min-w-[320px] w-[var(--radix-popover-trigger-width)] max-w-[520px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar por nome do produtor..."
                          value={produtorLancSearchTerm}
                          onValueChange={setProdutorLancSearchTerm}
                          className="h-11"
                        />
                        <CommandList className="max-h-[320px]">
                          <CommandEmpty>Nenhum produtor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {produtores
                              .filter((p) => {
                                if (!produtorLancSearchTerm.trim()) return true;
                                const term = produtorLancSearchTerm.toLowerCase();
                                return (
                                  (p.codigo?.toLowerCase().includes(term) ?? false) ||
                                  (p.nome_razao?.toLowerCase().includes(term) ?? false)
                                );
                              })
                              .map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.codigo ?? ''} ${p.nome_razao ?? ''}`.trim()}
                                  onSelect={() => {
                                    setProdutorIdLanc(p.id);
                                    setLancRocaId('');
                                    setLancMeeiros([]);
                                    setLancProdutos([]);
                                    setProdutorLancPopoverOpen(false);
                                    setProdutorLancSearchTerm('');
                                  }}
                                  className="py-3 text-base cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4 shrink-0',
                                      produtorIdLanc === p.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <span className={cn('max-[1366px]:text-sm')}>{p.nome_razao}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-end">
                  <div className="space-y-2 min-w-0 w-full sm:w-[180px]">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={lancData}
                      onChange={(e) => setLancData(e.target.value)}
                      className="w-full min-h-11"
                    />
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <Label>Roça</Label>
                    <Select
                      value={lancRocaId === '' ? '' : String(lancRocaId)}
                      onValueChange={(v) => setLancRocaId(v === '' ? '' : Number(v))}
                      disabled={!produtorIdLanc}
                    >
                      <SelectTrigger className="w-full min-h-11">
                        <SelectValue placeholder="Selecione a roça" />
                      </SelectTrigger>
                      <SelectContent>
                        {rocasParaLancamento.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Meeiros participantes (porcentagem é definida por produto abaixo) */}
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-5">
                <Label className="text-sm font-medium">Meeiros participantes</Label>
                <p className="text-xs text-muted-foreground">
                  Adicione os meeiros que participaram do lançamento. A porcentagem de cada um é definida ao lado de cada produto.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Popover open={lancMeeiroPopoverOpen} onOpenChange={setLancMeeiroPopoverOpen} modal>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={lancMeeiroPopoverOpen}
                        disabled={!produtorIdLanc}
                        className="w-full sm:w-[420px] min-h-10 justify-between font-normal"
                      >
                        <span className="truncate">
                          {lancMeeiroSelecionado
                            ? (() => {
                                const m = meeirosParaLancamento.find(
                                  (x) => String(x.id) === lancMeeiroSelecionado
                                );
                                return m ? `${m.codigo ?? ''} – ${m.nome ?? ''}` : 'Selecione o meeiro';
                              })()
                            : 'Selecione o meeiro'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="min-w-[420px] w-[var(--radix-popover-trigger-width)] max-w-[620px] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar por nome, nome fantasia ou código do meeiro..."
                          value={lancMeeiroSearchTerm}
                          onValueChange={setLancMeeiroSearchTerm}
                          className="h-10"
                        />
                        <CommandList
                          className="max-h-[280px]"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
                          <CommandGroup>
                            {meeirosLancamentoOrdenadosEFiltrados.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                {meeirosParaLancamento.length === 0
                                  ? 'Nenhum meeiro cadastrado para este produtor'
                                  : 'Nenhum meeiro corresponde à busca'}
                              </div>
                            ) : (
                              meeirosLancamentoOrdenadosEFiltrados.map((m) => {
                                const jaAdicionado = lancMeeiros.some(
                                  (x) => Number(x.meeiroId) === Number(m.id)
                                );
                                return (
                                  <CommandItem
                                    key={m.id}
                                    value={`${m.codigo ?? ''} ${m.nome ?? ''} ${m.nomeFantasia ?? ''}`.trim()}
                                    disabled={jaAdicionado}
                                    onSelect={() => {
                                      if (jaAdicionado) return;
                                      handleAddMeeiro(String(m.id));
                                      setLancMeeiroPopoverOpen(false);
                                      setLancMeeiroSearchTerm('');
                                    }}
                                    className="py-2.5"
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4 shrink-0',
                                        jaAdicionado ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <span className="whitespace-normal break-words">
                                      <span className="block font-medium">
                                        {m.codigo ?? ''} – {m.nome ?? ''}
                                        {jaAdicionado ? ' (já adicionado)' : ''}
                                      </span>
                                      {m.nomeFantasia?.trim() ? (
                                        <span className="block text-xs text-muted-foreground">
                                          {m.nomeFantasia}
                                        </span>
                                      ) : null}
                                    </span>
                                  </CommandItem>
                                );
                              })
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {lancMeeiros.length > 0 && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">Adicionados:</span>
                  )}
                  {lancMeeiros.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {lancMeeiros.map((m) => (
                        <span
                          key={m.meeiroId}
                          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium shadow-sm"
                        >
                          <span className="truncate max-w-[120px]">{m.nome ?? `Meeiro ${m.meeiroId}`}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleRemoveMeeiroLanc(m.meeiroId)}
                            aria-label={`Remover ${m.nome ?? m.meeiroId}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-5">
                <Label className="text-sm font-medium">
                  Produtos (quantidade, preço e % por meeiro — cada produto gera um lançamento com 1 pé colhido)
                </Label>
                <div className="rounded-md border border-border/40 bg-background p-4 space-y-4 max-h-[420px] overflow-y-auto min-h-[72px]">
                  {lancProdutos.map((item, idx) => {
                    const valorItem = item.quantidade * item.preco_unitario;
                    return (
                      <div
                        key={idx}
                        className="rounded-md border border-border/60 p-4 space-y-3 bg-background"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 gap-x-6 items-start text-sm">
                          <span className="font-medium truncate" title={String(item.nome ?? item.produtoId)}>
                            {item.nome ?? item.produtoId}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="tabular-nums">Qtd: {item.quantidade}</span>
                            <span className="tabular-nums">{formatCurrency(item.preco_unitario)}/un</span>
                            <span className="font-medium tabular-nums">{formatCurrency(valorItem)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() =>
                                setLancProdutos((prev) => prev.filter((_, i) => i !== idx))
                              }
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                        {item.meeiros.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-border/40">
                            <p className="text-xs font-medium text-muted-foreground">
                              Porcentagem do meeiro e valor de emba por unidade (sobre este produto)
                            </p>
                            {item.meeiros.map((m) => {
                              const valorEmb = Number(
                                m.valor_de_emba ?? VALOR_DE_EMBA_PADRAO,
                              );
                              const valorParte = calcValorParteMeeiroLiquido(
                                valorItem,
                                Number(m.porcentagem ?? 0),
                                item.quantidade,
                                valorEmb,
                              );
                              return (
                                <div
                                  key={m.meeiroId}
                                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                                >
                                  <span className="font-medium text-foreground w-24 shrink-0">
                                    {m.nome ?? `Meeiro ${m.meeiroId}`}:
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      placeholder="0"
                                      className="w-20 h-9 text-center tabular-nums"
                                      value={m.porcentagem !== undefined && m.porcentagem !== null && m.porcentagem !== 0 ? String(m.porcentagem) : ''}
                                      onChange={(e) => {
                                        const v = e.target.value === '' ? 0 : Number(e.target.value);
                                        setLancProdutos((prev) =>
                                          prev.map((p, i) =>
                                            i !== idx
                                              ? p
                                              : {
                                                  ...p,
                                                  meeiros: p.meeiros.map((mm) =>
                                                    mm.meeiroId === m.meeiroId
                                                      ? { ...mm, porcentagem: v }
                                                      : mm
                                                  ),
                                                }
                                          )
                                        );
                                      }}
                                    />
                                    <span className="text-muted-foreground text-xs">% meeiro</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      placeholder="1.20"
                                      className="w-24 h-9 text-center tabular-nums"
                                      value={
                                        m.valor_de_emba !== undefined &&
                                        m.valor_de_emba !== null
                                          ? String(m.valor_de_emba)
                                          : ''
                                      }
                                      onChange={(e) => {
                                        const v =
                                          e.target.value === ''
                                            ? VALOR_DE_EMBA_PADRAO
                                            : Number(e.target.value);
                                        setLancProdutos((prev) =>
                                          prev.map((p, i) =>
                                            i !== idx
                                              ? p
                                              : {
                                                  ...p,
                                                  meeiros: p.meeiros.map((mm) =>
                                                    mm.meeiroId === m.meeiroId
                                                      ? { ...mm, valor_de_emba: v }
                                                      : mm
                                                  ),
                                                }
                                          )
                                        );
                                      }}
                                    />
                                    <span className="text-muted-foreground text-xs">R$ emba/un</span>
                                  </div>
                                  <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                                    = {formatCurrency(valorParte)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <AddProdutoLanc
                    produtos={produtosDisponiveisLancamento}
                    onAdd={handleAddProdutoLanc}
                    disabled={!produtorIdLanc || lancMeeiros.length === 0}
                    produtoPreselecionado={produtoPreselecionadoLancamento}
                    onProdutoPreselecionadoConsumido={() => setProdutoPreselecionadoLancamento(null)}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 py-4 pt-4 border-t border-border/60">
                  <p className="text-sm text-muted-foreground">Total geral</p>
                  <p className="text-base font-semibold tabular-nums">{formatCurrency(totalGeralLanc)}</p>
                </div>
              </div>
            </div>
            <DialogFooter className="border-t pt-6 mt-4 gap-3">
              <Button variant="outline" onClick={() => setOpenLancamento(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="gradient"
                onClick={handleSubmitLancamento}
                disabled={
                  createLancamento.isPending ||
                  !lancData ||
                  !lancRocaId ||
                  lancMeeiros.length === 0 ||
                  lancProdutos.length === 0
                }
              >
                {createLancamento.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Registrar lançamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sidebar: todos os relatórios vinculados a lançamentos (filtros + lista por relatório) */}
        <Sheet
          open={relLancamentosSheetOpen}
          onOpenChange={(open) => {
            setRelLancamentosSheetOpen(open);
            if (open) {
              const hoje = getDataHojeLocal();
              setRelatorioEstoqueDataInicio(hoje);
              setRelatorioEstoqueDataFim(hoje);
            }
          }}
        >
          <SheetContent
            side="right"
            className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden p-0 gap-0 sm:max-w-2xl lg:max-w-3xl [&>button]:z-50"
          >
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <SheetHeader className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Files className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1 pr-8">
                    <SheetTitle className="text-xl leading-tight">Relatórios de lançamento</SheetTitle>
                    <SheetDescription>
                      Filtros: período, produtor, roça, produto (opcionais). Todos os relatórios abaixo usam os mesmos
                      filtros. Exporte em PDF ou imprima.
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-6 py-5 pb-8">
              <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-start gap-3">
                  <ClipboardList className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Notas de lançamento</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nome do produto, quantidade, preço de compra (média ponderada) e valor total. Os filtros
                      abaixo são compartilhados com os demais relatórios deste painel.
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="rounded-lg border bg-muted/25 p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Filtros</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1.5 min-w-[180px] flex-1">
                        <Label className="text-xs text-muted-foreground">Produtor</Label>
                        <RelatorioTabComboProdutor
                          value={relatorioSheetProdutorId}
                          onChange={(id) => {
                            setRelatorioSheetProdutorId(id);
                            setRelatorioEstoqueRocaId('');
                            setRelatorioSheetProdutoId('');
                          }}
                          produtores={produtoresRelatorioOrdenados}
                        />
                      </div>
                      <div className="space-y-1.5 min-w-[160px] flex-1">
                        <Label className="text-xs text-muted-foreground">Roça</Label>
                        <RelatorioTabComboRoca
                          value={relatorioEstoqueRocaId}
                          onChange={(id) => {
                            setRelatorioEstoqueRocaId(id);
                            setRelatorioSheetProdutoId('');
                          }}
                          rocas={rocasRelatorioFiltros}
                        />
                      </div>
                      <div className="space-y-1.5 min-w-[180px] flex-1">
                        <Label className="text-xs text-muted-foreground">Produto</Label>
                        <RelatorioTabComboProduto
                          value={relatorioSheetProdutoId}
                          onChange={setRelatorioSheetProdutoId}
                          produtos={produtosRelatorioFiltrosOrdenados}
                        />
                      </div>
                      <div className="space-y-1.5 w-[140px]">
                        <Label className="text-xs text-muted-foreground">Data inicial</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={relatorioEstoqueDataInicio}
                          onChange={(e) => setRelatorioEstoqueDataInicio(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 w-[140px]">
                        <Label className="text-xs text-muted-foreground">Data final</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={relatorioEstoqueDataFim}
                          onChange={(e) => setRelatorioEstoqueDataFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="gap-2"
                      disabled={relatorioProdutoOrigemLoading !== null || relatorioEstoqueLoading !== null}
                      onClick={async () => {
                        try {
                          setRelatorioProdutoOrigemLoading('download');
                          await controleRocaService.downloadRelatorioProdutoPorOrigemPdf(
                            relatorioEstoqueDataInicio || undefined,
                            relatorioEstoqueDataFim || undefined,
                            relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                            relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                            relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId
                          );
                          toast.success('Relatório baixado.');
                          setRelLancamentosSheetOpen(false);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Erro ao gerar PDF.');
                        } finally {
                          setRelatorioProdutoOrigemLoading(null);
                        }
                      }}
                    >
                      {relatorioProdutoOrigemLoading === 'download' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Baixar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={relatorioProdutoOrigemLoading !== null || relatorioEstoqueLoading !== null}
                      onClick={async () => {
                        try {
                          setRelatorioProdutoOrigemLoading('print');
                          await controleRocaService.printRelatorioProdutoPorOrigemPdf(
                            relatorioEstoqueDataInicio || undefined,
                            relatorioEstoqueDataFim || undefined,
                            relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                            relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                            relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId
                          );
                          setRelLancamentosSheetOpen(false);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Erro ao abrir PDF.');
                        } finally {
                          setRelatorioProdutoOrigemLoading(null);
                        }
                      }}
                    >
                      {relatorioProdutoOrigemLoading === 'print' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      Imprimir
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-start gap-3">
                  <Sprout className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Colheita por meeiro</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nome do meeiro, quantidade colhida, mudas plantadas e valor total colhido. Layout em PDF
                      semelhante ao repasse ao parceiro. Filtre por meeiro ou deixe em &quot;Todos os meeiros&quot;.
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="rounded-lg border bg-muted/25 p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Filtros</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1.5 min-w-[180px] flex-1">
                        <Label className="text-xs text-muted-foreground">Produtor</Label>
                        <RelatorioTabComboProdutor
                          value={relatorioSheetProdutorId}
                          onChange={(id) => {
                            setRelatorioSheetProdutorId(id);
                            setRelatorioEstoqueRocaId('');
                            setRelatorioSheetProdutoId('');
                            setRelColheitaMeeiroId('');
                          }}
                          produtores={produtoresRelatorioOrdenados}
                        />
                      </div>
                      <div className="space-y-1.5 min-w-[180px] flex-1">
                        <Label className="text-xs text-muted-foreground">Meeiro</Label>
                        <RelatorioTabComboMeeiro
                          value={relColheitaMeeiroId}
                          onChange={setRelColheitaMeeiroId}
                          meeiros={meeirosColheitaRelatorio}
                        />
                      </div>
                      <div className="space-y-1.5 min-w-[160px] flex-1">
                        <Label className="text-xs text-muted-foreground">Roça</Label>
                        <RelatorioTabComboRoca
                          value={relatorioEstoqueRocaId}
                          onChange={(id) => {
                            setRelatorioEstoqueRocaId(id);
                            setRelatorioSheetProdutoId('');
                          }}
                          rocas={rocasRelatorioFiltros}
                        />
                      </div>
                      <div className="space-y-1.5 min-w-[180px] flex-1">
                        <Label className="text-xs text-muted-foreground">Produto</Label>
                        <RelatorioTabComboProduto
                          value={relatorioSheetProdutoId}
                          onChange={setRelatorioSheetProdutoId}
                          produtos={produtosRelatorioFiltrosOrdenados}
                        />
                      </div>
                      <div className="space-y-1.5 w-[140px]">
                        <Label className="text-xs text-muted-foreground">Data inicial</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={relatorioEstoqueDataInicio}
                          onChange={(e) => setRelatorioEstoqueDataInicio(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 w-[140px]">
                        <Label className="text-xs text-muted-foreground">Data final</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={relatorioEstoqueDataFim}
                          onChange={(e) => setRelatorioEstoqueDataFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="gap-2"
                      disabled={
                        relatorioColheitaMeeiroLoading !== null ||
                        relatorioProdutoOrigemLoading !== null ||
                        relatorioEstoqueLoading !== null
                      }
                      onClick={async () => {
                        try {
                          setRelatorioColheitaMeeiroLoading('download');
                          await controleRocaService.downloadRelatorioColheitaMeeirosPdf(
                            relatorioEstoqueDataInicio || undefined,
                            relatorioEstoqueDataFim || undefined,
                            relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                            relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                            relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId,
                            relColheitaMeeiroId === '' ? undefined : relColheitaMeeiroId,
                          );
                          toast.success('Relatório baixado.');
                          setRelLancamentosSheetOpen(false);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Erro ao gerar PDF.');
                        } finally {
                          setRelatorioColheitaMeeiroLoading(null);
                        }
                      }}
                    >
                      {relatorioColheitaMeeiroLoading === 'download' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Baixar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={
                        relatorioColheitaMeeiroLoading !== null ||
                        relatorioProdutoOrigemLoading !== null ||
                        relatorioEstoqueLoading !== null
                      }
                      onClick={async () => {
                        try {
                          setRelatorioColheitaMeeiroLoading('print');
                          await controleRocaService.printRelatorioColheitaMeeirosPdf(
                            relatorioEstoqueDataInicio || undefined,
                            relatorioEstoqueDataFim || undefined,
                            relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                            relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                            relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId,
                            relColheitaMeeiroId === '' ? undefined : relColheitaMeeiroId,
                          );
                          setRelLancamentosSheetOpen(false);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Erro ao abrir PDF.');
                        } finally {
                          setRelatorioColheitaMeeiroLoading(null);
                        }
                      }}
                    >
                      {relatorioColheitaMeeiroLoading === 'print' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      Imprimir
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Relatório geral de lançamento</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Produtos com lançamento no período. Exporte em PDF ou imprima. Mesmos filtros das Notas de lançamento
                      acima.
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="rounded-lg border bg-muted/25 p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Filtros dos relatórios</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1.5 min-w-[180px] flex-1">
                        <Label className="text-xs text-muted-foreground">Produtor</Label>
                        <RelatorioTabComboProdutor
                          value={relatorioSheetProdutorId}
                          onChange={(id) => {
                            setRelatorioSheetProdutorId(id);
                            setRelatorioEstoqueRocaId('');
                            setRelatorioSheetProdutoId('');
                          }}
                          produtores={produtoresRelatorioOrdenados}
                        />
                      </div>
                      <div className="space-y-1.5 min-w-[160px] flex-1">
                        <Label className="text-xs text-muted-foreground">Roça</Label>
                        <RelatorioTabComboRoca
                          value={relatorioEstoqueRocaId}
                          onChange={(id) => {
                            setRelatorioEstoqueRocaId(id);
                            setRelatorioSheetProdutoId('');
                          }}
                          rocas={rocasRelatorioFiltros}
                        />
                      </div>
                      <div className="space-y-1.5 min-w-[180px] flex-1">
                        <Label className="text-xs text-muted-foreground">Produto</Label>
                        <RelatorioTabComboProduto
                          value={relatorioSheetProdutoId}
                          onChange={setRelatorioSheetProdutoId}
                          produtos={produtosRelatorioFiltrosOrdenados}
                        />
                      </div>
                      <div className="space-y-1.5 w-[140px]">
                        <Label className="text-xs text-muted-foreground">Data inicial</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={relatorioEstoqueDataInicio}
                          onChange={(e) => setRelatorioEstoqueDataInicio(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 w-[140px]">
                        <Label className="text-xs text-muted-foreground">Data final</Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={relatorioEstoqueDataFim}
                          onChange={(e) => setRelatorioEstoqueDataFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="gap-2"
                      disabled={relatorioEstoqueLoading !== null || relatorioProdutoOrigemLoading !== null}
                      onClick={async () => {
                        try {
                          setRelatorioEstoqueLoading('download');
                          await controleRocaService.downloadRelatorioLancamentoProdutosPdf(
                            relatorioEstoqueDataInicio || undefined,
                            relatorioEstoqueDataFim || undefined,
                            relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                            relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                            relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId
                          );
                          toast.success('Relatório baixado.');
                          setRelLancamentosSheetOpen(false);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Erro ao gerar PDF.');
                        } finally {
                          setRelatorioEstoqueLoading(null);
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={relatorioEstoqueLoading !== null || relatorioProdutoOrigemLoading !== null}
                      onClick={async () => {
                        try {
                          setRelatorioEstoqueLoading('print');
                          await controleRocaService.printRelatorioLancamentoProdutosPdf(
                            relatorioEstoqueDataInicio || undefined,
                            relatorioEstoqueDataFim || undefined,
                            relatorioEstoqueRocaId === '' ? undefined : relatorioEstoqueRocaId,
                            relatorioSheetProdutorId === '' ? undefined : relatorioSheetProdutorId,
                            relatorioSheetProdutoId === '' ? undefined : relatorioSheetProdutoId
                          );
                          setRelLancamentosSheetOpen(false);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Erro ao abrir PDF.');
                        } finally {
                          setRelatorioEstoqueLoading(null);
                        }
                      }}
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            <SheetFooter className="relative z-10 shrink-0 border-t border-border bg-background px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:justify-start">
              <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={() => setRelLancamentosSheetOpen(false)}>
                Fechar painel
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

type RelTabProdutorOpt = { id: number; codigo?: string | null; nome_razao?: string | null };
type RelTabRocaOpt = { id: number; nome?: string | null };
type RelTabProdutoOpt = { id: number; codigo?: string | null; nome?: string | null };
type RelTabMeeiroOpt = { id: number; codigo?: string | null; nome?: string | null };

function RelatorioTabComboProdutor({
  value,
  onChange,
  produtores,
}: {
  value: number | '';
  onChange: (id: number | '') => void;
  produtores: RelTabProdutorOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return produtores;
    return produtores.filter((p) => {
      const label = `${p.codigo ?? ''} ${p.nome_razao ?? ''}`.toLowerCase();
      return label.includes(t);
    });
  }, [produtores, q]);
  const label =
    value === ''
      ? 'Todos os produtores'
      : (() => {
          const p = produtores.find((x) => x.id === value);
          if (!p) return 'Todos os produtores';
          return p.codigo ? `${p.codigo} – ${p.nome_razao}` : (p.nome_razao ?? String(p.id));
        })();
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar produtor..." value={q} onValueChange={setQ} className="h-10" />
          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>Nenhum produtor encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__todos"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                  setQ('');
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === '' ? 'opacity-100' : 'opacity-0')} />
                Todos os produtores
              </CommandItem>
              {filtered.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`p-${p.id}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  {p.codigo ? `${p.codigo} – ${p.nome_razao}` : (p.nome_razao ?? String(p.id))}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RelatorioTabComboRoca({
  value,
  onChange,
  rocas,
  todosLabel = 'Todas as roças',
  searchPlaceholder = 'Buscar roça...',
}: {
  value: number | '';
  onChange: (id: number | '') => void;
  rocas: RelTabRocaOpt[];
  todosLabel?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rocas;
    return rocas.filter((r) => (r.nome ?? '').toLowerCase().includes(t));
  }, [rocas, q]);
  const label =
    value === ''
      ? todosLabel
      : (rocas.find((r) => r.id === value)?.nome ?? todosLabel);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={q} onValueChange={setQ} className="h-10" />
          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>Nenhuma roça encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__todas"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                  setQ('');
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === '' ? 'opacity-100' : 'opacity-0')} />
                {todosLabel}
              </CommandItem>
              {filtered.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`r-${r.id}`}
                  onSelect={() => {
                    onChange(r.id);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === r.id ? 'opacity-100' : 'opacity-0')} />
                  {r.nome ?? String(r.id)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RelatorioTabComboProduto({
  value,
  onChange,
  produtos,
}: {
  value: number | '';
  onChange: (id: number | '') => void;
  produtos: RelTabProdutoOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return produtos;
    return produtos.filter((p) => {
      const label = `${p.codigo ?? ''} ${p.nome ?? ''}`.toLowerCase();
      return label.includes(t);
    });
  }, [produtos, q]);
  const label =
    value === ''
      ? 'Todos os produtos'
      : (() => {
          const p = produtos.find((x) => x.id === value);
          if (!p) return 'Todos os produtos';
          return p.codigo ? `${p.codigo} – ${p.nome}` : (p.nome ?? String(p.id));
        })();
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar produto..." value={q} onValueChange={setQ} className="h-10" />
          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__todos"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                  setQ('');
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === '' ? 'opacity-100' : 'opacity-0')} />
                Todos os produtos
              </CommandItem>
              {filtered.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`prod-${p.id}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  {p.codigo ? `${p.codigo} – ${p.nome}` : (p.nome ?? String(p.id))}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RelatorioTabComboMeeiro({
  value,
  onChange,
  meeiros,
}: {
  value: number | '';
  onChange: (id: number | '') => void;
  meeiros: RelTabMeeiroOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return meeiros;
    return meeiros.filter((m) => {
      const label = `${m.codigo ?? ''} ${m.nome ?? ''}`.toLowerCase();
      return label.includes(t);
    });
  }, [meeiros, q]);
  const label =
    value === ''
      ? 'Todos os meeiros'
      : (() => {
          const m = meeiros.find((x) => x.id === value);
          if (!m) return 'Todos os meeiros';
          return m.codigo ? `${m.codigo} – ${m.nome}` : (m.nome ?? String(m.id));
        })();
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar meeiro..." value={q} onValueChange={setQ} className="h-10" />
          <CommandList className="max-h-[260px]" onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>Nenhum meeiro encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__todos-meeiros"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                  setQ('');
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === '' ? 'opacity-100' : 'opacity-0')} />
                Todos os meeiros
              </CommandItem>
              {filtered.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`meeiro-${m.id}`}
                  onSelect={() => {
                    onChange(m.id);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === m.id ? 'opacity-100' : 'opacity-0')} />
                  {m.codigo ? `${m.codigo} – ${m.nome}` : (m.nome ?? String(m.id))}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AddProdutoLanc({
  produtos,
  onAdd,
  disabled,
  produtoPreselecionado,
  onProdutoPreselecionadoConsumido,
}: {
  produtos: Array<{ id: number; nome?: string; unidade_medida?: string }>;
  onAdd: (produtoId: number, quantidade: number, preco_unitario: number) => void;
  disabled: boolean;
  produtoPreselecionado?: { id: number; nome: string } | null;
  onProdutoPreselecionadoConsumido?: () => void;
}) {
  const [produtoId, setProdutoId] = useState<number | ''>('');
  const [qtd, setQtd] = useState('');
  const [preco, setPreco] = useState('');
  const [produtoPopoverOpen, setProdutoPopoverOpen] = useState(false);
  const [produtoSearchTerm, setProdutoSearchTerm] = useState('');

  useEffect(() => {
    if (produtoPreselecionado) {
      setProdutoId(produtoPreselecionado.id);
      setQtd('1');
      setPreco('0');
      onProdutoPreselecionadoConsumido?.();
    }
  }, [produtoPreselecionado, onProdutoPreselecionadoConsumido]);

  const produtosFiltrados = produtos.filter((p) => {
    if (!produtoSearchTerm.trim()) return true;
    const term = produtoSearchTerm.toLowerCase();
    const nome = (p.nome ?? '').toLowerCase();
    const unidade = (p.unidade_medida ?? '').toLowerCase();
    return nome.includes(term) || unidade.includes(term);
  });

  if (produtos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Nenhum produto disponível. Cadastre produtos na aba Produtos ou no catálogo geral.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {/* Produto: mesma linha de design que Produtor (largura total) */}
      <div className="space-y-2 min-w-0">
        <Label>Produto</Label>
        <Popover open={produtoPopoverOpen} onOpenChange={(open) => { setProdutoPopoverOpen(open); if (!open) setProdutoSearchTerm(''); }} modal>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={produtoPopoverOpen}
              disabled={disabled}
              className="w-full justify-between font-normal min-h-11 py-3 text-base"
            >
              <span className={cn('truncate', 'max-[1366px]:text-sm')}>
                {produtoId !== ''
                  ? (() => {
                      const p = produtos.find((x) => x.id === produtoId);
                      return p ? `${p.nome ?? '—'} (${p.unidade_medida ?? 'UN'})` : 'Selecione o produto';
                    })()
                  : 'Selecione o produto'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[360px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Buscar por nome ou unidade..."
                value={produtoSearchTerm}
                onValueChange={setProdutoSearchTerm}
                className="h-11"
              />
              <CommandList className="max-h-[280px]" onWheel={(e) => e.stopPropagation()}>
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  {produtosFiltrados.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.nome ?? ''} ${p.unidade_medida ?? ''}`.trim()}
                      onSelect={() => {
                        setProdutoId(p.id);
                        setProdutoPopoverOpen(false);
                        setProdutoSearchTerm('');
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          produtoId === p.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {p.nome ?? '—'} ({p.unidade_medida ?? 'UN'})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {/* Qtd, preço e adicionar (1 pé colhido por lançamento é aplicado no servidor) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2 min-w-0 w-full sm:w-[160px] shrink-0">
          <Label>Qtd</Label>
          <Input
            type="number"
            min={0.001}
            step="any"
            placeholder="Quantidade"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            className="w-full min-h-11"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 min-w-0 flex-1 sm:min-w-[140px]">
          <Label>Preço de compra</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Preço de compra"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="w-full min-h-11"
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          size="default"
          className="min-h-11 px-6 w-full sm:w-auto shrink-0"
          onClick={() => {
            if (!produtoId) {
              toast.error('Selecione um produto');
              return;
            }
            if (!qtd?.trim() || !preco?.trim()) {
              toast.error('Informe quantidade e preço de compra');
              return;
            }
            const q = parseFloat(qtd.replace(',', '.'));
            const p = parseFloat(preco.replace(',', '.'));
            if (Number.isNaN(q) || Number.isNaN(p)) {
              toast.error('Quantidade e preço devem ser números');
              return;
            }
            if (q <= 0) {
              toast.error('Quantidade deve ser maior que zero');
              return;
            }
            if (p < 0) {
              toast.error('Preço não pode ser negativo');
              return;
            }
            onAdd(produtoId, q, p);
            setProdutoId('');
            setQtd('');
            setPreco('');
          }}
          disabled={disabled}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}
