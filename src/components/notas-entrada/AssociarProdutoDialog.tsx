import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { produtoDoItem, unidadeDoItem } from '@/features/notas-entrada/utils/cadastrosDoXml';
import { cn, formatCurrency } from '@/lib/utils';
import { Categoria, categoriasService } from '@/services/categorias.service';
import { ItemPrevia, notasEntradaService } from '@/services/notas-entrada.service';
import { CreateProdutoDto, Produto, produtosService } from '@/services/produtos.service';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Modo = 'existente' | 'novo';
type Unidade = CreateProdutoDto['unidade_medida'];

interface Props {
  item: ItemPrevia;
  fornecedorId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => void;
}

/** US04/US05: associa o item da nota a um produto (existente ou novo) e grava o vínculo. */
export function AssociarProdutoDialog({ item, fornecedorId, open, onOpenChange, onSalvo }: Props) {
  const [modo, setModo] = useState<Modo>(item.produto ? 'existente' : 'novo');
  const [termo, setTermo] = useState('');
  const [busca, setBusca] = useState('');
  const [escolhido, setEscolhido] = useState<Pick<Produto, 'id' | 'nome' | 'sku' | 'unidade_medida'> | null>(
    item.produto ? { ...item.produto, unidade_medida: item.produto.unidade_medida as Unidade } : null,
  );
  const [fator, setFator] = useState(String(item.fator_conversao || 1));
  const [nome, setNome] = useState(item.descricao);
  const [unidade, setUnidade] = useState<Unidade>(unidadeDoItem(item));
  const [categoriaId, setCategoriaId] = useState('');
  const criadoRef = useRef<number | null>(null);

  // Espera parar de digitar para buscar
  useEffect(() => {
    const t = setTimeout(() => setBusca(termo.trim()), 300);
    return () => clearTimeout(t);
  }, [termo]);

  const { data: sugestoes = [], isFetching: buscando } = useQuery({
    queryKey: ['produtos', 'sugestoes', 'nota-entrada', busca],
    queryFn: () => produtosService.buscarSugestoes(encodeURIComponent(busca), 8),
    enabled: modo === 'existente' && busca.length >= 2,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', 'ativas', 'nota-entrada'],
    queryFn: async () => {
      const res = await categoriasService.listar({ limit: 100, statusCategoria: 'ATIVO' });
      return (Array.isArray(res) ? res : res.data ?? []) as Categoria[];
    },
    enabled: open && modo === 'novo',
  });

  const fatorNumero = Number(fator.replace(',', '.'));
  const fatorValido = Number.isFinite(fatorNumero) && fatorNumero > 0;
  const unidadeProduto = modo === 'novo' ? unidade : escolhido?.unidade_medida;
  const novoProduto = produtoDoItem({ ...item, descricao: nome }, unidade, fatorValido ? fatorNumero : 1);

  const salvar = useMutation({
    mutationFn: async () => {
      let produtoId = escolhido?.id;
      if (modo === 'novo') {
        // Se o vínculo falhou depois de cadastrar, tentar de novo não cadastra o produto outra vez
        criadoRef.current ??= (
          await produtosService.criar({
            ...novoProduto,
            ...(categoriaId ? { categoriaId: Number(categoriaId) } : {}),
          })
        ).id;
        produtoId = criadoRef.current;
      }
      if (!produtoId) throw new Error('Escolha o produto.');
      await notasEntradaService.salvarVinculo({
        fornecedor_id: fornecedorId,
        codigo_fornecedor: item.codigo,
        produto_id: produtoId,
        fator_conversao: fatorNumero,
        unidade_fornecedor: item.unidade,
      });
    },
    onSuccess: () => {
      toast.success(modo === 'novo' ? 'Produto cadastrado e associado!' : 'Produto associado!');
      onOpenChange(false);
      onSalvo();
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Não foi possível associar o produto.');
    },
  });

  const podeSalvar =
    fatorValido && (modo === 'novo' ? nome.trim().length > 0 : Boolean(escolhido)) && !salvar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Associar produto ao item {item.n_item}</DialogTitle>
          <DialogDescription>
            {item.descricao} · Cód. {item.codigo} · {item.quantidade.toLocaleString('pt-BR')} {item.unidade} a{' '}
            {formatCurrency(item.valor_unitario)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="novo">Cadastrar novo</TabsTrigger>
            <TabsTrigger value="existente">Produto existente</TabsTrigger>
          </TabsList>

          <TabsContent value="existente" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar produto por nome, SKU ou código de barras"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {buscando && <Loader2 className="mx-auto my-3 h-4 w-4 animate-spin text-muted-foreground" />}
              {!buscando && busca.length >= 2 && sugestoes.length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              )}
              {sugestoes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setEscolhido(p)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    escolhido?.id === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                  )}
                >
                  <span>
                    <span className="font-medium">{p.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.sku} · {p.unidade_medida}
                    </span>
                  </span>
                  {escolhido?.id === p.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            {escolhido && (
              <p className="text-sm">
                Escolhido: <span className="font-medium">{escolhido.nome}</span>
              </p>
            )}
          </TabsContent>

          <TabsContent value="novo" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nome-produto-nota">Nome do produto *</Label>
              <Input id="nome-produto-nota" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unidade no estoque</Label>
                <Select value={unidade} onValueChange={(v) => setUnidade(v as Unidade)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['UN', 'KG', 'LT', 'CX'] as const).map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria (opcional)</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Vem do XML: custo {formatCurrency(novoProduto.preco_custo ?? 0)} por {unidade}
              {novoProduto.ncm ? ` · NCM ${novoProduto.ncm}` : ''}
              {novoProduto.codigo_barras ? ` · código de barras ${novoProduto.codigo_barras}` : ''}. Os
              dados fiscais de saída você completa depois no cadastro do produto.
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label htmlFor="fator-conversao">Conversão de unidade</Label>
          <div className="flex items-center gap-2 text-sm">
            <span className="whitespace-nowrap">1 {item.unidade} da nota =</span>
            <Input
              id="fator-conversao"
              className="w-28"
              inputMode="decimal"
              value={fator}
              onChange={(e) => setFator(e.target.value)}
            />
            <span>{unidadeProduto ?? 'unidades'} no estoque</span>
          </div>
          {!fatorValido && <p className="text-xs text-destructive">Informe um número maior que zero.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={!podeSalvar}>
            {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {modo === 'novo' ? 'Cadastrar e associar' : 'Associar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
