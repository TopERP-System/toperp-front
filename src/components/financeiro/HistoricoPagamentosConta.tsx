import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatarDataBR, formatarFormaPagamento } from "@/lib/utils";
import {
  financeiroService,
  type HistoricoPagamentoItem,
} from "@/services/financeiro.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Linha montada no cliente quando a API não traz histórico (ex.: pagamentos do centro de custo). */
export type LinhaHistoricoFallback = {
  key: string;
  data: string;
  valor: number;
  formaLabel: string;
  bancoLabel?: string;
};

/**
 * Histórico completo de pagamentos/recebimentos da conta, com estorno individual.
 * Pagamentos estornados continuam na lista (auditoria); o backend recalcula
 * valor pago e status (Parcial/Pendente) a cada estorno.
 */
export function HistoricoPagamentosConta({
  contaId,
  titulo,
  itens,
  fallback = [],
  labelAtivo,
  permiteEstorno,
  invalidateQueryKeys = [],
}: {
  contaId: number;
  titulo: string;
  itens: HistoricoPagamentoItem[] | undefined;
  fallback?: LinhaHistoricoFallback[];
  /** "Pago" (contas a pagar) ou "Recebido" (contas a receber). */
  labelAtivo: string;
  /** Contas vinculadas a pedido estornam pelo pedido. */
  permiteEstorno: boolean;
  invalidateQueryKeys?: readonly (readonly unknown[])[];
}) {
  const queryClient = useQueryClient();
  const [estornando, setEstornando] = useState<HistoricoPagamentoItem | null>(null);
  const [motivo, setMotivo] = useState("");

  const estornarMutation = useMutation({
    mutationFn: (item: HistoricoPagamentoItem) =>
      financeiroService.estornarLancamento(contaId, item.id as number, {
        ...(motivo.trim() ? { motivo_estorno: motivo.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.success("Pagamento estornado.");
      setEstornando(null);
      setMotivo("");
      await queryClient.invalidateQueries({ queryKey: ["conta-financeira", contaId] });
      await queryClient.invalidateQueries({ queryKey: ["contas-financeiras"] });
      await queryClient.invalidateQueries({ queryKey: ["centro-custo"] });
      for (const key of invalidateQueryKeys) {
        await queryClient.invalidateQueries({ queryKey: [...key] });
      }
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(typeof msg === "string" ? msg : "Não foi possível estornar o pagamento.");
    },
  });

  const temItensApi = Array.isArray(itens) && itens.length > 0;
  const colunas = permiteEstorno ? 7 : 6;

  const badgeAtivo = (
    <Badge
      variant="outline"
      className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
    >
      {labelAtivo}
    </Badge>
  );

  return (
    <div className="bg-card space-y-4 rounded-lg border p-6">
      <h2 className="border-b pb-2 text-lg font-semibold">{titulo}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Forma</TableHead>
            <TableHead>Banco / Conta</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Detalhes</TableHead>
            {permiteEstorno ? <TableHead className="text-right">Ações</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {temItensApi ? (
            itens!.map((item, idx) => {
              const isEstornado = item.estornado || !!item.data_estorno;
              return (
                <TableRow
                  key={item.id != null ? `hp-${item.id}` : `hp-legado-${idx}`}
                  className={isEstornado ? "text-muted-foreground" : undefined}
                >
                  <TableCell>
                    {item.data_lancamento ? formatarDataBR(item.data_lancamento) : "—"}
                  </TableCell>
                  <TableCell className={isEstornado ? "line-through" : "font-medium"}>
                    {formatCurrency(Number(item.valor_pago))}
                  </TableCell>
                  <TableCell>
                    {item.forma_pagamento ? formatarFormaPagamento(item.forma_pagamento) : "—"}
                  </TableCell>
                  <TableCell>{item.conta_bancaria_nome || "—"}</TableCell>
                  <TableCell>
                    {isEstornado ? (
                      <Badge
                        variant="destructive"
                        className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                      >
                        Estornado / Cancelado
                      </Badge>
                    ) : (
                      badgeAtivo
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {isEstornado ? (
                      <div className="space-y-1">
                        {item.data_estorno && (
                          <div>
                            <span className="font-medium text-foreground">Data Estorno:</span>{" "}
                            {formatarDataBR(item.data_estorno)}
                          </div>
                        )}
                        {(item.motivo_estorno || item.observacoes) && (
                          <div>
                            <span className="font-medium text-foreground">Motivo:</span>{" "}
                            {item.motivo_estorno || item.observacoes}
                          </div>
                        )}
                      </div>
                    ) : (
                      item.observacoes || "—"
                    )}
                  </TableCell>
                  {permiteEstorno ? (
                    <TableCell className="text-right">
                      {!isEstornado && item.id != null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setMotivo("");
                            setEstornando(item);
                          }}
                        >
                          <Undo2 className="mr-1 h-4 w-4" />
                          Estornar
                        </Button>
                      ) : item.legado && !isEstornado ? (
                        <span
                          className="text-xs text-muted-foreground"
                          title="Pagamento lançado antes do histórico detalhado. Ele vira um lançamento próprio no próximo pagamento registrado."
                        >
                          Sem lançamento individual
                        </span>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          ) : fallback.length > 0 ? (
            fallback.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{formatarDataBR(row.data)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(row.valor)}</TableCell>
                <TableCell>{row.formaLabel}</TableCell>
                <TableCell>{row.bancoLabel || "—"}</TableCell>
                <TableCell>{badgeAtivo}</TableCell>
                <TableCell>—</TableCell>
                {permiteEstorno ? <TableCell /> : null}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={colunas} className="text-muted-foreground py-8 text-center">
                Nenhum pagamento registrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog
        open={estornando != null}
        onOpenChange={(open) => {
          if (!open && !estornarMutation.isPending) setEstornando(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar pagamento</DialogTitle>
            <DialogDescription>
              {estornando ? (
                <>
                  O pagamento de {formatCurrency(Number(estornando.valor_pago))}
                  {estornando.data_lancamento
                    ? ` em ${formatarDataBR(estornando.data_lancamento)}`
                    : ""}{" "}
                  será cancelado e continuará no histórico como estornado. O valor em aberto e o
                  status da conta serão recalculados.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-estorno">Motivo (opcional)</Label>
            <Textarea
              id="motivo-estorno"
              rows={3}
              placeholder="Ex.: pagamento lançado em duplicidade"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={estornarMutation.isPending}
              onClick={() => setEstornando(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={estornarMutation.isPending}
              onClick={() => estornando && estornarMutation.mutate(estornando)}
            >
              {estornarMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
