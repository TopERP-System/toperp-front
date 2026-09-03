import ProdutoForm from '@/components/produtos/ProdutoForm';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { prepararCriacaoProduto, ProdutoFormData } from '@/features/produtos/utils/prepararCriacaoProduto';
import { Categoria, categoriasService } from '@/services/categorias.service';
import { Fornecedor, fornecedoresService } from '@/services/fornecedores.service';
import { produtosService } from '@/services/produtos.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function NovoProduto() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', 'novo-produto'],
    queryFn: async () => {
      const response = await categoriasService.listar({ limit: 100 });
      return (Array.isArray(response) ? response : response.data || []) as Categoria[];
    },
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', 'novo-produto'],
    queryFn: async () => {
      const response = await fornecedoresService.listar({ limit: 500 });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.fornecedores)) return response.fornecedores;
      return [] as Fornecedor[];
    },
  });

  const createMutation = useMutation({
    mutationFn: produtosService.criar,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      const skuMsg = data?.sku ? ` SKU: ${data.sku}` : '';
      toast.success(`Produto cadastrado com sucesso!${skuMsg}`);
      navigate('/produtos');
    },
    onError: (error: { message?: string; response?: { data?: { message?: string } } }) => {
      const msg = error?.message || error?.response?.data?.message || 'Erro ao criar produto';
      if (
        typeof msg === 'string' &&
        msg.toLowerCase().includes('usuário autenticado') &&
        msg.toLowerCase().includes('obrigatório')
      ) {
        toast.error('É necessário estar logado para cadastrar o produto. Faça login e tente novamente.');
      } else {
        toast.error(msg);
      }
    },
  });

  const handleSubmit = (form: ProdutoFormData) => {
    const payload = prepararCriacaoProduto(form);
    if (payload) createMutation.mutate(payload);
  };

  const salvando = createMutation.isPending;

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
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Novo Produto</h1>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados para cadastrar um novo produto no sistema
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
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Criar Produto'
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <ProdutoForm
            categorias={categorias}
            fornecedores={fornecedores}
            onSubmit={handleSubmit}
            isPending={salvando}
          />
        </div>
      </div>
    </AppLayout>
  );
}
