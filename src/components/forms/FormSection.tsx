import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function FormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={cn('overflow-hidden border-border/60 shadow-sm', className)}>
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              {description ? (
                <CardDescription className="text-xs leading-relaxed">
                  {description}
                </CardDescription>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">{children}</CardContent>
    </Card>
  );
}
