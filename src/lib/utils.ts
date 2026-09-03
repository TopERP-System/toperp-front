import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ordenação natural de códigos (RO01, RO02, … RO10 — não RO10 antes de RO01). */
export function compareCodigoNatural(
  a?: string | null,
  b?: string | null,
): number {
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
}

/** Ordena roças por código (numérico) e depois pelo nome. */
export function compareRocaPorCodigo(
  a: { codigo?: string | null; nome?: string | null },
  b: { codigo?: string | null; nome?: string | null },
): number {
  const byCodigo = compareCodigoNatural(a.codigo, b.codigo);
  if (byCodigo !== 0) return byCodigo;
  return String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Data local em YYYY-MM-DD (evita deslocar o dia com `toISOString()` em fusos UTC−). */
export function formatISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Extrai numero_parcela a partir da string p.numero (ex: "1/10", "10/10", "2026/10").
 * O backend espera numero_parcela 1..N. O formato "2026/10" (ano/parcela) deve retornar 10.
 */
export function parseNumeroParcela(
  numeroStr: string,
  totalParcelas: number,
  fallbackIdx: number
): number {
  const s = String(numeroStr || '');
  const slashMatch = s.match(/^(\d+)\/(\d+)$/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10);
    const b = parseInt(slashMatch[2], 10);
    // "2026/10" -> a=2026 (ano), b=10 (parcela) -> usar b
    if (a >= 1000 && a <= 2100 && b >= 1 && b <= totalParcelas) {
      return b;
    }
    // "1/10" ou "10/10" -> usar primeiro número
    return a;
  }
  const simple = s.match(/(\d+)/);
  return simple ? parseInt(simple[1], 10) : fallbackIdx;
}

/**
 * Converte a parte calendário (YYYY-MM-DD) em `Date` no fuso local,
 * evitando o deslocamento de um dia causado por `new Date('YYYY-MM-DD')` (interpretado como UTC).
 */
export function parseDateOnlyLocal(
  date: string | null | undefined,
): Date | null {
  if (date == null || date === "") return null;
  const m = String(date).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: string | Date): string {
  if (date === null || date === undefined) return '';
  let d: Date;
  if (typeof date === 'string') {
    // Strings YYYY-MM-DD são interpretadas como UTC à meia-noite e exibem dia anterior em fusos como BR. Tratar como data local.
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, day] = match;
      d = new Date(Number(y), Number(m) - 1, Number(day));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Data e hora (pt-BR), ex.: histórico com instante de registro. */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (date == null || date === '') return '';
  let d: Date;
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})([^\dT]|$)/);
    if (match && !date.includes('T') && !date.includes(':')) {
      const [, y, m, day] = match;
      d = new Date(Number(y), Number(m) - 1, Number(day));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Formata data para formato brasileiro (DD/MM/YYYY)
 * Alias para formatDate para manter compatibilidade
 */
export function formatarDataBR(date: string | Date): string {
  return formatDate(date);
}

/**
 * Formata status operacional do pedido para exibição.
 * Backend: ABERTO | ATENDIDO | CANCELADO (legado PARCIAL/QUITADO → Atendido).
 */
export function formatarStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ABERTO: 'Aberto',
    ATENDIDO: 'Atendido',
    PARCIAL: 'Atendido',
    QUITADO: 'Atendido',
    VENCIDO: 'Vencido',
    CANCELADO: 'Cancelado',
  };
  return statusMap[status] ?? status;
}

/**
 * Formata forma de pagamento para exibição
 * Conforme GUIA_MIGRACAO_FRONTEND_PRATICO.md
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
 * Normaliza valores monetários recebidos do backend
 * Converte valores que podem estar em centavos para reais
 * 
 * @param value - Valor a ser normalizado (pode ser number, string, null, undefined)
 * @param converterCentavos - Se true, tenta converter valores em centavos para reais
 * @returns Valor normalizado em reais (number)
 */
export function normalizeCurrency(
  value: number | string | null | undefined,
  converterCentavos: boolean = true
): number {
  // Tratar valores nulos ou vazios
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // Converter para número
  let numero: number;
  
  if (typeof value === 'number') {
    numero = value;
  } else if (typeof value === 'string') {
    // Remover formatação (pontos, vírgulas, espaços, etc.)
    const cleaned = value.replace(/[^\d.,-]/g, '');
    // Converter vírgula para ponto (formato brasileiro)
    const normalized = cleaned.replace(',', '.');
    numero = parseFloat(normalized);
    
    if (isNaN(numero)) {
      return 0;
    }
  } else {
    return 0;
  }

  // Se deve converter centavos e o valor parece estar em centavos
  // IMPORTANTE: A conversão só deve acontecer se tivermos certeza de que é centavos
  // Critérios mais restritivos para evitar conversão incorreta de valores já em reais:
  // 1. Deve ser um inteiro >= 1000 (valores muito pequenos podem ser reais)
  // 2. Não deve ter decimais (Number.isInteger)
  // 3. Ao dividir por 100, deve resultar em um valor razoável entre 1 e 999999
  // 4. O valor original deve ser muito maior que valores típicos em reais (>= 1000)
  // Isso evita converter incorretamente valores como 303 (reais) para centavos
  if (converterCentavos && numero >= 1000 && numero < 100000000 && Number.isInteger(numero)) {
    // Verificar se dividir por 100 resulta em valor razoável
    // Valores muito pequenos em reais (menos de 10 reais) não devem ser convertidos
    const valorEmReais = numero / 100;
    if (valorEmReais >= 1 && valorEmReais < 1000000) {
      numero = valorEmReais;
      if (import.meta.env.DEV) {
        console.log(`[normalizeCurrency] Valor convertido de centavos para reais: ${value} -> ${numero.toFixed(2)}`);
      }
    }
  }

  // Garantir 2 casas decimais
  return parseFloat(numero.toFixed(2));
}

/**
 * Normaliza valores de quantidade (pode ter decimais)
 * Não converte centavos, apenas normaliza o formato
 * 
 * @param value - Valor a ser normalizado (pode ser number, string, null, undefined)
 * @returns Valor normalizado (number)
 */
export function normalizeQuantity(
  value: number | string | null | undefined
): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  let numero: number;
  
  if (typeof value === 'number') {
    // Se já é um número, garantir que não seja NaN ou Infinity
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }
    numero = value;
  } else if (typeof value === 'string') {
    // Remover espaços e caracteres especiais, exceto dígitos, ponto, vírgula e sinal negativo
    const cleaned = value.trim().replace(/[^\d.,-]/g, '');
    
    // Se a string estiver vazia após limpeza, retornar 0
    if (!cleaned || cleaned === '' || cleaned === '-') {
      return 0;
    }
    
    // Converter vírgula para ponto (formato brasileiro)
    const normalized = cleaned.replace(',', '.');
    numero = parseFloat(normalized);
    
    if (isNaN(numero) || !isFinite(numero)) {
      return 0;
    }
  } else {
    return 0;
  }

  // Garantir que o número não seja negativo (quantidade não pode ser negativa)
  return Math.max(0, numero);
}

/**
 * Normaliza o status de uma parcela para garantir que seja válido
 * Conforme guia: status PENDENTE não existe mais, deve ser normalizado para ABERTA
 * 
 * @param status - Status da parcela (pode ser string, null ou undefined)
 * @returns Status válido: 'ABERTA' | 'PARCIALMENTE_PAGA' | 'PAGA' | 'EM_COMPENSACAO'
 */
export function normalizarStatusParcela(
  status: string | null | undefined
): 'ABERTA' | 'PARCIALMENTE_PAGA' | 'PAGA' | 'EM_COMPENSACAO' {
  if (!status) return 'ABERTA';
  
  const statusUpper = status.toUpperCase().trim();
  
  // Status válidos
  const statusValidos = ['ABERTA', 'PARCIALMENTE_PAGA', 'PAGA', 'EM_COMPENSACAO'];
  
  // Se for válido, retornar
  if (statusValidos.includes(statusUpper)) {
    return statusUpper as 'ABERTA' | 'PARCIALMENTE_PAGA' | 'PAGA' | 'EM_COMPENSACAO';
  }
  
  // Se for PENDENTE ou inválido, normalizar para ABERTA
  if (statusUpper === 'PENDENTE' || !statusValidos.includes(statusUpper)) {
    if (import.meta.env.DEV) {
      console.warn(`[normalizarStatusParcela] Status inválido detectado: "${status}". Normalizando para ABERTA.`);
    }
    return 'ABERTA';
  }
  
  return 'ABERTA';
}