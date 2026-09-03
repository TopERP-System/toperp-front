import AppLayout from "@/components/layout/AppLayout";
import { CepInputWithLookup } from "@/components/common/CepInputWithLookup";
import { ModulePageHeader } from "@/components/layout/ModulePageHeader";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
    ClienteStats,
    ClienteTable,
    RelatorioClienteDialog,
} from "@/features/clientes/components";
import { prepararAtualizacaoCliente } from "@/features/clientes/utils/prepararAtualizacaoCliente";
import { cleanDocument, formatCEP, formatCNPJ, formatCPF, formatTelefone } from "@/lib/validators";
import {
    ClientesEstatisticas,
    CreateClienteDto,
    FiltrosClientes,
    StatusCliente,
    clientesService,
    extractClientesFromResponse,
} from "@/services/clientes.service";
import { UpdateContatoDto, contatosService } from "@/services/contatos.service";
import {
    UpdateEnderecoDto,
    enderecosService,
} from "@/services/enderecos.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Building2,
    Calendar,
    Check,
    Circle,
    CreditCard,
    DollarSign,
    Edit,
    Eye,
    FileText,
    Filter,
    Hash,
    Loader2,
    Mail as MailIcon,
    MapPin,
    MapPin as MapPinIcon,
    Phone,
    Phone as PhoneIcon,
    Plus,
    RotateCcw,
    Save,
    Search,
    Trash2,
    User,
    User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Clientes = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15); // Padrão do backend para clientes
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relatorioDialogOpen, setRelatorioDialogOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(
    null
  );
  const [editEnderecoDialogOpen, setEditEnderecoDialogOpen] = useState(false);
  const [editContatoDialogOpen, setEditContatoDialogOpen] = useState(false);
  const [selectedEnderecoId, setSelectedEnderecoId] = useState<number | null>(
    null
  );
  const [selectedContatoId, setSelectedContatoId] = useState<number | null>(
    null
  );
  const [editingEndereco, setEditingEndereco] = useState<UpdateEnderecoDto>({});
  const [editingContato, setEditingContato] = useState<UpdateContatoDto>({});
  const [originalContato, setOriginalContato] = useState<any>(null); // Armazenar valores originais para comparação
  const [isSavingCliente, setIsSavingCliente] = useState(false); // Estado de loading para atualização completa
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null); // ID do cliente que está tendo o status atualizado
  const [enderecoParaDeletar, setEnderecoParaDeletar] = useState<{ index: number; endereco: any } | null>(null);
  const [contatoParaDeletar, setContatoParaDeletar] = useState<{ index: number; contato: any } | null>(null);
  
  // Estados para o dialog de edição
  const [editCurrentStep, setEditCurrentStep] = useState(1);
  const [editCliente, setEditCliente] = useState<CreateClienteDto>({
    nome: "",
    nome_fantasia: "",
    nome_razao: "",
    tipoPessoa: "PESSOA_FISICA",
    statusCliente: "ATIVO",
    cpf_cnpj: "",
    inscricao_estadual: "",
    limite_credito: undefined,
  });
  const [editLimiteCreditoInput, setEditLimiteCreditoInput] = useState("");
  const [editEnderecos, setEditEnderecos] = useState<
    Array<{
      id?: number;
      cep: string;
      logradouro: string;
      numero: string;
      complemento: string;
      bairro: string;
      cidade: string;
      estado: string;
      referencia: string;
      codigo_ibge?: string;
    }>
  >([]);
  const [editContatos, setEditContatos] = useState<
    Array<{
      id?: number;
      telefone: string;
      email: string;
      nomeContato: string;
      outroTelefone: string;
      nomeOutroTelefone: string;
      observacao: string;
      ativo?: boolean;
    }>
  >([]);
  const [clienteOriginal, setClienteOriginal] = useState<any>(null);
  
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltrosClientes>({
    tipoPessoa: "",
    statusCliente: "",
    cidade: "",
    estado: "",
  });

  // Buscar estatísticas
  const {
    data: estatisticas,
    isLoading: isLoadingEstatisticas,
    error: errorEstatisticas,
  } = useQuery<ClientesEstatisticas>({
      queryKey: ["clientes-estatisticas"],
    queryFn: async () => {
      try {
        return await clientesService.getEstatisticas();
      } catch (error: any) {
        // Se houver erro na API, logar mas não quebrar a aplicação
        if (import.meta.env.DEV) {
          console.warn("⚠️ [Estatísticas] Erro ao buscar estatísticas:", error);
          console.warn("⚠️ [Estatísticas] Detalhes do erro:", {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        }

        // Se for erro 400 (Bad Request), pode ser problema de validação no backend
        if (error?.response?.status === 400) {
          console.error(
            "❌ [Estatísticas] Erro 400 - O backend está esperando um parâmetro que não está sendo enviado. Verifique a documentação da API."
          );
        }
        // Retornar valores padrão em caso de erro
        return {
          total: 0,
          ativos: 0,
          inativos: 0,
          bloqueados: 0,
          inadimplentes: 0,
          novosNoMes: 0,
        };
      }
    },
      refetchInterval: 30000,
    retry: 1, // Tentar uma vez em caso de erro
      staleTime: 0, // Sempre considerar os dados como stale para garantir atualização
      gcTime: 5 * 60 * 1000, // Manter no cache por 5 minutos
    refetchOnWindowFocus: true, // Refetch quando a janela recebe foco
    refetchOnMount: true, // Sempre refetch ao montar
    });

  // Verificar se há filtros ativos
  const temFiltrosAtivos = Object.values(filtrosAvancados).some(
    (val) => val !== ""
  );

  // Validar parâmetros de paginação conforme GUIA_PAGINACAO_FRONTEND.md
  const validarParametrosPaginação = (page: number, limit: number): boolean => {
    if (page < 1) {
      console.error('Page deve ser maior ou igual a 1');
      return false;
    }
    if (limit < 1 || limit > 100) {
      console.error('Limit deve estar entre 1 e 100');
      return false;
    }
    return true;
  };

  // Buscar clientes com paginação - usa busca avançada se houver filtros, busca simples se houver termo, senão lista todos
  const {
    data: clientesResponse,
    isLoading: isLoadingClientes,
    error: errorClientes,
  } = useQuery({
    queryKey: ["clientes", searchTerm, filtrosAvancados, currentPage],
    queryFn: async () => {
      // Validar parâmetros antes de fazer a requisição
      if (!validarParametrosPaginação(currentPage, pageSize)) {
        throw new Error('Parâmetros de paginação inválidos');
      }

      try {
        let response;

        if (temFiltrosAtivos) {
          // Usa busca avançada quando há filtros
          response = await clientesService.buscarAvancado({
            termo: searchTerm.trim() || undefined,
            ...filtrosAvancados,
            page: currentPage,
            limit: pageSize,
          });
        } else if (searchTerm.trim()) {
          response = await clientesService.buscar(searchTerm, currentPage, pageSize);
        } else {
          // Lista todos quando não há termo nem filtros
          response = await clientesService.listar({
            page: currentPage,
            limit: pageSize,
          });
        }

        // Usar função helper para extrair clientes de forma consistente
        const clientes = extractClientesFromResponse(response);
        
        // Extrair total da resposta
        let total = 0;
        if (response && typeof response === "object" && !Array.isArray(response)) {
          total = (response as any).total || (response as any).meta?.total || clientes.length;
        } else {
          total = clientes.length;
        }

        // Debug temporário para verificar a resposta
        if (import.meta.env.DEV) {
          console.log("🔍 [Clientes] Resposta da API:", response);
          console.log("🔍 [Clientes] Tipo da resposta:", typeof response);
          console.log("🔍 [Clientes] É array?", Array.isArray(response));
          if (
            response &&
            typeof response === "object" &&
            !Array.isArray(response)
          ) {
            console.log(
              "🔍 [Clientes] Chaves do objeto:",
              Object.keys(response)
            );
            console.log("🔍 [Clientes] response.data:", response.data);
            console.log("🔍 [Clientes] response.meta:", response.meta);
          }
          console.log("🔍 [Clientes] Clientes extraídos:", clientes);
          console.log("🔍 [Clientes] Quantidade de clientes:", clientes.length);
          console.log("🔍 [Clientes] Total:", total);
        }

        return { clientes, total };
      } catch (error: unknown) {
        // Type guard para erro com response
        const isErrorWithResponse = (
          err: unknown
        ): err is {
          response?: {
            status?: number;
            statusText?: string;
            data?: { message?: string | string[] };
            headers?: Headers;
          };
          config?: { url?: string; method?: string };
          message?: string;
          stack?: string;
        } => {
          return typeof err === "object" && err !== null;
        };

        // Mostrar erro ao usuário apenas se não for erro de autenticação (que já é tratado globalmente)
        if (isErrorWithResponse(error)) {
          if (
            error.response?.status !== 401 &&
            error.response?.status !== 403
          ) {
            const errorMessage =
              error.response?.data?.message ||
              (Array.isArray(error.response?.data?.message)
                ? error.response.data.message.join(", ")
                : null) ||
              error.message ||
              "Erro ao carregar clientes.";

            toast.error(
              typeof errorMessage === "string"
                ? errorMessage
                : "Erro ao carregar clientes"
            );
          }
        }

        return { clientes: [], total: 0 };
      }
    },
    retry: (failureCount, error: unknown) => {
      // Type guard para erro com response
      const isErrorWithResponse = (
        err: unknown
      ): err is { response?: { status?: number } } => {
        return typeof err === "object" && err !== null;
      };

      // Não tentar novamente se for erro 401 (não autorizado) ou 403 (proibido)
      if (
        isErrorWithResponse(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        return false;
      }
      // Tentar até 2 vezes para outros erros
      return failureCount < 2;
    },
    retryDelay: 1000, // Esperar 1 segundo entre tentativas
  });

  const clientes = clientesResponse?.clientes || [];
  const totalClientes = clientesResponse?.total || 0;
  const totalPages = Math.ceil(totalClientes / pageSize);
  const queryClient = useQueryClient();

  // Resetar página quando filtro ou busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtrosAvancados]);

  // Mutation para criar cliente — movida para /clientes/novo

  // Query para buscar cliente por ID (para visualização e edição)
  const { data: selectedCliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ["cliente", selectedClienteId],
    queryFn: () => clientesService.buscarPorId(selectedClienteId!),
    enabled: !!selectedClienteId && (viewDialogOpen || editDialogOpen),
  });

  // Buscar condições de pagamento do cliente
  const { data: condicoesPagamento, isLoading: isLoadingCondicoes } = useQuery({
    queryKey: ["cliente", selectedClienteId, "condicoes-pagamento"],
    queryFn: () => clientesService.buscarCondicoesPagamento(selectedClienteId!),
    enabled: !!selectedClienteId && viewDialogOpen,
  });

  // Funções helper conforme GUIA_ADAPTACAO_FRONTEND_CAMPOS_VAZIOS.md
  /**
   * Compara dois valores considerando null/undefined/string vazia como equivalentes
   * Conforme guia: null, undefined e '' são tratados como equivalentes
   */
  const normalizarParaComparacao = (valor: any): any => {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    // Boolean não deve ser normalizado
    if (typeof valor === 'boolean') {
      return valor;
    }
    // String: trim antes de comparar
    return typeof valor === 'string' ? valor.trim() : valor;
  };

  /**
   * Prepara campo para envio ao backend
   * - undefined = não altera (não inclui no payload)
   * - "" = limpa (inclui no payload como "")
   * - valor = atualiza (inclui no payload)
   * 
   * Conforme GUIA_ADAPTACAO_FRONTEND_CAMPOS_VAZIOS.md:
   * - undefined → não altera
   * - "" → limpa (NULL no banco)
   * - "valor" → atualiza
   */
  const prepararCampoParaEnvio = (valorNovo: any, valorOriginal: any): any => {
    // Boolean: comparar diretamente
    if (typeof valorNovo === 'boolean' || typeof valorOriginal === 'boolean') {
      if (valorNovo !== valorOriginal) {
        return valorNovo;
      }
      return undefined;
    }

    const novoNormalizado = normalizarParaComparacao(valorNovo);
    const originalNormalizado = normalizarParaComparacao(valorOriginal);

    // Se não mudou, não enviar (undefined = não altera)
    if (novoNormalizado === originalNormalizado) {
      return undefined;
    }

    // Se mudou, determinar o que enviar
    // Conforme guia: "" limpa o campo (NULL no banco)
    // Se o novo valor é null/undefined/string vazia, enviar "" para limpar
    if (valorNovo === null || valorNovo === undefined || valorNovo === '') {
      return '';
    }

    // Se tem valor, enviar o valor normalizado (trim se for string)
    return typeof valorNovo === 'string' ? valorNovo.trim() : valorNovo;
  };

  // Mutation para atualizar cliente (mantida para compatibilidade, mas não será mais usada)
  const updateClienteMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateClienteDto>;
    }) => {
      return await clientesService.atualizar(id, data);
    },
    onSuccess: async () => {
      // Invalidar todas as queries de clientes (incluindo variações com filtros e busca)
      await queryClient.invalidateQueries({ 
        queryKey: ["clientes"],
        exact: false,
      });
      
      // Invalidar estatísticas para garantir atualização
      await queryClient.invalidateQueries({
        queryKey: ["clientes-estatisticas"],
        exact: true,
      });
      
      await queryClient.invalidateQueries({
        queryKey: ["cliente", selectedClienteId],
        exact: true,
      });
      
      // Forçar refetch imediato de todas as queries relacionadas
      await Promise.all([
        queryClient.refetchQueries({ 
          queryKey: ["clientes"],
          exact: false,
        }),
        queryClient.refetchQueries({ 
          queryKey: ["clientes-estatisticas"],
          exact: true,
        }),
      ]);
      
      toast.success("Cliente atualizado com sucesso!");
      setEditDialogOpen(false);
      setSelectedClienteId(null);
    },
    onError: (error: unknown) => {
      const isErrorWithResponse = (
        err: unknown
      ): err is {
        response?: { status?: number; data?: { message?: string | string[] } };
        message?: string;
      } => {
        return typeof err === "object" && err !== null;
      };

      if (isErrorWithResponse(error)) {
        const errorResponse = error.response?.data;
        const errorMessage =
          errorResponse?.message ||
          (Array.isArray(errorResponse?.message)
            ? errorResponse.message.join(", ")
            : null) ||
          error.message ||
          "Erro ao atualizar cliente";
        toast.error(
          typeof errorMessage === "string"
            ? errorMessage
            : "Erro ao atualizar cliente"
        );
      } else {
        toast.error("Erro ao atualizar cliente");
      }
    },
  });

  // Mutation para atualizar status do cliente
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: StatusCliente;
    }) => {
      return await clientesService.atualizarStatus(id, status);
    },
    onSuccess: async (data) => {
      // Invalidar todas as queries de clientes primeiro (sem exact para pegar todas as variações)
      await queryClient.invalidateQueries({
        queryKey: ["clientes"],
        exact: false,
      });
      
      // Invalidar estatísticas sem condições para garantir atualização
      await queryClient.invalidateQueries({
        queryKey: ["clientes-estatisticas"],
        exact: true,
      });
      
      await queryClient.invalidateQueries({
        queryKey: ["cliente", data.id],
        exact: true,
      });

      // Forçar refetch imediato de todas as queries relacionadas
      // Usar refetchQueries sem type para garantir que todas sejam atualizadas
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["clientes"],
          exact: false,
        }),
        queryClient.refetchQueries({
          queryKey: ["clientes-estatisticas"],
          exact: true,
        }),
      ]);

      toast.success(`Status do cliente atualizado para ${data.statusCliente}!`);
      setUpdatingStatusId(null);
    },
    onError: (error: unknown) => {
      setUpdatingStatusId(null);
      const isErrorWithResponse = (
        err: unknown
      ): err is {
        response?: { status?: number; data?: { message?: string | string[] } };
        message?: string;
      } => {
        return typeof err === "object" && err !== null;
      };

      if (isErrorWithResponse(error)) {
        const errorResponse = error.response?.data;
        const errorMessage =
          errorResponse?.message ||
          (Array.isArray(errorResponse?.message)
            ? errorResponse.message.join(", ")
            : null) ||
          error.message ||
          "Erro ao atualizar status do cliente";

        // Mensagens específicas para erros comuns
        if (error.response?.status === 403) {
          toast.error(
            "Você não tem permissão para atualizar o status. Apenas ADMIN ou GERENTE podem realizar esta ação."
          );
        } else if (error.response?.status === 400) {
          toast.error(
            typeof errorMessage === "string"
              ? errorMessage
              : "Status inválido ou cliente não encontrado"
          );
        } else {
          toast.error(
            typeof errorMessage === "string"
              ? errorMessage
              : "Erro ao atualizar status do cliente"
          );
        }
      } else {
        toast.error("Erro ao atualizar status do cliente");
      }
    },
  });

  // Handler para atualizar status
  const handleStatusChange = (id: number, novoStatus: StatusCliente) => {
    setUpdatingStatusId(id);
    updateStatusMutation.mutate({ id, status: novoStatus });
  };

  // Mutation para deletar cliente
  const deleteClienteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await clientesService.deletar(id);
    },
    onSuccess: async () => {
      // Invalidar todas as queries de clientes (sem exact para pegar todas as variações)
      await queryClient.invalidateQueries({
        queryKey: ["clientes"],
        exact: false,
      });

      // Invalidar estatísticas para garantir atualização
      await queryClient.invalidateQueries({
        queryKey: ["clientes-estatisticas"],
        exact: true,
      });
      
      // Forçar refetch imediato para atualizar a tabela e estatísticas
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["clientes"],
          exact: false,
        }),
        queryClient.refetchQueries({
          queryKey: ["clientes-estatisticas"],
          exact: true,
        }),
      ]);
      
      toast.success("Cliente excluído com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedClienteId(null);
    },
    onError: (error: unknown) => {
      const isErrorWithResponse = (
        err: unknown
      ): err is {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      } => {
        return typeof err === "object" && err !== null;
      };

      if (isErrorWithResponse(error)) {
        const errorResponse = error.response?.data;
        const errorMessage =
          errorResponse?.message ||
          (Array.isArray(errorResponse?.message)
            ? errorResponse.message.join(", ")
            : null) ||
          error.message ||
          "Erro ao excluir cliente";
        toast.error(
          typeof errorMessage === "string"
            ? errorMessage
            : "Erro ao excluir cliente"
        );
      } else {
        toast.error("Erro ao excluir cliente");
      }
    },
  });

  const handleView = (id: number) => {
    setSelectedClienteId(id);
    setViewDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedClienteId(id);
    setEditDialogOpen(true);
  };

  const handleRelatorios = (id: number) => {
    setSelectedClienteId(id);
    setRelatorioDialogOpen(true);
  };

  // Mutation para atualizar endereço
  const updateEnderecoMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      clienteId,
    }: {
      id: number;
      data: UpdateEnderecoDto;
      clienteId?: number;
    }) => {
      // Conforme DOCUMENTACAO-ENDPOINTS-CLIENTES.md
      // Para atualizar endereço, usar PATCH /api/v1/clientes/:id
      // com array de endereços incluindo o ID do endereço
      if (!clienteId) {
        throw new Error("ID do cliente é obrigatório para atualizar endereço");
      }

      // Buscar cliente atual para obter todos os endereços
      const clienteAtual = await clientesService.buscarPorId(clienteId);

      // Encontrar o endereço que está sendo editado
      const enderecoOriginal = (clienteAtual.enderecos || []).find(
        (end) => end.id === id
      );

      if (!enderecoOriginal) {
        throw new Error("Endereço não encontrado no cliente");
      }

      // Preparar array de endereços com todos os endereços existentes
      // Atualizar apenas o endereço que está sendo editado
      const enderecosAtualizados = (clienteAtual.enderecos || []).map((end) => {
        if (end.id === id) {
          // Este é o endereço que está sendo atualizado
          // Criar objeto com id e TODOS os campos (usando valores editados ou originais)
          // Conforme DOCUMENTACAO-ENDPOINTS-CLIENTES.md: todos os campos são opcionais na atualização
          const enderecoAtualizado: any = {
            id: end.id, // ⚠️ OBRIGATÓRIO: incluir ID para atualizar
          };

          // Usar valores editados se fornecidos, senão usar valores originais
          // Strings vazias ("") são enviadas para limpar campos
          enderecoAtualizado.cep =
            data.cep !== undefined ? data.cep : end.cep || "";
          enderecoAtualizado.logradouro =
            data.logradouro !== undefined
              ? data.logradouro
              : end.logradouro || "";
          enderecoAtualizado.numero =
            data.numero !== undefined ? data.numero : end.numero || "";
          enderecoAtualizado.complemento =
            data.complemento !== undefined
              ? data.complemento
              : end.complemento || "";
          enderecoAtualizado.bairro =
            data.bairro !== undefined ? data.bairro : end.bairro || "";
          enderecoAtualizado.cidade =
            data.cidade !== undefined ? data.cidade : end.cidade || "";
          enderecoAtualizado.estado =
            data.estado !== undefined ? data.estado : end.estado || "";
          enderecoAtualizado.referencia =
            data.referencia !== undefined
              ? data.referencia
              : end.referencia || "";

          return enderecoAtualizado;
        }
        // Manter outros endereços inalterados (com todos os campos incluindo ID)
        return {
          id: end.id,
          cep: end.cep || "",
          logradouro: end.logradouro || "",
          numero: end.numero || "",
          complemento: end.complemento || "",
          bairro: end.bairro || "",
          cidade: end.cidade || "",
          estado: end.estado || "",
          referencia: end.referencia || "",
        };
      });

      // Atualizar cliente com array de endereços atualizado
      return await clientesService.atualizar(clienteId, {
        enderecos: enderecosAtualizados,
      });
    },
    onSuccess: async () => {
      // Invalidar queries de clientes para atualizar os dados
      await queryClient.invalidateQueries({ 
        queryKey: ["clientes"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["cliente", selectedClienteId],
      });
      await queryClient.refetchQueries({ 
        queryKey: ["clientes"],
        exact: false,
      });
      
      // Recarregar dados do cliente se estiver editando
      if (selectedClienteId) {
        const updatedCliente = await clientesService.buscarPorId(
          selectedClienteId
        );
        if (updatedCliente.enderecos) {
          setEditEnderecos(
            updatedCliente.enderecos.map((end) => ({
              id: end.id,
              cep: end.cep || "",
              logradouro: end.logradouro || "",
              numero: end.numero || "",
              complemento: end.complemento || "",
              bairro: end.bairro || "",
              cidade: end.cidade || "",
              estado: end.estado || "",
              referencia: end.referencia || "",
            }))
          );
        }
      }
      
      toast.success("Endereço atualizado com sucesso!");
      setEditEnderecoDialogOpen(false);
      setSelectedEnderecoId(null);
      setEditingEndereco({});
    },
    onError: (error: unknown) => {
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        "Erro ao atualizar endereço";
      toast.error(errorMessage);
    },
  });

  // Mutation para remover endereço
  const removerEnderecoMutation = useMutation({
    mutationFn: async ({ clienteId, enderecoId }: { clienteId: number; enderecoId: number }) => {
      return await enderecosService.deletar(enderecoId, clienteId);
    },
    onSuccess: async (_, variables) => {
      // Invalidar queries para atualizar a lista
      await queryClient.invalidateQueries({
        queryKey: ["cliente", variables.clienteId],
        exact: true,
      });
      
      // ⚠️ IMPORTANTE: Recarregar dados do cliente para garantir sincronização
      // Isso atualiza o clienteOriginal com os dados corretos do servidor
      if (variables.clienteId) {
        const updatedCliente = await clientesService.buscarPorId(variables.clienteId);
        
        // ⚠️ CRÍTICO: Atualizar clienteOriginal com dados do servidor
        // Isso garante que a validação de endereços/contatos funcione corretamente
        setClienteOriginal(JSON.parse(JSON.stringify(updatedCliente)));
        
        if (updatedCliente.enderecos) {
          setEditEnderecos(
            updatedCliente.enderecos.map((end) => ({
              // Garantir que ID seja número
              id: end.id ? Number(end.id) : undefined,
              cep: end.cep || "",
              logradouro: end.logradouro || "",
              numero: end.numero || "",
              complemento: end.complemento || "",
              bairro: end.bairro || "",
              cidade: end.cidade || "",
              estado: end.estado || "",
              referencia: end.referencia || "",
            }))
          );
        } else {
          setEditEnderecos([]);
        }
      }
      
      toast.success("Endereço removido com sucesso!");
    },
    onError: (error: any) => {
      // Log detalhado do erro
      if (import.meta.env.DEV) {
        console.error('[Remover Endereço Mutation] Erro completo:', {
          error,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
        });
      }
      
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.message || error?.message;
      
      // Se for 404, o endereço já não existe - não mostrar erro crítico
      if (status === 404) {
        console.warn('[Remover Endereço] Endereço não encontrado (404):', errorMessage);
        // Não mostrar toast de erro, pois já foi tratado no onClick
        return;
      }
      
      // Se for 403, é erro de permissão/validação - mostrar mensagem específica
      // IMPORTANTE: 403 NÃO deve causar logout, apenas mostrar erro
      if (status === 403) {
        const msg = errorMessage || 
          "Você não tem permissão para remover este endereço ou o endereço não pertence a este cliente";
        toast.error(msg);
        // NÃO fazer logout - erro tratado
        return;
      }
      
      // Se for 401, o interceptor já tratou (logout)
      // Mas ainda assim, não propagar o erro
      if (status === 401) {
        console.error('[Remover Endereço] Erro de autenticação (401) - logout já foi feito pelo interceptor');
        // Não fazer nada - logout já foi feito pelo interceptor
        return;
      }
      
      // Para outros erros, mostrar mensagem
      toast.error(errorMessage || "Erro ao remover endereço");
    },
  });

  // Mutation para remover contato
  const removerContatoMutation = useMutation({
    mutationFn: async ({ clienteId, contatoId }: { clienteId: number; contatoId: number }) => {
      return await contatosService.deletar(contatoId, clienteId);
    },
    onSuccess: async (_, variables) => {
      // Invalidar queries para atualizar a lista
      await queryClient.invalidateQueries({
        queryKey: ["cliente", variables.clienteId],
        exact: true,
      });
      
      // ⚠️ IMPORTANTE: Recarregar dados do cliente para garantir sincronização
      // Isso atualiza o clienteOriginal com os dados corretos do servidor
      if (variables.clienteId) {
        const updatedCliente = await clientesService.buscarPorId(variables.clienteId);
        
        // ⚠️ CRÍTICO: Atualizar clienteOriginal com dados do servidor
        // Isso garante que a validação de endereços/contatos funcione corretamente
        setClienteOriginal(JSON.parse(JSON.stringify(updatedCliente)));
        
        if (updatedCliente.contato) {
          setEditContatos(
            updatedCliente.contato.map((cont: any) => ({
              // Garantir que ID seja número
              id: cont.id ? Number(cont.id) : undefined,
              telefone: cont.telefone || "",
              email: cont.email || "",
              // Aceitar ambos os formatos (camelCase e snake_case)
              nomeContato: cont.nomeContato ?? cont.nome_contato ?? "",
              outroTelefone: cont.outroTelefone ?? cont.outro_telefone ?? "",
              nomeOutroTelefone:
                cont.nomeOutroTelefone ?? cont.nome_outro_telefone ?? "",
              observacao: cont.observacao ?? "",
              ativo: cont.ativo !== undefined ? cont.ativo : true,
            }))
          );
        } else {
          setEditContatos([]);
        }
      }
      
      toast.success("Contato removido com sucesso!");
    },
    onError: (error: any) => {
      // Log detalhado do erro
      if (import.meta.env.DEV) {
        console.error('[Remover Contato Mutation] Erro completo:', {
          error,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
        });
      }
      
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.message || error?.message;
      
      // Se for 404, o contato já não existe - não mostrar erro crítico
      if (status === 404) {
        console.warn('[Remover Contato] Contato não encontrado (404):', errorMessage);
        // Não mostrar toast de erro, pois já foi tratado no onClick
        return;
      }
      
      // Se for 403, é erro de permissão/validação - mostrar mensagem específica
      // IMPORTANTE: 403 NÃO deve causar logout, apenas mostrar erro
      if (status === 403) {
        const msg = errorMessage || 
          "Você não tem permissão para remover este contato ou o contato não pertence a este cliente";
        toast.error(msg);
        // NÃO fazer logout - erro tratado
        return;
      }
      
      // Se for 401, o interceptor já tratou (logout)
      // Mas ainda assim, não propagar o erro
      if (status === 401) {
        console.error('[Remover Contato] Erro de autenticação (401) - logout já foi feito pelo interceptor');
        // Não fazer nada - logout já foi feito pelo interceptor
        return;
      }
      
      // Para outros erros, mostrar mensagem
      toast.error(errorMessage || "Erro ao remover contato");
    },
  });

  // Mutation para atualizar contato
  const updateContatoMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateContatoDto;
    }) => {
      // Comparar com valores originais e enviar apenas campos modificados
      const payload: UpdateContatoDto = {};

      // Função auxiliar para normalizar valores para comparação
      const normalizeValue = (value: any): string | undefined | boolean => {
        if (value === null || value === undefined) return undefined;
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed === "" ? "" : trimmed;
        }
        return value;
      };

      // Função auxiliar para comparar valores
      const hasChanged = (newValue: any, originalValue: any): boolean => {
        const normalizedNew = normalizeValue(newValue);
        const normalizedOriginal = normalizeValue(originalValue);
        return normalizedNew !== normalizedOriginal;
      };
      
      // Comparar cada campo e incluir apenas se foi modificado
      // Se o campo foi removido (undefined no data mas existia no original), não enviar
      // Se o campo foi limpo (string vazia), enviar string vazia para limpar no backend
      // Se o campo foi modificado, enviar o novo valor
      
      if (data.nomeContato !== undefined) {
        // Tentar obter o valor original de múltiplas fontes
        const originalValue =
          originalContato?.nomeContato ??
          originalContato?.nome_contato ??
          undefined;

        const hasNomeChanged = hasChanged(data.nomeContato, originalValue);

        if (import.meta.env.DEV) {
          console.log("🔍 [DEBUG nomeContato]:", {
            valorAtual: data.nomeContato,
            valorOriginal: originalValue,
            originalContatoCompleto: originalContato,
            normalizadoAtual: normalizeValue(data.nomeContato),
            normalizadoOriginal: normalizeValue(originalValue),
            mudou: hasNomeChanged,
            tipoAtual: typeof data.nomeContato,
            tipoOriginal: typeof originalValue,
            "originalContato?.nomeContato": originalContato?.nomeContato,
            "originalContato?.nome_contato": originalContato?.nome_contato,
          });
        }

        if (hasNomeChanged) {
          payload.nomeContato =
            typeof data.nomeContato === "string"
              ? data.nomeContato.trim()
              : data.nomeContato;

          if (import.meta.env.DEV) {
            console.log(
              "✅ nomeContato incluído no payload:",
              payload.nomeContato
            );
          }
        } else if (import.meta.env.DEV) {
          console.warn(
            "⚠️ nomeContato não foi incluído no payload - valores são iguais",
            {
              atual: data.nomeContato,
              original: originalValue,
            }
          );
        }
      } else if (import.meta.env.DEV) {
        console.warn(
          "⚠️ data.nomeContato é undefined - campo não será atualizado"
        );
      }
      
      if (data.email !== undefined) {
        const originalValue = originalContato?.email ?? undefined;
        if (hasChanged(data.email, originalValue)) {
          payload.email =
            typeof data.email === "string" ? data.email.trim() : data.email;
        }
      }
      
      if (data.telefone !== undefined) {
        const originalValue = originalContato?.telefone ?? undefined;
        if (hasChanged(data.telefone, originalValue)) {
          payload.telefone =
            typeof data.telefone === "string"
              ? data.telefone.trim()
              : data.telefone;
        }
      }
      
      if (data.outroTelefone !== undefined) {
        const originalValue = originalContato?.outroTelefone ?? undefined;
        if (hasChanged(data.outroTelefone, originalValue)) {
          payload.outroTelefone =
            typeof data.outroTelefone === "string"
              ? data.outroTelefone.trim()
              : data.outroTelefone;
        }
      }
      
      if (data.nomeOutroTelefone !== undefined) {
        const originalValue = originalContato?.nomeOutroTelefone ?? undefined;
        if (hasChanged(data.nomeOutroTelefone, originalValue)) {
          payload.nomeOutroTelefone =
            typeof data.nomeOutroTelefone === "string"
              ? data.nomeOutroTelefone.trim()
              : data.nomeOutroTelefone;
        }
      }
      
      if (data.observacao !== undefined) {
        const originalValue = originalContato?.observacao ?? undefined;
        if (hasChanged(data.observacao, originalValue)) {
          payload.observacao =
            typeof data.observacao === "string"
              ? data.observacao.trim()
              : data.observacao;
        }
      }
      
      if (data.ativo !== undefined) {
        const originalValue = originalContato?.ativo ?? true;
        if (data.ativo !== originalValue) {
          payload.ativo = data.ativo;
        }
      }

      // Validar se há pelo menos um campo para atualizar
      if (Object.keys(payload).length === 0) {
        if (import.meta.env.DEV) {
          console.warn("⚠️ Nenhum campo foi modificado. Nada será atualizado.");
        }
        // Retornar o contato original sem fazer requisição
        const contatoAtual = await contatosService.buscarPorId(id);
        return contatoAtual;
      }
      
      if (import.meta.env.DEV) {
        console.log("🔄 Atualizando contato:", { 
          id, 
          dadosAtuais: data,
          dadosOriginais: originalContato,
          payloadEnviado: payload,
          camposModificados: Object.keys(payload),
        });
      }
      
      return await contatosService.atualizar(id, payload);
    },
    onSuccess: async () => {
      // Invalidar queries de clientes para atualizar os dados
      await queryClient.invalidateQueries({ 
        queryKey: ["clientes"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["cliente", selectedClienteId],
      });
      await queryClient.refetchQueries({ 
        queryKey: ["clientes"],
        exact: false,
      });
      
      // Recarregar dados do cliente se estiver editando
      if (selectedClienteId) {
        const updatedCliente = await clientesService.buscarPorId(
          selectedClienteId
        );
        if (updatedCliente.contato) {
          setEditContatos(
            updatedCliente.contato.map((cont: any) => ({
              id: cont.id,
              telefone: cont.telefone || "",
              email: cont.email || "",
              // Aceitar ambos os formatos (camelCase e snake_case)
              nomeContato: cont.nomeContato || cont.nome_contato || "",
              outroTelefone: cont.outroTelefone || cont.outro_telefone || "",
              nomeOutroTelefone:
                cont.nomeOutroTelefone || cont.nome_outro_telefone || "",
              observacao: cont.observacao || "",
              ativo: cont.ativo !== undefined ? cont.ativo : true,
            }))
          );
        }
      }
      
      toast.success("Contato atualizado com sucesso!");
      setEditContatoDialogOpen(false);
      setSelectedContatoId(null);
      setEditingContato({});
      setOriginalContato(null);
    },
    onError: (error: unknown) => {
      // Log detalhado do erro (apenas em desenvolvimento)
      if (import.meta.env.DEV) {
        console.error("❌ Erro ao atualizar contato:", error);
        const errorWithResponse = error as any;
        if (errorWithResponse?.response) {
          console.error("❌ Status HTTP:", errorWithResponse.response.status);
          console.error("❌ Dados do erro:", errorWithResponse.response.data);
        }
      }
      
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (Array.isArray((error as any)?.response?.data?.message)
          ? (error as any).response.data.message.join(", ")
          : null) ||
        (error as any)?.message ||
        "Erro ao atualizar contato";
      toast.error(errorMessage);
    },
  });

  // Estado combinado para verificar se há alguma operação em andamento
  // IMPORTANTE: Deve ser definido APÓS todas as mutations serem criadas
  const isAnyOperationPending = 
    isSavingCliente ||
    deleteClienteMutation.isPending ||
    removerEnderecoMutation.isPending ||
    removerContatoMutation.isPending ||
    updateEnderecoMutation.isPending ||
    updateContatoMutation.isPending;

  const handleEditEndereco = (enderecoId: number, endereco: any) => {
    setSelectedEnderecoId(enderecoId);
    setEditingEndereco({
      cep: endereco.cep || "",
      logradouro: endereco.logradouro || "",
      numero: endereco.numero || "",
      complemento: endereco.complemento || "",
      bairro: endereco.bairro || "",
      cidade: endereco.cidade || "",
      estado: endereco.estado || "",
      referencia: endereco.referencia || "",
      codigo_ibge: endereco.codigo_ibge || "",
    });
    setEditEnderecoDialogOpen(true);
  };

  const handleEditContato = (contatoId: number, contato: any) => {
    setSelectedContatoId(contatoId);
    
    // Armazenar valores originais (aceitar ambos os formatos)
    // IMPORTANTE: Preservar strings vazias como strings vazias, não converter para undefined
    const original: any = {
      nomeContato: contato.nomeContato ?? contato.nome_contato ?? undefined,
      email: contato.email ?? undefined,
      telefone: contato.telefone ?? undefined,
      outroTelefone:
        contato.outroTelefone ?? contato.outro_telefone ?? undefined,
      nomeOutroTelefone:
        contato.nomeOutroTelefone ?? contato.nome_outro_telefone ?? undefined,
      observacao: contato.observacao ?? undefined,
      ativo: contato.ativo !== undefined ? contato.ativo : true,
    };

    if (import.meta.env.DEV) {
      console.log("📋 [handleEditContato] Valores originais armazenados:", {
        contatoRecebido: contato,
        originalArmazenado: original,
        nomeContatoOriginal: original.nomeContato,
        emailOriginal: original.email,
        "contato.nomeContato": contato.nomeContato,
        "contato.nome_contato": contato.nome_contato,
      });
    }
    
    setOriginalContato(original);
    
    // Inicializar com todos os valores (incluindo strings vazias)
    // Isso permite que o usuário veja e edite todos os campos, mesmo os vazios
    const editing: UpdateContatoDto = {
      nomeContato: original.nomeContato,
      email: original.email,
      telefone: original.telefone,
      outroTelefone: original.outroTelefone,
      nomeOutroTelefone: original.nomeOutroTelefone,
      observacao: original.observacao,
      ativo: original.ativo,
    };
    
    setEditingContato(editing);
    setEditContatoDialogOpen(true);
  };

  // Carregar dados do cliente quando abrir o dialog de edição
  useEffect(() => {
    if (editDialogOpen && selectedCliente && selectedClienteId) {
      // Debug: verificar dados carregados
      if (import.meta.env.DEV) {
        console.log("[Dialog Edição] Dados carregados:", {
          selectedCliente,
          enderecos: selectedCliente.enderecos,
          contatos: selectedCliente.contato
        });
      }
      
      // Salvar dados originais para comparação (deep copy)
      setClienteOriginal(JSON.parse(JSON.stringify(selectedCliente)));
      
      // Preencher formulário com dados do cliente
      // Para PJ: se backend retornou nome_razao igual a nome_fantasia (fallback), exibir Razão Social vazio para não duplicar na tela
      const nomeRazaoInicial =
        selectedCliente.tipoPessoa === "PESSOA_JURIDICA" &&
        (selectedCliente.nome_razao || "") === (selectedCliente.nome_fantasia || "")
          ? ""
          : selectedCliente.nome_razao || "";
      const limiteCreditoVal = selectedCliente.limite_credito ?? null;
      const limiteCreditoDisplay =
        limiteCreditoVal != null && !isNaN(limiteCreditoVal) && limiteCreditoVal >= 0
          ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(limiteCreditoVal)
          : "";
      setEditCliente({
        nome: selectedCliente.nome,
        nome_fantasia: selectedCliente.nome_fantasia || "",
        nome_razao: nomeRazaoInicial,
        tipoPessoa: selectedCliente.tipoPessoa,
        statusCliente: selectedCliente.statusCliente as
          | "ATIVO"
          | "INATIVO"
          | "BLOQUEADO"
          | "INADIMPLENTE",
        cpf_cnpj: selectedCliente.cpf_cnpj || "",
        inscricao_estadual: selectedCliente.inscricao_estadual || "",
        limite_credito: limiteCreditoVal ?? undefined,
      });
      setEditLimiteCreditoInput(limiteCreditoDisplay);

      // Preencher endereços
      if (selectedCliente.enderecos && selectedCliente.enderecos.length > 0) {
        setEditEnderecos(
          selectedCliente.enderecos.map((end) => ({
            // Garantir que ID seja número
            id: end.id ? Number(end.id) : undefined,
            cep: end.cep || "",
            logradouro: end.logradouro || "",
            numero: end.numero || "",
            complemento: end.complemento || "",
            bairro: end.bairro || "",
            cidade: end.cidade || "",
            estado: end.estado || "",
            referencia: end.referencia || "",
            codigo_ibge: end.codigo_ibge || "",
          }))
        );
      } else {
        setEditEnderecos([]);
      }

      // Preencher contatos
      if (selectedCliente.contato && selectedCliente.contato.length > 0) {
        setEditContatos(
          selectedCliente.contato.map((cont: any) => ({
            // Garantir que ID seja número
            id: cont.id ? Number(cont.id) : undefined,
            telefone: cont.telefone || "",
            email: cont.email || "",
            // Aceitar ambos os formatos (camelCase e snake_case)
            nomeContato: cont.nomeContato ?? cont.nome_contato ?? "",
            outroTelefone: cont.outroTelefone ?? cont.outro_telefone ?? "",
            nomeOutroTelefone:
              cont.nomeOutroTelefone ?? cont.nome_outro_telefone ?? "",
            observacao: cont.observacao ?? "",
            ativo: cont.ativo !== undefined ? cont.ativo : true,
          }))
        );
      } else {
        setEditContatos([]);
      }
      
      setEditCurrentStep(1);
    }
  }, [editDialogOpen, selectedCliente, selectedClienteId]);

  // Resetar estados quando fechar o dialog
  useEffect(() => {
    if (!editDialogOpen) {
      setEditCliente({
        nome: "",
        nome_fantasia: "",
        nome_razao: "",
        tipoPessoa: "PESSOA_FISICA",
        statusCliente: "ATIVO",
        cpf_cnpj: "",
        inscricao_estadual: "",
        limite_credito: undefined,
      });
      setEditLimiteCreditoInput("");
      setEditEnderecos([]);
      setEditContatos([]);
      setClienteOriginal(null);
    }
  }, [editDialogOpen]);

  const handleDelete = (id: number) => {
    setSelectedClienteId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedClienteId) {
      deleteClienteMutation.mutate(selectedClienteId);
    }
  };

  const handleAplicarFiltros = () => {
    setFiltrosDialogOpen(false);
    // A query será atualizada automaticamente pelo React Query
  };

  const handleLimparFiltros = () => {
    setFiltrosAvancados({
      tipoPessoa: "",
      statusCliente: "",
      cidade: "",
      estado: "",
    });
    setFiltrosDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={User}
          title="Clientes"
          subtitle="Cadastro e gestão de clientes, com indicadores de status e inadimplência."
          loadingHint={isLoadingEstatisticas ? "Carregando resumo…" : undefined}
          actions={
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => navigate("/clientes/novo")}
            >
              <Plus className="w-4 h-4" />
              Criar Cliente
            </Button>
          }
        />

        {/* Stats Grid */}
        <ClienteStats
          estatisticas={estatisticas}
          isLoading={isLoadingEstatisticas}
          error={errorEstatisticas}
        />

        {/* Filters and Search */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setFiltrosDialogOpen(true)}
              style={
                temFiltrosAtivos
                  ? { borderColor: "var(--primary)", borderWidth: "2px" }
                  : {}
              }
            >
              <Filter className="w-4 h-4" />
              Filtros
              {temFiltrosAtivos && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {
                    Object.values(filtrosAvancados).filter((v) => v !== "")
                      .length
                  }
                </span>
              )}
            </Button>
            <Sheet open={filtrosDialogOpen} onOpenChange={setFiltrosDialogOpen}>
              <SheetContent
                side="right"
                className="w-[400px] sm:w-[540px] overflow-y-auto"
              >
                <SheetHeader className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Filter className="w-5 h-5 text-primary" />
                    </div>
                    <SheetTitle className="text-xl">
                      Filtros Avançados
                    </SheetTitle>
                  </div>
                  <SheetDescription>Refine sua busca</SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Tipo de Cliente */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Tipo de Cliente
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFiltrosAvancados({
                            ...filtrosAvancados,
                            tipoPessoa: "",
                          })
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          !filtrosAvancados.tipoPessoa
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        <Circle
                          className={`w-4 h-4 ${
                            !filtrosAvancados.tipoPessoa
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm font-medium">Todos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFiltrosAvancados({
                            ...filtrosAvancados,
                            tipoPessoa: "PESSOA_JURIDICA",
                          })
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          filtrosAvancados.tipoPessoa === "PESSOA_JURIDICA"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        <Building2
                          className={`w-4 h-4 ${
                            filtrosAvancados.tipoPessoa === "PESSOA_JURIDICA"
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          Pessoa Jurídica
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFiltrosAvancados({
                            ...filtrosAvancados,
                            tipoPessoa: "PESSOA_FISICA",
                          })
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          filtrosAvancados.tipoPessoa === "PESSOA_FISICA"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        <User
                          className={`w-4 h-4 ${
                            filtrosAvancados.tipoPessoa === "PESSOA_FISICA"
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          Pessoa Física
                        </span>
                      </button>
                    </div>
                  </div>

                  <Separator />

                  {/* Status */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Status</Label>
                    <RadioGroup
                      value={filtrosAvancados.statusCliente || "none"}
                      onValueChange={(value) => {
                        const newStatus = value === "none" ? "" : value;
                        setFiltrosAvancados({
                          ...filtrosAvancados,
                          statusCliente: newStatus as
                            | ""
                            | "ATIVO"
                            | "INATIVO"
                            | "BLOQUEADO"
                            | "INADIMPLENTE",
                        });
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="status-all" />
                        <Label
                          htmlFor="status-all"
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Circle className="w-3 h-3 text-primary" />
                          <span>Todos</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ATIVO" id="status-ativo" />
                        <Label
                          htmlFor="status-ativo"
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Circle className="w-3 h-3 text-green-500" />
                          <span>Ativo</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="INATIVO" id="status-inativo" />
                        <Label
                          htmlFor="status-inativo"
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Circle className="w-3 h-3 text-muted-foreground" />
                          <span>Inativo</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="BLOQUEADO"
                          id="status-bloqueado"
                        />
                        <Label
                          htmlFor="status-bloqueado"
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Circle className="w-3 h-3 text-red-500" />
                          <span>Bloqueado</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="INADIMPLENTE"
                          id="status-inadimplente"
                        />
                        <Label
                          htmlFor="status-inadimplente"
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Circle className="w-3 h-3 text-orange-500" />
                          <span>Inadimplente</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Localização */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      LOCALIZAÇÃO
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor="cidade"
                          className="flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          Cidade
                        </Label>
                        <Input
                          id="cidade"
                          placeholder="Digite o nome da cidade (Ex: São Paulo, Rio de Janeiro)"
                          value={filtrosAvancados.cidade}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              cidade: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Digite o nome completo ou parcial da cidade
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          Estado (UF)
                        </Label>
                        <Input
                          id="estado"
                          placeholder="Digite a UF do estado (Ex: SP, RJ, MG) ou nome completo"
                          value={filtrosAvancados.estado}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              estado: e.target.value.toUpperCase(),
                            })
                          }
                          maxLength={2}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Digite a sigla (2 letras) ou o nome completo do estado
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Botões de ação */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleAplicarFiltros}
                      className="flex-1"
                      variant="gradient"
                    >
                      Aplicar Filtros
                    </Button>
                    <Button
                      onClick={handleLimparFiltros}
                      variant="outline"
                      className="flex-1"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, razão social, nome fantasia ou CPF/CNPJ..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <ClienteTable
          clientes={clientes}
          isLoading={isLoadingClientes}
          error={errorClientes}
          searchTerm={searchTerm}
          hasActiveFilters={temFiltrosAtivos}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRelatorios={handleRelatorios}
          onStatusChange={handleStatusChange}
          updatingStatusId={updatingStatusId}
        />
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="border-t border-border p-4 mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {/* Primeira página */}
                {currentPage > 3 && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(1)}
                        className="cursor-pointer"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage > 4 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}
                
                {/* Páginas ao redor da atual */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {/* Última página */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(totalPages)}
                        className="cursor-pointer"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            
            <div className="text-center text-sm text-muted-foreground mt-2">
              Mostrando {clientes.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a {Math.min(currentPage * pageSize, totalClientes)} de {totalClientes} clientes
            </div>
          </div>
        )}
      </div>

      {/* Modal de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Visualizar Cliente
            </DialogTitle>
            <DialogDescription>
              Informações completas do cliente
            </DialogDescription>
          </DialogHeader>

          {isLoadingCliente ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : selectedCliente ? (
            <div className="space-y-8 mt-6">
              {/* Informações Básicas */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      {selectedCliente.tipoPessoa === "PESSOA_JURIDICA"
                        ? "Razão Social"
                        : "Nome"}
                    </Label>
                    <p className="font-medium text-base">
                      {selectedCliente.tipoPessoa === "PESSOA_JURIDICA"
                        ? selectedCliente.nome_razao || selectedCliente.nome || "-"
                        : selectedCliente.nome || "-"}
                    </p>
                  </div>
                  {selectedCliente.tipoPessoa === "PESSOA_JURIDICA" && (
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">
                          Nome Fantasia
                        </Label>
                        <p className="font-medium text-base">
                        {selectedCliente.nome_fantasia || "-"}
                        </p>
                      </div>
                    )}
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      CPF/CNPJ
                    </Label>
                    <p className="font-medium text-base font-mono">
                      {selectedCliente.cpf_cnpj 
                        ? (() => {
                            const cleaned = cleanDocument(selectedCliente.cpf_cnpj);
                            if (!cleaned) return selectedCliente.cpf_cnpj;
                            if (selectedCliente.tipoPessoa === "PESSOA_FISICA" && cleaned.length === 11) {
                              return formatCPF(cleaned);
                            } else if (selectedCliente.tipoPessoa === "PESSOA_JURIDICA" && cleaned.length === 14) {
                              return formatCNPJ(cleaned);
                            }
                            return selectedCliente.cpf_cnpj;
                          })()
                        : "-"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      Inscrição Estadual (IE)
                    </Label>
                    <p className="font-medium text-base">
                      {selectedCliente.inscricao_estadual || "-"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      Tipo
                    </Label>
                    <p className="font-medium text-base">
                      {selectedCliente.tipoPessoa === "PESSOA_FISICA"
                        ? "Pessoa Física"
                        : "Pessoa Jurídica"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">
                      Status
                    </Label>
                      <span
                        className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${
                          selectedCliente.statusCliente === "ATIVO"
                            ? "bg-green-500/10 text-green-500"
                            : selectedCliente.statusCliente === "INATIVO"
                            ? "bg-muted text-muted-foreground"
                            : selectedCliente.statusCliente === "BLOQUEADO"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-orange-500/10 text-orange-500"
                        }`}
                      >
                        {selectedCliente.statusCliente}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Endereços */}
              {selectedCliente.enderecos &&
                selectedCliente.enderecos.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Endereços ({selectedCliente.enderecos.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedCliente.enderecos.map((endereco, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg space-y-2 relative"
                        >
                          <div className="absolute top-2 right-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (endereco.id) {
                                  handleEditEndereco(endereco.id, endereco);
                                }
                              }}
                              className="h-8 w-8 p-0"
                              title="Editar endereço"
                        >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                CEP
                              </Label>
                              <p>{endereco.cep || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Logradouro
                              </Label>
                              <p>{endereco.logradouro || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Número
                              </Label>
                              <p>{endereco.numero || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Complemento
                              </Label>
                              <p>{endereco.complemento || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Bairro
                              </Label>
                              <p>{endereco.bairro || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Cidade
                              </Label>
                              <p>{endereco.cidade || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Estado
                              </Label>
                              <p>{endereco.estado || "-"}</p>
                            </div>
                              <div className="col-span-2">
                                <Label className="text-xs text-muted-foreground">
                                  Referência
                                </Label>
                              <p>{endereco.referencia || "-"}</p>
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Contatos */}
              {selectedCliente.contato &&
                selectedCliente.contato.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      Contatos ({selectedCliente.contato.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedCliente.contato.map((contato, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg space-y-2 relative"
                        >
                          <div className="absolute top-2 right-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (contato.id) {
                                  handleEditContato(contato.id, contato);
                                }
                              }}
                              className="h-8 w-8 p-0"
                              title="Editar contato"
                        >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Telefone
                              </Label>
                              <p>{contato.telefone || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                E-mail
                              </Label>
                              <p>{contato.email || "-"}</p>
                            </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Nome do Contato
                                </Label>
                                <p>
                                  {contato.nomeContato ||
                                  (contato as any).nome_contato || "-"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Outro Telefone
                                </Label>
                              <p>{contato.outroTelefone || "-"}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Nome do Outro Telefone
                                </Label>
                              <p>{contato.nomeOutroTelefone || "-"}</p>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs text-muted-foreground">
                                  Observação
                                </Label>
                              <p>{contato.observacao || "-"}</p>
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Condições de Pagamento */}
              {isLoadingCondicoes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : condicoesPagamento && condicoesPagamento.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Condições de Pagamento ({condicoesPagamento.length})
                  </h3>
                  <div className="space-y-3">
                    {condicoesPagamento.map((condicao: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3 relative"
                      >
                        {condicao.padrao && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                              Padrão
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Descrição
                            </Label>
                            <p className="font-medium">{condicao.descricao || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Forma de Pagamento
                            </Label>
                            <p>
                              {condicao.forma_pagamento === "DINHEIRO"
                                ? "Dinheiro"
                                : condicao.forma_pagamento === "PIX"
                                ? "PIX"
                                : condicao.forma_pagamento === "CARTAO_CREDITO"
                                ? "Cartão de Crédito"
                                : condicao.forma_pagamento === "CARTAO_DEBITO"
                                ? "Cartão de Débito"
                                : condicao.forma_pagamento === "BOLETO"
                                ? "Boleto"
                                : condicao.forma_pagamento === "TRANSFERENCIA"
                                ? "Transferência"
                                : condicao.forma_pagamento === "CHEQUE"
                                ? "Cheque"
                                : condicao.forma_pagamento || "-"}
                            </p>
                          </div>
                          {condicao.parcelado ? (
                            <>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Tipo
                                </Label>
                                <p>Parcelado</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Número de Parcelas
                                </Label>
                                <p>{condicao.numero_parcelas || "-"}x</p>
                              </div>
                              {condicao.parcelas && condicao.parcelas.length > 0 && (
                                <div className="col-span-2">
                                  <Label className="text-xs text-muted-foreground mb-2 block">
                                    Detalhamento das Parcelas
                                  </Label>
                                  <div className="border rounded-md overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">Parcela</th>
                                          <th className="text-left p-2">Dias Vencimento</th>
                                          <th className="text-left p-2">Percentual</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {condicao.parcelas.map((parcela: any, pIndex: number) => (
                                          <tr key={pIndex} className="border-b">
                                            <td className="p-2">{parcela.numero_parcela}ª</td>
                                            <td className="p-2">{parcela.dias_vencimento} dias</td>
                                            <td className="p-2">{parcela.percentual}%</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : condicoesPagamento && condicoesPagamento.length === 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Condições de Pagamento
                  </h3>
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhuma condição de pagamento cadastrada
                  </div>
                </div>
              ) : null}

              {/* Datas */}
              {(selectedCliente.criadoEm || selectedCliente.atualizadoEm) && (
                <div className="space-y-2 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Informações do Sistema
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedCliente.criadoEm && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Criado em
                        </Label>
                        <p>
                          {new Date(selectedCliente.criadoEm).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    )}
                    {selectedCliente.atualizadoEm && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Atualizado em
                        </Label>
                        <p>
                          {new Date(
                            selectedCliente.atualizadoEm
                          ).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Cliente não encontrado
            </div>
          )}
          {selectedCliente && (
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
              <Button
                onClick={() => {
                  setViewDialogOpen(false);
                  handleRelatorios(selectedCliente.id);
                }}
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Relatórios
              </Button>
              <Button
                onClick={() => {
                  setViewDialogOpen(false);
                  handleEdit(selectedCliente.id);
                }}
                variant="default"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedClienteId(null);
            setEditCurrentStep(1);
            setEditCliente({
              nome: "",
              nome_fantasia: "",
              nome_razao: "",
              tipoPessoa: "PESSOA_FISICA",
              statusCliente: "ATIVO",
              cpf_cnpj: "",
              inscricao_estadual: "",
              limite_credito: undefined,
            });
            setEditLimiteCreditoInput("");
            setEditEnderecos([]);
            setEditContatos([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Editar Cliente
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Preencha os dados do cliente
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedCliente) {
                      const lcVal = selectedCliente.limite_credito ?? null;
                      const lcDisplay =
                        lcVal != null && !isNaN(lcVal) && lcVal >= 0
                          ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(lcVal)
                          : "";
                      setEditCliente({
                        nome: selectedCliente.nome,
                        nome_fantasia: selectedCliente.nome_fantasia || "",
                        nome_razao: selectedCliente.nome_razao || "",
                        tipoPessoa: selectedCliente.tipoPessoa,
                        statusCliente: selectedCliente.statusCliente as
                          | "ATIVO"
                          | "INATIVO"
                          | "BLOQUEADO"
                          | "INADIMPLENTE",
                        cpf_cnpj: selectedCliente.cpf_cnpj,
                        inscricao_estadual:
                          selectedCliente.inscricao_estadual || "",
                        limite_credito: lcVal ?? undefined,
                      });
                      setEditLimiteCreditoInput(lcDisplay);
                      if (
                        selectedCliente.enderecos &&
                        selectedCliente.enderecos.length > 0
                      ) {
                        setEditEnderecos(
                          selectedCliente.enderecos.map((end) => ({
                            id: end.id,
                            cep: end.cep || "",
                            logradouro: end.logradouro || "",
                            numero: end.numero || "",
                            complemento: end.complemento || "",
                            bairro: end.bairro || "",
                            cidade: end.cidade || "",
                            estado: end.estado || "",
                            referencia: end.referencia || "",
                          }))
                        );
                      }
                      if (
                        selectedCliente.contato &&
                        selectedCliente.contato.length > 0
                      ) {
                        setEditContatos(
                          selectedCliente.contato.map((cont: any) => ({
                            id: cont.id,
                            telefone: cont.telefone || "",
                            email: cont.email || "",
                            nomeContato:
                              cont.nomeContato || cont.nome_contato || "",
                            outroTelefone:
                              cont.outroTelefone || cont.outro_telefone || "",
                            nomeOutroTelefone:
                              cont.nomeOutroTelefone ||
                              cont.nome_outro_telefone ||
                              "",
                            observacao: cont.observacao || "",
                            ativo:
                              (cont as any).ativo !== undefined
                                ? (cont as any).ativo
                                : true,
                          }))
                        );
                      }
                    }
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          </DialogHeader>

          {isLoadingCliente ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : selectedCliente ? (
            <div className="space-y-8 pt-6">
              {/* Seção: Informações Básicas */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <UserIcon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Informações Básicas
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dados principais do cliente
                    </p>
                  </div>
                </div>
                <div className="space-y-8">
                  {/* Tipo de Cliente */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Tipo de Cliente
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setEditCliente({
                            ...editCliente,
                            tipoPessoa: "PESSOA_JURIDICA",
                            cpf_cnpj:
                              editCliente.tipoPessoa === "PESSOA_FISICA"
                                ? ""
                                : editCliente.cpf_cnpj,
                          })
                        }
                        className={`relative p-6 rounded-lg border-2 transition-all ${
                          (editCliente.tipoPessoa ||
                            selectedCliente.tipoPessoa) === "PESSOA_JURIDICA"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {(editCliente.tipoPessoa ||
                          selectedCliente.tipoPessoa) === "PESSOA_JURIDICA" && (
                          <div className="absolute top-3 right-3">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-3">
                          <Building2
                            className={`w-8 h-8 ${
                              (editCliente.tipoPessoa ||
                                selectedCliente.tipoPessoa) ===
                              "PESSOA_JURIDICA"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="text-center">
                            <p className="font-semibold">Pessoa Jurídica</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              CNPJ
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditCliente({
                            ...editCliente,
                            tipoPessoa: "PESSOA_FISICA",
                            cpf_cnpj:
                              editCliente.tipoPessoa === "PESSOA_JURIDICA"
                                ? ""
                                : editCliente.cpf_cnpj,
                          })
                        }
                        className={`relative p-6 rounded-lg border-2 transition-all ${
                          (editCliente.tipoPessoa ||
                            selectedCliente.tipoPessoa) === "PESSOA_FISICA"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {(editCliente.tipoPessoa ||
                          selectedCliente.tipoPessoa) === "PESSOA_FISICA" && (
                          <div className="absolute top-3 right-3">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-3">
                          <User
                            className={`w-8 h-8 ${
                              (editCliente.tipoPessoa ||
                                selectedCliente.tipoPessoa) === "PESSOA_FISICA"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="text-center">
                            <p className="font-semibold">Pessoa Física</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              CPF
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Nome Fantasia - Apenas para Pessoa Jurídica (PRIMEIRO) - Obrigatório conforme GUIA_FRONTEND_NOME_FANTASIA_RAZAO_SOCIAL.md */}
                  {(editCliente.tipoPessoa || selectedCliente.tipoPessoa) ===
                    "PESSOA_JURIDICA" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Nome Fantasia <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Nome fantasia da empresa"
                        value={
                          (editCliente.nome_fantasia !== undefined
                            ? editCliente.nome_fantasia
                            : selectedCliente.nome_fantasia) || ""
                        }
                        onChange={(e) =>
                          setEditCliente({
                            ...editCliente,
                            nome_fantasia: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  {/* Nome / Razão Social (SEGUNDO) - Para PJ: Razão Social opcional; para PF: Nome obrigatório */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {(editCliente.tipoPessoa ||
                        selectedCliente.tipoPessoa) === "PESSOA_JURIDICA" ? (
                        <>Razão Social <span className="text-xs text-muted-foreground">(opcional)</span></>
                      ) : (
                        <>Nome <span className="text-destructive">*</span></>
                      )}
                    </Label>
                    <Input
                      placeholder={
                        (editCliente.tipoPessoa ||
                          selectedCliente.tipoPessoa) === "PESSOA_JURIDICA"
                          ? "Razão Social da Empresa"
                          : "Nome do cliente"
                      }
                      value={
                        (editCliente.tipoPessoa ||
                          selectedCliente.tipoPessoa) === "PESSOA_JURIDICA"
                          ? (editCliente.nome_razao !== undefined
                            ? editCliente.nome_razao
                            : selectedCliente.nome_razao ?? "")
                          : (editCliente.nome !== undefined
                            ? editCliente.nome
                            : selectedCliente.nome) || ""
                      }
                      onChange={(e) => {
                        const tipo =
                          editCliente.tipoPessoa ||
                          selectedCliente.tipoPessoa;
                        if (tipo === "PESSOA_JURIDICA") {
                          // Para Pessoa Jurídica, o campo "Razão Social" deve ser enviado como nome_razao
                          // NÃO enviar campo nome para Pessoa Jurídica
                          setEditCliente({
                            ...editCliente,
                            nome_razao: e.target.value, // Campo principal que será enviado ao backend
                          });
                        } else {
                          // Para Pessoa Física, usar apenas nome
                          setEditCliente({
                            ...editCliente,
                            nome: e.target.value,
                          });
                        }
                      }}
                    />
                  </div>

                  {/* CPF/CNPJ - Opcional conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      {(editCliente.tipoPessoa ||
                        selectedCliente.tipoPessoa) === "PESSOA_FISICA"
                        ? "CPF"
                        : "CNPJ"}
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      placeholder={
                        (editCliente.tipoPessoa ||
                          selectedCliente.tipoPessoa) === "PESSOA_FISICA"
                          ? "000.000.000-00"
                          : "00.000.000/0000-00"
                      }
                      value={
                        (editCliente.cpf_cnpj !== undefined
                          ? editCliente.cpf_cnpj
                          : selectedCliente.cpf_cnpj) || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        const cleaned = cleanDocument(value);
                        const tipo =
                          editCliente.tipoPessoa ||
                          selectedCliente.tipoPessoa;
                        const maxLength = tipo === "PESSOA_FISICA" ? 11 : 14;
                        const limited = cleaned.slice(0, maxLength);
                        let formatted = limited;
                        if (tipo === "PESSOA_FISICA" && limited.length === 11) {
                          formatted = formatCPF(limited);
                        } else if (
                          tipo === "PESSOA_JURIDICA" &&
                          limited.length === 14
                        ) {
                          formatted = formatCNPJ(limited);
                        } else if (limited.length > 0) {
                          if (tipo === "PESSOA_FISICA") {
                            formatted = limited
                              .replace(
                                /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
                                "$1.$2.$3-$4"
                              )
                              .replace(/^(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3")
                              .replace(/^(\d{3})(\d{3})$/, "$1.$2")
                              .replace(/^(\d{3})$/, "$1");
                          } else {
                            formatted = limited
                              .replace(
                                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                                "$1.$2.$3/$4-$5"
                              )
                              .replace(
                                /^(\d{2})(\d{3})(\d{3})(\d{4})$/,
                                "$1.$2.$3/$4"
                              )
                              .replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3")
                              .replace(/^(\d{2})(\d{3})$/, "$1.$2")
                              .replace(/^(\d{2})$/, "$1");
                          }
                        }
                        // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: CPF é opcional
                        // Se o campo estiver vazio, usar string vazia para o input (não null)
                        // Mas será convertido para null no payload antes de enviar
                        setEditCliente({
                          ...editCliente,
                          cpf_cnpj: formatted || "",
                        });
                      }}
                    />
                    {/* Mensagem de validação em tempo real - apenas tamanho */}
                    {(editCliente.tipoPessoa ||
                      selectedCliente.tipoPessoa) === "PESSOA_JURIDICA" &&
                      cleanDocument(
                        editCliente.cpf_cnpj ||
                          selectedCliente.cpf_cnpj ||
                          ""
                      ).length > 0 &&
                      cleanDocument(
                        editCliente.cpf_cnpj ||
                          selectedCliente.cpf_cnpj ||
                          ""
                      ).length !== 14 && (
                        <p className="text-xs text-destructive mt-1">
                          CNPJ deve ter 14 dígitos.
                        </p>
                      )}
                      {(editCliente.tipoPessoa ||
                      selectedCliente.tipoPessoa) === "PESSOA_FISICA" &&
                      cleanDocument(
                        editCliente.cpf_cnpj ||
                          selectedCliente.cpf_cnpj ||
                          ""
                      ).length > 0 &&
                      cleanDocument(
                        editCliente.cpf_cnpj ||
                          selectedCliente.cpf_cnpj ||
                          ""
                      ).length !== 11 && (
                        <p className="text-xs text-destructive mt-1">
                          CPF deve ter 11 dígitos.
                        </p>
                      )}
                  </div>

                  {/* Inscrição Estadual - Opcional (PJ e PF / produtor rural) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      Inscrição Estadual (IE)
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="000.000.000.000"
                      value={
                        (editCliente.inscricao_estadual ||
                          selectedCliente.inscricao_estadual) || ""
                      }
                      onChange={(e) =>
                        setEditCliente({
                          ...editCliente,
                          inscricao_estadual: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Limite de Crédito (opcional) - Mesmo design da seção de criar */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      Limite de Crédito
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">R$</span>
                        <Input
                          placeholder="0,00"
                          value={editLimiteCreditoInput}
                          className="pl-9 h-11 text-base font-medium border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          onChange={(e) => {
                            const value = e.target.value;
                            const apenasNumeros = value.replace(/\D/g, "");
                            if (apenasNumeros === "") {
                              setEditLimiteCreditoInput("");
                              setEditCliente({ ...editCliente, limite_credito: null });
                              return;
                            }
                            const valorEmCentavos = parseInt(apenasNumeros, 10);
                            const valorDecimal = Math.min(valorEmCentavos / 100, 999999999.99);
                            setEditCliente({ ...editCliente, limite_credito: valorDecimal });
                            setEditLimiteCreditoInput(
                              new Intl.NumberFormat("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(valorDecimal)
                            );
                          }}
                          onBlur={() => {
                            const val = editCliente.limite_credito;
                            if (val != null && !isNaN(val) && val >= 0) {
                              setEditLimiteCreditoInput(
                                new Intl.NumberFormat("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(val)
                              );
                            } else {
                              setEditLimiteCreditoInput("");
                            }
                          }}
                          onFocus={() => {
                            if (
                              editCliente.limite_credito != null &&
                              !isNaN(editCliente.limite_credito) &&
                              editCliente.limite_credito >= 0
                            ) {
                              setEditLimiteCreditoInput(
                                new Intl.NumberFormat("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(editCliente.limite_credito)
                              );
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Valor máximo de crédito para este cliente. Deixe em branco para sem limite.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Seção: Endereços */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MapPinIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Endereços</h3>
                      <p className="text-sm text-muted-foreground">
                        Localizações do cliente
                      </p>
                    </div>
                  </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditEnderecos([
                          ...editEnderecos,
                          {
                            cep: "",
                            logradouro: "",
                            numero: "",
                            complemento: "",
                            bairro: "",
                            cidade: "",
                            estado: "",
                            referencia: "",
                            codigo_ibge: "",
                          },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Endereço
                    </Button>
                  </div>

                  {editEnderecos.map((endereco, index) => (
                    <div
                      key={index}
                      className="space-y-4 p-4 border rounded-lg bg-background"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-sm font-semibold">
                            Endereço {index + 1}
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Se tem ID, marcar para deletar do backend
                            if (endereco.id) {
                              setEnderecoParaDeletar({ index, endereco });
                            } else {
                              // Se não tem ID, apenas remover do array
                              setEditEnderecos(
                                editEnderecos.filter((_, i) => i !== index)
                              );
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>CEP</Label>
                          <CepInputWithLookup
                            value={endereco.cep || ""}
                            onChange={(cep) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].cep = cep;
                              setEditEnderecos(newEnderecos);
                            }}
                            onAddressFound={(dados) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index] = {
                                ...newEnderecos[index],
                                cep: formatCEP(dados.cep),
                                logradouro: dados.logradouro || newEnderecos[index].logradouro,
                                complemento: dados.complemento || newEnderecos[index].complemento,
                                bairro: dados.bairro || newEnderecos[index].bairro,
                                cidade: dados.cidade,
                                estado: dados.estado,
                                codigo_ibge: dados.codigoIbge || newEnderecos[index].codigo_ibge,
                              };
                              setEditEnderecos(newEnderecos);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Logradouro</Label>
                          <Input
                            placeholder="Rua, Avenida, etc."
                            value={endereco.logradouro || ""}
                            onChange={(e) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].logradouro = e.target.value;
                              setEditEnderecos(newEnderecos);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Número</Label>
                          <Input
                            placeholder="123"
                            value={endereco.numero || ""}
                            onChange={(e) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].numero = e.target.value;
                              setEditEnderecos(newEnderecos);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Complemento</Label>
                          <Input
                            placeholder="Apto, Sala, etc."
                            value={endereco.complemento || ""}
                            onChange={(e) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].complemento = e.target.value;
                              setEditEnderecos(newEnderecos);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bairro</Label>
                          <Input
                            placeholder="Nome do bairro"
                            value={endereco.bairro || ""}
                            onChange={(e) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].bairro = e.target.value;
                              setEditEnderecos(newEnderecos);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cidade</Label>
                          <Input
                            placeholder="Nome da cidade"
                            value={endereco.cidade || ""}
                            onChange={(e) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].cidade = e.target.value;
                              setEditEnderecos(newEnderecos);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Estado (UF)</Label>
                          <Input
                            placeholder="SP"
                            maxLength={2}
                            value={endereco.estado || ""}
                            onChange={(e) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].estado =
                                e.target.value.toUpperCase();
                              setEditEnderecos(newEnderecos);
                            }}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Referência</Label>
                          <Input
                            placeholder="Ponto de referência (máx. 100 caracteres)"
                            value={endereco.referencia || ""}
                            onChange={(e) => {
                              const newEnderecos = [...editEnderecos];
                              newEnderecos[index].referencia = e.target.value;
                              setEditEnderecos(newEnderecos);
                            }}
                            maxLength={100}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Seção: Contatos */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <PhoneIcon className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Contatos</h3>
                      <p className="text-sm text-muted-foreground">
                        Informações de contato do cliente
                      </p>
                    </div>
                  </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditContatos([
                          ...editContatos,
                          {
                            telefone: "",
                            email: "",
                            nomeContato: "",
                            outroTelefone: "",
                            nomeOutroTelefone: "",
                            observacao: "",
                          },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Contato
                    </Button>
                  </div>

                  {editContatos.map((contato, index) => (
                    <div
                      key={index}
                      className="space-y-4 p-4 border rounded-lg bg-background"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-sm font-semibold">
                            Contato {index + 1}
                          </Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`ativo-${index}`}
                            className="text-sm font-medium"
                          >
                              Ativo
                            </Label>
                            <Switch
                              id={`ativo-${index}`}
                            checked={
                              contato.ativo !== undefined ? contato.ativo : true
                            }
                              onCheckedChange={(checked) => {
                                const newContatos = [...editContatos];
                                newContatos[index].ativo = checked;
                                setEditContatos(newContatos);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Se tem ID, marcar para deletar do backend
                              if (contato.id) {
                                setContatoParaDeletar({ index, contato });
                              } else {
                                // Se não tem ID, apenas remover do array
                                setEditContatos(
                                  editContatos.filter((_, i) => i !== index)
                                );
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                              Telefone
                            </Label>
                            <Input
                              placeholder="(00) 00000-0000"
                              value={contato.telefone || ""}
                              onChange={(e) => {
                                const formatted = formatTelefone(e.target.value);
                                const newContatos = [...editContatos];
                                newContatos[index].telefone = formatted;
                                setEditContatos(newContatos);
                              }}
                              maxLength={15}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <MailIcon className="w-4 h-4 text-muted-foreground" />
                              E-mail
                            </Label>
                            <Input
                              type="email"
                              placeholder="exemplo@email.com"
                              value={contato.email || ""}
                              onChange={(e) => {
                                const newContatos = [...editContatos];
                                newContatos[index].email = e.target.value;
                                setEditContatos(newContatos);
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                            Nome do Contato
                          </Label>
                          <Input
                            placeholder="Nome do responsável"
                            value={contato.nomeContato || ""}
                            onChange={(e) => {
                              const newContatos = [...editContatos];
                              newContatos[index].nomeContato = e.target.value;
                              setEditContatos(newContatos);
                            }}
                          />
                        </div>
                      {editEnderecos.length > 1 && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                          <Label>Nome do Outro Telefone</Label>
                            <Input
                            placeholder="Nome do responsável"
                            value={contato.nomeOutroTelefone || ""}
                              onChange={(e) => {
                                const newContatos = [...editContatos];
                              newContatos[index].nomeOutroTelefone =
                                  e.target.value;
                                setEditContatos(newContatos);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                          <Label>Outro Telefone</Label>
                            <Input
                            placeholder="(00) 00000-0000"
                            value={contato.outroTelefone || ""}
                              onChange={(e) => {
                                const formatted = formatTelefone(e.target.value);
                                const newContatos = [...editContatos];
                                newContatos[index].outroTelefone = formatted;
                                setEditContatos(newContatos);
                              }}
                              maxLength={15}
                            />
                          </div>
                        </div>
                      )}
                        <div className="space-y-2">
                          <Label>Observação</Label>
                          <Input
                            placeholder="Observações sobre o contato (máx. 500 caracteres)"
                            value={contato.observacao || ""}
                            onChange={(e) => {
                              const newContatos = [...editContatos];
                              newContatos[index].observacao = e.target.value;
                              setEditContatos(newContatos);
                            }}
                            maxLength={500}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedClienteId(null);
                    setEditCurrentStep(1);
                  }}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpar Formulário
                </Button>
                    <Button
                      type="button"
                      variant="gradient"
                      onClick={async () => {
                        if (!selectedClienteId || !clienteOriginal) return;
                        
                        // Conforme GUIA_FRONTEND_NOME_FANTASIA_RAZAO_SOCIAL.md: PJ exige Nome Fantasia
                        const tipoPessoa = editCliente.tipoPessoa ?? clienteOriginal.tipoPessoa;
                        if (tipoPessoa === "PESSOA_JURIDICA") {
                          const nomeFantasiaAtual = (editCliente.nome_fantasia !== undefined ? editCliente.nome_fantasia : clienteOriginal.nome_fantasia) ?? "";
                          if (!nomeFantasiaAtual || nomeFantasiaAtual.trim() === "") {
                            toast.error("Nome Fantasia é obrigatório para Pessoa Jurídica.");
                            return;
                          }
                        }
                        
                        setIsSavingCliente(true);
                        // Declarar variáveis fora do try para uso no catch
                        let formState: any = null;
                        let camposAlterados: string[] = [];
                        
                        try {
                          // Conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
                          // Usar método atualizarParcial que implementa a lógica completa do guia
                          
                          // Debug: verificar dados antes de preparar
                          if (import.meta.env.DEV) {
                            console.log('[Salvar Cliente] Dados do formulário:', {
                              editEnderecos: editEnderecos,
                              editEnderecosCount: editEnderecos.length,
                              enderecosNovos: editEnderecos.filter(e => !e.id).length,
                              enderecosExistentes: editEnderecos.filter(e => e.id).length,
                              clienteOriginalEnderecos: clienteOriginal.enderecos?.length || 0
                            });
                          }

                          // Preparar dados do formulário para o formato esperado
                          const dadosEditados = {
                            nome: editCliente.nome,
                            nome_fantasia: editCliente.nome_fantasia,
                            nome_razao: editCliente.nome_razao,
                            tipoPessoa: editCliente.tipoPessoa,
                            cpf_cnpj: editCliente.cpf_cnpj,
                            inscricao_estadual: editCliente.inscricao_estadual,
                            limite_credito: editCliente.limite_credito,
                            enderecos: editEnderecos, // Sempre enviar array se houver endereços
                            contatos: editContatos,
                          };

                          // Converter para ClienteFormState e identificar campos alterados
                          const resultado = prepararAtualizacaoCliente(
                            clienteOriginal,
                            dadosEditados
                          );
                          formState = resultado.formState;
                          camposAlterados = resultado.camposAlterados;

                          // Debug: log do que será enviado
                          if (import.meta.env.DEV) {
                            console.log('[Salvar Cliente] Dados preparados:', {
                              camposAlterados,
                              enderecosCount: formState.enderecos.length,
                              enderecos: formState.enderecos,
                              contatosCount: formState.contatos.length,
                              contatos: formState.contatos
                            });
                          }

                          // Validar que temos um ID válido
                          if (!selectedClienteId) {
                            throw new Error('ID do cliente não encontrado');
                          }

                          // Debug: log completo antes de enviar
                          if (import.meta.env.DEV) {
                            console.log('[Salvar Cliente] Antes de enviar:', {
                              clienteId: selectedClienteId,
                              camposAlterados,
                              formState: {
                                ...formState,
                                enderecos: formState.enderecos.map(e => ({
                                  id: e.id,
                                  isNew: e.isNew,
                                  cep: e.cep,
                                  logradouro: e.logradouro,
                                  cidade: e.cidade,
                                  estado: e.estado
                                }))
                              }
                            });
                          }

                          // Atualizar usando o método parcial conforme o guia
                          const clienteAtualizado = await clientesService.atualizarParcial(
                            selectedClienteId,
                            formState,
                            camposAlterados
                          );

                          // Debug: verificar resposta do backend
                          if (import.meta.env.DEV) {
                            console.log('[Salvar Cliente] Resposta do backend:', {
                              cliente: clienteAtualizado,
                              enderecos: clienteAtualizado.enderecos,
                              contatos: clienteAtualizado.contato
                            });
                          }

                          // Atualizar cache da lista com o cliente retornado pelo PATCH (ex.: limite_credito: null)
                          // para que, ao reabrir a edição, o valor removido não "volte"
                          queryClient.setQueriesData<{ clientes: typeof clienteAtualizado[]; total: number }>(
                            { queryKey: ["clientes"], exact: false },
                            (old) => {
                              if (!old?.clientes?.length) return old;
                              return {
                                ...old,
                                clientes: old.clientes.map((c) =>
                                  c.id === clienteAtualizado.id ? clienteAtualizado : c
                                ),
                              };
                            }
                          );

                          await queryClient.invalidateQueries({ 
                            queryKey: ["clientes"],
                            exact: false,
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["cliente", selectedClienteId],
                          });
                          await queryClient.refetchQueries({ 
                            queryKey: ["clientes"],
                            exact: false,
                          });
                          
                          toast.success("Cliente atualizado com sucesso!");
                          setEditDialogOpen(false);
                          setSelectedClienteId(null);
                        } catch (error: any) {
                          // Log detalhado do erro
                          console.error('[Salvar Cliente] Erro completo:', {
                            error,
                            response: error?.response,
                            status: error?.response?.status,
                            statusText: error?.response?.statusText,
                            data: error?.response?.data,
                            message: error?.message,
                            clienteId: selectedClienteId,
                            payloadEnviado: {
                              camposAlterados,
                              enderecosCount: formState.enderecos.length,
                              enderecosNovos: formState.enderecos.filter(e => !e.id).length,
                              enderecosExistentes: formState.enderecos.filter(e => e.id).length
                            }
                          });
                          
                          // Usar mensagem do erro tratado ou mensagem específica do backend
                          let errorMessage = error?.message;
                          
                          // Se o erro tem response, tentar extrair mensagem específica
                          if (error?.response?.data) {
                            const backendMessage = error.response.data.message || error.response.data.error;
                            if (backendMessage) {
                              errorMessage = Array.isArray(backendMessage) 
                                ? backendMessage.join(", ")
                                : backendMessage;
                            }
                          }
                          
                          // Se não tem mensagem específica, usar mensagem padrão
                          if (!errorMessage || errorMessage === 'Error') {
                            errorMessage = "Erro ao atualizar cliente. Verifique os dados e tente novamente.";
                          }
                          
                          toast.error(errorMessage);
                        } finally {
                          setIsSavingCliente(false);
                        }
                      }}
                      disabled={isSavingCliente}
                      className="flex-1"
                    >
                      {isSavingCliente ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Cliente
                        </>
                      )}
                    </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Cliente não encontrado
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setSelectedClienteId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Deseja realmente excluir este cliente?
            </p>
            {selectedCliente && (
              <p className="mt-2 font-medium">{selectedCliente.nome}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedClienteId(null);
              }}
              className="flex-1"
              disabled={deleteClienteMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteClienteMutation.isPending}
              className="flex-1"
            >
              {deleteClienteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Endereço */}
      <Dialog
        open={editEnderecoDialogOpen}
        onOpenChange={setEditEnderecoDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Endereço</DialogTitle>
            <DialogDescription>
              Atualize as informações do endereço
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cep">CEP</Label>
                <CepInputWithLookup
                  id="edit-cep"
                  value={editingEndereco.cep || ""}
                  onChange={(cep) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      cep,
                    })
                  }
                  onAddressFound={(dados) =>
                    setEditingEndereco((prev) => ({
                      ...prev,
                      cep: formatCEP(dados.cep),
                      logradouro: dados.logradouro || prev.logradouro,
                      complemento: dados.complemento || prev.complemento,
                      bairro: dados.bairro || prev.bairro,
                      cidade: dados.cidade,
                      estado: dados.estado,
                      codigo_ibge: dados.codigoIbge || prev.codigo_ibge,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logradouro">Logradouro</Label>
                <Input
                  id="edit-logradouro"
                  value={editingEndereco.logradouro || ""}
                  onChange={(e) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      logradouro: e.target.value,
                    })
                  }
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-numero">Número</Label>
                <Input
                  id="edit-numero"
                  value={editingEndereco.numero || ""}
                  onChange={(e) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      numero: e.target.value,
                    })
                  }
                  placeholder="123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-complemento">Complemento</Label>
                <Input
                  id="edit-complemento"
                  value={editingEndereco.complemento || ""}
                  onChange={(e) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      complemento: e.target.value,
                    })
                  }
                  placeholder="Apto, Bloco, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bairro">Bairro</Label>
                <Input
                  id="edit-bairro"
                  value={editingEndereco.bairro || ""}
                  onChange={(e) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      bairro: e.target.value,
                    })
                  }
                  placeholder="Bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cidade">Cidade</Label>
                <Input
                  id="edit-cidade"
                  value={editingEndereco.cidade || ""}
                  onChange={(e) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      cidade: e.target.value,
                    })
                  }
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-estado">Estado (UF)</Label>
                <Input
                  id="edit-estado"
                  value={editingEndereco.estado || ""}
                  onChange={(e) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      estado: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="PE"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-referencia">Referência</Label>
                <Input
                  id="edit-referencia"
                  value={editingEndereco.referencia || ""}
                  onChange={(e) =>
                    setEditingEndereco({
                      ...editingEndereco,
                      referencia: e.target.value,
                    })
                  }
                  placeholder="Ponto de referência"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditEnderecoDialogOpen(false);
                  setSelectedEnderecoId(null);
                  setEditingEndereco({});
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (selectedEnderecoId) {
                    // ⚠️ IMPORTANTE: clienteId é obrigatório para validação de segurança
                    // O backend valida que o endereço pertence ao cliente
                    if (!selectedClienteId) {
                      toast.error(
                        "Erro: ID do cliente não encontrado. Recarregue a página e tente novamente."
                      );
                      return;
                    }

                    if (import.meta.env.DEV) {
                      console.log("📤 [Editar Endereço] Dados:", {
                        enderecoId: selectedEnderecoId,
                        clienteId: selectedClienteId,
                        dados: editingEndereco,
                      });
                    }

                    updateEnderecoMutation.mutate({
                      id: selectedEnderecoId,
                      data: editingEndereco,
                      clienteId: selectedClienteId, // Sempre passar clienteId
                    });
                  } else {
                    toast.error("ID do endereço não encontrado");
                  }
                }}
                disabled={updateEnderecoMutation.isPending}
              >
                {updateEnderecoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Contato */}
      <Dialog
        open={editContatoDialogOpen}
        onOpenChange={setEditContatoDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Atualize as informações do contato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contato-nome">Nome do Contato</Label>
                <Input
                  id="edit-contato-nome"
                  value={editingContato.nomeContato ?? ""}
                  onChange={(e) =>
                    setEditingContato({
                      ...editingContato,
                      nomeContato: e.target.value,
                    })
                  }
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contato-telefone">
                  Telefone <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="edit-contato-telefone"
                  value={editingContato.telefone ?? ""}
                  onChange={(e) => {
                    const formatted = formatTelefone(e.target.value);
                    setEditingContato({
                      ...editingContato,
                      telefone: formatted,
                    });
                  }}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contato-email">E-mail</Label>
                <Input
                  id="edit-contato-email"
                  type="email"
                  value={editingContato.email ?? ""}
                  onChange={(e) =>
                    setEditingContato({
                      ...editingContato,
                      email: e.target.value,
                    })
                  }
                  placeholder="email@exemplo.com"
                />
              </div>
              {(selectedCliente?.enderecos?.length ?? 0) > 1 && (
                <>
              <div className="space-y-2">
                <Label htmlFor="edit-contato-outro-telefone">
                  Outro Telefone
                </Label>
                <Input
                  id="edit-contato-outro-telefone"
                  value={editingContato.outroTelefone ?? ""}
                  onChange={(e) => {
                    const formatted = formatTelefone(e.target.value);
                    setEditingContato({
                      ...editingContato,
                      outroTelefone: formatted,
                    });
                  }}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contato-nome-outro-telefone">
                  Nome do Outro Telefone
                </Label>
                <Input
                  id="edit-contato-nome-outro-telefone"
                  value={editingContato.nomeOutroTelefone ?? ""}
                  onChange={(e) =>
                    setEditingContato({
                      ...editingContato,
                      nomeOutroTelefone: e.target.value,
                    })
                  }
                  placeholder="Nome"
                />
              </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-contato-ativo">Status</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-contato-ativo"
                    checked={editingContato.ativo !== false}
                    onChange={(e) =>
                      setEditingContato({
                        ...editingContato,
                        ativo: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <Label
                    htmlFor="edit-contato-ativo"
                    className="cursor-pointer"
                  >
                    Ativo
                  </Label>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-contato-observacao">Observação</Label>
                <Input
                  id="edit-contato-observacao"
                  value={editingContato.observacao ?? ""}
                  onChange={(e) =>
                    setEditingContato({
                      ...editingContato,
                      observacao: e.target.value,
                    })
                  }
                  placeholder="Observações sobre o contato"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditContatoDialogOpen(false);
                  setSelectedContatoId(null);
                  setEditingContato({});
                  setOriginalContato(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  if (selectedContatoId) {
                    if (import.meta.env.DEV) {
                      console.log("🔄 Iniciando atualização de contato:", {
                        id: selectedContatoId,
                        dadosEditados: editingContato,
                        dadosOriginais: originalContato,
                      });
                    }
                    updateContatoMutation.mutate({
                      id: selectedContatoId,
                      data: editingContato,
                    });
                  } else {
                    toast.error("ID do contato não encontrado");
                  }
                }}
                disabled={updateContatoMutation.isPending}
              >
                {updateContatoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação para deletar endereço */}
      <AlertDialog open={enderecoParaDeletar !== null} onOpenChange={(open) => {
        if (!open) {
          setEnderecoParaDeletar(null);
        }
      }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-transparent" />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
            {enderecoParaDeletar?.endereco?.logradouro && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <strong>Endereço:</strong> {enderecoParaDeletar.endereco.logradouro}
                {enderecoParaDeletar.endereco.numero && `, ${enderecoParaDeletar.endereco.numero}`}
                {enderecoParaDeletar.endereco.bairro && ` - ${enderecoParaDeletar.endereco.bairro}`}
                {enderecoParaDeletar.endereco.cidade && `, ${enderecoParaDeletar.endereco.cidade}`}
                {enderecoParaDeletar.endereco.estado && `-${enderecoParaDeletar.endereco.estado}`}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!enderecoParaDeletar) return;
                
                const { index, endereco } = enderecoParaDeletar;
                
                // Se o endereço já existe no backend (tem ID), verificar se realmente existe
                if (endereco.id && selectedClienteId && clienteOriginal) {
                  // Verificar se o ID realmente existe nos endereços originais
                  const idExiste = clienteOriginal.enderecos?.some(
                    e => e.id && Number(e.id) === Number(endereco.id)
                  );
                  
                  if (idExiste) {
                    // ID existe, tentar deletar via endpoint
                    try {
                      await removerEnderecoMutation.mutateAsync({
                        clienteId: selectedClienteId,
                        enderecoId: Number(endereco.id)
                      });
                      // Se chegou aqui, a deleção foi bem-sucedida
                      // O onSuccess da mutation já atualiza os dados
                    } catch (error: any) {
                      // IMPORTANTE: Prevenir que erros tratáveis causem logout
                      // Capturar e tratar TODOS os erros aqui para evitar propagação
                      
                      const status = error?.response?.status;
                      const errorMessage = error?.response?.data?.message || error?.message;
                      
                      // Se for 404, o endereço já não existe - apenas remover do estado local
                      if (status === 404) {
                        console.warn('[Remover Endereço] Endereço já não existe no backend, removendo apenas do estado local');
                        setEditEnderecos(
                          editEnderecos.filter((_, i) => i !== index)
                        );
                        toast.success("Endereço removido");
                        setEnderecoParaDeletar(null);
                        return; // Sair aqui para não continuar
                      }
                      
                      // Se for 403, é erro de permissão/validação - NÃO fazer logout
                      if (status === 403) {
                        const msg = errorMessage || "Você não tem permissão para remover este endereço ou o endereço não pertence a este cliente";
                        toast.error(msg);
                        setEnderecoParaDeletar(null);
                        return; // Sair aqui - erro tratado, não propagar
                      }
                      
                      // Se for 401, o interceptor já tratou (logout)
                      // Mas ainda assim, tratar aqui para não propagar
                      if (status === 401) {
                        console.error('[Remover Endereço] Erro de autenticação (401) - logout já foi feito pelo interceptor');
                        setEnderecoParaDeletar(null);
                        return; // Sair aqui - logout já foi feito
                      }
                      
                      // Para outros erros, mostrar mensagem e fechar diálogo
                      console.error('[Remover Endereço] Erro não tratado:', error);
                      toast.error(errorMessage || "Erro ao remover endereço");
                      setEnderecoParaDeletar(null);
                      // Não propagar o erro - já foi tratado
                    }
                  } else {
                    // ID não existe nos originais, apenas remover do estado local
                    console.warn('[Remover Endereço] ID não encontrado nos endereços originais, removendo apenas do estado local');
                    setEditEnderecos(
                      editEnderecos.filter((_, i) => i !== index)
                    );
                    toast.success("Endereço removido");
                  }
                } else {
                  // Se é um endereço novo (sem ID), apenas remover do estado local
                  setEditEnderecos(
                    editEnderecos.filter((_, i) => i !== index)
                  );
                  toast.success("Endereço removido");
                }
                
                // Fechar diálogo
                setEnderecoParaDeletar(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removerEnderecoMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* Diálogo de confirmação para deletar contato */}
      <AlertDialog open={contatoParaDeletar !== null} onOpenChange={(open) => {
        if (!open) {
          setContatoParaDeletar(null);
        }
      }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-transparent" />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
            {contatoParaDeletar?.contato?.telefone && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <strong>Contato:</strong> {contatoParaDeletar.contato.telefone}
                {contatoParaDeletar.contato.nomeContato && ` - ${contatoParaDeletar.contato.nomeContato}`}
                {contatoParaDeletar.contato.email && ` (${contatoParaDeletar.contato.email})`}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!contatoParaDeletar) return;
                
                const { index, contato } = contatoParaDeletar;
                
                // Se o contato já existe no backend (tem ID), verificar se realmente existe
                if (contato.id && selectedClienteId && clienteOriginal) {
                  // Verificar se o ID realmente existe nos contatos originais
                  const idExiste = clienteOriginal.contato?.some(
                    c => c.id && Number(c.id) === Number(contato.id)
                  );
                  
                  if (idExiste) {
                    // ID existe, tentar deletar via endpoint
                    try {
                      await removerContatoMutation.mutateAsync({
                        clienteId: selectedClienteId,
                        contatoId: Number(contato.id)
                      });
                      // Se chegou aqui, a deleção foi bem-sucedida
                      // O onSuccess da mutation já atualiza os dados
                    } catch (error: any) {
                      // IMPORTANTE: Prevenir que erros tratáveis causem logout
                      // Se for 404, o contato já não existe - apenas remover do estado local
                      if (error?.response?.status === 404) {
                        console.warn('[Remover Contato] Contato já não existe no backend, removendo apenas do estado local');
                        setEditContatos(
                          editContatos.filter((_, i) => i !== index)
                        );
                        toast.success("Contato removido");
                        setContatoParaDeletar(null);
                        return; // Sair aqui para não continuar
                      }
                      
                      // Se for 403, é erro de permissão/validação - NÃO fazer logout
                      if (error?.response?.status === 403) {
                        const msg = error?.response?.data?.message || 
                          "Você não tem permissão para remover este contato ou o contato não pertence a este cliente";
                        toast.error(msg);
                        setContatoParaDeletar(null);
                        return; // Sair aqui - erro tratado, não propagar
                      }
                      
                      // Se for 401, o interceptor já tratou (logout)
                      // Mas ainda assim, tratar aqui para não propagar
                      if (error?.response?.status === 401) {
                        console.error('[Remover Contato] Erro de autenticação (401) - logout já foi feito pelo interceptor');
                        setContatoParaDeletar(null);
                        return; // Sair aqui - logout já foi feito
                      }
                      
                      // Para outros erros, mostrar mensagem e fechar diálogo
                      console.error('[Remover Contato] Erro não tratado:', error);
                      toast.error(error?.response?.data?.message || error?.message || "Erro ao remover contato");
                      setContatoParaDeletar(null);
                      // Não propagar o erro - já foi tratado
                    }
                  } else {
                    // ID não existe nos originais, apenas remover do estado local
                    console.warn('[Remover Contato] ID não encontrado nos contatos originais, removendo apenas do estado local');
                    setEditContatos(
                      editContatos.filter((_, i) => i !== index)
                    );
                    toast.success("Contato removido");
                    setContatoParaDeletar(null);
                  }
                } else {
                  // Se é um contato novo (sem ID), apenas remover do estado local
                  setEditContatos(
                    editContatos.filter((_, i) => i !== index)
                  );
                  toast.success("Contato removido");
                  setContatoParaDeletar(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removerContatoMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* Overlay de Loading Global - aparece durante qualquer operação */}
      {isAnyOperationPending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-card rounded-xl p-8 shadow-2xl border border-border flex flex-col items-center gap-4 min-w-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              {isSavingCliente && "Salvando cliente..."}
              {deleteClienteMutation.isPending && "Excluindo cliente..."}
              {removerEnderecoMutation.isPending && "Removendo endereço..."}
              {removerContatoMutation.isPending && "Removendo contato..."}
              {updateEnderecoMutation.isPending && "Atualizando endereço..."}
              {updateContatoMutation.isPending && "Atualizando contato..."}
              {!isSavingCliente && 
               !deleteClienteMutation.isPending &&
               !removerEnderecoMutation.isPending &&
               !removerContatoMutation.isPending &&
               !updateEnderecoMutation.isPending &&
               !updateContatoMutation.isPending && 
               "Processando..."}
            </p>
          </div>
        </div>
      )}

      {/* Dialog de Relatórios */}
      {selectedClienteId && (
        <RelatorioClienteDialog
          isOpen={relatorioDialogOpen}
          onClose={() => {
            setRelatorioDialogOpen(false);
            setSelectedClienteId(null);
          }}
          clienteId={selectedClienteId}
          clienteNome={selectedCliente?.nome || selectedCliente?.nome_fantasia || selectedCliente?.nome_razao}
        />
      )}
    </AppLayout>
  );
};

export default Clientes;
