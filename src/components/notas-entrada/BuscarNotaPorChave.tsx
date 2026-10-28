import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatDocument } from '@/lib/validators';
import { notasEntradaService, ResultadoBuscaChave } from '@/services/notas-entrada.service';
import { useMutation } from '@tanstack/react-query';
import { Clock, KeyRound, Loader2, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

const somenteDigitos = (texto: string) => texto.replace(/\D/g, '').slice(0, 44);
/** Em blocos de 4, como no DANFE. */
const emBlocos = (digitos: string) => digitos.replace(/(\d{4})(?=\d)/g, '$1 ');

interface Props {
  /** XML completo da nota: segue a mesma prévia do upload. */
  onXml: (xml: string, chave: string) => void;
  /** Bloqueia enquanto a prévia é lida. */
  ocupado?: boolean;
}

/** Task 012: digita (ou lê com o leitor de código de barras do DANFE) a chave e busca a NF-e na SEFAZ. */
export function BuscarNotaPorChave({ onXml, ocupado }: Props) {
  const [chave, setChave] = useState('');
  const [resultado, setResultado] = useState<Exclude<ResultadoBuscaChave, { situacao: 'PRONTA' }> | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const buscar = useMutation({
    mutationFn: (confirmarOperacao: boolean) => notasEntradaService.buscarPorChave(chave, confirmarOperacao),
    onSuccess: (r) => {
      if (r.situacao === 'PRONTA') {
        setResultado(null);
        onXml(r.xml, r.nota.chave_acesso);
        return;
      }
      setResultado(r);
    },
    onError: (error: { message?: string }) => {
      setResultado(null);
      toast.error(error?.message || 'Não foi possível buscar a nota.');
    },
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (chave.length !== 44) {
      toast.error('A chave de acesso tem 44 números.');
      return;
    }
    buscar.mutate(false);
  };

  const carregando = buscar.isPending || Boolean(ocupado);
  const nota = resultado?.nota;

  return (
    <Card className="mb-4">
      <CardContent className="space-y-3 pt-6">
        <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="chave-acesso" className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Chave de acesso da NF-e
            </label>
            <Input
              id="chave-acesso"
              autoFocus
              autoComplete="off"
              inputMode="numeric"
              placeholder="Digite os 44 números ou leia o código de barras do DANFE"
              className="font-mono"
              value={emBlocos(chave)}
              onChange={(e) => {
                setChave(somenteDigitos(e.target.value));
                setResultado(null);
              }}
            />
          </div>
          <Button type="submit" disabled={carregando || chave.length === 0}>
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar nota
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          {chave.length}/44 · A nota vem da SEFAZ quando foi emitida para o CNPJ da empresa.
        </p>

        {resultado && nota && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <Clock className="h-4 w-4" />
            <AlertTitle>
              {resultado.situacao === 'AGUARDANDO_XML' ? 'Aguardando o XML da SEFAZ' : 'Confirmação necessária'}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {nota.emitente_nome ?? 'Emitente'}
                {nota.emitente_cpf_cnpj && ` · ${formatDocument(nota.emitente_cpf_cnpj)}`}
                {nota.valor != null && ` · ${formatCurrency(nota.valor)}`}
                {nota.data_emissao && ` · emitida em ${formatDate(nota.data_emissao)}`}
              </p>
              <p>{resultado.mensagem}</p>
              {resultado.situacao === 'AGUARDANDO_XML' ? (
                <Button size="sm" variant="outline" disabled={carregando} onClick={() => buscar.mutate(false)}>
                  Buscar de novo
                </Button>
              ) : (
                <Button size="sm" disabled={carregando} onClick={() => setConfirmando(true)}>
                  Confirmar operação na SEFAZ
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar a operação na SEFAZ?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa declara à SEFAZ que recebeu a mercadoria desta nota. Isso não pode ser desfeito. Só confirme se
              a compra realmente aconteceu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => buscar.mutate(true)}>Confirmar operação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
