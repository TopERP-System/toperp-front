import ProdutoForm from '@/components/produtos/ProdutoForm';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  prepararAtualizacaoProduto,
  produtoParaFormData,
} from '@/features/produtos/utils/prepararAtualizacaoProduto';
import { ProdutoFormData } from '@/features/produtos/utils/prepararCriacaoProduto';
import { Categoria, categoriasService } from '@/services/categorias.service';
import { Fornecedor, fornecedoresService } from '@/services/fornecedores.service';
import { CreateProdutoDto, produtosService } from '@/services/produtos.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function EditarProduto() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const produtoId = Number(id);

  const {
    data: produto,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['produtos', 'detalhe', produtoId],
    queryFn: () => produtosService.buscarPorId(produtoId),
    enabled: Number.isFinite(produtoId) && produtoId > 0,
    // Sempre dados atuais ao abrir a edição
    staleTime: 0,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', 'editar-produto'],
    queryFn: async () => {
      const response = await categoriasService.listar({ limit: 100 });
      return (Array.isArray(response) ? response : response.data || []) as Categoria[];
    },
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', 'editar-produto'],
    queryFn: async () => {
      const response = await fornecedoresService.listar({ limit: 500 });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.fornecedores)) return response.fornecedores;
      return [] as Fornecedor[];
    },
  });

  const initialData = useMemo(() => (produto ? produtoParaFormData(produto) : undefined), [produto]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateProdutoDto>) => produtosService.atualizar(produtoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['historico-estoque'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'], exact: false });
      toast.success('Produto atualizado com sucesso!');
      navigate('/produtos');
    },
    onError: (error: { message?: string; response?: { data?: { message?: string } } }) => {
      const msg = error?.response?.data?.message ?? error?.message ?? 'Erro ao atualizar produto';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao atualizar produto');
    },
  });

  const handleSubmit = (form: ProdutoFormData) => {
    if (!produto) return;
    const payload = prepararAtualizacaoProduto(produto, form);
    if (payload) updateMutation.mutate(payload);
  };

  const salvando = updateMutation.isPending;

  return (
    <AppLayout>
      <div className="min-w-0 bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => navigate('/produtos')}
                aria-label="Voltar para Produtos"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                  Editar Produto
                </h1>
                <p className="truncate text-sm text-muted-foreground">
                  {produto ? `${produto.nome} · ${produto.sku}` : 'Carregando dados do produto'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate('/produtos')}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="produto-form-page"
                variant="gradient"
                className="gap-2 rounded-xl"
                disabled={salvando || !produto}
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando produto...
            </div>
          ) : isError || !initialData ? (
            <div className="space-y-4 py-24 text-center">
              <p className="text-muted-foreground">Não foi possível carregar o produto.</p>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate('/produtos')}>
                Voltar para Produtos
              </Button>
            </div>
          ) : (
            <ProdutoForm
              key={produtoId}
              modo="editar"
              initialData={initialData}
              categorias={categorias}
              fornecedores={fornecedores}
              onSubmit={handleSubmit}
              isPending={salvando}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
