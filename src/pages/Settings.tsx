import AppLayout from "@/components/layout/AppLayout";
import { TableRowActionsMenu } from "@/components/TableRowActionsMenu";
import { EmpresaConfigSection } from "@/components/settings/EmpresaConfigSection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { ROTULO_ROCA_PADRAO, buildRotulosRoca } from "@/lib/rotulo-roca";
import { formatDate } from "@/lib/utils";
import { Configuracoes, configuracoesService } from "@/services/configuracoes.service";
import { tenantsService } from "@/services/tenants.service";
import { UpdateTenantEmpresaDto } from "@/types/tenant-empresa";
import { CreateUsuarioDto, UpdateUsuarioDto, Usuario, usuariosService } from "@/services/usuarios.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft,
    Building2,
    Edit,
    EyeOff,
    Loader2,
    Plus,
    Power,
    PowerOff,
    RotateCcw,
    Save,
    Search,
    Settings as SettingsIcon,
    Sprout,
    Trash2,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [userForm, setUserForm] = useState<CreateUsuarioDto>({
    nome: "",
    email: "",
    senha: "",
    role: "VENDEDOR",
    ativo: true,
  });
  const [rotuloRocaDraft, setRotuloRocaDraft] = useState(ROTULO_ROCA_PADRAO);
  const [ocultarControleRocaDraft, setOcultarControleRocaDraft] = useState(false);

  // Buscar usuários
  const { data: usuarios, isLoading: loadingUsuarios } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => usuariosService.listar(),
    enabled: activeTab === "usuarios" && (user?.role === "ADMIN" || user?.role === "GERENTE"),
  });

  // Buscar configurações
  const { data: configuracoes, isLoading: loadingConfig } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: () => configuracoesService.obter(),
    enabled: activeTab === "configuracoes" && (user?.role === "ADMIN" || user?.role === "GERENTE"),
  });

  useEffect(() => {
    if (!configuracoes) return;
    setRotuloRocaDraft(
      String(configuracoes.rotulo_roca ?? "").trim() || ROTULO_ROCA_PADRAO,
    );
    setOcultarControleRocaDraft(Boolean(configuracoes.ocultar_menu_controle_roca));
  }, [configuracoes]);

  // Buscar informações do tenant usando o novo endpoint
  const { data: tenantInfo, isLoading: loadingTenant, error: tenantError } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => tenantsService.obterMeuTenant(),
    enabled: activeTab === "empresa" && (user?.role === "ADMIN" || user?.role === "GERENTE"),
    retry: false,
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: CreateUsuarioDto) => usuariosService.criar(data),
    onSuccess: (novoUsuario) => {
      // Atualiza a lista de usuários imediatamente adicionando o novo usuário
      queryClient.setQueryData<Usuario[]>(["usuarios"], (oldData = []) => {
        return [...oldData, novoUsuario];
      });
      // Também invalida para garantir que os dados estejam sincronizados
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setIsUserDialogOpen(false);
      resetUserForm();
      toast.success("Usuário criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao criar usuário");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUsuarioDto }) =>
      usuariosService.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setIsUserDialogOpen(false);
      setEditingUser(null);
      resetUserForm();
      toast.success("Usuário atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao atualizar usuário");
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      ativo ? usuariosService.ativar(id) : usuariosService.desativar(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success(`Usuário ${variables.ativo ? "ativado" : "desativado"} com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao alterar status do usuário");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usuariosService.deletar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário removido com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao remover usuário");
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<Configuracoes>) => configuracoesService.atualizar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erro ao salvar configurações");
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: (data: UpdateTenantEmpresaDto) => tenantsService.atualizarMeuTenant(data),
    onSuccess: (tenant: any) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-me"] });
      queryClient.invalidateQueries({ queryKey: ["spedy-tenant-status"] });
      queryClient.invalidateQueries({ queryKey: ["spedy-numeracao-nfe"] });
      const syncMsg = tenant?.spedy_sync?.message as string | undefined;
      toast.success(
        syncMsg || "Informações da empresa atualizadas com sucesso!",
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message;
      if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.join(", "));
      } else {
        toast.error(errorMessage || "Erro ao atualizar informações da empresa");
      }
    },
  });

  // Filtros
  const filteredUsuarios = usuarios?.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Handlers
  const resetUserForm = () => {
    setUserForm({
      nome: "",
      email: "",
      senha: "",
      role: "VENDEDOR",
      ativo: true,
    });
    setEditingUser(null);
  };

  const handleOpenUserDialog = (user?: Usuario) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        nome: user.nome,
        email: user.email,
        role: user.role,
        ativo: user.ativo,
        senha: "",
      });
    } else {
      resetUserForm();
    }
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: userForm,
      });
    } else {
      if (!userForm.senha) {
        toast.error("A senha é obrigatória para novos usuários");
        return;
      }
      createUserMutation.mutate(userForm);
    }
  };

  const handleToggleUserStatus = (usuario: Usuario) => {
    toggleUserStatusMutation.mutate({
      id: usuario.id,
      ativo: !usuario.ativo,
    });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Tem certeza que deseja remover este usuário? Esta ação é irreversível.")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate({
      moeda: configuracoes?.moeda || "BRL",
      fuso_horario: configuracoes?.fuso_horario || "America/Sao_Paulo",
      idioma: configuracoes?.idioma || "pt-BR",
      rotulo_roca: rotuloRocaDraft.trim() || ROTULO_ROCA_PADRAO,
      ocultar_menu_controle_roca: ocultarControleRocaDraft,
    });
  };

  const handleRestoreConfig = () => {
    setRotuloRocaDraft(ROTULO_ROCA_PADRAO);
    setOcultarControleRocaDraft(false);
    updateConfigMutation.mutate({
      moeda: "BRL",
      fuso_horario: "America/Sao_Paulo",
      idioma: "pt-BR",
      rotulo_roca: ROTULO_ROCA_PADRAO,
      ocultar_menu_controle_roca: false,
    });
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; variant: "default" | "secondary" }> = {
      ADMIN: { label: "Administrador", variant: "default" },
      GERENTE: { label: "Gerente", variant: "secondary" },
      VENDEDOR: { label: "Vendedor", variant: "secondary" },
      FINANCEIRO: { label: "Financeiro", variant: "secondary" },
      SUPER_ADMIN: { label: "Super Admin", variant: "default" },
    };
    return roles[role] || { label: role, variant: "secondary" };
  };

  const getUserInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastAccess = (date?: string | null) => {
    if (!date) return "—";
    try {
      return formatDate(date);
    } catch {
      return "—";
    }
  };

  // Verificar permissões
  const canManageUsers = user?.role === "ADMIN" || user?.role === "GERENTE";
  const canEditConfig = user?.role === "ADMIN";
  const canViewConfig = user?.role === "ADMIN" || user?.role === "GERENTE";

  if (!canManageUsers && !canViewConfig) {
    return (
      <AppLayout>
        <div className="p-3 sm:p-4 md:p-6 min-w-0">
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie usuários e preferências do sistema
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
          </TabsList>

          {/* Tab: Usuários */}
          <TabsContent value="usuarios" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuários
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredUsuarios.length} usuário(s) cadastrado(s)
                  </p>
                </div>
                <Button onClick={() => handleOpenUserDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {loadingUsuarios ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Carregando usuários...</p>
                    </div>
                  ) : filteredUsuarios.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Último Acesso</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsuarios.map((usuario) => {
                          const roleBadge = getRoleBadge(usuario.role);
                          return (
                            <TableRow key={usuario.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarFallback>
                                      {getUserInitials(usuario.nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-foreground">{usuario.nome}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {usuario.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={usuario.ativo ? "default" : "secondary"}
                                  className={
                                    usuario.ativo
                                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                      : ""
                                  }
                                >
                                  {usuario.ativo ? "Ativo" : "Inativo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatLastAccess(usuario.ultimo_acesso)}
                              </TableCell>
                              <TableCell>
                                <TableRowActionsMenu>
                                    <DropdownMenuItem onClick={() => handleOpenUserDialog(usuario)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleToggleUserStatus(usuario)}
                                    >
                                      {usuario.ativo ? (
                                        <>
                                          <PowerOff className="h-4 w-4 mr-2" />
                                          Desativar
                                        </>
                                      ) : (
                                        <>
                                          <Power className="h-4 w-4 mr-2" />
                                          Ativar
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteUser(usuario.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Deletar
                                    </DropdownMenuItem>
                                </TableRowActionsMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Configurações */}
          <TabsContent value="configuracoes" className="mt-6">
            {!canViewConfig ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Você não tem permissão para visualizar configurações.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Configurações Gerais
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Personalize as preferências do sistema
                  </p>
                </div>

                {loadingConfig ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Carregando configurações...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Moeda */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Moeda Padrão</CardTitle>
                        <CardDescription>
                          Moeda utilizada em valores monetários
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={configuracoes?.moeda || "BRL"}
                          onValueChange={(value) => {
                            if (canEditConfig) {
                              updateConfigMutation.mutate({ moeda: value });
                            }
                          }}
                          disabled={!canEditConfig}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                            <SelectItem value="USD">Dólar Americano (US$)</SelectItem>
                            <SelectItem value="EUR">Euro (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Fuso Horário */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Fuso Horário</CardTitle>
                        <CardDescription>
                          Fuso horário para exibição de datas
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={configuracoes?.fuso_horario || "America/Sao_Paulo"}
                          onValueChange={(value) => {
                            if (canEditConfig) {
                              updateConfigMutation.mutate({ fuso_horario: value });
                            }
                          }}
                          disabled={!canEditConfig}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                            <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                            <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                            <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                            <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Idioma */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Idioma</CardTitle>
                        <CardDescription>
                          Idioma da interface do sistema
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={configuracoes?.idioma || "pt-BR"}
                          onValueChange={(value) => {
                            if (canEditConfig) {
                              updateConfigMutation.mutate({ idioma: value });
                            }
                          }}
                          disabled={!canEditConfig}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                            <SelectItem value="en-US">English (US)</SelectItem>
                            <SelectItem value="es-ES">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Rótulo Roça → Empresa (ou personalizado) */}
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sprout className="h-4 w-4" />
                          Nome no lugar de &quot;Roça&quot;
                        </CardTitle>
                        <CardDescription>
                          Troca o texto &quot;Roça&quot; no Dashboard, Financeiro, Comercial e
                          Movimentações. O módulo Controle de Roça continua com o nome original.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="rotulo-roca">Nome exibido</Label>
                            <Input
                              id="rotulo-roca"
                              value={rotuloRocaDraft}
                              maxLength={40}
                              disabled={!canEditConfig}
                              placeholder="Ex.: Empresa, Unidade, Fazenda…"
                              onChange={(e) => setRotuloRocaDraft(e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!canEditConfig}
                            onClick={() => {
                              setRotuloRocaDraft("Empresa");
                              if (canEditConfig) {
                                updateConfigMutation.mutate({
                                  rotulo_roca: "Empresa",
                                  ocultar_menu_controle_roca: ocultarControleRocaDraft,
                                });
                              }
                            }}
                          >
                            Usar &quot;Empresa&quot;
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const preview = buildRotulosRoca(rotuloRocaDraft);
                            return `Exemplos na tela: "${preview.singular}", "${preview.todas}". Clique em Salvar para aplicar em todo o sistema.`;
                          })()}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Ocultar Controle de Roça */}
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <EyeOff className="h-4 w-4" />
                          Menu Controle de Roça
                        </CardTitle>
                        <CardDescription>
                          Oculta o item &quot;Controle de Roça&quot; do menu lateral para todos os usuários.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">Ocultar Controle de Roça</p>
                            <p className="text-xs text-muted-foreground">
                              Quando ativo, o módulo some do menu (a rota direta continua existindo).
                            </p>
                          </div>
                          <Switch
                            checked={ocultarControleRocaDraft}
                            disabled={!canEditConfig}
                            onCheckedChange={(checked) => {
                              setOcultarControleRocaDraft(checked);
                              if (canEditConfig) {
                                updateConfigMutation.mutate({
                                  ocultar_menu_controle_roca: checked,
                                  rotulo_roca:
                                    rotuloRocaDraft.trim() || ROTULO_ROCA_PADRAO,
                                });
                              }
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={handleRestoreConfig}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar
                  </Button>
                  <Button
                    onClick={handleSaveConfig}
                    disabled={!canEditConfig || updateConfigMutation.isPending}
                  >
                    {updateConfigMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>

                {!canEditConfig && (
                  <Card className="border-amber-500/20 bg-amber-500/5">
                    <CardContent className="p-4">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Você tem permissão apenas para visualizar as configurações. Entre em
                        contato com um Administrador para fazer alterações.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab: Empresa */}
          <TabsContent value="empresa" className="mt-6">
            <EmpresaConfigSection
              tenantInfo={tenantInfo}
              loading={loadingTenant}
              error={tenantError}
              canEdit={canEditConfig}
              saving={updateTenantMutation.isPending}
              onSave={(data) => updateTenantMutation.mutate(data)}
            />
          </TabsContent>
        </Tabs>

        {/* Dialog: Criar/Editar Usuário */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Atualize as informações do usuário abaixo."
                  : "Preencha os dados para criar um novo usuário."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={userForm.nome}
                  onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">
                  Senha {editingUser && "(deixe em branco para não alterar)"}
                </Label>
                <Input
                  id="senha"
                  type="password"
                  value={userForm.senha}
                  onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value: any) =>
                    setUserForm({ ...userForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="GERENTE">Gerente</SelectItem>
                    <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                    <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsUserDialogOpen(false);
                  resetUserForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={
                  createUserMutation.isPending ||
                  updateUserMutation.isPending ||
                  !userForm.nome ||
                  !userForm.email ||
                  (!editingUser && !userForm.senha)
                }
              >
                {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
};

export default Settings;

