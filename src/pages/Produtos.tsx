import AppLayout from "@/components/layout/AppLayout";
import { TableRowActionsMenu } from "@/components/TableRowActionsMenu";
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    Categoria,
    categoriasService,
    CreateCategoriaDto,
} from "@/services/categorias.service";
import {
    estoqueService
} from "@/services/estoque.service";
import {
    Fornecedor,
    fornecedoresService,
} from "@/services/fornecedores.service";
import { CreateProdutoDto, FiltrosProdutos, Produto, produtosService } from "@/services/produtos.service";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowDownCircle,
    ArrowUpCircle,
    Calendar,
    Check,
    ChevronsUpDown,
    Circle,
    DollarSign,
    Edit,
    Eye,
    FileCheck,
    FileText,
    Filter,
    Hash,
    History,
    Info,
    LayoutGrid,
    Loader2,
    Package,
    Plus,
    RotateCcw,
    Ruler,
    Search,
    Settings,
    Trash2,
    Truck
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";


const Produtos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15); // Padrão do backend para produtos
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltrosProdutos>({
    statusProduto: "",
    unidade_medida: "",
    categoriaId: undefined,
    fornecedorId: undefined,
    nomeFornecedor: "",
    precoMin: undefined,
    precoMax: undefined,
    estoqueMin: undefined,
    estoqueMax: undefined,
    validadeInicial: "",
    validadeFinal: "",
    cadastroInicial: "",
    cadastroFinal: "",
  });
  const [categoriasDialogOpen, setCategoriasDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historicoSheetOpen, setHistoricoSheetOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [editingProduto, setEditingProduto] = useState<Partial<CreateProdutoDto> & { estoque_maximo?: number; localizacao?: string; fornecedorId?: number | null }>({
    nome: "",
    descricao: "",
    sku: "",
    preco_custo: 0,
    preco_venda: 0,
    preco_promocional: undefined,
    estoque_atual: 0,
    estoque_minimo: 0,
    estoque_maximo: undefined,
    unidade_medida: "UN",
    statusProduto: "ATIVO",
    categoriaId: undefined,
    fornecedorId: undefined,
    data_validade: undefined,
    ncm: "",
    cest: "",
    cfop: "",
    observacoes: "",
    peso: undefined,
    altura: undefined,
    largura: undefined,
    localizacao: undefined,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(
    null
  );
  const [newCategoriaNome, setNewCategoriaNome] = useState("");
  const [newCategoriaDescricao, setNewCategoriaDescricao] = useState("");
  const [deleteCategoriaDialogOpen, setDeleteCategoriaDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);

  // Buscar categorias (busca todas, não apenas ativas, para garantir que encontre as categorias dos produtos)
  const { data: categorias = [], isLoading: isLoadingCategorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      try {
        const response = await categoriasService.listar({
          limit: 100,
          // Não filtra por status para garantir que encontre todas as categorias vinculadas aos produtos
        });
        const categoriasList = Array.isArray(response) ? response : response.data || [];
        
        if (import.meta.env.DEV) {
          console.log("Categorias carregadas:", categoriasList.length, categoriasList);
        }
        
        return categoriasList;
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        return [];
      }
    },
  });

  // Buscar fornecedores
  const { data: fornecedoresData, isLoading: isLoadingFornecedores } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      try {
        // Buscar todos os fornecedores (sem filtro de status para mostrar todos)
        const response = await fornecedoresService.listar({
          limit: 500, // Limite máximo aceito pelo backend
          // Removido filtro de status para mostrar todos os fornecedores
        });
        
        // A API pode retornar em diferentes formatos
        let fornecedoresList: Fornecedor[] = [];
        
        if (Array.isArray(response)) {
          fornecedoresList = response;
        } else if (response?.data && Array.isArray(response.data)) {
          fornecedoresList = response.data;
        } else if (response?.fornecedores && Array.isArray(response.fornecedores)) {
          fornecedoresList = response.fornecedores;
        }
        
        if (import.meta.env.DEV) {
          console.log('[Produtos] Fornecedores carregados:', fornecedoresList.length, fornecedoresList);
        }
        
        return fornecedoresList;
      } catch (error) {
        // Se a API não existir ainda, retorna array vazio
        console.warn("API de fornecedores não disponível:", error);
        return [];
      }
    },
    retry: false,
  });

  const fornecedores: Fornecedor[] = Array.isArray(fornecedoresData) 
    ? fornecedoresData 
    : [];

  // Debug: log dos fornecedores carregados
  useEffect(() => {
    if (import.meta.env.DEV && fornecedores.length > 0) {
      console.log('[Produtos] Total de fornecedores disponíveis:', fornecedores.length);
      console.log('[Produtos] Fornecedores:', fornecedores);
    }
  }, [fornecedores]);

  // Verificar se há filtros ativos
  const temFiltrosAtivos = Object.values(filtrosAvancados).some(
    (val) => val !== "" && val !== undefined
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

  // Buscar produtos com paginação - usa busca avançada se houver filtros, busca simples se houver termo, senão lista todos
  const { data: produtosResponse, isLoading: isLoadingProdutos, error: errorProdutos } = useQuery({
    queryKey: ["produtos", searchTerm, filtrosAvancados, currentPage],
    queryFn: async () => {
      // Validar parâmetros antes de fazer a requisição
      if (!validarParametrosPaginação(currentPage, pageSize)) {
        throw new Error('Parâmetros de paginação inválidos');
      }

      try {
        let response;
        
        if (temFiltrosAtivos || searchTerm.trim()) {
          // Busca no backend (evita filtrar só a página atual no cliente)
          response = await produtosService.buscarAvancado({
            termo: searchTerm.trim() || undefined,
            ...filtrosAvancados,
            page: currentPage,
            limit: pageSize,
          });
        } else {
          // Lista todos quando não há termo nem filtros
          response = await produtosService.listar({
            page: currentPage,
            limit: pageSize,
          });
        }

        // Extrair produtos e total da resposta
        // Priorizar o novo formato: { data: Produto[], total, page, limit }
        let produtos: Produto[] = [];
        let total = 0;
        
        if (response?.data && Array.isArray(response.data)) {
          produtos = response.data;
          total = response.total || response.data.length;
        } else if (Array.isArray(response)) {
          produtos = response;
          total = response.length;
        } else if (response?.produtos && Array.isArray(response.produtos)) {
          produtos = response.produtos;
          total = response.total || response.produtos.length;
        }

        if (import.meta.env.DEV) {
          console.log("Produtos carregados:", produtos.length, "Total:", total);
        }
        return { produtos, total };
      } catch (error: any) {
        // Se for erro 404 ou resposta vazia, não é um erro real
        if (error?.response?.status === 404 || error?.status === 404) {
          if (import.meta.env.DEV) {
            console.log("Nenhum produto encontrado (404)");
          }
          return { produtos: [], total: 0 };
        }
        
        // Se for erro de autenticação, não retornar array vazio silenciosamente
        if (error?.response?.status === 401 || error?.status === 401) {
          if (import.meta.env.DEV) {
            console.error("Erro de autenticação ao buscar produtos");
          }
          return { produtos: [], total: 0 };
        }
        
        if (import.meta.env.DEV) {
          console.error("Erro ao buscar produtos:", error);
        }
        return { produtos: [], total: 0 };
      }
    },
    retry: (failureCount, error: any) => {
      // Não tentar novamente para erros 400, 401, 403, 404
      if (error?.response) {
        const status = error.response.status;
        if ([400, 401, 403, 404].includes(status)) {
          return false;
        }
      }
      // Tentar até 1 vez para outros erros
      return failureCount < 1;
    },
    retryDelay: 1000,
  });

  const produtos = produtosResponse?.produtos || [];
  const totalProdutos = produtosResponse?.total || 0;
  const totalPages = Math.ceil(totalProdutos / pageSize);
  const filteredProdutos = produtos;

  // Resetar página quando filtro ou busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtrosAvancados]);

  // Buscar todos os produtos para contagem precisa no modal de categorias
  // (a lista paginada 'produtos' só tem a página atual, então o count ficaria errado)
  const { data: todosProdutosParaCount = [] } = useQuery({
    queryKey: ["produtos", "todos-para-count", categoriasDialogOpen],
    queryFn: async () => {
      const response = await produtosService.listar({ page: 1, limit: 500 });
      if (response?.data && Array.isArray(response.data)) return response.data;
      if (Array.isArray(response)) return response;
      if (response?.produtos && Array.isArray(response.produtos)) return response.produtos;
      return [];
    },
    enabled: categoriasDialogOpen,
    staleTime: 30000,
  });

  // Helper: verifica se produto pertence à categoria (camelCase, snake_case ou objeto populado)
  const produtoPertenceACategoria = (p: Produto | Record<string, unknown>, categoriaId: number) => {
    const catId = (p as any).categoriaId ?? (p as any).categoria_id ?? (p as any).categoria?.id;
    return catId != null && Number(catId) === Number(categoriaId);
  };

  // Calcular contagem de produtos por categoria (usa lista completa quando modal aberto)
  const getProdutosCountByCategoria = (categoriaId: number) => {
    const listaParaContar = categoriasDialogOpen ? todosProdutosParaCount : produtos;
    return listaParaContar.filter((p) => produtoPertenceACategoria(p, categoriaId)).length;
  };

  // Função para determinar a cor do estoque baseada nas regras
  const getEstoqueColor = (estoqueAtual: number, estoqueMinimo: number): string => {
    // Vermelho (crítico): estoque_atual < estoque_minimo
    if (estoqueAtual < estoqueMinimo) {
      return "#dc2626";
    }
    
    // Laranja forte (alerta máximo): estoque_atual == estoque_minimo
    if (Math.abs(estoqueAtual - estoqueMinimo) < 0.01) {
      return "#ea580c";
    }
    
    // Amarelo (atenção): estoque_atual > estoque_minimo e estoque_atual <= estoque_minimo * 1.3
    if (estoqueAtual > estoqueMinimo && estoqueAtual <= estoqueMinimo * 1.3) {
      return "#facc15";
    }
    
    // Verde (seguro): estoque_atual > estoque_minimo * 1.3
    return "#16a34a";
  };

  // Criação de produto movida para /produtos/novo

  // Mutation para atualizar produto
  const updateProdutoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateProdutoDto> }) =>
      produtosService.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      queryClient.invalidateQueries({ queryKey: ["historico-estoque"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"], exact: false });
      setEditDialogOpen(false);
      setEditingProduto({
        nome: "",
        descricao: "",
        sku: "",
        preco_custo: 0,
        preco_venda: 0,
        preco_promocional: undefined,
        estoque_atual: 0,
        estoque_minimo: 0,
        estoque_maximo: undefined,
        unidade_medida: "UN",
        statusProduto: "ATIVO",
        categoriaId: undefined,
        fornecedorId: undefined,
        data_validade: undefined,
        ncm: "",
        cest: "",
        cfop: "",
        observacoes: "",
        peso: undefined,
        altura: undefined,
        largura: undefined,
        localizacao: undefined,
      });
      setSelectedProduto(null);
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? "Erro ao atualizar produto";
      const msgStr = typeof msg === "string" ? msg : "Erro ao atualizar produto";
      if (msgStr.toLowerCase().includes("usuário autenticado") && msgStr.toLowerCase().includes("obrigatório")) {
        toast.error("É necessário estar logado para editar estoque do produto. Faça login e tente novamente.");
      } else {
        toast.error(msgStr);
      }
    },
  });

  // Mutation para deletar produto
  const deleteProdutoMutation = useMutation({
    mutationFn: (id: number) => produtosService.deletar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      setDeleteConfirmOpen(false);
      setProdutoToDelete(null);
      toast.success("Produto excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao excluir produto");
    },
  });

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    
    // Converter data_validade para formato YYYY-MM-DD se existir
    let dataValidadeFormatada = "";
    if (produto.data_validade) {
      try {
        const data = new Date(produto.data_validade);
        if (!isNaN(data.getTime())) {
          // Formato YYYY-MM-DD para input type="date"
          const year = data.getFullYear();
          const month = String(data.getMonth() + 1).padStart(2, "0");
          const day = String(data.getDate()).padStart(2, "0");
          dataValidadeFormatada = `${year}-${month}-${day}`;
        }
      } catch (error) {
        console.error("Erro ao formatar data de validade:", error);
      }
    }
    
    setEditingProduto({
      nome: produto.nome || "",
      descricao: produto.descricao || "",
      sku: produto.sku || "",
      preco_custo: produto.preco_custo || 0,
      preco_venda: produto.preco_venda || 0,
      preco_promocional: produto.preco_promocional,
      estoque_atual: produto.estoque_atual || 0,
      estoque_minimo: produto.estoque_minimo || 0,
      estoque_maximo: produto.estoque_maximo,
      unidade_medida: produto.unidade_medida || "UN",
      statusProduto: produto.statusProduto || "ATIVO",
      categoriaId: produto.categoriaId,
      fornecedorId: produto.fornecedorId,
      data_validade: dataValidadeFormatada || undefined,
      ncm: produto.ncm || "",
      cest: produto.cest || "",
      cfop: produto.cfop || "",
      observacoes: produto.observacoes || "",
      peso: produto.peso,
      altura: produto.altura,
      largura: produto.largura,
      localizacao: produto.localizacao,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedProduto) {
      toast.error("Selecione um produto");
      return;
    }
    // Estoque não é editado aqui — só via Movimentações / pedidos
    const produtoData: Partial<CreateProdutoDto> = {
      nome: editingProduto.nome || undefined,
      sku: editingProduto.sku || undefined,
      preco_custo:
        editingProduto.preco_custo !== undefined && editingProduto.preco_custo !== null
          ? Number(editingProduto.preco_custo)
          : undefined,
      preco_venda:
        editingProduto.preco_venda !== undefined && editingProduto.preco_venda !== null
          ? Number(editingProduto.preco_venda)
          : undefined,
      unidade_medida: (editingProduto.unidade_medida as any) || "UN",
      statusProduto: (editingProduto.statusProduto as any) || "ATIVO",
      categoriaId: editingProduto.categoriaId,
      fornecedorId: editingProduto.fornecedorId === null ? null : editingProduto.fornecedorId,
    };

    // ⭐ Lógica de detecção de remoção de campos opcionais
    // Conforme GUIA_REMOÇÃO_CAMPOS_PRODUTO.md
    // Compara valores originais com valores editados para detectar remoções
    
    // Função auxiliar para normalizar valores para comparação
    const normalizeValue = (value: any): string | number | null | undefined => {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      // Para números, converter string vazia para null
      if (typeof value === "number") return value;
      return value;
    };

    // Função auxiliar para normalizar valores numéricos
    const normalizeNumericValue = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return null;
        const num = Number(trimmed);
        return isNaN(num) ? null : num;
      }
      if (typeof value === "number") return value;
      return null;
    };

    // Função auxiliar para verificar se um campo foi removido
    const wasFieldRemoved = (originalValue: any, currentValue: any): boolean => {
      const normalizedOriginal = normalizeValue(originalValue);
      const normalizedCurrent = normalizeValue(currentValue);
      // Campo tinha valor e agora está vazio/null
      return normalizedOriginal !== null && normalizedCurrent === null;
    };

    // Função auxiliar para verificar se um campo numérico foi removido
    const wasNumericFieldRemoved = (originalValue: any, currentValue: any): boolean => {
      const normalizedOriginal = normalizeNumericValue(originalValue);
      const normalizedCurrent = normalizeNumericValue(currentValue);
      // Campo tinha valor numérico e agora está vazio/null
      return normalizedOriginal !== null && normalizedCurrent === null;
    };

    // Função auxiliar para verificar se um campo foi modificado
    const wasFieldModified = (originalValue: any, currentValue: any): boolean => {
      const normalizedOriginal = normalizeValue(originalValue);
      const normalizedCurrent = normalizeValue(currentValue);
      return normalizedOriginal !== normalizedCurrent;
    };

    // Função auxiliar para verificar se um campo numérico foi modificado
    const wasNumericFieldModified = (originalValue: any, currentValue: any): boolean => {
      const normalizedOriginal = normalizeNumericValue(originalValue);
      const normalizedCurrent = normalizeNumericValue(currentValue);
      return normalizedOriginal !== normalizedCurrent;
    };

    // Campos de texto opcionais
    const textFields: Array<keyof Produto> = ['descricao', 'ncm', 'cest', 'cfop', 'observacoes'];
    textFields.forEach(field => {
      const originalValue = selectedProduto[field];
      const currentValue = editingProduto[field as keyof typeof editingProduto];
      
      if (wasFieldRemoved(originalValue, currentValue)) {
        // Campo foi removido - enviar null explicitamente
        produtoData[field as keyof CreateProdutoDto] = null as any;
      } else if (wasFieldModified(originalValue, currentValue) && currentValue) {
        // Campo foi modificado e tem novo valor
        produtoData[field as keyof CreateProdutoDto] = currentValue as any;
      }
      // Se não foi modificado, não incluir no payload
    });

    // Campo localizacao (tratamento especial com trim e limite de 255 caracteres)
    const originalLocalizacao = selectedProduto.localizacao;
    const currentLocalizacao = editingProduto.localizacao;
    if (wasFieldRemoved(originalLocalizacao, currentLocalizacao)) {
      produtoData.localizacao = null as any;
    } else if (wasFieldModified(originalLocalizacao, currentLocalizacao) && currentLocalizacao) {
      const trimmedLocalizacao = typeof currentLocalizacao === 'string' 
        ? currentLocalizacao.trim().substring(0, 255) 
        : currentLocalizacao;
      if (trimmedLocalizacao) {
        produtoData.localizacao = trimmedLocalizacao;
      }
    }

    // Campo data_validade (string especial)
    const originalDataValidade = selectedProduto.data_validade;
    const currentDataValidade = editingProduto.data_validade;
    if (wasFieldRemoved(originalDataValidade, currentDataValidade)) {
      produtoData.data_validade = null as any;
    } else if (wasFieldModified(originalDataValidade, currentDataValidade) && currentDataValidade) {
      produtoData.data_validade = currentDataValidade;
    }

    // Validação de preço promocional conforme GUIA_FRONTEND_CORRECOES_BACKEND.md
    const precoVenda = editingProduto.preco_venda || selectedProduto.preco_venda;
    const precoPromocional = editingProduto.preco_promocional;
    if (precoPromocional !== undefined && precoPromocional !== null && precoVenda && precoPromocional > precoVenda) {
      toast.error("O preço promocional não pode ser maior que o preço de venda");
      return;
    }

    // Campos numéricos opcionais (sem estoque — alterado só em Movimentações)
    const numericFields: Array<keyof Produto> = ['preco_promocional', 'peso', 'altura', 'largura'];
    numericFields.forEach(field => {
      const originalValue = selectedProduto[field];
      const currentValue = editingProduto[field as keyof typeof editingProduto];
      
      if (wasNumericFieldRemoved(originalValue, currentValue)) {
        // Campo foi removido - enviar null explicitamente
        produtoData[field as keyof CreateProdutoDto] = null as any;
      } else if (wasNumericFieldModified(originalValue, currentValue)) {
        // Campo foi modificado - verificar se tem novo valor válido
        const normalizedCurrent = normalizeNumericValue(currentValue);
        if (normalizedCurrent !== null) {
          produtoData[field as keyof CreateProdutoDto] = normalizedCurrent as any;
        }
      }
      // Se não foi modificado, não incluir no payload
    });

    if (import.meta.env.DEV) {
      console.log('[Produtos] Atualizando produto - Payload completo:', JSON.stringify(produtoData, null, 2));
      console.log('[Produtos] Valores originais:', {
        descricao: selectedProduto.descricao,
        ncm: selectedProduto.ncm,
        observacoes: selectedProduto.observacoes,
        preco_promocional: selectedProduto.preco_promocional,
        estoque_maximo: selectedProduto.estoque_maximo,
        localizacao: selectedProduto.localizacao,
      });
      console.log('[Produtos] Valores editados:', {
        descricao: editingProduto.descricao,
        ncm: editingProduto.ncm,
        observacoes: editingProduto.observacoes,
        preco_promocional: editingProduto.preco_promocional,
        estoque_maximo: editingProduto.estoque_maximo,
        localizacao: editingProduto.localizacao,
      });
    }

    updateProdutoMutation.mutate({
      id: selectedProduto.id,
      data: produtoData,
    });
  };

  const handleDelete = (id: number) => {
    setProdutoToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (produtoToDelete) {
      deleteProdutoMutation.mutate(produtoToDelete);
    }
  };

  // Mutation para atualizar status do produto
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'ATIVO' | 'INATIVO' }) => {
      return await produtosService.atualizar(id, { statusProduto: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Status do produto atualizado com sucesso!');
      setUpdatingStatusId(null);
    },
    onError: (error: any) => {
      setUpdatingStatusId(null);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao atualizar status do produto';
      toast.error(errorMessage);
    },
  });

  // Handler para atualizar status
  const handleStatusChange = (id: number, novoStatus: 'ATIVO' | 'INATIVO') => {
    setUpdatingStatusId(id);
    updateStatusMutation.mutate({ id, status: novoStatus });
  };

  // Query para buscar histórico de movimentações
  const { data: historicoData, isLoading: isLoadingHistorico } = useQuery({
    queryKey: ["historico-estoque", selectedProduto?.id],
    queryFn: async () => {
      if (!selectedProduto?.id) return null;
      return await estoqueService.obterHistorico(selectedProduto.id, {
        page: 1,
        limit: 50,
      });
    },
    enabled: !!selectedProduto?.id && historicoSheetOpen,
  });

  // Mutations para categorias
  const createCategoriaMutation = useMutation({
    mutationFn: (data: CreateCategoriaDto) => categoriasService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setNewCategoriaNome("");
      setNewCategoriaDescricao("");
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao criar categoria");
    },
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateCategoriaDto>;
    }) => categoriasService.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setEditingCategoria(null);
      setNewCategoriaNome("");
      setNewCategoriaDescricao("");
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao atualizar categoria");
    },
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: (id: number) => categoriasService.deletar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      toast.success("Categoria excluída com sucesso!");
      setDeleteCategoriaDialogOpen(false);
      setCategoriaToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao excluir categoria");
    },
  });

  const handleCreateOrUpdateCategoria = () => {
    if (!newCategoriaNome.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    
    if (editingCategoria) {
      updateCategoriaMutation.mutate({
        id: editingCategoria.id,
        data: {
          nome: newCategoriaNome,
          descricao: newCategoriaDescricao.trim() || undefined,
        },
      });
    } else {
      createCategoriaMutation.mutate({
        nome: newCategoriaNome,
        descricao: newCategoriaDescricao.trim() || undefined,
        status: "ATIVO",
      });
    }
  };

  const handleEditCategoria = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setNewCategoriaNome(categoria.nome);
    setNewCategoriaDescricao(categoria.descricao || "");
  };

  const handleDeleteCategoria = (categoria: Categoria) => {
    setCategoriaToDelete(categoria);
    setDeleteCategoriaDialogOpen(true);
  };

  const confirmDeleteCategoria = () => {
    if (categoriaToDelete) {
      deleteCategoriaMutation.mutate(categoriaToDelete.id);
    }
  };

  const handleCloseCategoriasDialog = () => {
    setCategoriasDialogOpen(false);
    setEditingCategoria(null);
    setNewCategoriaNome("");
    setNewCategoriaDescricao("");
    setDeleteCategoriaDialogOpen(false);
    setCategoriaToDelete(null);
  };

  const handleCategoriasDialogChange = (open: boolean) => {
    if (!open) {
      // Quando o dialog está sendo fechado, reseta todos os estados
      handleCloseCategoriasDialog();
    } else {
      // Quando o dialog está sendo aberto, apenas abre
      setCategoriasDialogOpen(true);
    }
  };

  const handleAplicarFiltros = () => {
    setFiltrosDialogOpen(false);
    // A query será atualizada automaticamente pelo React Query
  };

  const handleLimparFiltros = () => {
    setFiltrosAvancados({
      statusProduto: "",
      unidade_medida: "",
      categoriaId: undefined,
      fornecedorId: undefined,
      nomeFornecedor: "",
      precoMin: undefined,
      precoMax: undefined,
      estoqueMin: undefined,
      estoqueMax: undefined,
      validadeInicial: "",
      validadeFinal: "",
      cadastroInicial: "",
      cadastroFinal: "",
    });
    setFiltrosDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie seu catálogo de produtos
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setCategoriasDialogOpen(true)}
            >
              <LayoutGrid className="w-4 h-4" />
              Gerenciar Categorias
            </Button>
            <Dialog open={categoriasDialogOpen} onOpenChange={handleCategoriasDialogChange}>
              <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden bg-gradient-to-br from-card to-secondary/30">
                <div className="p-3 sm:p-4 md:p-6 min-w-0">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <div className="bg-primary p-2 rounded-lg">
                        <LayoutGrid className="w-5 h-5 text-primary-foreground" />
                      </div>
                      Gerenciar Categorias
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-muted-foreground text-sm mt-2">
                    Organize seus produtos em categorias para melhor controle
                  </p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Create new category or Edit category */}
                  {editingCategoria ? (
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border/50 border-primary/30">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 block">
                        Editar Categoria
                      </Label>
                      <div className="space-y-3">
                        <Input 
                          placeholder="Nome da categoria..."
                          value={newCategoriaNome}
                          onChange={(e) => setNewCategoriaNome(e.target.value)}
                          className="bg-card border-border/50 focus:border-primary"
                          autoFocus
                        />
                        <Input 
                          placeholder="Descrição (opcional)..."
                          value={newCategoriaDescricao}
                          onChange={(e) => setNewCategoriaDescricao(e.target.value)}
                          className="bg-card border-border/50 focus:border-primary"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateOrUpdateCategoria();
                            if (e.key === "Escape") {
                              setEditingCategoria(null);
                              setNewCategoriaNome("");
                              setNewCategoriaDescricao("");
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleCreateOrUpdateCategoria} 
                            variant="gradient" 
                            className="flex-1"
                            disabled={updateCategoriaMutation.isPending || !newCategoriaNome.trim()}
                          >
                            {updateCategoriaMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              "Salvar"
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => {
                              setEditingCategoria(null);
                              setNewCategoriaNome("");
                              setNewCategoriaDescricao("");
                            }}
                            disabled={updateCategoriaMutation.isPending}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 block">
                        Adicionar Nova Categoria
                      </Label>
                      <div className="space-y-3">
                        <Input 
                          placeholder="Nome da categoria..."
                          value={newCategoriaNome}
                          onChange={(e) => setNewCategoriaNome(e.target.value)}
                          className="bg-card border-border/50 focus:border-primary"
                        />
                        <Input 
                          placeholder="Descrição (opcional)..."
                          value={newCategoriaDescricao}
                          onChange={(e) => setNewCategoriaDescricao(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleCreateOrUpdateCategoria()}
                          className="bg-card border-border/50 focus:border-primary"
                        />
                        <Button 
                          onClick={handleCreateOrUpdateCategoria} 
                          variant="gradient" 
                          className="w-full"
                          disabled={createCategoriaMutation.isPending || !newCategoriaNome.trim()}
                        >
                          {createCategoriaMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Adicionando...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar Categoria
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Categories list */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 block">
                      Categorias Existentes ({categorias.length})
                    </Label>
                    {isLoadingCategorias ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {categorias.length === 0 ? (
                          <div className="bg-secondary/30 rounded-xl p-8 text-center">
                            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-muted-foreground text-sm">
                              Nenhuma categoria cadastrada
                            </p>
                          </div>
                        ) : (
                          categorias.map((cat, index) => (
                            <motion.div 
                              key={cat.id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`group bg-card rounded-xl border p-3 transition-all duration-200 ${
                                editingCategoria?.id === cat.id 
                                  ? "border-primary/50 shadow-lg shadow-primary/10" 
                                  : "border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                                  <Package className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{cat.nome}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {cat.descricao 
                                      ? `${cat.descricao} • ${getProdutosCountByCategoria(cat.id)} produtos vinculados`
                                      : `${getProdutosCountByCategoria(cat.id)} produtos vinculados`}
                                  </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => handleEditCategoria(cat)}
                                    disabled={!!editingCategoria && editingCategoria.id !== cat.id}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleDeleteCategoria(cat)}
                                    disabled={!!editingCategoria}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
          </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="gradient" 
              className="gap-2"
              onClick={() => navigate("/produtos/novo")}
            >
                <Plus className="w-4 h-4" />
                Criar Produto
              </Button>
          </div>
        </div>

        {/* Search and Filters */}
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
                    Object.values(filtrosAvancados).filter((v) => v !== "" && v !== undefined)
                      .length
                  }
                </span>
              )}
            </Button>
            <Sheet
              open={filtrosDialogOpen}
              onOpenChange={setFiltrosDialogOpen}
            >
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
                  {/* Status */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Status</Label>
                    <RadioGroup
                      value={filtrosAvancados.statusProduto || "none"}
                      onValueChange={(value) =>
                        setFiltrosAvancados({
                          ...filtrosAvancados,
                          statusProduto: value === "none" ? "" : value,
                        })
                      }
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
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Categoria */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Categoria</Label>
                    <Select
                      value={filtrosAvancados.categoriaId?.toString() || "none"}
                      onValueChange={(value) =>
                        setFiltrosAvancados({
                          ...filtrosAvancados,
                          categoriaId: value === "none" ? undefined : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Todas as categorias</SelectItem>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Fornecedor */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Fornecedor</Label>
                    <Select
                      value={filtrosAvancados.fornecedorId?.toString() || "none"}
                      onValueChange={(value) =>
                        setFiltrosAvancados({
                          ...filtrosAvancados,
                          fornecedorId: value === "none" ? undefined : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os fornecedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Todos os fornecedores</SelectItem>
                        {fornecedores.map((forn) => (
                          <SelectItem key={forn.id} value={forn.id.toString()}>
                            {forn.nome_fantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Unidade de Medida */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Unidade de Medida</Label>
                    <Select
                      value={filtrosAvancados.unidade_medida || "none"}
                      onValueChange={(value) =>
                        setFiltrosAvancados({
                          ...filtrosAvancados,
                          unidade_medida: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as unidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Todas as unidades</SelectItem>
                        <SelectItem value="UN">Unidade (UN)</SelectItem>
                        <SelectItem value="KG">Quilograma (KG)</SelectItem>
                        <SelectItem value="LT">Litro (LT)</SelectItem>
                        <SelectItem value="CX">Caixa (CX)</SelectItem>
                        <SelectItem value="SC">Saco (SC)</SelectItem>
                        <SelectItem value="ARROBA">Arroba (ARROBA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Preço */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      PREÇO
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preço Mínimo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={filtrosAvancados.precoMin || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              precoMin: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Máximo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={filtrosAvancados.precoMax || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              precoMax: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Estoque */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      ESTOQUE
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Estoque Mínimo</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={filtrosAvancados.estoqueMin || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              estoqueMin: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estoque Máximo</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={filtrosAvancados.estoqueMax || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              estoqueMax: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Cadastro */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      CADASTRO
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data Inicial</Label>
                        <Input
                          type="date"
                          value={filtrosAvancados.cadastroInicial || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              cadastroInicial: e.target.value || "",
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data Final</Label>
                        <Input
                          type="date"
                          value={filtrosAvancados.cadastroFinal || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              cadastroFinal: e.target.value || "",
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Validade */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      VALIDADE
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data Inicial</Label>
                        <Input
                          type="date"
                          value={filtrosAvancados.validadeInicial || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              validadeInicial: e.target.value || "",
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data Final</Label>
                        <Input
                          type="date"
                          value={filtrosAvancados.validadeFinal || ""}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              validadeFinal: e.target.value || "",
                            })
                          }
                        />
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
                placeholder="Buscar por nome ou SKU..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProdutos ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando produtos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : errorProdutos ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-destructive">
                    Erro ao carregar produtos. Tente novamente.
                  </TableCell>
                </TableRow>
              ) : filteredProdutos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-12 h-12 text-muted-foreground/50" />
                      <p>Nenhum produto encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                  filteredProdutos.map((produto) => {
                    // Primeiro tenta usar a categoria que vem no produto (se populada pela API)
                    let categoriaNome = produto.categoria?.nome;
                    
                    // Se não tiver categoria populada, busca no array de categorias
                    if (!categoriaNome && produto.categoriaId) {
                      const categoriaEncontrada = categorias.find(c => {
                        // Compara tanto como número quanto como string para garantir compatibilidade
                        return Number(c.id) === Number(produto.categoriaId) || 
                               String(c.id) === String(produto.categoriaId);
                      });
                      categoriaNome = categoriaEncontrada?.nome;
                    }
                    
                    // Se ainda não encontrou, usa "-"
                    if (!categoriaNome) {
                      categoriaNome = "-";
                      
                      // Log de debug em desenvolvimento
                      if (import.meta.env.DEV && produto.categoriaId) {
                        console.log("Categoria não encontrada para produto:", {
                          produtoId: produto.id,
                          produtoNome: produto.nome,
                          categoriaId: produto.categoriaId,
                          categoriasDisponiveis: categorias.map(c => ({ id: c.id, nome: c.nome })),
                        });
                      }
                    }
                    
                    return (
                      <TableRow key={produto.id}>
                        <TableCell>
                          <span className="font-medium">{produto.nome}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">{produto.sku}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            R$ {produto.preco_venda.toFixed(2).replace(".", ",")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-sm font-medium"
                            style={{
                              color: getEstoqueColor(produto.estoque_atual, produto.estoque_minimo)
                            }}
                          >
                            {produto.estoque_atual}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{categoriaNome}</span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={produto.statusProduto}
                            onValueChange={(value) => {
                              if (value !== produto.statusProduto) {
                                handleStatusChange(produto.id, value as 'ATIVO' | 'INATIVO');
                              }
                            }}
                            disabled={updatingStatusId === produto.id}
                          >
                            <SelectTrigger
                              className={`h-7 w-[140px] text-xs font-medium rounded-full border-0 shadow-none hover:opacity-80 transition-opacity ${
                                produto.statusProduto === 'ATIVO'
                                  ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                              }`}
                            >
                              <SelectValue>
                                {updatingStatusId === produto.id ? (
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Atualizando...</span>
                                  </div>
                                ) : (
                                  produto.statusProduto === 'ATIVO' ? 'Ativo' : 'Inativo'
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ATIVO">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  Ativo
                                </div>
                              </SelectItem>
                              <SelectItem value="INATIVO">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                  Inativo
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TableRowActionsMenu>
                              <DropdownMenuItem onClick={() => {
                                setSelectedProduto(produto);
                                setViewDialogOpen(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedProduto(produto);
                                setHistoricoSheetOpen(true);
                              }}>
                                <History className="w-4 h-4 mr-2" />
                                Histórico
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(produto)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(produto.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                          </TableRowActionsMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
            </TableBody>
          </Table>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="border-t border-border p-4">
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
                Mostrando {produtos.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a {Math.min(currentPage * pageSize, totalProdutos)} de {totalProdutos} produtos
              </div>
            </div>
          )}
        </motion.div>

        {/* Dialog de Visualização de Produto - mesmo design de Visualizar Cliente */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Visualizar Produto
              </DialogTitle>
              <DialogDescription>
                Informações completas do produto
              </DialogDescription>
            </DialogHeader>
            {selectedProduto && (
              <div className="space-y-8 mt-6">
                {/* Informações Básicas */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Nome</Label>
                      <p className="font-medium text-base">{selectedProduto.nome || "--"}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">SKU</Label>
                      <p className="font-medium text-base font-mono">{selectedProduto.sku || "--"}</p>
                    </div>
                    <div className="space-y-3 col-span-2">
                      <Label className="text-sm text-muted-foreground">Descrição</Label>
                      <p className="font-medium text-base">{selectedProduto.descricao || "--"}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Unidade de Medida</Label>
                      <p className="font-medium text-base">{selectedProduto.unidade_medida || "--"}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Categoria</Label>
                      <p className="font-medium text-base">
                        {selectedProduto.categoria?.nome || categorias.find(c => c.id === selectedProduto.categoriaId)?.nome || "--"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Fornecedor</Label>
                      <p className="font-medium text-base">
                        {selectedProduto.fornecedor?.nome_fantasia || fornecedores.find(f => f.id === selectedProduto.fornecedorId)?.nome_fantasia || "--"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <span
                          className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${
                            selectedProduto.statusProduto === "ATIVO"
                              ? "bg-green-500/10 text-green-500"
                              : selectedProduto.statusProduto === "INATIVO"
                              ? "bg-muted text-muted-foreground"
                              : "bg-orange-500/10 text-orange-500"
                          }`}
                        >
                          {selectedProduto.statusProduto || "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preços */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Preços
                  </h3>
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Preço de Custo</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.preco_custo !== undefined && selectedProduto.preco_custo !== null
                            ? `R$ ${selectedProduto.preco_custo.toFixed(2).replace(".", ",")}`
                            : "--"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Preço de Venda</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.preco_venda !== undefined && selectedProduto.preco_venda !== null
                            ? `R$ ${selectedProduto.preco_venda.toFixed(2).replace(".", ",")}`
                            : "--"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Preço Promocional</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.preco_promocional !== undefined && selectedProduto.preco_promocional !== null
                            ? `R$ ${selectedProduto.preco_promocional.toFixed(2).replace(".", ",")}`
                            : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estoque */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                    Estoque
                  </h3>
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Estoque Atual</Label>
                        <p className="font-medium text-base" style={{ color: getEstoqueColor(selectedProduto.estoque_atual, selectedProduto.estoque_minimo) }}>
                          {selectedProduto.estoque_atual !== undefined && selectedProduto.estoque_atual !== null ? selectedProduto.estoque_atual : "--"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Estoque Mínimo</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.estoque_minimo !== undefined && selectedProduto.estoque_minimo !== null ? selectedProduto.estoque_minimo : "--"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Estoque Máximo</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.estoque_maximo !== undefined && selectedProduto.estoque_maximo !== null ? selectedProduto.estoque_maximo : "--"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Localização</Label>
                        <p className="font-medium text-base">{selectedProduto.localizacao || "--"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dimensões e Peso */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-primary" />
                    Dimensões e Peso
                  </h3>
                  <div className="p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Peso (kg)</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.peso !== undefined && selectedProduto.peso !== null ? `${selectedProduto.peso} kg` : "--"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Altura (cm)</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.altura !== undefined && selectedProduto.altura !== null ? `${selectedProduto.altura} cm` : "--"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Largura (cm)</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.largura !== undefined && selectedProduto.largura !== null ? `${selectedProduto.largura} cm` : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações Fiscais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Informações Fiscais
                  </h3>
                  <div className="p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">NCM</Label>
                        <p className="font-medium text-base font-mono">{selectedProduto.ncm || "--"}</p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">CEST</Label>
                        <p className="font-medium text-base font-mono">{selectedProduto.cest || "--"}</p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">CFOP</Label>
                        <p className="font-medium text-base">{selectedProduto.cfop || "--"}</p>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">Data de Validade</Label>
                        <p className="font-medium text-base">
                          {selectedProduto.data_validade ? new Date(selectedProduto.data_validade).toLocaleDateString("pt-BR") : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedProduto.observacoes && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Observações
                    </h3>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">{selectedProduto.observacoes}</p>
                    </div>
                  </div>
                )}

                {/* Informações do Sistema */}
                {(selectedProduto.criadoEm || selectedProduto.atualizadoEm) && (
                  <div className="space-y-2 pt-4 border-t">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Informações do Sistema
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedProduto.criadoEm && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Criado em</Label>
                          <p>{new Date(selectedProduto.criadoEm).toLocaleString("pt-BR")}</p>
                        </div>
                      )}
                      {selectedProduto.atualizadoEm && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                          <p>{new Date(selectedProduto.atualizadoEm).toLocaleString("pt-BR")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {selectedProduto && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    // Relatórios do produto - pode ser implementado depois
                  }}
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Relatórios
                </Button>
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEdit(selectedProduto);
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

        {/* Dialog de Edição de Produto */}
        <Dialog 
          open={editDialogOpen} 
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedProduto(null);
              setEditingProduto({
                nome: "",
                descricao: "",
                sku: "",
                preco_custo: 0,
                preco_venda: 0,
                preco_promocional: undefined,
                estoque_atual: 0,
                estoque_minimo: 0,
                unidade_medida: "UN",
                statusProduto: "ATIVO",
                categoriaId: undefined,
                fornecedorId: undefined,
                data_validade: undefined,
                ncm: "",
                cest: "",
                cfop: "",
                observacoes: "",
                peso: undefined,
                altura: undefined,
                largura: undefined,
              });
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Editar Produto
              </DialogTitle>
              <DialogDescription className="mt-1">
                Atualize as informações do produto no sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8 pt-6">
              {/* Seção: Informações Básicas */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Package className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Informações Básicas
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dados principais do produto
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Nome do Produto *
                    </Label>
                    <Input 
                      placeholder="Ex: Notebook Dell Inspiron"
                      value={editingProduto.nome || ""}
                      onChange={(e) =>
                        setEditingProduto({ ...editingProduto, nome: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Descrição
                    </Label>
                    <Textarea
                      placeholder="Descrição detalhada do produto"
                      value={editingProduto.descricao || ""}
                      onChange={(e) =>
                        setEditingProduto({ ...editingProduto, descricao: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      SKU *
                    </Label>
                    <Input 
                      placeholder="Ex: NB-DELL-001"
                      value={editingProduto.sku || ""}
                      onChange={(e) =>
                        setEditingProduto({ ...editingProduto, sku: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Categorização */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <LayoutGrid className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Categorização
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Categoria e fornecedor do produto
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                        Categoria *
                      </Label>
                      <Select
                        value={editingProduto.categoriaId?.toString() || undefined}
                        onValueChange={(value) =>
                          setEditingProduto({
                            ...editingProduto,
                            categoriaId: Number(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.length === 0 ? (
                            <div className="py-6 px-4 text-center text-sm text-muted-foreground">
                              <LayoutGrid className="w-10 h-10 mx-auto mb-2 opacity-50" />
                              <p className="font-medium text-foreground">Nenhuma categoria cadastrada</p>
                              <p className="mt-1 text-xs">Cadastre uma categoria antes de editar o produto.</p>
                            </div>
                          ) : (
                            categorias.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        Fornecedor (opcional)
                      </Label>
                      <Select
                        value={editingProduto.fornecedorId != null ? editingProduto.fornecedorId.toString() : "none"}
                        onValueChange={(value) =>
                          setEditingProduto({
                            ...editingProduto,
                            fornecedorId: value === "none" ? null : Number(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {fornecedores.map((forn) => (
                            <SelectItem key={forn.id} value={forn.id.toString()}>
                              {forn.nome_fantasia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Preços */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Preços
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Valores de custo e venda
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Preço de Custo *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduto.preco_custo || ""}
                        onChange={(e) =>
                          setEditingProduto({
                            ...editingProduto,
                            preco_custo: e.target.value ? Number(e.target.value) : 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Preço de Venda *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduto.preco_venda || ""}
                        onChange={(e) =>
                          setEditingProduto({
                            ...editingProduto,
                            preco_venda: e.target.value ? Number(e.target.value) : 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Preço Promocional
                      </Label>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduto.preco_promocional || ""}
                        onChange={(e) =>
                          setEditingProduto({
                            ...editingProduto,
                            preco_promocional: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className={editingProduto.preco_promocional && editingProduto.preco_venda && editingProduto.preco_promocional > editingProduto.preco_venda ? "border-destructive" : ""}
                      />
                      {editingProduto.preco_promocional && editingProduto.preco_venda && editingProduto.preco_promocional > editingProduto.preco_venda && (
                        <p className="text-sm text-destructive">O preço promocional não pode ser maior que o preço de venda</p>
                      )}
                      {editingProduto.preco_promocional && editingProduto.preco_venda && editingProduto.preco_promocional <= editingProduto.preco_venda && (
                        <p className="text-sm text-muted-foreground">
                          Desconto: {((1 - editingProduto.preco_promocional / editingProduto.preco_venda) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Estoque */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Package className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Estoque
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Unidade de medida. Quantidades só por movimentação ou pedido.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label>Unidade de Medida *</Label>
                  <Select
                    value={editingProduto.unidade_medida || "UN"}
                    onValueChange={(value: "UN" | "KG" | "LT" | "CX") =>
                      setEditingProduto({
                        ...editingProduto,
                        unidade_medida: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">Unidade (UN)</SelectItem>
                      <SelectItem value="KG">Quilograma (KG)</SelectItem>
                      <SelectItem value="LT">Litro (LT)</SelectItem>
                      <SelectItem value="CX">Caixa (CX)</SelectItem>
                      <SelectItem value="SC">Saco (SC)</SelectItem>
                      <SelectItem value="ARROBA">Arroba (ARROBA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seção: Informações Fiscais */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-indigo-500/10">
                    <FileCheck className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Informações Fiscais
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Códigos fiscais e tributários
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        NCM
                      </Label>
                      <Input
                        placeholder="Ex: 8517.12.00"
                        maxLength={20}
                        value={editingProduto.ncm || ""}
                        onChange={(e) =>
                          setEditingProduto({ ...editingProduto, ncm: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        CEST
                      </Label>
                      <Input
                        placeholder="Ex: 0100100"
                        maxLength={20}
                        value={editingProduto.cest || ""}
                        onChange={(e) =>
                          setEditingProduto({ ...editingProduto, cest: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        CFOP
                      </Label>
                      <Input
                        placeholder="Ex: 5102"
                        maxLength={20}
                        value={editingProduto.cfop || ""}
                        onChange={(e) =>
                          setEditingProduto({ ...editingProduto, cfop: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Dimensões e Peso */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-teal-500/10">
                    <Ruler className="w-5 h-5 text-teal-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Dimensões e Peso
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Medidas físicas do produto
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Peso (kg)
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={editingProduto.peso || ""}
                        onChange={(e) =>
                          setEditingProduto({
                            ...editingProduto,
                            peso: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Altura (cm)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduto.altura || ""}
                        onChange={(e) =>
                          setEditingProduto({
                            ...editingProduto,
                            altura: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Largura (cm)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduto.largura || ""}
                        onChange={(e) =>
                          setEditingProduto({
                            ...editingProduto,
                            largura: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Data de Validade
                      </Label>
                      <Input
                        type="date"
                        value={editingProduto.data_validade || ""}
                        onChange={(e) =>
                          setEditingProduto({ ...editingProduto, data_validade: e.target.value || undefined })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Outros */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <Info className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Outros
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Observações e status do produto
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Observações
                    </Label>
                    <Textarea
                      placeholder="Observações adicionais sobre o produto"
                      value={editingProduto.observacoes || ""}
                      onChange={(e) =>
                        setEditingProduto({ ...editingProduto, observacoes: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Status</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {(["ATIVO", "INATIVO"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setEditingProduto({
                              ...editingProduto,
                              statusProduto: status,
                            })
                          }
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                            editingProduto.statusProduto === status
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <Circle
                            className={`w-4 h-4 ${
                              editingProduto.statusProduto === status
                                ? status === "ATIVO"
                                  ? "text-green-500 fill-green-500"
                                  : "text-muted-foreground fill-muted-foreground"
                                : "text-muted-foreground"
                            }`}
                          />
                          <span className="font-medium">{status}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUpdate}
                className="w-full"
                variant="gradient"
                disabled={updateProdutoMutation.isPending}
              >
                {updateProdutoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar Produto"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
                {produtoToDelete && (
                  <span className="block mt-2 font-medium text-foreground">
                    Produto ID: {produtoToDelete}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProdutoToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteProdutoMutation.isPending}
              >
                {deleteProdutoMutation.isPending ? (
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
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog de Confirmação para Deletar Categoria */}
        <AlertDialog open={deleteCategoriaDialogOpen} onOpenChange={setDeleteCategoriaDialogOpen}>
          <AlertDialogPortal>
            <AlertDialogOverlay className="bg-transparent" />
            <AlertDialogPrimitive.Content className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
              "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
              "sm:rounded-lg"
            )}>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão de Categoria</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
                  {categoriaToDelete && (
                    <span className="block mt-2 font-medium text-foreground">
                      Categoria: {categoriaToDelete.nome}
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={() => {
                    setDeleteCategoriaDialogOpen(false);
                    setCategoriaToDelete(null);
                  }}
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteCategoria}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
                  disabled={deleteCategoriaMutation.isPending}
                >
                  {deleteCategoriaMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogPrimitive.Content>
          </AlertDialogPortal>
        </AlertDialog>

        {/* Sheet de Histórico de Movimentações */}
        <Sheet open={historicoSheetOpen} onOpenChange={setHistoricoSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <History className="w-5 h-5 text-purple-600" />
                </div>
                <SheetTitle className="text-xl">Histórico de Movimentações</SheetTitle>
              </div>
              {selectedProduto && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{selectedProduto.nome}</p>
                  <p className="text-sm text-muted-foreground">SKU: {selectedProduto.sku}</p>
                </div>
              )}
            </SheetHeader>

            <div className="mt-6">
              {isLoadingHistorico ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
                </div>
              ) : historicoData?.movimentacoes && historicoData.movimentacoes.length > 0 ? (
                <div className="space-y-3">
                  {historicoData.movimentacoes.map((mov) => {
                    return (
                      <div
                        key={mov.id}
                        className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {mov.tipo === "ENTRADA" && (
                              <ArrowDownCircle className="w-5 h-5" style={{ color: "#059669" }} />
                            )}
                            {mov.tipo === "DEVOLUCAO" && (
                              <RotateCcw className="w-5 h-5" style={{ color: "#2563eb" }} />
                            )}
                            {mov.tipo === "SAIDA" && (
                              <ArrowUpCircle className="w-5 h-5" style={{ color: "#dc2626" }} />
                            )}
                            {mov.tipo === "PERDA" && (
                              <AlertTriangle className="w-5 h-5" style={{ color: "#d97706" }} />
                            )}
                            {mov.tipo === "TRANSFERENCIA" && (
                              <Truck className="w-5 h-5" style={{ color: "#7c3aed" }} />
                            )}
                            {mov.tipo === "AJUSTE" && (
                              <Settings className="w-5 h-5" style={{ color: "#2563eb" }} />
                            )}
                            <span 
                              className="font-semibold"
                              style={{
                                color: mov.tipo === "ENTRADA" ? "#059669" :
                                       mov.tipo === "DEVOLUCAO" ? "#2563eb" :
                                       mov.tipo === "SAIDA" ? "#dc2626" :
                                       mov.tipo === "PERDA" ? "#d97706" :
                                       mov.tipo === "TRANSFERENCIA" ? "#7c3aed" :
                                       "#2563eb"
                              }}
                            >
                              {mov.tipo === "ENTRADA" ? "Entrada" : mov.tipo === "SAIDA" ? "Saída" : mov.tipo === "AJUSTE" ? "Ajuste" : mov.tipo === "DEVOLUCAO" ? "Devolução" : mov.tipo === "PERDA" ? "Perda" : mov.tipo === "TRANSFERENCIA" ? "Transferência" : mov.tipo}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(mov.criado_em).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Quantidade</Label>
                            <p 
                              className="font-medium"
                              style={{
                                color: mov.tipo === "ENTRADA" || mov.tipo === "DEVOLUCAO" ? "#059669" :
                                       mov.tipo === "PERDA" ? "#d97706" :
                                       mov.tipo === "TRANSFERENCIA" ? "#7c3aed" :
                                       mov.tipo === "SAIDA" ? "#dc2626" :
                                       "#2563eb"
                              }}
                            >
                              {(mov.tipo === "ENTRADA" || mov.tipo === "DEVOLUCAO") ? "+" : (mov.tipo === "SAIDA" || mov.tipo === "PERDA" || mov.tipo === "TRANSFERENCIA") ? "-" : mov.tipo === "AJUSTE" ? (mov.quantidade >= 0 ? "+" : "") : ""}{mov.quantidade}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Estoque Anterior</Label>
                            <p className="font-medium">{mov.estoque_anterior}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Estoque Atual</Label>
                            <p className="font-medium" style={{ color: getEstoqueColor(mov.estoque_atual, selectedProduto?.estoque_minimo || 0) }}>
                              {mov.estoque_atual}
                            </p>
                          </div>
                          {mov.documento_referencia && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Documento</Label>
                              <p className="font-medium text-sm">{mov.documento_referencia}</p>
                            </div>
                          )}
                        </div>

                        {mov.motivo && (
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground">Motivo</Label>
                            <p className="text-sm">
                              {(() => {
                                const m = mov.motivo?.toUpperCase().replace(/\s+/g, "_") || "";
                                if (m === "ESTOQUE_INICIAL") return "Estoque Inicial";
                                if (m === "AJUSTE_ESTOQUE" || m === "AJUSTE_DE_ESTOQUE") return "Ajuste de Estoque";
                                return mov.motivo || "-";
                              })()}
                            </p>
                          </div>
                        )}

                        {mov.observacao && (
                          <div className="mt-2">
                            <Label className="text-xs text-muted-foreground">Observação</Label>
                            <p className="text-sm text-muted-foreground">{mov.observacao}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma movimentação registrada para este produto</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
};

export default Produtos;




