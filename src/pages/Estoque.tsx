import AppLayout from "@/components/layout/AppLayout";
import { ModulePageHeader } from "@/components/layout/ModulePageHeader";
import {
  ModuleStatCards,
  type ModuleStatCardItem,
} from "@/components/layout/ModuleStatCards";
import { statTheme } from "@/components/layout/module-stat-themes";
import { RelatorioMovimentacoesDialog } from "@/components/reports/RelatorioMovimentacoesDialog";
import { RelatorioPosicaoEstoqueDialog } from "@/components/reports/RelatorioPosicaoEstoqueDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { cn, formatCurrency } from "@/lib/utils";
import {
    estoqueService,
    MovimentacaoEstoque,
    MovimentacaoEstoqueDto,
    TipoMovimentacao,
} from "@/services/estoque.service";
import { Produto, produtosService } from "@/services/produtos.service";
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
    CircleDollarSign,
    ChevronDown,
    FileText,
    Filter,
    Info,
    Loader2,
    Package,
    Plus,
    RotateCcw,
    Search,
    Settings,
    Truck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const Estoque = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("Todos");
  const [filtroProdutoId, setFiltroProdutoId] = useState<number | null>(null);
  const [produtoFiltroOpen, setProdutoFiltroOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [ordenacaoMov, setOrdenacaoMov] = useState<"desc" | "asc">("desc");
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);
  const [dialogMovimentacaoOpen, setDialogMovimentacaoOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [movimentacao, setMovimentacao] = useState<MovimentacaoEstoqueDto>({
    tipo: "SAIDA",
    quantidade: 0,
    observacao: "",
    motivo: "",
    documento_referencia: "",
  });
  const [dataInicialRelatorio, setDataInicialRelatorio] = useState<string>("");
  const [dataFinalRelatorio, setDataFinalRelatorio] = useState<string>("");
  const [relatorioDialogOpen, setRelatorioDialogOpen] = useState(false);
  const [relatorioPosicaoDialogOpen, setRelatorioPosicaoDialogOpen] =
    useState(false);

  // Buscar produtos ativos (limit >= 100 + ATIVO retorna todos no backend)
  const { data: produtosData } = useQuery({
    queryKey: ["produtos-movimentacao"],
    queryFn: async () => {
      try {
        const response = await produtosService.listar({
          page: 1,
          limit: 100,
          statusProduto: "ATIVO",
        });
        // Priorizar o novo formato: { data: Produto[], total, page, limit }
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        if (response?.produtos && Array.isArray(response.produtos)) {
          return response.produtos;
        }
        return [];
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        return [];
      }
    },
  });

  const produtos: Produto[] = produtosData || [];

  const produtoFiltroSelecionado = useMemo(
    () =>
      filtroProdutoId == null
        ? null
        : produtos.find((p) => Number(p.id) === Number(filtroProdutoId)) ?? null,
    [produtos, filtroProdutoId],
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

  // Buscar todas as movimentações (histórico completo; filtros no frontend)
  const { data: movimentacoesData, isLoading: isLoadingMovimentacoes } = useQuery({
    queryKey: ["movimentacoes", produtos.length],
    queryFn: async () => {
      // Validar parâmetros antes de fazer a requisição
      if (!validarParametrosPaginação(currentPage, itemsPerPage)) {
        throw new Error('Parâmetros de paginação inválidos');
      }
      // Como o endpoint /estoque/movimentacoes não existe no backend,
      // usamos a abordagem de buscar histórico de cada produto e agregar
      const todasMovimentacoes: MovimentacaoEstoque[] = [];
      
      // Busca histórico de cada produto em paralelo com paginação
      const resultados = await Promise.allSettled(
        produtos.map(async (produto) => {
          try {
            // Busca todas as páginas do histórico de cada produto
            let todasMovimentacoesProduto: MovimentacaoEstoque[] = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
              const historico = await estoqueService.obterHistorico(produto.id, {
                page,
                limit: 50,
              });
              
              if (historico?.movimentacoes && historico.movimentacoes.length > 0) {
                const movimentacoesComProduto = historico.movimentacoes.map((mov) => {
                  if (!mov.produto_id) {
                    mov.produto_id = produto.id;
                  }
                  // Adiciona informações do produto se não vierem
                  if (!mov.produto) {
                    mov.produto = {
                      id: produto.id,
                      nome: produto.nome,
                      sku: produto.sku,
                    };
                  }
                  return mov;
                });
                todasMovimentacoesProduto.push(...movimentacoesComProduto);
                
                // Se retornou menos que o limite, não há mais páginas
                if (historico.movimentacoes.length < 50) {
                  hasMore = false;
                } else {
                  page++;
                }
              } else {
                hasMore = false;
              }
            }
            
            return todasMovimentacoesProduto;
          } catch (error) {
            // Ignora erros de produtos individuais silenciosamente
            return [];
          }
        })
      );

      // Agrega todas as movimentações
      resultados.forEach((resultado) => {
        if (resultado.status === "fulfilled" && Array.isArray(resultado.value)) {
          todasMovimentacoes.push(...resultado.value);
        }
      });

      // Ordena por data (mais recentes primeiro por padrão)
      todasMovimentacoes.sort((a, b) => {
        const da = new Date(a.criado_em).getTime();
        const db = new Date(b.criado_em).getTime();
        return db - da;
      });

      return {
        movimentacoes: todasMovimentacoes,
        total: todasMovimentacoes.length,
      };
    },
    enabled: produtos.length > 0,
    retry: (failureCount, error: any) => {
      // Não tentar novamente para erros 400, 401, 403, 404
      if (error?.response) {
        const status = error.response.status;
        if ([400, 401, 403, 404].includes(status)) {
          return false;
        }
      }
      // Tentar até 2 vezes para outros erros
      return failureCount < 2;
    },
    retryDelay: 1000, // Esperar 1 segundo entre tentativas
  });

  const movimentacoesOriginais: MovimentacaoEstoque[] = movimentacoesData?.movimentacoes || [];
  const totalMovimentacoesOriginais = movimentacoesData?.total || 0;

  const parseDataLocal = (isoDate: string, fimDoDia: boolean) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    return fimDoDia
      ? new Date(y, m - 1, d, 23, 59, 59, 999)
      : new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  /**
   * Quantidade em estoque na data de referência, a partir do histórico.
   * Usa estoque_atual da última movimentação <= data; se não houver,
   * estoque_anterior da primeira movimentação posterior; senão o atual.
   */
  const quantidadeEstoqueNaData = (
    movs: MovimentacaoEstoque[],
    dataRef: Date,
    estoqueAtual: number
  ): number => {
    if (!movs.length) return estoqueAtual;

    let ultimaAteRef: MovimentacaoEstoque | null = null;
    let primeiraAposRef: MovimentacaoEstoque | null = null;
    const refMs = dataRef.getTime();

    for (const mov of movs) {
      const t = new Date(mov.criado_em).getTime();
      if (Number.isNaN(t)) continue;
      if (t <= refMs) {
        if (
          !ultimaAteRef ||
          t >= new Date(ultimaAteRef.criado_em).getTime()
        ) {
          ultimaAteRef = mov;
        }
      } else if (
        !primeiraAposRef ||
        t < new Date(primeiraAposRef.criado_em).getTime()
      ) {
        primeiraAposRef = mov;
      }
    }

    if (ultimaAteRef) return Number(ultimaAteRef.estoque_atual) || 0;
    if (primeiraAposRef) return Number(primeiraAposRef.estoque_anterior) || 0;
    return estoqueAtual;
  };

  /**
   * Valor em estoque:
   * - sem data final → estoque atual × custo
   * - com data final → estoque reconstruído ao fim daquele dia × custo
   */
  const valorTotalEstoque = useMemo(() => {
    const dataRefIso = dataFinalRelatorio || null;
    const usarHistorico = Boolean(dataRefIso);

    const movsPorProduto = new Map<number, MovimentacaoEstoque[]>();
    if (usarHistorico) {
      for (const mov of movimentacoesOriginais) {
        const id = mov.produto_id ?? mov.produto?.id;
        if (id == null) continue;
        const lista = movsPorProduto.get(id) || [];
        lista.push(mov);
        movsPorProduto.set(id, lista);
      }
    }

    const dataRef = dataRefIso
      ? parseDataLocal(dataRefIso, true)
      : null;

    return produtos.reduce((acc, p) => {
      if (filtroProdutoId != null && Number(p.id) !== Number(filtroProdutoId)) {
        return acc;
      }
      const custo = Number(p.preco_custo) || 0;
      if (custo <= 0) return acc;

      let qtd = Number(p.estoque_atual) || 0;
      if (dataRef) {
        qtd = quantidadeEstoqueNaData(
          movsPorProduto.get(p.id) || [],
          dataRef,
          qtd
        );
      }

      if (qtd <= 0) return acc;
      return acc + qtd * custo;
    }, 0);
  }, [
    produtos,
    movimentacoesOriginais,
    dataFinalRelatorio,
    filtroProdutoId,
  ]);

  // Filtrar movimentações por tipo, produto, busca, período e ordenação (lista + cards)
  const movimentacoesFiltradas = useMemo(() => {
    let lista = movimentacoesOriginais;

    if (filtroTipo === "ENTRADA") {
      lista = lista.filter((mov) => {
        if (mov.tipo !== "ENTRADA") return false;
        const motivoStr = (mov.motivo || "").toLowerCase();
        const obsStr = (mov.observacao || "").toLowerCase();

        // Excluir explicitamente Estoque Inicial, Inventário, Cancelamento e Reversão
        const eExcluido =
          motivoStr.includes("estoque inicial") ||
          motivoStr.includes("inventario") ||
          motivoStr.includes("inventário") ||
          motivoStr.includes("cancelamento") ||
          obsStr.includes("cancelamento") ||
          motivoStr.includes("reversão") ||
          motivoStr.includes("reversao");

        const eCompra = motivoStr.includes("compra");

        return eCompra && !eExcluido;
      });
    } else if (filtroTipo !== "Todos") {
      lista = lista.filter((mov) => mov.tipo === filtroTipo);
    }

    if (filtroProdutoId != null) {
      lista = lista.filter((mov) => {
        const id = mov.produto_id ?? mov.produto?.id;
        return id != null && Number(id) === Number(filtroProdutoId);
      });
    }

    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase();
      lista = lista.filter((mov) => {
        const produtoNome = mov.produto?.nome?.toLowerCase() || "";
        const produtoSku = mov.produto?.sku?.toLowerCase() || "";
        return produtoNome.includes(termo) || produtoSku.includes(termo);
      });
    }

    if (dataInicialRelatorio || dataFinalRelatorio) {
      const inicio = dataInicialRelatorio
        ? parseDataLocal(dataInicialRelatorio, false)
        : null;
      const fim = dataFinalRelatorio
        ? parseDataLocal(dataFinalRelatorio, true)
        : null;

      lista = lista.filter((mov) => {
        const dataMov = new Date(mov.criado_em);
        if (Number.isNaN(dataMov.getTime())) return false;
        if (inicio && dataMov < inicio) return false;
        if (fim && dataMov > fim) return false;
        return true;
      });
    }

    // ordenar por data conforme seleção
    lista = [...lista].sort((a, b) => {
      const da = new Date(a.criado_em).getTime();
      const db = new Date(b.criado_em).getTime();
      if (ordenacaoMov === "desc") {
        return db - da;
      }
      return da - db;
    });

    return lista;
  }, [
    movimentacoesOriginais,
    filtroTipo,
    filtroProdutoId,
    searchTerm,
    ordenacaoMov,
    dataInicialRelatorio,
    dataFinalRelatorio,
  ]);

  const totalMovimentacoes = movimentacoesFiltradas.length;
  const totalPages = Math.ceil(totalMovimentacoes / itemsPerPage);
  const movimentacoes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return movimentacoesFiltradas.slice(startIndex, endIndex);
  }, [movimentacoesFiltradas, currentPage, itemsPerPage]);

  // Resetar página quando filtro, busca ou período mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroTipo, filtroProdutoId, searchTerm, dataInicialRelatorio, dataFinalRelatorio]);

  // Calcular totais gerais e por tipo
  const { totalEntradas, totalSaidas, balanco, totaisPorTipo } = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    const porTipo: Record<string, number> = {
      ENTRADA: 0,
      SAIDA: 0,
      AJUSTE: 0,
      DEVOLUCAO: 0,
      PERDA: 0,
      TRANSFERENCIA: 0,
    };

    movimentacoesFiltradas.forEach((mov) => {
      if (mov.tipo === "ENTRADA") {
        entradas += mov.quantidade;
      } else if (mov.tipo === "SAIDA") {
        saidas += mov.quantidade;
      }
      if (porTipo[mov.tipo] !== undefined) {
        porTipo[mov.tipo] += mov.quantidade;
      }
    });

    const balanco =
      (porTipo.ENTRADA ?? 0) +
      (porTipo.DEVOLUCAO ?? 0) +
      (porTipo.AJUSTE ?? 0) -
      (porTipo.SAIDA ?? 0) -
      (porTipo.PERDA ?? 0) -
      (porTipo.TRANSFERENCIA ?? 0);
    return {
      totalEntradas: entradas,
      totalSaidas: saidas,
      balanco,
      totaisPorTipo: porTipo,
    };
  }, [movimentacoesFiltradas]);

  const movimentacaoStatItems = useMemo((): ModuleStatCardItem[] => {
    const formatQtd = (n: number) => Math.abs(n).toLocaleString("pt-BR");
    const formatValorTipo = (tipo: TipoMovimentacao, total: number) => {
      const qtd = formatQtd(total);
      const isEntradaOuDevolucao = tipo === "ENTRADA" || tipo === "DEVOLUCAO";
      const isSaidaPerdaTransf =
        tipo === "SAIDA" || tipo === "PERDA" || tipo === "TRANSFERENCIA";
      if (isEntradaOuDevolucao) return `+${qtd} un`;
      if (isSaidaPerdaTransf) return `-${qtd} un`;
      return total >= 0 ? `+${qtd} un` : `-${qtd} un`;
    };

    const tipos: Array<{
      tipo: TipoMovimentacao;
      label: string;
      Icon: typeof ArrowDownCircle;
      theme: (typeof statTheme)[keyof typeof statTheme];
    }> = [
      { tipo: "ENTRADA", label: "Entrada", Icon: ArrowDownCircle, theme: statTheme.emerald },
      { tipo: "SAIDA", label: "Saída", Icon: ArrowUpCircle, theme: statTheme.red },
      { tipo: "AJUSTE", label: "Ajuste", Icon: Settings, theme: statTheme.blue },
      { tipo: "DEVOLUCAO", label: "Devolução", Icon: RotateCcw, theme: statTheme.sky },
      { tipo: "PERDA", label: "Perda", Icon: AlertTriangle, theme: statTheme.amber },
      { tipo: "TRANSFERENCIA", label: "Transferência", Icon: Truck, theme: statTheme.purple },
    ];

    return [
      {
        key: "valor-estoque",
        label: dataFinalRelatorio
          ? "Valor em estoque (fim do período)"
          : "Valor em estoque",
        value: formatCurrency(valorTotalEstoque),
        Icon: CircleDollarSign,
        ...statTheme.emerald,
      },
      {
        key: "balanco",
        label: "Balanço",
        value: `${balanco >= 0 ? "+" : "-"}${formatQtd(balanco)} un`,
        Icon: Package,
        ...statTheme.primary,
      },
      ...tipos.map(({ tipo, label, Icon, theme }) => ({
        key: tipo,
        label,
        value: formatValorTipo(tipo, totaisPorTipo[tipo] ?? 0),
        Icon,
        ...theme,
        active: filtroTipo === tipo,
        onClick: () => {
          setFiltroTipo(filtroTipo === tipo ? "Todos" : tipo);
          setCurrentPage(1);
        },
      })),
    ];
  }, [balanco, totaisPorTipo, filtroTipo, valorTotalEstoque, dataFinalRelatorio]);

  // Mutation para criar movimentação
  const movimentarEstoqueMutation = useMutation({
    mutationFn: ({ produtoId, data }: { produtoId: number; data: MovimentacaoEstoqueDto }) =>
      estoqueService.movimentar(produtoId, data),
    onSuccess: async (_, variables) => {
      // Invalida todas as queries relacionadas para atualizar os dados
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["movimentacoes"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["produtos"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["produtos-movimentacao"], exact: false }),
        // Invalida o histórico de estoque para TODOS os produtos (incluindo o específico)
        queryClient.invalidateQueries({ queryKey: ["historico-estoque"], exact: false }),
      ]);
      
      // Refetch do histórico específico do produto movimentado para atualizar imediatamente
      await queryClient.refetchQueries({ 
        queryKey: ["historico-estoque", variables.produtoId],
        exact: true 
      });
      
      setDialogMovimentacaoOpen(false);
      setProdutoSelecionado(null);
      setMovimentacao({
        tipo: "SAIDA",
        quantidade: 0,
        observacao: "",
        motivo: "",
        documento_referencia: "",
      });
      toast.success("Movimentação realizada com sucesso!");
    },
    onError: (error: any) => {
      // Tratamento de erros conforme TROUBLESHOOTING_MOVIMENTACAO_ESTOQUE.md
      if (error?.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        switch (status) {
          case 400:
            // Erro de validação
            let mensagemErro = 'Erro de validação';
            if (errorData?.message) {
              if (Array.isArray(errorData.message)) {
                mensagemErro = errorData.message.join(', ');
              } else {
                mensagemErro = errorData.message;
              }
            }
            toast.error(mensagemErro);
            break;

          case 401:
            // Token inválido ou expirado
            toast.error('Sessão expirada. Faça login novamente.');
            // Opcional: redirecionar para login
            break;

          case 403:
            toast.error(
              errorData?.message ||
                'Sem permissão para realizar esta operação',
            );
            break;

          case 404:
            // Produto não encontrado
            toast.error('Produto não encontrado');
            break;

          case 409:
            // Conflito (ex: estoque insuficiente)
            const mensagemConflito = errorData?.message || 'Não foi possível realizar a movimentação';
            toast.error(mensagemConflito);
            break;

          case 500:
            // Erro interno do servidor
            toast.error('Erro interno do servidor. Tente novamente mais tarde.');
            break;

          default:
            const mensagemPadrao = errorData?.message || error?.message || 'Erro ao realizar movimentação';
            toast.error(mensagemPadrao);
        }
      } else if (error?.request) {
        // Erro de rede
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        // Outro erro
        toast.error(error?.message || 'Erro inesperado ao realizar movimentação');
      }
    },
  });

  // Função de validação conforme TROUBLESHOOTING_MOVIMENTACAO_ESTOQUE.md
  const validarMovimentacao = (dados: MovimentacaoEstoqueDto): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];

    // Validar tipo
    const tiposValidos: TipoMovimentacao[] = ['ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO', 'PERDA', 'TRANSFERENCIA'];
    if (!dados.tipo || !tiposValidos.includes(dados.tipo)) {
      erros.push('Tipo de movimentação inválido ou ausente. Valores aceitos: ENTRADA, SAIDA, AJUSTE, DEVOLUCAO, PERDA, TRANSFERENCIA');
    }

    // Validar quantidade
    if (dados.quantidade === undefined || typeof dados.quantidade !== "number") {
      erros.push("A quantidade é obrigatória e deve ser um número");
    } else if (!Number.isInteger(dados.quantidade)) {
      erros.push("A quantidade deve ser um número inteiro");
    } else if (dados.tipo === "AJUSTE") {
      if (dados.quantidade < 0) {
        erros.push("No ajuste, o estoque final deve ser maior ou igual a 0");
      }
    } else if (dados.quantidade < 1) {
      erros.push("A quantidade deve ser maior ou igual a 1");
    }

    // Validar campos opcionais (devem ser strings se enviados)
    if (dados.observacao !== undefined && typeof dados.observacao !== 'string') {
      erros.push('Observação deve ser uma string');
    }
    if (dados.motivo !== undefined && typeof dados.motivo !== 'string') {
      erros.push('Motivo deve ser uma string');
    }
    if (dados.documento_referencia !== undefined && typeof dados.documento_referencia !== 'string') {
      erros.push('Documento de referência deve ser uma string');
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  };

  const handleMovimentar = () => {
    if (!produtoSelecionado) {
      toast.error("Selecione um produto");
      return;
    }

    if (!movimentacao.tipo) {
      toast.error("Selecione o tipo de movimentação");
      return;
    }

    if (!movimentacao.motivo?.trim()) {
      toast.error(
        movimentacao.tipo === "ENTRADA"
          ? "Informe o motivo da entrada"
          : movimentacao.tipo === "AJUSTE"
            ? "Informe o motivo do ajuste"
            : "Informe a causa da saída",
      );
      return;
    }

    // Prepara os dados conforme a documentação da API
    const dadosMovimentacao: MovimentacaoEstoqueDto = {
      tipo: movimentacao.tipo,
      quantidade: movimentacao.quantidade,
      observacao: movimentacao.observacao?.trim() || undefined,
      motivo: movimentacao.motivo?.trim() || undefined,
      documento_referencia: movimentacao.documento_referencia?.trim() || undefined,
    };

    // Validar dados antes de enviar
    const validacao = validarMovimentacao(dadosMovimentacao);
    if (!validacao.valido) {
      validacao.erros.forEach((erro) => toast.error(erro));
      return;
    }

    movimentarEstoqueMutation.mutate({
      produtoId: produtoSelecionado.id,
      data: dadosMovimentacao,
    });
  };

  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isEntrada = (tipo: TipoMovimentacao) => {
    return tipo === "ENTRADA" || tipo === "DEVOLUCAO";
  };

  const isSaida = (tipo: TipoMovimentacao) => {
    return tipo === "SAIDA" || tipo === "PERDA" || tipo === "TRANSFERENCIA";
  };

  const temFiltrosAtivos =
    filtroTipo !== "Todos" ||
    filtroProdutoId != null ||
    ordenacaoMov !== "desc" ||
    Boolean(dataInicialRelatorio) ||
    Boolean(dataFinalRelatorio);

  const contagemFiltrosAtivos =
    (filtroTipo !== "Todos" ? 1 : 0) +
    (filtroProdutoId != null ? 1 : 0) +
    (ordenacaoMov !== "desc" ? 1 : 0) +
    (dataInicialRelatorio ? 1 : 0) +
    (dataFinalRelatorio ? 1 : 0);

  const handleAplicarFiltros = () => {
    setFiltrosDialogOpen(false);
    setCurrentPage(1);
  };

  const handleLimparFiltros = () => {
    setFiltroTipo("Todos");
    setFiltroProdutoId(null);
    setOrdenacaoMov("desc");
    setDataInicialRelatorio("");
    setDataFinalRelatorio("");
    setCurrentPage(1);
    setFiltrosDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={Package}
          title="Movimentações"
          subtitle="Registro de entradas e saídas de estoque, com filtros rápidos por tipo."
        />

        <ModuleStatCards columns={8} items={movimentacaoStatItems} />

        {/* Barra: Criar | Busca | Filtros */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <Button
              className="gap-2 shrink-0 w-full sm:w-auto"
              onClick={() => setDialogMovimentacaoOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Nova movimentação
            </Button>

            <div className="relative flex-1 w-full min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto ou SKU..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto lg:shrink-0 lg:ml-auto">
              <Button
                variant="outline"
                className="gap-2 shrink-0"
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
                    {contagemFiltrosAtivos}
                  </span>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 shrink-0">
                    <FileText className="w-4 h-4" />
                    Relatório
                    <ChevronDown className="w-4 h-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Relatórios</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRelatorioDialogOpen(true)}>
                    Movimentações
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setRelatorioPosicaoDialogOpen(true)}
                  >
                    Posição de estoque
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

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
                  <SheetTitle className="text-xl">Filtros Avançados</SheetTitle>
                </div>
                <SheetDescription>Refine sua busca</SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Produto</Label>
                  <Popover
                    open={produtoFiltroOpen}
                    onOpenChange={setProdutoFiltroOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={produtoFiltroOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {produtoFiltroSelecionado
                            ? `${produtoFiltroSelecionado.nome} — ${produtoFiltroSelecionado.sku}`
                            : "Todos os produtos"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 w-[var(--radix-popover-trigger-width)]"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Buscar produto ou SKU..." />
                        <CommandList>
                          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todos-os-produtos"
                              onSelect={() => {
                                setFiltroProdutoId(null);
                                setProdutoFiltroOpen(false);
                                setCurrentPage(1);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filtroProdutoId == null
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              Todos os produtos
                            </CommandItem>
                            {produtos.map((produto) => (
                              <CommandItem
                                key={produto.id}
                                value={`${produto.nome} ${produto.sku}`}
                                onSelect={() => {
                                  setFiltroProdutoId(Number(produto.id));
                                  setProdutoFiltroOpen(false);
                                  setCurrentPage(1);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    Number(filtroProdutoId) === Number(produto.id)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <span className="truncate">
                                  {produto.nome} — {produto.sku}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Filtra a lista, os cards e o valor em estoque
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Tipo de Movimentação
                  </Label>
                  <RadioGroup
                    value={filtroTipo}
                    onValueChange={(value) => {
                      setFiltroTipo(value);
                      setCurrentPage(1);
                    }}
                    className="space-y-2"
                  >
                    {(
                      [
                        { value: "Todos", label: "Todos", color: "text-primary" },
                        { value: "ENTRADA", label: "Entrada", color: "text-emerald-500" },
                        { value: "SAIDA", label: "Saída", color: "text-red-500" },
                        { value: "AJUSTE", label: "Ajuste", color: "text-blue-500" },
                        { value: "DEVOLUCAO", label: "Devolução", color: "text-sky-500" },
                        { value: "PERDA", label: "Perda", color: "text-amber-500" },
                        { value: "TRANSFERENCIA", label: "Transferência", color: "text-purple-500" },
                      ] as const
                    ).map(({ value, label, color }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={`filtro-tipo-${value}`} />
                        <Label
                          htmlFor={`filtro-tipo-${value}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Circle className={`w-3 h-3 ${color}`} />
                          <span>{label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Ordenação</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOrdenacaoMov("desc")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        ordenacaoMov === "desc"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      <span className="text-sm font-medium">Mais recentes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdenacaoMov("asc")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        ordenacaoMov === "asc"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      <span className="text-sm font-medium">Mais antigos</span>
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Período
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor="data-inicial-filtro"
                        className="flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Data inicial
                      </Label>
                      <Input
                        id="data-inicial-filtro"
                        type="date"
                        value={dataInicialRelatorio}
                        onChange={(e) =>
                          setDataInicialRelatorio(e.target.value || "")
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Filtra a lista, o dashboard e o relatório
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="data-final-filtro"
                        className="flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Data final
                      </Label>
                      <Input
                        id="data-final-filtro"
                        type="date"
                        value={dataFinalRelatorio}
                        onChange={(e) =>
                          setDataFinalRelatorio(e.target.value || "")
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para não limitar o período
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

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

          <Dialog
            open={dialogMovimentacaoOpen}
            onOpenChange={(open) => {
              setDialogMovimentacaoOpen(open);
              if (!open) {
                setProdutoSelecionado(null);
                setMovimentacao({
                  tipo: "SAIDA",
                  quantidade: 0,
                  observacao: "",
                  motivo: "",
                  documento_referencia: "",
                });
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova movimentação</DialogTitle>
                <DialogDescription>
                  Escolha o tipo, o produto, a quantidade e o motivo.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        tipo: "ENTRADA" as const,
                        label: "Entrada",
                        desc: "Adicionar ao estoque",
                        Icon: ArrowDownCircle,
                        border: "#059669",
                        bg: "#ECFDF5",
                        color: "#047857",
                      },
                      {
                        tipo: "AJUSTE" as const,
                        label: "Ajuste",
                        desc: "Definir estoque final",
                        Icon: Settings,
                        border: "#2563EB",
                        bg: "#EFF6FF",
                        color: "#1D4ED8",
                      },
                      {
                        tipo: "SAIDA" as const,
                        label: "Saída",
                        desc: "Remover do estoque",
                        Icon: ArrowUpCircle,
                        border: "#E74C3C",
                        bg: "#FDEDEC",
                        color: "#922B21",
                      },
                      {
                        tipo: "PERDA" as const,
                        label: "Perda",
                        desc: "Produto perdido ou danificado",
                        Icon: AlertTriangle,
                        border: "#F39C12",
                        bg: "#FEF5E7",
                        color: "#9C640C",
                      },
                      {
                        tipo: "TRANSFERENCIA" as const,
                        label: "Transferência",
                        desc: "Envio entre estoques",
                        Icon: Truck,
                        border: "#9B59B6",
                        bg: "#F4ECF7",
                        color: "#5B2C6F",
                      },
                    ] as const
                  ).map(({ tipo, label, desc, Icon, border, bg, color }) => {
                    const ativo = movimentacao.tipo === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setMovimentacao({ ...movimentacao, tipo })}
                        className={`flex items-start gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.01] box-border ${
                          ativo ? "shadow-md border-[3px]" : "border-2"
                        }`}
                        style={{
                          borderColor: ativo ? border : `${border}4D`,
                          backgroundColor: ativo ? bg : `${bg}80`,
                        }}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: bg }}
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm" style={{ color }}>
                            {label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Produto *</Label>
                    {produtos.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">
                        Carregando produtos...
                      </div>
                    ) : (
                      <Select
                        value={produtoSelecionado?.id?.toString() || ""}
                        onValueChange={(value) => {
                          const produto = produtos.find((p) => {
                            const produtoId = p.id?.toString();
                            return (
                              produtoId === value ||
                              Number(produtoId) === Number(value)
                            );
                          });
                          if (produto) setProdutoSelecionado(produto);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto">
                            {produtoSelecionado
                              ? `${produtoSelecionado.nome} — ${produtoSelecionado.sku}`
                              : ""}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {produtos.map((produto) => (
                            <SelectItem
                              key={produto.id}
                              value={produto.id?.toString() || ""}
                            >
                              {produto.nome} — {produto.sku}
                              {produto.estoque_atual != null
                                ? ` (estoque: ${Number(produto.estoque_atual).toLocaleString("pt-BR")})`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {movimentacao.tipo === "AJUSTE"
                        ? "Estoque final *"
                        : "Quantidade *"}
                    </Label>
                    <Input
                      type="number"
                      min={movimentacao.tipo === "AJUSTE" ? "0" : "1"}
                      step="1"
                      placeholder={
                        movimentacao.tipo === "AJUSTE" ? "Ex: 0 ou 50" : "Ex: 5"
                      }
                      value={
                        movimentacao.quantidade === 0 &&
                        movimentacao.tipo !== "AJUSTE"
                          ? ""
                          : movimentacao.quantidade
                      }
                      onChange={(e) =>
                        setMovimentacao({
                          ...movimentacao,
                          quantidade:
                            e.target.value === ""
                              ? 0
                              : Number(e.target.value) || 0,
                        })
                      }
                    />
                    {movimentacao.tipo === "AJUSTE" ? (
                      <p className="text-xs text-muted-foreground">
                        Informe o saldo que deve ficar no estoque (não a
                        diferença).
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>
                      {movimentacao.tipo === "ENTRADA"
                        ? "Motivo da entrada *"
                        : movimentacao.tipo === "AJUSTE"
                          ? "Motivo do ajuste *"
                          : "Causa da saída *"}
                    </Label>
                    <Input
                      placeholder={
                        movimentacao.tipo === "ENTRADA"
                          ? "Ex: Compra avulsa, devolução de cliente, inventário..."
                          : movimentacao.tipo === "AJUSTE"
                            ? "Ex: Inventário, correção de cadastro..."
                            : "Ex: Venda avulsa, produto vencido, envio para filial..."
                      }
                      value={movimentacao.motivo || ""}
                      onChange={(e) =>
                        setMovimentacao({
                          ...movimentacao,
                          motivo: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Observação</Label>
                    <Textarea
                      placeholder="Detalhes adicionais (opcional)"
                      value={movimentacao.observacao || ""}
                      onChange={(e) =>
                        setMovimentacao({
                          ...movimentacao,
                          observacao: e.target.value,
                        })
                      }
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDialogMovimentacaoOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleMovimentar}
                    className="flex-1 text-white hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor:
                        movimentacao.tipo === "ENTRADA"
                          ? "#059669"
                          : movimentacao.tipo === "AJUSTE"
                            ? "#2563EB"
                            : movimentacao.tipo === "PERDA"
                              ? "#F39C12"
                              : movimentacao.tipo === "TRANSFERENCIA"
                                ? "#9B59B6"
                                : "#E74C3C",
                    }}
                    disabled={movimentarEstoqueMutation.isPending}
                  >
                    {movimentarEstoqueMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : movimentacao.tipo === "ENTRADA" ? (
                      "Registrar entrada"
                    ) : movimentacao.tipo === "AJUSTE" ? (
                      "Registrar ajuste"
                    ) : movimentacao.tipo === "PERDA" ? (
                      "Registrar perda"
                    ) : movimentacao.tipo === "TRANSFERENCIA" ? (
                      "Registrar transferência"
                    ) : (
                      "Registrar saída"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

            <RelatorioMovimentacoesDialog
              open={relatorioDialogOpen}
              onOpenChange={setRelatorioDialogOpen}
              defaultDataInicial={dataInicialRelatorio}
              defaultDataFinal={dataFinalRelatorio}
              defaultTipo={filtroTipo}
            />
            <RelatorioPosicaoEstoqueDialog
              open={relatorioPosicaoDialogOpen}
              onOpenChange={setRelatorioPosicaoDialogOpen}
              defaultDataInicial={dataInicialRelatorio}
              defaultDataFinal={dataFinalRelatorio}
              defaultProdutoId={filtroProdutoId}
            />
          <div className="mt-4">
            <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                As movimentações são geradas automaticamente ao criar pedidos de
                compra ou venda. Você também pode registrar manualmente entrada,
                ajuste, saída, perda ou transferência.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Tabela de Movimentações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMovimentacoes ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando movimentações...
                    </div>
                  </TableCell>
                </TableRow>
              ) : movimentacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-12 h-12 text-muted-foreground/50" />
                      <p>Nenhuma movimentação encontrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                  movimentacoes.map((mov) => {
                    const entrada = isEntrada(mov.tipo);
                    const saida = isSaida(mov.tipo);

                    return (
                      <TableRow key={mov.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {mov.tipo === "ENTRADA" && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: "#d1fae5",
                                  color: "#059669",
                                  borderColor: "#10b981",
                                }}
                              >
                                <ArrowDownCircle className="w-3 h-3" />
                                Entrada
                              </span>
                            )}
                            {mov.tipo === "DEVOLUCAO" && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: "#dbeafe",
                                  color: "#2563eb",
                                  borderColor: "#3b82f6",
                                }}
                              >
                                <RotateCcw className="w-3 h-3" />
                                Devolução
                              </span>
                            )}
                            {mov.tipo === "SAIDA" && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: "#fee2e2",
                                  color: "#dc2626",
                                  borderColor: "#ef4444",
                                }}
                              >
                                <ArrowUpCircle className="w-3 h-3" />
                                Saída
                              </span>
                            )}
                            {mov.tipo === "PERDA" && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: "#fef3c7",
                                  color: "#d97706",
                                  borderColor: "#f59e0b",
                                }}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Perda
                              </span>
                            )}
                            {mov.tipo === "TRANSFERENCIA" && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: "#ede9fe",
                                  color: "#7c3aed",
                                  borderColor: "#8b5cf6",
                                }}
                              >
                                <Truck className="w-3 h-3" />
                                Transferência
                              </span>
                            )}
                            {mov.tipo === "AJUSTE" && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: "#dbeafe",
                                  color: "#2563eb",
                                  borderColor: "#3b82f6",
                                }}
                              >
                                <Settings className="w-3 h-3" />
                                Ajuste
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">
                            {mov.produto?.sku || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{mov.produto?.nome || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-sm font-semibold"
                            style={{
                              color: mov.tipo === "ENTRADA" || mov.tipo === "DEVOLUCAO" 
                                ? "#059669" 
                                : mov.tipo === "SAIDA" || mov.tipo === "PERDA" || mov.tipo === "TRANSFERENCIA"
                                ? mov.tipo === "PERDA" ? "#d97706" : mov.tipo === "TRANSFERENCIA" ? "#7c3aed" : "#dc2626"
                                : "#2563eb"
                            }}
                          >
                            {(mov.tipo === "ENTRADA" || mov.tipo === "DEVOLUCAO") 
                              ? `+${Math.abs(mov.quantidade).toLocaleString("pt-BR")}` 
                              : (mov.tipo === "SAIDA" || mov.tipo === "PERDA" || mov.tipo === "TRANSFERENCIA") 
                                ? mov.quantidade < 0
                                  ? mov.quantidade.toLocaleString("pt-BR")
                                  : `-${mov.quantidade.toLocaleString("pt-BR")}`
                                : mov.tipo === "AJUSTE"
                                  ? (mov.quantidade >= 0
                                      ? `+${mov.quantidade.toLocaleString("pt-BR")}`
                                      : mov.quantidade.toLocaleString("pt-BR"))
                                  : mov.quantidade.toLocaleString("pt-BR")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatarDataHora(mov.criado_em)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {(() => {
                              const m = mov.motivo?.toUpperCase().replace(/\s+/g, "_") || "";
                              if (m === "ESTOQUE_INICIAL") return "Estoque Inicial";
                              if (m === "AJUSTE_ESTOQUE" || m === "AJUSTE_DE_ESTOQUE") return "Ajuste de Estoque";
                              return mov.motivo || "-";
                            })()}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
            </TableBody>
          </Table>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
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
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {totalPages > 5 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(totalPages)}
                        isActive={currentPage === totalPages}
                        className="cursor-pointer"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
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
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalMovimentacoes)} de {totalMovimentacoes} movimentações
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </AppLayout>
  );
};

export default Estoque;
