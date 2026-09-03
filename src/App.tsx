import { AdminRoute } from "@/components/AdminRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import { SettingsRoute } from "@/components/SettingsRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CentroCustosProvider } from "@/contexts/CentroCustosContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminPanel from "./pages/AdminPanel";
import CentroCustos from "./pages/CentroCustos";
import NovaDespesa from "./pages/centro-custos/NovaDespesa";
import Clientes from "./pages/Clientes";
import NovoCliente from "./pages/clientes/NovoCliente";
import ContasAPagarContaFinanceiraPagamentos from "./pages/contas-a-pagar/ContasAPagarContaFinanceiraPagamentos";
import ContasAPagarDespesaDetalhes from "./pages/contas-a-pagar/ContasAPagarDespesaDetalhes";
import ContasAPagarPedidoDetalhes from "./pages/contas-a-pagar/ContasAPagarPedidoDetalhes";
import ContasAPagarPedidoPagamentos from "./pages/contas-a-pagar/ContasAPagarPedidoPagamentos";
import ContasAReceberClienteDetalhes from "./pages/contas-a-receber/ContasAReceberClienteDetalhes";
import ContasAReceberContaDetalhes from "./pages/contas-a-receber/ContasAReceberContaDetalhes";
import ContasAReceberContaPagamentos from "./pages/contas-a-receber/ContasAReceberContaPagamentos";
import ContasAReceberPedidoDetalhes from "./pages/contas-a-receber/ContasAReceberPedidoDetalhes";
import ContasAReceberPedidoPagamentos from "./pages/contas-a-receber/ContasAReceberPedidoPagamentos";
import ContasAPagar from "./pages/ContasAPagar";
import ContasAReceber from "./pages/ContasAReceber";
import ControleRoca from "./pages/ControleRoca";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import EmDesenvolvimentoPage from "./pages/EmDesenvolvimentoPage";
import Financeiro from "./pages/Financeiro";
import BancosContas from "./pages/financeiro/BancosContas";
import NovaTransacao from "./pages/financeiro/NovaTransacao";
import FluxoDeCaixa from "./pages/FluxoDeCaixa";
import RelatorioComprasCliente from "./pages/RelatorioComprasCliente";
import Fornecedores from "./pages/Fornecedores";
import NovoFornecedor from "./pages/fornecedores/NovoFornecedor";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import NotasFiscais from "./pages/NotasFiscais";
import Pedidos from "./pages/Pedidos";
import NovoPedido from "./pages/pedidos/NovoPedido";
import Produtos from "./pages/Produtos";
import NovoProduto from "./pages/produtos/NovoProduto";
import Settings from "./pages/Settings";
import Transportadoras from "./pages/Transportadoras";
import { ArrowLeftRight, Scale } from "lucide-react";

function ProtectedFinanceRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleRoute>{children}</RoleRoute>
    </ProtectedRoute>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        // Log detalhado em desenvolvimento
        if (import.meta.env.DEV) {
          console.error('❌ [React Query Error]', error);
          console.error('❌ [Error Details]', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        }
        
        // Não mostra toast para erros de autenticação (já tratados globalmente)
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
          const raw =
            error?.response?.data?.message ||
            error?.message ||
            'Erro ao carregar dados da API';
          const errorMessage =
            typeof raw === 'string' ? raw.trim() : 'Erro ao carregar dados';
          // Evita toasts confusos do tipo "Erro HTTP: 200" / status OK
          if (
            !errorMessage ||
            /^erro\s*http\s*:\s*200\b/i.test(errorMessage) ||
            /^erro\s*200\b/i.test(errorMessage) ||
            /^ok$/i.test(errorMessage)
          ) {
            return;
          }
          
          // Usa sonner para notificações mais visíveis
          if (typeof window !== 'undefined') {
            import('sonner').then(({ toast }) => {
              toast.error(errorMessage);
            });
          }
        }
      },
    },
    mutations: {
      onError: (error: any) => {
        // Log detalhado em desenvolvimento
        if (import.meta.env.DEV) {
          console.error('❌ [React Query Mutation Error]', error);
        }
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CentroCustosProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pedidos" 
              element={
                <ProtectedRoute>
                  <Pedidos />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/pedidos/novo"
              element={
                <ProtectedRoute>
                  <NovoPedido />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos/:id/editar"
              element={
                <ProtectedRoute>
                  <NovoPedido />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notas-fiscais"
              element={
                <ProtectedRoute>
                  <RoleRoute>
                    <NotasFiscais />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/financeiro" 
              element={
                <ProtectedFinanceRoute>
                  <Financeiro />
                </ProtectedFinanceRoute>
              } 
            />
            <Route
              path="/financeiro/nova-transacao"
              element={
                <ProtectedFinanceRoute>
                  <NovaTransacao />
                </ProtectedFinanceRoute>
              }
            />
            <Route
              path="/financeiro/bancos-contas"
              element={
                <ProtectedFinanceRoute>
                  <BancosContas />
                </ProtectedFinanceRoute>
              }
            />
            <Route
              path="/financeiro/saldo-bancario"
              element={
                <ProtectedFinanceRoute>
                  <EmDesenvolvimentoPage
                    icon={Scale}
                    title="Saldo Bancário"
                    subtitle="Controle de saldo inicial, movimentações e saldo final do dia."
                  />
                </ProtectedFinanceRoute>
              }
            />
            <Route
              path="/financeiro/conciliacao-bancaria"
              element={
                <ProtectedFinanceRoute>
                  <EmDesenvolvimentoPage
                    icon={ArrowLeftRight}
                    title="Conciliação Bancária"
                    subtitle="Conferência entre saldo inicial, pagamentos, recebimentos e saldo final."
                  />
                </ProtectedFinanceRoute>
              }
            />
            <Route
              path="/financeiro/fluxo-de-caixa"
              element={
                <ProtectedFinanceRoute>
                  <FluxoDeCaixa />
                </ProtectedFinanceRoute>
              }
            />
            <Route
              path="/relatorio/compras-cliente"
              element={
                <ProtectedRoute>
                  <RelatorioComprasCliente />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/contas-a-pagar" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAPagar />
                </ProtectedFinanceRoute>
              } 
            />
            <Route 
              path="/contas-a-receber" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAReceber />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/contas-a-receber/clientes/:clienteId" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAReceberClienteDetalhes />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-receber/:pedidoId" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAReceberPedidoDetalhes />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-receber/:pedidoId/pagamentos" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAReceberPedidoPagamentos />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-receber/conta/:contaId" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAReceberContaDetalhes />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-receber/conta/:contaId/pagamentos" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAReceberContaPagamentos />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-pagar/conta/:contaId/pagamentos"
              element={
                <ProtectedFinanceRoute>
                  <ContasAPagarContaFinanceiraPagamentos />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-pagar/despesa/:contaId"
              element={
                <ProtectedFinanceRoute>
                  <ContasAPagarDespesaDetalhes />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-pagar/:pedidoId" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAPagarPedidoDetalhes />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/financeiro/contas-pagar/:pedidoId/pagamentos" 
              element={
                <ProtectedFinanceRoute>
                  <ContasAPagarPedidoPagamentos />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/fornecedores" 
              element={
                <ProtectedRoute>
                  <Fornecedores />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/fornecedores/novo"
              element={
                <ProtectedRoute>
                  <NovoFornecedor />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/clientes" 
              element={
                <ProtectedRoute>
                  <Clientes />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/clientes/novo"
              element={
                <ProtectedRoute>
                  <NovoCliente />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/produtos" 
              element={
                <ProtectedRoute>
                  <Produtos />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/produtos/novo"
              element={
                <ProtectedRoute>
                  <NovoProduto />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/estoque" 
              element={
                <ProtectedRoute>
                  <Estoque />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/transportadoras" 
              element={
                <ProtectedRoute>
                  <Transportadoras />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/centro-custos" 
              element={
                <ProtectedFinanceRoute>
                  <CentroCustos />
                </ProtectedFinanceRoute>
              } 
            />
            <Route
              path="/centro-custos/nova-despesa"
              element={
                <ProtectedFinanceRoute>
                  <NovaDespesa />
                </ProtectedFinanceRoute>
              }
            />
            <Route 
              path="/controle-roca" 
              element={
                <ProtectedRoute>
                  <ControleRoca />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <SettingsRoute>
                  <Settings />
                </SettingsRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </CentroCustosProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
