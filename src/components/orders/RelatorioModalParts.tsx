import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  CalendarRange,
  Download,
  FileText,
  Filter,
  Loader2,
  LucideIcon,
  Printer,
} from 'lucide-react';
import { ReactNode } from 'react';

function RelatorioSectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        ) : null}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function RelatorioModalShell({
  icon: Icon,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl';
}) {
  return (
    <DialogContent
      className={cn(
        'flex flex-col gap-0 p-0 overflow-hidden border-border/70 shadow-2xl',
        'w-[calc(100vw-1.5rem)] max-h-[min(92dvh,760px)]',
        maxWidth === 'md' && 'sm:max-w-md',
        maxWidth === 'lg' && 'sm:max-w-xl',
        maxWidth === 'xl' && 'sm:max-w-2xl',
      )}
    >
      <DialogHeader className="shrink-0 space-y-0 border-b border-border/60 bg-gradient-to-r from-primary/[0.07] via-background to-background px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15 shadow-sm">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <DialogTitle className="text-left text-lg font-semibold tracking-tight">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-left text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </div>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 bg-muted/20">
        {children}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-4">
          {footer}
        </div>
      ) : null}
    </DialogContent>
  );
}

export function RelatorioHubCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5 text-left shadow-sm',
        'transition-all duration-200 hover:border-primary/35 hover:bg-primary/[0.03] hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10 transition-colors group-hover:bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

const PERIODOS_RAPIDOS = [
  ['hoje', 'Hoje'],
  ['ontem', 'Ontem'],
  ['7d', 'Últimos 7 dias'],
  ['mes_atual', 'Mês atual'],
  ['mes_anterior', 'Mês anterior'],
] as const;

export function RelatorioPeriodoSection({
  dataInicial,
  dataFinal,
  onDataInicial,
  onDataFinal,
  periodoAtivo,
  onPeriodoRapido,
  onQualquerPeriodo,
}: {
  dataInicial: string;
  dataFinal: string;
  onDataInicial: (v: string) => void;
  onDataFinal: (v: string) => void;
  periodoAtivo: string;
  onPeriodoRapido: (key: (typeof PERIODOS_RAPIDOS)[number][0]) => void;
  onQualquerPeriodo?: () => void;
}) {
  return (
    <RelatorioSectionCard title="Período" icon={CalendarRange}>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-end">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Data inicial</span>
          <Input
            type="date"
            className="w-full bg-background border-border/80 h-10"
            value={dataInicial}
            onChange={(e) => onDataInicial(e.target.value)}
          />
        </div>
        <span className="hidden sm:flex pb-2.5 text-xs font-medium text-muted-foreground">
          até
        </span>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Data final</span>
          <Input
            type="date"
            className="w-full bg-background border-border/80 h-10"
            value={dataFinal}
            onChange={(e) => onDataFinal(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {onQualquerPeriodo ? (
          <Button
            type="button"
            size="sm"
            variant={periodoAtivo === 'all' ? 'default' : 'outline'}
            className={cn(
              'rounded-full h-8 px-3.5 text-xs font-medium',
              periodoAtivo === 'all' && 'shadow-sm',
            )}
            onClick={onQualquerPeriodo}
          >
            Qualquer período
          </Button>
        ) : null}
        {PERIODOS_RAPIDOS.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={periodoAtivo === key ? 'default' : 'outline'}
            className={cn(
              'rounded-full h-8 px-3.5 text-xs font-medium',
              periodoAtivo === key && 'shadow-sm',
            )}
            onClick={() => onPeriodoRapido(key)}
          >
            {label}
          </Button>
        ))}
      </div>
    </RelatorioSectionCard>
  );
}

export function RelatorioFiltrosGrid({ children }: { children: ReactNode }) {
  return (
    <RelatorioSectionCard title="Filtros opcionais" icon={Filter}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{children}</div>
    </RelatorioSectionCard>
  );
}

export function RelatorioCampoFiltro({
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
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export type RelatorioPedidoCampos = 'completo' | 'principais';

export function RelatorioPedidoCamposSection({
  value,
  onChange,
  disabled = false,
  hint,
}: {
  value: RelatorioPedidoCampos;
  onChange: (value: RelatorioPedidoCampos) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <RelatorioSectionCard title="Conteúdo do relatório" icon={FileText}>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as RelatorioPedidoCampos)}
        className="space-y-2"
        disabled={disabled}
      >
        <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-background/80 px-3 py-3">
          <RadioGroupItem value="completo" id="rel-ped-campos-completo" className="mt-0.5" />
          <Label htmlFor="rel-ped-campos-completo" className="cursor-pointer space-y-0.5 font-normal">
            <span className="block text-sm font-medium text-foreground">Todos os campos</span>
            <span className="block text-xs text-muted-foreground leading-relaxed">
              Inclui endereço e contato do cliente ou fornecedor.
            </span>
          </Label>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-background/80 px-3 py-3">
          <RadioGroupItem value="principais" id="rel-ped-campos-principais" className="mt-0.5" />
          <Label htmlFor="rel-ped-campos-principais" className="cursor-pointer space-y-0.5 font-normal">
            <span className="block text-sm font-medium text-foreground">Apenas campos principais</span>
            <span className="block text-xs text-muted-foreground leading-relaxed">
              Omite endereço e contato; mantém cliente, detalhes do pedido e itens.
            </span>
          </Label>
        </div>
      </RadioGroup>
      {hint ? (
        <p className="text-xs text-muted-foreground leading-relaxed pt-1">{hint}</p>
      ) : null}
    </RelatorioSectionCard>
  );
}

export function RelatorioResumoFiltrosPreview({
  linhas,
}: {
  linhas: Array<{ label: string; valor: string }>;
}) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-background p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70 mb-3">
        Resumo
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {linhas.map(({ label, valor }) => {
          const vazio = valor === 'Não informado';
          return (
            <div
              key={label}
              className={cn(
                'rounded-xl px-3 py-2.5 min-w-0 transition-colors',
                vazio
                  ? 'border border-dashed border-border/70 bg-muted/30'
                  : 'border border-border/60 bg-background/90 shadow-sm',
              )}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-semibold truncate text-foreground',
                  vazio && 'font-normal italic text-muted-foreground text-xs',
                )}
                title={valor}
              >
                {valor}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RelatorioAcoesFooter({
  onDownload,
  onPrint,
  downloadLabel = 'Baixar PDF',
  printLabel = 'Imprimir',
  downloading = false,
  printing = false,
  disabled = false,
}: {
  onDownload: () => void | Promise<void>;
  onPrint: () => void | Promise<void>;
  downloadLabel?: string;
  printLabel?: string;
  downloading?: boolean;
  printing?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto gap-2 h-10"
        disabled={disabled || downloading || printing}
        onClick={onPrint}
      >
        {printing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {printing ? 'Abrindo...' : printLabel}
      </Button>
      <Button
        type="button"
        className="w-full sm:w-auto gap-2 h-10 shadow-sm"
        disabled={disabled || downloading || printing}
        onClick={onDownload}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {downloading ? 'Baixando...' : downloadLabel}
      </Button>
    </div>
  );
}
