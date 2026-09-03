import { Cliente, clientesService } from '@/services/clientes.service';
import { Fornecedor, fornecedoresService } from '@/services/fornecedores.service';
import { pedidosService } from '@/services/pedidos.service';
import { Produto, produtosService } from '@/services/produtos.service';
import { transportadorasService } from '@/services/transportadoras.service';
import {
    CreatePedidoDto,
    FiltrosPedidos,
    Pedido,
    StatusPedido
} from '@/types/pedido';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const DEFAULT_ITEMS_PER_PAGE = 10;

export function useOrders() {
  const queryClient = useQueryClient();

  // Estados de UI
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [filters, setFilters] = useState<FiltrosPedidos>({});
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Pedido | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Pedido | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  /** Cards de Pedidos + DRE: refetch imediato após criar/editar/status/cancelar. */
  const invalidarDashboardsFaturamento = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
      queryClient.invalidateQueries({ queryKey: ['pedidos', 'dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['pedidos', 'cards'] }),
      queryClient.invalidateQueries({
        queryKey: ['financeiro', 'faturamento-oficial'],
      }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'dre-real'] }),
    ]);
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: ['pedidos', 'dashboard'],
        type: 'active',
      }),
      queryClient.refetchQueries({
        queryKey: ['pedidos', 'cards'],
        type: 'active',
      }),
      queryClient.refetchQueries({
        queryKey: ['financeiro', 'faturamento-oficial'],
        type: 'active',
      }),
      queryClient.refetchQueries({
        queryKey: ['dashboard', 'dre-real'],
        type: 'active',
      }),
    ]);
  };

  // Query para listar pedidos
  const {
    data: ordersResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pedidos', currentPage, itemsPerPage, filters],
    queryFn: async () => {
      try {
        const cardFiltro = filters.card_filtro;
        // Confirmados (venda/compra): múltiplos status — buscar lote maior e filtrar no cliente
        const cardFiltroCliente =
          cardFiltro === 'faturamento_venda' ||
          cardFiltro === 'compras_confirmadas';
        const hasBusca = !!(filters.numero_pedido || filters.busca);
        const needsWideFetch = hasBusca || cardFiltroCliente;
        const limit = needsWideFetch ? 2000 : itemsPerPage;

        const { card_filtro: _card, ...restFilters } = filters;
        let apiFilters: FiltrosPedidos = { ...restFilters };

        if (cardFiltro === 'faturamento_venda') {
          apiFilters = { ...apiFilters, tipo: 'VENDA', status: undefined };
        } else if (cardFiltro === 'compras_confirmadas') {
          apiFilters = { ...apiFilters, tipo: 'COMPRA', status: undefined };
        } else if (cardFiltro === 'cancelados') {
          apiFilters = { ...apiFilters, status: 'CANCELADO' };
        } else if (cardFiltro === 'aberto_venda') {
          apiFilters = { ...apiFilters, tipo: 'VENDA', status: 'ABERTO' };
        } else if (cardFiltro === 'compras_em_aberto') {
          apiFilters = { ...apiFilters, tipo: 'COMPRA', status: 'ABERTO' };
        } else if (cardFiltro === 'em_andamento') {
          apiFilters = { ...apiFilters, status: 'ABERTO' };
        }

        const params = {
          ...apiFilters,
          page: needsWideFetch ? 1 : currentPage,
          limit,
        };
        
        // Debug: log dos filtros sendo enviados
        console.log('🔍 [Pedidos] Filtros sendo enviados:', {
          ...params,
          filters_completos: filters,
          motivo_limit_aumentado: hasBusca ? 'Busca por numero_pedido ou busca' : undefined,
        });
        
        const response = await pedidosService.listar(params);
        console.log('📦 [Pedidos] Resposta da API:', {
          total: response?.total,
          quantidade_pedidos: response?.data?.length,
          response,
        });
        return response;
      } catch (error) {
        console.error('❌ [Pedidos] Erro ao buscar pedidos:', error);
        throw error;
      }
    },
  });

  // Normalizar resposta da API
  // Query para buscar dados completos do pedido quando o dialog de visualização está aberto
  const { data: fullOrderData } = useQuery({
    queryKey: ['pedidos', selectedOrder?.id, 'full'],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;
      return await pedidosService.buscarPorId(selectedOrder.id);
    },
    enabled: !!selectedOrder?.id && isViewDialogOpen,
    staleTime: 30000, // Cache por 30 segundos
  });

  // Query para buscar dados completos do pedido quando o formulário de edição está aberto
  const { data: fullOrderDataForEdit } = useQuery({
    queryKey: ['pedidos', selectedOrder?.id, 'edit'],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;
      return await pedidosService.buscarPorId(selectedOrder.id);
    },
    enabled: !!selectedOrder?.id && isFormOpen,
    staleTime: 0, // Sem cache para garantir dados sempre atualizados na edição
  });

  // Usar dados completos se disponíveis, senão usar os dados básicos
  const orderForView = useMemo(() => {
    if (fullOrderData) return fullOrderData;
    return selectedOrder;
  }, [fullOrderData, selectedOrder]);

  // Dados do pedido para edição - sempre buscar dados atualizados
  const orderForEdit = useMemo(() => {
    if (fullOrderDataForEdit) return fullOrderDataForEdit;
    return selectedOrder;
  }, [fullOrderDataForEdit, selectedOrder]);

  const filteredOrders = useMemo(() => {
    if (!ordersResponse) return [];

    let ordersList: Pedido[] = [];

    if (Array.isArray(ordersResponse)) {
      ordersList = ordersResponse;
    } else if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      ordersList = ordersResponse.data;
    } else if ((ordersResponse as { pedidos?: Pedido[] }).pedidos) {
      ordersList = (ordersResponse as { pedidos: Pedido[] }).pedidos;
    } else {
      return [];
    }

    if (filters.card_filtro === 'faturamento_venda') {
      ordersList = ordersList.filter(
        (o) =>
          o.tipo === 'VENDA' &&
          (o.status === 'ATENDIDO' ||
            o.status === 'QUITADO' ||
            o.status === 'PARCIAL'),
      );
    } else if (filters.card_filtro === 'compras_confirmadas') {
      ordersList = ordersList.filter(
        (o) =>
          o.tipo === 'COMPRA' &&
          (o.status === 'ATENDIDO' ||
            o.status === 'QUITADO' ||
            o.status === 'PARCIAL'),
      );
    }

    if (filters.numero_pedido && !filters.busca) {
      const searchTerm = filters.numero_pedido.toLowerCase();
      ordersList = ordersList.filter((order) =>
        order.numero_pedido?.toLowerCase().includes(searchTerm),
      );
    }

    return ordersList;
  }, [
    ordersResponse,
    filters.numero_pedido,
    filters.busca,
    filters.card_filtro,
    filters.tipo,
  ]);

  const needsClientPagination =
    filters.card_filtro === 'faturamento_venda' ||
    filters.card_filtro === 'compras_confirmadas';

  const orders = useMemo(() => {
    if (!needsClientPagination) return filteredOrders;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, needsClientPagination, currentPage, itemsPerPage]);

  const totalOrders = useMemo(() => {
    const hasBusca = !!(filters.numero_pedido || filters.busca);
    if (hasBusca || needsClientPagination) {
      return filteredOrders.length;
    }

    if (!ordersResponse) return 0;

    if (typeof ordersResponse.total === 'number') {
      return ordersResponse.total;
    }

    if (Array.isArray(ordersResponse)) {
      return ordersResponse.length;
    }

    if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      return ordersResponse.data.length;
    }

    return 0;
  }, [
    ordersResponse,
    filteredOrders.length,
    filters.numero_pedido,
    filters.busca,
    needsClientPagination,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalOrders / itemsPerPage) || 1);

  const setItemsPerPage = (size: number) => {
    setItemsPerPageState(size);
    setCurrentPage(1);
  };

  // Query para buscar todos os pedidos (para estatísticas)
  const { data: allOrdersResponse } = useQuery({
    queryKey: ['pedidos', 'all'],
    queryFn: async () => {
      return await pedidosService.listar({ limit: 500 });
    },
  });

  const allOrders = useMemo(() => {
    if (!allOrdersResponse) return [];
    
    // Se a resposta é um array direto
    if (Array.isArray(allOrdersResponse)) {
      return allOrdersResponse;
    }
    
    // Se a resposta tem propriedade data (formato esperado)
    if (allOrdersResponse.data && Array.isArray(allOrdersResponse.data)) {
      return allOrdersResponse.data;
    }
    
    // Se a resposta tem propriedade pedidos (formato alternativo)
    if ((allOrdersResponse as any).pedidos && Array.isArray((allOrdersResponse as any).pedidos)) {
      return (allOrdersResponse as any).pedidos;
    }
    
    return [];
  }, [allOrdersResponse]);

  // Queries para dados relacionados
  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'ativos'],
    queryFn: async () => {
      try {
        const response = await clientesService.listar({ limit: 100, statusCliente: 'ATIVO' });
        if (Array.isArray(response)) return response;
        if (Array.isArray((response as any)?.data)) return (response as any).data;
        if (Array.isArray((response as any)?.clientes)) return (response as any).clientes;
        if (Array.isArray((response as any)?.items)) return (response as any).items;
        return [];
      } catch {
        return [];
      }
    },
  });

  const { data: fornecedoresData } = useQuery({
    queryKey: ['fornecedores', 'all'],
    queryFn: async () => {
      try {
        const response = await fornecedoresService.listar({ limit: 500 });
        if (Array.isArray(response)) return response;
        if (Array.isArray((response as any)?.data)) return (response as any).data;
        if (Array.isArray((response as any)?.fornecedores)) return (response as any).fornecedores;
        if (Array.isArray((response as any)?.items)) return (response as any).items;
        return [];
      } catch {
        return [];
      }
    },
  });

  const { data: produtosData } = useQuery({
    queryKey: ['produtos', 'ativos'],
    queryFn: async () => {
      try {
        // Solicitar limite alto para obter todos os produtos ativos
        // O backend retorna todos os produtos quando limit >= 100 e statusProduto=ATIVO
        const response = await produtosService.listar({ limit: 500, statusProduto: 'ATIVO' });
        
        // Priorizar o novo formato: { data: Produto[], total, page, limit }
        // O backend já filtra produtos sem preco_venda válido, mas validamos novamente por segurança
        const produtos = Array.isArray(response) 
          ? response 
          : (response.data && Array.isArray(response.data)) 
            ? response.data 
            : (response.produtos && Array.isArray(response.produtos))
              ? response.produtos
              : [];
        
        // Validação adicional: garantir que produtos têm preco_venda válido
        // (O backend já faz isso, mas é uma camada extra de segurança)
        // IMPORTANTE: Se o backend já filtrou, não devemos filtrar novamente aqui
        // Mas vamos validar apenas para garantir que não há produtos inválidos
        const produtosValidos = produtos.filter((p: any) => {
          const temId = p && p.id !== undefined && p.id !== null;
          // Alguns produtos cadastrados via Controle de Roça podem ter preco_venda = 0.
          // Ainda assim eles precisam aparecer no formulário para o usuário informar o preco_unitario.
          const temPreco =
            p.preco_venda !== undefined &&
            p.preco_venda !== null &&
            !Number.isNaN(Number(p.preco_venda));
          
          if (!temId || !temPreco) {
            if (import.meta.env.DEV) {
              console.warn('[useOrders] Produto filtrado (sem ID ou preço válido):', {
                produto: p,
                temId,
                temPreco,
                preco_venda: p.preco_venda
              });
            }
            return false;
          }
          return true;
        });
        
        if (import.meta.env.DEV) {
          console.log('[useOrders] Produtos carregados:', {
            formatoResposta: Array.isArray(response) ? 'array' : 'objeto',
            respostaCompleta: response,
            totalBackend: (response as any)?.total || produtos.length,
            produtosRecebidos: produtos.length,
            produtosValidos: produtosValidos.length,
            produtosSemPreco: produtos.length - produtosValidos.length,
            idsProdutosRecebidos: produtos.map((p: any) => ({ id: p.id, nome: p.nome, preco_venda: p.preco_venda })),
            idsProdutosValidos: produtosValidos.map((p: any) => ({ id: p.id, nome: p.nome, preco_venda: p.preco_venda }))
          });
        }
        
        return produtosValidos;
      } catch (error) {
        console.error('[useOrders] Erro ao carregar produtos:', error);
        return [];
      }
    },
  });

  const { data: transportadorasData } = useQuery({
    queryKey: ['transportadoras', 'ativas'],
    queryFn: async () => {
      try {
        const response = await transportadorasService.listar({ limit: 100, apenasAtivos: true });
        return Array.isArray(response) ? response : response.transportadoras || [];
      } catch {
        return [];
      }
    },
  });

  const clientes: Cliente[] = Array.isArray(clientesData) ? clientesData : [];
  const fornecedores: Fornecedor[] = Array.isArray(fornecedoresData) ? fornecedoresData : [];
  const produtos: Produto[] = Array.isArray(produtosData) ? produtosData : [];
  const transportadoras = (transportadorasData || []).map((t: any) => ({
    id: t.id,
    nome: t.nome,
  }));

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const vendas = allOrders.filter((o) => o.tipo === 'VENDA');
    const compras = allOrders.filter((o) => o.tipo === 'COMPRA');
    const cancelados = allOrders.filter((o) => o.status === 'CANCELADO');

    const totalVendas = vendas.reduce((acc, o) => acc + (o.valor_total || 0), 0);
    const totalCompras = compras.reduce((acc, o) => acc + (o.valor_total || 0), 0);

    return {
      totalPedidos: allOrders.length,
      totalVendas: vendas.length,
      totalCompras: compras.length,
      totalCancelados: cancelados.length,
      valorTotalVendas: totalVendas,
      valorTotalCompras: totalCompras,
    };
  }, [allOrders]);

  // Mutation para criar pedido
  const createMutation = useMutation({
    mutationFn: async (data: CreatePedidoDto) => {
      return await pedidosService.criar(data);
    },
    onSuccess: async () => {
      await invalidarDashboardsFaturamento();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-pagar'] }),
      ]);
      
      toast.success('Pedido criado com sucesso!');
      setIsFormOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      let message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao criar pedido';
      
      // Interceptar erros de estoque e mostrar mensagem simplificada
      if (message.toLowerCase().includes('problemas de estoque') || 
          message.toLowerCase().includes('estoque') && 
          (message.toLowerCase().includes('quantidade solicitada') || 
           message.toLowerCase().includes('maior que estoque'))) {
        message = 'Estoque de produto insuficiente';
      }
      
      toast.error(message);
    },
  });

  // Mutation para atualizar pedido
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreatePedidoDto>;
    }) => {
      return await pedidosService.atualizar(id, data);
    },
    onSuccess: async (updatedOrder, variables) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Resumo financeiro do pedido (valor_total, valor_pago, valor_em_aberto) precisa ser recalculado
      queryClient.invalidateQueries({
        queryKey: ['pedidos', variables.id, 'resumo-financeiro'],
      });
      
      // Atualizar o cache do pedido específico com os dados retornados (incl. 'edit' para o form não receber dado desatualizado)
      queryClient.setQueryData(['pedidos', variables.id], updatedOrder);
      queryClient.setQueryData(['pedidos', variables.id, 'full'], updatedOrder);
      queryClient.setQueryData(['pedidos', variables.id, 'edit'], updatedOrder);
      
      // Atualizar o pedido na lista se estiver no cache
      queryClient.setQueriesData(
        { queryKey: ['pedidos'] },
        (old: any) => {
          if (!old) return old;
          
          // Se for um array direto
          if (Array.isArray(old)) {
            return old.map((order: Pedido) =>
              order.id === variables.id ? updatedOrder : order
            );
          }
          
          // Se tiver propriedade data
          if (old.data && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((order: Pedido) =>
                order.id === variables.id ? updatedOrder : order
              ),
            };
          }
          
          return old;
        }
      );
      
      // Forçar refetch imediato das queries principais
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['pedidos'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['pedidos', 'dashboard'] }),
        queryClient.refetchQueries({ queryKey: ['contas-financeiras'] }),
        queryClient.refetchQueries({
          queryKey: ['pedidos', variables.id, 'resumo-financeiro'],
        }),
      ]);
      await invalidarDashboardsFaturamento();

      // Garantir que o pedido atualizado (resposta do PATCH) permaneça no cache da lista após o refetch.
      // O refetch pode devolver lista com item ainda "À vista"; reaplicar updatedOrder nesse item.
      queryClient.setQueriesData(
        { queryKey: ['pedidos'] },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((order: Pedido) =>
              order.id === variables.id ? updatedOrder : order
            );
          }
          if (old.data && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((order: Pedido) =>
                order.id === variables.id ? updatedOrder : order
              ),
            };
          }
          return old;
        }
      );

      toast.success('Pedido atualizado com sucesso!');
      setIsFormOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      let message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao atualizar pedido';
      
      // Interceptar erros de estoque e mostrar mensagem simplificada
      if (message.toLowerCase().includes('problemas de estoque') || 
          message.toLowerCase().includes('estoque') && 
          (message.toLowerCase().includes('quantidade solicitada') || 
           message.toLowerCase().includes('maior que estoque'))) {
        message = 'Estoque de produto insuficiente';
      }
      
      toast.error(message);
    },
  });

  // Mutation para cancelar pedido (PATCH /pedidos/:id/cancelar).
  // Após sucesso: atualiza cache do pedido e invalida queries para o pedido sair das tabelas Contas a Receber / Contas a Pagar.
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await pedidosService.cancelar(id);
    },
    onSuccess: async (updatedOrder, id) => {
      // Atualizar cache para exibir status "Cancelado" na lista/detalhe na hora
      queryClient.setQueryData(['pedidos', id], updatedOrder);
      queryClient.setQueryData(['pedidos', id, 'full'], updatedOrder);
      queryClient.setQueryData(['pedidos', id, 'edit'], updatedOrder);
      queryClient.setQueriesData(
        { queryKey: ['pedidos'] },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((order: Pedido) => (order.id === id ? updatedOrder : order));
          }
          if (old?.data && Array.isArray(old.data)) {
            return { ...old, data: old.data.map((order: Pedido) => (order.id === id ? updatedOrder : order)) };
          }
          return old;
        }
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
        queryClient.invalidateQueries({ queryKey: ['pedidos', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['pedidos', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-pagar'] }),
        queryClient.invalidateQueries({ queryKey: ['pedidos', 'contas-receber'] }),
        queryClient.invalidateQueries({ queryKey: ['contas-receber'] }),
      ]);
      await invalidarDashboardsFaturamento();

      toast.success('Pedido cancelado com sucesso!');
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        (status === 400 ? 'Pedido já está cancelado.' : status === 404 ? 'Pedido não encontrado.' : 'Erro ao cancelar pedido.');
      toast.error(message);
    },
  });

  // Mutation para excluir pedido permanentemente (DELETE /pedidos/:id)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await pedidosService.excluir(id);
    },
    onSuccess: async (_data, id) => {
      queryClient.setQueriesData(
        { queryKey: ['pedidos'] },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.filter((order: Pedido) => order.id !== id);
          }
          if (old?.data && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.filter((order: Pedido) => order.id !== id),
              total: Math.max(0, Number(old.total ?? old.data.length) - 1),
            };
          }
          return old;
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
        queryClient.invalidateQueries({ queryKey: ['pedidos', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['pedidos', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-pagar'] }),
      ]);
      await invalidarDashboardsFaturamento();

      toast.success('Pedido excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao excluir pedido.';
      toast.error(message);
    },
  });

  // Mutation para atualizar status do pedido
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: StatusPedido;
    }) => {
      setUpdatingStatusId(id);
      return await pedidosService.atualizar(id, { status });
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['contas-financeiras', 'pedido', variables.id],
        }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-receber'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-pagar'] }),
      ]);
      await invalidarDashboardsFaturamento();

      toast.success('Status do pedido atualizado com sucesso!');
      setUpdatingStatusId(null);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao atualizar status do pedido';
      toast.error(message);
      setUpdatingStatusId(null);
    },
  });

  // Ações CRUD
  const createOrder = (data: CreatePedidoDto) => {
    createMutation.mutate(data);
  };

  const updateOrder = (id: number, data: Partial<CreatePedidoDto>) => {
    updateMutation.mutate({ id, data });
  };

  const cancelOrder = (order: Pedido) => {
    cancelMutation.mutate(order.id);
  };

  const deleteOrder = (order: Pedido) => {
    deleteMutation.mutate(order.id);
  };

  const handleStatusChange = (id: number, status: StatusPedido) => {
    updateStatusMutation.mutate({ id, status });
  };

  const getOrderById = async (id: number): Promise<Pedido | null> => {
    try {
      return await pedidosService.buscarPorId(id);
    } catch {
      return null;
    }
  };

  const searchOrderByNumber = (numero: string): Pedido | undefined => {
    return allOrders.find((o) => o.numero_pedido === numero);
  };

  // Ações de filtros
  const updateFilters = (newFilters: Partial<FiltrosPedidos>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      // Remove campos undefined e strings vazias para limpar filtros
      Object.keys(updated).forEach((key) => {
        const value = updated[key as keyof FiltrosPedidos];
        if (value === undefined || value === '' || value === null) {
          delete updated[key as keyof FiltrosPedidos];
        }
      });
      return updated;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Ações de modais
  const openCreateForm = () => {
    setSelectedOrder(null);
    setIsFormOpen(true);
  };

  const openEditForm = (order: Pedido) => {
    // Abrir modal imediatamente com os dados disponíveis
    setSelectedOrder(order);
    setIsFormOpen(true);
  };

  const openViewDialog = (order: Pedido) => {
    // Abrir dialog imediatamente com os dados disponíveis
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const openCancelDialog = (order: Pedido) => {
    setOrderToCancel(order);
    setIsCancelDialogOpen(true);
  };

  const openDeleteDialog = (order: Pedido) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedOrder(null);
  };

  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedOrder(null);
  };

  const closeCancelDialog = () => {
    setIsCancelDialogOpen(false);
    setOrderToCancel(null);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  return {
    // Dados
    orders,
    allOrders,
    totalOrders,
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    filters,
    stats,
    selectedOrder: orderForView,
    selectedOrderForEdit: orderForEdit,
    orderToCancel,
    orderToDelete,
    clientes,
    fornecedores,
    produtos,
    transportadoras,

    // Estados
    isLoading,
    error,
    isFormOpen,
    isViewDialogOpen,
    isCancelDialogOpen,
    isDeleteDialogOpen,

    // Ações de navegação
    setCurrentPage,
    updateFilters,
    clearFilters,

    // Ações CRUD
    createOrder,
    updateOrder,
    cancelOrder,
    deleteOrder,
    getOrderById,
    searchOrderByNumber,

    // Ações de modais
    openCreateForm,
    openEditForm,
    openViewDialog,
    openCancelDialog,
    openDeleteDialog,
    closeForm,
    closeViewDialog,
    closeCancelDialog,
    closeDeleteDialog,

    // Estados de mutations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isDeleting: deleteMutation.isPending,
    updatingStatusId,
    handleStatusChange,
  };
}

