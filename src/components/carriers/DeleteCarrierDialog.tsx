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
import { Transportadora } from '@/types/carrier';

interface DeleteCarrierDialogProps {
  /** Controla visibilidade do modal */
  isOpen: boolean;
  
  /** Callback ao fechar/cancelar */
  onClose: () => void;
  
  /** Callback ao confirmar exclusão */
  onConfirm: () => void;
  
  /** Transportadora a ser excluída */
  carrier: Transportadora | null;
}

export function DeleteCarrierDialog({
  isOpen,
  onClose,
  onConfirm,
  carrier,
}: DeleteCarrierDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a transportadora{' '}
            <span className="font-semibold">{carrier?.nome}</span>?
            <br />
            <br />
            Esta ação realizará uma exclusão lógica (soft delete). A transportadora
            será marcada como excluída, mas os pedidos vinculados serão mantidos para
            histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}



