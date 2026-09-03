import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency, normalizarStatusParcela } from '@/lib/utils';
import { clientesService } from '@/services/clientes.service';
import {
    contasReceberService,
    type ParcelaDetalhe,
} from '@/services/contas-receber.service';
import { pedidosService } from '@/services/pedidos.service';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, FileText, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  PARCIALMENTE_PAGA: 'Parcial',
  PAGA: 'Quitada',
  EM_COMPENSACAO: 'Em Compensação',
};

const STATUS_COLORS: Record<string, string> = {
  ABERTA: 'bg-slate-500/10 text-slate-600',
  PARCIALMENTE_PAGA: 'bg-amber-500/10 text-amber-600',
  PAGA: 'bg-green-500/10 text-green-600',
  EM_COMPENSACAO: 'bg-blue-500/10 text-blue-600',
};

function formatarDocumento(doc?: string): string {
  if (!doc) return '—';
  const n = doc.replace(/\D/g, '');
  if (n.length === 11)
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (n.length === 14)
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
}

const ContasAReceberClienteDetalhes = () => {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();

  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ['clientes', clienteId],
    queryFn: () => clientesService.buscarPorId(Number(clienteId!)),
    enabled: !!clienteId,
  });

  const { data: detalheApi, isLoading: loadingDetalhe, error: errorDetalhe } = useQuery({
    queryKey: ['contas-receber', 'detalhe', clienteId],
    queryFn: async () => {
      const result = await contasReceberService.obterDetalheCliente(Number(clienteId!));
      // Debug: log para verificar o que está sendo retornado
      if (import.meta.env.DEV) {
        console.log('[ContasAReceberClienteDetalhes] Resposta do endpoint detalhe:', result);
        console.log('[ContasAReceberClienteDetalhes] Parcelas retornadas:', result?.parcelas?.length || 0);
      }
      return result;
    },
    enabled: !!clienteId,
    retry: 1,
  });

  // Usar novo endpoint /pedidos/contas-receber ao invés de /duplicatas/agrupadas-por-pedido
  const { data: pedidosContasReceber, isLoading: loadingPedidosContasReceber, error: errorPedidosContasReceber } = useQuery({
    queryKey: ['pedidos', 'contas-receber', 'cliente', clienteId],
    queryFn: () =>
      pedidosService.listarContasReceber({
        cliente_id: Number(clienteId!),
        situacao: 'em_aberto', // Buscar apenas em aberto
      }).catch((error: any) => {
        // Se o erro for 400 (Bad Request), pode ser que o banco esteja vazio
        // Tratar como array vazio ao invés de erro
        if (error?.response?.status === 400) {
          if (import.meta.env.DEV) {
            console.warn("Backend retornou 400 - tratando como banco vazio:", error);
          }
          return [];
        }
        throw error;
      }),
    // Só buscar se detalheApi não tiver retornado parcelas (após carregar)
    enabled: !!clienteId && !loadingDetalhe && (!detalheApi?.parcelas || detalheApi.parcelas.length === 0),
    retry: 1,
  });

  const isLoadingParcelas = loadingDetalhe || loadingPedidosContasReceber;

  const parcelas: ParcelaDetalhe[] = useMemo(() => {
    // Conforme o guia de troubleshooting: o endpoint retorna TODAS as parcelas
    // Não devemos filtrar por status ou valor_aberto no frontend
    // Se o endpoint de detalhe retornou parcelas, usar elas diretamente
    if (detalheApi?.parcelas && Array.isArray(detalheApi.parcelas) && detalheApi.parcelas.length > 0) {
      // Debug: log para verificar as parcelas retornadas
      if (import.meta.env.DEV) {
        console.log('[ContasAReceberClienteDetalhes] Usando parcelas do endpoint detalhe:', detalheApi.parcelas.length);
      }
      
      // Remover itens duplicados baseado em uma chave única: pedido_id + numero_parcela + total_parcelas
      const seen = new Set<string>();
      const parcelasUnicas = detalheApi.parcelas.filter((p) => {
        const key = `${p.pedido_id}-${p.numero_parcela}-${p.total_parcelas}`;
        if (seen.has(key)) {
          if (import.meta.env.DEV) {
            console.warn('[ContasAReceberClienteDetalhes] Parcela duplicada removida:', key, p);
          }
          return false;
        }
        seen.add(key);
        return true;
      });
      
      if (import.meta.env.DEV && parcelasUnicas.length !== detalheApi.parcelas.length) {
        console.log(`[ContasAReceberClienteDetalhes] Removidos ${detalheApi.parcelas.length - parcelasUnicas.length} itens duplicados`);
      }
      
      return parcelasUnicas;
    }
    
    // Debug: log quando não há parcelas do endpoint detalhe
    if (import.meta.env.DEV) {
      console.log('[ContasAReceberClienteDetalhes] Endpoint detalhe não retornou parcelas, usando fallback');
      console.log('[ContasAReceberClienteDetalhes] detalheApi:', detalheApi);
      console.log('[ContasAReceberClienteDetalhes] pedidosContasReceber:', pedidosContasReceber);
    }

    // Fallback: buscar parcelas dos pedidos retornados pelo novo endpoint
    // Como o novo endpoint retorna apenas pedidos, precisamos buscar as parcelas de cada pedido
    const result: ParcelaDetalhe[] = [];
    
    if (pedidosContasReceber && pedidosContasReceber.length > 0) {
      // Para cada pedido, buscar suas parcelas
      // Nota: Isso requer uma chamada adicional por pedido, mas mantém compatibilidade
      // Em produção, considere usar o endpoint de detalhe do cliente que já retorna todas as parcelas
      if (import.meta.env.DEV) {
        console.log('[ContasAReceberClienteDetalhes] Usando pedidos do novo endpoint, mas precisamos buscar parcelas separadamente');
        console.log('[ContasAReceberClienteDetalhes] Recomendado: usar endpoint /clientes/:id/detalhe que já retorna todas as parcelas');
      }
      
      // Retornar array vazio por enquanto - o endpoint de detalhe deve ser usado
      // Se o endpoint de detalhe não retornar dados, mostrar mensagem ao usuário
      return [];
    }
    
    // Código antigo removido - não usar mais agrupadasData
    // O endpoint de detalhe do cliente deve retornar todas as parcelas
    return [];
  }, [detalheApi, pedidosContasReceber, clienteId]);

  // Calcular total em aberto apenas das parcelas que realmente têm valor em aberto
  const totalAberto = useMemo(
    () => parcelas
      .filter((p) => (p.valor_aberto ?? 0) > 0)
      .reduce((s, p) => s + (p.valor_aberto ?? 0), 0),
    [parcelas]
  );

  const documento =
    cliente?.cpf_cnpj ||
    detalheApi?.cliente?.documento ||
    detalheApi?.cliente?.cpf_cnpj;
  const nomeCliente =
    cliente?.nome_fantasia ||
    cliente?.nome_razao ||
    cliente?.nome ||
    detalheApi?.cliente?.nome ||
    '—';

  return (
    <AppLayout>
        <div className="p-4 sm:p-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/contas-a-receber')}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {loadingCliente ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">Cliente</h2>
              <div className="grid gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Cliente:</span>{' '}
                  <strong>{nomeCliente}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Documento:</span>{' '}
                  {formatarDocumento(documento)}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Total em aberto:
                  </span>{' '}
                  <strong className="text-lg">
                    {formatCurrency(totalAberto)}
                  </strong>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
              <p className="text-sm text-muted-foreground px-6 pt-4 pb-2">
                Parcelas = prestações do pedido. Pague via botão Pagamentos.
              </p>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Pedido</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Valor Total do Pedido
                    </TableHead>
                    <TableHead className="w-[100px] text-right">Pago</TableHead>
                    <TableHead className="w-[100px] text-right">Aberto</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[180px] text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingParcelas ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">Carregando parcelas...</p>
                      </TableCell>
                    </TableRow>
                  ) : (errorDetalhe || errorPedidosContasReceber) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-2 text-destructive">Erro ao carregar parcelas</p>
                        {import.meta.env.DEV && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {errorDetalhe ? 'Erro ao carregar detalhes do cliente' : 'Erro ao carregar pedidos'}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : parcelas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-2">Nenhuma parcela encontrada</p>
                        {import.meta.env.DEV && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Cliente ID: {clienteId} | 
                            Detalhe API: {detalheApi ? 'OK' : 'null'} | 
                            Parcelas no detalhe: {detalheApi?.parcelas?.length || 0} | 
                            Pedidos: {pedidosContasReceber?.length || 0}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    parcelas.map((p, index) => {
                      // Gerar chave única: usar parcela_id se disponível, senão id, senão combinação de pedido+parcela+índice
                      const uniqueKey = p.parcela_id 
                        ? `parcela-${p.parcela_id}`
                        : p.id 
                        ? `parcela-${p.pedido_id}-${p.id}`
                        : `parcela-${p.pedido_id}-${p.numero_parcela}-${p.total_parcelas}-${index}`;
                      
                      return (
                      <TableRow key={uniqueKey}>
                        <TableCell className="font-medium">
                          {p.numero_pedido}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(p.valor)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(p.valor_pago ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(p.valor_aberto ?? 0)}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Normalizar status para garantir que seja válido
                            const statusNormalizado = normalizarStatusParcela(p.status);
                            return (
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  STATUS_COLORS[statusNormalizado] || 'bg-slate-500/10'
                                }`}
                              >
                                {STATUS_LABELS[statusNormalizado] || statusNormalizado}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={(p.valor_aberto ?? 0) <= 0}
                            onClick={() => navigate(`/financeiro/contas-receber/${p.pedido_id}/pagamentos`)}
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Pagamentos
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ContasAReceberClienteDetalhes;
