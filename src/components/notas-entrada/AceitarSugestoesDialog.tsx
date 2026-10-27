import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ItemComSugestao } from '@/features/notas-entrada/utils/sugestoes';
import { notasEntradaService } from '@/services/notas-entrada.service';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/** A partir daqui a sugestão já vem marcada (com a mesma unidade). */
const SIMILARIDADE_CONFIAVEL = 0.8;

interface Props {
  itens: ItemComSugestao[];
  fornecedorId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => void;
}

const lerFator = (texto: string) => Number(texto.replace(',', '.'));
const fatorValido = (texto: string) => Number.isFinite(lerFator(texto)) && lerFator(texto) > 0;

/** Confere as sugestões pelo nome e associa as marcadas de uma vez. */
export function AceitarSugestoesDialog({ itens, fornecedorId, open, onOpenChange, onSalvo }: Props) {
  const [marcados, setMarcados] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      itens.map((i) => [i.n_item, i.sugestao.mesma_unidade && i.sugestao.similaridade >= SIMILARIDADE_CONFIAVEL]),
    ),
  );
  // Unidade diferente: o usuário informa a conversão (1 CX da nota = ? KG no estoque)
  const [fatores, setFatores] = useState<Record<number, string>>(() =>
    Object.fromEntries(itens.map((i) => [i.n_item, i.sugestao.mesma_unidade ? '1' : ''])),
  );

  const escolhidos = itens.filter((i) => marcados[i.n_item]);
  const podeSalvar = escolhidos.length > 0 && escolhidos.every((i) => fatorValido(fatores[i.n_item] ?? ''));

  const salvar = useMutation({
    mutationFn: () =>
      notasEntradaService.salvarVinculos(
        fornecedorId,
        escolhidos.map((i) => ({
          codigo_fornecedor: i.codigo,
          produto_id: i.sugestao.produto.id,
          fator_conversao: lerFator(fatores[i.n_item]),
          unidade_fornecedor: i.unidade,
        })),
      ),
    onSuccess: () => {
      toast.success(`${escolhidos.length} item(ns) associado(s)!`);
      onOpenChange(false);
      onSalvo();
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Não foi possível associar os itens.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aceitar sugestões</DialogTitle>
          <DialogDescription>
            Produtos com nome parecido com o item da nota. Desmarque o que estiver errado; as associações ficam
            gravadas para as próximas notas deste fornecedor.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[55vh] divide-y overflow-y-auto rounded-lg border text-sm">
          {itens.map((i) => {
            const fator = fatores[i.n_item] ?? '';
            return (
              <li key={i.n_item} className="flex items-start gap-3 px-3 py-2">
                <Checkbox
                  className="mt-1"
                  aria-label={`Aceitar sugestão do item ${i.n_item}`}
                  checked={Boolean(marcados[i.n_item])}
                  onCheckedChange={(v) => setMarcados((m) => ({ ...m, [i.n_item]: v === true }))}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground">
                    {i.n_item}. {i.descricao} · {i.unidade}
                  </p>
                  <p>
                    → <span className="font-medium">{i.sugestao.produto.nome}</span>{' '}
                    <span className="text-xs text-muted-foreground">
                      {i.sugestao.produto.sku} · {i.sugestao.produto.unidade_medida}
                    </span>{' '}
                    <Badge variant="outline" className="ml-1">
                      {Math.round(i.sugestao.similaridade * 100)}% parecido
                    </Badge>
                  </p>
                  {!i.sugestao.mesma_unidade && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span>1 {i.unidade} da nota =</span>
                      <Input
                        aria-label={`Conversão do item ${i.n_item}`}
                        className="h-7 w-20"
                        inputMode="decimal"
                        value={fator}
                        onChange={(e) => {
                          setFatores((f) => ({ ...f, [i.n_item]: e.target.value }));
                          if (fatorValido(e.target.value)) setMarcados((m) => ({ ...m, [i.n_item]: true }));
                        }}
                      />
                      <span>{i.sugestao.produto.unidade_medida} no estoque</span>
                      {marcados[i.n_item] && !fatorValido(fator) && (
                        <span className="text-destructive">Informe a conversão.</span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={!podeSalvar || salvar.isPending}>
            {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Associar {escolhidos.length} item(ns)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
