import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CepInputWithLookup } from '@/components/common/CepInputWithLookup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BRAZILIAN_UFS, isValidBrazilUf } from '@/lib/brazil-uf';
import { extractApiErrorMessage } from '@/lib/api-error-message';
import { formatCurrency } from '@/lib/utils';
import { cepService } from '@/services/cep.service';
import {
  formatTelefone,
  formatCEP,
  telefoneArmazenadoParaCampo,
} from '@/lib/validators';
import { notaFiscalService } from '@/services/nota-fiscal.service';
import {
  STATUS_NOTA_FISCAL_LABELS,
  isStatusNotaEmProcessamento,
  type CampoFaltanteNotaFiscal,
  type EmitirNotaFiscalPayload,
  type NotaFiscal,
  type NotaFiscalPreEmissaoEndereco,
} from '@/types/nota-fiscal';
import { Pedido } from '@/types/pedido';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileCheck2, Loader2, Receipt } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface EmitirNotaFiscalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Pedido | null;
  onSuccess?: (nota: NotaFiscal) => void;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-6 sm:p-7 space-y-5">
      <div className="space-y-1.5 pb-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/25 px-4 py-3.5 space-y-2 min-h-[4.75rem]">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <p className="text-sm leading-relaxed break-words">{value ?? '—'}</p>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  );
}

function extractErrorMessage(error: unknown): string {
  return extractApiErrorMessage(error);
}

function campoVazio(val?: string | null): boolean {
  return !String(val ?? '').trim();
}

function normalizarDoc(doc: string): string {
  return doc.replace(/\D/g, '');
}

function formatarDataPedido(data?: string | null): string {
  if (!data?.trim()) return '—';
  const part = data.split('T')[0].split(' ')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return part;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function labelFormaPagamento(forma?: string | null): string {
  const map: Record<string, string> = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão de crédito',
    CARTAO_DEBITO: 'Cartão de débito',
    BOLETO: 'Boleto',
    TRANSFERENCIA: 'Transferência',
    CHEQUE: 'Cheque',
  };
  return forma ? map[forma] || forma : '—';
}

function labelRegime(regime?: string | null): string {
  if (regime === 'SIMPLES_NACIONAL') return 'Simples Nacional';
  if (regime === 'REGIME_NORMAL') return 'Regime Normal';
  return regime || '—';
}

function labelSpedyAmbiente(ambiente?: 'homologacao' | 'producao' | null): string {
  if (ambiente === 'producao') return 'Produção (SEFAZ real)';
  return 'Homologação (sandbox — testes)';
}

function formatEndereco(end?: NotaFiscalPreEmissaoEndereco | null): string {
  if (!end) return '—';
  const partes = [
    end.logradouro,
    end.numero,
    end.complemento,
    end.bairro,
    end.cidade,
    end.estado,
    end.cep ? `CEP ${end.cep}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(', ') : '—';
}

const NCM_PLACEHOLDERS = new Set([
  '00000000',
  '11111111',
  '88888888',
  '99999999',
  '12345678',
]);

function ncmValido(ncm: string): boolean {
  const digits = ncm.replace(/\D/g, '');
  return digits.length === 8 && !NCM_PLACEHOLDERS.has(digits);
}

function calcularFaltantesLocal(data: {
  empresaCnpj: string;
  spedyConfigurado: boolean;
  pedidoTipo: string;
  pedidoStatus: string;
  clienteId?: number | null;
  clienteNome: string;
  clienteDoc: string;
  endereco: NotaFiscalPreEmissaoEndereco | null;
  itens: Array<{ produto_id: number; nome: string; ncm: string }>;
  notaBloqueia: boolean;
  temItens: boolean;
}): CampoFaltanteNotaFiscal[] {
  const faltantes: CampoFaltanteNotaFiscal[] = [];

  if (campoVazio(data.empresaCnpj) || normalizarDoc(data.empresaCnpj).length !== 14) {
    faltantes.push({ campo: 'empresa.cnpj', label: 'CNPJ da empresa', secao: 'empresa' });
  }
  if (!data.spedyConfigurado) {
    faltantes.push({
      campo: 'spedy.api_key',
      label: 'Integração Spedy (Configurações)',
      secao: 'integracao',
    });
  }
  if (data.pedidoTipo !== 'VENDA') {
    faltantes.push({ campo: 'pedido.tipo', label: 'Pedido deve ser Venda', secao: 'pedido' });
  }
  if (data.pedidoStatus === 'CANCELADO') {
    faltantes.push({ campo: 'pedido.status', label: 'Pedido cancelado', secao: 'pedido' });
  }
  if (!data.clienteId) {
    faltantes.push({ campo: 'pedido.cliente_id', label: 'Cliente no pedido', secao: 'pedido' });
  }
  if (!data.temItens) {
    faltantes.push({ campo: 'pedido.itens', label: 'Itens do pedido', secao: 'pedido' });
  }
  if (data.notaBloqueia) {
    faltantes.push({
      campo: 'nota.status',
      label: 'Nota já autorizada ou em processamento',
      secao: 'pedido',
    });
  }
  if (campoVazio(data.clienteNome)) {
    faltantes.push({ campo: 'cliente.nome', label: 'Nome do cliente', secao: 'cliente' });
  }
  const doc = normalizarDoc(data.clienteDoc);
  if (!doc || (doc.length !== 11 && doc.length !== 14)) {
    faltantes.push({ campo: 'cliente.cpf_cnpj', label: 'CPF/CNPJ do cliente', secao: 'cliente' });
  }
  if (!data.endereco) {
    faltantes.push({ campo: 'endereco', label: 'Endereço completo', secao: 'endereco' });
  } else {
    const checks: Array<[string, string, keyof NotaFiscalPreEmissaoEndereco]> = [
      ['endereco.cep', 'CEP', 'cep'],
      ['endereco.logradouro', 'Logradouro', 'logradouro'],
      ['endereco.numero', 'Número', 'numero'],
      ['endereco.bairro', 'Bairro', 'bairro'],
      ['endereco.cidade', 'Cidade', 'cidade'],
      ['endereco.estado', 'UF', 'estado'],
    ];
    for (const [campo, label, key] of checks) {
      if (campoVazio(data.endereco[key] as string)) {
        faltantes.push({ campo, label, secao: 'endereco' });
      }
    }
    if (!campoVazio(data.endereco.estado) && !isValidBrazilUf(data.endereco.estado)) {
      faltantes.push({
        campo: 'endereco.estado',
        label: `UF inválida (${data.endereco.estado.toUpperCase()}). Selecione um estado válido`,
        secao: 'endereco',
      });
    }
    if (!codigoIbgeValido(data.endereco.codigo_ibge)) {
      faltantes.push({
        campo: 'endereco.codigo_ibge',
        label:
          'Código IBGE do município (7 dígitos) — obrigatório para NF-e',
        secao: 'endereco',
      });
    }
  }
  for (const item of data.itens) {
    if (campoVazio(item.ncm) || !ncmValido(item.ncm)) {
      faltantes.push({
        campo: `produto.${item.produto_id}.ncm`,
        label: `NCM válido da tabela TIPI (8 dígitos) — ${item.nome}`,
        secao: 'produto',
        produto_id: item.produto_id,
      });
    }
  }
  return faltantes;
}

function codigoIbgeValido(codigo?: string | null): boolean {
  return /^\d{7}$/.test(String(codigo || '').replace(/\D/g, ''));
}

function campoFaltando(faltantes: CampoFaltanteNotaFiscal[], campo: string): boolean {
  return faltantes.some((f) => f.campo === campo || f.campo.startsWith(`${campo}.`));
}

export function EmitirNotaFiscalDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: EmitirNotaFiscalDialogProps) {
  const queryClient = useQueryClient();
  const pedidoId = order?.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pedidos', pedidoId, 'nota-fiscal', 'pre-emissao'],
    queryFn: () => notaFiscalService.obterPreEmissao(pedidoId!),
    enabled: open && !!pedidoId && order?.tipo === 'VENDA',
  });

  const [clienteNome, setClienteNome] = useState('');
  const [clienteFantasia, setClienteFantasia] = useState('');
  const [clienteRazao, setClienteRazao] = useState('');
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteIe, setClienteIe] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [endereco, setEndereco] = useState<NotaFiscalPreEmissaoEndereco>({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    codigo_ibge: '',
  });
  const [ncmPorProduto, setNcmPorProduto] = useState<Record<number, string>>({});
  const [erroEmissao, setErroEmissao] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const buscarCep = async (cepRaw: string) => {
    const limpo = cepRaw.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await cepService.buscar(limpo);
      setEndereco((p) => ({
        ...p,
        cep: formatCEP(res.cep),
        logradouro: res.logradouro || p.logradouro,
        bairro: res.bairro || p.bairro,
        cidade: res.cidade || p.cidade,
        estado: res.estado || p.estado,
        codigo_ibge: res.codigoIbge || p.codigo_ibge,
        complemento: p.complemento || res.complemento || '',
      }));
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setBuscandoCep(false);
    }
  };

  useEffect(() => {
    if (!open) setErroEmissao(null);
  }, [open]);

  useEffect(() => {
    if (!data) return;
    const c = data.cliente;
    setClienteNome(c?.nome || '');
    setClienteFantasia(c?.nome_fantasia || '');
    setClienteRazao(c?.nome_razao || '');
    setClienteDoc(c?.cpf_cnpj || '');
    setClienteIe(c?.inscricao_estadual || '');
    setClienteEmail(c?.email || '');
    setClienteTelefone(telefoneArmazenadoParaCampo(c?.telefone || ''));
    setEndereco({
      id: c?.endereco?.id ?? undefined,
      cep: c?.endereco?.cep || '',
      logradouro: c?.endereco?.logradouro || '',
      numero: c?.endereco?.numero || '',
      complemento: c?.endereco?.complemento || '',
      bairro: c?.endereco?.bairro || '',
      cidade: c?.endereco?.cidade || '',
      estado: c?.endereco?.estado || '',
      codigo_ibge: c?.endereco?.codigo_ibge || '',
    });
    const ncms: Record<number, string> = {};
    for (const item of data.itens) {
      ncms[item.produto_id] = item.ncm || '';
    }
    setNcmPorProduto(ncms);
  }, [data]);

  useEffect(() => {
    if (!open || !data?.cliente?.endereco?.cep) return;
    const ibge = data.cliente.endereco.codigo_ibge;
    if (codigoIbgeValido(ibge)) return;
    void buscarCep(data.cliente.endereco.cep);
  }, [open, data?.cliente?.endereco?.cep, data?.cliente?.endereco?.codigo_ibge]);

  const faltantes = useMemo(() => {
    if (!data || !order) return [];
    return calcularFaltantesLocal({
      empresaCnpj: data.empresa.cnpj,
      spedyConfigurado: data.spedy_configurado,
      pedidoTipo: order.tipo,
      pedidoStatus: order.status,
      clienteId: data.cliente?.id,
      clienteNome,
      clienteDoc,
      endereco: endereco.cep || endereco.logradouro ? endereco : null,
      itens: data.itens.map((i) => ({
        produto_id: i.produto_id,
        nome: i.nome,
        ncm: ncmPorProduto[i.produto_id] ?? i.ncm,
      })),
      notaBloqueia: !!data.nota_existente?.bloqueia_reemissao,
      temItens: data.itens.length > 0,
    });
  }, [data, order, clienteNome, clienteDoc, endereco, ncmPorProduto]);

  const podeEmitir = faltantes.length === 0;

  const emitirMutation = useMutation({
    mutationFn: async (payload: EmitirNotaFiscalPayload) => {
      // Backend já faz polling pós-emissão — evita consultar duplicado (rate limit Spedy).
      return notaFiscalService.emitir(pedidoId!, payload);
    },
    onSuccess: (nota) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos', pedidoId, 'nota-fiscal'] });
      queryClient.invalidateQueries({ queryKey: ['notas-fiscais'] });
      const statusLabel = STATUS_NOTA_FISCAL_LABELS[nota.status] ?? nota.status;
      const motivo = nota.mensagem_processamento ?? nota.mensagemProcessamento;
      const description = motivo ? `${statusLabel} — ${motivo}` : statusLabel;

      if (nota.status === 'rejected' || nota.status === 'denied') {
        toast.warning('NF-e processada', { description });
      } else if (nota.status === 'authorized') {
        toast.success('NF-e autorizada', { description });
      } else if (isStatusNotaEmProcessamento(nota.status)) {
        toast.info('NF-e ainda em processamento', {
          description: `${statusLabel} — atualize o status na lista de notas fiscais.`,
        });
      } else {
        toast.success('Nota enviada à Spedy', { description });
      }

      onSuccess?.(nota);
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = extractErrorMessage(err);
      setErroEmissao(msg);
      toast.error(msg);
    },
  });

  const handleEmitir = () => {
    if (!data || !podeEmitir) return;
    setErroEmissao(null);
    const payload: EmitirNotaFiscalPayload = {
      cliente: {
        nome: clienteNome.trim(),
        nome_fantasia: clienteFantasia.trim() || undefined,
        nome_razao: clienteRazao.trim() || undefined,
        cpf_cnpj: clienteDoc.trim(),
        inscricao_estadual: clienteIe.trim() || undefined,
        email: clienteEmail.trim() || undefined,
        telefone: telefoneArmazenadoParaCampo(clienteTelefone) || undefined,
      },
      endereco: {
        ...endereco,
        id: endereco.id,
        cep: endereco.cep.trim(),
        logradouro: endereco.logradouro.trim(),
        numero: endereco.numero.trim(),
        complemento: endereco.complemento?.trim() || undefined,
        bairro: endereco.bairro.trim(),
        cidade: endereco.cidade.trim(),
        estado: endereco.estado.trim().toUpperCase().slice(0, 2),
        codigo_ibge: endereco.codigo_ibge?.trim() || undefined,
      },
      produtos: data.itens.map((item) => ({
        produto_id: item.produto_id,
        ncm: (ncmPorProduto[item.produto_id] ?? item.ncm).trim(),
        sku: item.sku || undefined,
      })),
    };
    emitirMutation.mutate(payload);
  };

  const inputClass = (campo: string) =>
    campoFaltando(faltantes, campo)
      ? 'border-destructive focus-visible:ring-destructive'
      : undefined;

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1680px,99vw)] w-[99vw] h-[98dvh] max-h-[98dvh] sm:max-w-[min(1680px,99vw)] sm:max-h-[98dvh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-8 pt-7 pb-5 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Receipt className="w-6 h-6 text-violet-600" />
            Emitir Nota Fiscal
          </DialogTitle>
          <DialogDescription className="text-base pt-1">
            Pedido {order.numero_pedido} — revise todos os dados antes de emitir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6">
          {isLoading && (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando dados para emissão...
            </div>
          )}

          {isError && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-2">
                {extractErrorMessage(error)}
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {data && (
            <div className="space-y-6 pb-4">
              {erroEmissao && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Falha ao emitir NF-e</AlertTitle>
                  <AlertDescription className="text-sm whitespace-pre-wrap">
                    {erroEmissao}
                  </AlertDescription>
                </Alert>
              )}

              {faltantes.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Dados incompletos ({faltantes.length})</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-disc pl-4 space-y-0.5 text-sm">
                      {faltantes.map((f) => (
                        <li key={f.campo}>{f.label}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {data.nota_existente && (
                <div className="flex items-center gap-2 text-sm px-1">
                  <span className="text-muted-foreground">Nota existente:</span>
                  <Badge variant="outline">
                    {STATUS_NOTA_FISCAL_LABELS[data.nota_existente.status]}
                  </Badge>
                </div>
              )}

              <SectionCard title="Pedido" description="Dados da venda que serão enviados na NF-e">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                  <ReadOnlyField label="Número" value={data.pedido.numero_pedido} />
                  <ReadOnlyField label="Data" value={formatarDataPedido(data.pedido.data_pedido)} />
                  <ReadOnlyField label="Status" value={data.pedido.status} />
                  <ReadOnlyField
                    label="Forma de pagamento"
                    value={labelFormaPagamento(data.pedido.forma_pagamento)}
                  />
                  <ReadOnlyField label="Subtotal" value={formatCurrency(data.pedido.subtotal)} />
                  <ReadOnlyField label="Frete" value={formatCurrency(data.pedido.frete)} />
                  <ReadOnlyField
                    label="Desconto"
                    value={formatCurrency(data.pedido.desconto_valor)}
                  />
                  <ReadOnlyField
                    label="Valor total"
                    value={
                      <span className="font-semibold text-primary">
                        {formatCurrency(data.pedido.valor_total)}
                      </span>
                    }
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Empresa emitente"
                description="Dados fiscais da empresa (Configurações → Empresa)"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ReadOnlyField
                    label="Razão social"
                    value={data.empresa.razao_social || data.empresa.nome_fantasia}
                  />
                  <ReadOnlyField label="Nome fantasia" value={data.empresa.nome_fantasia} />
                  <ReadOnlyField
                    label="CNPJ"
                    value={
                      <span className={inputClass('empresa.cnpj') ? 'text-destructive' : ''}>
                        {data.empresa.cnpj || 'Não informado'}
                      </span>
                    }
                  />
                  <ReadOnlyField
                    label="Inscrição estadual"
                    value={data.empresa.inscricao_estadual}
                  />
                  <ReadOnlyField
                    label="Endereço fiscal"
                    value={formatEndereco(data.empresa.endereco)}
                  />
                  <ReadOnlyField
                    label="Regime tributário"
                    value={labelRegime(data.empresa.regime_tributario)}
                  />
                  <ReadOnlyField label="CFOP interno" value={data.empresa.cfop_interno} />
                  <ReadOnlyField
                    label="CFOP interestadual"
                    value={data.empresa.cfop_interestadual}
                  />
                  <div className="sm:col-span-2">
                    <ReadOnlyField
                      label="Integração Spedy"
                      value={
                        <span
                          className={
                            !data.spedy_configurado
                              ? 'text-destructive'
                              : 'text-green-700 dark:text-green-400'
                          }
                        >
                          {data.spedy_configurado
                            ? 'Configurada'
                            : 'Não configurada — peça ao administrador'}
                        </span>
                      }
                    />
                  </div>
                  {data.spedy_configurado && (
                    <ReadOnlyField
                      label="Ambiente Spedy"
                      value={
                        <span
                          className={
                            data.spedy_ambiente === 'producao'
                              ? 'font-medium text-amber-700 dark:text-amber-400'
                              : 'font-medium text-blue-700 dark:text-blue-400'
                          }
                        >
                          {labelSpedyAmbiente(data.spedy_ambiente)}
                        </span>
                      }
                    />
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Cliente (destinatário)"
                description="Edite os campos necessários para a NF-e"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Nome" htmlFor="nf-cliente-nome" required>
                    <Input
                      id="nf-cliente-nome"
                      className={`h-11 ${inputClass('cliente.nome') ?? ''}`}
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Nome fantasia" htmlFor="nf-cliente-fantasia">
                    <Input
                      id="nf-cliente-fantasia"
                      className="h-11"
                      value={clienteFantasia}
                      onChange={(e) => setClienteFantasia(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Razão social" htmlFor="nf-cliente-razao">
                    <Input
                      id="nf-cliente-razao"
                      className="h-11"
                      value={clienteRazao}
                      onChange={(e) => setClienteRazao(e.target.value)}
                    />
                  </FormField>
                  <FormField label="CPF/CNPJ" htmlFor="nf-cliente-doc" required>
                    <Input
                      id="nf-cliente-doc"
                      className={`h-11 ${inputClass('cliente.cpf_cnpj') ?? ''}`}
                      value={clienteDoc}
                      onChange={(e) => setClienteDoc(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Inscrição estadual" htmlFor="nf-cliente-ie">
                    <Input
                      id="nf-cliente-ie"
                      className="h-11"
                      value={clienteIe}
                      onChange={(e) => setClienteIe(e.target.value)}
                    />
                  </FormField>
                  <FormField label="E-mail" htmlFor="nf-cliente-email">
                    <Input
                      id="nf-cliente-email"
                      type="email"
                      className="h-11"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Telefone" htmlFor="nf-cliente-tel">
                    <Input
                      id="nf-cliente-tel"
                      className="h-11"
                      value={clienteTelefone}
                      onChange={(e) =>
                        setClienteTelefone(formatTelefone(e.target.value))
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard title="Endereço do cliente" description="Endereço de entrega/faturamento">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <FormField label="CEP" htmlFor="nf-cep" required>
                    <CepInputWithLookup
                      id="nf-cep"
                      value={endereco.cep}
                      onChange={(cep) => setEndereco((p) => ({ ...p, cep }))}
                      onAddressFound={(dados) =>
                        setEndereco((p) => ({
                          ...p,
                          cep: formatCEP(dados.cep),
                          logradouro: dados.logradouro || p.logradouro,
                          bairro: dados.bairro || p.bairro,
                          cidade: dados.cidade || p.cidade,
                          estado: dados.estado || p.estado,
                          codigo_ibge: dados.codigoIbge || p.codigo_ibge,
                          complemento: p.complemento || dados.complemento || '',
                        }))
                      }
                      disabled={buscandoCep}
                    />
                  </FormField>
                  <FormField label="Logradouro" htmlFor="nf-log" required>
                    <Input
                      id="nf-log"
                      className={`h-11 ${inputClass('endereco.logradouro') ?? ''}`}
                      value={endereco.logradouro}
                      onChange={(e) =>
                        setEndereco((p) => ({ ...p, logradouro: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Número" htmlFor="nf-num" required>
                    <Input
                      id="nf-num"
                      className={`h-11 ${inputClass('endereco.numero') ?? ''}`}
                      value={endereco.numero}
                      onChange={(e) => setEndereco((p) => ({ ...p, numero: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Complemento" htmlFor="nf-comp">
                    <Input
                      id="nf-comp"
                      className="h-11"
                      value={endereco.complemento || ''}
                      onChange={(e) =>
                        setEndereco((p) => ({ ...p, complemento: e.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Bairro" htmlFor="nf-bairro" required>
                    <Input
                      id="nf-bairro"
                      className={`h-11 ${inputClass('endereco.bairro') ?? ''}`}
                      value={endereco.bairro}
                      onChange={(e) => setEndereco((p) => ({ ...p, bairro: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Cidade" htmlFor="nf-cidade" required>
                    <Input
                      id="nf-cidade"
                      className={`h-11 ${inputClass('endereco.cidade') ?? ''}`}
                      value={endereco.cidade}
                      onChange={(e) => setEndereco((p) => ({ ...p, cidade: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="UF" htmlFor="nf-uf" required>
                    <Select
                      value={
                        endereco.estado && isValidBrazilUf(endereco.estado)
                          ? endereco.estado.toUpperCase()
                          : ''
                      }
                      onValueChange={(value) =>
                        setEndereco((p) => ({ ...p, estado: value }))
                      }
                    >
                      <SelectTrigger
                        id="nf-uf"
                        className={`h-11 ${inputClass('endereco.estado') ?? ''}`}
                      >
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_UFS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {endereco.estado && !isValidBrazilUf(endereco.estado) && (
                      <p className="text-xs text-destructive">
                        &quot;{endereco.estado.toUpperCase()}&quot; não é válido — o cadastro
                        tinha UF incorreta. Selecione acima (ex: CE, SP, PE).
                      </p>
                    )}
                  </FormField>
                  <FormField label="Código IBGE" htmlFor="nf-ibge" required>
                    <Input
                      id="nf-ibge"
                      className={`h-11 ${inputClass('endereco.codigo_ibge') ?? ''}`}
                      value={endereco.codigo_ibge || ''}
                      onChange={(e) =>
                        setEndereco((p) => ({
                          ...p,
                          codigo_ibge: e.target.value.replace(/\D/g, '').slice(0, 7),
                        }))
                      }
                      placeholder="7 dígitos (preenchido ao buscar CEP)"
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard
                title={`Produtos (${data.itens.length})`}
                description="Itens do pedido — informe o NCM de cada produto"
              >
                <div className="rounded-xl border overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3.5 font-medium w-12">#</th>
                        <th className="text-left px-4 py-3.5 font-medium w-28">SKU</th>
                        <th className="text-left px-4 py-3.5 font-medium min-w-[180px]">Produto</th>
                        <th className="text-right px-4 py-3.5 font-medium w-20">Qtd</th>
                        <th className="text-right px-4 py-3.5 font-medium w-32">Unit.</th>
                        <th className="text-right px-4 py-3.5 font-medium w-36">Subtotal</th>
                        <th className="text-left px-4 py-3.5 font-medium w-40">NCM *</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.itens.map((item, idx) => {
                        const ncmKey = `produto.${item.produto_id}.ncm`;
                        const ncmVal = ncmPorProduto[item.produto_id] ?? '';
                        return (
                          <tr key={item.produto_id} className="border-t">
                            <td className="px-4 py-4 text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-4 font-mono text-xs">{item.sku || '—'}</td>
                            <td className="px-4 py-4 leading-relaxed">{item.nome}</td>
                            <td className="px-4 py-4 text-right">{item.quantidade}</td>
                            <td className="px-4 py-4 text-right whitespace-nowrap">
                              {formatCurrency(item.preco_unitario)}
                            </td>
                            <td className="px-4 py-4 text-right font-medium whitespace-nowrap">
                              {formatCurrency(item.subtotal)}
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                value={ncmVal}
                                onChange={(e) =>
                                  setNcmPorProduto((p) => ({
                                    ...p,
                                    [item.produto_id]: e.target.value,
                                  }))
                                }
                                placeholder="00000000"
                                maxLength={8}
                                inputMode="numeric"
                                className={
                                  campoFaltando(faltantes, ncmKey)
                                    ? 'border-destructive h-11 font-mono text-xs'
                                    : 'h-11 font-mono text-xs'
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t bg-muted/30">
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-right font-medium">
                          Total do pedido
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-primary whitespace-nowrap">
                          {formatCurrency(data.pedido.valor_total)}
                        </td>
                        <td className="px-4 py-4" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-5 border-t shrink-0 gap-3 sm:gap-4 bg-background">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="lg"
            onClick={handleEmitir}
            disabled={!data || !podeEmitir || emitirMutation.isPending || isLoading}
            className="gap-2"
          >
            {emitirMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            Emitir NF-e
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
