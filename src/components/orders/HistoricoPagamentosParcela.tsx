import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { pagamentosService } from '@/services/pagamentos.service';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

const FORMAS_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
  CHEQUE: 'Cheque',
};

interface HistoricoPagamentosParcelaProps {
  parcelaId: number;
  parcelaLabel: string;
  onEstornoSucesso?: () => void;
}

export function HistoricoPagamentosParcela({
  parcelaId,
  parcelaLabel,
  onEstornoSucesso,
}: HistoricoPagamentosParcelaProps) {
  const [aberto, setAberto] = useState(false);

  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ['pagamentos', 'parcela', parcelaId],
    queryFn: () => pagamentosService.listarPorParcela(parcelaId),
    enabled: aberto,
  });

  const listaOrdenada = useMemo(() => {
    if (!pagamentos?.length) return [];
    return [...pagamentos].sort(
      (a, b) => new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime()
    );
  }, [pagamentos]);

  const formatarData = (data: string) => {
    try {
      return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
    }
  };

  return (
    <>
      <Collapsible open={aberto} onOpenChange={setAberto}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
            <History className="w-4 h-4" />
            Histórico de pagamentos
            {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : listaOrdenada.length === 0 ? (
              <p className="py-4 px-4 text-sm text-muted-foreground text-center">
                Nenhum pagamento registrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Data</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaOrdenada.map((p) => (
                    <React.Fragment key={p.id}>
                      <TableRow>
                        <TableCell className="text-sm">{formatarData(p.data_lancamento)}</TableCell>
                        <TableCell className="text-sm">
                          {FORMAS_LABEL[p.forma_pagamento] || p.forma_pagamento}
                        </TableCell>
                        <TableCell className="text-sm">{formatCurrency(p.valor_pago)}</TableCell>
                        <TableCell>
                          {p.estornado ? (
                            <Badge variant="secondary">Estornado</Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-600">Pago</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {p.forma_pagamento === 'CHEQUE' && p.cheques && p.cheques.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/30 py-2">
                            <div className="text-sm">
                              <p className="font-medium mb-2">Cheques:</p>
                              <ul className="space-y-1">
                                {(p.cheques as Array<{ id?: number; numero_cheque?: string; valor?: number; titular?: string; banco?: string; data_vencimento?: string; status?: string }>).map((ch, idx) => (
                                  <li key={ch.id ?? idx} className="flex gap-4 flex-wrap">
                                    <span><strong>{ch.numero_cheque}</strong> — {formatCurrency(ch.valor ?? 0)}</span>
                                    <span>{ch.titular}</span>
                                    <span>{ch.banco}</span>
                                    {ch.data_vencimento && <span>Venc: {formatarData(ch.data_vencimento)}</span>}
                                    {ch.status && <Badge variant="outline">{ch.status}</Badge>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
