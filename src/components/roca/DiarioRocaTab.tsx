import { TableRowActionsMenu } from '@/components/TableRowActionsMenu';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { extractApiErrorMessage } from '@/lib/api-error-message';
import { compareRocaPorCodigo, formatDate } from '@/lib/utils';
import { controleRocaService } from '@/services/controle-roca.service';
import type { DiarioRoca, Roca } from '@/types/roca';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Filter,
  Loader2,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type FiltrosDiario = {
  rocaId: number | '';
  dataInicial: string;
  dataFinal: string;
  procedimento: string;
  produtosUtilizados: string;
  busca: string;
};

const FILTROS_VAZIOS: FiltrosDiario = {
  rocaId: '',
  dataInicial: '',
  dataFinal: '',
  procedimento: '',
  produtosUtilizados: '',
  busca: '',
};

function rotuloRoca(r: Pick<Roca, 'nome' | 'codigo'> | null | undefined, fallbackId?: number) {
  if (!r) return fallbackId != null ? `Roça ${fallbackId}` : '—';
  return (r.codigo ? `${r.codigo} – ` : '') + (r.nome || `Roça ${fallbackId ?? ''}`);
}

export function DiarioRocaTab() {
  const queryClient = useQueryClient();
  const [filtrosDraft, setFiltrosDraft] = useState<FiltrosDiario>(FILTROS_VAZIOS);
  const [filtros, setFiltros] = useState<FiltrosDiario>(FILTROS_VAZIOS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<DiarioRoca | null>(null);
  const [excluirId, setExcluirId] = useState<number | null>(null);
  const [form, setForm] = useState({
    data: '',
    rocaId: '' as number | '',
    procedimento: '',
    produtosUtilizados: '',
  });

  const { data: rocasApi = [] } = useQuery({
    queryKey: ['controle-roca', 'rocas', 'diario'],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
  });

  const rocas = useMemo(
    () =>
      [...(rocasApi as Roca[])]
        .filter((r) => r.ativo !== false)
        .sort(compareRocaPorCodigo),
    [rocasApi],
  );

  const { data: lista, isLoading, isFetching } = useQuery({
    queryKey: ['controle-roca', 'diario', filtros],
    queryFn: () =>
      controleRocaService.listarDiarioRoca({
        page: 1,
        limit: 500,
        rocaId: filtros.rocaId === '' ? undefined : Number(filtros.rocaId),
        dataInicial: filtros.dataInicial || undefined,
        dataFinal: filtros.dataFinal || undefined,
        procedimento: filtros.procedimento || undefined,
        produtosUtilizados: filtros.produtosUtilizados || undefined,
        busca: filtros.busca || undefined,
      }),
  });

  const items = lista?.items ?? [];

  const contagemFiltros =
    (filtros.rocaId !== '' ? 1 : 0) +
    (filtros.dataInicial ? 1 : 0) +
    (filtros.dataFinal ? 1 : 0) +
    (filtros.procedimento.trim() ? 1 : 0) +
    (filtros.produtosUtilizados.trim() ? 1 : 0) +
    (filtros.busca.trim() ? 1 : 0);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['controle-roca', 'diario'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      controleRocaService.criarDiarioRoca({
        data: form.data,
        rocaId: Number(form.rocaId),
        procedimento: form.procedimento.trim(),
        produtosUtilizados: form.produtosUtilizados.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Registro do diário criado.');
      setDialogOpen(false);
      invalidate();
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e) || 'Não foi possível criar o registro.'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      controleRocaService.atualizarDiarioRoca(editando!.id, {
        data: form.data,
        rocaId: Number(form.rocaId),
        procedimento: form.procedimento.trim(),
        produtosUtilizados: form.produtosUtilizados.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Registro do diário atualizado.');
      setDialogOpen(false);
      setEditando(null);
      invalidate();
    },
    onError: (e) =>
      toast.error(
        extractApiErrorMessage(e) || 'Não foi possível atualizar o registro.',
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => controleRocaService.excluirDiarioRoca(id),
    onSuccess: () => {
      toast.success('Registro excluído.');
      setExcluirId(null);
      invalidate();
    },
    onError: (e) =>
      toast.error(
        extractApiErrorMessage(e) || 'Não foi possível excluir o registro.',
      ),
  });

  const abrirNovo = () => {
    setEditando(null);
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    setForm({
      data: `${y}-${m}-${d}`,
      rocaId: '',
      procedimento: '',
      produtosUtilizados: '',
    });
    setDialogOpen(true);
  };

  const abrirEditar = (row: DiarioRoca) => {
    setEditando(row);
    setForm({
      data: row.data?.slice(0, 10) || '',
      rocaId: row.rocaId,
      procedimento: row.procedimento || '',
      produtosUtilizados: row.produtosUtilizados || '',
    });
    setDialogOpen(true);
  };

  const salvar = () => {
    if (!form.data) {
      toast.error('Informe a data.');
      return;
    }
    if (!form.rocaId) {
      toast.error('Selecione a roça.');
      return;
    }
    if (!form.procedimento.trim()) {
      toast.error('Informe o procedimento.');
      return;
    }
    if (editando) updateMutation.mutate();
    else createMutation.mutate();
  };

  const salvando = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              setFiltrosDraft(filtros);
              setSheetOpen(true);
            }}
            style={
              contagemFiltros > 0
                ? { borderColor: 'var(--primary)', borderWidth: '2px' }
                : undefined
            }
          >
            <Filter className="h-4 w-4" />
            Filtros
            {contagemFiltros > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {contagemFiltros}
              </span>
            ) : null}
          </Button>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por procedimento, produtos ou roça..."
              value={filtros.busca}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, busca: e.target.value }))
              }
            />
          </div>
        </div>
        <Button type="button" className="gap-2" onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo registro
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Roça</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Produtos utilizados</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando diário...
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <NotebookPen className="h-10 w-10 text-muted-foreground/40" />
                    <p>Nenhum registro no diário de roça.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(row.data)}
                  </TableCell>
                  <TableCell>
                    {rotuloRoca(
                      { codigo: row.rocaCodigo, nome: row.rocaNome },
                      row.rocaId,
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="line-clamp-2">{row.procedimento}</span>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-muted-foreground">
                    <span className="line-clamp-2">
                      {row.produtosUtilizados?.trim() || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TableRowActionsMenu icon="horizontal">
                      <DropdownMenuItem onClick={() => abrirEditar(row)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setExcluirId(row.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </TableRowActionsMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isFetching && !isLoading ? (
        <p className="text-xs text-muted-foreground">Atualizando...</p>
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <SheetTitle className="text-xl">Filtros do diário</SheetTitle>
            </div>
            <SheetDescription>
              Filtre por data, roça, procedimento ou produtos.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Roça</Label>
              <Select
                value={
                  filtrosDraft.rocaId === ''
                    ? 'todas'
                    : String(filtrosDraft.rocaId)
                }
                onValueChange={(v) =>
                  setFiltrosDraft((prev) => ({
                    ...prev,
                    rocaId: v === 'todas' ? '' : Number(v),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as roças" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as roças</SelectItem>
                  {rocas.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {rotuloRoca(r, r.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Período</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data inicial</Label>
                  <Input
                    type="date"
                    value={filtrosDraft.dataInicial}
                    onChange={(e) =>
                      setFiltrosDraft((prev) => ({
                        ...prev,
                        dataInicial: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data final</Label>
                  <Input
                    type="date"
                    value={filtrosDraft.dataFinal}
                    onChange={(e) =>
                      setFiltrosDraft((prev) => ({
                        ...prev,
                        dataFinal: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Procedimento</Label>
              <Input
                placeholder="Ex.: sulfatar, pulverizar..."
                value={filtrosDraft.procedimento}
                onChange={(e) =>
                  setFiltrosDraft((prev) => ({
                    ...prev,
                    procedimento: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Produtos utilizados</Label>
              <Input
                placeholder="Ex.: VERTIMEC, PIRATE..."
                value={filtrosDraft.produtosUtilizados}
                onChange={(e) =>
                  setFiltrosDraft((prev) => ({
                    ...prev,
                    produtosUtilizados: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => {
                  setFiltros(filtrosDraft);
                  setSheetOpen(false);
                }}
              >
                Aplicar filtros
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFiltrosDraft(FILTROS_VAZIOS);
                  setFiltros(FILTROS_VAZIOS);
                  setSheetOpen(false);
                }}
              >
                Limpar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditando(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar registro do diário' : 'Novo registro do diário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Data <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, data: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Roça <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.rocaId === '' ? undefined : String(form.rocaId)}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, rocaId: Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolher a roça" />
                </SelectTrigger>
                <SelectContent>
                  {rocas.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {rotuloRoca(r, r.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Procedimento <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Ex.: Sulfatar para ácaro"
                value={form.procedimento}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, procedimento: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Produtos utilizados</Label>
              <Textarea
                placeholder="Ex.: VERTIMEC 10/100, PIRATE 10/100"
                value={form.produtosUtilizados}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    produtosUtilizados: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={excluirId != null}
        onOpenChange={(open) => {
          if (!open) setExcluirId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o registro do diário de roça. Não é possível
              desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (excluirId != null) deleteMutation.mutate(excluirId);
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
