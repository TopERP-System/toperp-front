import { CampoCnpjComConsulta } from "@/components/CampoCnpjComConsulta";
import AppLayout from "@/components/layout/AppLayout";
import { TableRowActionsMenu } from "@/components/TableRowActionsMenu";
import { ModulePageHeader } from "@/components/layout/ModulePageHeader";
import {
  ModuleStatCards,
  type ModuleStatCardItem,
} from "@/components/layout/ModuleStatCards";
import { statTheme } from "@/components/layout/module-stat-themes";
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
import { Progress } from "@/components/ui/progress";
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
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { prepararAtualizacaoFornecedor } from "@/features/fornecedores/utils/prepararAtualizacaoFornecedor";
import { cleanDocument, formatCEP, formatCNPJ, formatCPF, formatTelefone } from "@/lib/validators";
import { ConsultaCnpjResponse } from "@/services/cnpj.service";
import {
    CreateFornecedorDto,
    fornecedoresService,
} from "@/services/fornecedores.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Ban,
    Building2,
    Calendar,
    Check,
    CheckCircle,
    Circle,
    Edit,
    Eye,
    FileText,
    Filter,
    Hash,
    Loader2,
    Mail,
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
    Truck,
    User,
    User as UserIcon,
    Users,
    XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Fornecedores = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [isSavingFornecedor, setIsSavingFornecedor] = useState(false);
  const [enderecoParaDeletar, setEnderecoParaDeletar] = useState<{ index: number; endereco: any } | null>(null);
  const [contatoParaDeletar, setContatoParaDeletar] = useState<{ index: number; contato: any } | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: apenas nome_fantasia Ã© obrigatÃ³rio
  // Campo nome_razao NÃƒO EXISTE - nÃ£o usar
  // Todos os outros campos sÃ£o opcionais (valores padrÃ£o apenas para UI)
  const [newFornecedor, setNewFornecedor] = useState<CreateFornecedorDto>({
    nome_fantasia: "",
    tipoFornecedor: "PESSOA_JURIDICA", // Valor padrÃ£o apenas para UI, nÃ£o serÃ¡ enviado se nÃ£o selecionado
    statusFornecedor: "ATIVO", // Valor padrÃ£o apenas para UI, nÃ£o serÃ¡ enviado se nÃ£o selecionado
    cpf_cnpj: "",
    inscricao_estadual: "",
  });
  // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: endereÃ§os e contatos sÃ£o opcionais
  // NÃ£o criar arrays vazios por padrÃ£o - usuÃ¡rio adiciona se necessÃ¡rio
  const [enderecos, setEnderecos] = useState<
    Array<{
      cep: string;
      logradouro: string;
      numero: string;
      complemento: string;
      bairro: string;
      cidade: string;
      estado: string;
      referencia: string;
    }>
  >([]);
  const [contatos, setContatos] = useState<
    Array<{
      telefone: string;
      email: string;
      nomeContato: string;
      observacao: string;
    }>
  >([]);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    tipoFornecedor: "",
    statusFornecedor: "",
    cidade: "",
    estado: "",
    logradouro: "",
  });

  // Estados para ediÃ§Ã£o
  // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE
  const [editFornecedor, setEditFornecedor] = useState<CreateFornecedorDto>({
    nome_fantasia: "",
    tipoFornecedor: "PESSOA_FISICA",
    statusFornecedor: "ATIVO",
    cpf_cnpj: "",
    inscricao_estadual: "",
  });
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
      ativo: boolean;
    }>
  >([]);
  const [fornecedorOriginal, setFornecedorOriginal] = useState<any>(null);

  // Buscar todos os fornecedores para calcular estatÃ­sticas
  const { data: todosFornecedoresData } = useQuery({
    queryKey: ["fornecedores-todos-estatisticas"],
    queryFn: async () => {
      try {
        const response = await fornecedoresService.listar({
          limit: 500, // Limite mÃ¡ximo aceito pelo backend
        });
        // Extrair array de fornecedores
        if (Array.isArray(response)) {
          return response;
        } else if (Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response.fornecedores)) {
          return response.fornecedores;
        }
        return [];
      } catch (error) {
        console.error("Erro ao buscar todos os fornecedores para estatÃ­sticas:", error);
        return [];
      }
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    retry: false,
  });

  // Calcular estatÃ­sticas localmente baseado nos fornecedores
  const estatisticasCalculadas = useMemo(() => {
    const todosFornecedores = todosFornecedoresData || [];
    
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    
    const novosNoMes = todosFornecedores.filter((fornecedor: any) => {
      if (!fornecedor.criandoEm) return false;
      const dataCriacao = new Date(fornecedor.criandoEm);
      return dataCriacao >= inicioMes;
    }).length;

    return {
      total: todosFornecedores.length,
      ativos: todosFornecedores.filter((f: any) => f.statusFornecedor === "ATIVO").length,
      inativos: todosFornecedores.filter((f: any) => f.statusFornecedor === "INATIVO").length,
      bloqueados: todosFornecedores.filter((f: any) => f.statusFornecedor === "BLOQUEADO").length,
      novosNoMes,
    };
  }, [todosFornecedoresData]);

  // Buscar estatÃ­sticas da API como fallback
  const { data: estatisticasApi, isLoading: isLoadingEstatisticas } = useQuery({
    queryKey: ["fornecedores-estatisticas"],
    queryFn: () => fornecedoresService.getEstatisticas(),
    refetchInterval: 30000,
    retry: false,
  });

  // Usar estatÃ­sticas calculadas (sempre atualizadas) ao invÃ©s da API
  const estatisticas = estatisticasCalculadas;

  const fornecedorStatItems = useMemo((): ModuleStatCardItem[] => {
    return [
      {
        key: "total",
        label: "Total de fornecedores",
        value: estatisticas?.total || 0,
        Icon: Users,
        ...statTheme.primary,
      },
      {
        key: "ativos",
        label: "Fornecedores ativos",
        value: estatisticas?.ativos || 0,
        Icon: CheckCircle,
        ...statTheme.emerald,
      },
      {
        key: "inativos",
        label: "Fornecedores inativos",
        value: estatisticas?.inativos || 0,
        Icon: XCircle,
        ...statTheme.slate,
      },
      {
        key: "bloqueados",
        label: "Bloqueados",
        value: estatisticas?.bloqueados || 0,
        Icon: Ban,
        ...statTheme.red,
      },
      {
        key: "novos",
        label: "Novos no mÃªs",
        value: estatisticas?.novosNoMes || 0,
        Icon: Calendar,
        ...statTheme.cyan,
      },
    ];
  }, [estatisticas]);

  // Verificar se hÃ¡ filtros ativos
  // Verificar tipos de filtros conforme guia de endpoints
  // Filtros bÃ¡sicos: tipoFornecedor, statusFornecedor (aceitos em /fornecedor)
  // Filtros avanÃ§ados: estado, logradouro (aceitos apenas em /fornecedor/buscar-avancado)
  // Nota: O campo "Cidade" no formulÃ¡rio agora usa logradouro internamente
  const temFiltrosBasicos = !!(filtrosAvancados.tipoFornecedor?.trim() || filtrosAvancados.statusFornecedor?.trim());
  const temFiltrosAvancados = !!(filtrosAvancados.estado?.trim() || filtrosAvancados.logradouro?.trim());
  const temTermo = !!searchTerm.trim();
  // VariÃ¡vel para UI (verifica se hÃ¡ qualquer filtro ativo)
  const temFiltrosAtivos = temFiltrosBasicos || temFiltrosAvancados;
  
  // Debug: verificar estado dos filtros
  if (import.meta.env.DEV) {
    console.log('[Fornecedores] Estado dos filtros:', {
      filtrosAvancados,
      temFiltrosBasicos,
      temFiltrosAvancados,
      temTermo,
      estado: filtrosAvancados.estado,
      logradouro: filtrosAvancados.logradouro,
    });
  }

  // Buscar fornecedores conforme GUIA_ENDPOINTS_BUSCA_FILTRO.md
  const { 
    data: fornecedoresResponse, 
    isLoading: isLoadingFornecedores 
  } = useQuery({
    queryKey: ["fornecedores", searchTerm, filtrosAvancados, currentPage],
    queryFn: async () => {
      try {
        // Conforme GUIA_ENDPOINTS_BUSCA_FILTRO.md:
        // - /fornecedor/buscar: busca em nome fantasia, razÃ£o social ou CNPJ (busca simples)
        // - /fornecedor/buscar-avancado: busca em nome, razÃ£o social, CNPJ + aceita filtros adicionais
        
        // Quando hÃ¡ filtros avanÃ§ados (estado ou logradouro), SEMPRE usar buscarAvancado
        // IMPORTANTE: Verificar explicitamente se estado ou logradouro tÃªm valor
        // Nota: O campo "Cidade" no formulÃ¡rio agora usa logradouro internamente
        const temEstado = !!(filtrosAvancados.estado && filtrosAvancados.estado.trim());
        const temLogradouro = !!(filtrosAvancados.logradouro && filtrosAvancados.logradouro.trim());
        
        if (temEstado || temLogradouro) {
          // Quando hÃ¡ filtros avanÃ§ados (estado/logradouro), usa busca avanÃ§ada
          const params: any = {
            page: currentPage,
            limit: pageSize,
          };

          // Adicionar termo se houver (busca em nome, razÃ£o social, CNPJ)
          if (temTermo) {
            params.termo = searchTerm.trim();
          }

          // Adicionar todos os filtros (bÃ¡sicos e avanÃ§ados)
          if (filtrosAvancados.tipoFornecedor && filtrosAvancados.tipoFornecedor.trim()) {
            params.tipoFornecedor = filtrosAvancados.tipoFornecedor.trim();
          }
          if (filtrosAvancados.statusFornecedor && filtrosAvancados.statusFornecedor.trim()) {
            params.statusFornecedor = filtrosAvancados.statusFornecedor.trim();
          }
          if (temEstado) {
            params.estado = filtrosAvancados.estado.trim().toUpperCase();
          }
          if (temLogradouro) {
            params.logradouro = filtrosAvancados.logradouro.trim();
          }

          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Usando buscarAvancado com filtros avanÃ§ados');
            console.log('[Buscar Fornecedores] ParÃ¢metros completos:', JSON.stringify(params, null, 2));
            console.log('[Buscar Fornecedores] temEstado:', temEstado, 'temLogradouro:', temLogradouro);
            console.log('[Buscar Fornecedores] filtrosAvancados.logradouro:', filtrosAvancados.logradouro);
            console.log('[Buscar Fornecedores] params.logradouro:', params.logradouro);
          }

          const response = await fornecedoresService.buscarAvancado(params);
          
          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Resposta buscarAvancado:', {
              total: response.total,
              page: response.page,
              totalPages: response.totalPages,
              fornecedoresCount: response.data?.length || response.fornecedores?.length || 0
            });
            if (response.data && response.data.length > 0) {
              console.log('[Buscar Fornecedores] Primeiro fornecedor:', {
                id: response.data[0].id,
                nome_fantasia: response.data[0].nome_fantasia,
                enderecos: response.data[0].enderecos
              });
            }
          }

          return response;
        } else if (temTermo && !temFiltrosBasicos) {
          // Quando hÃ¡ apenas termo (sem filtros), usa busca simples
          // Busca em: nome fantasia, razÃ£o social ou CNPJ/CPF
          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Usando buscar (termo apenas):', searchTerm.trim());
            console.log('[Buscar Fornecedores] Busca em: nome fantasia, razÃ£o social, CNPJ/CPF');
          }

          const response = await fornecedoresService.buscar(searchTerm.trim(), {
            page: currentPage,
            limit: pageSize,
          });
          
          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Resposta buscar:', {
              total: response.total,
              fornecedoresCount: response.data?.length || response.fornecedores?.length || 0
            });
          }

          return response;
        } else if (temTermo || temFiltrosBasicos) {
          // Quando hÃ¡ termo + filtros bÃ¡sicos OU apenas filtros bÃ¡sicos, usa busca avanÃ§ada
          const params: any = {
            page: currentPage,
            limit: pageSize,
          };

          // Adicionar termo se houver (busca em nome, razÃ£o social, CNPJ)
          if (temTermo) {
            params.termo = searchTerm.trim();
          }

          // Adicionar filtros bÃ¡sicos
          if (filtrosAvancados.tipoFornecedor) {
            params.tipoFornecedor = filtrosAvancados.tipoFornecedor;
          }
          if (filtrosAvancados.statusFornecedor) {
            params.statusFornecedor = filtrosAvancados.statusFornecedor;
          }

          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Usando buscarAvancado com parÃ¢metros:', params);
          }

          const response = await fornecedoresService.buscarAvancado(params);
          
          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Resposta buscarAvancado:', {
              total: response.total,
              page: response.page,
              totalPages: response.totalPages,
              fornecedoresCount: response.data?.length || response.fornecedores?.length || 0
            });
          }

          return response;
        } else {
          // Usa listar quando hÃ¡ apenas filtros bÃ¡sicos OU quando nÃ£o hÃ¡ nada
          // O endpoint /fornecedor aceita tipoFornecedor e statusFornecedor
          const params: any = {
            page: currentPage,
            limit: pageSize,
          };

          if (filtrosAvancados.tipoFornecedor) {
            params.tipoFornecedor = filtrosAvancados.tipoFornecedor;
          }
          if (filtrosAvancados.statusFornecedor) {
            params.statusFornecedor = filtrosAvancados.statusFornecedor;
          }

          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Usando listar com parÃ¢metros:', params);
          }

          const response = await fornecedoresService.listar(params);
          
          if (import.meta.env.DEV) {
            console.log('[Buscar Fornecedores] Resposta listar:', {
              total: response.total,
              fornecedoresCount: response.data?.length || response.fornecedores?.length || 0
            });
          }

          return response;
        }
      } catch (error: any) {
        console.error("Erro ao buscar fornecedores:", error);
        if (import.meta.env.DEV) {
          console.error("Detalhes do erro:", {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status,
            url: error?.config?.url,
          });
        }
        return {
          data: [],
          fornecedores: [],
          total: 0,
          page: 1,
          limit: pageSize,
          totalPages: 0,
        };
      }
    },
    retry: false,
  });

  // Extrair fornecedores - pode vir em data, fornecedores, fornecedor (singular), ou ser um array direto
  let fornecedores: any[] = [];
  let totalFornecedores = 0;
  
  if (fornecedoresResponse) {
    // Se for array direto
    if (Array.isArray(fornecedoresResponse)) {
      fornecedores = fornecedoresResponse;
      totalFornecedores = fornecedoresResponse.length;
    } 
    // Se tiver propriedade data
    else if (Array.isArray(fornecedoresResponse.data)) {
      fornecedores = fornecedoresResponse.data;
      totalFornecedores = fornecedoresResponse.total || fornecedoresResponse.data.length;
    }
    // Se tiver propriedade fornecedores (plural)
    else if (Array.isArray(fornecedoresResponse.fornecedores)) {
      fornecedores = fornecedoresResponse.fornecedores;
      totalFornecedores = fornecedoresResponse.total || fornecedoresResponse.fornecedores.length;
    }
    // Se tiver propriedade fornecedor (singular) - conforme GUIA_ENDPOINTS_BUSCA_FILTRO.md
    else if (Array.isArray(fornecedoresResponse.fornecedor)) {
      fornecedores = fornecedoresResponse.fornecedor;
      totalFornecedores = fornecedoresResponse.total || fornecedoresResponse.fornecedor.length;
    }
  }
  
  // ValidaÃ§Ã£o adicional: Filtrar fornecedores por endereÃ§o quando hÃ¡ filtros de endereÃ§o ativos
  // Isso garante que apenas fornecedores com endereÃ§os que correspondem aos filtros sejam exibidos
  // Nota: O campo "Cidade" no formulÃ¡rio agora usa logradouro internamente
  if (temFiltrosAvancados && fornecedores.length > 0) {
    const temEstado = !!(filtrosAvancados.estado && filtrosAvancados.estado.trim());
    const temLogradouro = !!(filtrosAvancados.logradouro && filtrosAvancados.logradouro.trim());
    
    const estadoFiltro = temEstado ? filtrosAvancados.estado.trim().toUpperCase() : null;
    const logradouroFiltro = temLogradouro ? filtrosAvancados.logradouro.trim().toLowerCase() : null;
    
    const fornecedoresAntesFiltro = fornecedores.length;
    
    fornecedores = fornecedores.filter((fornecedor) => {
      // Se o fornecedor nÃ£o tem endereÃ§os, nÃ£o corresponde aos filtros
      if (!fornecedor.enderecos || fornecedor.enderecos.length === 0) {
        return false;
      }
      
      // Verificar se pelo menos um endereÃ§o corresponde aos filtros
      return fornecedor.enderecos.some((endereco: any) => {
        let correspondeEstado = true;
        let correspondeLogradouro = true;
        
        if (estadoFiltro) {
          const estadoEndereco = endereco.estado?.trim().toUpperCase() || '';
          correspondeEstado = estadoEndereco === estadoFiltro;
        }
        
        if (logradouroFiltro) {
          const logradouroEndereco = endereco.logradouro?.trim().toLowerCase() || '';
          correspondeLogradouro = logradouroEndereco.includes(logradouroFiltro);
        }
        
        return correspondeEstado && correspondeLogradouro;
      });
    });
    
    totalFornecedores = fornecedores.length;
    
    if (import.meta.env.DEV && fornecedoresAntesFiltro !== fornecedores.length) {
      console.log('[Fornecedores] Filtro adicional aplicado:', {
        fornecedoresAntesFiltro,
        fornecedoresDepoisFiltro: fornecedores.length,
        filtros: {
          estado: estadoFiltro,
          logradouro: logradouroFiltro,
        },
      });
    }
  }
  
  // Debug: Log detalhado em desenvolvimento
  if (import.meta.env.DEV && fornecedoresResponse) {
    console.log('[Fornecedores] ExtraÃ§Ã£o de dados:', {
      responseKeys: Object.keys(fornecedoresResponse),
      temData: !!fornecedoresResponse.data,
      temFornecedores: !!fornecedoresResponse.fornecedores,
      temFornecedor: !!fornecedoresResponse.fornecedor,
      total: fornecedoresResponse.total,
      fornecedoresExtraidos: fornecedores.length,
    });
  }
  
  const totalPages = fornecedoresResponse?.totalPages || Math.ceil(totalFornecedores / pageSize);
  const queryClient = useQueryClient();

  // Debug: Log da resposta em desenvolvimento
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("ðŸ“¦ [Fornecedores Debug] ==========");
      console.log("ðŸ“¦ Resposta completa:", fornecedoresResponse);
      console.log("ðŸ“¦ Tipo da resposta:", typeof fornecedoresResponse);
      console.log("ðŸ“¦ Ã‰ array?", Array.isArray(fornecedoresResponse));
      if (fornecedoresResponse && !Array.isArray(fornecedoresResponse)) {
        console.log("ðŸ“¦ Keys da resposta:", Object.keys(fornecedoresResponse));
      }
      console.log("ðŸ“¦ Fornecedores extraÃ­dos:", fornecedores);
      console.log("ðŸ“¦ Quantidade:", fornecedores.length);
      console.log("ðŸ“¦ Total:", totalFornecedores);
      console.log("ðŸ“¦ Total de pÃ¡ginas:", totalPages);
      console.log("ðŸ“¦ ==============================");
    }
  }, [fornecedoresResponse, fornecedores, totalFornecedores, totalPages]);

  // Resetar pÃ¡gina quando o termo de busca ou filtros avanÃ§ados mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtrosAvancados]);

  const resetForm = () => {
    setCurrentStep(1);
    setNewFornecedor({
      nome_fantasia: "",
      tipoFornecedor: "PESSOA_JURIDICA",
      statusFornecedor: "ATIVO",
      cpf_cnpj: "",
      inscricao_estadual: "",
    });
    // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: endereÃ§os e contatos sÃ£o opcionais
    // Campo nome_razao NÃƒO EXISTE - nÃ£o usar
    // NÃ£o criar arrays vazios por padrÃ£o - usuÃ¡rio adiciona se necessÃ¡rio
    setEnderecos([]);
    setContatos([]);
  };

  // Mutation para criar fornecedor
  const createFornecedorMutation = useMutation({
    mutationFn: async (data: CreateFornecedorDto) => {
      return await fornecedoresService.criar(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({
        queryKey: ["fornecedores-estatisticas"],
      });
      queryClient.invalidateQueries({
        queryKey: ["fornecedores-todos-estatisticas"],
      });
      toast.success("Fornecedor cadastrado com sucesso!");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(errorMessage || "Erro ao cadastrar fornecedor");
    },
  });

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Conforme GUIA_FRONTEND_FORNECEDOR_CAMPOS_OPCIONAIS.md: apenas nome_fantasia Ã© obrigatÃ³rio
      if (!newFornecedor.nome_fantasia || newFornecedor.nome_fantasia.trim().length === 0) {
        toast.error("O nome fantasia Ã© obrigatÃ³rio");
        return;
      }
      
      if (newFornecedor.nome_fantasia.length > 255) {
        toast.error("O nome fantasia deve ter no mÃ¡ximo 255 caracteres");
        return;
      }
      
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // FunÃ§Ã£o para preencher campos automaticamente apÃ³s consulta CNPJ
  const handlePreencherCamposCnpj = (dados: ConsultaCnpjResponse) => {
    // Preencher nome fantasia
    if (dados.nomeFantasia) {
      setNewFornecedor((prev) => ({
        ...prev,
        nome_fantasia: dados.nomeFantasia,
      }));
    }

    // Definir tipo como Pessoa JurÃ­dica
    setNewFornecedor((prev) => ({
      ...prev,
      tipoFornecedor: "PESSOA_JURIDICA",
    }));

    // Preencher inscriÃ§Ã£o estadual
    if (dados.inscricaoEstadual) {
      setNewFornecedor((prev) => ({
        ...prev,
        inscricao_estadual: dados.inscricaoEstadual || "",
      }));
    }

    // Preencher endereÃ§o se houver dados (com formataÃ§Ã£o visual)
    if (dados.logradouro || dados.cep || dados.cidade) {
      // Formatar CEP visualmente
      const cepFormatado = dados.cep ? formatCEP(dados.cep) : "";
      
      const novoEndereco = {
        cep: cepFormatado,
        logradouro: dados.logradouro || "",
        numero: dados.numero || "",
        complemento: "",
        bairro: dados.bairro || "",
        cidade: dados.cidade || "",
        estado: dados.uf || "",
        referencia: "",
      };

      // Se nÃ£o houver endereÃ§os, criar um novo; senÃ£o, atualizar o primeiro
      if (enderecos.length === 0) {
        setEnderecos([novoEndereco]);
      } else {
        setEnderecos([
          { ...enderecos[0], ...novoEndereco },
          ...enderecos.slice(1),
        ]);
      }
    }

    // Preencher contato se houver telefone (com formataÃ§Ã£o visual)
    if (dados.telefones && dados.telefones.length > 0) {
      // Formatar telefone visualmente
      const telefoneFormatado = formatTelefone(dados.telefones[0]);
      
      const novoContato = {
        telefone: telefoneFormatado,
        email: "",
        nomeContato: "",
        observacao: "",
      };

      // Se nÃ£o houver contatos, criar um novo; senÃ£o, atualizar o primeiro
      if (contatos.length === 0) {
        setContatos([novoContato]);
      } else {
        setContatos([
          { ...contatos[0], ...novoContato },
          ...contatos.slice(1),
        ]);
      }
    }
  };

  const handleCreate = () => {
    // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: apenas nome_fantasia Ã© obrigatÃ³rio
    // Campo nome_razao NÃƒO DEVE SER USADO - Ã© campo interno do backend
    if (!newFornecedor.nome_fantasia || newFornecedor.nome_fantasia.trim().length === 0) {
      toast.error("O nome fantasia Ã© obrigatÃ³rio");
      return;
    }

    if (newFornecedor.nome_fantasia.length > 255) {
      toast.error("O nome fantasia deve ter no mÃ¡ximo 255 caracteres");
      return;
    }

    // CPF/CNPJ Ã© opcional - validar apenas se informado
    let cpfCnpjFormatado: string | undefined = undefined;
    if (newFornecedor.cpf_cnpj && newFornecedor.cpf_cnpj.trim() !== '') {
      const cleanedDoc = cleanDocument(newFornecedor.cpf_cnpj);
      const tipoFornecedor = newFornecedor.tipoFornecedor || "PESSOA_JURIDICA"; // Default se nÃ£o informado
      
      if (tipoFornecedor === "PESSOA_FISICA") {
        if (cleanedDoc.length !== 11) {
          toast.error("CPF deve ter 11 dÃ­gitos");
          return;
        }
        cpfCnpjFormatado = formatCPF(cleanedDoc);
      } else {
        if (cleanedDoc.length !== 14) {
          toast.error("CNPJ deve ter 14 dÃ­gitos");
          return;
        }
        cpfCnpjFormatado = formatCNPJ(cleanedDoc);
      }
    }

    // Preparar dados conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md
    // NÃ£o enviar campos vazios/undefined - apenas campos preenchidos
    // âš ï¸ NÃƒO incluir nome_razao - o backend usa nome_fantasia automaticamente se nÃ£o informado
    
    // EndereÃ§os: apenas se tiverem dados vÃ¡lidos (CEP, logradouro ou cidade)
    const enderecosValidos = enderecos.filter(
      (end) => (end.cep && end.cep.trim()) || (end.logradouro && end.logradouro.trim()) || (end.cidade && end.cidade.trim())
    );
    
    // Contatos: apenas se tiverem telefone (conforme guia)
    const contatosValidos = contatos.filter(
      (cont) => cont.telefone && cont.telefone.trim() !== ''
    );

    // Preparar payload completo - apenas campos preenchidos
    // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: apenas nome_fantasia Ã© obrigatÃ³rio
    // Campo nome_razao NÃƒO DEVE SER USADO - Ã© campo interno do backend
    const payload: any = {
      nome_fantasia: newFornecedor.nome_fantasia.trim(),
      // Campos opcionais - sÃ³ enviar se informados
      ...(newFornecedor.tipoFornecedor ? { tipoFornecedor: newFornecedor.tipoFornecedor } : {}),
      ...(newFornecedor.statusFornecedor ? { statusFornecedor: newFornecedor.statusFornecedor } : {}),
      ...(cpfCnpjFormatado ? { cpf_cnpj: cpfCnpjFormatado } : {}),
      ...(newFornecedor.inscricao_estadual && newFornecedor.inscricao_estadual.trim() ? { inscricao_estadual: newFornecedor.inscricao_estadual.trim() } : {}),
      ...(enderecosValidos.length > 0 ? { enderecos: enderecosValidos } : {}),
      ...(contatosValidos.length > 0 ? { contato: contatosValidos } : {}),
      // NÃƒO incluir nome_razao - o backend gerencia isso automaticamente
    };

    createFornecedorMutation.mutate(payload);
  };

  const handleView = (id: number) => {
    setSelectedFornecedorId(id);
    setViewDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedFornecedorId(id);
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setSelectedFornecedorId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedFornecedorId) {
      deleteFornecedorMutation.mutate(selectedFornecedorId);
    }
  };

  // Query para buscar fornecedor por ID (para visualizaÃ§Ã£o e ediÃ§Ã£o)
  const { data: selectedFornecedor, isLoading: isLoadingFornecedor } = useQuery({
    queryKey: ["fornecedor", selectedFornecedorId],
    queryFn: async () => {
      if (!selectedFornecedorId) return null;
      return await fornecedoresService.buscarPorId(selectedFornecedorId);
    },
    enabled: !!selectedFornecedorId && (viewDialogOpen || editDialogOpen),
    retry: false,
    staleTime: 0, // Sempre considerar os dados como "stale" para buscar dados frescos
    gcTime: 0, // NÃ£o manter em cache para garantir dados atualizados (gcTime substitui cacheTime no React Query v5)
  });


  // Mutation para atualizar status do fornecedor
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "ATIVO" | "INATIVO" | "BLOQUEADO";
    }) => {
      return await fornecedoresService.atualizar(id, { statusFornecedor: status });
    },
    onSuccess: async (data) => {
      // Invalidar todas as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["fornecedores"],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ["fornecedor", data.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["fornecedores-todos-estatisticas"],
        }),
      ]);
      
      // Buscar estatÃ­sticas atualizadas diretamente e atualizar o cache
      try {
        const novasEstatisticas = await fornecedoresService.getEstatisticas();
        queryClient.setQueryData(
          ["fornecedores-estatisticas"],
          novasEstatisticas
        );
      } catch (error) {
        // Se falhar, pelo menos invalidar para forÃ§ar refetch
        queryClient.invalidateQueries({
          queryKey: ["fornecedores-estatisticas"],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ["fornecedores-todos-estatisticas"],
        });
      }
      
      toast.success(`Status do fornecedor atualizado para ${data.statusFornecedor}!`);
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
          "Erro ao atualizar status do fornecedor";

        if (error.response?.status === 403) {
          toast.error(
            "VocÃª nÃ£o tem permissÃ£o para atualizar o status. Apenas ADMIN ou GERENTE podem realizar esta aÃ§Ã£o."
          );
        } else if (error.response?.status === 400) {
          toast.error(
            typeof errorMessage === "string"
              ? errorMessage
              : "Status invÃ¡lido ou fornecedor nÃ£o encontrado"
          );
        } else {
          toast.error(
            typeof errorMessage === "string"
              ? errorMessage
              : "Erro ao atualizar status do fornecedor"
          );
        }
      } else {
        toast.error("Erro ao atualizar status do fornecedor");
      }
    },
  });

  // Handler para atualizar status
  const handleStatusChange = (id: number, novoStatus: "ATIVO" | "INATIVO" | "BLOQUEADO") => {
    setUpdatingStatusId(id);
    updateStatusMutation.mutate({ id, status: novoStatus });
  };

  // Mutation para atualizar fornecedor
  const updateFornecedorMutation = useMutation({
    mutationFn: async (data: Partial<CreateFornecedorDto>) => {
      if (!selectedFornecedorId) throw new Error("ID do fornecedor nÃ£o encontrado");
      
      // Debug: log detalhado do que estÃ¡ sendo enviado
      console.log("ðŸ“¤ [Atualizar Fornecedor] Enviando requisiÃ§Ã£o:", {
        id: selectedFornecedorId,
        payload: data,
        payloadJSON: JSON.stringify(data, null, 2),
        endpoint: `/fornecedor/${selectedFornecedorId}`
      });
      
      try {
        const response = await fornecedoresService.atualizar(selectedFornecedorId, data);
        
        // Debug: log da resposta
        console.log("âœ… [Atualizar Fornecedor] Resposta do backend:", {
          response,
          enderecos: response.enderecos,
          contatos: response.contato
        });
        
        return response;
      } catch (error: any) {
        // Debug: log detalhado do erro
        console.error("âŒ [Atualizar Fornecedor] Erro na requisiÃ§Ã£o:", {
          error,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
          stack: error?.stack
        });
        throw error;
      }
    },
    onSuccess: async () => {
      // Invalidar todas as queries de fornecedores (incluindo variaÃ§Ãµes com filtros e busca)
      await queryClient.invalidateQueries({ 
        queryKey: ["fornecedores"],
        exact: false,
      });
      
      // Invalidar estatÃ­sticas para garantir atualizaÃ§Ã£o
      await queryClient.invalidateQueries({
        queryKey: ["fornecedores-estatisticas"],
        exact: true,
      });
      
      await queryClient.invalidateQueries({
        queryKey: ["fornecedores-todos-estatisticas"],
        exact: true,
      });
      
      await queryClient.invalidateQueries({
        queryKey: ["fornecedor", selectedFornecedorId],
        exact: true,
      });
      
      // ForÃ§ar refetch imediato de todas as queries relacionadas
      await Promise.all([
        queryClient.refetchQueries({ 
          queryKey: ["fornecedores"],
          exact: false,
        }),
        queryClient.refetchQueries({ 
          queryKey: ["fornecedores-estatisticas"],
          exact: true,
        }),
        queryClient.refetchQueries({ 
          queryKey: ["fornecedores-todos-estatisticas"],
          exact: true,
        }),
        queryClient.refetchQueries({ 
          queryKey: ["fornecedor", selectedFornecedorId],
          exact: true,
        }),
      ]);
      
      toast.success("Fornecedor atualizado com sucesso!");
      setEditDialogOpen(false);
      setSelectedFornecedorId(null);
      // Resetar estados
      // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE - nÃ£o usar
      setEditFornecedor({
        nome_fantasia: "",
        tipoFornecedor: "PESSOA_FISICA",
        statusFornecedor: "ATIVO",
        cpf_cnpj: "",
        inscricao_estadual: "",
      });
      setEditEnderecos([]);
      setEditContatos([]);
      setFornecedorOriginal(null);
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
          "Erro ao atualizar fornecedor";
        
        console.error("âŒ [Atualizar Fornecedor] Erro completo:", {
          error,
          errorMessage,
          status: error.response?.status,
          data: errorResponse
        });
        
        toast.error(
          typeof errorMessage === "string"
            ? errorMessage
            : "Erro ao atualizar fornecedor"
        );
      } else {
        console.error("âŒ [Atualizar Fornecedor] Erro desconhecido:", error);
        toast.error("Erro ao atualizar fornecedor");
      }
    },
  });

  // Mutation para remover endereÃ§o
  const removerEnderecoMutation = useMutation({
    mutationFn: async ({ fornecedorId, enderecoId }: { fornecedorId: number; enderecoId: number }) => {
      return await fornecedoresService.removerEndereco(fornecedorId, enderecoId);
    },
    onSuccess: async (_, variables) => {
      // Invalidar queries para atualizar a lista
      await queryClient.invalidateQueries({
        queryKey: ["fornecedor", variables.fornecedorId],
        exact: true,
      });
      
      // âš ï¸ IMPORTANTE: Recarregar dados do fornecedor para garantir sincronizaÃ§Ã£o
      // Isso atualiza o fornecedorOriginal com os dados corretos do servidor
      if (variables.fornecedorId) {
        const updatedFornecedor = await fornecedoresService.buscarPorId(variables.fornecedorId);
        
        // âš ï¸ CRÃTICO: Atualizar fornecedorOriginal com dados do servidor
        // Isso garante que a validaÃ§Ã£o de endereÃ§os/contatos funcione corretamente
        setFornecedorOriginal(JSON.parse(JSON.stringify(updatedFornecedor)));
        
        if (updatedFornecedor.enderecos) {
          setEditEnderecos(
            updatedFornecedor.enderecos.map((end) => ({
              // Garantir que ID seja nÃºmero
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
      
      toast.success("EndereÃ§o removido com sucesso!");
    },
    onError: (error: any) => {
      // Se for 404, o endereÃ§o jÃ¡ nÃ£o existe - nÃ£o mostrar erro crÃ­tico
      if (error?.response?.status === 404) {
        const errorMessage = error?.response?.data?.message || "EndereÃ§o jÃ¡ nÃ£o existe";
        console.warn('[Remover EndereÃ§o] EndereÃ§o nÃ£o encontrado (404):', errorMessage);
        // NÃ£o mostrar toast de erro, pois jÃ¡ foi tratado no onClick
        return;
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao remover endereÃ§o";
      toast.error(errorMessage);
    },
  });

  // Mutation para adicionar endereÃ§o
  const adicionarEnderecoMutation = useMutation({
    mutationFn: async ({ fornecedorId, endereco }: { fornecedorId: number; endereco: any }) => {
      return await fornecedoresService.adicionarEndereco(fornecedorId, endereco);
    },
    onSuccess: async (novoEndereco, variables) => {
      // Invalidar queries para atualizar a lista
      await queryClient.invalidateQueries({
        queryKey: ["fornecedor", variables.fornecedorId],
        exact: true,
      });
      
      // âš ï¸ IMPORTANTE: Recarregar dados do fornecedor para garantir sincronizaÃ§Ã£o
      // Isso atualiza o fornecedorOriginal com os dados corretos do servidor
      if (variables.fornecedorId) {
        const updatedFornecedor = await fornecedoresService.buscarPorId(variables.fornecedorId);
        
        // âš ï¸ CRÃTICO: Atualizar fornecedorOriginal com dados do servidor
        // Isso garante que a validaÃ§Ã£o de endereÃ§os/contatos funcione corretamente
        setFornecedorOriginal(JSON.parse(JSON.stringify(updatedFornecedor)));
        
        if (updatedFornecedor.enderecos) {
          setEditEnderecos(
            updatedFornecedor.enderecos.map((end) => ({
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
      
      toast.success("EndereÃ§o adicionado com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao adicionar endereÃ§o";
      toast.error(errorMessage);
    },
  });

  // Mutation para remover contato
  const removerContatoMutation = useMutation({
    mutationFn: async ({ fornecedorId, contatoId }: { fornecedorId: number; contatoId: number }) => {
      return await fornecedoresService.removerContato(fornecedorId, contatoId);
    },
    onSuccess: async (_, variables) => {
      // Invalidar e remover do cache antes de buscar novamente
      await queryClient.invalidateQueries({
        queryKey: ["fornecedor", variables.fornecedorId],
        exact: true,
      });
      
      // Remover do cache para forÃ§ar busca fresca
      queryClient.removeQueries({
        queryKey: ["fornecedor", variables.fornecedorId],
        exact: true,
      });
      
      // Aguardar um pouco para garantir que o backend processou a remoÃ§Ã£o
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // âš ï¸ IMPORTANTE: Recarregar dados do fornecedor para garantir sincronizaÃ§Ã£o
      // Isso atualiza o fornecedorOriginal com os dados corretos do servidor
      if (variables.fornecedorId) {
        // Buscar diretamente sem usar cache
        const updatedFornecedor = await fornecedoresService.buscarPorId(variables.fornecedorId);
        
        if (import.meta.env.DEV) {
          console.log('[Remover Contato] Dados atualizados do servidor:', {
            contatosRecebidos: updatedFornecedor.contato?.length || 0,
            contatos: updatedFornecedor.contato?.map(c => ({
              id: c.id,
              telefone: c.telefone,
              nomeContato: c.nomeContato || c.nome_contato
            }))
          });
        }
        
        // âš ï¸ CRÃTICO: Atualizar fornecedorOriginal com dados do servidor
        // Isso garante que a validaÃ§Ã£o de endereÃ§os/contatos funcione corretamente
        setFornecedorOriginal(JSON.parse(JSON.stringify(updatedFornecedor)));
        
        // Atualizar estado local com os dados do servidor (sem o contato removido)
        if (updatedFornecedor.contato) {
          setEditContatos(
            updatedFornecedor.contato.map((cont) => ({
              // Garantir que ID seja nÃºmero
              id: cont.id ? Number(cont.id) : undefined,
              telefone: cont.telefone || "",
              email: cont.email || "",
              nomeContato: cont.nomeContato || cont.nome_contato || "",
              outroTelefone: cont.outroTelefone || cont.outro_telefone || "",
              nomeOutroTelefone: cont.nomeOutroTelefone || cont.nome_outro_telefone || "",
              observacao: cont.observacao || "",
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
      // Se for 404, o contato jÃ¡ nÃ£o existe - nÃ£o mostrar erro crÃ­tico
      if (error?.response?.status === 404) {
        const errorMessage = error?.response?.data?.message || "Contato jÃ¡ nÃ£o existe";
        console.warn('[Remover Contato] Contato nÃ£o encontrado (404):', errorMessage);
        // NÃ£o mostrar toast de erro, pois jÃ¡ foi tratado no onClick
        return;
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao remover contato";
      toast.error(errorMessage);
    },
  });

  // Mutation para adicionar contato
  const adicionarContatoMutation = useMutation({
    mutationFn: async ({ fornecedorId, contato }: { fornecedorId: number; contato: any }) => {
      return await fornecedoresService.adicionarContato(fornecedorId, contato);
    },
    onSuccess: async (novoContato, variables) => {
      // Invalidar queries para atualizar a lista
      await queryClient.invalidateQueries({
        queryKey: ["fornecedor", variables.fornecedorId],
        exact: true,
      });
      
      // âš ï¸ IMPORTANTE: Recarregar dados do fornecedor para garantir sincronizaÃ§Ã£o
      // Isso atualiza o fornecedorOriginal com os dados corretos do servidor
      if (variables.fornecedorId) {
        const updatedFornecedor = await fornecedoresService.buscarPorId(variables.fornecedorId);
        
        // âš ï¸ CRÃTICO: Atualizar fornecedorOriginal com dados do servidor
        // Isso garante que a validaÃ§Ã£o de endereÃ§os/contatos funcione corretamente
        setFornecedorOriginal(JSON.parse(JSON.stringify(updatedFornecedor)));
        
        if (updatedFornecedor.contato) {
          setEditContatos(
            updatedFornecedor.contato.map((cont) => ({
              id: cont.id,
              telefone: cont.telefone || "",
              email: cont.email || "",
              nomeContato: cont.nomeContato || cont.nome_contato || "",
              outroTelefone: cont.outroTelefone || cont.outro_telefone || "",
              nomeOutroTelefone: cont.nomeOutroTelefone || cont.nome_outro_telefone || "",
              observacao: cont.observacao || "",
              ativo: cont.ativo !== undefined ? cont.ativo : true,
            }))
          );
        }
      }
      
      toast.success("Contato adicionado com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao adicionar contato";
      toast.error(errorMessage);
    },
  });

  // ForÃ§ar refetch quando o dialog de ediÃ§Ã£o abrir
  // âš ï¸ IMPORTANTE: Sempre buscar dados atualizados do servidor ao abrir o dialog
  // Isso garante que temos os dados mais recentes e evita problemas de sincronizaÃ§Ã£o
  useEffect(() => {
    if (editDialogOpen && selectedFornecedorId) {
      // ForÃ§ar busca de dados atualizados do servidor
      queryClient.refetchQueries({
        queryKey: ["fornecedor", selectedFornecedorId],
      }).then(() => {
        // ApÃ³s refetch, garantir que os dados estÃ£o sincronizados
        if (import.meta.env.DEV) {
          console.log("[Dialog] Dados recarregados do servidor para garantir sincronizaÃ§Ã£o");
        }
      });
    }
  }, [editDialogOpen, selectedFornecedorId, queryClient]);

  // Carregar dados do fornecedor quando abrir o dialog de ediÃ§Ã£o
  useEffect(() => {
    if (editDialogOpen && selectedFornecedor && selectedFornecedorId) {
      // Debug: verificar dados carregados
      if (import.meta.env.DEV) {
        console.log("[Dialog EdiÃ§Ã£o] Dados carregados:", {
          selectedFornecedor,
          enderecos: selectedFornecedor.enderecos,
          contatos: selectedFornecedor.contato
        });
      }
      
      // Salvar dados originais para comparaÃ§Ã£o (deep copy)
      setFornecedorOriginal(JSON.parse(JSON.stringify(selectedFornecedor)));
      
      // Preencher formulÃ¡rio com dados do fornecedor
      setEditFornecedor({
        nome_fantasia: selectedFornecedor.nome_fantasia || "",
        // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE - nÃ£o usar
        tipoFornecedor: selectedFornecedor.tipoFornecedor || "PESSOA_FISICA",
        statusFornecedor: selectedFornecedor.statusFornecedor || "ATIVO",
        cpf_cnpj: selectedFornecedor.cpf_cnpj || "",
        inscricao_estadual: selectedFornecedor.inscricao_estadual || "",
      });

      // Preencher endereÃ§os
      if (selectedFornecedor.enderecos && selectedFornecedor.enderecos.length > 0) {
        setEditEnderecos(
          selectedFornecedor.enderecos.map((end) => ({
            // Garantir que ID seja nÃºmero
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

      // Preencher contatos
      if (selectedFornecedor.contato && selectedFornecedor.contato.length > 0) {
        setEditContatos(
          selectedFornecedor.contato.map((cont) => ({
            // Garantir que ID seja nÃºmero
            id: cont.id ? Number(cont.id) : undefined,
            telefone: cont.telefone || "",
            email: cont.email || "",
            nomeContato: cont.nomeContato || cont.nome_contato || "",
            outroTelefone: cont.outroTelefone || cont.outro_telefone || "",
            nomeOutroTelefone: cont.nomeOutroTelefone || cont.nome_outro_telefone || "",
            observacao: cont.observacao || "",
            ativo: cont.ativo !== undefined ? cont.ativo : true,
          }))
        );
      } else {
        setEditContatos([]);
      }
    }
  }, [editDialogOpen, selectedFornecedor, selectedFornecedorId]);

  // Resetar estados quando fechar o dialog
  useEffect(() => {
    if (!editDialogOpen) {
      setEditFornecedor({
        nome_fantasia: "",
        // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE - nÃ£o usar
        tipoFornecedor: "PESSOA_FISICA",
        statusFornecedor: "ATIVO",
        cpf_cnpj: "",
        inscricao_estadual: "",
      });
      setEditEnderecos([]);
      setEditContatos([]);
      setFornecedorOriginal(null);
    }
  }, [editDialogOpen]);

  // FunÃ§Ãµes helper conforme GUIA_ADAPTACAO_FRONTEND_CAMPOS_VAZIOS.md
  /**
   * Compara dois valores considerando null/undefined/string vazia como equivalentes
   * Conforme guia: null, undefined e '' sÃ£o tratados como equivalentes
   */
  const normalizarParaComparacao = (valor: any): any => {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    // Boolean nÃ£o deve ser normalizado
    if (typeof valor === 'boolean') {
      return valor;
    }
    // String: trim antes de comparar
    return typeof valor === 'string' ? valor.trim() : valor;
  };

  /**
   * Prepara campo para envio ao backend
   * - undefined = nÃ£o altera (nÃ£o inclui no payload)
   * - "" = limpa (inclui no payload como "")
   * - valor = atualiza (inclui no payload)
   * 
   * Conforme GUIA_ADAPTACAO_FRONTEND_CAMPOS_VAZIOS.md:
   * - undefined â†’ nÃ£o altera
   * - "" â†’ limpa (NULL no banco)
   * - "valor" â†’ atualiza
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

    // Se nÃ£o mudou, nÃ£o enviar (undefined = nÃ£o altera)
    if (novoNormalizado === originalNormalizado) {
      return undefined;
    }

    // Se mudou, determinar o que enviar
    // Conforme guia: "" limpa o campo (NULL no banco)
    // Se o novo valor Ã© null/undefined/string vazia, enviar "" para limpar
    if (valorNovo === null || valorNovo === undefined || valorNovo === '') {
      return '';
    }

    // Se tem valor, enviar o valor normalizado (trim se for string)
    return typeof valorNovo === 'string' ? valorNovo.trim() : valorNovo;
  };

  // FunÃ§Ã£o para preparar payload conforme GUIA_FRONTEND_ATUALIZACAO_FORNECEDOR.md
  // e GUIA_ADAPTACAO_FRONTEND_CAMPOS_VAZIOS.md
  // 
  // Regras principais:
  // 1. Campos do fornecedor: apenas se alterados
  // 2. EndereÃ§os: incluir TODOS os existentes (com ID) quando atualizar via payload
  // 3. Contatos: incluir TODOS os existentes (com ID) quando atualizar via payload
  // 4. Campos vazios "" sÃ£o enviados para limpar (NULL no banco)
  // 5. Campos undefined nÃ£o sÃ£o enviados (nÃ£o alteram)
  const prepararPayload = (): Partial<CreateFornecedorDto> => {
    const payload: Partial<CreateFornecedorDto> = {};

    // âš ï¸ VALIDAÃ‡ÃƒO CRÃTICA: Verificar se temos dados vÃ¡lidos do fornecedor original
    if (!fornecedorOriginal || !fornecedorOriginal.id) {
      if (import.meta.env.DEV) {
        console.error("[prepararPayload] Fornecedor original nÃ£o encontrado ou invÃ¡lido!", {
          fornecedorOriginal,
          selectedFornecedorId
        });
      }
      return payload;
    }
    
    // âš ï¸ VALIDAÃ‡ÃƒO: Garantir que o fornecedor original tem ID vÃ¡lido
    const fornecedorId = Number(fornecedorOriginal.id);
    if (!fornecedorId || isNaN(fornecedorId) || fornecedorId <= 0) {
      if (import.meta.env.DEV) {
        console.error("[prepararPayload] ID do fornecedor invÃ¡lido!", {
          fornecedorId: fornecedorOriginal.id,
          fornecedorOriginal
        });
      }
      return payload;
    }

    // Campos do fornecedor - apenas se alterados
    // Conforme guia: comparar antes de enviar, undefined = nÃ£o altera
    
    // nome_fantasia (snake_case, string)
    const nomeFantasia = prepararCampoParaEnvio(
      editFornecedor.nome_fantasia,
      fornecedorOriginal.nome_fantasia
    );
    if (nomeFantasia !== undefined) {
      payload.nome_fantasia = nomeFantasia;
    }
    
    // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE - nÃ£o enviar
    
    // tipoFornecedor (camelCase, enum)
    if (editFornecedor.tipoFornecedor !== fornecedorOriginal.tipoFornecedor) {
      payload.tipoFornecedor = editFornecedor.tipoFornecedor;
    }
    
    
    // cpf_cnpj (snake_case, string)
    const cpfCnpj = prepararCampoParaEnvio(
      editFornecedor.cpf_cnpj,
      fornecedorOriginal.cpf_cnpj
    );
    if (cpfCnpj !== undefined) {
      payload.cpf_cnpj = cpfCnpj;
    }
    
    // inscricao_estadual (snake_case, string | null)
    // Campo opcional: "" limpa (NULL), undefined nÃ£o altera
    // Conforme GUIA_ADAPTACAO_FRONTEND_CAMPOS_VAZIOS.md: "" serÃ¡ convertido para NULL no backend
    const inscricaoEstadual = prepararCampoParaEnvio(
      editFornecedor.inscricao_estadual,
      fornecedorOriginal.inscricao_estadual
    );
    if (inscricaoEstadual !== undefined) {
      // Enviar "" quando limpar (backend converte para NULL)
      // Enviar valor quando atualizar
      payload.inscricao_estadual = inscricaoEstadual;
    }

    // EndereÃ§os - Conforme GUIA_FRONTEND_ATUALIZACAO_FORNECEDOR.md
    // âš ï¸ IMPORTANTE: Quando enviar array de endereÃ§os, deve incluir TODOS os endereÃ§os que devem ser mantidos
    // - Array enviado â†’ Apenas os itens no array serÃ£o mantidos (os outros serÃ£o removidos)
    // - Array vazio [] â†’ Remove TODOS os endereÃ§os
    // - Array nÃ£o enviado (undefined) â†’ MantÃ©m TODOS os endereÃ§os existentes (nÃ£o altera)
    // 
    // Novos endereÃ§os (sem ID) sÃ£o adicionados via endpoint POST /fornecedor/:id/enderecos
    // EndereÃ§os removidos sÃ£o deletados via endpoint DELETE /fornecedor/:id/enderecos/:enderecoId
    // Aqui processamos apenas atualizaÃ§Ãµes de endereÃ§os existentes via payload principal
    
    // Processar apenas endereÃ§os EXISTENTES (com ID) para atualizaÃ§Ã£o via payload
    // âš ï¸ VALIDAÃ‡ÃƒO CRÃTICA: Garantir que apenas endereÃ§os que pertencem ao fornecedor sejam incluÃ­dos
    const enderecosExistentes = editEnderecos.filter(end => end.id);
    if (enderecosExistentes.length > 0) {
      const enderecosProcessados = enderecosExistentes.map((end) => {
        const endId = Number(end.id);
        
        // âš ï¸ VALIDAÃ‡ÃƒO: Verificar se o endereÃ§o existe no fornecedor original
        // Isso garante que apenas endereÃ§os que realmente pertencem ao fornecedor sejam incluÃ­dos
        const original = fornecedorOriginal.enderecos?.find((e: any) => {
          const originalId = Number(e.id);
          return originalId === endId;
        });

        if (!original) {
          if (import.meta.env.DEV) {
            console.warn(`[EndereÃ§o ${endId}] EndereÃ§o nÃ£o encontrado no fornecedor original! Este endereÃ§o serÃ¡ ignorado.`, {
              enderecoId: endId,
              fornecedorId: fornecedorOriginal.id,
              enderecosOriginais: fornecedorOriginal.enderecos?.map((e: any) => e.id)
            });
          }
          // âš ï¸ IMPORTANTE: NÃ£o incluir endereÃ§os que nÃ£o pertencem ao fornecedor
          // Isso evita o erro "EndereÃ§o com ID X nÃ£o pertence a este fornecedor"
          return null;
        }

        // âš ï¸ VALIDAÃ‡ÃƒO ADICIONAL: Verificar se o ID Ã© vÃ¡lido
        if (!endId || isNaN(endId) || endId <= 0) {
          if (import.meta.env.DEV) {
            console.warn(`[EndereÃ§o] ID invÃ¡lido: ${end.id}. EndereÃ§o serÃ¡ ignorado.`);
          }
          return null;
        }

        // âš ï¸ Conforme guia: Sempre incluir TODOS os campos do endereÃ§o
        // Campos vazios "" sÃ£o enviados para limpar (NULL no banco)
        const enderecoPayload: any = { 
          id: endId,
          // Campos obrigatÃ³rios - sempre enviar (mesmo que vazios)
          cep: end.cep?.trim() ?? "",
          logradouro: end.logradouro?.trim() ?? "",
          numero: end.numero?.trim() ?? "",
          bairro: end.bairro?.trim() ?? "",
          cidade: end.cidade?.trim() ?? "",
          estado: end.estado?.trim() ?? "",
          // Campos opcionais - sempre enviar ("" limpa, valor atualiza)
          complemento: end.complemento?.trim() ?? "",
          referencia: end.referencia?.trim() ?? ""
        };

        return enderecoPayload;
      }).filter((e) => e !== null) as any;

      // âš ï¸ IMPORTANTE: Incluir TODOS os endereÃ§os existentes no payload
      // Conforme guia: apenas os itens no array serÃ£o mantidos
      if (enderecosProcessados.length > 0) {
        // âš ï¸ VALIDAÃ‡ÃƒO FINAL: Verificar se todos os IDs sÃ£o vÃ¡lidos e pertencem ao fornecedor
        const enderecosValidos = enderecosProcessados.filter(end => {
          const isValid = end.id && 
                         Number(end.id) > 0 && 
                         fornecedorOriginal.enderecos?.some((e: any) => Number(e.id) === Number(end.id));
          
          if (!isValid && import.meta.env.DEV) {
            console.error(`[VALIDAÃ‡ÃƒO] EndereÃ§o com ID ${end.id} nÃ£o pertence ao fornecedor ${fornecedorOriginal.id}!`, {
              enderecoId: end.id,
              fornecedorId: fornecedorOriginal.id,
              enderecosOriginais: fornecedorOriginal.enderecos?.map((e: any) => ({ id: e.id, fornecedorId: e.fornecedorId }))
            });
          }
          
          return isValid;
        });
        
        if (enderecosValidos.length !== enderecosProcessados.length && import.meta.env.DEV) {
          console.warn(`[VALIDAÃ‡ÃƒO] ${enderecosProcessados.length - enderecosValidos.length} endereÃ§o(s) invÃ¡lido(s) foram filtrados!`, {
            totalProcessados: enderecosProcessados.length,
            totalValidos: enderecosValidos.length,
            enderecosInvalidos: enderecosProcessados.filter(end => 
              !enderecosValidos.some(e => e.id === end.id)
            )
          });
        }
        
        // SÃ³ incluir se houver endereÃ§os vÃ¡lidos
        if (enderecosValidos.length > 0) {
          payload.enderecos = enderecosValidos;
          
          // Debug: log dos endereÃ§os processados
          if (import.meta.env.DEV) {
            console.log("[EndereÃ§os Processados (Conforme Guia)]:", {
              totalProcessados: enderecosProcessados.length,
              totalValidos: enderecosValidos.length,
              fornecedorId: fornecedorOriginal.id,
              enderecosProcessados: enderecosValidos,
              nota: "Apenas endereÃ§os vÃ¡lidos que pertencem ao fornecedor incluÃ­dos no payload"
            });
          }
        }
      }
    }

    // Contatos - Conforme GUIA_FRONTEND_ATUALIZACAO_FORNECEDOR.md
    // âš ï¸ IMPORTANTE: Quando enviar array de contatos, deve incluir TODOS os contatos que devem ser mantidos
    // - Array enviado â†’ Apenas os itens no array serÃ£o mantidos (os outros serÃ£o removidos)
    // - Array vazio [] â†’ Remove TODOS os contatos
    // - Array nÃ£o enviado (undefined) â†’ MantÃ©m TODOS os contatos existentes (nÃ£o altera)
    //
    // Novos contatos (sem ID) sÃ£o adicionados via endpoint POST /fornecedor/:id/contatos
    // Contatos removidos sÃ£o deletados via endpoint DELETE /fornecedor/:id/contatos/:contatoId
    // Aqui processamos apenas atualizaÃ§Ãµes de contatos existentes via payload principal
    
    // Processar apenas contatos EXISTENTES (com ID) para atualizaÃ§Ã£o via payload
    // âš ï¸ VALIDAÃ‡ÃƒO CRÃTICA: Garantir que apenas contatos que pertencem ao fornecedor sejam incluÃ­dos
    const contatosExistentes = editContatos.filter(cont => cont.id);
    if (contatosExistentes.length > 0) {
      const contatosProcessados = contatosExistentes.map((cont) => {
        const contId = Number(cont.id);
        
        // âš ï¸ VALIDAÃ‡ÃƒO: Verificar se o contato existe no fornecedor original
        // Isso garante que apenas contatos que realmente pertencem ao fornecedor sejam incluÃ­dos
        const original = fornecedorOriginal.contato?.find((c: any) => {
          const originalId = Number(c.id);
          return originalId === contId;
        });

        if (!original) {
          if (import.meta.env.DEV) {
            console.warn(`[Contato ${contId}] Contato nÃ£o encontrado no fornecedor original! Este contato serÃ¡ ignorado.`, {
              contatoId: contId,
              fornecedorId: fornecedorOriginal.id,
              contatosOriginais: fornecedorOriginal.contato?.map((c: any) => c.id)
            });
          }
          // âš ï¸ IMPORTANTE: NÃ£o incluir contatos que nÃ£o pertencem ao fornecedor
          // Isso evita o erro "Contato com ID X nÃ£o pertence a este fornecedor"
          return null;
        }

        // âš ï¸ VALIDAÃ‡ÃƒO ADICIONAL: Verificar se o ID Ã© vÃ¡lido
        if (!contId || isNaN(contId) || contId <= 0) {
          if (import.meta.env.DEV) {
            console.warn(`[Contato] ID invÃ¡lido: ${cont.id}. Contato serÃ¡ ignorado.`);
          }
          return null;
        }

        // âš ï¸ Conforme guia e padrÃ£o do mÃ³dulo de cliente: Sempre incluir TODOS os campos
        // Campos vazios "" sÃ£o enviados para limpar (NULL no banco)
        const contatoPayload: any = { 
          id: contId,
          // Campos obrigatÃ³rios - sempre enviar (mesmo que vazios)
          telefone: cont.telefone?.trim() ?? "",
          email: cont.email?.trim() ?? "",
          nome_contato: cont.nomeContato?.trim() ?? "",
          // Campos opcionais - sempre enviar ("" limpa, valor atualiza)
          outro_telefone: cont.outroTelefone?.trim() ?? "",
          nome_outro_telefone: cont.nomeOutroTelefone?.trim() ?? "",
          observacao: cont.observacao?.trim() ?? "",
          ativo: cont.ativo !== undefined ? cont.ativo : (original.ativo !== undefined ? original.ativo : true)
        };

        return contatoPayload;
      }).filter((c) => c !== null) as any;

      // âš ï¸ IMPORTANTE: Incluir TODOS os contatos existentes no payload
      // Conforme guia: apenas os itens no array serÃ£o mantidos
      if (contatosProcessados.length > 0) {
        // âš ï¸ VALIDAÃ‡ÃƒO FINAL: Verificar se todos os IDs sÃ£o vÃ¡lidos e pertencem ao fornecedor
        const contatosValidos = contatosProcessados.filter(cont => {
          const isValid = cont.id && 
                         Number(cont.id) > 0 && 
                         fornecedorOriginal.contato?.some((c: any) => Number(c.id) === Number(cont.id));
          
          if (!isValid && import.meta.env.DEV) {
            console.error(`[VALIDAÃ‡ÃƒO] Contato com ID ${cont.id} nÃ£o pertence ao fornecedor ${fornecedorOriginal.id}!`, {
              contatoId: cont.id,
              fornecedorId: fornecedorOriginal.id,
              contatosOriginais: fornecedorOriginal.contato?.map((c: any) => ({ id: c.id, fornecedorId: c.fornecedorId }))
            });
          }
          
          return isValid;
        });
        
        if (contatosValidos.length !== contatosProcessados.length && import.meta.env.DEV) {
          console.warn(`[VALIDAÃ‡ÃƒO] ${contatosProcessados.length - contatosValidos.length} contato(s) invÃ¡lido(s) foram filtrados!`, {
            totalProcessados: contatosProcessados.length,
            totalValidos: contatosValidos.length,
            contatosInvalidos: contatosProcessados.filter(cont => 
              !contatosValidos.some(c => c.id === cont.id)
            )
          });
        }
        
        // SÃ³ incluir se houver contatos vÃ¡lidos
        if (contatosValidos.length > 0) {
          payload.contato = contatosValidos;
          
          // Debug: log dos contatos processados
          if (import.meta.env.DEV) {
            console.log("[Contatos Processados (Conforme Guia)]:", {
              totalProcessados: contatosProcessados.length,
              totalValidos: contatosValidos.length,
              fornecedorId: fornecedorOriginal.id,
              contatosProcessados: contatosValidos,
              nota: "Apenas contatos vÃ¡lidos que pertencem ao fornecedor incluÃ­dos no payload"
            });
          }
        }
      }
    }

    return payload;
  };

  // Mutation para deletar fornecedor
  const deleteFornecedorMutation = useMutation({
    mutationFn: async (id: number) => {
      return await fornecedoresService.deletar(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fornecedores"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["fornecedores-estatisticas"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["fornecedores-todos-estatisticas"],
      });
      toast.success("Fornecedor excluÃ­do com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedFornecedorId(null);
    },
    onError: (error: unknown) => {
      const errorMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(errorMessage || "Erro ao excluir fornecedor");
    },
  });


  const handleAplicarFiltros = () => {
    setFiltrosDialogOpen(false);
    setCurrentPage(1); // Resetar para primeira pÃ¡gina ao aplicar filtros
    // A query serÃ¡ atualizada automaticamente pelo React Query
  };

  const handleLimparFiltros = () => {
    setFiltrosAvancados({
      tipoFornecedor: "",
      statusFornecedor: "",
      cidade: "",
      estado: "",
      logradouro: "",
      telefone: "",
      email: "",
      nomeContato: "",
    });
    setFiltrosDialogOpen(false);
    setCurrentPage(1); // Resetar para primeira pÃ¡gina ao limpar filtros
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll para o topo da tabela
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={Building2}
          title="Fornecedores"
          subtitle="Cadastro e gestÃ£o de fornecedores, com visÃ£o rÃ¡pida de status e volume."
          loadingHint={isLoadingEstatisticas ? "Carregando resumoâ€¦" : undefined}
          actions={
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => navigate("/fornecedores/novo")}
            >
              <Plus className="w-4 h-4" />
              Criar Fornecedor
            </Button>
          }
        />

        <ModuleStatCards
          isLoading={isLoadingEstatisticas}
          columns={5}
          items={fornecedorStatItems}
        />

        {/* Search and Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex gap-4">
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
                      Filtros AvanÃ§ados
                    </SheetTitle>
                  </div>
                  <SheetDescription>Refine sua busca</SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Tipo de Fornecedor */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Tipo de Fornecedor
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFiltrosAvancados({
                            ...filtrosAvancados,
                            tipoFornecedor: "",
                          })
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          !filtrosAvancados.tipoFornecedor
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        <Circle
                          className={`w-4 h-4 ${
                            !filtrosAvancados.tipoFornecedor
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
                            tipoFornecedor: "PESSOA_JURIDICA",
                          })
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          filtrosAvancados.tipoFornecedor === "PESSOA_JURIDICA"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        <Building2
                          className={`w-4 h-4 ${
                            filtrosAvancados.tipoFornecedor ===
                            "PESSOA_JURIDICA"
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          Pessoa JurÃ­dica
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFiltrosAvancados({
                            ...filtrosAvancados,
                            tipoFornecedor: "PESSOA_FISICA",
                          })
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          filtrosAvancados.tipoFornecedor === "PESSOA_FISICA"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        <User
                          className={`w-4 h-4 ${
                            filtrosAvancados.tipoFornecedor === "PESSOA_FISICA"
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          Pessoa FÃ­sica
                        </span>
                      </button>
                    </div>
                  </div>

                  <Separator />

                  {/* Status */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Status</Label>
                    <RadioGroup
                      value={filtrosAvancados.statusFornecedor || "none"}
                      onValueChange={(value) =>
                        setFiltrosAvancados({
                          ...filtrosAvancados,
                          statusFornecedor: value === "none" ? "" : value,
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
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* LocalizaÃ§Ã£o */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      LOCALIZAÃ‡ÃƒO
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
                          placeholder="Digite o logradouro (Ex: Rua, Avenida, etc.)"
                          value={filtrosAvancados.logradouro}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              logradouro: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Digite o nome completo ou parcial do logradouro
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado (UF)</Label>
                        <Input
                          id="estado"
                          placeholder="Digite a UF (ex: PE, SP, RJ)"
                          value={filtrosAvancados.estado}
                          onChange={(e) =>
                            setFiltrosAvancados({
                              ...filtrosAvancados,
                              estado: e.target.value.toUpperCase().trim(),
                            })
                          }
                          maxLength={2}
                          className="uppercase"
                        />
                        {filtrosAvancados.estado && filtrosAvancados.estado.length === 2 && (
                          <p className="text-xs text-muted-foreground">
                            Filtrando por: {filtrosAvancados.estado}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>


                  {/* BotÃµes de aÃ§Ã£o */}
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
                placeholder="Buscar por razÃ£o social, nome fantasia, CNPJ ou CPF..."
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
                <TableHead>CNPJ</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingFornecedores ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando fornecedores...
                    </div>
                  </TableCell>
                </TableRow>
              ) : fornecedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="w-12 h-12 text-muted-foreground/50" />
                      {temFiltrosAvancados ? (
                        <>
                          <p className="font-semibold text-destructive">Nenhum fornecedor encontrado</p>
                          <p className="text-sm text-muted-foreground">
                            NÃ£o foram encontrados fornecedores com os filtros de endereÃ§o aplicados.
                            {filtrosAvancados.logradouro?.trim() && <span> Cidade: {filtrosAvancados.logradouro}</span>}
                            {filtrosAvancados.estado?.trim() && <span> Estado: {filtrosAvancados.estado}</span>}
                          </p>
                        </>
                      ) : (
                        <p>Nenhum fornecedor encontrado</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                fornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {fornecedor.nome_fantasia || "-"}
                        </span>
                        {/* Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE - nÃ£o exibir */}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">
                        {fornecedor.cpf_cnpj 
                          ? (() => {
                              const cleaned = cleanDocument(fornecedor.cpf_cnpj);
                              if (!cleaned) return fornecedor.cpf_cnpj;
                              if (fornecedor.tipoFornecedor === "PESSOA_FISICA" && cleaned.length === 11) {
                                return formatCPF(cleaned);
                              } else if (fornecedor.tipoFornecedor === "PESSOA_JURIDICA" && cleaned.length === 14) {
                                return formatCNPJ(cleaned);
                              }
                              return fornecedor.cpf_cnpj;
                            })()
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {fornecedor.contato && fornecedor.contato.length > 0
                            ? fornecedor.contato[0].email || "-"
                            : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {fornecedor.contato && fornecedor.contato.length > 0 && fornecedor.contato[0].telefone
                            ? (() => {
                                const cleaned = cleanDocument(fornecedor.contato[0].telefone);
                                return cleaned.length >= 10 ? formatTelefone(cleaned) : fornecedor.contato[0].telefone;
                              })()
                            : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fornecedor.statusFornecedor}
                        onValueChange={(value) => {
                          if (value !== fornecedor.statusFornecedor) {
                            handleStatusChange(fornecedor.id, value as "ATIVO" | "INATIVO" | "BLOQUEADO");
                          }
                        }}
                        disabled={updatingStatusId === fornecedor.id}
                      >
                        <SelectTrigger
                          className={`h-7 w-[140px] text-xs font-medium rounded-full border-0 shadow-none hover:opacity-80 transition-opacity ${
                            fornecedor.statusFornecedor === "ATIVO"
                              ? "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                              : fornecedor.statusFornecedor === "INATIVO"
                              ? "bg-muted/50 text-muted-foreground border border-border"
                              : "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                          }`}
                        >
                          <SelectValue>
                            {updatingStatusId === fornecedor.id ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Atualizando...</span>
                              </div>
                            ) : (
                              fornecedor.statusFornecedor === "ATIVO"
                                ? "Ativo"
                                : fornecedor.statusFornecedor === "INATIVO"
                                ? "Inativo"
                                : "Bloqueado"
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
                          <SelectItem value="BLOQUEADO">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              Bloqueado
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TableRowActionsMenu>
                          <DropdownMenuItem onClick={() => handleView(fornecedor.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(fornecedor.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(fornecedor.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                      </TableRowActionsMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* PaginaÃ§Ã£o */}
          {totalPages > 1 && (
            <div className="border-t border-border p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          handlePageChange(currentPage - 1);
                        }
                      }}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {/* Primeira pÃ¡gina */}
                  {currentPage > 3 && (
                    <>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(1);
                          }}
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

                  {/* PÃ¡ginas ao redor da atual */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => {
                      // Adicionar ellipsis se houver gap
                      const prevPage = array[index - 1];
                      const showEllipsisBefore =
                        index > 0 && page - prevPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(page);
                              }}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      );
                    })}

                  {/* Ãšltima pÃ¡gina */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(totalPages);
                          }}
                          className="cursor-pointer"
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          handlePageChange(currentPage + 1);
                        }
                      }}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              
              {/* Info de paginaÃ§Ã£o */}
              <div className="text-center text-sm text-muted-foreground mt-4">
                Mostrando {fornecedores.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a{" "}
                {Math.min(currentPage * pageSize, totalFornecedores)} de{" "}
                {totalFornecedores} fornecedores
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de VisualizaÃ§Ã£o */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Visualizar Fornecedor
            </DialogTitle>
            <DialogDescription>
              InformaÃ§Ãµes completas do fornecedor
            </DialogDescription>
          </DialogHeader>

          {isLoadingFornecedor ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : selectedFornecedor ? (
            <div className="space-y-8 mt-6">
              {/* InformaÃ§Ãµes BÃ¡sicas */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  InformaÃ§Ãµes BÃ¡sicas
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {selectedFornecedor.nome_fantasia && (
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">
                        Nome Fantasia
                      </Label>
                      <p className="font-medium text-base">
                        {selectedFornecedor.nome_fantasia}
                      </p>
                    </div>
                  )}
                  {/* Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE - nÃ£o exibir */}
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      CPF/CNPJ
                    </Label>
                    <p className="font-medium text-base font-mono">
                      {selectedFornecedor.cpf_cnpj 
                        ? (() => {
                            const cleaned = cleanDocument(selectedFornecedor.cpf_cnpj);
                            if (!cleaned) return selectedFornecedor.cpf_cnpj;
                            if (selectedFornecedor.tipoFornecedor === "PESSOA_FISICA" && cleaned.length === 11) {
                              return formatCPF(cleaned);
                            } else if (selectedFornecedor.tipoFornecedor === "PESSOA_JURIDICA" && cleaned.length === 14) {
                              return formatCNPJ(cleaned);
                            }
                            return selectedFornecedor.cpf_cnpj;
                          })()
                        : "-"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      InscriÃ§Ã£o Estadual
                    </Label>
                    <p className="font-medium text-base">
                      {selectedFornecedor.inscricao_estadual || "-"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      Tipo
                    </Label>
                    <p className="font-medium text-base">
                      {selectedFornecedor.tipoFornecedor === "PESSOA_FISICA"
                        ? "Pessoa FÃ­sica"
                        : "Pessoa JurÃ­dica"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">
                        Status
                      </Label>
                      <span
                        className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${
                          selectedFornecedor.statusFornecedor === "ATIVO"
                            ? "bg-green-500/10 text-green-500"
                            : selectedFornecedor.statusFornecedor === "INATIVO"
                            ? "bg-muted text-muted-foreground"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {selectedFornecedor.statusFornecedor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* EndereÃ§os */}
              {selectedFornecedor.enderecos &&
                selectedFornecedor.enderecos.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      EndereÃ§os ({selectedFornecedor.enderecos.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedFornecedor.enderecos.map((endereco, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                CEP
                              </Label>
                              <p>
                                {endereco.cep 
                                  ? (() => {
                                      const cleaned = cleanDocument(endereco.cep);
                                      return cleaned.length === 8 ? formatCEP(cleaned) : endereco.cep;
                                    })()
                                  : "-"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Logradouro
                              </Label>
                              <p>{endereco.logradouro || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                NÃºmero
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
                                ReferÃªncia
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
              {selectedFornecedor.contato &&
                selectedFornecedor.contato.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      Contatos ({selectedFornecedor.contato.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedFornecedor.contato.map((contato, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Telefone
                              </Label>
                              <p>
                                {contato.telefone 
                                  ? (() => {
                                      const cleaned = cleanDocument(contato.telefone);
                                      return cleaned.length >= 10 ? formatTelefone(cleaned) : contato.telefone;
                                    })()
                                  : "-"}
                              </p>
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
                            <div className="col-span-2">
                              <Label className="text-xs text-muted-foreground">
                                ObservaÃ§Ã£o
                              </Label>
                              <p>{contato.observacao || "-"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Datas */}
              {(selectedFornecedor.criandoEm || selectedFornecedor.atualizadoEm) && (
                <div className="space-y-2 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    InformaÃ§Ãµes do Sistema
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedFornecedor.criandoEm && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Criado em
                        </Label>
                        <p>
                          {new Date(selectedFornecedor.criandoEm).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    )}
                    {selectedFornecedor.atualizadoEm && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Atualizado em
                        </Label>
                        <p>
                          {new Date(
                            selectedFornecedor.atualizadoEm
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
              Fornecedor nÃ£o encontrado
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de ExclusÃ£o */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Excluir Fornecedor
            </DialogTitle>
            <DialogDescription>
              Esta aÃ§Ã£o nÃ£o pode ser desfeita. O fornecedor serÃ¡ permanentemente excluÃ­do.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedFornecedor && (
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir o fornecedor{" "}
                <span className="font-semibold text-foreground">
                  {selectedFornecedor.nome_fantasia}
                </span>
                ?
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedFornecedorId(null);
              }}
              className="flex-1"
              disabled={deleteFornecedorMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteFornecedorMutation.isPending}
              className="flex-1"
            >
              {deleteFornecedorMutation.isPending ? (
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

      {/* Modal de EdiÃ§Ã£o */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedFornecedorId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Editar Fornecedor
            </DialogTitle>
            <DialogDescription className="mt-1">
              Atualize as informaÃ§Ãµes do fornecedor
            </DialogDescription>
          </DialogHeader>

          {isLoadingFornecedor ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : selectedFornecedor ? (
            <div className="space-y-8 pt-6">
              {/* SeÃ§Ã£o: InformaÃ§Ãµes BÃ¡sicas */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Truck className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      InformaÃ§Ãµes BÃ¡sicas
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dados principais do fornecedor
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  {/* Tipo de Fornecedor */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Tipo de Fornecedor
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setEditFornecedor({
                            ...editFornecedor,
                            tipoFornecedor: "PESSOA_JURIDICA",
                          })
                        }
                        className={`relative p-6 rounded-lg border-2 transition-all ${
                          editFornecedor.tipoFornecedor === "PESSOA_JURIDICA"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {editFornecedor.tipoFornecedor === "PESSOA_JURIDICA" && (
                          <div className="absolute top-3 right-3">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-3">
                          <Building2
                            className={`w-8 h-8 ${
                              editFornecedor.tipoFornecedor === "PESSOA_JURIDICA"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="text-center">
                            <p className="font-semibold">Pessoa JurÃ­dica</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              CNPJ
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditFornecedor({
                            ...editFornecedor,
                            tipoFornecedor: "PESSOA_FISICA",
                          })
                        }
                        className={`relative p-6 rounded-lg border-2 transition-all ${
                          editFornecedor.tipoFornecedor === "PESSOA_FISICA"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {editFornecedor.tipoFornecedor === "PESSOA_FISICA" && (
                          <div className="absolute top-3 right-3">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-3">
                          <User
                            className={`w-8 h-8 ${
                              editFornecedor.tipoFornecedor === "PESSOA_FISICA"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="text-center">
                            <p className="font-semibold">Pessoa FÃ­sica</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              CPF
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Nome Fantasia - Sempre obrigatÃ³rio conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Nome Fantasia <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Nome Fantasia"
                      value={editFornecedor.nome_fantasia || ""}
                      onChange={(e) =>
                        setEditFornecedor({
                          ...editFornecedor,
                          nome_fantasia: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* CPF/CNPJ - Opcional conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      {editFornecedor.tipoFornecedor === "PESSOA_FISICA"
                        ? "CPF"
                        : "CNPJ"}
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      placeholder={
                        editFornecedor.tipoFornecedor === "PESSOA_FISICA"
                          ? "000.000.000-00"
                          : "00.000.000/0000-00"
                      }
                      value={editFornecedor.cpf_cnpj || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const cleaned = cleanDocument(value);
                        const tipo = editFornecedor.tipoFornecedor;
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
                        setEditFornecedor({
                          ...editFornecedor,
                          cpf_cnpj: formatted,
                        });
                      }}
                    />
                  </div>

                  {/* InscriÃ§Ã£o Estadual - Apenas para Pessoa JurÃ­dica */}
                  {editFornecedor.tipoFornecedor === "PESSOA_JURIDICA" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        InscriÃ§Ã£o Estadual
                      </Label>
                      <Input
                        placeholder="000.000.000.000"
                        value={editFornecedor.inscricao_estadual || ""}
                        onChange={(e) =>
                          setEditFornecedor({
                            ...editFornecedor,
                            inscricao_estadual: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                </div>
              </div>

              {/* SeÃ§Ã£o: EndereÃ§os */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MapPinIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">EndereÃ§os</h3>
                      <p className="text-sm text-muted-foreground">
                        LocalizaÃ§Ãµes do fornecedor
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
                          id: undefined,
                          cep: "",
                          logradouro: "",
                          numero: "",
                          complemento: "",
                          bairro: "",
                          cidade: "",
                          estado: "",
                          referencia: "",
                        },
                      ])
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar EndereÃ§o
                  </Button>
                </div>

                {editEnderecos.map((endereco, index) => (
                  <div
                    key={endereco.id ?? `new-${index}`}
                    className="space-y-4 p-4 border rounded-lg bg-background"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-semibold">
                          EndereÃ§o {index + 1}
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Abrir diÃ¡logo de confirmaÃ§Ã£o
                          setEnderecoParaDeletar({ index, endereco: editEnderecos[index] });
                        }}
                        disabled={removerEnderecoMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>CEP</Label>
                          <Input
                            placeholder="00000-000"
                            value={endereco.cep}
                            onChange={(e) => {
                              const formatted = formatCEP(e.target.value);
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, cep: formatted } : end
                                )
                              );
                            }}
                            maxLength={9}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Logradouro</Label>
                          <Input
                            placeholder="Rua, Avenida, etc."
                            value={endereco.logradouro}
                            onChange={(e) => {
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, logradouro: e.target.value } : end
                                )
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>NÃºmero</Label>
                          <Input
                            placeholder="123"
                            value={endereco.numero}
                            onChange={(e) => {
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, numero: e.target.value } : end
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Complemento</Label>
                          <Input
                            placeholder="Apto, Sala, etc."
                            value={endereco.complemento}
                            onChange={(e) => {
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, complemento: e.target.value } : end
                                )
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bairro</Label>
                          <Input
                            placeholder="Nome do bairro"
                            value={endereco.bairro}
                            onChange={(e) => {
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, bairro: e.target.value } : end
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cidade</Label>
                          <Input
                            placeholder="Nome da cidade"
                            value={endereco.cidade}
                            onChange={(e) => {
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, cidade: e.target.value } : end
                                )
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Estado (UF)</Label>
                          <Input
                            placeholder="SP"
                            maxLength={2}
                            value={endereco.estado}
                            onChange={(e) => {
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, estado: e.target.value.toUpperCase() } : end
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>ReferÃªncia</Label>
                          <Input
                            placeholder="Ponto de referÃªncia (mÃ¡x. 100 caracteres)"
                            value={endereco.referencia}
                            onChange={(e) => {
                              setEditEnderecos(prev =>
                                prev.map((end, i) =>
                                  i === index ? { ...end, referencia: e.target.value } : end
                                )
                              );
                            }}
                            maxLength={100}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* SeÃ§Ã£o: Contatos */}
              <div className="bg-card border rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <PhoneIcon className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Contatos</h3>
                      <p className="text-sm text-muted-foreground">
                        InformaÃ§Ãµes de contato do fornecedor
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
                          id: undefined,
                          telefone: "",
                          email: "",
                          nomeContato: "",
                          outroTelefone: "",
                          nomeOutroTelefone: "",
                          observacao: "",
                          ativo: true,
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
                    key={contato.id ?? `new-${index}`}
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
                            htmlFor={`edit-ativo-${index}`}
                            className="text-sm font-medium"
                          >
                            Ativo
                          </Label>
                          <Switch
                            id={`edit-ativo-${index}`}
                            checked={contato.ativo}
                            onCheckedChange={(checked) => {
                              setEditContatos(prev =>
                                prev.map((cont, i) =>
                                  i === index ? { ...cont, ativo: checked } : cont
                                )
                              );
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Abrir diÃ¡logo de confirmaÃ§Ã£o
                            setContatoParaDeletar({ index, contato: editContatos[index] });
                          }}
                          disabled={removerContatoMutation.isPending}
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
                            <span className="text-xs text-muted-foreground">(opcional)</span>
                          </Label>
                          <Input
                            placeholder="(00) 00000-0000"
                            value={contato.telefone}
                            onChange={(e) => {
                              const formatted = formatTelefone(e.target.value);
                              setEditContatos(prev =>
                                prev.map((cont, i) =>
                                  i === index ? { ...cont, telefone: formatted } : cont
                                )
                              );
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
                            value={contato.email}
                            onChange={(e) => {
                              setEditContatos(prev =>
                                prev.map((cont, i) =>
                                  i === index ? { ...cont, email: e.target.value } : cont
                                )
                              );
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
                          placeholder="Nome do responsÃ¡vel"
                          value={contato.nomeContato}
                          onChange={(e) => {
                            setEditContatos(prev =>
                              prev.map((cont, i) =>
                                i === index ? { ...cont, nomeContato: e.target.value } : cont
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ObservaÃ§Ã£o</Label>
                        <Input
                          placeholder="ObservaÃ§Ãµes sobre o contato (mÃ¡x. 500 caracteres)"
                          value={contato.observacao}
                          onChange={(e) => {
                            setEditContatos(prev =>
                              prev.map((cont, i) =>
                                i === index ? { ...cont, observacao: e.target.value } : cont
                              )
                            );
                          }}
                          maxLength={500}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BotÃµes de AÃ§Ã£o */}
              <div className="flex gap-3 pt-4 border-t mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedFornecedorId(null);
                  }}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  onClick={async () => {
                    if (!selectedFornecedorId || !fornecedorOriginal) return;
                    
                    setIsSavingFornecedor(true);
                    // Declarar variÃ¡veis fora do try para uso no catch
                    let formState: any = null;
                    let camposAlterados: string[] = [];
                    
                    try {
                      // Conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
                      // Usar mÃ©todo atualizarParcial que implementa a lÃ³gica completa do guia
                      
                      // Debug: verificar dados antes de preparar
                      if (import.meta.env.DEV) {
                        console.log('[Salvar Fornecedor] Dados do formulÃ¡rio:', {
                          editEnderecos: editEnderecos,
                          editEnderecosCount: editEnderecos.length,
                          enderecosNovos: editEnderecos.filter(e => !e.id).length,
                          enderecosExistentes: editEnderecos.filter(e => e.id).length,
                          fornecedorOriginalEnderecos: fornecedorOriginal.enderecos?.length || 0
                        });
                      }

                      // Preparar dados do formulÃ¡rio para o formato esperado
                      // Conforme GUIA_IMPLEMENTACAO_FRONTEND_FORNECEDOR.md: campo nome_razao NÃƒO EXISTE - nÃ£o enviar
                      const dadosEditados = {
                        nome_fantasia: editFornecedor.nome_fantasia,
                        tipoFornecedor: editFornecedor.tipoFornecedor,
                        cpf_cnpj: editFornecedor.cpf_cnpj,
                        inscricao_estadual: editFornecedor.inscricao_estadual,
                        enderecos: editEnderecos, // Sempre enviar array se houver endereÃ§os
                        contato: editContatos,
                      };

                      // Converter para FornecedorFormState e identificar campos alterados
                      const resultado = prepararAtualizacaoFornecedor(
                        fornecedorOriginal,
                        dadosEditados
                      );
                      formState = resultado.formState;
                      camposAlterados = resultado.camposAlterados;

                      // Debug: log do que serÃ¡ enviado
                      if (import.meta.env.DEV) {
                        console.log('[Salvar Fornecedor] Dados preparados:', {
                          camposAlterados,
                          enderecosCount: formState.enderecos.length,
                          enderecos: formState.enderecos,
                          contatosCount: formState.contato.length,
                          contatos: formState.contato
                        });
                      }

                      // Validar que temos um ID vÃ¡lido
                      if (!selectedFornecedorId) {
                        throw new Error('ID do fornecedor nÃ£o encontrado');
                      }

                      // Debug: log completo antes de enviar
                      if (import.meta.env.DEV) {
                        console.log('[Salvar Fornecedor] Antes de enviar:', {
                          fornecedorId: selectedFornecedorId,
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

                      // Atualizar usando o mÃ©todo parcial conforme o guia
                      const fornecedorAtualizado = await fornecedoresService.atualizarParcial(
                        selectedFornecedorId,
                        formState,
                        camposAlterados
                      );

                      // Debug: verificar resposta do backend
                      if (import.meta.env.DEV) {
                        console.log('[Salvar Fornecedor] Resposta do backend:', {
                          fornecedor: fornecedorAtualizado,
                          enderecos: fornecedorAtualizado.enderecos,
                          contatos: fornecedorAtualizado.contato
                        });
                      }

                      // Invalidar queries e mostrar sucesso
                      await queryClient.invalidateQueries({ 
                        queryKey: ["fornecedores"],
                        exact: false,
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ["fornecedor", selectedFornecedorId],
                      });
                      await queryClient.refetchQueries({ 
                        queryKey: ["fornecedores"],
                        exact: false,
                      });
                      
                      toast.success("Fornecedor atualizado com sucesso!");
                      setEditDialogOpen(false);
                      setSelectedFornecedorId(null);
                    } catch (error: any) {
                      // Log detalhado do erro
                      console.error('[Salvar Fornecedor] Erro completo:', {
                        error,
                        response: error?.response,
                        status: error?.response?.status,
                        statusText: error?.response?.statusText,
                        data: error?.response?.data,
                        message: error?.message,
                        fornecedorId: selectedFornecedorId,
                        payloadEnviado: {
                          camposAlterados,
                          enderecosCount: formState.enderecos.length,
                          enderecosNovos: formState.enderecos.filter(e => !e.id).length,
                          enderecosExistentes: formState.enderecos.filter(e => e.id).length
                        }
                      });
                      
                      // Usar mensagem do erro tratado ou mensagem especÃ­fica do backend
                      let errorMessage = error?.message;
                      
                      // Se o erro tem response, tentar extrair mensagem especÃ­fica
                      if (error?.response?.data) {
                        const backendMessage = error.response.data.message || error.response.data.error;
                        if (backendMessage) {
                          errorMessage = Array.isArray(backendMessage) 
                            ? backendMessage.join(", ")
                            : backendMessage;
                        }
                      }
                      
                      // Se nÃ£o tem mensagem especÃ­fica, usar mensagem padrÃ£o
                      if (!errorMessage || errorMessage === 'Error') {
                        errorMessage = "Erro ao atualizar fornecedor";
                      }
                      
                      toast.error(errorMessage);
                    } finally {
                      setIsSavingFornecedor(false);
                    }
                  }}
                  disabled={isSavingFornecedor}
                  className="flex-1"
                >
                  {isSavingFornecedor ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar AlteraÃ§Ãµes
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Fornecedor nÃ£o encontrado
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DiÃ¡logo de confirmaÃ§Ã£o para deletar endereÃ§o */}
      <AlertDialog open={enderecoParaDeletar !== null} onOpenChange={(open) => {
        if (!open) {
          setEnderecoParaDeletar(null);
        }
      }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-black/20 backdrop-blur-sm" />
          <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar RemoÃ§Ã£o</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este endereÃ§o? Esta aÃ§Ã£o nÃ£o pode ser desfeita.
            </AlertDialogDescription>
            {enderecoParaDeletar?.endereco?.logradouro && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <strong>EndereÃ§o:</strong> {enderecoParaDeletar.endereco.logradouro}
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
                
                // Se o endereÃ§o jÃ¡ existe no backend (tem ID), verificar se realmente existe
                if (endereco.id && selectedFornecedorId && fornecedorOriginal) {
                  // Verificar se o ID realmente existe nos endereÃ§os originais
                  const idExiste = fornecedorOriginal.enderecos?.some(
                    e => e.id && Number(e.id) === Number(endereco.id)
                  );
                  
                  if (idExiste) {
                    // ID existe, tentar deletar via endpoint
                    try {
                      await removerEnderecoMutation.mutateAsync({
                        fornecedorId: selectedFornecedorId,
                        enderecoId: Number(endereco.id)
                      });
                    } catch (error: any) {
                      // Se for 404, o endereÃ§o jÃ¡ nÃ£o existe - apenas remover do estado local
                      if (error?.response?.status === 404) {
                        console.warn('[Remover EndereÃ§o] EndereÃ§o jÃ¡ nÃ£o existe no backend, removendo apenas do estado local');
                        setEditEnderecos(
                          editEnderecos.filter((_, i) => i !== index)
                        );
                        toast.success("EndereÃ§o removido");
                      }
                      // Outros erros jÃ¡ sÃ£o tratados na mutation
                    }
                  } else {
                    // ID nÃ£o existe nos originais, apenas remover do estado local
                    console.warn('[Remover EndereÃ§o] ID nÃ£o encontrado nos endereÃ§os originais, removendo apenas do estado local');
                    setEditEnderecos(
                      editEnderecos.filter((_, i) => i !== index)
                    );
                    toast.success("EndereÃ§o removido");
                  }
                } else {
                  // Se Ã© um endereÃ§o novo (sem ID), apenas remover do estado local
                  setEditEnderecos(
                    editEnderecos.filter((_, i) => i !== index)
                  );
                  toast.success("EndereÃ§o removido");
                }
                
                // Fechar diÃ¡logo
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

      {/* DiÃ¡logo de confirmaÃ§Ã£o para deletar contato */}
      <AlertDialog open={contatoParaDeletar !== null} onOpenChange={(open) => {
        if (!open) {
          setContatoParaDeletar(null);
        }
      }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-black/20 backdrop-blur-sm" />
          <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar RemoÃ§Ã£o</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este contato? Esta aÃ§Ã£o nÃ£o pode ser desfeita.
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
                
                // Se o contato jÃ¡ existe no backend (tem ID), verificar se realmente existe
                if (contato.id && selectedFornecedorId && fornecedorOriginal) {
                  // Verificar se o ID realmente existe nos contatos originais
                  const idExiste = fornecedorOriginal.contato?.some(
                    c => c.id && Number(c.id) === Number(contato.id)
                  );
                  
                  if (idExiste) {
                    // ID existe, tentar deletar via endpoint
                    // O onSuccess da mutation vai atualizar o estado com os dados do servidor
                    try {
                      await removerContatoMutation.mutateAsync({
                        fornecedorId: selectedFornecedorId,
                        contatoId: Number(contato.id)
                      });
                      // Fechar diÃ¡logo apÃ³s sucesso
                      setContatoParaDeletar(null);
                    } catch (error: any) {
                      // Se for 404, o contato jÃ¡ nÃ£o existe - apenas remover do estado local
                      if (error?.response?.status === 404) {
                        console.warn('[Remover Contato] Contato jÃ¡ nÃ£o existe no backend, removendo apenas do estado local');
                        setEditContatos(
                          editContatos.filter((_, i) => i !== index)
                        );
                        toast.success("Contato removido");
                        // Fechar diÃ¡logo
                        setContatoParaDeletar(null);
                      }
                      // Outros erros jÃ¡ sÃ£o tratados na mutation
                    }
                  } else {
                    // ID nÃ£o existe nos originais, apenas remover do estado local
                    console.warn('[Remover Contato] ID nÃ£o encontrado nos contatos originais, removendo apenas do estado local');
                    setEditContatos(
                      editContatos.filter((_, i) => i !== index)
                    );
                    toast.success("Contato removido");
                    // Fechar diÃ¡logo
                    setContatoParaDeletar(null);
                  }
                } else {
                  // Se Ã© um contato novo (sem ID), apenas remover do estado local
                  setEditContatos(
                    editContatos.filter((_, i) => i !== index)
                  );
                  toast.success("Contato removido");
                  // Fechar diÃ¡logo
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
    </AppLayout>
  );
};

export default Fornecedores;
