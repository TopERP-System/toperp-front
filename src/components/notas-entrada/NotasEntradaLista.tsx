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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatarQuantidade, formatCurrency, formatDate } from '@/lib/utils';
import { formatDocument } from '@/lib/validators';
import { FiltrosNotasEntrada, NotaEntrada, notasEntradaService } from '@/services/notas-entrada.service';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const LIMITE = 20;

/** US01: consulta das notas de entrada, com detalhe, download do XML e cancelamento. */
export function NotasEntradaLista() {
  const queryClient = useQueryClient();
  const [rascunho, setRascunho] = useState<FiltrosNotasEntrada>({});
  const [filtros, setFiltros] = useState<FiltrosNotasEntrada>({});
  const [page, setPage] = useState(1);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [cancelando, setCancelando] = useState<NotaEntrada | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['notas-entrada', filtros, page],
    queryFn: () => notasEntradaService.listar({ ...filtros, page, limit: LIMITE }),
    placeholderData: keepPreviousData,
  });
  const notas = data?.notas ?? [];
  const paginas = Math.max(1, Math.ceil((data?.total ?? 0) / LIMITE));

  const cancelar = useMutation({
    mutationFn: (id: number) => notasEntradaService.cancelar(id),
    onSuccess: () => {
      toast.success('Entrada cancelada: estoque e contas a pagar estornados.');
      setCancelando(null);
      queryClient.invalidateQueries({ queryKey: ['notas-entrada'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (error: { message?: string }) => toast.error(error?.message || 'Não foi possível cancelar.'),
  });

  const baixar = async (nota: NotaEntrada) => {
    try {
      await notasEntradaService.baixarXml(nota);
    } catch (error) {
      toast.error((error as Error)?.message || 'Não foi possível baixar o XML.');
    }
  };

  const filtrar = () => {
    setPage(1);
    setFiltros(rascunho);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notas importadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            filtrar();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="filtro-de" className="text-xs">Emissão de</Label>
            <Input id="filtro-de" type="date" value={rascunho.data_inicial ?? ''}
              onChange={(e) => setRascunho({ ...rascunho, data_inicial: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-ate" className="text-xs">até</Label>
            <Input id="filtro-ate" type="date" value={rascunho.data_final ?? ''}
              onChange={(e) => setRascunho({ ...rascunho, data_final: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-numero" className="text-xs">Número</Label>
            <Input id="filtro-numero" inputMode="numeric" value={rascunho.numero ?? ''}
              onChange={(e) => setRascunho({ ...rascunho, numero: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-fornecedor" className="text-xs">Fornecedor ou CNPJ</Label>
            <Input id="filtro-fornecedor" value={rascunho.termo ?? ''}
              onChange={(e) => setRascunho({ ...rascunho, termo: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">Filtrar</Button>
            <Button type="button" variant="outline" onClick={() => { setRascunho({}); setFiltros({}); setPage(1); }}>
              Limpar
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emissão</TableHead>
                <TableHead>NF-e</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {isFetching ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Nenhuma nota de entrada encontrada.'}
                  </TableCell>
                </TableRow>
              ) : (
                notas.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(n.data_emissao)}</TableCell>
                    <TableCell className="whitespace-nowrap">{n.numero} · série {n.serie}</TableCell>
                    <TableCell>
                      <span className="font-medium">{n.fornecedor?.nome_fantasia ?? n.emitente_nome}</span>
                      <span className="block text-xs text-muted-foreground">{formatDocument(n.emitente_cpf_cnpj)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatCurrency(n.valor_total)}</TableCell>
                    <TableCell>
                      <Badge variant={n.situacao === 'CANCELADA' ? 'destructive' : 'secondary'}>
                        {n.situacao === 'CANCELADA' ? 'Cancelada' : 'Efetivada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{n.numero_pedido ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" aria-label="Ver nota" onClick={() => setDetalheId(n.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Baixar XML" onClick={() => baixar(n)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {n.situacao === 'EFETIVADA' && (
                        <Button variant="ghost" size="icon" aria-label="Cancelar entrada" onClick={() => setCancelando(n)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {paginas > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span>{page} de {paginas}</span>
            <Button variant="outline" size="sm" disabled={page >= paginas} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        )}
      </CardContent>

      {detalheId !== null && <DetalheNota id={detalheId} onClose={() => setDetalheId(null)} />}

      <AlertDialog open={cancelando !== null} onOpenChange={(aberto) => !aberto && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a entrada da NF-e {cancelando?.numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido de compra {cancelando?.numero_pedido} será cancelado: os produtos saem do estoque e o
              contas a pagar é cancelado. O custo dos produtos não volta ao valor anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelar.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelar.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (cancelando) cancelar.mutate(cancelando.id);
              }}
            >
              {cancelar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar entrada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DetalheNota({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: nota, isLoading } = useQuery({
    queryKey: ['notas-entrada', 'detalhe', id],
    queryFn: () => notasEntradaService.buscar(id),
  });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{nota ? `NF-e ${nota.numero} · série ${nota.serie}` : 'Nota de entrada'}</DialogTitle>
          <DialogDescription>
            {nota
              ? `${nota.fornecedor?.nome_fantasia ?? nota.emitente_nome} · emissão ${formatDate(nota.data_emissao)}` +
                (nota.data_entrada ? ` · entrada ${formatDate(nota.data_entrada)}` : '') +
                (nota.numero_pedido ? ` · pedido ${nota.numero_pedido}` : '')
              : 'Carregando…'}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !nota ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Entrou no estoque</TableHead>
                  <TableHead className="text-right">Custo unit.</TableHead>
                  <TableHead>CFOP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nota.itens.map((i) => (
                  <TableRow key={i.n_item}>
                    <TableCell>
                      {i.descricao}
                      <span className="block text-xs text-muted-foreground">
                        {formatarQuantidade(i.quantidade_nota)} {i.unidade_nota} · {formatCurrency(i.valor_total)}
                      </span>
                    </TableCell>
                    <TableCell>{i.produto.nome}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {formatarQuantidade(i.quantidade_estoque)} {i.produto.unidade_medida}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {i.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{i.cfop_nota} → {i.cfop_entrada}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-right">
              Produtos {formatCurrency(nota.valores.produtos)} · frete {formatCurrency(nota.valores.frete)} · total{' '}
              <span className="font-semibold">{formatCurrency(nota.valor_total)}</span>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
