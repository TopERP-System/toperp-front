import { CampoCnpjComConsulta } from '@/components/CampoCnpjComConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatCEP, formatDocument, formatTelefone, telefoneArmazenadoParaCampo } from '@/lib/validators';
import { extractApiErrorMessage } from '@/lib/api-error-message';
import { cepService } from '@/services/cep.service';
import { ConsultaCnpjResponse } from '@/services/cnpj.service';
import { spedyService } from '@/services/spedy.service';
import { Tenant } from '@/services/tenants.service';
import {
  EMPRESA_FORM_PADRAO,
  tenantParaFormEmpresa,
  UpdateTenantEmpresaDto,
} from '@/types/tenant-empresa';
import {
  Building2,
  FileText,
  Globe,
  KeyRound,
  Loader2,
  MapPin,
  Receipt,
  Save,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EmpresaConfigSectionProps {
  tenantInfo?: Tenant;
  loading: boolean;
  error: unknown;
  canEdit: boolean;
  saving: boolean;
  onSave: (data: UpdateTenantEmpresaDto) => void;
}

export function EmpresaConfigSection({
  tenantInfo,
  loading,
  error,
  canEdit,
  saving,
  onSave,
}: EmpresaConfigSectionProps) {
  const queryClient = useQueryClient();
  const certInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UpdateTenantEmpresaDto>(EMPRESA_FORM_PADRAO);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [senhaCertificado, setSenhaCertificado] = useState('');
  const [ativandoSpedy, setAtivandoSpedy] = useState(false);
  const [atualizandoCertificado, setAtualizandoCertificado] = useState(false);
  const numeracaoAplicadaRef = useRef(false);

  const { data: spedyStatus, isLoading: loadingSpedyStatus } = useQuery({
    queryKey: ['spedy-tenant-status'],
    queryFn: async () => {
      try {
        return await spedyService.obterStatus();
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: canEdit && !loading,
    retry: false,
  });

  const integracaoAtivaQuery =
    spedyStatus?.integracao_ativa ||
    Boolean(tenantInfo?.configuracoes?.spedy?.apiKey);

  const { data: numeracaoNfe } = useQuery({
    queryKey: ['spedy-numeracao-nfe'],
    queryFn: () => spedyService.obterNumeracaoNfe(),
    enabled: canEdit && !loading && !!integracaoAtivaQuery,
    retry: false,
  });

  useEffect(() => {
    if (tenantInfo) {
      numeracaoAplicadaRef.current = false;
      setForm(tenantParaFormEmpresa(tenantInfo));
    }
  }, [tenantInfo]);

  useEffect(() => {
    if (!numeracaoNfe || numeracaoAplicadaRef.current) return;
    numeracaoAplicadaRef.current = true;
    setForm((prev) => ({
      ...prev,
      serieNfe: numeracaoNfe.serie || prev.serieNfe || '1',
      proximoNumeroNfe: numeracaoNfe.proximoNumero || prev.proximoNumeroNfe || 1,
    }));
  }, [numeracaoNfe]);

  const setField = <K extends keyof UpdateTenantEmpresaDto>(
    key: K,
    value: UpdateTenantEmpresaDto[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCnpjPreencher = (dados: ConsultaCnpjResponse) => {
    setForm((prev) => ({
      ...prev,
      nome: dados.razaoSocial || prev.nome,
      nomeFantasia: dados.nomeFantasia || prev.nomeFantasia,
      inscricaoEstadual: dados.inscricaoEstadual || prev.inscricaoEstadual,
      cep: dados.cep || prev.cep,
      logradouro: dados.logradouro || prev.logradouro,
      numero: dados.numero || prev.numero,
      bairro: dados.bairro || prev.bairro,
      cidade: dados.cidade || prev.cidade,
      estado: dados.uf || prev.estado,
      telefone: dados.telefones?.[0]
        ? telefoneArmazenadoParaCampo(dados.telefones[0])
        : prev.telefone,
    }));
    if (dados.cep) {
      void buscarCep(dados.cep);
    }
  };

  const buscarCep = async (cepInformado?: string) => {
    const cep = cepInformado || form.cep;
    if (!cep?.replace(/\D/g, '')) {
      toast.error('Informe um CEP válido.');
      return;
    }
    setBuscandoCep(true);
    try {
      const dados = await cepService.buscar(cep);
      setForm((prev) => ({
        ...prev,
        cep: dados.cep,
        logradouro: dados.logradouro || prev.logradouro,
        complemento: dados.complemento || prev.complemento,
        bairro: dados.bairro || prev.bairro,
        cidade: dados.cidade,
        estado: dados.estado,
        codigoIbge: dados.codigoIbge,
      }));
      toast.success('CEP encontrado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao buscar CEP.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const disabled = !canEdit || saving;

  const docEmitente = (form.cnpj || '').replace(/\D/g, '');
  const emitenteCpf = docEmitente.length === 11;
  const emitenteCnpj = docEmitente.length === 14;

  const validarFormularioEmpresa = (): string | null => {
    if (!form.nome?.trim()) return 'Informe a razão social.';
    if (!form.nomeFantasia?.trim()) return 'Informe o nome fantasia.';
    const doc = form.cnpj?.replace(/\D/g, '') || '';
    if (!doc) return 'Informe o CPF ou CNPJ.';
    if (doc.length !== 11 && doc.length !== 14) {
      return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos.';
    }
    if (!form.cep?.replace(/\D/g, '')) return 'Informe o CEP.';
    if (!form.logradouro?.trim()) return 'Informe o logradouro.';
    if (!form.numero?.trim()) return 'Informe o número.';
    if (!form.bairro?.trim()) return 'Informe o bairro.';
    if (!form.cidade?.trim()) return 'Informe a cidade.';
    if (!form.estado?.trim()) return 'Informe a UF.';
    return null;
  };

  const handleAtivarSpedy = async () => {
    const erro = validarFormularioEmpresa();
    if (erro) {
      toast.error(erro);
      return;
    }

    const ambiente = form.spedyAmbiente || 'homologacao';
    if (ambiente === 'producao' && !certificadoFile) {
      toast.error('Certificado digital (.pfx) é obrigatório para produção.');
      return;
    }
    if (certificadoFile && !senhaCertificado.trim()) {
      toast.error('Informe a senha do certificado digital.');
      return;
    }

    setAtivandoSpedy(true);
    try {
      const result = await spedyService.ativar(
        form,
        certificadoFile ?? undefined,
        senhaCertificado.trim() || undefined,
      );
      toast.success(result.message);
      setCertificadoFile(null);
      setSenhaCertificado('');
      if (certInputRef.current) certInputRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      await queryClient.invalidateQueries({ queryKey: ['spedy-tenant-status'] });
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setAtivandoSpedy(false);
    }
  };

  const integracaoAtiva =
    spedyStatus?.integracao_ativa ||
    Boolean(tenantInfo?.configuracoes?.spedy?.apiKey);

  const emissorCadastrado = Boolean(
    spedyStatus?.emissor_cadastrado || spedyStatus?.company_id,
  );

  const handleAtualizarCertificado = async () => {
    if (!certificadoFile) {
      toast.error('Selecione o arquivo do certificado digital (.pfx).');
      return;
    }
    if (!senhaCertificado.trim()) {
      toast.error('Informe a senha do certificado digital.');
      return;
    }

    setAtualizandoCertificado(true);
    try {
      const result = await spedyService.atualizarCertificado(
        certificadoFile,
        senhaCertificado,
      );
      toast.success(result.message);
      setCertificadoFile(null);
      setSenhaCertificado('');
      if (certInputRef.current) certInputRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey: ['spedy-tenant-status'] });
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setAtualizandoCertificado(false);
    }
  };

  const podeMostrarAtivacao =
    canEdit &&
    spedyStatus?.cadastro_automatico_disponivel &&
    spedyStatus?.pode_ativar;

  const podeMostrarAtualizarCertificado =
    canEdit &&
    integracaoAtiva &&
    emissorCadastrado &&
    (spedyStatus?.pode_atualizar_certificado ?? true);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando informações da empresa...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-6">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Não foi possível carregar as informações da empresa.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!tenantInfo) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Não foi possível obter os dados da empresa.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresa
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dados cadastrais, endereço, fiscal e integração NF-e (Spedy)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="default"
            className={
              tenantInfo.status === 'ATIVO'
                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            }
          >
            {tenantInfo.status || 'ATIVO'}
          </Badge>
          {tenantInfo.subdominio && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              {tenantInfo.subdominio}
            </span>
          )}
        </div>
      </div>

      {!canEdit && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-600 dark:text-amber-400">
            Apenas Administradores podem editar estes dados. Você está em modo de visualização.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Dados cadastrais
          </CardTitle>
          <CardDescription>Razão social, documentos e contato do emitente</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Razão social *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setField('nome', e.target.value)}
              disabled={disabled}
              placeholder="Empresa LTDA"
            />
          </div>
          <div className="space-y-2">
            <Label>Nome fantasia</Label>
            <Input
              value={form.nomeFantasia}
              onChange={(e) => setField('nomeFantasia', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label>CPF/CNPJ</Label>
              {emitenteCpf && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Pessoa física
                </Badge>
              )}
              {emitenteCnpj && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Pessoa jurídica
                </Badge>
              )}
              {emitenteCpf && form.inscricaoEstadual?.replace(/\D/g, '') && (
                <Badge variant="outline" className="text-xs font-normal">
                  Produtor rural / PF com IE
                </Badge>
              )}
            </div>
            {canEdit && emitenteCnpj ? (
              <CampoCnpjComConsulta
                value={form.cnpj || ''}
                onChange={(v) => setField('cnpj', v)}
                onPreencherCampos={handleCnpjPreencher}
                tipoConsulta="geral"
              />
            ) : (
              <Input
                value={form.cnpj || ''}
                onChange={(e) => setField('cnpj', formatDocument(e.target.value))}
                disabled={disabled}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Inscrição estadual (IE) do emitente</Label>
            <Input
              value={form.inscricaoEstadual}
              onChange={(e) => setField('inscricaoEstadual', e.target.value)}
              disabled={disabled}
              placeholder="Obrigatória para emitir NF-e"
            />
            <p className="text-xs text-muted-foreground">
              Enviada à Spedy como stateTaxNumber. A SEFAZ exige IE válida do emitente
              (CPF ou CNPJ) para autorizar NF-e de produto.
              {emitenteCpf &&
                ' Produtores rurais e pessoa física com IE usam o mesmo endpoint product-invoices.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label>CNAE</Label>
            <Input
              value={form.cnae}
              onChange={(e) => setField('cnae', e.target.value)}
              disabled={disabled}
              placeholder="4637-1/00"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={telefoneArmazenadoParaCampo(form.telefone)}
              onChange={(e) => setField('telefone', formatTelefone(e.target.value))}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </CardTitle>
          <CardDescription>Endereço fiscal da empresa (emitente na NF-e)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="flex gap-2">
              <Input
                value={form.cep}
                onChange={(e) => setField('cep', formatCEP(e.target.value))}
                disabled={disabled}
                placeholder="00000-000"
                maxLength={9}
              />
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void buscarCep()}
                  disabled={buscandoCep || saving}
                  title="Buscar CEP"
                >
                  {buscandoCep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Código IBGE</Label>
            <Input
              value={form.codigoIbge}
              onChange={(e) => setField('codigoIbge', e.target.value.replace(/\D/g, ''))}
              disabled={disabled}
              placeholder="Preenchido pela busca de CEP"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Logradouro</Label>
            <Input
              value={form.logradouro}
              onChange={(e) => setField('logradouro', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Número</Label>
            <Input
              value={form.numero}
              onChange={(e) => setField('numero', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input
              value={form.complemento}
              onChange={(e) => setField('complemento', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input
              value={form.bairro}
              onChange={(e) => setField('bairro', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={form.cidade}
              onChange={(e) => setField('cidade', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>UF</Label>
            <Input
              value={form.estado}
              onChange={(e) => setField('estado', e.target.value.toUpperCase().slice(0, 2))}
              disabled={disabled}
              maxLength={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Fiscal
          </CardTitle>
          <CardDescription>Padrões usados ao emitir NF-e de venda</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Regime tributário</Label>
            <Select
              value={form.regimeTributario}
              onValueChange={(v) =>
                setField('regimeTributario', v as UpdateTenantEmpresaDto['regimeTributario'])
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                <SelectItem value="REGIME_NORMAL">Regime Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de presença</Label>
            <Select
              value={form.presenceType}
              onValueChange={(v) => setField('presenceType', v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presence">Presencial (loja)</SelectItem>
                <SelectItem value="internet">Internet</SelectItem>
                <SelectItem value="homeDelivery">Entrega em domicílio</SelectItem>
                <SelectItem value="telephone">Telefone</SelectItem>
                <SelectItem value="others">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Natureza da operação</Label>
            <Input
              value={form.operationNature}
              onChange={(e) => setField('operationNature', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>CFOP interno (mesmo estado)</Label>
            <Input
              value={form.cfopInterno}
              onChange={(e) => setField('cfopInterno', e.target.value.replace(/\D/g, ''))}
              disabled={disabled}
              maxLength={4}
            />
          </div>
          <div className="space-y-2">
            <Label>CFOP interestadual</Label>
            <Input
              value={form.cfopInterestadual}
              onChange={(e) => setField('cfopInterestadual', e.target.value.replace(/\D/g, ''))}
              disabled={disabled}
              maxLength={4}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <Label className="text-sm font-medium">Consumidor final padrão</Label>
              <p className="text-xs text-muted-foreground">
                Corresponde ao campo isFinalCustomer da Spedy
              </p>
            </div>
            <Switch
              checked={!!form.isFinalCustomer}
              onCheckedChange={(v) => setField('isFinalCustomer', v)}
              disabled={disabled}
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border p-3 space-y-3">
            <div>
              <Label className="text-sm font-medium">Numeração da NF-e</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Informe o número da próxima nota. Ex.: se colocar 200, a próxima emissão
                será 200, depois 201, 202… Não use um número já utilizado na SEFAZ.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Série</Label>
                <Input
                  value={form.serieNfe ?? '1'}
                  onChange={(e) =>
                    setField('serieNfe', e.target.value.replace(/\D/g, '').slice(0, 3) || '1')
                  }
                  disabled={disabled}
                  inputMode="numeric"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Próximo número</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.proximoNumeroNfe ?? 1}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setField('proximoNumeroNfe', Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);
                  }}
                  disabled={disabled}
                />
              </div>
            </div>
            {numeracaoNfe && numeracaoNfe.maiorUsado > 0 && (
              <p className="text-xs text-muted-foreground">
                Maior número já usado nesta série: {numeracaoNfe.maiorUsado}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Integração NF-e (Spedy)
          </CardTitle>
          <CardDescription>Credenciais e ambiente para emissão de notas</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {!loadingSpedyStatus && (
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              {integracaoAtiva ? (
                <Badge variant="default" className="bg-green-600/90">
                  Integração ativa
                </Badge>
              ) : (
                <Badge variant="secondary">Não configurada</Badge>
              )}
              {spedyStatus?.ambiente && (
                <Badge variant="outline">
                  {spedyStatus.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                </Badge>
              )}
              {emissorCadastrado ? (
                <span className="text-xs text-muted-foreground">
                  Emissor: {spedyStatus?.company_id}
                </span>
              ) : (
                <Badge variant="destructive" className="font-normal">
                  Emissor não cadastrado na Spedy
                </Badge>
              )}
            </div>
          )}

          {podeMostrarAtivacao && (
            <div className="sm:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {integracaoAtiva
                      ? 'Cadastrar empresa (emissor) na Spedy'
                      : 'Ativar emissão de NF-e na Spedy'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cria o emissor na Spedy via POST /companies com os dados desta
                    tela (razão social, CPF/CNPJ, IE, endereço e fiscal). Em seguida
                    grava a API Key gerada. Se o CPF/CNPJ já existir na conta Spedy,
                    o sistema tenta reaproveitar o cadastro. Em homologação o
                    certificado é opcional; em produção é obrigatório.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Certificado digital (.pfx)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={certInputRef}
                      type="file"
                      accept=".pfx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setCertificadoFile(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => certInputRef.current?.click()}
                      disabled={disabled || ativandoSpedy}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {certificadoFile ? certificadoFile.name : 'Selecionar .pfx'}
                    </Button>
                    {certificadoFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCertificadoFile(null);
                          if (certInputRef.current) certInputRef.current.value = '';
                        }}
                        disabled={ativandoSpedy}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.spedyAmbiente === 'producao'
                      ? `Obrigatório em produção. Use certificado ${emitenteCpf ? 'e-CPF' : 'e-CNPJ'} do emitente.`
                      : `Opcional em homologação (notas podem ficar rejeitadas sem certificado válido). Use ${emitenteCpf ? 'e-CPF' : 'e-CNPJ'} quando informado.`}
                    {' '}O nome original do arquivo não importa; evite colocar a senha no nome do .pfx.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Senha do certificado</Label>
                  <Input
                    type="password"
                    value={senhaCertificado}
                    onChange={(e) => setSenhaCertificado(e.target.value)}
                    disabled={disabled || ativandoSpedy}
                    placeholder="Senha do .pfx"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAtivarSpedy}
                disabled={disabled || ativandoSpedy}
              >
                {ativandoSpedy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cadastrando na Spedy...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {integracaoAtiva
                      ? 'Cadastrar empresa na Spedy'
                      : 'Ativar emissão de NF-e'}
                  </>
                )}
              </Button>
            </div>
          )}

          {podeMostrarAtualizarCertificado && (
            <div className="sm:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Certificado digital</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Envie o arquivo .pfx da empresa para a Spedy. Necessário para autorizar
                    NF-e (sem certificado válido as notas ficam rejeitadas).
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Arquivo .pfx</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={certInputRef}
                      type="file"
                      accept=".pfx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setCertificadoFile(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => certInputRef.current?.click()}
                      disabled={disabled || atualizandoCertificado}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {certificadoFile ? certificadoFile.name : 'Selecionar .pfx'}
                    </Button>
                    {certificadoFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCertificadoFile(null);
                          if (certInputRef.current) certInputRef.current.value = '';
                        }}
                        disabled={atualizandoCertificado}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Senha do certificado</Label>
                  <Input
                    type="password"
                    value={senhaCertificado}
                    onChange={(e) => setSenhaCertificado(e.target.value)}
                    disabled={disabled || atualizandoCertificado}
                    placeholder="Senha do .pfx"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAtualizarCertificado}
                disabled={disabled || atualizandoCertificado}
              >
                {atualizandoCertificado ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando certificado...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Atualizar certificado digital
                  </>
                )}
              </Button>
            </div>
          )}

          {!loadingSpedyStatus &&
            canEdit &&
            spedyStatus &&
            !spedyStatus.cadastro_automatico_disponivel &&
            !emissorCadastrado && (
              <p className="text-xs text-amber-700 dark:text-amber-400 sm:col-span-2">
                Cadastro automático indisponível no servidor (falta SPEDY_MASTER_API_KEY).
                Cadastre a empresa no painel Spedy e cole a API Key abaixo, ou configure a
                chave master no backend para habilitar o botão de criar emissor.
              </p>
            )}

          <div className="space-y-2 sm:col-span-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={form.spedyApiKey}
              onChange={(e) => setField('spedyApiKey', e.target.value)}
              disabled={disabled}
              placeholder={canEdit ? 'Cole a chave da Spedy' : '••••••••'}
            />
            {canEdit && (
              <p className="text-xs text-muted-foreground">
                {integracaoAtiva
                  ? 'Chave gerada automaticamente pela Spedy. Deixe em branco ou mantenha os pontos para não alterar.'
                  : 'Deixe em branco ou mantenha os pontos para não alterar a chave já salva.'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ambiente</Label>
            <Select
              value={form.spedyAmbiente}
              onValueChange={(v) =>
                setField('spedyAmbiente', v as UpdateTenantEmpresaDto['spedyAmbiente'])
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homologacao">Homologação</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <Label className="text-sm font-medium">Enviar DANFE por e-mail</Label>
              <p className="text-xs text-muted-foreground">Padrão ao emitir NF-e (sendEmailToCustomer)</p>
            </div>
            <Switch
              checked={!!form.sendEmailToCustomer}
              onCheckedChange={(v) => setField('sendEmailToCustomer', v)}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.nome?.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar empresa
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
