import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosService } from '@/services/pedidos.service';
import { toast } from 'sonner';

export function useAtualizarDataVencimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pedidoId,
      dataVencimento,
    }: {
      pedidoId: number;
      dataVencimento: string;
    }) => {
      // Validar formato da data antes de enviar
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(dataVencimento)) {
        throw new Error('Formato de data inválido. Use YYYY-MM-DD.');
      }

      return pedidosService.atualizarDataVencimento(pedidoId, dataVencimento);
    },
    onSuccess: (pedidoAtualizado) => {
      // Invalidar queries relacionadas para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', pedidoAtualizado.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', pedidoAtualizado.id, 'full'] });
      queryClient.invalidateQueries({ queryKey: ['parcelas', pedidoAtualizado.id] });
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });

      toast.success('Data de vencimento atualizada com sucesso! As parcelas foram recalculadas automaticamente.');
    },
    onError: (error: any) => {
      const mensagem =
        error.response?.data?.message ||
        error.message ||
        'Erro ao atualizar data de vencimento. Tente novamente.';
      toast.error(mensagem);
    },
  });
}
