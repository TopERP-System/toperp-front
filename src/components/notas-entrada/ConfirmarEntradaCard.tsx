import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate, formatarFormaPagamento, formatISODateLocal } from '@/lib/utils';
import {
  NotaEntradaDetalhe,
  NotaEntradaPrevia,
  notasEntradaService,
} from '@/services/notas-entrada.service';
import type { FormaPagamento } from '@/types/pedido';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const FORMAS: FormaPagamento[] = ['BOLETO', 'PIX', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CHEQUE'];

interface Props {
  previa: NotaEntradaPrevia;
  arquivo: File;
  /** CFOP de entrada de cada item (já com o sugerido); só confirma com todos válidos. */
  cfops: Record<number, string>;
  /** Fornecedor existente associado pelo usuário (senão, o do CNPJ/CPF da nota). */
  fornecedorId: number | null;
  bloqueado: boolean;
  onConfirmada: (nota: NotaEntradaDetalhe) => void;
}

/** US03/US09/US10: dados internos, parcelas e confirmação da entrada. */
export function ConfirmarEntradaCard({ previa, arquivo, cfops, fornecedorId, bloqueado, onConfirmada }: Props) {
  const duplicatas = previa.nota.duplicatas.filter((d) => d.vencimento && d.valor > 0);
  const [dataEntrada, setDataEntrada] = useState(formatISODateLocal(new Date()));
  const [forma, setForma] = useState<FormaPagamento>('BOLETO');
  const [usarParcelasXml, setUsarParcelasXml] = useState(duplicatas.length > 0);
  const [vencimento, setVencimento] = useState('');

  const parcelaUnica = !usarParcelasXml || duplicatas.length === 0;
  const podeConfirmar = !bloqueado && Boolean(dataEntrada) && (!parcelaUnica || Boolean(vencimento));

  const confirmar = useMutation({
    mutationFn: () =>
      notasEntradaService.confirmar(arquivo, {
        data_entrada: dataEntrada,
        forma_pagamento: forma,
        usar_parcelas_xml: !parcelaUnica,
        ...(parcelaUnica ? { data_vencimento: vencimento } : {}),
        cfops: Object.entries(cfops).map(([n, cfop]) => ({ n_item: Number(n), cfop })),
        ...(fornecedorId ? { fornecedor_id: fornecedorId } : {}),
      }),
    onSuccess: (nota) => {
      toast.success(`Entrada confirmada! Pedido de compra ${nota.numero_pedido ?? ''} criado.`);
      onConfirmada(nota);
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Não foi possível confirmar a entrada.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confirmar entrada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="data-entrada">Data da entrada *</Label>
            <Input
              id="data-entrada"
              type="date"
              value={dataEntrada}
              onChange={(e) => setDataEntrada(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Forma de pagamento *</Label>
            <Select value={forma} onValueChange={(v) => setForma(v as FormaPagamento)}>
              <SelectTrigger aria-label="Forma de pagamento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {formatarFormaPagamento(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Parcelas do contas a pagar</Label>
          {duplicatas.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="usar-parcelas-xml"
                checked={usarParcelasXml}
                onCheckedChange={(v) => setUsarParcelasXml(v === true)}
              />
              <Label htmlFor="usar-parcelas-xml" className="font-normal">
                Usar as {duplicatas.length} parcela(s) do XML
              </Label>
            </div>
          )}
          {!parcelaUnica ? (
            <ul className="divide-y rounded-lg border">
              {duplicatas.map((d, i) => (
                <li key={`${d.numero}-${i}`} className="flex justify-between px-3 py-2">
                  <span>
                    {d.numero ?? `${i + 1}`} · vence {formatDate(d.vencimento)}
                  </span>
                  <span className="font-medium">{formatCurrency(d.valor)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span>Parcela única de {formatCurrency(previa.nota.totais.total)}, vencimento</span>
              <Input
                aria-label="Vencimento"
                type="date"
                className="w-44"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </div>
          )}
        </div>

        <p className="text-muted-foreground">
          Ao confirmar, o sistema cria um pedido de compra atendido: os produtos entram no estoque, o
          contas a pagar é gerado e o custo dos produtos passa a ser o desta nota (com frete, seguro e
          IPI rateados).
        </p>

        <div className="flex justify-end">
          <Button onClick={() => confirmar.mutate()} disabled={!podeConfirmar || confirmar.isPending}>
            {confirmar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirmar entrada
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
