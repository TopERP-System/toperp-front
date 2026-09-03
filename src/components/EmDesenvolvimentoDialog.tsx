import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Construction } from "lucide-react";

interface EmDesenvolvimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
}

export function EmDesenvolvimentoDialog({
  open,
  onOpenChange,
  title,
  description = "Esta funcionalidade está sendo desenvolvida e estará disponível em breve. Agradecemos a sua paciência.",
}: EmDesenvolvimentoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Construction className="h-6 w-6" aria-hidden />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="w-full sm:w-auto min-w-[8rem]"
            onClick={() => onOpenChange(false)}
          >
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
