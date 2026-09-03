import AppLayout from '@/components/layout/AppLayout';
import { ModulePageHeader } from '@/components/layout/ModulePageHeader';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useRotuloRoca } from '@/hooks/useRotuloRoca';
import { cn, formatCurrency } from '@/lib/utils';
import {
  ContaBancaria,
  CreateContaBancariaDto,
  TipoContaBancaria,
  contasBancariasService,
} from '@/services/contas-bancarias.service';
import { controleRocaService } from '@/services/controle-roca.service';
import type { Roca } from '@/types/roca';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Edit,
  Loader2,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const TIPOS: { value: TipoContaBancaria; label: string }[] = [
  { value: 'CORRENTE', label: 'Conta corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'PAGAMENTO', label: 'Conta pagamento' },
  { value: 'OUTRO', label: 'Outro' },
];

const emptyForm = (): CreateContaBancariaDto => ({
  nome: '',
  banco: '',
  codigoBanco: '',
  digitoBanco: '',
  agencia: '',
  digitoAgencia: '',
  numeroConta: '',
  digito: '',
  tipo: 'CORRENTE',
  tipoCobranca: '',
  documentoTipo: 'CNPJ',
  razaoSocial: '',
  titular: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  instrucaoDoc: '',
  aceite: '',
  moeda: 'R$',
  layoutRemessa: '(Padrão)',
  layoutBoleto: '',
  tipoRegistroCobranca: '',
  codigoCedente: '',
  convenio: '',
  modalidadeVariacao: '',
  responsavelEmissao: 'Cliente Emite',
  formaCadastramento: '',
  codigoTransmissao: '',
  multaPercent: 0,
  jurosDiaPercent: 0,
  taxaBanco: 0,
  taxaBoleto: 0,
  taxaAntesVencimento: 0,
  numeroUltimaRemessa: -1,
  localPagamento: '',
  mensagemPadraoBoleto: '',
  instrucaoBanco: '',
  centralRastreio: '',
  baixaDevolveBoletos: false,
  imprimeLogoOutroBanco: false,
  pix: '',
  rocaId: undefined,
  saldoInicial: 0,
  ativo: true,
  observacoes: '',
});

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

export default function BancosContas() {
  const rotulo = useRotuloRoca();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContaBancaria | null>(null);
  const [form, setForm] = useState<CreateContaBancariaDto>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const patch = (partial: Partial<CreateContaBancariaDto>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const { data, isLoading } = useQuery({
    queryKey: ['contas-bancarias', searchTerm],
    queryFn: () =>
      contasBancariasService.listar({
        page: 1,
        limit: 100,
        termo: searchTerm.trim() || undefined,
      }),
  });

  const { data: rocasData } = useQuery({
    queryKey: ['rocas-ativas', 'bancos-contas'],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    retry: false,
  });

  const rocas: Roca[] = useMemo(() => {
    const lista = Array.isArray(rocasData)
      ? rocasData
      : ((rocasData as { rocas?: Roca[] })?.rocas ?? []);
    return lista.filter((r) => r.ativo !== false);
  }, [rocasData]);

  const contas = data?.contas ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return contasBancariasService.atualizar(editing.id, form);
      }
      return contasBancariasService.criar(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success(editing ? 'Conta atualizada.' : 'Conta cadastrada.');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: {
      response?: { data?: { message?: string } };
      message?: string;
    }) => {
      toast.error(
        e?.response?.data?.message || e?.message || 'Erro ao salvar conta.',
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      contasBancariasService.alterarStatus(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success('Status atualizado.');
    },
    onError: () => toast.error('Não foi possível alterar o status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contasBancariasService.deletar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success('Conta removida.');
      setDeleteId(null);
    },
    onError: () => toast.error('Não foi possível remover a conta.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (conta: ContaBancaria) => {
    setEditing(conta);
    setForm({ ...emptyForm(), ...conta });
    setDialogOpen(true);
  };

  const tipoLabel = (tipo: string) =>
    TIPOS.find((t) => t.value === tipo)?.label || tipo;

  const rocaNome = (id?: number | null) => {
    if (id == null) return '—';
    return rocas.find((r) => r.id === id)?.nome || `#${id}`;
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={Building2}
          title="Bancos e Contas"
          subtitle={`Cadastro de contas bancárias vinculadas às ${rotulo.pluralLower}.`}
          actions={
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova conta
            </Button>
          }
        />

        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por nome, banco, agência, conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cód.</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Agência / Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>{rotulo.singular}</TableHead>
                <TableHead>Saldo inicial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : contas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhuma conta bancária cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="text-muted-foreground">
                      {conta.id}
                    </TableCell>
                    <TableCell className="font-medium">{conta.nome}</TableCell>
                    <TableCell>
                      {conta.banco || conta.codigoBanco || '—'}
                    </TableCell>
                    <TableCell>
                      {[
                        [conta.agencia, conta.digitoAgencia]
                          .filter(Boolean)
                          .join('-'),
                        [conta.numeroConta, conta.digito]
                          .filter(Boolean)
                          .join('-'),
                      ]
                        .filter(Boolean)
                        .join(' / ') || '—'}
                    </TableCell>
                    <TableCell>{tipoLabel(conta.tipo)}</TableCell>
                    <TableCell>{rocaNome(conta.rocaId)}</TableCell>
                    <TableCell>
                      {formatCurrency(Number(conta.saldoInicial) || 0)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          conta.ativo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {conta.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TableRowActionsMenu>
                        <DropdownMenuItem onClick={() => openEdit(conta)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            statusMutation.mutate({
                              id: conta.id,
                              ativo: !conta.ativo,
                            })
                          }
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {conta.ativo ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(conta.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </TableRowActionsMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(emptyForm());
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Cadastro de Contas Bancárias — Modificando (cód. ${editing.id})`
                : 'Cadastro de Contas Bancárias — Novo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <Section title="Identificação bancária">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <Field label="Nome da conta *" className="sm:col-span-2">
                  <Input
                    value={form.nome}
                    onChange={(e) => patch({ nome: e.target.value })}
                    placeholder="Ex.: PADRÃO"
                  />
                </Field>
                <Field label="Nome do banco" className="sm:col-span-2">
                  <Input
                    value={form.banco || ''}
                    onChange={(e) => patch({ banco: e.target.value })}
                  />
                </Field>
                <Field label="Nº banco">
                  <Input
                    value={form.codigoBanco || ''}
                    onChange={(e) => patch({ codigoBanco: e.target.value })}
                  />
                </Field>
                <Field label="Dígito">
                  <Input
                    value={form.digitoBanco || ''}
                    onChange={(e) => patch({ digitoBanco: e.target.value })}
                  />
                </Field>
                <Field label="Agência">
                  <Input
                    value={form.agencia || ''}
                    onChange={(e) => patch({ agencia: e.target.value })}
                  />
                </Field>
                <Field label="Dígito agência">
                  <Input
                    value={form.digitoAgencia || ''}
                    onChange={(e) => patch({ digitoAgencia: e.target.value })}
                  />
                </Field>
                <Field label="Conta corrente">
                  <Input
                    value={form.numeroConta || ''}
                    onChange={(e) => patch({ numeroConta: e.target.value })}
                  />
                </Field>
                <Field label="Dígito conta">
                  <Input
                    value={form.digito || ''}
                    onChange={(e) => patch({ digito: e.target.value })}
                  />
                </Field>
                <Field label="Tipo conta">
                  <Select
                    value={form.tipo || 'CORRENTE'}
                    onValueChange={(v) =>
                      patch({ tipo: v as TipoContaBancaria })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={rotulo.singular}>
                  <Select
                    value={form.rocaId != null ? String(form.rocaId) : 'none'}
                    onValueChange={(v) =>
                      patch({
                        rocaId: v === 'none' ? undefined : Number(v),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {rocas.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Saldo inicial">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.saldoInicial ?? 0}
                    onChange={(e) =>
                      patch({
                        saldoInicial: e.target.value
                          ? Number(e.target.value)
                          : 0,
                      })
                    }
                  />
                </Field>
                <Field label="PIX">
                  <Input
                    value={form.pix || ''}
                    onChange={(e) => patch({ pix: e.target.value })}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Titular / cobrança">
              <div className="mb-3 flex gap-4">
                {(['CNPJ', 'CPF'] as const).map((doc) => (
                  <label
                    key={doc}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="documentoTipo"
                      checked={(form.documentoTipo || 'CNPJ') === doc}
                      onChange={() => patch({ documentoTipo: doc })}
                    />
                    {doc}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tipo de cobrança">
                  <Input
                    value={form.tipoCobranca || ''}
                    onChange={(e) => patch({ tipoCobranca: e.target.value })}
                  />
                </Field>
                <Field label="Nome / razão social">
                  <Input
                    value={form.razaoSocial || ''}
                    onChange={(e) => patch({ razaoSocial: e.target.value })}
                  />
                </Field>
                <Field label="Titular">
                  <Input
                    value={form.titular || ''}
                    onChange={(e) => patch({ titular: e.target.value })}
                  />
                </Field>
                <Field label="Logradouro (rua/av.)">
                  <Input
                    value={form.logradouro || ''}
                    onChange={(e) => patch({ logradouro: e.target.value })}
                  />
                </Field>
                <Field label="Número">
                  <Input
                    value={form.numero || ''}
                    onChange={(e) => patch({ numero: e.target.value })}
                  />
                </Field>
                <Field label="Complemento">
                  <Input
                    value={form.complemento || ''}
                    onChange={(e) => patch({ complemento: e.target.value })}
                  />
                </Field>
                <Field label="Bairro">
                  <Input
                    value={form.bairro || ''}
                    onChange={(e) => patch({ bairro: e.target.value })}
                  />
                </Field>
                <Field label="Cidade">
                  <Input
                    value={form.cidade || ''}
                    onChange={(e) => patch({ cidade: e.target.value })}
                  />
                </Field>
                <Field label="UF">
                  <Input
                    maxLength={2}
                    value={form.uf || ''}
                    onChange={(e) =>
                      patch({ uf: e.target.value.toUpperCase() })
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section title="Configuração de boleto / remessa">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Instrução doc.">
                  <Input
                    value={form.instrucaoDoc || ''}
                    onChange={(e) => patch({ instrucaoDoc: e.target.value })}
                  />
                </Field>
                <Field label="Aceite">
                  <Input
                    value={form.aceite || ''}
                    onChange={(e) => patch({ aceite: e.target.value })}
                  />
                </Field>
                <Field label="Moeda">
                  <Input
                    value={form.moeda || 'R$'}
                    onChange={(e) => patch({ moeda: e.target.value })}
                  />
                </Field>
                <Field label="Layout remessa">
                  <Input
                    value={form.layoutRemessa || ''}
                    onChange={(e) => patch({ layoutRemessa: e.target.value })}
                  />
                </Field>
                <Field label="Layout de boleto">
                  <Input
                    value={form.layoutBoleto || ''}
                    onChange={(e) => patch({ layoutBoleto: e.target.value })}
                  />
                </Field>
                <Field label="Tipo registro cobrança" className="sm:col-span-3">
                  <Input
                    value={form.tipoRegistroCobranca || ''}
                    onChange={(e) =>
                      patch({ tipoRegistroCobranca: e.target.value })
                    }
                  />
                </Field>
                <Field label="Código cedente">
                  <Input
                    value={form.codigoCedente || ''}
                    onChange={(e) => patch({ codigoCedente: e.target.value })}
                  />
                </Field>
                <Field label="Convênio">
                  <Input
                    value={form.convenio || ''}
                    onChange={(e) => patch({ convenio: e.target.value })}
                  />
                </Field>
                <Field label="Mod./variação">
                  <Input
                    value={form.modalidadeVariacao || ''}
                    onChange={(e) =>
                      patch({ modalidadeVariacao: e.target.value })
                    }
                  />
                </Field>
                <Field label="Resp. de emissão">
                  <Input
                    value={form.responsavelEmissao || ''}
                    onChange={(e) =>
                      patch({ responsavelEmissao: e.target.value })
                    }
                  />
                </Field>
                <Field label="Forma cadastramento / carteira" className="sm:col-span-2">
                  <Input
                    value={form.formaCadastramento || ''}
                    onChange={(e) =>
                      patch({ formaCadastramento: e.target.value })
                    }
                  />
                </Field>
                <Field label="Cód. transmissão">
                  <Input
                    value={form.codigoTransmissao || ''}
                    onChange={(e) =>
                      patch({ codigoTransmissao: e.target.value })
                    }
                  />
                </Field>
              </div>
            </Section>

            <Section title="Taxas, mensagens e opções">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Field label="Multa (%)">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.multaPercent ?? 0}
                    onChange={(e) =>
                      patch({ multaPercent: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Juros / dia (%)">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.jurosDiaPercent ?? 0}
                    onChange={(e) =>
                      patch({ jurosDiaPercent: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Taxa banco">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxaBanco ?? 0}
                    onChange={(e) =>
                      patch({ taxaBanco: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Taxa boleto">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxaBoleto ?? 0}
                    onChange={(e) =>
                      patch({ taxaBoleto: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Taxa antes venc.">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxaAntesVencimento ?? 0}
                    onChange={(e) =>
                      patch({
                        taxaAntesVencimento: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Nº últ. remessa">
                  <Input
                    type="number"
                    value={form.numeroUltimaRemessa ?? -1}
                    onChange={(e) =>
                      patch({
                        numeroUltimaRemessa: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Local pagamento" className="sm:col-span-2">
                  <Input
                    value={form.localPagamento || ''}
                    onChange={(e) => patch({ localPagamento: e.target.value })}
                  />
                </Field>
                <Field label="Instrução do banco" className="sm:col-span-2">
                  <Input
                    value={form.instrucaoBanco || ''}
                    onChange={(e) => patch({ instrucaoBanco: e.target.value })}
                  />
                </Field>
                <Field label="Central de rastreio" className="sm:col-span-2">
                  <Input
                    value={form.centralRastreio || ''}
                    onChange={(e) => patch({ centralRastreio: e.target.value })}
                  />
                </Field>
                <Field
                  label="Mensagem padrão para boleto"
                  className="col-span-2 sm:col-span-5"
                >
                  <Textarea
                    rows={2}
                    value={form.mensagemPadraoBoleto || ''}
                    onChange={(e) =>
                      patch({ mensagemPadraoBoleto: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(form.baixaDevolveBoletos)}
                    onCheckedChange={(c) =>
                      patch({ baixaDevolveBoletos: c === true })
                    }
                  />
                  Baixa/devolve boletos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(form.imprimeLogoOutroBanco)}
                    onCheckedChange={(c) =>
                      patch({ imprimeLogoOutroBanco: c === true })
                    }
                  />
                  Imprime logo de outro banco
                </label>
              </div>
            </Section>

            <Field label="Observações">
              <Textarea
                rows={2}
                value={form.observacoes || ''}
                onChange={(e) => patch({ observacoes: e.target.value })}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!form.nome?.trim()) {
                  toast.error('Informe o nome da conta.');
                  return;
                }
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editing ? (
                'Salvar'
              ) : (
                'Cadastrar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId != null && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
