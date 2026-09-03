import OrderForm from '@/components/orders/OrderForm';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Cliente, clientesService, extractClientesFromResponse } from '@/services/clientes.service';
import { Fornecedor, fornecedoresService } from '@/services/fornecedores.service';
import { pedidosService } from '@/services/pedidos.service';
import { Produto, produtosService } from '@/services/produtos.service';
import { transportadorasService } from '@/services/transportadoras.service';
import { CreatePedidoDto, Pedido } from '@/types/pedido';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function NovoPedido() {
  const { id } = useParams<{ id: string }>();
  const pedidoId = id ? Number(id) : null;
  const isEdit = Boolean(pedidoId && !Number.isNaN(pedidoId));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['pedidos', pedidoId, 'edit'],
    queryFn: () => pedidosService.buscarPorId(pedidoId!),
    enabled: isEdit,
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'ativos'],
    queryFn: async () => {
      const response = await clientesService.listar({ limit: 100, statusCliente: 'ATIVO' });
      return extractClientesFromResponse(response);
    },
  });

  const { data: fornecedoresData } = useQuery({
    queryKey: ['fornecedores', 'all'],
    queryFn: async () => {
      const response = await fornecedoresService.listar({ limit: 100, statusFornecedor: 'ATIVO' });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.fornecedores)) return response.fornecedores;
      return [];
    },
  });

  const { data: produtosData } = useQuery({
    queryKey: ['produtos', 'ativos'],
    queryFn: async () => {
      const response = await produtosService.listar({ limit: 500, statusProduto: 'ATIVO' });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.produtos)) return response.produtos;
      return [];
    },
  });

  const { data: transportadorasData } = useQuery({
    queryKey: ['transportadoras', 'ativas'],
    queryFn: async () => {
      const response = await transportadorasService.listar({ limit: 100, apenasAtivos: true });
      return Array.isArray(response) ? response : response.transportadoras || [];
    },
  });

  const clientes: Cliente[] = Array.isArray(clientesData) ? clientesData : [];
  const fornecedores: Fornecedor[] = Array.isArray(fornecedoresData) ? fornecedoresData : [];
  const produtos: Produto[] = Array.isArray(produtosData) ? produtosData : [];
  const transportadoras = (transportadorasData || []).map((t: { id: number; nome: string }) => ({
    id: t.id,
    nome: t.nome,
  }));

  const createMutation = useMutation({
    mutationFn: (data: CreatePedidoDto) => pedidosService.criar(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido criado com sucesso!');
      navigate('/pedidos');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao criar pedido');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: oid, data }: { id: number; data: Partial<CreatePedidoDto> }) =>
      pedidosService.atualizar(oid, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido atualizado com sucesso!');
      navigate('/pedidos');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao atualizar pedido');
    },
  });

  const salvando = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (data: CreatePedidoDto) => {
    if (isEdit && pedidoId) {
      updateMutation.mutate({ id: pedidoId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEdit && loadingOrder) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-w-0 bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => navigate('/pedidos')}
                aria-label="Voltar para Pedidos"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                  {isEdit ? 'Editar Pedido' : 'Novo Pedido'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEdit
                    ? 'Atualize as informações do pedido no sistema'
                    : 'Preencha os dados para criar um novo pedido de venda ou compra'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate('/pedidos')}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="order-form-page"
                variant="gradient"
                className="rounded-xl gap-2"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEdit ? 'Salvando...' : 'Criando...'}
                  </>
                ) : isEdit ? (
                  'Salvar Pedido'
                ) : (
                  'Criar Pedido'
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8">
          <OrderForm
            layout="page"
            isOpen
            onClose={() => navigate('/pedidos')}
            onSubmit={handleSubmit}
            order={(order as Pedido) ?? null}
            isPending={salvando}
            clientes={clientes}
            fornecedores={fornecedores}
            produtos={produtos}
            transportadoras={transportadoras}
          />
        </div>
      </div>
    </AppLayout>
  );
}
