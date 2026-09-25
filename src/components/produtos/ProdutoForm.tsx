import { FormSection } from '@/components/forms/FormSection';
import { ResumoCardSubmitButton, resumoHeaderClass } from '@/components/forms/ResumoCardSubmitButton';
import { ResumoScrollFollower } from '@/components/forms/ResumoScrollFollower';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import DadosFiscaisProduto from '@/components/produtos/DadosFiscaisProduto';
import {
  DadosFiscaisForm,
  tributacoesVazias,
  validarDadosFiscais,
} from '@/features/produtos/utils/dadosFiscais';
import { ProdutoFormData } from '@/features/produtos/utils/prepararCriacaoProduto';
import { cn, formatCurrency } from '@/lib/utils';
import { Categoria } from '@/services/categorias.service';
import { fiscalService, formatarNcm } from '@/services/fiscal.service';
import { Fornecedor } from '@/services/fornecedores.service';
import { useQuery } from '@tanstack/react-query';
import {
  Ban,
  Check,
  ChevronsUpDown,
  DollarSign,
  Info,
  LayoutGrid,
  Package,
  Ruler,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

const inputClass = 'rounded-xl';

const initialForm: ProdutoFormData = {
  nome: '',
  descricao: '',
  sku: '',
  preco_custo: 0,
  preco_venda: 0,
  preco_promocional: undefined,
  estoque_atual: 0,
  estoque_minimo: 0,
  estoque_maximo: undefined,
  localizacao: undefined,
  unidade_medida: 'UN',
  statusProduto: 'ATIVO',
  categoriaId: undefined,
  fornecedorId: undefined,
  data_validade: undefined,
  ncm: '',
  cest: '',
  origem: '',
  tributacoes: tributacoesVazias(),
  observacoes: '',
  peso: undefined,
  altura: undefined,
  largura: undefined,
};

interface ProdutoFormProps {
  categorias: Categoria[];
  fornecedores: Fornecedor[];
  onSubmit: (data: ProdutoFormData) => void;
  isPending?: boolean;
  /** Dados do produto na edição. */
  initialData?: ProdutoFormData;
  modo?: 'criar' | 'editar';
}

type AbaProduto = 'geral' | 'fiscal';

export default function ProdutoForm({
  categorias,
  fornecedores,
  onSubmit,
  isPending = false,
  initialData,
  modo = 'criar',
}: ProdutoFormProps) {
  const [form, setForm] = useState<ProdutoFormData>(initialData ?? initialForm);
  const [fornecedorPopoverOpen, setFornecedorPopoverOpen] = useState(false);
  const [fornecedorSearchTerm, setFornecedorSearchTerm] = useState('');
  const [aba, setAba] = useState<AbaProduto>('geral');
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const patch = (data: Partial<ProdutoFormData>) => setForm((prev) => ({ ...prev, ...data }));

  const { data: contextoFiscal } = useQuery({
    queryKey: ['fiscal', 'contexto'],
    queryFn: () => fiscalService.obterContexto(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const dadosFiscais: DadosFiscaisForm = {
    origem: form.origem,
    ncm: form.ncm,
    cest: form.cest,
    tributacoes: form.tributacoes,
  };
  const errosFiscais = useMemo(
    () => validarDadosFiscais(dadosFiscais, contextoFiscal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.origem, form.ncm, form.cest, form.tributacoes, contextoFiscal],
  );
  const qtdErrosFiscais = Object.keys(errosFiscais).length;

  const status = form.statusProduto || 'ATIVO';
  const statusAtivo = status === 'ATIVO';
  const categoriaNome = useMemo(
    () => categorias.find((c) => c.id === form.categoriaId)?.nome || '—',
    [categorias, form.categoriaId],
  );
  const fornecedorNome = useMemo(() => {
    if (!form.fornecedorId) return '—';
    const f = fornecedores.find((x) => x.id === form.fornecedorId);
    return f?.nome_fantasia || f?.nome_razao || '—';
  }, [fornecedores, form.fornecedorId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTentouEnviar(true);
    if (qtdErrosFiscais > 0) {
      setAba('fiscal');
      toast.error('Revise os dados fiscais do produto antes de salvar.');
      return;
    }
    onSubmit(form);
  };

  const filteredFornecedores = fornecedores.filter((forn) => {
    if (!fornecedorSearchTerm) return true;
    const s = fornecedorSearchTerm.toLowerCase();
    return (
      (forn.nome_fantasia?.toLowerCase().includes(s) ?? false) ||
      forn.nome_razao.toLowerCase().includes(s)
    );
  });

  return (
    <form id="produto-form-page" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            {
              value: 'ATIVO' as const,
              label: 'Ativo',
              sub: 'Disponível para venda',
              icon: Package,
              color: 'emerald' as const,
            },
            {
              value: 'INATIVO' as const,
              label: 'Inativo',
              sub: 'Indisponível no catálogo',
              icon: Ban,
              color: 'blue' as const,
            },
          ] as const
        ).map(({ value, label, sub, icon: Icon, color }) => {
          const selected = status === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => patch({ statusProduto: value })}
              className={cn(
                'group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                selected
                  ? color === 'emerald'
                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                    : 'border-blue-500/60 bg-blue-500/10 shadow-sm'
                  : 'border-border/60 bg-card hover:border-primary/30',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  selected
                    ? color === 'emerald'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-blue-500 text-white'
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/15',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <Tabs
          value={aba}
          onValueChange={(v) => setAba(v as AbaProduto)}
          className="min-w-0 flex-1 space-y-6 pb-8"
        >
          <TabsList className="rounded-xl">
            <TabsTrigger value="geral" className="rounded-lg">
              Geral
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="gap-2 rounded-lg">
              Dados Fiscais
              {tentouEnviar && qtdErrosFiscais > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {qtdErrosFiscais}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fiscal" className="mt-0">
            <DadosFiscaisProduto
              dados={dadosFiscais}
              onChange={(p) => patch(p)}
              contexto={contextoFiscal}
              erros={tentouEnviar ? errosFiscais : {}}
            />
          </TabsContent>

          <TabsContent value="geral" className="mt-0 space-y-6">
            <FormSection
              icon={Package}
              title="Informações básicas"
              description="Nome, descrição e código SKU do produto."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Produto *</Label>
                  <Input
                    className={inputClass}
                    placeholder="Ex: Notebook Dell Inspiron"
                    value={form.nome || ''}
                    onChange={(e) => patch({ nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    className={cn(inputClass, 'min-h-[100px] resize-y')}
                    placeholder="Descrição detalhada do produto"
                    value={form.descricao || ''}
                    onChange={(e) => patch({ descricao: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU (opcional)</Label>
                  <Input
                    className={inputClass}
                    placeholder="Deixe vazio para gerar automaticamente (SKU-01, SKU-02...)"
                    value={form.sku || ''}
                    onChange={(e) => patch({ sku: e.target.value })}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={LayoutGrid}
              title="Categorização"
              description="Categoria e fornecedor vinculados ao produto."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select
                    value={form.categoriaId?.toString() || undefined}
                    onValueChange={(value) => patch({ categoriaId: Number(value) })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          Nenhuma categoria cadastrada
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
                  <Label>Fornecedor (opcional)</Label>
                  <Popover open={fornecedorPopoverOpen} onOpenChange={setFornecedorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className={cn('w-full justify-between font-normal', inputClass)}
                      >
                        <span className="truncate">{fornecedorNome === '—' ? 'Nenhum (opcional)' : fornecedorNome}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar fornecedor..."
                          value={fornecedorSearchTerm}
                          onValueChange={setFornecedorSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__nenhum__"
                              onSelect={() => {
                                patch({ fornecedorId: undefined });
                                setFornecedorPopoverOpen(false);
                                setFornecedorSearchTerm('');
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', !form.fornecedorId ? 'opacity-100' : 'opacity-0')} />
                              Nenhum
                            </CommandItem>
                            {filteredFornecedores.map((forn) => (
                              <CommandItem
                                key={forn.id}
                                value={`${forn.nome_fantasia || ''} ${forn.nome_razao}`.trim()}
                                onSelect={() => {
                                  patch({ fornecedorId: forn.id });
                                  setFornecedorPopoverOpen(false);
                                  setFornecedorSearchTerm('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    form.fornecedorId === forn.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {forn.nome_fantasia || forn.nome_razao}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={DollarSign}
              title="Preços"
              description="Valores de custo, venda e promocional."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Preço de Custo *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    placeholder="0,00"
                    value={form.preco_custo ?? ''}
                    onChange={(e) => patch({ preco_custo: e.target.value ? Number(e.target.value) : 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço de Venda *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    placeholder="0,00"
                    value={form.preco_venda ?? ''}
                    onChange={(e) => patch({ preco_venda: e.target.value ? Number(e.target.value) : 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Promocional</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className={cn(
                      inputClass,
                      form.preco_promocional &&
                        form.preco_venda &&
                        form.preco_promocional > form.preco_venda &&
                        'border-destructive',
                    )}
                    placeholder="0,00"
                    value={form.preco_promocional ?? ''}
                    onChange={(e) =>
                      patch({ preco_promocional: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                  {form.preco_promocional &&
                    form.preco_venda &&
                    form.preco_promocional > form.preco_venda && (
                      <p className="text-xs text-destructive">
                        O preço promocional não pode ser maior que o de venda
                      </p>
                    )}
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={Package}
              title="Estoque"
              description="Unidade de medida do produto. Quantidades entram por movimentação ou pedido."
            >
              <div className="space-y-2 max-w-xs">
                <Label>Unidade *</Label>
                <Select
                  value={form.unidade_medida || 'UN'}
                  onValueChange={(value) =>
                    patch({ unidade_medida: value as ProdutoFormData['unidade_medida'] })
                  }
                >
                  <SelectTrigger className={inputClass}>
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
            </FormSection>

            <FormSection
              icon={Ruler}
              title="Dimensões e validade"
              description="Peso, medidas físicas e data de validade."
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    className={inputClass}
                    value={form.peso ?? ''}
                    onChange={(e) => patch({ peso: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={form.altura ?? ''}
                    onChange={(e) => patch({ altura: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Largura (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={form.largura ?? ''}
                    onChange={(e) => patch({ largura: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    className={inputClass}
                    value={form.data_validade || ''}
                    onChange={(e) => patch({ data_validade: e.target.value || undefined })}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection icon={Info} title="Observações" description="Informações adicionais sobre o produto.">
              <Textarea
                className={cn(inputClass, 'min-h-[100px] resize-y')}
                placeholder="Observações adicionais"
                value={form.observacoes || ''}
                onChange={(e) => patch({ observacoes: e.target.value })}
              />
            </FormSection>
          </TabsContent>
        </Tabs>

        <aside className="w-full shrink-0 lg:w-[280px] lg:self-stretch xl:w-[320px]">
          <ResumoScrollFollower>
            <Card className="overflow-hidden border-border/60 shadow-md transition-shadow duration-300 hover:shadow-lg">
              <div className={cn('px-5 py-4 text-white', resumoHeaderClass(statusAtivo))}>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Resumo</p>
                <p className="mt-1 text-lg font-semibold">{status === 'ATIVO' ? 'Ativo' : 'Inativo'}</p>
                <p className="mt-3 truncate text-xl font-bold tracking-tight">
                  {form.nome?.trim() || (modo === 'editar' ? 'Produto' : 'Novo produto')}
                </p>
              </div>
              <CardContent className="space-y-3 p-5 pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Categoria</span>
                    <span className="max-w-[55%] truncate text-right font-medium">{categoriaNome}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Fornecedor</span>
                    <span className="max-w-[55%] truncate text-right font-medium">{fornecedorNome}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Preço venda</span>
                    <span className="font-medium">
                      {form.preco_venda != null ? formatCurrency(Number(form.preco_venda)) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Unidade</span>
                    <span className="font-medium">{form.unidade_medida || 'UN'}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">NCM</span>
                    <span className="font-mono font-medium">
                      {form.ncm?.trim() ? formatarNcm(form.ncm) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="max-w-[55%] truncate text-right font-medium">
                      {form.sku?.trim() || (modo === 'editar' ? '—' : 'Auto')}
                    </span>
                  </div>
                </div>
                <ResumoCardSubmitButton
                  label={modo === 'editar' ? 'Salvar Alterações' : 'Criar Produto'}
                  pendingLabel={modo === 'editar' ? 'Salvando...' : 'Cadastrando...'}
                  isPending={isPending}
                />
              </CardContent>
            </Card>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Campos marcados com * são obrigatórios. Revise os dados antes de salvar.
            </p>
          </ResumoScrollFollower>
        </aside>
      </div>
    </form>
  );
}
