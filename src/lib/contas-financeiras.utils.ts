/**
 * Funções auxiliares para Contas a Receber e Contas a Pagar
 * Conforme GUIA_MIGRACAO_FRONTEND_PRATICO.md e GUIA_CORRECAO_CONTAS_PAGAR.md
 */

import type { FiltrosContasReceber, FiltrosContasPagar } from '@/types/contas-financeiras.types';

/**
 * Normaliza strings de parâmetros de query
 * Trata: undefined, null, strings vazias, "undefined", "null"
 * Conforme GUIA_CORRECAO_CONTAS_PAGAR.md
 */
export function normalizeString(value?: string | null): string | undefined {
  if (!value) return undefined;
  
  const trimmed = value.trim();
  
  // Tratar strings vazias, "undefined", "null"
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return undefined;
  }
  
  return trimmed;
}

/**
 * Constrói URL com filtros, evitando parâmetros vazios
 * Previne erro "Validation failed (numeric string is expected)"
 */
export function construirUrlComFiltros(
  endpoint: string,
  filtros: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();
  
  Object.entries(filtros).forEach(([key, value]) => {
    // Não adicionar parâmetros vazios, null ou undefined
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });
  
  const queryString = params.toString();
  return `${endpoint}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Formata status do pedido para exibição
 */
export function formatarStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDENTE': 'Em aberto',
    'APROVADO': 'Em aberto',
    'EM_PROCESSAMENTO': 'Em aberto',
    'CONCLUIDO': 'Concluído',
    'CANCELADO': 'Cancelado'
  };
  
  return statusMap[status] || status;
}

/**
 * Formata forma de pagamento para exibição
 */
export function formatarFormaPagamento(forma: string): string {
  const formasMap: Record<string, string> = {
    'DINHEIRO': 'Dinheiro',
    'PIX': 'PIX',
    'CARTAO_CREDITO': 'Cartão de Crédito',
    'CARTAO_DEBITO': 'Cartão de Débito',
    'BOLETO': 'Boleto',
    'TRANSFERENCIA': 'Transferência',
    'CHEQUE': 'Cheque'
  };
  
  return formasMap[forma] || forma;
}

/**
 * Constrói URL para contas a receber com filtros
 */
export function construirUrlContasReceber(
  baseUrl: string,
  filtros?: FiltrosContasReceber
): string {
  if (!filtros) return baseUrl;
  
  return construirUrlComFiltros(baseUrl, {
    codigo: filtros.codigo,
    cliente_id: filtros.cliente_id,
    cliente_nome: filtros.cliente_nome,
    valor_inicial: filtros.valor_inicial,
    valor_final: filtros.valor_final,
    forma_pagamento: filtros.forma_pagamento,
    situacao: filtros.situacao,
    data_inicial: filtros.data_inicial,
    data_final: filtros.data_final,
  });
}

/**
 * Constrói URL para contas a pagar com filtros
 */
export function construirUrlContasPagar(
  baseUrl: string,
  filtros?: FiltrosContasPagar
): string {
  if (!filtros) return baseUrl;
  
  return construirUrlComFiltros(baseUrl, {
    codigo: filtros.codigo,
    fornecedor_id: filtros.fornecedor_id,
    fornecedor_nome: filtros.fornecedor_nome,
    valor_inicial: filtros.valor_inicial,
    valor_final: filtros.valor_final,
    forma_pagamento: filtros.forma_pagamento,
    situacao: filtros.situacao,
    data_inicial: filtros.data_inicial,
    data_final: filtros.data_final,
  });
}
