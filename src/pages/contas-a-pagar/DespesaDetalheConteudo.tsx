import { ComposicaoValoresConta } from "@/components/financeiro/ComposicaoValoresConta";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatarDataBR,
  formatarFormaPagamento,
} from "@/lib/utils";
import type {
  ContaFinanceira,
  ContaFinanceiraDetalhe,
} from "@/services/financeiro.service";
import type { Fornecedor } from "@/services/fornecedores.service";
import { FileText, Truck } from "lucide-react";

export type LinhaHistoricoDespesa = {
  key: string;
  data: string;
  valor: number;
  formaLabel: string;
  bancoLabel?: string;
};

/** Mesmo padrão visual de `ContasAPagarPedidoDetalhes` (cards + tabela de histórico). */
export function DespesaDetalheConteudo({
  conta,
  detalhe,
  fornecedores,
  historico,
}: {
  conta: ContaFinanceira;
  detalhe: ContaFinanceiraDetalhe | null | undefined;
  fornecedores: Fornecedor[];
  historico: LinhaHistoricoDespesa[];
}) {
  const valorTotal = Number(
    detalhe?.valor_total ??
      detalhe?.valor_total_pedido ??
      conta.valor_total ??
      conta.valor_original ??
      0,
  );
  const juros = Number(detalhe?.juros ?? conta.juros ?? 0) || 0;
  const desconto = Number(detalhe?.desconto ?? conta.desconto ?? 0) || 0;
  const valorPago = Number(
    detalhe?.valor_pago ?? (conta as any).valor_pago ?? 0,
  );
  const valorAberto = Number(
    detalhe?.valor_em_aberto ??
      (conta as any).valor_restante ??
      (conta as any).valor_em_aberto ??
      Math.max(0, valorTotal - valorPago),
  );
  const fornecedorNome =
    detalhe?.relacionamentos?.fornecedor_nome ??
    (conta.fornecedor_id
      ? fornecedores.find((f) => f.id === conta.fornecedor_id)?.nome_fantasia ||
        fornecedores.find((f) => f.id === conta.fornecedor_id)?.nome_razao ||
        "—"
      : "N/A");
  const statusFin = String(
    detalhe?.status_original || detalhe?.status || conta.status,
  );
  const dataEmissao =
    conta.data_emissao ||
    detalhe?.datas?.data_criacao ||
    (conta as any).created_at;
  const dataVenc = detalhe?.datas?.data_vencimento ?? conta.data_vencimento;
  const formaPag =
    detalhe?.pagamento?.forma_pagamento &&
    String(detalhe.pagamento.forma_pagamento).trim() !== ""
      ? formatarFormaPagamento(
          detalhe.pagamento.forma_pagamento as ContaFinanceira["forma_pagamento"],
        )
      : (conta as any).forma_pagamento
        ? formatarFormaPagamento((conta as any).forma_pagamento)
        : "—";

  const temHistoricoApi =
    detalhe?.historico_pagamentos &&
    Array.isArray(detalhe.historico_pagamentos) &&
    detalhe.historico_pagamentos.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-card space-y-6 rounded-lg border p-6">
        <h2 className="border-b pb-2 text-lg font-semibold">
          Informações da Despesa
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4" />
              Fornecedor
            </div>
            <div className="font-medium">{fornecedorNome}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Nº da conta
            </div>
            <div className="font-medium">
              {conta.numero_conta || `CONTA-${conta.id}`}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Forma de Pagamento</div>
            <div className="font-medium">{formaPag}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Status financeiro</div>
            <div className="font-medium">{statusFin}</div>
          </div>
        </div>
        <div className="border-t pt-4">
          <ComposicaoValoresConta
            valorTotal={valorTotal}
            juros={juros}
            desconto={desconto}
            valorPago={valorPago}
            valorAberto={valorAberto}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
          {dataEmissao ? (
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Data de Emissão</div>
              <div className="font-medium">{formatarDataBR(dataEmissao)}</div>
            </div>
          ) : null}
          {dataVenc ? (
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Vencimento</div>
              <div className="font-medium">{formatarDataBR(dataVenc)}</div>
            </div>
          ) : null}
        </div>
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">Descrição</p>
          <p className="mt-1 text-sm font-medium">{conta.descricao}</p>
        </div>
      </div>

      <div className="bg-card space-y-4 rounded-lg border p-6">
        <h2 className="border-b pb-2 text-lg font-semibold">
          Histórico de Pagamentos / Estornos
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Banco / Conta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detalhes do Estorno</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {temHistoricoApi ? (
              detalhe!.historico_pagamentos!.map((item) => {
                const isEstornado = item.estornado || !!item.data_estorno;
                return (
                  <TableRow key={`hp-${item.id}`}>
                    <TableCell>{formatarDataBR(item.data_lancamento)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(item.valor_pago))}
                    </TableCell>
                    <TableCell>
                      {item.forma_pagamento
                        ? formatarFormaPagamento(item.forma_pagamento)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {item.conta_bancaria_nome || "—"}
                    </TableCell>
                    <TableCell>
                      {isEstornado ? (
                        <Badge
                          variant="destructive"
                          className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                        >
                          Estornado / Cancelado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                        >
                          Pago
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isEstornado ? (
                        <div className="space-y-1">
                          {item.data_estorno && (
                            <div>
                              <span className="font-medium text-foreground">
                                Data Estorno:
                              </span>{" "}
                              {formatarDataBR(item.data_estorno)}
                            </div>
                          )}
                          {(item.motivo_estorno || item.observacoes) && (
                            <div>
                              <span className="font-medium text-foreground">
                                Motivo:
                              </span>{" "}
                              {item.motivo_estorno || item.observacoes}
                            </div>
                          )}
                        </div>
                      ) : (
                        item.observacoes || "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : historico.length > 0 ? (
              historico.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{formatarDataBR(row.data)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(row.valor)}
                  </TableCell>
                  <TableCell>{row.formaLabel}</TableCell>
                  <TableCell>{row.bancoLabel || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                    >
                      Pago
                    </Badge>
                  </TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
                  Nenhum pagamento registrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
