import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  FlaskConical,
  KeyRound,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpedyCadastroDialog } from "@/components/admin/SpedyCadastroDialog";
import { SpedyCertificadoDialog } from "@/components/admin/SpedyCertificadoDialog";
import { SpedyChaveDialog } from "@/components/admin/SpedyChaveDialog";
import AdminLayout from "@/components/layout/AdminLayout";
import { extractApiErrorMessage } from "@/lib/api-error-message";
import { cleanDocument, formatDocument } from "@/lib/validators";
import { SpedyAdminTenantResumo, spedyService } from "@/services/spedy.service";

type SituacaoSpedy = "nao_cadastrada" | "homologacao" | "producao";
type FiltroSituacao = SituacaoSpedy | "todas";

const SITUACAO_CONFIG: Record<
  SituacaoSpedy,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  nao_cadastrada: {
    icon: XCircle,
    color: "bg-muted text-muted-foreground",
    label: "Não cadastrada",
  },
  homologacao: {
    icon: FlaskConical,
    color: "bg-amber-500/10 text-amber-600",
    label: "Homologação",
  },
  producao: {
    icon: CheckCircle2,
    color: "bg-cyan/10 text-cyan",
    label: "Produção",
  },
};

const PENDENCIA_LABEL: Record<string, string> = {
  nome: "Nome",
  documento: "CNPJ/CPF",
  cep: "CEP",
  logradouro: "Logradouro",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  estado: "UF",
};

function situacaoDoTenant(tenant: SpedyAdminTenantResumo): SituacaoSpedy {
  if (!tenant.emissor_cadastrado && !tenant.integracao_ativa) {
    return "nao_cadastrada";
  }
  return tenant.ambiente;
}

const AdminSpedy = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>("todas");
  const [tenantParaCadastrar, setTenantParaCadastrar] =
    useState<SpedyAdminTenantResumo | null>(null);
  const [tenantParaEditar, setTenantParaEditar] =
    useState<SpedyAdminTenantResumo | null>(null);
  const [tenantParaChave, setTenantParaChave] =
    useState<SpedyAdminTenantResumo | null>(null);
  const [tenantParaCertificado, setTenantParaCertificado] =
    useState<SpedyAdminTenantResumo | null>(null);
  const queryClient = useQueryClient();

  const recarregarLista = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-spedy-tenants"] });

  const {
    data: tenants = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-spedy-tenants"],
    queryFn: () => spedyService.listarTenantsAdmin(),
  });

  const filteredTenants = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    const termoDocumento = cleanDocument(searchTerm);

    return tenants.filter((tenant) => {
      if (
        filtroSituacao !== "todas" &&
        situacaoDoTenant(tenant) !== filtroSituacao
      ) {
        return false;
      }
      if (!termo) return true;
      return (
        tenant.nome.toLowerCase().includes(termo) ||
        (termoDocumento !== "" &&
          cleanDocument(tenant.cnpj ?? "").includes(termoDocumento))
      );
    });
  }, [tenants, searchTerm, filtroSituacao]);

  const contar = (situacao: SituacaoSpedy) =>
    tenants.filter((t) => situacaoDoTenant(t) === situacao).length.toString();

  const stats = [
    {
      label: "Total de Empresas",
      value: tenants.length.toString(),
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Não cadastradas na Spedy",
      value: contar("nao_cadastrada"),
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
    },
    {
      label: "Em Homologação",
      value: contar("homologacao"),
      icon: FlaskConical,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Em Produção",
      value: contar("producao"),
      icon: CheckCircle2,
      color: "text-cyan",
      bgColor: "bg-cyan/10",
    },
  ];

  const renderSituacao = (tenant: SpedyAdminTenantResumo) => {
    const config = SITUACAO_CONFIG[situacaoDoTenant(tenant)];
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const renderDadosCadastro = (tenant: SpedyAdminTenantResumo) => {
    if (tenant.dados_completos) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-cyan">
          <CheckCircle2 className="w-3 h-3" />
          Completos
        </span>
      );
    }
    const faltando = tenant.pendencias
      .map((p) => PENDENCIA_LABEL[p] ?? p)
      .join(", ");
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-amber-600"
        title={`Faltando: ${faltando}`}
      >
        <AlertCircle className="w-3 h-3 shrink-0" />
        Faltando: {faltando}
      </span>
    );
  };

  const renderBotaoChave = (tenant: SpedyAdminTenantResumo) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 w-9 p-0"
      onClick={() => setTenantParaChave(tenant)}
      title="Informar chave de API manualmente"
      aria-label="Informar chave de API manualmente"
    >
      <KeyRound className="w-4 h-4" />
    </Button>
  );

  const renderAcoes = (tenant: SpedyAdminTenantResumo) => {
    if (!tenant.emissor_cadastrado) {
      return (
        <>
        <Button
          size="sm"
          onClick={() => setTenantParaCadastrar(tenant)}
          disabled={!tenant.pode_ativar}
          title={
            tenant.pode_ativar
              ? undefined
              : "Cadastro automático indisponível: SPEDY_MASTER_API_KEY não configurada no servidor."
          }
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          Cadastrar na Spedy
        </Button>
        {renderBotaoChave(tenant)}
        </>
      );
    }
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTenantParaEditar(tenant)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar dados
        </Button>
        {tenant.pode_atualizar_certificado && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTenantParaCertificado(tenant)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Certificado
          </Button>
        )}
        {renderBotaoChave(tenant)}
      </>
    );
  };

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
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Spedy</h1>
              <p className="text-muted-foreground">
                Situação das empresas na emissão de notas fiscais
              </p>
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

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ/CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filtroSituacao}
            onValueChange={(v) => setFiltroSituacao(v as FiltroSituacao)}
          >
            <SelectTrigger className="sm:w-56" aria-label="Filtrar por situação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as situações</SelectItem>
              <SelectItem value="nao_cadastrada">Não cadastrada</SelectItem>
              <SelectItem value="homologacao">Homologação</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
            </SelectContent>
          </Select>
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
                  <th className="text-left py-3 px-4 text-sm font-medium">Empresa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">CNPJ/CPF</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Situação na Spedy</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">ID do emissor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Dados para cadastro</th>
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
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <p className="text-destructive mb-3">
                        {extractApiErrorMessage(error) ||
                          "Não foi possível carregar as empresas."}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Tentar novamente
                      </Button>
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
                      key={tenant.tenant_id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {tenant.nome}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {tenant.cnpj ? formatDocument(tenant.cnpj) : "—"}
                      </td>
                      <td className="py-3 px-4">{renderSituacao(tenant)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                        {tenant.company_id ?? "—"}
                      </td>
                      <td className="py-3 px-4">{renderDadosCadastro(tenant)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {renderAcoes(tenant)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {tenantParaCadastrar && (
        <SpedyCadastroDialog
          key={tenantParaCadastrar.tenant_id}
          tenant={tenantParaCadastrar}
          modo="cadastrar"
          onClose={() => setTenantParaCadastrar(null)}
          onSuccess={recarregarLista}
        />
      )}
      {tenantParaEditar && (
        <SpedyCadastroDialog
          key={tenantParaEditar.tenant_id}
          tenant={tenantParaEditar}
          modo="editar"
          onClose={() => setTenantParaEditar(null)}
          onSuccess={recarregarLista}
        />
      )}
      {tenantParaChave && (
        <SpedyChaveDialog
          key={tenantParaChave.tenant_id}
          tenant={tenantParaChave}
          onClose={() => setTenantParaChave(null)}
          onSuccess={recarregarLista}
        />
      )}
      {tenantParaCertificado && (
        <SpedyCertificadoDialog
          key={tenantParaCertificado.tenant_id}
          tenant={tenantParaCertificado}
          onClose={() => setTenantParaCertificado(null)}
          onSuccess={recarregarLista}
        />
      )}
    </AdminLayout>
  );
};

export default AdminSpedy;
