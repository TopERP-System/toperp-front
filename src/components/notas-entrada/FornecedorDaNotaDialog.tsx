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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fornecedorDoEmitente } from '@/features/notas-entrada/utils/cadastrosDoXml';
import { cn } from '@/lib/utils';
import { formatDocument } from '@/lib/validators';
import { Fornecedor, fornecedoresService } from '@/services/fornecedores.service';
import { NfeXml } from '@/services/notas-entrada.service';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Modo = 'novo' | 'existente';

interface Props {
  emitente: NfeXml['emitente'];
  /** Fornecedor já associado à nota (abre na busca para trocar). */
  associado?: { id: number; nome_fantasia: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `fornecedorId`: o existente escolhido; null quando cadastrou (a prévia acha pelo CNPJ/CPF). */
  onResolvido: (fornecedorId: number | null) => void;
}

/** US08: cadastra o fornecedor com os dados do emitente do XML ou associa a nota a um já cadastrado. */
export function FornecedorDaNotaDialog({ emitente, associado, open, onOpenChange, onResolvido }: Props) {
  const [modo, setModo] = useState<Modo>(associado ? 'existente' : 'novo');
  const [nomeFantasia, setNomeFantasia] = useState(emitente.nome_fantasia ?? emitente.nome);
  const [termo, setTermo] = useState('');
  const [busca, setBusca] = useState('');
  const [escolhido, setEscolhido] = useState<Pick<Fornecedor, 'id' | 'nome_fantasia' | 'cpf_cnpj'> | null>(
    associado ?? null,
  );
  const end = emitente.endereco;
  const endereco = [
    [end.logradouro, end.numero].filter(Boolean).join(', '),
    end.bairro,
    [end.cidade, end.estado].filter(Boolean).join('/'),
  ]
    .filter(Boolean)
    .join(' · ');

  // Espera parar de digitar para buscar
  useEffect(() => {
    const t = setTimeout(() => setBusca(termo.trim()), 300);
    return () => clearTimeout(t);
  }, [termo]);

  const { data: sugestoes = [], isFetching: buscando } = useQuery({
    queryKey: ['fornecedores', 'busca', 'nota-entrada', busca],
    queryFn: async () => {
      const res = await fornecedoresService.buscar(busca, { limit: 8 });
      return res.fornecedores ?? res.data ?? [];
    },
    enabled: modo === 'existente' && busca.length >= 2,
  });

  const cadastrar = useMutation({
    mutationFn: () => fornecedoresService.criar(fornecedorDoEmitente(emitente, nomeFantasia)),
    onSuccess: () => {
      toast.success('Fornecedor cadastrado!');
      onOpenChange(false);
      onResolvido(null);
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Não foi possível cadastrar o fornecedor.');
    },
  });

  const associar = () => {
    if (!escolhido) return;
    onOpenChange(false);
    // A busca de fornecedores devolve o id como texto
    onResolvido(Number(escolhido.id));
  };

  const documentoEscolhido = escolhido?.cpf_cnpj?.replace(/\D/g, '') ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fornecedor da nota</DialogTitle>
          <DialogDescription>
            {emitente.nome} · {formatDocument(emitente.cpf_cnpj)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="novo">Cadastrar novo</TabsTrigger>
            <TabsTrigger value="existente">Fornecedor existente</TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="space-y-4 text-sm">
            <p className="text-muted-foreground">Dados do emitente da nota. Confira o nome fantasia.</p>
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
          </TabsContent>

          <TabsContent value="existente" className="space-y-3 text-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar fornecedor por nome ou CNPJ/CPF"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {buscando && <Loader2 className="mx-auto my-3 h-4 w-4 animate-spin text-muted-foreground" />}
              {!buscando && busca.length >= 2 && sugestoes.length === 0 && (
                <p className="py-3 text-center text-muted-foreground">Nenhum fornecedor encontrado.</p>
              )}
              {sugestoes.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEscolhido(f)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                    escolhido?.id === f.id ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                  )}
                >
                  <span>
                    <span className="font-medium">{f.nome_fantasia}</span>
                    <span className="block text-xs text-muted-foreground">
                      {f.cpf_cnpj ? formatDocument(f.cpf_cnpj) : 'Sem CNPJ/CPF'}
                    </span>
                  </span>
                  {escolhido?.id === f.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            {escolhido && (
              <p>
                Escolhido: <span className="font-medium">{escolhido.nome_fantasia}</span>
                <span className="block text-xs text-muted-foreground">
                  {!documentoEscolhido
                    ? 'Ao confirmar a entrada, o CNPJ/CPF da nota é gravado no cadastro dele: as próximas notas já vêm associadas.'
                    : documentoEscolhido !== emitente.cpf_cnpj
                      ? 'Ele tem outro CNPJ/CPF no cadastro: a associação vale só para esta nota.'
                      : null}
                </span>
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cadastrar.isPending}>
            Cancelar
          </Button>
          {modo === 'novo' ? (
            <Button
              onClick={() => cadastrar.mutate()}
              disabled={cadastrar.isPending || !nomeFantasia.trim()}
            >
              {cadastrar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar fornecedor
            </Button>
          ) : (
            <Button onClick={associar} disabled={!escolhido}>
              Associar
            </Button>
          )}
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
