export type ModuleStatTheme = {
  iconWrap: string;
  iconClass: string;
  valueClass: string;
  /** Fundo/borda pastel (design do painel Financeiro / Dashboard). */
  cardClassName: string;
  labelClassName: string;
};

/**
 * Temas pastel dos cards de resumo (Financeiro e demais módulos que usam ModuleStatCards).
 * Cores alinhadas ao painel do Dashboard (compras vermelho / vendas verde / saldo dinâmico).
 */
export const statTheme = {
  amber: {
    cardClassName:
      'border-amber-100 bg-amber-50/90 shadow-none dark:border-amber-900/50 dark:bg-amber-950/30',
    iconWrap: 'bg-amber-100 dark:bg-amber-900/50',
    iconClass: 'text-amber-600 dark:text-amber-400',
    valueClass: 'text-amber-700 dark:text-amber-400',
    labelClassName: 'text-amber-800/70 dark:text-amber-300/80',
  },
  emerald: {
    cardClassName:
      'border-emerald-100 bg-emerald-50/90 shadow-none dark:border-emerald-900/50 dark:bg-emerald-950/30',
    iconWrap: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    valueClass: 'text-emerald-700 dark:text-emerald-400',
    labelClassName: 'text-emerald-800/70 dark:text-emerald-300/80',
  },
  rose: {
    cardClassName:
      'border-rose-100 bg-rose-50/90 shadow-none dark:border-rose-900/50 dark:bg-rose-950/30',
    iconWrap: 'bg-rose-100 dark:bg-rose-900/50',
    iconClass: 'text-rose-600 dark:text-rose-400',
    valueClass: 'text-rose-600 dark:text-rose-400',
    labelClassName: 'text-rose-800/70 dark:text-rose-300/80',
  },
  sky: {
    cardClassName:
      'border-sky-100 bg-sky-50/90 shadow-none dark:border-sky-900/50 dark:bg-sky-950/30',
    iconWrap: 'bg-sky-100 dark:bg-sky-900/50',
    iconClass: 'text-sky-600 dark:text-sky-400',
    valueClass: 'text-sky-700 dark:text-sky-400',
    labelClassName: 'text-sky-800/70 dark:text-sky-300/80',
  },
  orange: {
    cardClassName:
      'border-orange-100 bg-orange-50/90 shadow-none dark:border-orange-900/50 dark:bg-orange-950/30',
    iconWrap: 'bg-orange-100 dark:bg-orange-900/50',
    iconClass: 'text-orange-600 dark:text-orange-400',
    valueClass: 'text-orange-700 dark:text-orange-400',
    labelClassName: 'text-orange-800/70 dark:text-orange-300/80',
  },
  red: {
    cardClassName:
      'border-red-100 bg-red-50/90 shadow-none dark:border-red-900/50 dark:bg-red-950/30',
    iconWrap: 'bg-red-100 dark:bg-red-900/50',
    iconClass: 'text-red-600 dark:text-red-400',
    valueClass: 'text-red-600 dark:text-red-400',
    labelClassName: 'text-red-800/70 dark:text-red-300/80',
  },
  blue: {
    cardClassName:
      'border-blue-100 bg-blue-50/90 shadow-none dark:border-blue-900/50 dark:bg-blue-950/30',
    iconWrap: 'bg-blue-100 dark:bg-blue-900/50',
    iconClass: 'text-blue-600 dark:text-blue-400',
    valueClass: 'text-blue-700 dark:text-blue-400',
    labelClassName: 'text-blue-800/70 dark:text-blue-300/80',
  },
  violet: {
    cardClassName:
      'border-violet-100 bg-violet-50/90 shadow-none dark:border-violet-900/50 dark:bg-violet-950/30',
    iconWrap: 'bg-violet-100 dark:bg-violet-900/50',
    iconClass: 'text-violet-600 dark:text-violet-400',
    valueClass: 'text-violet-700 dark:text-violet-400',
    labelClassName: 'text-violet-800/70 dark:text-violet-300/80',
  },
  cyan: {
    cardClassName:
      'border-cyan-100 bg-cyan-50/90 shadow-none dark:border-cyan-900/50 dark:bg-cyan-950/30',
    iconWrap: 'bg-cyan-100 dark:bg-cyan-900/50',
    iconClass: 'text-cyan-600 dark:text-cyan-400',
    valueClass: 'text-cyan-700 dark:text-cyan-400',
    labelClassName: 'text-cyan-800/70 dark:text-cyan-300/80',
  },
  slate: {
    cardClassName:
      'border-slate-200 bg-slate-50/90 shadow-none dark:border-border dark:bg-muted/40',
    iconWrap: 'bg-slate-100 dark:bg-muted',
    iconClass: 'text-slate-600 dark:text-slate-300',
    valueClass: 'text-[#003366] dark:text-foreground',
    labelClassName: 'text-slate-600 dark:text-muted-foreground',
  },
  purple: {
    cardClassName:
      'border-purple-100 bg-purple-50/90 shadow-none dark:border-purple-900/50 dark:bg-purple-950/30',
    iconWrap: 'bg-purple-100 dark:bg-purple-900/50',
    iconClass: 'text-purple-600 dark:text-purple-400',
    valueClass: 'text-purple-700 dark:text-purple-400',
    labelClassName: 'text-purple-800/70 dark:text-purple-300/80',
  },
  primary: {
    cardClassName:
      'border-[#003366]/15 bg-[#003366]/[0.04] shadow-none dark:border-primary/30 dark:bg-primary/10',
    iconWrap: 'bg-primary/10',
    iconClass: 'text-primary',
    valueClass: 'text-[#003366] dark:text-foreground',
    labelClassName: 'text-[#003366]/70 dark:text-muted-foreground',
  },
  green: {
    cardClassName:
      'border-green-100 bg-green-50/90 shadow-none dark:border-green-900/50 dark:bg-green-950/30',
    iconWrap: 'bg-green-100 dark:bg-green-900/50',
    iconClass: 'text-green-600 dark:text-green-400',
    valueClass: 'text-green-700 dark:text-green-400',
    labelClassName: 'text-green-800/70 dark:text-green-300/80',
  },
} as const satisfies Record<string, ModuleStatTheme>;

/** Saldo / resultado: verde se >= 0, vermelho se negativo (igual ao Dashboard). */
export function saldoStatTheme(valor: number): ModuleStatTheme {
  return valor < 0 ? statTheme.red : statTheme.emerald;
}
