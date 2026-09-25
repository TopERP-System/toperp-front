import { CodigoFiscalLookup } from '@/components/fiscal/CodigoFiscalLookup';
import { FormSection } from '@/components/forms/FormSection';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DadosFiscaisForm,
  ErrosFiscais,
  TributacaoForm,
} from '@/features/produtos/utils/dadosFiscais';
import { cn } from '@/lib/utils';
import {
  ContextoFiscal,
  fiscalService,
  TipoOperacaoFiscal,
} from '@/services/fiscal.service';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, Info, Landmark } from 'lucide-react';
import type { ReactNode } from 'react';

interface DadosFiscaisProdutoProps {
  dados: DadosFiscaisForm;
  onChange: (patch: Partial<DadosFiscaisForm>) => void;
  contexto?: ContextoFiscal | null;
  erros: ErrosFiscais;
}

function Campo({
  label,
  obrigatorio,
  erro,
  ajuda,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  erro?: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {obrigatorio && ' *'}
      </Label>
      {children}
      {erro ? (
        <p className="text-xs text-destructive">{erro}</p>
      ) : ajuda ? (
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      ) : null}
    </div>
  );
}

function CampoAliquota({
  valor,
  onChange,
  erro,
  placeholder = '0,00',
}: {
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
  placeholder?: string;
}) {
  return (
    <Campo label="Alíquota (%)" erro={erro}>
      <Input
        className={cn('rounded-xl', erro && 'border-destructive')}
        inputMode="decimal"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      />
    </Campo>
  );
}

function BlocoTributo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <p className="text-sm font-semibold">{titulo}</p>
      {children}
    </div>
  );
}

function RegrasOperacao({
  operacao,
  tributacao,
  onChange,
  contexto,
  erros,
}: {
  operacao: TipoOperacaoFiscal;
  tributacao: TributacaoForm;
  onChange: (patch: Partial<TributacaoForm>) => void;
  contexto?: ContextoFiscal | null;
  erros: ErrosFiscais;
}) {
  const erro = (campo: string) => erros[`${operacao}.${campo}`];
  const obrigatorio = operacao === 'SAIDA' && Boolean(contexto?.nfeAtiva);
  const usaCsosn = Boolean(contexto?.usaCsosn);
  const saida = operacao === 'SAIDA';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo
          label={saida ? 'CFOP venda dentro do estado' : 'CFOP compra dentro do estado'}
          obrigatorio={obrigatorio}
          erro={erro('cfop_estadual')}
        >
          <CodigoFiscalLookup
            tabela="cfop"
            titulo="CFOP"
            operacao={operacao}
            escopo="estadual"
            placeholder={saida ? contexto?.cfopInterno || '5102' : '1102'}
            value={tributacao.cfop_estadual}
            onChange={(v) => onChange({ cfop_estadual: v })}
            invalid={!!erro('cfop_estadual')}
          />
        </Campo>
        <Campo
          label={saida ? 'CFOP venda interestadual' : 'CFOP compra interestadual'}
          erro={erro('cfop_interestadual')}
        >
          <CodigoFiscalLookup
            tabela="cfop"
            titulo="CFOP"
            operacao={operacao}
            escopo="interestadual"
            placeholder={saida ? contexto?.cfopInterestadual || '6102' : '2102'}
            value={tributacao.cfop_interestadual}
            onChange={(v) => onChange({ cfop_interestadual: v })}
          />
        </Campo>
      </div>

      <div className="space-y-4">
        <BlocoTributo titulo="ICMS">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {usaCsosn ? (
              <Campo label="CSOSN" obrigatorio={obrigatorio} erro={erro('icms')}>
                <CodigoFiscalLookup
                  tabela="csosn"
                  titulo="CSOSN"
                  placeholder="102"
                  value={tributacao.icms_csosn}
                  onChange={(v) => onChange({ icms_csosn: v })}
                  invalid={!!erro('icms')}
                />
              </Campo>
            ) : (
              <Campo label="CST" obrigatorio={obrigatorio} erro={erro('icms')}>
                <CodigoFiscalLookup
                  tabela="cst-icms"
                  titulo="CST do ICMS"
                  placeholder="00"
                  value={tributacao.icms_cst}
                  onChange={(v) => onChange({ icms_cst: v })}
                  invalid={!!erro('icms')}
                />
              </Campo>
            )}
            <CampoAliquota
              valor={tributacao.icms_aliquota}
              onChange={(v) => onChange({ icms_aliquota: v })}
              erro={erro('icms_aliquota')}
            />
          </div>
        </BlocoTributo>

        <BlocoTributo titulo="IPI">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="CST">
              <CodigoFiscalLookup
                tabela="cst-ipi"
                titulo="CST do IPI"
                operacao={operacao}
                placeholder={saida ? '53' : '03'}
                value={tributacao.ipi_cst}
                onChange={(v) => onChange({ ipi_cst: v })}
              />
            </Campo>
            <CampoAliquota
              valor={tributacao.ipi_aliquota}
              onChange={(v) => onChange({ ipi_aliquota: v })}
              erro={erro('ipi_aliquota')}
            />
            <Campo label="Enquadramento" ajuda="Padrão: 999">
              <Input
                className="rounded-xl font-mono"
                inputMode="numeric"
                maxLength={3}
                placeholder="999"
                value={tributacao.ipi_enquadramento}
                onChange={(e) => onChange({ ipi_enquadramento: e.target.value.replace(/\D/g, '') })}
              />
            </Campo>
          </div>
        </BlocoTributo>

        <BlocoTributo titulo="PIS">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="CST" obrigatorio={obrigatorio} erro={erro('pis_cst')}>
              <CodigoFiscalLookup
                tabela="cst-pis-cofins"
                titulo="CST do PIS"
                operacao={operacao}
                placeholder={saida ? '01' : '50'}
                value={tributacao.pis_cst}
                onChange={(v) => onChange({ pis_cst: v })}
                invalid={!!erro('pis_cst')}
              />
            </Campo>
            <CampoAliquota
              valor={tributacao.pis_aliquota}
              onChange={(v) => onChange({ pis_aliquota: v })}
              erro={erro('pis_aliquota')}
              placeholder="0,65"
            />
          </div>
        </BlocoTributo>

        <BlocoTributo titulo="COFINS">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="CST" obrigatorio={obrigatorio} erro={erro('cofins_cst')}>
              <CodigoFiscalLookup
                tabela="cst-pis-cofins"
                titulo="CST do COFINS"
                operacao={operacao}
                placeholder={saida ? '01' : '50'}
                value={tributacao.cofins_cst}
                onChange={(v) => onChange({ cofins_cst: v })}
                invalid={!!erro('cofins_cst')}
              />
            </Campo>
            <CampoAliquota
              valor={tributacao.cofins_aliquota}
              onChange={(v) => onChange({ cofins_aliquota: v })}
              erro={erro('cofins_aliquota')}
              placeholder="3,00"
            />
          </div>
        </BlocoTributo>
      </div>
    </div>
  );
}

const ROTULO_REGIME: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  SIMPLES_NACIONAL_EXCESSO: 'Simples Nacional (excesso de sublimite)',
  SIMPLES_NACIONAL_MEI: 'MEI',
  REGIME_NORMAL: 'Regime Normal',
};

export default function DadosFiscaisProduto({
  dados,
  onChange,
  contexto,
  erros,
}: DadosFiscaisProdutoProps) {
  const obrigatorio = Boolean(contexto?.nfeAtiva);
  const { data: origens = [] } = useQuery({
    queryKey: ['fiscal', 'tabela', 'origem', null, null],
    queryFn: () => fiscalService.listarTabela('origem'),
    staleTime: Infinity,
  });

  const alterarTributacao = (operacao: TipoOperacaoFiscal, patch: Partial<TributacaoForm>) =>
    onChange({
      tributacoes: {
        ...dados.tributacoes,
        [operacao]: { ...dados.tributacoes[operacao], ...patch },
      },
    });

  const errosNaOperacao = (operacao: TipoOperacaoFiscal) =>
    Object.keys(erros).filter((k) => k.startsWith(`${operacao}.`)).length;

  const regime = contexto?.regimeTributario
    ? ROTULO_REGIME[contexto.regimeTributario] ?? contexto.regimeTributario
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p>
            {obrigatorio
              ? 'Sua empresa emite NF-e: os campos marcados com * são obrigatórios para o produto sair na nota.'
              : 'Sua empresa ainda não tem emissão de NF-e configurada: os dados fiscais são opcionais.'}
          </p>
          <p className="text-muted-foreground">
            {regime
              ? `Regime tributário: ${regime} — ICMS informado por ${contexto?.usaCsosn ? 'CSOSN' : 'CST'}.`
              : 'Regime tributário não configurado em Configurações › Empresa — ICMS informado por CST.'}{' '}
            Use o botão de busca ao lado de cada código para consultar a tabela oficial.
          </p>
        </div>
      </div>

      <FormSection
        icon={FileCheck}
        title="Classificação da mercadoria"
        description="Origem, NCM e CEST do produto."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Campo label="Origem da mercadoria" obrigatorio={obrigatorio} erro={erros.origem}>
            <Select
              value={dados.origem || undefined}
              onValueChange={(v) => onChange({ origem: v })}
            >
              <SelectTrigger className={cn('rounded-xl', erros.origem && 'border-destructive')}>
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(90vw,32rem)]">
                {origens.map((o) => (
                  <SelectItem key={o.codigo} value={o.codigo}>
                    <span className="font-mono">{o.codigo}</span> — {o.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="NCM" obrigatorio={obrigatorio} erro={erros.ncm}>
            <CodigoFiscalLookup
              tabela="ncm"
              titulo="NCM"
              placeholder="0000.00.00"
              value={dados.ncm ?? ''}
              onChange={(v) => onChange({ ncm: v })}
              invalid={!!erros.ncm}
            />
          </Campo>
          <Campo
            label="CEST"
            erro={erros.cest}
            ajuda="Só para mercadorias sujeitas à substituição tributária."
          >
            <CodigoFiscalLookup
              tabela="cest"
              titulo="CEST"
              ncm={dados.ncm}
              placeholder="0000000"
              value={dados.cest ?? ''}
              onChange={(v) => onChange({ cest: v })}
              invalid={!!erros.cest}
            />
          </Campo>
        </div>
      </FormSection>

      <FormSection
        icon={Landmark}
        title="Tributação"
        description="CFOP padrão e regras de ICMS, IPI, PIS e COFINS por tipo de operação."
      >
        <Tabs defaultValue="SAIDA" className="space-y-4">
          <TabsList className="rounded-xl">
            {(['SAIDA', 'ENTRADA'] as const).map((op) => (
              <TabsTrigger key={op} value={op} className="gap-2 rounded-lg">
                {op === 'SAIDA' ? 'Saída (venda)' : 'Entrada (compra)'}
                {errosNaOperacao(op) > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                    {errosNaOperacao(op)}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="SAIDA">
            <RegrasOperacao
              operacao="SAIDA"
              tributacao={dados.tributacoes.SAIDA}
              onChange={(p) => alterarTributacao('SAIDA', p)}
              contexto={contexto}
              erros={erros}
            />
          </TabsContent>
          <TabsContent value="ENTRADA" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Regras usadas em notas de entrada. O sistema ainda não emite NF de entrada — os dados
              ficam gravados no produto.
            </p>
            <RegrasOperacao
              operacao="ENTRADA"
              tributacao={dados.tributacoes.ENTRADA}
              onChange={(p) => alterarTributacao('ENTRADA', p)}
              contexto={contexto}
              erros={erros}
            />
          </TabsContent>
        </Tabs>
      </FormSection>
    </div>
  );
}
