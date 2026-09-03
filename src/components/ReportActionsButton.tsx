import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Download, Printer } from 'lucide-react';
import { useState } from 'react';

interface ReportActionsButtonProps {
  /** Título exibido na janelinha de opções, ex.: "Relatório de Margem de Contribuição" */
  title: string;
  /** Texto curto explicando o relatório (opcional). */
  description?: string;
  /** Função chamada ao clicar em "Baixar PDF". */
  onDownload: () => Promise<void> | void;
  /** Função chamada ao clicar em "Imprimir". */
  onPrint: () => Promise<void> | void;
}

/**
 * Botão com ícone de impressora que abre uma pequena janela
 * com as opções "Baixar PDF" e "Imprimir".
 *
 * Pode ser usado em qualquer lugar onde exista um relatório em PDF.
 */
export function ReportActionsButton({
  title,
  description,
  onDownload,
  onPrint,
}: ReportActionsButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<'download' | 'print' | null>(null);

  const handleDownload = async () => {
    try {
      setLoading('download');
      await onDownload();
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  const handlePrint = async () => {
    try {
      setLoading('print');
      await onPrint();
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => setOpen(true)}
        aria-label={`Opções do ${title}`}
      >
        <Printer className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">Opções de relatório</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              disabled={loading !== null}
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              {loading === 'download' ? 'Baixando...' : 'Baixar PDF'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              disabled={loading !== null}
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
              {loading === 'print' ? 'Abrindo para imprimir...' : 'Imprimir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

