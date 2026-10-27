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
import { fornecedorDoEmitente } from '@/features/notas-entrada/utils/cadastrosDoXml';
import { formatDocument } from '@/lib/validators';
import { fornecedoresService } from '@/services/fornecedores.service';
import { NfeXml } from '@/services/notas-entrada.service';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  emitente: NfeXml['emitente'];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCadastrado: () => void;
}

/** US08: cadastra o fornecedor com os dados do emitente do XML. */
export function CadastrarFornecedorDialog({ emitente, open, onOpenChange, onCadastrado }: Props) {
  const [nomeFantasia, setNomeFantasia] = useState(emitente.nome_fantasia ?? emitente.nome);
  const end = emitente.endereco;
  const endereco = [
    [end.logradouro, end.numero].filter(Boolean).join(', '),
    end.bairro,
    [end.cidade, end.estado].filter(Boolean).join('/'),
  ]
    .filter(Boolean)
    .join(' · ');

  const cadastrar = useMutation({
    mutationFn: () => fornecedoresService.criar(fornecedorDoEmitente(emitente, nomeFantasia)),
    onSuccess: () => {
      toast.success('Fornecedor cadastrado!');
      onOpenChange(false);
      onCadastrado();
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Não foi possível cadastrar o fornecedor.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar fornecedor</DialogTitle>
          <DialogDescription>Dados do emitente da nota. Confira o nome fantasia.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <Label htmlFor="nome-fantasia-fornecedor">Nome fantasia *</Label>
            <Input
              id="nome-fantasia-fornecedor"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
            />
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Dado rotulo="Razão social" valor={emitente.nome} className="sm:col-span-2" />
            <Dado rotulo="CNPJ/CPF" valor={formatDocument(emitente.cpf_cnpj)} />
            <Dado rotulo="Inscrição estadual" valor={emitente.inscricao_estadual} />
            <Dado rotulo="Endereço" valor={endereco} className="sm:col-span-2" />
            <Dado rotulo="Telefone" valor={end.telefone} />
          </dl>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cadastrar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => cadastrar.mutate()}
            disabled={cadastrar.isPending || !nomeFantasia.trim()}
          >
            {cadastrar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar fornecedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Dado({ rotulo, valor, className }: { rotulo: string; valor?: string | null; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd>{valor || '—'}</dd>
    </div>
  );
}
