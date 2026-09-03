/**
 * Tipos do módulo Controle de Roça (produtor, roça, meeiro, produto, lançamento).
 */

/** Valor de emba por unidade (R$) quando o meeiro não define outro. */
export const VALOR_DE_EMBA_PADRAO = 1.2;

/** Repasse bruto do meeiro: valor do item × % meeiro. */
export function calcRepasseBrutoMeeiro(valorItem: number, pctMeeiro: number): number {
  return Math.round(((valorItem * pctMeeiro) / 100) * 100) / 100;
}

/** Custo de embalagem da linha: quantidade × R$ emba do lançamento. */
export function calcCustoEmbalagemLinha(quantidade: number, valorDeEmba: number): number {
  return Math.round(quantidade * valorDeEmba * 100) / 100;
}

/** Desconto de embalagem do meeiro: (quantidade × R$ emba) × (% meeiro / 100). */
export function calcDescontoEmbalagemMeeiro(
  quantidade: number,
  pctMeeiro: number,
  valorDeEmba: number,
): number {
  const custoLinha = calcCustoEmbalagemLinha(quantidade, valorDeEmba);
  return Math.round(((custoLinha * pctMeeiro) / 100) * 100) / 100;
}

/** Valor líquido do meeiro: bruto − embalagem proporcional. */
export function calcValorParteMeeiroLiquido(
  valorItem: number,
  pctMeeiro: number,
  quantidade: number,
  valorDeEmba: number,
): number {
  const bruto = calcRepasseBrutoMeeiro(valorItem, pctMeeiro);
  const descontoEmba = calcDescontoEmbalagemMeeiro(quantidade, pctMeeiro, valorDeEmba);
  return Math.round((bruto - descontoEmba) * 100) / 100;
}

export interface ProdutorRoca {
  id: number;
  codigo: string;
  nome_razao: string;
  cpf_cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  inscricao_estadual?: string | null;
  ativo?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface CreateProdutorRocaDto {
  /** Se não informado, o backend gera automaticamente (ex: P001, P002). */
  codigo?: string;
  nome_razao: string;
  cpf_cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  inscricao_estadual?: string;
}

export interface UpdateProdutorRocaDto {
  codigo?: string;
  nome_razao?: string;
  cpf_cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  inscricao_estadual?: string | null;
  ativo?: boolean;
}

export interface RocaEnderecoContato {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  referencia?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface Roca extends RocaEnderecoContato {
  id: number;
  codigo: string;
  nome: string;
  localizacao?: string;
  produtorId: number;
  ativo?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
  /** Mudas plantadas (cadastro). */
  quantidadeMudasPlantadas?: number | null;
  dataPlantio?: string | null;
  dataInicioColheita?: string | null;
  /** Soma da quantidade colhida nos lançamentos ativos. */
  quantidadeColhidaTotal?: number;
  quantidadePesColhidosTotal?: number;
  /** Percentual colhido (qtd. colhida ÷ mudas plantadas), ex.: "80%". */
  percentualColhido?: string;
}

export interface CreateRocaDto extends RocaEnderecoContato {
  /** Se não informado, o backend gera automaticamente (ex: R001, R002). */
  codigo?: string;
  nome: string;
  localizacao?: string;
  produtorId: number;
  quantidadeMudasPlantadas?: number;
  dataPlantio?: string;
  dataInicioColheita?: string;
}

/** Resposta do GET /rocas/:id (detalhes com produtor) */
export interface RocaDetalhes extends Roca {
  produtorCodigo?: string;
  produtorNome?: string;
}

export interface UpdateRocaDto extends RocaEnderecoContato {
  codigo?: string | null;
  nome?: string;
  /** Envie null para limpar a localização. */
  localizacao?: string | null;
  produtorId?: number;
  /** Se false, desativa a roça (não aparece na listagem). */
  ativo?: boolean;
  quantidadeMudasPlantadas?: number | null;
  dataPlantio?: string | null;
  dataInicioColheita?: string | null;
}

export interface MeeiroRoca {
  id: number;
  codigo: string;
  nome: string;
  nomeFantasia?: string;
  cpf?: string;
  telefone?: string;
  pixChave?: string;
  endereco?: string;
  inscricaoEstadual?: string | null;
  /** Mudas plantadas (cadastro do meeiro). */
  quantidadeMudasPlantadas?: number | null;
  porcentagem_padrao: number;
  /** Valor de emba por unidade (R$) no cadastro do meeiro. */
  valor_de_emba_padrao?: number;
  valorDeEmbaPadrao?: number;
  produtorId: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

/** Campos opcionais considerados no relatório de cadastro incompleto. */
export type CampoCadastroMeeiroPendente = 'cpf' | 'telefone' | 'chavePix' | 'endereco';

export interface MeeiroCadastroIncompletoItem {
  meeiroId: number;
  codigo: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  chavePix: string | null;
  endereco: string | null;
  produtorId: number;
  produtorNome: string | null;
  camposPendentes: CampoCadastroMeeiroPendente[];
}

export interface RelatorioMeeirosCadastroIncompletoResponse {
  total: number;
  itens: MeeiroCadastroIncompletoItem[];
  page?: number;
  limit?: number;
}

export interface CreateMeeiroRocaDto {
  /** Se não informado, o backend gera automaticamente (ex: M001, M002). */
  codigo?: string;
  nome: string;
  nomeFantasia?: string;
  cpf?: string;
  telefone?: string;
  /** Chave PIX (CPF, celular, e-mail ou chave aleatória), opcional, até 140 caracteres. */
  pixChave?: string;
  endereco?: string;
  inscricaoEstadual?: string;
  quantidadeMudasPlantadas?: number;
  porcentagem_padrao: number;
  /** Se omitido, o backend usa R$ 1,20 por unidade. */
  valor_de_emba_padrao?: number;
  produtorId: number;
}

export interface UpdateMeeiroRocaDto {
  codigo?: string;
  nome?: string;
  nomeFantasia?: string;
  cpf?: string;
  telefone?: string;
  pixChave?: string;
  endereco?: string;
  inscricaoEstadual?: string | null;
  quantidadeMudasPlantadas?: number | null;
  porcentagem_padrao?: number;
  valor_de_emba_padrao?: number;
  produtorId?: number;
}

/** Status do empréstimo. */
export type EmprestimoStatus = 'ABERTO' | 'LIQUIDADO' | 'CANCELADO';

export interface EmprestimoMeeiro {
  id: number;
  meeiroId: number;
  valor: number;
  data: string;
  observacao?: string;
  status: EmprestimoStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** Resumo no detalhe do meeiro: em aberto ou já com pagamento registrado. */
export type ResumoFinanceiroMeeiro =
  | {
      jaPago: true;
      valorTotalPago: number;
      /** Total a receber (base) registrado no último pagamento. */
      valorBasePagamento: number;
      teveEmprestimoNoPagamento: boolean;
    }
  | {
      jaPago: false;
      totalReceber: number;
      totalEmprestimosAbertos: number;
      valorLiquido: number;
    };

/** Resposta de GET /meeiros/:id (detalhe com resumo e empréstimos). */
export interface MeeiroDetalhe extends MeeiroRoca {
  documento?: string;
  resumoFinanceiro?: ResumoFinanceiroMeeiro;
  emprestimos?: EmprestimoMeeiro[];
}

export interface ListaEmprestimosResponse {
  items: EmprestimoMeeiro[];
  total: number;
  page: number;
  limit: number;
}

/** Item do resumo para tela de pagamento de meeiros. */
export interface ResumoPagamentoMeeiro {
  meeiroId: number;
  nome: string;
  chavePix: string | null;
  totalReceber: number;
  /** Vale de embalagem (R$) sobre a produção remanescente (mesma base do repasse). */
  valesEmbalagem?: number;
  totalEmprestimosAbertos: number;
  /** Valor final a pagar (totalReceber - totalEmprestimosAbertos). */
  valorLiquido: number;
  /** True se o meeiro já teve pelo menos um pagamento registrado. */
  jaPago?: boolean;
  /** Soma dos valores líquidos pagos (histórico de tb_roca_pagamento_meeiro). */
  valorTotalPago?: number;
  /** Total a receber (base) do último pagamento registrado. */
  valorBasePagamento?: number | null;
  /** Se em algum pagamento havia empréstimo a descontar. */
  teveEmprestimoNoPagamento?: boolean;
  /** Desconto de empréstimo informado no último pagamento (ex.: para exibir na grade). */
  descEmprest?: number;
  /** ID do registro de pagamento mais recente (para editar via PATCH). */
  ultimoPagamentoId?: number | null;
  /** Snapshot do último pagamento em `tb_roca_pagamento_meeiro` (alinhado ao modal Editar). */
  ultimoPagamentoValesEmbalagem?: number | null;
  ultimoPagamentoTotalEmprestimosRegistro?: number | null;
  ultimoPagamentoValorAbatidoEmprestimo?: number | null;
  ultimoPagamentoValorLiquido?: number | null;
}

export interface ResumoPagamentoMeeirosResponse {
  items: ResumoPagamentoMeeiro[];
  total: number;
  page: number;
  limit: number;
  /** Contagem da aba Em aberto (mesmos filtros da lista). */
  totalEmAberto?: number;
  /** Meeiros totalmente quitados: pagamento registrado, sem empréstimo em aberto e sem produção a receber. */
  totalQuitados?: number;
}

/** Payload para registrar pagamento de meeiro. */
export interface RegistrarPagamentoMeeiroDto {
  meeiroId: number;
  formaPagamento: string;
  contaCaixa?: string;
  dataPagamento: string;
  observacao?: string;
  /** Valor digitado pelo usuário para abater dos empréstimos em aberto. */
  valorAbaterEmprestimo?: number;
  /** Desconto de empréstimo (reduz o valor líquido). */
  descEmprest?: number;
}

/** Payload para PATCH /pagamentos-meeiros/:id */
export interface AtualizarPagamentoMeeiroDto {
  dataPagamento?: string;
  formaPagamento?: string;
  contaCaixa?: string;
  observacao?: string;
  descEmprest?: number;
}

export interface RegistrarPagamentoMeeiroResponse {
  /** ID do registro em tb_roca_pagamento_meeiro (para reemitir comprovante). */
  pagamentoId: number;
  meeiroId: number;
  nome: string;
  dataPagamento: string;
  formaPagamento: string;
  contaCaixa: string | null;
  observacao: string | null;
  totalReceber: number;
  valesEmbalagem: number;
  totalEmprestimos: number;
  valorAbaterEmprestimo: number;
  totalEmprestimosAbertosApos: number;
  valorLiquido: number;
  emprestimosLiquidados: Array<{ id: number; valor: number }>;
}

/** Item de GET /pagamentos-meeiros/historico (pagamento efetivado ou relatório gerado sem pagamento). */
export interface HistoricoPagamentoMeeiroItem {
  origem?: 'pagamento' | 'relatorio_pendente';
  statusHistorico?: 'pendente' | 'concluido';
  id: number;
  meeiroId: number;
  dataPagamento: string;
  formaPagamento: string | null;
  contaCaixa: string | null;
  observacao: string | null;
  totalReceber: number | null;
  totalEmprestimos: number | null;
  valorLiquido: number | null;
  valesEmbalagem: number | null;
  valorAbatidoEmprestimo: number | null;
  descEmprest?: number | null;
  createdAt?: string;
  meeiroNome: string;
  meeiroCodigo?: string | null;
  meeiroCpf?: string | null;
  meeiroPixChave?: string | null;
  /** Produtor do meeiro (útil para registrar pendência / PDF). */
  produtorId?: number | null;
  /** Só em relatórios pendentes: período salvo ao gerar sem pagar. */
  periodoDataInicial?: string | null;
  periodoDataFinal?: string | null;
}

export interface HistoricoPagamentoMeeirosResponse {
  items: HistoricoPagamentoMeeiroItem[];
  total: number;
  page: number;
  limit: number;
  /** Distintos no período filtrado (datas + produtor; ignora filtro de meeiro na listagem). */
  resumo?: {
    /** Meeiros distintos com ao menos um pagamento no período filtrado. */
    meeirosDistintosConcluidosNoPeriodo: number;
    /** Meeiros distintos com ao menos um relatório pendente no período. */
    meeirosDistintosPendentesNoPeriodo: number;
    /** Linhas de pagamento (cada confirmação conta). */
    registrosPagamentoNoPeriodo?: number;
    /** Linhas de “gerar sem pagar” (cada PDF gera um registro). */
    registrosRelatorioPendenteNoPeriodo?: number;
  };
}

export interface RegistrarRelatorioMeeiroPendenteDto {
  meeiroId: number;
  produtorId: number;
  periodoDataInicial?: string;
  periodoDataFinal?: string;
  observacao?: string;
}

export type UnidadeMedidaRoca = 'UN' | 'KG' | 'LT' | 'CX' | 'SC' | 'ARROBA';

export interface ProdutoRoca {
  id: number;
  codigo: string;
  nome: string;
  unidade_medida: string;
  produtorId: number;
  /** ID do produto no catálogo global (módulo Produtos), quando criado via Controle de Roça. */
  produtoGlobalId?: number | null;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface CreateProdutoRocaDto {
  /** Se não informado, o sistema gera automaticamente (ex: PRD001, PRD002). */
  codigo?: string;
  nome: string;
  unidade_medida?: string;
  produtorId: number;
}

export interface LancamentoProducaoRocaMeeiroDto {
  meeiroId: number;
  porcentagem?: number;
  valor_de_emba?: number;
}

export interface LancamentoProducaoRocaProdutoDto {
  produtoId: number;
  quantidade: number;
  preco_unitario: number;
  /** Pés colhidos neste item (denominador da produtividade por pé na roça). */
  quantidadePesColhidos?: number;
  /** Porcentagem por meeiro sobre o valor deste produto (qtd × preço). */
  meeiros: LancamentoProducaoRocaMeeiroDto[];
}

export interface CreateLancamentoProducaoRocaDto {
  data: string;
  rocaId: number;
  produtos: LancamentoProducaoRocaProdutoDto[];
}

/** Item do lançamento (produto + quantidade) retornado na listagem/detalhes */
export interface LancamentoItemRoca {
  produtoId?: number;
  produto: string;
  unidade_medida?: string;
  quantidade: number;
  quantidadePesColhidos?: number | null;
  preco_unitario?: number;
  valor_total?: number;
  /** Meeiros e porcentagem/valor da parte sobre este item */
  meeiros?: LancamentoMeeiroRoca[];
}

export interface LancamentoProducaoRoca {
  id: number;
  data: string;
  produtorId: number;
  rocaId: number;
  /** Nome da roça conforme cadastro (preenchido pela API em listagem/detalhe) */
  rocaNome?: string | null;
  total_geral: number;
  ativo?: boolean;
  /** Itens do lançamento (produto, quantidade) — preenchido pela API ao listar */
  itens?: LancamentoItemRoca[];
  /** Meeiros do lançamento (nome, porcentagem, valor_parte) — preenchido pela API ao listar */
  meeiros?: LancamentoMeeiroRoca[];
}

export interface ListaLancamentosRocaResponse {
  items: LancamentoProducaoRoca[];
  total: number;
  page: number;
  limit: number;
}

export interface LancamentoMeeiroRoca {
  meeiroId: number;
  meeiroNome?: string;
  porcentagem: number;
  valor_de_emba?: number;
  valorDeEmba?: number;
  valor_parte: number;
}

/** Detalhes do lançamento (GET /lancamentos/:id) com itens e meeiros */
export interface LancamentoDetalhesRoca extends LancamentoProducaoRoca {
  meeiros?: LancamentoMeeiroRoca[];
}

export interface UpdateLancamentoProducaoRocaDto {
  data?: string;
  rocaId?: number;
  meeiros?: { meeiroId: number; porcentagem?: number }[];
  produtos?: LancamentoProducaoRocaProdutoDto[];
  ativo?: boolean;
}

export interface LinhaRelatorioMeeiro {
  data: string;
  produto: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  /** Porcentagem do meeiro sobre o valor deste item (vindo da API) */
  porcentagem?: number;
  valorDeEmba?: number;
  valor_de_emba?: number;
  /** Valor que o meeiro recebe neste item (camelCase ou valor_parte em snake_case) */
  valorParte?: number;
  valor_parte?: number;
}

export interface ResumoRelatorioMeeiro {
  valorBruto: number;
  percentualMedio: number;
  valorTotalReceber: number;
}

export interface RelatorioMeeiroResponse {
  linhas: LinhaRelatorioMeeiro[];
  resumo: ResumoRelatorioMeeiro;
}

/** Registro do Diário de roça (procedimentos / produtos utilizados). */
export interface DiarioRoca {
  id: number;
  data: string;
  rocaId: number;
  rocaCodigo?: string | null;
  rocaNome?: string | null;
  procedimento: string;
  produtosUtilizados?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDiarioRocaDto {
  data: string;
  rocaId: number;
  procedimento: string;
  produtosUtilizados?: string;
}

export interface UpdateDiarioRocaDto {
  data?: string;
  rocaId?: number;
  procedimento?: string;
  produtosUtilizados?: string | null;
}

export interface ListaDiarioRocaResponse {
  items: DiarioRoca[];
  total: number;
  page: number;
  limit: number;
}
