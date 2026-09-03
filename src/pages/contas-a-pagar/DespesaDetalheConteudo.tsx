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
    detalhe?.valor_total_pedido ?? conta.valor_original ?? 0,
  );
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
        <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Valor Total</div>
            <div className="text-primary text-xl font-bold">
              {formatCurrency(valorTotal)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Pago</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(valorPago)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Valor em Aberto</div>
            <div className="text-xl font-bold text-amber-600">
              {formatCurrency(valorAberto)}
            </div>
          </div>
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
          Histórico de Pagamentos
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Forma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.length > 0 ? (
              historico.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{formatarDataBR(row.data)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(row.valor)}
                  </TableCell>
                  <TableCell>{row.formaLabel}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
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
