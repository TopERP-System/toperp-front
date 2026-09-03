import { FormSection } from '@/components/forms/FormSection';
import { ResumoCardSubmitButton, resumoHeaderClass } from '@/components/forms/ResumoCardSubmitButton';
import { ResumoScrollFollower } from '@/components/forms/ResumoScrollFollower';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatCurrency } from '@/lib/utils';
import { Cliente, clientesService } from '@/services/clientes.service';
import { controleRocaService } from '@/services/controle-roca.service';
import { useRotuloRoca } from '@/hooks/useRotuloRoca';
import { Fornecedor } from '@/services/fornecedores.service';
import { Produto, produtosService } from '@/services/produtos.service';
import { CondicaoPagamento } from '@/shared/types/condicao-pagamento.types';
import {
    CreatePedidoDto,
    FormaPagamento,
    FormaPagamentoEstrutural,
    Pedido,
    TipoPedido,
} from '@/types/pedido';
import type { Roca } from '@/types/roca';
import type { PedidoDraftFromPrevisao } from '@/types/pedido-draft-previsao';
import {
  CadastroRapidoEntidade,
  CadastroRapidoTipo,
} from '@/components/orders/cadastro-rapido/CadastroRapidoEntidade';
import { CampoSelectComCadastroRapido } from '@/components/orders/cadastro-rapido/CampoSelectComCadastroRapido';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  FileDown,
  Info,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

/** Interpreta string YYYY-MM-DD como data local (evita dia anterior em UTC). */
function parseDataLocal(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(value);
}

type FormaPagamentoOpcao =
  | 'PIX'
  | 'BOLETO'
  | 'BOLETO_DESCONTADO'
  | 'CHEQUE'
  | 'DINHEIRO'
  | 'CARTAO_DEBITO';

type FormaPagamentoLinha = {
  key: string;
  forma: FormaPagamentoOpcao | '';
  /** Vazio = sistema divide igualmente */
  valor: string;
  /** Data de vencimento desta forma (YYYY-MM-DD) */
  data_vencimento: string;
};

function novaLinhaForma(
  forma: FormaPagamentoOpcao | '' = '',
  valor = '',
  data_vencimento = '',
): FormaPagamentoLinha {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    forma,
    valor,
    data_vencimento,
  };
}

/** Evita reset do form quando order vira undefined ao fechar após salvar (edição). */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

interface OrderFormProps {
  layout?: 'dialog' | 'page';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePedidoDto) => void;
  order?: Pedido | null;
  isPending?: boolean;
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  produtos: Produto[];
  transportadoras: Array<{ id: number; nome: string }>;
  /** Pré-preenche o formulário ao gerar pedido a partir de uma previsão de receita. */
  draftFromPrevisao?: PedidoDraftFromPrevisao | null;
}

interface OrderItemForm {
  produto_id: number;
  quantidade: number | '';
  preco_unitario: number | '';
  desconto: number | '';
  estoque_disponivel?: number; // Preenchido ao selecionar produto para exibir e validar
  nome_produto?: string; // Nome do produto para exibir no resumo (preenchido ao selecionar)
}

export function OrderForm({
  layout = 'dialog',
  isOpen,
  onClose,
  onSubmit,
  order,
  isPending = false,
  clientes,
  fornecedores,
  produtos,
  transportadoras,
  draftFromPrevisao = null,
}: OrderFormProps) {
  const rotulo = useRotuloRoca();
  const queryClient = useQueryClient();
  const formActive = layout === 'page' || isOpen;
  const [clientesLista, setClientesLista] = useState(clientes);
  const [fornecedoresLista, setFornecedoresLista] = useState(fornecedores);
  const [produtosLista, setProdutosLista] = useState(produtos);
  const [transportadorasLista, setTransportadorasLista] = useState(transportadoras);
  const [cadastroRapidoAtivo, setCadastroRapidoAtivo] = useState<{
    tipo: CadastroRapidoTipo;
    produtoIndex?: number;
  } | null>(null);

  useEffect(() => {
    setClientesLista(clientes);
  }, [clientes]);
  useEffect(() => {
    setFornecedoresLista(fornecedores);
  }, [fornecedores]);
  useEffect(() => {
    setProdutosLista(produtos);
  }, [produtos]);
  useEffect(() => {
    setTransportadorasLista(transportadoras);
  }, [transportadoras]);
  const [tipo, setTipo] = useState<TipoPedido>('VENDA');
  const [clienteId, setClienteId] = useState<number | undefined>(undefined);
  const [fornecedorId, setFornecedorId] = useState<number | undefined>(undefined);
  const [transportadoraId, setTransportadoraId] = useState<number | undefined>(undefined);
  const [rocaId, setRocaId] = useState<number | undefined>(undefined);
  const [dataPedido, setDataPedido] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const minDataVencimento = useMemo(() => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const hoje = parseDataLocal(hojeStr);
    hoje.setHours(0, 0, 0, 0);
    const pedido = parseDataLocal(dataPedido);
    pedido.setHours(0, 0, 0, 0);
    return pedido.getTime() < hoje.getTime() ? dataPedido : hojeStr;
  }, [dataPedido]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | undefined>(undefined);
  const [formaPagamentoEstrutural, setFormaPagamentoEstrutural] = useState<FormaPagamentoEstrutural | undefined>(undefined);
  /** Forma de pagamento exibida no dropdown: Pix, Boleto, Boleto Descontado, Cheque, Dinheiro, Cartão de Débito */
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<
    FormaPagamentoOpcao | undefined
  >(undefined);
  /** Uma ou mais formas; valores vazios = divisão igual do total */
  const [formasPagamentoLinhas, setFormasPagamentoLinhas] = useState<FormaPagamentoLinha[]>([
    novaLinhaForma(),
  ]);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number | ''>('');
  const [queroParcelarDinheiroPix, setQueroParcelarDinheiroPix] = useState(false);
  const [condicaoPagamento, setCondicaoPagamento] = useState<string>('');
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);
  const [condicaoPagamentoId, setCondicaoPagamentoId] = useState<number | string>('');
  const [dataVencimento, setDataVencimento] = useState<string>('');

  // Pedido retroativo: alinhar vencimento à data do pedido (evita financeiro com data de hoje)
  useEffect(() => {
    if (order) return;
    const hojeStr = new Date().toISOString().split('T')[0];
    const hoje = parseDataLocal(hojeStr);
    hoje.setHours(0, 0, 0, 0);
    const pedido = parseDataLocal(dataPedido);
    pedido.setHours(0, 0, 0, 0);
    if (pedido.getTime() >= hoje.getTime()) return;

    setDataVencimento((atual) => {
      if (!atual?.trim()) return dataPedido;
      const venc = parseDataLocal(atual);
      venc.setHours(0, 0, 0, 0);
      return venc.getTime() >= hoje.getTime() ? dataPedido : atual;
    });
  }, [dataPedido, order]);

  // Campos para Boleto Descontado (sem parcelas: apenas valor adiantado)
  const [valorAdiantado, setValorAdiantado] = useState<number | ''>('');
  const [taxaDesconto, setTaxaDesconto] = useState<number | ''>('');
  const [taxaDescontoPercentual, setTaxaDescontoPercentual] = useState<boolean>(true);
  const [dataAntecipacao, setDataAntecipacao] = useState<string>('');
  const [instituicaoFinanceira, setInstituicaoFinanceira] = useState<string>('');
  const [prazoEntregaDias, setPrazoEntregaDias] = useState<number | undefined>(undefined);
  const [frete, setFrete] = useState<number | ''>('');
  const [outrasTaxas, setOutrasTaxas] = useState<number | ''>('');
  const [observacoesInternas, setObservacoesInternas] = useState<string>('');
  const [observacoesCliente, setObservacoesCliente] = useState<string>('');
  const [itens, setItens] = useState<OrderItemForm[]>([
    { produto_id: 0, quantidade: '', preco_unitario: '', desconto: '' },
  ]);

  // Busca dentro do dropdown de produtos no formulário do pedido.
  // (Um único estado serve porque o usuário normalmente abre apenas um seletor por vez.)
  const [produtoSearch, setProdutoSearch] = useState('');

  const itensSectionRef = useRef<HTMLDivElement>(null);
  const addItemButtonRef = useRef<HTMLDivElement>(null);

  // Buscar dados do cliente para pedido (GET /clientes/:id/dados-pedido) conforme guia
  const { data: dadosClientePedido, refetch: refetchDadosPedido, isLoading: isLoadingDadosPedido } = useQuery({
    queryKey: ['clientes', clienteId, 'dados-pedido'],
    queryFn: () => clientesService.buscarDadosParaPedido(clienteId!),
    enabled: !!clienteId && tipo === 'VENDA' && formActive,
  });

  const { data: limiteCredito } = useQuery({
    queryKey: ['clientes', clienteId, 'limite-credito'],
    queryFn: () => clientesService.buscarLimiteCredito(clienteId!),
    enabled: !!clienteId && tipo === 'VENDA' && formActive,
  });

  const { data: rocasData } = useQuery({
    queryKey: ['pedidos', 'rocas-ativas'],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    enabled: formActive,
    retry: false,
  });
  const rocasLista: Roca[] = Array.isArray(rocasData)
    ? rocasData
    : (rocasData as { rocas?: Roca[] })?.rocas ?? [];

  // Conforme GUIA_PRODUTOS_PEDIDO_COMPRA.md: vínculo fornecedor no produto é apenas informativo.
  // Mostrar TODOS os produtos no pedido de compra - NÃO filtrar pelo fornecedor selecionado.
  const produtosParaExibir = produtosLista;

  const produtoSelectDesabilitado = tipo === 'COMPRA' && !fornecedorId;
  const produtoSelectPlaceholder =
    tipo === 'COMPRA' && !fornecedorId
      ? 'Selecione o fornecedor primeiro'
      : 'Selecione um produto';

  const produtosOrdenados = [...produtosParaExibir].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }),
  );
  const termoProduto = produtoSearch.trim().toLowerCase();
  const produtosFiltrados = termoProduto
    ? produtosOrdenados.filter((p) => {
        const nome = (p.nome || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return nome.includes(termoProduto) || sku.includes(termoProduto);
      })
    : produtosOrdenados;

  // Preencher condicoesPagamento e aplicar condição padrão ao selecionar cliente
  useEffect(() => {
    if (!dadosClientePedido || tipo !== 'VENDA' || !clienteId) return;
    const { condicoes_pagamento, condicao_pagamento_padrao } = dadosClientePedido;
    setCondicoesPagamento(condicoes_pagamento || []);
    if (order) {
      // Edição: buscar condição que corresponda ao pedido
      const match = (condicoes_pagamento || []).find(
        (c: CondicaoPagamento) => c.descricao === order.condicao_pagamento
      );
      if (match) setCondicaoPagamentoId(match.id?.toString() ?? match.descricao ?? '');
    } else if (condicoes_pagamento && condicoes_pagamento.length > 0) {
      // Novo pedido: aplicar condição padrão automaticamente
      const condicao = condicao_pagamento_padrao ?? (condicoes_pagamento.length === 1 ? condicoes_pagamento[0] : null);
      if (condicao) {
        aplicarCondicao(condicao);
      }
    }
  }, [dadosClientePedido, tipo, clienteId, order]);

  // Dialog para escolher condição quando há múltiplas e nenhuma padrão
  const [dialogEscolherCondicaoOpen, setDialogEscolherCondicaoOpen] = useState(false);
  const [condicoesParaEscolha, setCondicoesParaEscolha] = useState<CondicaoPagamento[]>([]);

  const aplicarCondicao = (cond: CondicaoPagamento) => {
    setCondicaoPagamentoId(cond.id?.toString() ?? cond.descricao ?? '');
    setFormaPagamento(cond.forma_pagamento as FormaPagamento);
    setCondicaoPagamento(cond.descricao || '');
    setPrazoEntregaDias(cond.prazo_dias ?? undefined);

    // Forma de pagamento exibida no dropdown (deve ser definida para aparecer corretamente)
    const formasNoSelect = ['PIX', 'BOLETO', 'BOLETO_DESCONTADO', 'CHEQUE', 'DINHEIRO', 'CARTAO_DEBITO'];
    const formaParaSelect = formasNoSelect.includes(cond.forma_pagamento)
      ? (cond.forma_pagamento as 'PIX' | 'BOLETO' | 'BOLETO_DESCONTADO' | 'CHEQUE' | 'DINHEIRO' | 'CARTAO_DEBITO')
      : cond.forma_pagamento === 'CARTAO_CREDITO'
        ? 'CARTAO_DEBITO' // Fallback: Cartão Crédito não está no select, usar Débito
        : cond.forma_pagamento === 'TRANSFERENCIA'
          ? 'PIX' // Fallback: Transferência mapeia para PIX
          : undefined;
    setFormaPagamentoSelecionada(formaParaSelect);
    setFormasPagamentoLinhas([
      novaLinhaForma(formaParaSelect || '', '', dataVencimento || dataPedido),
    ]);

    // Forma estrutural: à vista para condições não parceladas
    if (!cond.parcelado || (cond.forma_pagamento !== 'CARTAO_CREDITO' && cond.forma_pagamento !== 'DINHEIRO' && cond.forma_pagamento !== 'PIX')) {
      setFormaPagamentoEstrutural('AVISTA');
      setQueroParcelarDinheiroPix(false);
    }

    if (cond.parcelado && cond.forma_pagamento === 'CARTAO_CREDITO' && cond.numero_parcelas) {
      setFormaPagamentoEstrutural('PARCELADO');
      setQuantidadeParcelas(Math.min(12, Math.max(1, cond.numero_parcelas)));
    } else if (cond.forma_pagamento === 'DINHEIRO' || cond.forma_pagamento === 'PIX') {
      const numPar = cond.numero_parcelas ? Math.min(12, Math.max(1, cond.numero_parcelas)) : 0;
      setQueroParcelarDinheiroPix(numPar > 1);
      setQuantidadeParcelas(numPar > 1 ? numPar : '');
      setFormaPagamentoEstrutural(numPar > 1 ? 'PARCELADO' : 'AVISTA');
    } else if (cond.forma_pagamento !== 'CARTAO_CREDITO') {
      setQuantidadeParcelas('');
    }
  };

  const handleImportarDoCliente = async () => {
    if (!clienteId || tipo !== 'VENDA') return;
    const { data } = await refetchDadosPedido();
    const dados = data ?? dadosClientePedido;
    if (!dados) {
      toast.error('Erro ao carregar dados do cliente');
      return;
    }
    const { condicoes_pagamento, condicao_pagamento_padrao } = dados;
    setCondicoesPagamento(condicoes_pagamento || []);
    if (!condicoes_pagamento || condicoes_pagamento.length === 0) {
      toast.error('Este cliente não possui condições de pagamento cadastradas.');
      return;
    }
    const condicao = condicao_pagamento_padrao ?? (condicoes_pagamento.length === 1 ? condicoes_pagamento[0] : null);
    if (condicao) {
      aplicarCondicao(condicao);
      setDialogEscolherCondicaoOpen(false);
      toast.success('Condição de pagamento importada do cliente.');
    } else {
      setCondicoesParaEscolha(condicoes_pagamento);
      setDialogEscolherCondicaoOpen(true);
    }
  };

  // Limpar condições quando cliente for desmarcado
  useEffect(() => {
    if (!clienteId && tipo === 'VENDA') {
      setCondicoesPagamento([]);
      setCondicaoPagamentoId('');
    }
  }, [clienteId, tipo]);

  const prevIsOpen = usePrevious(isOpen);
  // Só preencher o form a partir do `order` quando abrimos o dialog para este pedido (ou trocamos de pedido).
  // Evita que, após erro ao salvar, um refetch do mesmo pedido sobrescreva as alterações (ex.: "Quero parcelar" desmarcando).
  const lastSyncedOrderIdRef = useRef<number | null>(null);
  const lastSyncedDraftKeyRef = useRef<string | null>(null);

  // Função para resetar o formulário completamente
  const resetForm = () => {
    setTipo('VENDA');
    setClienteId(undefined);
    setFornecedorId(undefined);
    setTransportadoraId(undefined);
    setRocaId(undefined);
    setDataPedido(new Date().toISOString().split('T')[0]);
    setFormaPagamento(undefined);
    setFormaPagamentoEstrutural(undefined);
    setFormaPagamentoSelecionada(undefined);
    setFormasPagamentoLinhas([novaLinhaForma()]);
    setQuantidadeParcelas('');
    setQueroParcelarDinheiroPix(false);
    setCondicaoPagamento('');
    setCondicoesPagamento([]);
    setCondicaoPagamentoId('');
    setDataVencimento('');
    setValorAdiantado('');
    setTaxaDesconto('');
    setTaxaDescontoPercentual(true);
    setDataAntecipacao('');
    setInstituicaoFinanceira('');
    setPrazoEntregaDias(undefined);
    setFrete('');
    setOutrasTaxas('');
    setObservacoesInternas('');
    setObservacoesCliente('');
    setItens([{ produto_id: 0, quantidade: '', preco_unitario: '', desconto: '' }]);
  };

  useEffect(() => {
    if (!isOpen) {
      lastSyncedOrderIdRef.current = null;
      lastSyncedDraftKeyRef.current = null;
      // Limpar formulário quando fechar o modal E não houver pedido sendo editado
      if (!order) {
        resetForm();
      }
      return;
    }
    if (order && isOpen) {
      const orderId = order.id;
      const isNewOrderSession = lastSyncedOrderIdRef.current !== orderId;
      if (isNewOrderSession) {
        lastSyncedOrderIdRef.current = orderId;
        setTipo(order.tipo);
        setClienteId(order.cliente_id);
        setFornecedorId(order.fornecedor_id);
        setTransportadoraId(order.transportadora_id);
        const rocaPedido = order.roca_id ?? (order as { rocaId?: number }).rocaId;
        setRocaId(rocaPedido != null && rocaPedido > 0 ? Number(rocaPedido) : undefined);

        const dataPedidoOnly = order.data_pedido.split('T')[0].split(' ')[0];
        const dataVencimentoOnly = order.data_vencimento_base?.split('T')[0].split(' ')[0] || '';

        setDataPedido(dataPedidoOnly);
        setFormaPagamento(order.forma_pagamento);
        const formaEstruturalOrder = (order as any).forma_pagamento_estrutural;
        const formaSelecionada =
          formaEstruturalOrder === 'BOLETO_DESCONTADO'
            ? 'BOLETO_DESCONTADO'
            : (order.forma_pagamento as 'PIX' | 'BOLETO' | 'CHEQUE' | 'DINHEIRO' | 'CARTAO_DEBITO' | undefined);
        const formasOrder = order.formas_pagamento;
        if (formasOrder && formasOrder.length > 0) {
          setFormasPagamentoLinhas(
            formasOrder.map((fp) => {
              const formaUi =
                fp.forma_pagamento === 'BOLETO' &&
                formaEstruturalOrder === 'BOLETO_DESCONTADO'
                  ? 'BOLETO_DESCONTADO'
                  : (fp.forma_pagamento as FormaPagamentoOpcao);
              return novaLinhaForma(
                formaUi || '',
                fp.valor != null && fp.valor > 0 ? String(fp.valor) : '',
                fp.data_vencimento?.split('T')[0]?.split(' ')[0] ||
                  dataVencimentoOnly,
              );
            }),
          );
          const primeira = formasOrder[0];
          const formaSel =
            primeira.forma_pagamento === 'BOLETO' &&
            formaEstruturalOrder === 'BOLETO_DESCONTADO'
              ? 'BOLETO_DESCONTADO'
              : (primeira.forma_pagamento as FormaPagamentoOpcao);
          if (
            formaSel &&
            ['PIX', 'BOLETO', 'BOLETO_DESCONTADO', 'CHEQUE', 'DINHEIRO', 'CARTAO_DEBITO'].includes(
              formaSel,
            )
          ) {
            setFormaPagamentoSelecionada(formaSel);
          }
        } else if (
          formaSelecionada &&
          ['PIX', 'BOLETO', 'BOLETO_DESCONTADO', 'CHEQUE', 'DINHEIRO', 'CARTAO_DEBITO'].includes(
            formaSelecionada,
          )
        ) {
          setFormaPagamentoSelecionada(formaSelecionada);
          setFormasPagamentoLinhas([
            novaLinhaForma(formaSelecionada, '', dataVencimentoOnly),
          ]);
        } else {
          setFormasPagamentoLinhas([novaLinhaForma()]);
        }
        setFormaPagamentoEstrutural(formaEstruturalOrder === 'BOLETO_DESCONTADO' ? 'BOLETO_DESCONTADO' : formaEstruturalOrder || 'AVISTA');
        // Guia: derivar de condicao_pagamento quando quantidade_parcelas não vier no GET (nunca abrir sempre "à vista")
        const condicao = (order.condicao_pagamento || '').trim();
        const qtdParBackend = order.quantidade_parcelas ?? null;
        let qtdPar: number | '' = qtdParBackend ?? '';
        if (qtdPar === '' && condicao && !/vista/i.test(condicao)) {
          const match = condicao.match(/^(\d{1,2})x$/i);
          if (match) qtdPar = Math.min(12, Math.max(1, parseInt(match[1], 10) || 1));
        }
        setQuantidadeParcelas(qtdPar);
        const valorAdiantadoBackend = (order as any).valor_adiantado;
        if (formaEstruturalOrder === 'BOLETO_DESCONTADO' && valorAdiantadoBackend != null) {
          setValorAdiantado(Number(valorAdiantadoBackend));
        } else {
          setValorAdiantado('');
        }
        const forma = order.forma_pagamento;
        const formasComCheckbox = ['DINHEIRO', 'PIX', 'BOLETO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'TRANSFERENCIA', 'CHEQUE'];
        const parcelado = typeof qtdPar === 'number' && qtdPar >= 2 && qtdPar <= 12;
        setQueroParcelarDinheiroPix(!!forma && formasComCheckbox.includes(forma) && parcelado);
        setCondicaoPagamento(order.condicao_pagamento || '');
        setDataVencimento(dataVencimentoOnly);
        setPrazoEntregaDias(order.prazo_entrega_dias);
        setFrete(order.frete || '');
        setOutrasTaxas(order.outras_taxas || '');
        setObservacoesInternas(order.observacoes_internas || '');
        setObservacoesCliente(order.observacoes_cliente || '');

        if (order.itens && order.itens.length > 0) {
          setItens(
            order.itens.map((item) => {
              const produtoItem = produtosLista.find((p) => p.id === item.produto_id);
              const estoque =
                produtoItem
                  ? ((produtoItem as any).estoque_disponivel ?? produtoItem.estoque_atual)
                  : undefined;
              const nomeProduto = (item as { produto?: { nome?: string } }).produto?.nome ?? produtoItem?.nome;
              return {
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                desconto: item.desconto || '',
                estoque_disponivel: estoque,
                nome_produto: nomeProduto,
              };
            })
          );
        }
      }
    } else if (!order && !draftFromPrevisao && prevIsOpen === false) {
      // Reset completo quando abrir modal para criar novo pedido
      resetForm();
    }
  }, [order, isOpen, prevIsOpen, draftFromPrevisao]);

  useEffect(() => {
    if (!isOpen || order || !draftFromPrevisao) return;
    if (lastSyncedDraftKeyRef.current === draftFromPrevisao.draftKey) return;
    lastSyncedDraftKeyRef.current = draftFromPrevisao.draftKey;
    resetForm();
    setTipo('VENDA');
    if (draftFromPrevisao.cliente_id) {
      setClienteId(draftFromPrevisao.cliente_id);
    }
    if (draftFromPrevisao.roca_id) {
      setRocaId(draftFromPrevisao.roca_id);
    }
    const dataPrev = draftFromPrevisao.data_prevista?.split('T')[0]?.split(' ')[0];
    const hoje = new Date().toISOString().split('T')[0];
    if (dataPrev) {
      setDataPedido(dataPrev);
      setDataVencimento(dataPrev);
    } else {
      setDataPedido(hoje);
    }
    const fp = draftFromPrevisao.forma_pagamento;
    if (fp) {
      setFormaPagamento(fp);
      const formasUi = ['PIX', 'BOLETO', 'CHEQUE', 'DINHEIRO', 'CARTAO_DEBITO'] as const;
      if (formasUi.includes(fp as (typeof formasUi)[number])) {
        setFormaPagamentoSelecionada(fp as (typeof formasUi)[number]);
        setFormasPagamentoLinhas([novaLinhaForma(fp as FormaPagamentoOpcao, '', dataPrev || '')]);
      }
      setFormaPagamentoEstrutural('AVISTA');
    }
    const obs = [draftFromPrevisao.descricao, draftFromPrevisao.observacoes]
      .filter((v) => v != null && String(v).trim() !== '')
      .join(' — ');
    if (obs) {
      setObservacoesInternas(obs);
    }
    const valorPrevisto = Number(draftFromPrevisao.valor ?? 0);
    if (Number.isFinite(valorPrevisto) && valorPrevisto > 0) {
      setItens([
        {
          produto_id: 0,
          quantidade: 1,
          preco_unitario: Number(valorPrevisto.toFixed(2)),
          desconto: '',
        },
      ]);
    }
  }, [isOpen, order, draftFromPrevisao]);

  const handleAddItem = () => {
    const hadTwoOrMore = itens.length >= 2;
    setItens([...itens, { produto_id: 0, quantidade: '', preco_unitario: '', desconto: '' }]);
    if (hadTwoOrMore) {
      setTimeout(() => {
        addItemButtonRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }, 80);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = async (index: number, field: keyof OrderItemForm, value: any) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };

    // Ao selecionar produto, chamar GET /produtos/:id e preencher preço + estoque + nome
    if (field === 'produto_id' && value && value !== 0) {
      try {
        const produto = await produtosService.buscarPorId(Number(value));
        const preco =
          produto.preco_promocional && produto.preco_promocional > 0
            ? produto.preco_promocional
            : produto.preco_venda ?? 0;
        const estoque = (produto as any).estoque_disponivel ?? produto.estoque_atual ?? 0;
        newItens[index] = {
          ...newItens[index],
          preco_unitario: preco,
          quantidade: newItens[index].quantidade || 1,
          estoque_disponivel: estoque,
          nome_produto: produto.nome ?? newItens[index].nome_produto,
        };
      } catch {
        // Em caso de erro, manter seleção; usuário pode digitar preço manualmente
        newItens[index].estoque_disponivel = undefined;
      }
    } else if (field === 'produto_id' && (!value || value === 0)) {
      // Ao limpar produto, remover estoque e nome
      newItens[index].estoque_disponivel = undefined;
      newItens[index].nome_produto = undefined;
    }

    setItens([...newItens]);
  };

  const handleCadastroCriado = async (result: {
    tipo: CadastroRapidoTipo;
    id: number;
    label: string;
    produto?: Produto;
    cliente?: Cliente;
    fornecedor?: Fornecedor;
    transportadora?: { id: number; nome: string };
  }) => {
    if (result.tipo === 'cliente' && result.cliente) {
      setClientesLista((prev) =>
        prev.some((c) => c.id === result.id) ? prev : [...prev, result.cliente!],
      );
      setClienteId(result.id);
      void queryClient.invalidateQueries({ queryKey: ['clientes'] });
    } else if (result.tipo === 'fornecedor' && result.fornecedor) {
      setFornecedoresLista((prev) =>
        prev.some((f) => f.id === result.id) ? prev : [...prev, result.fornecedor!],
      );
      setFornecedorId(result.id);
      void queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    } else if (result.tipo === 'transportadora' && result.transportadora) {
      setTransportadorasLista((prev) =>
        prev.some((t) => t.id === result.id)
          ? prev
          : [...prev, { id: result.transportadora!.id, nome: result.transportadora!.nome }],
      );
      setTransportadoraId(result.id);
      void queryClient.invalidateQueries({ queryKey: ['transportadoras'] });
    } else if (result.tipo === 'produto' && result.produto) {
      setProdutosLista((prev) =>
        prev.some((p) => p.id === result.id) ? prev : [...prev, result.produto!],
      );
      const idx = cadastroRapidoAtivo?.produtoIndex;
      if (idx !== undefined) {
        await handleItemChange(idx, 'produto_id', result.id);
      }
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
    setCadastroRapidoAtivo(null);
  };

  const valorTotalPedido =
    itens.reduce((acc, item) => {
      const quantidade = typeof item.quantidade === 'number' ? item.quantidade : 0;
      const precoUnitario = typeof item.preco_unitario === 'number' ? item.preco_unitario : 0;
      const desconto = typeof item.desconto === 'number' ? item.desconto : 0;
      return acc + quantidade * precoUnitario - desconto;
    }, 0) +
    (typeof frete === 'number' ? frete : 0) +
    (typeof outrasTaxas === 'number' ? outrasTaxas : 0);

  const subtotalItens = itens.reduce((acc, item) => {
    const quantidade = typeof item.quantidade === 'number' ? item.quantidade : 0;
    const precoUnitario = typeof item.preco_unitario === 'number' ? item.preco_unitario : 0;
    const desconto = typeof item.desconto === 'number' ? item.desconto : 0;
    return acc + quantidade * precoUnitario - desconto;
  }, 0);

  const itensValidos = itens.filter((i) => i.produto_id && i.produto_id !== 0);

  const nomeExibicaoParceiro = (pessoa?: {
    nome?: string | null;
    nome_fantasia?: string | null;
    nome_razao?: string | null;
  }) =>
    [pessoa?.nome_fantasia, pessoa?.nome_razao, pessoa?.nome]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .find(Boolean) || '';

  const clienteSelecionado = clientesLista.find(
    (c) => Number(c.id) === Number(clienteId),
  );
  const fornecedorSelecionado = fornecedoresLista.find(
    (f) => Number(f.id) === Number(fornecedorId),
  );

  // Em VENDA = cliente; em COMPRA = fornecedor
  const parceiroNome =
    tipo === 'VENDA'
      ? nomeExibicaoParceiro(clienteSelecionado) ||
        (typeof dadosClientePedido?.cliente?.nome === 'string'
          ? dadosClientePedido.cliente.nome.trim()
          : '')
      : nomeExibicaoParceiro(fornecedorSelecionado);

  const inputClass = 'h-11 rounded-xl';

  const qtdParcelasNum = quantidadeParcelas === '' ? 1 : quantidadeParcelas;
  const valorPorParcela =
    formaPagamento && qtdParcelasNum >= 1
      ? valorTotalPedido / qtdParcelasNum
      : 0;

  const multiFormas = formasPagamentoLinhas.length > 1;

  /** Preview dos valores por linha (manual ou divisão igual) */
  const valoresFormasPreview = useMemo(() => {
    const total = Number(valorTotalPedido.toFixed(2));
    const n = formasPagamentoLinhas.length;
    if (n === 0) return [] as number[];
    const parsed = formasPagamentoLinhas.map((l) => {
      const raw = l.valor.trim().replace(',', '.');
      if (!raw) return null;
      const v = Number(raw);
      return Number.isFinite(v) && v > 0 ? v : null;
    });
    const semValor = parsed.filter((v) => v == null).length;
    if (semValor === n) {
      const base = Math.floor((total * 100) / n) / 100;
      const vals = Array.from({ length: n }, () => base);
      const somaBase = Number((base * n).toFixed(2));
      vals[n - 1] = Number((total - (somaBase - base)).toFixed(2));
      return vals;
    }
    if (semValor === 0) {
      return parsed.map((v) => Number((v as number).toFixed(2)));
    }
    const somaInf = Number(
      parsed.reduce((a, v) => a + (v ?? 0), 0).toFixed(2),
    );
    const restante = Math.max(0, Number((total - somaInf).toFixed(2)));
    const base =
      semValor > 0 ? Math.floor((restante * 100) / semValor) / 100 : 0;
    let idxVazio = 0;
    return parsed.map((v) => {
      if (v != null) return Number(v.toFixed(2));
      idxVazio += 1;
      if (idxVazio === semValor) {
        return Number((restante - base * (semValor - 1)).toFixed(2));
      }
      return base;
    });
  }, [formasPagamentoLinhas, valorTotalPedido]);

  const somaFormasPreview = useMemo(
    () =>
      Number(
        valoresFormasPreview.reduce((a, v) => a + v, 0).toFixed(2),
      ),
    [valoresFormasPreview],
  );

  const aplicarFormaNaLinha = (index: number, forma: FormaPagamentoOpcao) => {
    const formaEfetiva: FormaPagamentoOpcao =
      multiFormas && forma === 'BOLETO_DESCONTADO' ? 'BOLETO' : forma;

    setFormasPagamentoLinhas((prev) => {
      const next = [...prev];
      const dataPadrao =
        next[index]?.data_vencimento?.trim() ||
        prev[0]?.data_vencimento?.trim() ||
        dataVencimento ||
        dataPedido;
      next[index] = {
        ...next[index],
        forma: formaEfetiva,
        data_vencimento: next[index].data_vencimento?.trim()
          ? next[index].data_vencimento
          : dataPadrao,
      };
      return next;
    });

    if (index === 0) {
      setFormaPagamentoSelecionada(formaEfetiva);
      if (formaEfetiva === 'BOLETO_DESCONTADO') {
        setFormaPagamentoEstrutural('BOLETO_DESCONTADO');
        setFormaPagamento('BOLETO');
        setQuantidadeParcelas('');
        setQueroParcelarDinheiroPix(false);
        setValorAdiantado('');
      } else {
        setFormaPagamentoEstrutural('AVISTA');
        setFormaPagamento(formaEfetiva);
        setQuantidadeParcelas(1);
        setQueroParcelarDinheiroPix(false);
        setValorAdiantado('');
        setTaxaDesconto('');
        setDataAntecipacao('');
        setInstituicaoFinanceira('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Se não existir cadastro para o tipo de pedido, avisar o usuário e evitar envio vazio.
    // (Para edição, mantemos a lógica atual, pois o pedido pode vir com IDs já preenchidos.)
    if (!order) {
      if (tipo === 'VENDA' && clientesLista.length === 0) {
        toast.error('Nenhum cliente cadastrado. Cadastre um cliente para criar uma venda.');
        return;
      }
      if (tipo === 'COMPRA' && fornecedoresLista.length === 0) {
        toast.error('Nenhum fornecedor cadastrado. Cadastre um fornecedor para criar uma compra.');
        return;
      }
    }

    // Validação: forma de pagamento é obrigatória
    const linhasValidas = formasPagamentoLinhas.filter((l) => l.forma);
    if (linhasValidas.length === 0) {
      toast.error('Selecione ao menos uma Forma de Pagamento.');
      return;
    }
    if (linhasValidas.some((l) => !l.forma)) {
      toast.error('Preencha a forma de pagamento em todas as linhas.');
      return;
    }

    if (multiFormas) {
      const soma = somaFormasPreview;
      const total = Number(valorTotalPedido.toFixed(2));
      const todosManuais = formasPagamentoLinhas.every((l) => l.valor.trim() !== '');
      if (todosManuais && Math.abs(soma - total) > 0.01) {
        toast.error(
          `A soma das formas (R$ ${soma.toFixed(2)}) deve ser igual ao total do pedido (R$ ${total.toFixed(2)}).`,
        );
        return;
      }
    }

    const usaDataPorLinha =
      formaPagamentoEstrutural !== 'BOLETO_DESCONTADO' &&
      (multiFormas || formaPagamentoEstrutural === 'AVISTA');

    // Validação: data de vencimento
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataPedidoDate = parseDataLocal(dataPedido);
    dataPedidoDate.setHours(0, 0, 0, 0);
    const pedidoRetrospectivo = dataPedidoDate.getTime() < hoje.getTime();
    const limiteMinimoVencimento = pedidoRetrospectivo ? dataPedidoDate : hoje;

    const validarDataVencimento = (dataStr: string, contexto: string): boolean => {
      if (!dataStr?.trim()) {
        toast.error(contexto);
        return false;
      }
      const dataVencimentoDate = parseDataLocal(dataStr);
      dataVencimentoDate.setHours(0, 0, 0, 0);
      if (dataVencimentoDate.getTime() < limiteMinimoVencimento.getTime()) {
        toast.error(
          pedidoRetrospectivo
            ? 'A data de vencimento não pode ser anterior à data do pedido.'
            : 'A data de vencimento não pode ser anterior ao dia atual.',
        );
        return false;
      }
      return true;
    };

    if (usaDataPorLinha) {
      for (const l of linhasValidas) {
        if (!validarDataVencimento(l.data_vencimento, 'Informe a data de vencimento para cada forma de pagamento.')) {
          return;
        }
      }
    } else if (formaPagamentoEstrutural !== 'BOLETO_DESCONTADO') {
      if (!validarDataVencimento(dataVencimento, 'Informe a Data de Vencimento inicial.')) {
        return;
      }
    }

    // Validação de limite de crédito do cliente (conforme guia)
    if (tipo === 'VENDA' && clienteId && limiteCredito) {
      const valorDoPedido = valorTotalPedido;
      const valorEmAbertoDoCliente = limiteCredito.valorUtilizado || 0;
      const limite = limiteCredito.limiteCredito || 0;

      if (limite > 0 && (valorEmAbertoDoCliente + valorDoPedido) > limite) {
        toast.error('Limite de compra excedido');
        return;
      }
    }

    if (formaPagamentoEstrutural === 'PARCELADO') {
      if (!dataVencimento?.trim()) {
        toast.error('Informe a Data do Primeiro Vencimento para pedido parcelado.');
        return;
      }
      if (qtdParcelasNum < 2 || qtdParcelasNum > 12) {
        toast.error('Número de parcelas deve estar entre 2 e 12.');
        return;
      }
    }

    if (formaPagamentoEstrutural === 'BOLETO_DESCONTADO') {
      const valorAdiantadoNum = valorAdiantado !== '' && valorAdiantado != null ? Number(valorAdiantado) : 0;
      if (valorAdiantadoNum <= 0) {
        toast.error('Boleto Descontado exige Valor adiantado maior que zero.');
        return;
      }
      if (valorAdiantadoNum >= valorTotalPedido) {
        toast.error('Valor adiantado deve ser menor que o valor total do pedido.');
        return;
      }
    }

    const itensFormatados = itens
      .filter(item => item.produto_id && item.produto_id !== 0)
      .map(item => ({
        produto_id: Number(item.produto_id),
        quantidade: Number(item.quantidade) || 0,
        preco_unitario: Number(item.preco_unitario) || 0,
        ...(item.desconto ? { desconto: Number(item.desconto) } : {}),
      }));
    
    // Determinar quantidade_parcelas: só para AVISTA (1) e PARCELADO (2-12). BOLETO_DESCONTADO não usa parcelas.
    let quantidadeParcelasPayload: number | undefined = 1;
    if (formaPagamentoEstrutural === 'AVISTA') {
      quantidadeParcelasPayload = 1;
    } else if (formaPagamentoEstrutural === 'PARCELADO') {
      quantidadeParcelasPayload = qtdParcelasNum >= 2 && qtdParcelasNum <= 12 ? qtdParcelasNum : 2;
    } else if (formaPagamentoEstrutural === 'BOLETO_DESCONTADO') {
      quantidadeParcelasPayload = undefined;
    }

    // Determinar forma_pagamento e forma_pagamento_estrutural a partir da seleção (Pix, Boleto, etc.)
    let formaEstrutural: FormaPagamentoEstrutural | undefined = formaPagamentoEstrutural;
    let formaPagamentoPayload: FormaPagamento | undefined = formaPagamento;
    const primeiraForma = (linhasValidas[0]?.forma || formaPagamentoSelecionada) as
      | FormaPagamentoOpcao
      | undefined;

    if (multiFormas) {
      formaEstrutural = 'AVISTA';
      formaPagamentoPayload =
        primeiraForma === 'BOLETO_DESCONTADO' ? 'BOLETO' : (primeiraForma as FormaPagamento);
    } else if (primeiraForma === 'BOLETO_DESCONTADO') {
      formaEstrutural = 'BOLETO_DESCONTADO';
      formaPagamentoPayload = 'BOLETO';
    } else if (primeiraForma) {
      formaEstrutural = formaEstrutural === 'PARCELADO' ? 'PARCELADO' : 'AVISTA';
      formaPagamentoPayload = primeiraForma as FormaPagamento;
    }
    if (!formaEstrutural) {
      if (qtdParcelasNum === 1) formaEstrutural = 'AVISTA';
      else if (qtdParcelasNum >= 2) formaEstrutural = 'PARCELADO';
    }

    const dataVencBase =
      usaDataPorLinha
        ? linhasValidas[0]?.data_vencimento || dataVencimento || dataPedido
        : dataVencimento ||
          (formaEstrutural === 'BOLETO_DESCONTADO' ? dataPedido : undefined) ||
          undefined;

    const formasPagamentoPayload = linhasValidas.map((l, i) => {
      const formaApi: FormaPagamento =
        l.forma === 'BOLETO_DESCONTADO' ? 'BOLETO' : (l.forma as FormaPagamento);
      const dataVencLinha =
        l.data_vencimento?.trim() ||
        (formaEstrutural === 'PARCELADO' ? dataVencimento : undefined) ||
        (formaEstrutural === 'BOLETO_DESCONTADO' ? dataPedido : undefined) ||
        dataVencBase;
      return {
        forma_pagamento: formaApi,
        valor: valoresFormasPreview[i] ?? 0,
        ...(dataVencLinha ? { data_vencimento: dataVencLinha } : {}),
      };
    });

    const pedidoData: CreatePedidoDto = {
      tipo,
      data_pedido: dataPedido,
      cliente_id: tipo === 'VENDA' ? clienteId : undefined,
      fornecedor_id: tipo === 'COMPRA' ? fornecedorId : undefined,
      transportadora_id: transportadoraId,
      roca_id: rocaId,
      forma_pagamento: formaPagamentoPayload ?? formaPagamento,
      forma_pagamento_estrutural: formaEstrutural,
      formas_pagamento: formasPagamentoPayload,
      data_vencimento: dataVencBase,
      data_vencimento_base: dataVencBase,
      condicao_pagamento:
        formaEstrutural === 'BOLETO_DESCONTADO'
          ? 'Boleto descontado'
          : multiFormas
            ? `Múltiplas formas (${linhasValidas.length})`
            : (quantidadeParcelasPayload && quantidadeParcelasPayload >= 2
                ? (condicaoPagamento || `${quantidadeParcelasPayload}x`)
                : (condicaoPagamento || 'À vista')),
      ...(quantidadeParcelasPayload !== undefined && !multiFormas
        ? { quantidade_parcelas: quantidadeParcelasPayload }
        : multiFormas
          ? { quantidade_parcelas: 1 }
          : {}),
      // Boleto descontado: valor_adiantado obrigatório; sem parcelas
      valor_adiantado:
        !multiFormas &&
        formaEstrutural === 'BOLETO_DESCONTADO' &&
        valorAdiantado !== '' &&
        valorAdiantado != null
          ? Number(valorAdiantado)
          : undefined,
      taxa_desconto:
        !multiFormas && formaEstrutural === 'BOLETO_DESCONTADO' && taxaDesconto
          ? Number(taxaDesconto)
          : undefined,
      taxa_desconto_percentual:
        !multiFormas && formaEstrutural === 'BOLETO_DESCONTADO'
          ? taxaDescontoPercentual
          : undefined,
      data_antecipacao:
        !multiFormas && formaEstrutural === 'BOLETO_DESCONTADO' && dataAntecipacao
          ? dataAntecipacao
          : undefined,
      instituicao_financeira:
        !multiFormas &&
        formaEstrutural === 'BOLETO_DESCONTADO' &&
        instituicaoFinanceira
          ? instituicaoFinanceira
          : undefined,
      prazo_entrega_dias: prazoEntregaDias,
      frete: typeof frete === 'number' ? frete : (frete ? Number(frete) : undefined),
      outras_taxas: typeof outrasTaxas === 'number' ? outrasTaxas : (outrasTaxas ? Number(outrasTaxas) : undefined),
      observacoes_internas: observacoesInternas || undefined,
      observacoes_cliente: observacoesCliente || undefined,
      itens: itensFormatados,
    };

    // Log detalhado do payload sendo enviado
    if (import.meta.env.DEV) {
      console.log('📤 [OrderForm] Payload completo sendo enviado:', {
        tipo: pedidoData.tipo,
        cliente_id: pedidoData.cliente_id,
        fornecedor_id: pedidoData.fornecedor_id,
        data_pedido: pedidoData.data_pedido,
        forma_pagamento: pedidoData.forma_pagamento,
        forma_pagamento_estrutural: pedidoData.forma_pagamento_estrutural,
        quantidade_parcelas: pedidoData.quantidade_parcelas,
        data_vencimento_base: pedidoData.data_vencimento_base,
        condicao_pagamento: pedidoData.condicao_pagamento,
        taxa_desconto: pedidoData.taxa_desconto,
        taxa_desconto_percentual: pedidoData.taxa_desconto_percentual,
        data_antecipacao: pedidoData.data_antecipacao,
        instituicao_financeira: pedidoData.instituicao_financeira,
        frete: pedidoData.frete,
        outras_taxas: pedidoData.outras_taxas,
        total_itens: pedidoData.itens.length,
        itens: pedidoData.itens,
        payload_completo: pedidoData,
        payload_json: JSON.stringify(pedidoData, null, 2),
      });
    }

    onSubmit(pedidoData);
  };

  if (layout === 'page' && !formActive) return null;

  const formInner = (
    <form
      id={layout === 'page' ? 'order-form-page' : undefined}
      onSubmit={handleSubmit}
      className={cn('space-y-6', layout === 'dialog' && 'space-y-8 pt-6')}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['VENDA', 'COMPRA'] as TipoPedido[]).map((tipoOption) => (
          <button
            key={tipoOption}
            type="button"
            onClick={() => setTipo(tipoOption)}
            className={cn(
              'group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
              tipo === tipoOption
                ? tipoOption === 'VENDA'
                  ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                  : 'border-blue-500/60 bg-blue-500/10 shadow-sm'
                : 'border-border/60 bg-card hover:border-primary/30',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                tipo === tipoOption
                  ? tipoOption === 'VENDA'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-500 text-white'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/15',
              )}
            >
              {tipoOption === 'VENDA' ? (
                <ShoppingCart className="h-5 w-5" />
              ) : (
                <Package className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{tipoOption}</p>
              <p className="text-xs text-muted-foreground">
                {tipoOption === 'VENDA' ? 'Saída de mercadorias' : 'Entrada de insumos'}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="min-w-0 flex-1 space-y-6 pb-8">
          <FormSection
            icon={ShoppingCart}
            title="Informações básicas"
            description={`Cliente ou fornecedor, ${rotulo.singularLower} e data do pedido.`}
          >
            <div className="space-y-4">
              {tipo === 'VENDA' ? (
                <CampoSelectComCadastroRapido
                  label="Cliente"
                  cadastroRapidoTipo="cliente"
                  cadastroRapidoAberto={cadastroRapidoAtivo?.tipo === 'cliente'}
                  onToggleCadastroRapido={() =>
                    setCadastroRapidoAtivo((prev) =>
                      prev?.tipo === 'cliente' ? null : { tipo: 'cliente' },
                    )
                  }
                  onCloseCadastroRapido={() => setCadastroRapidoAtivo(null)}
                  onCadastroCriado={handleCadastroCriado}
                >
                  <Select
                    value={clienteId?.toString() || ''}
                    onValueChange={(value) => setClienteId(Number(value))}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesLista.length === 0 ? (
                        <div className="py-4 px-2 text-sm text-destructive text-center">
                          Nenhum cliente cadastrado
                        </div>
                      ) : (
                        clientesLista.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id.toString()}>
                            {nomeExibicaoParceiro(cliente) || `Cliente #${cliente.id}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {clientesLista.length === 0 && (
                    <Alert className="mt-3 border-destructive/50 bg-destructive/5">
                      <AlertDescription>
                        Para criar um pedido de <b>VENDA</b>, é necessário cadastrar um cliente.
                      </AlertDescription>
                    </Alert>
                  )}
                  {clienteId && (limiteCredito || dadosClientePedido?.cliente?.limite_credito != null) && (
                    <Alert className="mt-3">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {limiteCredito ? (
                          <>
                            Limite de crédito: {formatCurrency(limiteCredito.limiteCredito)}.
                            Valor já utilizado: {formatCurrency(limiteCredito.valorUtilizado)}.
                            Disponível: {formatCurrency(limiteCredito.valorDisponivel)}
                            {limiteCredito.ultrapassouLimite && (
                              <span className="block mt-1 font-medium text-destructive">
                                Limite excedido.
                              </span>
                            )}
                          </>
                        ) : (
                          <>Limite de crédito do cliente: {formatCurrency(dadosClientePedido!.cliente.limite_credito ?? 0)}</>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </CampoSelectComCadastroRapido>
              ) : (
                <CampoSelectComCadastroRapido
                  label="Fornecedor"
                  cadastroRapidoTipo="fornecedor"
                  cadastroRapidoAberto={cadastroRapidoAtivo?.tipo === 'fornecedor'}
                  onToggleCadastroRapido={() =>
                    setCadastroRapidoAtivo((prev) =>
                      prev?.tipo === 'fornecedor' ? null : { tipo: 'fornecedor' },
                    )
                  }
                  onCloseCadastroRapido={() => setCadastroRapidoAtivo(null)}
                  onCadastroCriado={handleCadastroCriado}
                >
                  <Select
                    value={fornecedorId?.toString() || ''}
                    onValueChange={(value) => setFornecedorId(Number(value))}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedoresLista.length === 0 ? (
                        <div className="py-4 px-2 text-sm text-destructive text-center">
                          Nenhum fornecedor cadastrado
                        </div>
                      ) : (
                        fornecedoresLista.map((fornecedor) => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>
                            {fornecedor.nome_fantasia || fornecedor.nome_razao}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {fornecedoresLista.length === 0 && (
                    <Alert className="mt-3 border-destructive/50 bg-destructive/5">
                      <AlertDescription>
                        Para criar um pedido de <b>COMPRA</b>, é necessário cadastrar um fornecedor.
                      </AlertDescription>
                    </Alert>
                  )}
                </CampoSelectComCadastroRapido>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{rotulo.singular} (opcional)</Label>
                  <Select
                    value={rocaId != null ? String(rocaId) : 'none'}
                    onValueChange={(value) =>
                      setRocaId(value && value !== 'none' ? Number(value) : undefined)
                    }
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder={rotulo.selecione} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {rocasLista
                        .filter((r) => r.ativo !== false)
                        .map((roca) => (
                          <SelectItem key={roca.id} value={String(roca.id)}>
                            {roca.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data do Pedido</Label>
                  <Input
                    type="date"
                    className={inputClass}
                    value={dataPedido}
                    onChange={(e) => setDataPedido(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection
            icon={Package}
            title="Itens do pedido"
            description="Produtos, quantidades e preços de compra."
            action={
              <Button type="button" onClick={handleAddItem} variant="outline" size="sm" className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar item
              </Button>
            }
          >
          <div ref={itensSectionRef} className="space-y-4">
            <div className="space-y-4">
              {itens.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border/60 p-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12 xl:items-start xl:gap-4">
                    <div className="space-y-2 sm:col-span-2 xl:col-span-4">
                      <Label>Produto</Label>
                      <div className="flex gap-2">
                        <Select
                          value={item.produto_id && item.produto_id !== 0 ? item.produto_id.toString() : ''}
                          onValueChange={(value) => handleItemChange(index, 'produto_id', Number(value))}
                          disabled={produtoSelectDesabilitado}
                        >
                          <SelectTrigger className="h-10 min-w-0 flex-1">
                            <SelectValue placeholder={produtoSelectPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-2">
                              <Input
                                placeholder="Buscar produto..."
                                value={produtoSearch}
                                onChange={(e) => setProdutoSearch(e.target.value)}
                                onPointerDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            {produtosParaExibir.length === 0 ? (
                              <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                                Nenhum produto cadastrado
                              </div>
                            ) : produtosFiltrados.length === 0 ? (
                              <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                                Nenhum produto encontrado
                              </div>
                            ) : (
                              produtosFiltrados.map((produto) => (
                                <SelectItem key={produto.id} value={produto.id.toString()}>
                                  {produto.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-lg"
                          title="Cadastro rápido de produto"
                          onClick={() =>
                            setCadastroRapidoAtivo((prev) =>
                              prev?.tipo === 'produto' && prev.produtoIndex === index
                                ? null
                                : { tipo: 'produto', produtoIndex: index },
                            )
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {cadastroRapidoAtivo?.tipo === 'produto' &&
                        cadastroRapidoAtivo.produtoIndex === index && (
                          <CadastroRapidoEntidade
                            tipo="produto"
                            onClose={() => setCadastroRapidoAtivo(null)}
                            onCreated={handleCadastroCriado}
                          />
                        )}
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className={cn(
                          'h-10',
                          (() => {
                            if (tipo !== 'VENDA' || !item.produto_id) return false;
                            const produtoItem = produtosLista.find((p) => p.id === item.produto_id);
                            const estoque =
                              item.estoque_disponivel ??
                              (produtoItem
                                ? ((produtoItem as any).estoque_disponivel ?? produtoItem.estoque_atual)
                                : undefined);
                            const qtd = Number(item.quantidade) || 0;
                            return estoque !== undefined && qtd > estoque;
                          })() && 'border-destructive',
                        )}
                        value={item.quantidade}
                        onChange={(e) =>
                          handleItemChange(index, 'quantidade', e.target.value ? Number(e.target.value) : '')
                        }
                      />
                      {item.produto_id ? (
                        (() => {
                          const produtoItem = produtosLista.find((p) => p.id === item.produto_id);
                          const estoqueDisponivel =
                            item.estoque_disponivel ??
                            (produtoItem
                              ? ((produtoItem as any).estoque_disponivel ?? produtoItem.estoque_atual)
                              : undefined);
                          const qtd = Number(item.quantidade) || 0;
                          const excedeEstoque =
                            tipo === 'VENDA' &&
                            estoqueDisponivel !== undefined &&
                            qtd > estoqueDisponivel;
                          return (
                            <div className="flex min-h-[1.25rem] flex-col gap-0.5">
                              <p className="text-xs text-muted-foreground">
                                Estoque:{' '}
                                <span className="font-medium text-foreground">
                                  {estoqueDisponivel ?? '—'}
                                </span>
                              </p>
                              {excedeEstoque ? (
                                <p className="text-xs font-medium text-destructive">
                                  Acima do estoque
                                </p>
                              ) : null}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="min-h-[1.25rem]" aria-hidden />
                      )}
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                      <Label>Preço de Compra</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-10"
                        value={item.preco_unitario}
                        onChange={(e) =>
                          handleItemChange(index, 'preco_unitario', e.target.value ? Number(e.target.value) : '')
                        }
                      />
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                      <Label>Desconto</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-10"
                        value={item.desconto}
                        onChange={(e) =>
                          handleItemChange(index, 'desconto', e.target.value ? Number(e.target.value) : '')
                        }
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2 xl:col-span-2">
                      <Label>Subtotal</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 min-w-0 flex-1 items-center text-sm font-medium text-primary">
                          {formatCurrency(
                            Math.max(
                              0,
                              (typeof item.quantidade === 'number' ? item.quantidade : 0) *
                                (typeof item.preco_unitario === 'number' ? item.preco_unitario : 0) -
                                (typeof item.desconto === 'number' ? item.desconto : 0),
                            ),
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => handleRemoveItem(index)}
                          disabled={itens.length === 1}
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {itens.length > 2 && (
                <div ref={addItemButtonRef} className="pt-2">
                  <Button type="button" onClick={handleAddItem} variant="outline" size="sm" className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar item
                  </Button>
                </div>
              )}
            </div>
          </div>
          </FormSection>

          <FormSection
            icon={CreditCard}
            title="Pagamento e entrega"
            description="Forma de pagamento, transportadora, frete e prazos."
          >
            <div className="space-y-6">
              {/* Formas de pagamento (1 ou mais — split do total) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Formas de Pagamento *</Label>
                  {tipo === 'VENDA' && clienteId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleImportarDoCliente}
                      disabled={isLoadingDadosPedido}
                      className="shrink-0"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Importar condição de pagamento
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {formasPagamentoLinhas.map((linha, index) => {
                    const exibirDataLinha =
                      !!linha.forma &&
                      linha.forma !== 'BOLETO_DESCONTADO' &&
                      (multiFormas || formaPagamentoEstrutural === 'AVISTA');
                    return (
                    <div
                      key={linha.key}
                      className={cn(
                        'grid grid-cols-1 gap-2 items-end',
                        exibirDataLinha
                          ? 'sm:grid-cols-[1fr_120px_150px_auto]'
                          : 'sm:grid-cols-[1fr_140px_auto]',
                      )}
                    >
                      <div className="space-y-1.5">
                        {index === 0 && (
                          <Label className="text-xs text-muted-foreground">Forma</Label>
                        )}
                        <Select
                          value={linha.forma || ''}
                          onValueChange={(value) =>
                            aplicarFormaNaLinha(index, value as FormaPagamentoOpcao)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a forma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PIX">Pix</SelectItem>
                            <SelectItem value="BOLETO">Boleto</SelectItem>
                            {tipo === 'VENDA' && !multiFormas && (
                              <SelectItem value="BOLETO_DESCONTADO">
                                Boleto Descontado
                              </SelectItem>
                            )}
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                            <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                            <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        {index === 0 && (
                          <Label className="text-xs text-muted-foreground">
                            Valor (opcional)
                          </Label>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={
                            valoresFormasPreview[index] != null
                              ? valoresFormasPreview[index].toFixed(2)
                              : 'Auto'
                          }
                          value={linha.valor}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormasPagamentoLinhas((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], valor: v };
                              return next;
                            });
                          }}
                        />
                      </div>
                      {exibirDataLinha && (
                        <div className="space-y-1.5">
                          {index === 0 && (
                            <Label className="text-xs text-muted-foreground">
                              Vencimento *
                            </Label>
                          )}
                          <Input
                            type="date"
                            value={linha.data_vencimento}
                            min={minDataVencimento}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormasPagamentoLinhas((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], data_vencimento: v };
                                return next;
                              });
                              if (index === 0 && !multiFormas) {
                                setDataVencimento(v);
                              }
                            }}
                            required
                          />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        disabled={formasPagamentoLinhas.length <= 1}
                        onClick={() => {
                          setFormasPagamentoLinhas((prev) => {
                            const next = prev.filter((_, i) => i !== index);
                            if (index === 0 && next[0]?.forma) {
                              const f = next[0].forma as FormaPagamentoOpcao;
                              setFormaPagamentoSelecionada(f);
                              if (f === 'BOLETO_DESCONTADO') {
                                setFormaPagamentoEstrutural('BOLETO_DESCONTADO');
                                setFormaPagamento('BOLETO');
                              } else {
                                setFormaPagamentoEstrutural('AVISTA');
                                setFormaPagamento(f);
                              }
                            }
                            return next.length ? next : [novaLinhaForma()];
                          });
                        }}
                        title="Remover forma"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setFormasPagamentoLinhas((prev) => {
                        const next = [...prev];
                        // Multi: boleto descontado vira boleto na 1ª linha
                        if (next[0]?.forma === 'BOLETO_DESCONTADO') {
                          next[0] = { ...next[0], forma: 'BOLETO' };
                          setFormaPagamentoSelecionada('BOLETO');
                          setFormaPagamento('BOLETO');
                          setFormaPagamentoEstrutural('AVISTA');
                          setValorAdiantado('');
                        }
                        next.push(
                          novaLinhaForma(
                            '',
                            '',
                            prev[0]?.data_vencimento || dataVencimento || dataPedido,
                          ),
                        );
                        return next;
                      });
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar forma de pagamento
                  </Button>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>
                      Total pedido:{' '}
                      <span className="font-medium text-foreground">
                        {formatCurrency(valorTotalPedido)}
                      </span>
                    </div>
                    <div>
                      Soma formas:{' '}
                      <span className="font-medium text-foreground">
                        {formatCurrency(somaFormasPreview)}
                      </span>
                      {formasPagamentoLinhas.every((l) => !l.valor.trim()) &&
                        formasPagamentoLinhas.length > 1 && (
                          <span> (divisão igual)</span>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parcelado: data do 1º vencimento (global) */}
              {!multiFormas && formaPagamentoEstrutural === 'PARCELADO' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número de Parcelas *</Label>
                      <Input
                        type="number"
                        min={2}
                        max={12}
                        value={quantidadeParcelas === '' ? '' : quantidadeParcelas}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setQuantidadeParcelas('');
                            return;
                          }
                          const v = Math.min(12, Math.max(2, parseInt(raw, 10) || 2));
                          setQuantidadeParcelas(v);
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data do Primeiro Vencimento *</Label>
                      <Input
                        type="date"
                        value={dataVencimento}
                        onChange={(e) => setDataVencimento(e.target.value)}
                        min={minDataVencimento}
                        required
                      />
                    </div>
                  </div>
                  {/* Preview das parcelas */}
                  {qtdParcelasNum >= 2 && dataVencimento && (
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <Label className="text-sm font-semibold">Preview das Parcelas:</Label>
                      {Array.from({ length: qtdParcelasNum }).map((_, idx) => {
                        const dataVenc = new Date(dataVencimento);
                        dataVenc.setMonth(dataVenc.getMonth() + idx);
                        return (
                          <div key={idx} className="text-sm">
                            Parcela {idx + 1} — Vencimento: {dataVenc.toLocaleDateString('pt-BR')} — Valor: {formatCurrency(valorPorParcela)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!multiFormas && formaPagamentoEstrutural === 'BOLETO_DESCONTADO' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor adiantado *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorAdiantado === '' ? '' : valorAdiantado}
                        onChange={(e) => setValorAdiantado(e.target.value ? Number(e.target.value) : '')}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Antecipação</Label>
                      <Input
                        type="date"
                        value={dataAntecipacao}
                        onChange={(e) => setDataAntecipacao(e.target.value)}
                        min={minDataVencimento}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Instituição Financeira (opcional)</Label>
                    <Input
                      type="text"
                      value={instituicaoFinanceira}
                      onChange={(e) => setInstituicaoFinanceira(e.target.value)}
                      maxLength={200}
                      placeholder="Nome da instituição financeira"
                    />
                  </div>
                </div>
              )}

              {(() => {
                const deveExibirCondicaoETransportadora =
                  tipo === 'COMPRA' || !!formaPagamento;

                if (!deveExibirCondicaoETransportadora) return null;

                return (
              <>
              <div className="grid grid-cols-3 gap-4">
                <CampoSelectComCadastroRapido
                  label="Transportadora"
                  cadastroRapidoTipo="transportadora"
                  cadastroRapidoAberto={cadastroRapidoAtivo?.tipo === 'transportadora'}
                  onToggleCadastroRapido={() =>
                    setCadastroRapidoAtivo((prev) =>
                      prev?.tipo === 'transportadora' ? null : { tipo: 'transportadora' },
                    )
                  }
                  onCloseCadastroRapido={() => setCadastroRapidoAtivo(null)}
                  onCadastroCriado={handleCadastroCriado}
                >
                  <Select
                    value={transportadoraId?.toString() || ''}
                    onValueChange={(value) => setTransportadoraId(Number(value))}
                    disabled={transportadorasLista.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          transportadorasLista.length === 0
                            ? 'Não há transportadora cadastrada'
                            : 'Selecione uma transportadora'
                        }
                      />
                    </SelectTrigger>
                    {transportadorasLista.length > 0 && (
                      <SelectContent>
                        {transportadorasLista.map((transportadora) => (
                          <SelectItem key={transportadora.id} value={transportadora.id.toString()}>
                            {transportadora.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    )}
                  </Select>
                </CampoSelectComCadastroRapido>

                <div className="space-y-2">
                  <Label>Prazo de Entrega (dias)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={prazoEntregaDias || ''}
                    onChange={(e) => setPrazoEntregaDias(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frete</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={frete}
                    onChange={(e) => setFrete(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Outras Taxas</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={outrasTaxas}
                  onChange={(e) => setOutrasTaxas(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              </>
                );
              })()}
            </div>
          </FormSection>

          <FormSection
            icon={Info}
            title="Observações"
            description="Informações internas ou mensagens para o cliente."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Observações internas</Label>
                <Textarea
                  value={observacoesInternas}
                  onChange={(e) => setObservacoesInternas(e.target.value)}
                  rows={3}
                  className="min-h-[100px] resize-y rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações do cliente</Label>
                <Textarea
                  value={observacoesCliente}
                  onChange={(e) => setObservacoesCliente(e.target.value)}
                  rows={3}
                  className="min-h-[100px] resize-y rounded-xl"
                />
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="w-full shrink-0 lg:w-[280px] lg:self-stretch xl:w-[320px]">
          <ResumoScrollFollower>
            <Card className="overflow-hidden border-border/60 shadow-md transition-shadow duration-300 hover:shadow-lg">
              <div
                className={cn(
                  'px-5 py-4 text-white',
                  tipo === 'VENDA' ? resumoHeaderClass(true) : 'bg-gradient-to-br from-blue-600 to-blue-700',
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Resumo</p>
                <p className="mt-1 text-lg font-semibold">
                  {tipo === 'VENDA' ? 'Venda' : 'Compra'}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  {formatCurrency(valorTotalPedido)}
                </p>
              </div>
              <CardContent className="space-y-3 p-5 pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">
                      {tipo === 'VENDA' ? 'Cliente' : 'Fornecedor'}
                    </span>
                    <span className="max-w-[55%] truncate text-right font-medium">
                      {parceiroNome || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Itens</span>
                    <span className="font-medium">{itensValidos.length}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotalItens)}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="font-medium">
                      {formatCurrency(typeof frete === 'number' ? frete : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-muted-foreground shrink-0">Pagamento</span>
                    <div className="max-w-[65%] text-right font-medium space-y-0.5">
                      {formasPagamentoLinhas.some((l) => l.forma) ? (
                        formasPagamentoLinhas
                          .map((l, i) => ({ l, i }))
                          .filter(({ l }) => l.forma)
                          .map(({ l, i }) => (
                            <div key={l.key} className="text-sm leading-snug">
                              {l.forma}
                              <span className="text-muted-foreground font-normal">
                                {' '}
                                · {formatCurrency(valoresFormasPreview[i] ?? 0)}
                                {l.data_vencimento ? (
                                  <>
                                    {' '}
                                    · venc.{' '}
                                    {parseDataLocal(l.data_vencimento).toLocaleDateString('pt-BR')}
                                  </>
                                ) : null}
                              </span>
                            </div>
                          ))
                      ) : (
                        <span>—</span>
                      )}
                      {!multiFormas &&
                        formaPagamentoEstrutural === 'PARCELADO' &&
                        qtdParcelasNum >= 2 && (
                          <div className="text-xs text-muted-foreground font-normal">
                            {qtdParcelasNum}x de {formatCurrency(valorPorParcela)}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
                <ResumoCardSubmitButton
                  label={order ? (layout === 'dialog' ? 'Atualizar Pedido' : 'Salvar Pedido') : 'Criar Pedido'}
                  pendingLabel={order ? (layout === 'dialog' ? 'Atualizando...' : 'Salvando...') : 'Criando...'}
                  isPending={isPending}
                />
              </CardContent>
            </Card>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Campos marcados com * são obrigatórios. Revise os itens antes de salvar.
            </p>
          </ResumoScrollFollower>
        </aside>
      </div>
    </form>
  );

  const condicaoDialog = (
    <Dialog open={dialogEscolherCondicaoOpen} onOpenChange={setDialogEscolherCondicaoOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escolher condição de pagamento</DialogTitle>
          <DialogDescription>
            Este cliente possui mais de uma condição cadastrada. Selecione a que deseja usar no pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {condicoesParaEscolha.map((cond, idx) => (
            <Button
              key={cond.id ?? cond.descricao ?? `cond-${idx}`}
              type="button"
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => {
                aplicarCondicao(cond);
                setDialogEscolherCondicaoOpen(false);
                toast.success('Condição de pagamento importada do cliente.');
              }}
            >
              <span className="font-medium">{cond.descricao || '—'}</span>
              {cond.forma_pagamento && (
                <span className="text-muted-foreground ml-2">({cond.forma_pagamento})</span>
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (layout === 'page') {
    return (
      <>
        {formInner}
        {condicaoDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[90rem] overflow-y-auto sm:w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {order ? 'Editar Pedido' : 'Novo Pedido'}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {order
                ? 'Atualize as informações do pedido no sistema'
                : 'Preencha os dados para criar um novo pedido'}
            </DialogDescription>
          </DialogHeader>
          {formInner}
        </DialogContent>
      </Dialog>
      {condicaoDialog}
    </>
  );
}

export default OrderForm;
