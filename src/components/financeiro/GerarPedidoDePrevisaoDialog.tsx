import { OrderForm } from '@/components/orders/OrderForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cliente, clientesService, extractClientesFromResponse } from '@/services/clientes.service';
import { financeiroService } from '@/services/financeiro.service';
import { Fornecedor, fornecedoresService } from '@/services/fornecedores.service';
import { pedidosService } from '@/services/pedidos.service';
import { Produto, produtosService } from '@/services/produtos.service';
import { transportadorasService } from '@/services/transportadoras.service';
import { draftFromContaPrevisao } from '@/types/pedido-draft-previsao';
import type { CreatePedidoDto } from '@/types/pedido';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShoppingCart } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';

type GerarPedidoDePrevisaoDialogProps = {
  contaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function GerarPedidoDePrevisaoDialog({
  contaId,
  open,
  onOpenChange,
  onSuccess,
}: GerarPedidoDePrevisaoDialogProps) {
  const queryClient = useQueryClient();

  const { data: conta, isLoading: loadingConta } = useQuery({
    queryKey: ['conta-financeira', contaId, 'gerar-pedido'],
    queryFn: () => financeiroService.buscarPorId(contaId!),
    enabled: open && contaId != null && contaId > 0,
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'ativos', 'gerar-pedido-previsao'],
    queryFn: async () => {
      const response = await clientesService.listar({ limit: 100, statusCliente: 'ATIVO' });
      return extractClientesFromResponse(response);
    },
    enabled: open,
  });

  const { data: fornecedoresData } = useQuery({
    queryKey: ['fornecedores', 'all', 'gerar-pedido-previsao'],
    queryFn: async () => {
      const response = await fornecedoresService.listar({ limit: 100, statusFornecedor: 'ATIVO' });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.fornecedores)) return response.fornecedores;
      return [];
    },
    enabled: open,
  });

  const { data: produtosData } = useQuery({
    queryKey: ['produtos', 'ativos', 'gerar-pedido-previsao'],
    queryFn: async () => {
      const response = await produtosService.listar({ limit: 500, statusProduto: 'ATIVO' });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.produtos)) return response.produtos;
      return [];
    },
    enabled: open,
  });

  const { data: transportadorasData } = useQuery({
    queryKey: ['transportadoras', 'ativas', 'gerar-pedido-previsao'],
    queryFn: async () => {
      const response = await transportadorasService.listar({ limit: 100, apenasAtivos: true });
      return Array.isArray(response) ? response : response.transportadoras || [];
    },
    enabled: open,
  });

  const clientes: Cliente[] = Array.isArray(clientesData) ? clientesData : [];
  const fornecedores: Fornecedor[] = Array.isArray(fornecedoresData) ? fornecedoresData : [];
  const produtos: Produto[] = Array.isArray(produtosData) ? produtosData : [];
  const transportadoras = (transportadorasData || []).map((t: { id: number; nome: string }) => ({
    id: t.id,
    nome: t.nome,
  }));

  const draftFromPrevisao = useMemo(
    () => (conta?.previsao ? draftFromContaPrevisao(conta) : null),
    [conta],
  );

  const createMutation = useMutation({
    mutationFn: async (data: CreatePedidoDto) => {
      const pedido = await pedidosService.criar(data);
      if (contaId != null) {
        await financeiroService.deletar(contaId);
      }
      return pedido;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      await queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-resumo'] });
      toast.success('Pedido criado e previsão removida.');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(
        error?.response?.data?.message || error?.message || 'Erro ao gerar pedido',
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[90rem] overflow-y-auto p-0 sm:w-[calc(100vw-2rem)]">
        <div className="border-b border-border/60 bg-background/95 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="h-5 w-5 text-violet-600" />
              Gerar pedido a partir da previsão
            </DialogTitle>
            <DialogDescription>
              Revise e complete os dados como em um novo pedido de venda. Ao salvar, a previsão
              será removida e a conta real virá do pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="order-form-page"
              variant="gradient"
              disabled={createMutation.isPending || loadingConta}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar pedido'
              )}
            </Button>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          {loadingConta ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conta && draftFromPrevisao ? (
            <OrderForm
              layout="page"
              isOpen={open}
              onClose={() => onOpenChange(false)}
              onSubmit={(data) => createMutation.mutate(data)}
              order={null}
              isPending={createMutation.isPending}
              clientes={clientes}
              fornecedores={fornecedores}
              produtos={produtos}
              transportadoras={transportadoras}
              draftFromPrevisao={draftFromPrevisao}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Previsão não encontrada ou já convertida.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
