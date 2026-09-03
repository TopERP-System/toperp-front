import { transportadorasService } from '@/services/transportadoras.service';
import {
    CreateTransportadoraDto,
    Pedido,
    Transportadora,
    UpdateTransportadoraDto,
} from '@/types/carrier';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 15;

export function useCarriers() {
  const queryClient = useQueryClient();

  // Estados de UI
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<Transportadora | null>(null);
  const [carrierToDelete, setCarrierToDelete] = useState<Transportadora | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // Query para listar transportadoras
  const {
    data: carriersResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transportadoras', currentPage, searchTerm],
    queryFn: async () => {
      try {
        const response = await transportadorasService.listar({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          termo: searchTerm.trim() || undefined,
        });
        return response;
      } catch (error: any) {
        // Se houver erro na busca, retornar resposta vazia em vez de lançar erro
        if (searchTerm.trim()) {
          return {
            transportadoras: [],
            total: 0,
            page: currentPage,
            limit: ITEMS_PER_PAGE,
          };
        }
        throw error;
      }
    },
  });

  const carriers = carriersResponse?.transportadoras || [];
  const totalCarriers = carriersResponse?.total || 0;
  const totalPages = Math.ceil(totalCarriers / ITEMS_PER_PAGE);

  // Query para buscar pedidos de uma transportadora
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
  } = useQuery({
    queryKey: ['transportadoras', selectedCarrier?.id, 'pedidos'],
    queryFn: async () => {
      if (!selectedCarrier?.id) return { pedidos: [], total: 0 };
      return await transportadorasService.buscarPedidosPorTransportadora(
        selectedCarrier.id
      );
    },
    enabled: !!selectedCarrier?.id && isOrdersDialogOpen,
  });

  const orders: Pedido[] = ordersData?.pedidos || [];

  // Mutation para criar transportadora
  const createMutation = useMutation({
    mutationFn: async (data: CreateTransportadoraDto) => {
      return await transportadorasService.criar(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportadoras'] });
      toast.success('Transportadora criada com sucesso!');
      setIsFormOpen(false);
      setSelectedCarrier(null);
    },
    onError: (error: any) => {
      let message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao criar transportadora';
      
      // Melhorar mensagem de erro de email inválido
      if (message.toLowerCase().includes('email') && 
          (message.toLowerCase().includes('inválido') || 
           message.toLowerCase().includes('invalido') ||
           message.toLowerCase().includes('invalid'))) {
        message = 'E-mail inválido. Verifique se o formato está correto (ex: exemplo@email.com)';
      }
      
      toast.error(message);
    },
  });

  // Mutation para atualizar transportadora
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateTransportadoraDto;
    }) => {
      return await transportadorasService.atualizar(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportadoras'] });
      toast.success('Transportadora atualizada com sucesso!');
      setIsFormOpen(false);
      setSelectedCarrier(null);
    },
    onError: (error: any) => {
      let message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao atualizar transportadora';
      
      // Melhorar mensagem de erro de email inválido
      if (message.toLowerCase().includes('email') && 
          (message.toLowerCase().includes('inválido') || 
           message.toLowerCase().includes('invalido') ||
           message.toLowerCase().includes('invalid'))) {
        message = 'E-mail inválido. Verifique se o formato está correto (ex: exemplo@email.com)';
      }
      
      toast.error(message);
    },
  });

  // Mutation para deletar transportadora
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await transportadorasService.deletar(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportadoras'] });
      toast.success('Transportadora excluída com sucesso!');
      setIsDeleteDialogOpen(false);
      setCarrierToDelete(null);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao excluir transportadora';
      toast.error(message);
    },
  });

  // Mutation para alterar status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      setUpdatingStatusId(id);
      return await transportadorasService.alterarStatus(id, ativo);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transportadoras'] });
      toast.success(
        `Transportadora ${variables.ativo ? 'ativada' : 'desativada'} com sucesso!`
      );
      setUpdatingStatusId(null);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao alterar status';
      toast.error(message);
      setUpdatingStatusId(null);
    },
  });

  // Ações CRUD
  const createCarrier = (data: CreateTransportadoraDto) => {
    createMutation.mutate(data);
  };

  const updateCarrier = (id: number, data: UpdateTransportadoraDto) => {
    updateMutation.mutate({ id, data });
  };

  const deleteCarrier = (carrier: Transportadora) => {
    deleteMutation.mutate(carrier.id);
  };

  const toggleCarrierStatus = (carrier: Transportadora) => {
    toggleStatusMutation.mutate({ id: carrier.id, ativo: !carrier.ativo });
  };

  const handleStatusChange = (carrierId: number, ativo: boolean) => {
    toggleStatusMutation.mutate({ id: carrierId, ativo });
  };

  // Buscar pedidos por transportadora
  const getOrdersByCarrier = (carrierId: number): Pedido[] => {
    if (selectedCarrier?.id === carrierId) {
      return orders;
    }
    return [];
  };

  // Ações de busca
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset para primeira página ao buscar
  };

  // Ações de modais
  const openCreateForm = () => {
    setSelectedCarrier(null);
    setIsFormOpen(true);
  };

  const openEditForm = (carrier: Transportadora) => {
    setSelectedCarrier(carrier);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (carrier: Transportadora) => {
    setCarrierToDelete(carrier);
    setIsDeleteDialogOpen(true);
  };

  const openOrdersDialog = (carrier: Transportadora) => {
    setSelectedCarrier(carrier);
    setIsOrdersDialogOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedCarrier(null);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setCarrierToDelete(null);
  };

  const closeOrdersDialog = () => {
    setIsOrdersDialogOpen(false);
    setSelectedCarrier(null);
  };

  return {
    // Dados
    carriers,
    totalCarriers,
    currentPage,
    totalPages,
    searchTerm,
    selectedCarrier,
    carrierToDelete,
    orders,
    isLoading,
    isLoadingOrders,
    error,

    // Estados de modais
    isFormOpen,
    isDeleteDialogOpen,
    isOrdersDialogOpen,

    // Ações de navegação
    setCurrentPage,
    handleSearch,

    // Ações CRUD
    createCarrier,
    updateCarrier,
    deleteCarrier,
    toggleCarrierStatus,
    handleStatusChange,
    getOrdersByCarrier,
    updatingStatusId,

    // Ações de modais
    openCreateForm,
    openEditForm,
    openDeleteDialog,
    openOrdersDialog,
    closeForm,
    closeDeleteDialog,
    closeOrdersDialog,

    // Estados de mutations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTogglingStatus: toggleStatusMutation.isPending,
  };
}

