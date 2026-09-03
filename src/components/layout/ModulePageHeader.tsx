import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModulePageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  loadingHint?: string;
  actions?: ReactNode;
  className?: string;
}

export function ModulePageHeader({
  icon: Icon,
  title,
  subtitle,
  loadingHint,
  actions,
  className,
}: ModulePageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
          ) : null}
          {loadingHint ? (
            <p className="mt-2 text-xs text-muted-foreground">{loadingHint}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
