import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Power,
  PowerOff,
  Loader2,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Hash,
  Sprout,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { tenantsService, Tenant, CreateTenantDto } from "@/services/tenants.service";
import { formatDate } from "@/lib/utils";
import { formatDocument, cleanDocument, formatCNPJ, formatCPF, formatTelefone, cleanTelefone, telefoneArmazenadoParaCampo } from "@/lib/validators";

type TenantFormData = CreateTenantDto & {
  telefone?: string;
  status?: Tenant["status"];
  subdominio?: string;
  data_expiracao?: string;
};

const AdminPanel = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cnpjError, setCnpjError] = useState<string>("");
  const [formData, setFormData] = useState<TenantFormData>({
    nome: "",
    cnpj: "",
    inscricaoEstadual: "",
    email: "",
    senha: "",
    telefone: "",
    status: "ATIVO",
    subdominio: "",
    data_expiracao: "",
  });
  const queryClient = useQueryClient();

  // Buscar tenants
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const data = await tenantsService.listar();
      // Log temporário para debug (apenas em desenvolvimento)
      if (import.meta.env.DEV && data.length > 0) {
        console.log('📋 Dados do tenant recebidos:', {
          primeiro_tenant: data[0],
          campos_disponiveis: Object.keys(data[0]),
          created_at: data[0].created_at,
          createdAt: (data[0] as any).createdAt,
          dataCriacao: (data[0] as any).dataCriacao,
          data_criacao: (data[0] as any).data_criacao,
        });
      }
      return data;
    },
  });

  // Buscar tenant selecionado para visualização
  const { data: selectedTenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['tenant', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      return await tenantsService.buscarPorId(selectedTenantId);
    },
    enabled: !!selectedTenantId && viewDialogOpen,
    retry: false,
  });

  // Filtrar tenants
  const filteredTenants = tenants.filter((tenant) =>
    tenant.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.cnpj.includes(searchTerm) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutations
  const resolveTenantErrorMessage = (error: any, fallback: string) => {
    let errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      fallback;

    if (error?.response?.status === 409) {
      if (
        errorMessage.toLowerCase().includes('dígitos verificadores') ||
        errorMessage.toLowerCase().includes('digitos verificadores') ||
        (errorMessage.toLowerCase().includes('inválido') &&
          (errorMessage.toLowerCase().includes('cnpj') ||
            errorMessage.toLowerCase().includes('cpf')))
      ) {
        errorMessage =
          'O CNPJ/CPF informado é inválido. Verifique se os dígitos estão corretos.';
      } else if (
        errorMessage.toLowerCase().includes('já existe') ||
        errorMessage.toLowerCase().includes('already exists') ||
        errorMessage.toLowerCase().includes('duplicado')
      ) {
        errorMessage = 'Este CNPJ/CPF ou email já está cadastrado no sistema.';
      } else {
        errorMessage =
          errorMessage || 'Este CNPJ/CPF ou email já está cadastrado no sistema';
      }
    }

    return errorMessage;
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateTenantDto) => tenantsService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Empresa criada com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(resolveTenantErrorMessage(error, 'Erro ao criar empresa'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantsService.atualizar(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Empresa atualizada com sucesso!');
      setDialogOpen(false);
      resetForm();
      if (selectedTenantId === updated.id) {
        setSelectedTenantId(updated.id);
      }
    },
    onError: (error: any) => {
      toast.error(resolveTenantErrorMessage(error, 'Erro ao atualizar empresa'));
    },
  });

  const bloquearMutation = useMutation({
    mutationFn: (id: string) => tenantsService.bloquear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Empresa bloqueada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao bloquear empresa");
    },
  });

  const desbloquearMutation = useMutation({
    mutationFn: (id: string) => tenantsService.desbloquear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Empresa desbloqueada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao desbloquear empresa");
    },
  });

  const ativarMutation = useMutation({
    mutationFn: (id: string) => tenantsService.ativar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Empresa ativada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao ativar empresa");
    },
  });

  const desativarMutation = useMutation({
    mutationFn: (id: string) => tenantsService.desativar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success("Empresa desativada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao desativar empresa");
    },
  });

  const excluirMutation = useMutation({
    mutationFn: ({ id, senha }: { id: string; senha: string }) =>
      tenantsService.excluir(id, senha),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (selectedTenantId === tenantToDelete?.id) {
        setViewDialogOpen(false);
        setSelectedTenantId(null);
      }
      setTenantToDelete(null);
      setDeleteConfirmPassword("");
      setShowDeletePassword(false);
      toast.success(
        result?.message ||
          `Empresa e schema ${result?.schema_name || ""} excluídos permanentemente.`,
      );
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao excluir empresa";
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      cnpj: "",
      inscricaoEstadual: "",
      email: "",
      senha: "",
      telefone: "",
      status: "ATIVO",
      subdominio: "",
      data_expiracao: "",
    });
    setDialogMode("create");
    setEditingTenant(null);
    setShowPassword(false);
    setCnpjError("");
  };

  const documentoLimpo = cleanDocument(formData.cnpj);
  const isCpfDocumento = documentoLimpo.length === 11;
  const isCnpjDocumento = documentoLimpo.length === 14;
  const documentoCompleto = isCpfDocumento || isCnpjDocumento;

  const handleView = (tenant: Tenant) => {
    setSelectedTenantId(tenant.id);
    setViewDialogOpen(true);
  };

  const handleEdit = async (tenant: Tenant) => {
    try {
      const full = await tenantsService.buscarPorId(tenant.id);
      setEditingTenant(full);
      setDialogMode("edit");
      setFormData({
        nome: full.nome,
        cnpj: formatDocument(full.cnpj),
        inscricaoEstadual: full.configuracoes?.empresa?.inscricaoEstadual || "",
        email: full.email,
        senha: "",
        telefone: full.telefone ? telefoneArmazenadoParaCampo(full.telefone) : "",
        status: full.status,
        subdominio: full.subdominio || "",
        data_expiracao: full.data_expiracao
          ? String(full.data_expiracao).split(/[T ]/)[0]
          : "",
      });
      setCnpjError("");
      setShowPassword(false);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Erro ao carregar empresa para edição",
      );
    }
  };

  const handleCnpjChange = (value: string) => {
    // Remove TODOS os caracteres não numéricos
    const cleaned = cleanDocument(value);
    
    // Limita o tamanho (máximo 14 dígitos para CNPJ)
    const limited = cleaned.slice(0, 14);
    
    // Formata conforme o tamanho (formatação progressiva enquanto digita)
    let formatted = limited;
    if (limited.length === 11) {
      formatted = formatCPF(limited);
    } else if (limited.length === 14) {
      formatted = formatCNPJ(limited);
    } else if (limited.length > 0) {
      // Formatação progressiva para CPF
      if (limited.length <= 11) {
        formatted = limited
          .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
          .replace(/^(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3")
          .replace(/^(\d{3})(\d{3})$/, "$1.$2")
          .replace(/^(\d{3})$/, "$1");
      } else {
        // Formatação progressiva para CNPJ
        formatted = limited
          .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
          .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "$1.$2.$3/$4")
          .replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3")
          .replace(/^(\d{2})(\d{3})$/, "$1.$2")
          .replace(/^(\d{2})$/, "$1");
      }
    }
    
    // Armazena o valor formatado no estado (para exibição)
    setFormData({ ...formData, cnpj: formatted });
    
    // Limpa erro se o campo estiver vazio
    if (limited.length === 0) {
      setCnpjError("");
      return;
    }
    
    // Validação simplificada: apenas tamanho (11 para CPF, 14 para CNPJ)
    if (limited.length === 11 || limited.length === 14) {
      setCnpjError("");
    } else if (limited.length < 11) {
      setCnpjError("CPF deve ter 11 dígitos");
    } else if (limited.length > 11 && limited.length < 14) {
      setCnpjError("CNPJ deve ter 14 dígitos");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanedCnpj = formData.cnpj.replace(/[^\d]/g, '');
    
    if (cleanedCnpj.length !== 11 && cleanedCnpj.length !== 14) {
      toast.error("CNPJ/CPF deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)");
      return;
    }
    
    if (!formData.nome.trim()) {
      toast.error("O nome da empresa é obrigatório");
      return;
    }
    
    if (!formData.email.trim()) {
      toast.error("O email é obrigatório");
      return;
    }

    if (dialogMode === "edit") {
      if (!editingTenant) {
        toast.error("Empresa não selecionada para edição");
        return;
      }

      const baseConfig = editingTenant.configuracoes || {};
      const baseEmpresa = baseConfig.empresa || {};
      const dataToUpdate: Record<string, unknown> = {
        nome: formData.nome.trim(),
        cnpj: cleanedCnpj,
        email: formData.email.trim(),
        telefone:
          formData.telefone && formData.telefone.trim() !== ''
            ? cleanTelefone(formData.telefone)
            : null,
        status: formData.status || editingTenant.status,
        subdominio: formData.subdominio?.trim() || null,
        data_expiracao: formData.data_expiracao?.trim() || null,
        configuracoes: {
          ...baseConfig,
          empresa: {
            ...baseEmpresa,
            inscricaoEstadual: formData.inscricaoEstadual?.replace(/\D/g, '') || null,
          },
        },
      };

      updateMutation.mutate({ id: editingTenant.id, data: dataToUpdate });
      return;
    }

    const dataToSend: CreateTenantDto & { telefone?: string } = {
      nome: formData.nome.trim(),
      cnpj: cleanedCnpj,
      email: formData.email.trim(),
    };

    if (formData.inscricaoEstadual?.trim()) {
      dataToSend.inscricaoEstadual = formData.inscricaoEstadual.replace(/\D/g, "");
    }
    
    if (formData.telefone && formData.telefone.trim() !== '') {
      dataToSend.telefone = cleanTelefone(formData.telefone);
    }
    
    if (!formData.senha || formData.senha.trim() === '') {
      toast.error("A senha é obrigatória para criar uma empresa");
      return;
    }
    dataToSend.senha = formData.senha;
    
    if (import.meta.env.DEV) {
      console.log('📤 Dados sendo enviados (criação):', { 
        nome: dataToSend.nome,
        cnpj: dataToSend.cnpj,
        cnpj_length: dataToSend.cnpj.length,
        cnpj_is_only_numbers: /^\d+$/.test(dataToSend.cnpj),
        email: dataToSend.email,
        telefone: dataToSend.telefone || 'não enviado',
        senha: '***',
      });
    }
    
    createMutation.mutate(dataToSend);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ATIVO: { icon: CheckCircle2, color: "bg-cyan/10 text-cyan", label: "Ativo" },
      INATIVO: { icon: XCircle, color: "bg-muted text-muted-foreground", label: "Inativo" },
      SUSPENSO: { icon: AlertCircle, color: "bg-destructive/10 text-destructive", label: "Suspenso" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INATIVO;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const stats = [
    {
      label: "Total de Empresas",
      value: tenants.length.toString(),
      icon: Building2,
      color: "text-cyan",
      bgColor: "bg-cyan/10",
    },
    {
      label: "Empresas Ativas",
      value: tenants.filter((t) => t.status === "ATIVO").length.toString(),
      icon: CheckCircle2,
      color: "text-cyan",
      bgColor: "bg-cyan/10",
    },
    {
      label: "Empresas Inativas",
      value: tenants.filter((t) => t.status === "INATIVO").length.toString(),
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
    },
    {
      label: "Empresas Suspensas",
      value: tenants.filter((t) => t.status === "SUSPENSO").length.toString(),
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg primary-gradient flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-muted-foreground">Gerencie todas as empresas do sistema</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-5 border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="gradient" 
            className="gap-2"
            onClick={() => {
              resetForm();
              setDialogMode("create");
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Criar Empresa
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) {
              // Fecha o dialog e reseta o formulário
              resetForm();
            }
            setDialogOpen(open);
          }}>
            <DialogContent className="flex max-h-[min(90vh,720px)] max-w-xl flex-col gap-0 overflow-hidden border-border/60 p-0 shadow-xl">
              <div className="shrink-0 border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-5">
                <DialogHeader className="space-y-3">
                  <div className="flex items-start gap-3 pr-8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <DialogTitle className="text-xl">
                        {dialogMode === "edit" ? "Editar Empresa" : "Nova Empresa"}
                      </DialogTitle>
                      <DialogDescription className="text-sm leading-relaxed">
                        {dialogMode === "edit"
                          ? "Atualize os dados cadastrais da empresa. Código e schema não podem ser alterados."
                          : "Cadastre um tenant com CPF (produtor rural) ou CNPJ. A Inscrição Estadual é opcional e pode ser informada depois."}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold tracking-wide text-foreground">
                      Identificação
                    </h3>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da empresa</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex.: Fazenda São João ou Empresa LTDA"
                        className="bg-background"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label htmlFor="cnpj">CPF ou CNPJ</Label>
                        {isCpfDocumento && (
                          <Badge variant="secondary" className="gap-1 text-xs font-normal">
                            <Sprout className="h-3 w-3" />
                            Produtor rural
                          </Badge>
                        )}
                        {isCnpjDocumento && (
                          <Badge variant="outline" className="text-xs font-normal">
                            Pessoa jurídica
                          </Badge>
                        )}
                      </div>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="cnpj"
                          type="text"
                          inputMode="numeric"
                          value={formData.cnpj}
                          onChange={(e) => handleCnpjChange(e.target.value)}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          required
                          maxLength={18}
                          className={`bg-background pl-10 pr-20 ${
                            cnpjError
                              ? "border-destructive"
                              : documentoCompleto
                                ? "border-emerald-500/70 focus-visible:ring-emerald-500/30"
                                : ""
                          }`}
                        />
                        {formData.cnpj.length > 0 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {documentoLimpo.length} dígitos
                          </span>
                        )}
                      </div>
                      {cnpjError ? (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {cnpjError}
                        </p>
                      ) : documentoCompleto ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {isCpfDocumento ? "CPF válido" : "CNPJ válido"}
                        </p>
                      ) : null}
                    </div>

                    {documentoCompleto && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor="inscricaoEstadual" className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                            Inscrição Estadual (IE)
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            Opcional — recomendada para emissão de NF-e
                          </span>
                        </div>
                        <Input
                          id="inscricaoEstadual"
                          type="text"
                          inputMode="numeric"
                          value={formData.inscricaoEstadual || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              inscricaoEstadual: e.target.value.replace(/\D/g, "").slice(0, 14),
                            })
                          }
                          placeholder="Somente números da IE (opcional)"
                          className="bg-background"
                          maxLength={14}
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold tracking-wide text-foreground">
                      Contato e acesso
                    </h3>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="email" className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          E-mail
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="empresa@exemplo.com"
                          className="bg-background"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="telefone" className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          Telefone
                        </Label>
                        <Input
                          id="telefone"
                          type="text"
                          inputMode="tel"
                          value={formData.telefone || ""}
                          onChange={(e) => {
                            const formatted = formatTelefone(e.target.value);
                            setFormData({ ...formData, telefone: formatted });
                          }}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          className="bg-background"
                        />
                      </div>

                      {dialogMode === "create" ? (
                        <div className="space-y-2">
                          <Label htmlFor="senha">Senha do admin</Label>
                          <div className="relative">
                            <Input
                              id="senha"
                              type={showPassword ? "text" : "password"}
                              value={formData.senha || ""}
                              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                              placeholder="Mínimo 6 caracteres"
                              required
                              className="bg-background pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                {dialogMode === "edit" && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold tracking-wide text-foreground">
                        Status e acesso
                      </h3>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status || "ATIVO"}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                status: value as Tenant["status"],
                              })
                            }
                          >
                            <SelectTrigger id="status" className="bg-background">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ATIVO">Ativo</SelectItem>
                              <SelectItem value="INATIVO">Inativo</SelectItem>
                              <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="data_expiracao">Data de expiração</Label>
                          <Input
                            id="data_expiracao"
                            type="date"
                            value={formData.data_expiracao || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, data_expiracao: e.target.value })
                            }
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="subdominio">Subdomínio</Label>
                          <Input
                            id="subdominio"
                            value={formData.subdominio || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, subdominio: e.target.value })
                            }
                            placeholder="Opcional"
                            className="bg-background"
                          />
                        </div>
                      </div>
                      {editingTenant?.codigo && (
                        <p className="text-xs text-muted-foreground">
                          Código: <span className="font-medium">{editingTenant.codigo}</span>
                          {editingTenant.schema_name
                            ? ` · Schema: ${editingTenant.schema_name}`
                            : null}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                </div>

                <div className="flex shrink-0 gap-3 border-t border-border/60 bg-background px-6 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    className="flex-1"
                    disabled={
                      dialogMode === "edit"
                        ? updateMutation.isPending
                        : createMutation.isPending
                    }
                  >
                    {dialogMode === "edit" ? (
                      updateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar alterações"
                      )
                    ) : createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Criando...
                      </>
                    ) : (
                      "Criar empresa"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabela de Empresas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-sidebar text-sidebar-foreground">
                  <th className="text-left py-3 px-4 text-sm font-medium">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">CNPJ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Criado em</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhuma empresa encontrada
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {tenant.nome}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDocument(tenant.cnpj)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {tenant.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(tenant.status)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {(() => {
                          const dataCriacao = tenant.created_at || 
                                             (tenant as any).createdAt || 
                                             (tenant as any).dataCriacao || 
                                             (tenant as any).data_criacao;
                          return dataCriacao ? formatDate(dataCriacao) : "N/A";
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(tenant)}
                            className="h-8 w-8 p-0"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tenant)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {tenant.status === "SUSPENSO" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => desbloquearMutation.mutate(tenant.id)}
                              disabled={desbloquearMutation.isPending}
                              className="h-8 w-8 p-0"
                              title="Desbloquear"
                            >
                              <Unlock className="w-4 h-4 text-cyan" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => bloquearMutation.mutate(tenant.id)}
                              disabled={bloquearMutation.isPending}
                              className="h-8 w-8 p-0"
                              title="Bloquear"
                            >
                              <Lock className="w-4 h-4 text-amber-500" />
                            </Button>
                          )}
                          {tenant.status === "ATIVO" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => desativarMutation.mutate(tenant.id)}
                              disabled={desativarMutation.isPending}
                              className="h-8 w-8 p-0"
                              title="Desativar"
                            >
                              <PowerOff className="w-4 h-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => ativarMutation.mutate(tenant.id)}
                              disabled={ativarMutation.isPending}
                              className="h-8 w-8 p-0"
                              title="Ativar"
                            >
                              <Power className="w-4 h-4 text-cyan" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTenantToDelete(tenant)}
                            disabled={excluirMutation.isPending}
                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                            title="Excluir empresa e schema"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Confirmação de exclusão */}
        <AlertDialog
          open={!!tenantToDelete}
          onOpenChange={(open) => {
            if (!open && !excluirMutation.isPending) {
              setTenantToDelete(null);
              setDeleteConfirmPassword("");
              setShowDeletePassword(false);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir empresa permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Serão removidos o cadastro da empresa{" "}
                <strong>{tenantToDelete?.nome}</strong>
                {tenantToDelete?.schema_name && (
                  <>
                    {" "}
                    e o schema <strong>{tenantToDelete.schema_name}</strong>
                  </>
                )}
                , incluindo todos os dados (usuários, pedidos, estoque, financeiro, etc.).
                Digite a senha do administrador do sistema para confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <label
                htmlFor="delete-admin-password"
                className="text-sm font-medium flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Senha do administrador do sistema
              </label>
              <div className="relative">
                <Input
                  id="delete-admin-password"
                  type={showDeletePassword ? "text" : "password"}
                  placeholder="Digite sua senha para confirmar"
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      tenantToDelete &&
                      deleteConfirmPassword.trim() &&
                      !excluirMutation.isPending
                    ) {
                      e.preventDefault();
                      excluirMutation.mutate({
                        id: tenantToDelete.id,
                        senha: deleteConfirmPassword,
                      });
                    }
                  }}
                  disabled={excluirMutation.isPending}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowDeletePassword((v) => !v)}
                  disabled={excluirMutation.isPending}
                  tabIndex={-1}
                >
                  {showDeletePassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={excluirMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={
                  excluirMutation.isPending ||
                  !tenantToDelete ||
                  !deleteConfirmPassword.trim()
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (tenantToDelete && deleteConfirmPassword.trim()) {
                    excluirMutation.mutate({
                      id: tenantToDelete.id,
                      senha: deleteConfirmPassword,
                    });
                  }
                }}
              >
                {excluirMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir permanentemente"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Empresa</DialogTitle>
            </DialogHeader>
            {isLoadingTenant ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedTenant ? (
              <div className="space-y-6 pt-4">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Nome da Empresa</Label>
                      <p className="text-sm font-medium">{selectedTenant.nome}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                        <Hash className="w-3 h-3" />
                        CNPJ/CPF
                      </Label>
                      <p className="text-sm font-medium">{formatDocument(selectedTenant.cnpj)}</p>
                    </div>
                    {selectedTenant.configuracoes?.empresa?.inscricaoEstadual && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" />
                          Inscrição Estadual
                        </Label>
                        <p className="text-sm font-medium">
                          {selectedTenant.configuracoes.empresa.inscricaoEstadual}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        Email
                      </Label>
                      <p className="text-sm font-medium">{selectedTenant.email}</p>
                    </div>
                    {selectedTenant.telefone && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          Telefone
                        </Label>
                        <p className="text-sm font-medium">{selectedTenant.telefone}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(selectedTenant.status)}</div>
                    </div>
                    {selectedTenant.codigo && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <p className="text-sm font-medium">{selectedTenant.codigo}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações Adicionais */}
                {(selectedTenant.subdominio || selectedTenant.schema_name || selectedTenant.data_expiracao) && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Informações Adicionais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTenant.subdominio && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Subdomínio</Label>
                          <p className="text-sm font-medium">{selectedTenant.subdominio}</p>
                        </div>
                      )}
                      {selectedTenant.schema_name && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Schema</Label>
                          <p className="text-sm font-medium">{selectedTenant.schema_name}</p>
                        </div>
                      )}
                      {selectedTenant.data_expiracao && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Data de Expiração</Label>
                          <p className="text-sm font-medium">{formatDate(selectedTenant.data_expiracao)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Datas do Sistema */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Informações do Sistema
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const dataCriacao = selectedTenant.created_at || 
                                         (selectedTenant as any).createdAt || 
                                         (selectedTenant as any).dataCriacao || 
                                         (selectedTenant as any).data_criacao;
                      return dataCriacao ? (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Criado em</Label>
                          <p className="text-sm font-medium">{formatDate(dataCriacao)}</p>
                        </div>
                      ) : null;
                    })()}
                    {(() => {
                      const dataAtualizacao = selectedTenant.updated_at || 
                                             (selectedTenant as any).updatedAt || 
                                             (selectedTenant as any).data_atualizacao;
                      return dataAtualizacao ? (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Atualizado em</Label>
                          <p className="text-sm font-medium">{formatDate(dataAtualizacao)}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Configurações */}
                {selectedTenant.configuracoes && Object.keys(selectedTenant.configuracoes).length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Configurações
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(selectedTenant.configuracoes, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Ações do dialog */}
                <div className="flex justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedTenant) {
                          setViewDialogOpen(false);
                          void handleEdit(selectedTenant);
                        }
                      }}
                      className="gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (selectedTenant) {
                          setTenantToDelete(selectedTenant);
                        }
                      }}
                      disabled={excluirMutation.isPending}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir empresa
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      setSelectedTenantId(null);
                    }}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Empresa não encontrada
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPanel;

