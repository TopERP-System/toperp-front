import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-error-message";
import {
  formatCEP,
  formatDocument,
  formatTelefone,
  telefoneArmazenadoParaCampo,
} from "@/lib/validators";
import { cepService } from "@/services/cep.service";
import { SpedyAdminTenantResumo, spedyService } from "@/services/spedy.service";
import { tenantsService } from "@/services/tenants.service";
import {
  tenantParaFormEmpresa,
  UpdateTenantEmpresaDto,
} from "@/types/tenant-empresa";
import { SpedyCertificadoFields } from "./SpedyCertificadoFields";

interface SpedyCadastroDialogProps {
  tenant: SpedyAdminTenantResumo;
  /** "cadastrar" cria o emissor na Spedy; "editar" corrige os dados de um emissor já cadastrado. */
  modo: "cadastrar" | "editar";
  onClose: () => void;
  onSuccess: () => void;
}

function validarFormulario(form: UpdateTenantEmpresaDto): string | null {
  if ((form.nome?.trim().length ?? 0) < 3) return "Informe a razão social.";
  if ((form.nomeFantasia?.trim().length ?? 0) < 3) {
    return "Informe o nome fantasia.";
  }
  const doc = form.cnpj?.replace(/\D/g, "") || "";
  if (doc.length !== 11 && doc.length !== 14) {
    return "CPF deve ter 11 dígitos ou CNPJ 14 dígitos.";
  }
  if ((form.cep?.replace(/\D/g, "") || "").length !== 8) {
    return "Informe um CEP com 8 dígitos.";
  }
  if (!form.logradouro?.trim()) return "Informe o logradouro.";
  if (!form.numero?.trim()) return "Informe o número.";
  if (!form.bairro?.trim()) return "Informe o bairro.";
  if (!form.cidade?.trim()) return "Informe a cidade.";
  if (form.estado?.trim().length !== 2) return "Informe a UF (2 letras).";
  return null;
}

export const SpedyCadastroDialog = ({
  tenant,
  modo,
  onClose,
  onSuccess,
}: SpedyCadastroDialogProps) => {
  const editando = modo === "editar";
  const [form, setForm] = useState<UpdateTenantEmpresaDto | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  const {
    data: tenantCompleto,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-spedy-tenant", tenant.tenant_id],
    queryFn: () => tenantsService.buscarPorId(tenant.tenant_id),
    // Sempre buscar de novo: o formulário parte dos dados atuais do tenant
    gcTime: 0,
  });

  useEffect(() => {
    if (!tenantCompleto) return;
    const inicial = tenantParaFormEmpresa(tenantCompleto);
    setForm({
      ...inicial,
      nomeFantasia: inicial.nomeFantasia || inicial.nome,
      telefone: telefoneArmazenadoParaCampo(inicial.telefone || ""),
    });
  }, [tenantCompleto]);

  const setField = <K extends keyof UpdateTenantEmpresaDto>(
    key: K,
    value: UpdateTenantEmpresaDto[K],
  ) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleBuscarCep = async () => {
    if (!form) return;
    setBuscandoCep(true);
    try {
      const dados = await cepService.buscar(form.cep || "");
      setForm((prev) =>
        prev
          ? {
              ...prev,
              cep: dados.cep,
              logradouro: dados.logradouro || prev.logradouro,
              complemento: dados.complemento || prev.complemento,
              bairro: dados.bairro || prev.bairro,
              cidade: dados.cidade,
              estado: dados.estado,
              codigoIbge: dados.codigoIbge,
            }
          : prev,
      );
      toast.success("CEP encontrado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleCadastrar = async () => {
    if (!form) return;
    const erro = validarFormulario(form);
    if (erro) {
      toast.error(erro);
      return;
    }
    if (editando) {
      setCadastrando(true);
      try {
        const { spedy_sync } = await spedyService.atualizarEmpresaAdmin(
          tenant.tenant_id,
          form,
        );
        toast.success(spedy_sync.message);
        onSuccess();
        onClose();
      } catch (err) {
        toast.error(extractApiErrorMessage(err));
        // Os dados podem ter sido salvos no TopERP mesmo com falha na Spedy
        onSuccess();
      } finally {
        setCadastrando(false);
      }
      return;
    }

    if (form.spedyAmbiente === "producao" && !arquivo) {
      toast.error("Certificado digital (.pfx) é obrigatório para produção.");
      return;
    }
    if (arquivo && !senha.trim()) {
      toast.error("Informe a senha do certificado digital.");
      return;
    }

    setCadastrando(true);
    try {
      const result = await spedyService.ativarAdmin(
        tenant.tenant_id,
        form,
        arquivo ?? undefined,
        senha.trim() || undefined,
      );
      toast.success(result.message);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
      // A empresa pode ter sido criada na Spedy mesmo com falha em etapa posterior
      onSuccess();
    } finally {
      setCadastrando(false);
    }
  };

  const emProducao = form?.spedyAmbiente === "producao";

  return (
    <Dialog open onOpenChange={(open) => !open && !cadastrando && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle>
            {editando ? "Editar dados da empresa" : "Cadastrar na Spedy"}
          </DialogTitle>
          <DialogDescription>
            {editando ? (
              <>
                Corrige os dados de <strong>{tenant.nome}</strong> no TopERP e
                reenvia o cadastro do emissor para a Spedy.
              </>
            ) : (
              <>
                Cria <strong>{tenant.nome}</strong> como emissora de notas
                fiscais na Spedy e grava a chave de API na empresa. Os dados
                abaixo também são salvos no cadastro da empresa.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {extractApiErrorMessage(error)}
            </p>
          ) : !form ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <fieldset disabled={cadastrando} className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2">
                <h3 className="text-sm font-semibold sm:col-span-2">Empresa</h3>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="spedy-razao">Razão social *</Label>
                  <Input
                    id="spedy-razao"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="spedy-fantasia">Nome fantasia *</Label>
                  <Input
                    id="spedy-fantasia"
                    value={form.nomeFantasia}
                    onChange={(e) => setField("nomeFantasia", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spedy-documento">CNPJ/CPF *</Label>
                  <Input
                    id="spedy-documento"
                    value={formatDocument(form.cnpj || "")}
                    onChange={(e) =>
                      setField("cnpj", e.target.value.replace(/\D/g, "").slice(0, 14))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spedy-ie">Inscrição estadual</Label>
                  <Input
                    id="spedy-ie"
                    value={form.inscricaoEstadual}
                    onChange={(e) => setField("inscricaoEstadual", e.target.value)}
                    placeholder="Número ou ISENTO"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spedy-email">E-mail</Label>
                  <Input
                    id="spedy-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spedy-telefone">Telefone</Label>
                  <Input
                    id="spedy-telefone"
                    value={form.telefone}
                    onChange={(e) =>
                      setField("telefone", formatTelefone(e.target.value))
                    }
                  />
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-6">
                <h3 className="text-sm font-semibold sm:col-span-6">Endereço</h3>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="spedy-cep">CEP *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="spedy-cep"
                      value={formatCEP(form.cep || "")}
                      onChange={(e) =>
                        setField("cep", e.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={handleBuscarCep}
                      disabled={buscandoCep}
                      title="Buscar CEP"
                      aria-label="Buscar CEP"
                    >
                      {buscandoCep ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-4">
                  <Label htmlFor="spedy-logradouro">Logradouro *</Label>
                  <Input
                    id="spedy-logradouro"
                    value={form.logradouro}
                    onChange={(e) => setField("logradouro", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="spedy-numero">Número *</Label>
                  <Input
                    id="spedy-numero"
                    value={form.numero}
                    onChange={(e) => setField("numero", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-4">
                  <Label htmlFor="spedy-complemento">Complemento</Label>
                  <Input
                    id="spedy-complemento"
                    value={form.complemento}
                    onChange={(e) => setField("complemento", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="spedy-bairro">Bairro *</Label>
                  <Input
                    id="spedy-bairro"
                    value={form.bairro}
                    onChange={(e) => setField("bairro", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="spedy-cidade">Cidade *</Label>
                  <Input
                    id="spedy-cidade"
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="spedy-uf">UF *</Label>
                  <Input
                    id="spedy-uf"
                    value={form.estado}
                    maxLength={2}
                    onChange={(e) =>
                      setField("estado", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <h3 className="text-sm font-semibold sm:col-span-2">Fiscal</h3>
                <div className="space-y-2">
                  <Label>Regime tributário</Label>
                  <Select
                    value={form.regimeTributario}
                    onValueChange={(v) =>
                      setField(
                        "regimeTributario",
                        v as UpdateTenantEmpresaDto["regimeTributario"],
                      )
                    }
                  >
                    <SelectTrigger aria-label="Regime tributário">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                      <SelectItem value="REGIME_NORMAL">Regime Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spedy-cnae">CNAE principal</Label>
                  <Input
                    id="spedy-cnae"
                    value={form.cnae}
                    onChange={(e) =>
                      setField("cnae", e.target.value.replace(/\D/g, "").slice(0, 7))
                    }
                  />
                </div>
              </section>

              {!editando && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Emissão</h3>
                <div className="space-y-2 sm:max-w-xs">
                  <Label>Ambiente</Label>
                  <Select
                    value={form.spedyAmbiente}
                    onValueChange={(v) =>
                      setField(
                        "spedyAmbiente",
                        v as UpdateTenantEmpresaDto["spedyAmbiente"],
                      )
                    }
                  >
                    <SelectTrigger aria-label="Ambiente">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SpedyCertificadoFields
                  arquivo={arquivo}
                  senha={senha}
                  onArquivoChange={setArquivo}
                  onSenhaChange={setSenha}
                  disabled={cadastrando}
                  ajuda={
                    emProducao
                      ? "Obrigatório em produção."
                      : "Opcional em homologação (sem certificado válido as notas podem ser rejeitadas)."
                  }
                />
              </section>
              )}
            </fieldset>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={cadastrando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCadastrar}
            disabled={!form || cadastrando}
          >
            {cadastrando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {editando ? "Salvando..." : "Cadastrando na Spedy..."}
              </>
            ) : editando ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar e sincronizar
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Cadastrar na Spedy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
