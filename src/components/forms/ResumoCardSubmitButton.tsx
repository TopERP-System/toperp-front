import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function resumoHeaderClass(ativo: boolean) {
  return ativo
    ? 'bg-gradient-to-br from-emerald-600 to-emerald-700'
    : 'bg-gradient-to-br from-red-600 to-red-700';
}

export function ResumoCardSubmitButton({
  formId,
  label,
  pendingLabel,
  isPending = false,
  className,
}: {
  formId?: string;
  label: string;
  pendingLabel: string;
  isPending?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      {...(formId ? { form: formId } : {})}
      variant="gradient"
      className={cn('mt-2 w-full rounded-xl', className)}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
