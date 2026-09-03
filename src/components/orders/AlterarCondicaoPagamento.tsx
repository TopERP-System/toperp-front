import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAlterarCondicaoPagamento } from '@/hooks/useAlterarCondicaoPagamento';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const OPCOES_CONDICAO = [
  { value: 'À vista', label: 'À vista' },
  ...Array.from({ length: 11 }, (_, i) => {
    const n = i + 2;
    return { value: `${n}x`, label: `${n}x` };
  }),
  { value: '30/60', label: '30/60 dias' },
  { value: '30/60/90', label: '30/60/90 dias' },
];

interface AlterarCondicaoPagamentoProps {
  pedidoId: number;
  condicaoAtual?: string | null;
  dataVencimentoBaseAtual?: string | null;
  dataPedido?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AlterarCondicaoPagamento({
  pedidoId,
  condicaoAtual,
  dataVencimentoBaseAtual,
  dataPedido,
  open,
  onClose,
  onSuccess,
}: AlterarCondicaoPagamentoProps) {
  const [condicaoSelecionada, setCondicaoSelecionada] = useState<string>('');
  const [dataBase, setDataBase] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  const alterarCondicao = useAlterarCondicaoPagamento();

  const eParcelado =
    condicaoSelecionada !== '' &&
    condicaoSelecionada !== 'À vista' &&
    !condicaoSelecionada.toLowerCase().includes('vista');

  useEffect(() => {
    if (open) {
      setCondicaoSelecionada(condicaoAtual ?? '');
      const base =
        dataVencimentoBaseAtual?.split('T')[0]?.split(' ')[0] ||
        dataPedido?.split('T')[0]?.split(' ')[0] ||
        new Date().toISOString().split('T')[0];
      setDataBase(base);
      setErro(null);
    }
  }, [open, condicaoAtual, dataVencimentoBaseAtual, dataPedido]);

  const handleSubmit = async () => {
    setErro(null);
    if (!condicaoSelecionada.trim()) {
      setErro('Selecione uma condição de pagamento.');
      return;
    }

    const confirmar = window.confirm(
      eParcelado
        ? `Alterar para "${condicaoSelecionada}"? As parcelas em aberto serão removidas e as novas parcelas serão criadas.`
        : `Alterar condição para "${condicaoSelecionada}"?`
    );
    if (!confirmar) return;

    try {
      await alterarCondicao.mutateAsync({
        pedidoId,
        condicao_pagamento: condicaoSelecionada.trim(),
        ...(eParcelado && dataBase
          ? { data_vencimento_base: dataBase }
          : {}),
      });
      onSuccess?.();
      onClose();
    } catch {
      // Erro já tratado no hook
    }
  };

  const handleClose = () => {
    setErro(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Alterar condição de pagamento
          </DialogTitle>
          <DialogDescription>
            Altere de à vista para parcelado (ou o contrário). Parcelas em
            aberto serão recalculadas; as já pagas não são alteradas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {condicaoAtual && (
            <p className="text-sm text-muted-foreground">
              Condição atual: <strong>{condicaoAtual}</strong>
            </p>
          )}

          <div className="space-y-2">
            <Label>Nova condição</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {OPCOES_CONDICAO.map((op) => (
                <Button
                  key={op.value}
                  type="button"
                  variant={
                    condicaoSelecionada === op.value ? 'default' : 'outline'
                  }
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setCondicaoSelecionada(op.value);
                    setErro(null);
                  }}
                >
                  {op.label}
                </Button>
              ))}
            </div>
            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}
          </div>

          {eParcelado && (
            <div className="space-y-2">
              <Label htmlFor="data-base-condicao">
                Data base para vencimentos (opcional)
              </Label>
              <Input
                id="data-base-condicao"
                type="date"
                value={dataBase}
                onChange={(e) => setDataBase(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se não informar, será usada a data do pedido. Primeira parcela
                (e demais) a partir desta data.
              </p>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Ao confirmar, o backend remove apenas parcelas em aberto e cria as
              novas conforme a condição escolhida.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={alterarCondicao.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={alterarCondicao.isPending || !condicaoSelecionada.trim()}
          >
            {alterarCondicao.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Alterar condição'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
