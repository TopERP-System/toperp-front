import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  formatarFormaPagamento,
} from "@/lib/utils";
import { centroCustoService } from "@/services/centro-custo.service";
import { financeiroService } from "@/services/financeiro.service";
import { Fornecedor, fornecedoresService } from "@/services/fornecedores.service";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type DespesaDetalheLocationState = { voltarPara?: string };
import {
  DespesaDetalheConteudo,
  type LinhaHistoricoDespesa,
} from "./DespesaDetalheConteudo";
import { contaEhDespesaSemPedido } from "./despesaContaUtils";

const ContasAPagarDespesaDetalhes = () => {
  const { contaId: contaIdParam } = useParams<{ contaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const voltarPara =
    (location.state as DespesaDetalheLocationState | null)?.voltarPara ??
    "/contas-a-pagar";
  const contaId = contaIdParam ? Number(contaIdParam) : 0;
  const idValido = Number.isFinite(contaId) && contaId > 0;

  const [contaQuery, detalheQuery, fornecedoresQuery, despesaCcQuery] =
    useQueries({
      queries: [
        {
          queryKey: ["conta-financeira", contaId],
          queryFn: () => financeiroService.buscarPorId(contaId),
          enabled: idValido,
          retry: false,
        },
        {
          queryKey: ["conta-financeira", contaId, "detalhe-despesa-pagina"],
          queryFn: () => financeiroService.buscarDetalhePorId(contaId),
          enabled: idValido,
          retry: false,
        },
        {
          queryKey: ["fornecedores"],
          queryFn: async () => {
            try {
              const response = await fornecedoresService.listar({
                limit: 100,
                statusFornecedor: "ATIVO",
              });
              if (Array.isArray(response)) return response;
              if (Array.isArray((response as any)?.data)) return (response as any).data;
              if (Array.isArray((response as any)?.fornecedores))
                return (response as any).fornecedores;
              if (Array.isArray((response as any)?.items)) return (response as any).items;
              return [];
            } catch {
              return [];
            }
          },
        },
        {
          queryKey: ["centro-custo", "despesa-por-conta", contaId],
          queryFn: async () => {
            const res = await centroCustoService.listarDespesas(1, 500);
            const items = res.items as Array<{
              contaFinanceiraId?: number;
              pagamentos?: Array<{ id: number; valor: number; data: string }>;
            }>;
            return (
              items.find(
                (d) => Number(d.contaFinanceiraId) === Number(contaId),
              ) ?? null
            );
          },
          enabled: idValido,
          retry: false,
        },
      ],
    });

  const conta = contaQuery.data ?? null;
  const detalhe = detalheQuery.data ?? null;
  const fornecedores: Fornecedor[] = Array.isArray(fornecedoresQuery.data)
    ? fornecedoresQuery.data
    : [];
  const despesaCentroPorConta = despesaCcQuery.data ?? null;

  const historicoPagamentos = useMemo((): LinhaHistoricoDespesa[] => {
    const centro = despesaCentroPorConta?.pagamentos;
    if (Array.isArray(centro) && centro.length > 0) {
      return [...centro]
        .sort(
          (a, b) =>
            new Date(b.data).getTime() - new Date(a.data).getTime(),
        )
        .map((p) => ({
          key: `cc-${p.id}`,
          data: p.data,
          valor: p.valor,
          formaLabel: "—",
        }));
    }
    const c = conta;
    if (
      c &&
      Number((c as any).valor_pago) > 0.009 &&
      (c as any).data_pagamento
    ) {
      return [
        {
          key: "conta-saldo",
          data: String((c as any).data_pagamento),
          valor: Number((c as any).valor_pago),
          formaLabel: (c as any).forma_pagamento
            ? formatarFormaPagamento((c as any).forma_pagamento)
            : "—",
        },
      ];
    }
    return [];
  }, [despesaCentroPorConta, conta]);

  const valorAberto = useMemo(() => {
    if (!conta) return 0;
    const vt = Number(
      detalhe?.valor_total_pedido ?? conta.valor_original ?? 0,
    );
    const vp = Number(
      detalhe?.valor_pago ?? (conta as any).valor_pago ?? 0,
    );
    return Number(
      detalhe?.valor_em_aberto ??
        (conta as any).valor_restante ??
        (conta as any).valor_em_aberto ??
        Math.max(0, vt - vp),
    );
  }, [conta, detalhe]);

  const isLoading =
    contaQuery.isLoading ||
    (detalheQuery.isLoading && !detalheQuery.data);
  const erroConta = contaQuery.error;
  const naoEDespesa = conta && !contaEhDespesaSemPedido(conta);

  if (!idValido) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(voltarPara)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="bg-destructive/10 text-destructive rounded-lg p-4">
            <p className="font-medium">Identificador da conta inválido.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (erroConta || !conta) {
    return (
      <AppLayout>
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(voltarPara)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes da Despesa</h1>
            </div>
          </div>
          <div className="bg-destructive/10 text-destructive rounded-lg p-4">
            <p className="font-medium">Erro ao carregar a conta</p>
            <p className="mt-1 text-sm">
              {erroConta instanceof Error ? erroConta.message : "Tente novamente mais tarde."}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (naoEDespesa) {
    return (
      <AppLayout>
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(voltarPara)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes da Despesa</h1>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="font-medium">Esta conta está vinculada a um pedido de compra.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use a lista de contas a pagar e abra pelo pedido correspondente.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const subtitulo =
    conta.numero_conta || `CONTA-${conta.id}`;

  return (
    <AppLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(voltarPara)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes da Despesa</h1>
              <p className="text-muted-foreground">{subtitulo}</p>
            </div>
          </div>
          {valorAberto > 0.009 && (
            <Button
              onClick={() =>
                navigate(`/financeiro/contas-pagar/conta/${conta.id}/pagamentos`, {
                  state: { voltarPara },
                })
              }
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Pagamentos
            </Button>
          )}
        </div>

        <DespesaDetalheConteudo
          conta={conta}
          detalhe={detalhe ?? undefined}
          fornecedores={fornecedores}
          historico={historicoPagamentos}
        />
      </div>
    </AppLayout>
  );
};

export default ContasAPagarDespesaDetalhes;
