import { pedidosService } from '@/services/pedidos.service';
import type { AtualizarCondicaoPagamentoPayload } from '@/types/pedido';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAlterarCondicaoPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pedidoId,
      ...payload
    }: { pedidoId: number } & AtualizarCondicaoPagamentoPayload) =>
      pedidosService.alterarCondicaoPagamento(pedidoId, payload),
    onSuccess: (pedidoAtualizado) => {
      const id = pedidoAtualizado.id;
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', id, 'full'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', id, 'edit'] });
      queryClient.setQueryData(['pedidos', id, 'full'], pedidoAtualizado);
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] });
      toast.success(
        'Condição de pagamento atualizada. As parcelas foram recalculadas.'
      );
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        'Erro ao alterar condição de pagamento. Tente novamente.';
      toast.error(msg);
    },
  });
}
