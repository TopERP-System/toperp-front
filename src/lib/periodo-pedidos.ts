/** Datas `YYYY-MM-DD` no fuso local (sem `toISOString`, que vira o dia em UTC). */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface PeriodoDatas {
  data_inicial: string;
  data_final: string;
}

/** Mês inteiro (1º ao último dia) que contém `ref`, deslocado `deslocamento` meses. */
export function periodoDoMes(deslocamento = 0, ref: Date = new Date()): PeriodoDatas {
  return {
    data_inicial: toYMD(new Date(ref.getFullYear(), ref.getMonth() + deslocamento, 1)),
    data_final: toYMD(new Date(ref.getFullYear(), ref.getMonth() + deslocamento + 1, 0)),
  };
}

/** Período padrão da tela de Pedidos: mês atual inteiro. */
export function periodoPadraoPedidos(ref: Date = new Date()): PeriodoDatas {
  return periodoDoMes(0, ref);
}

/**
 * "mmm/aaaa" (ex.: "nov/2026") quando o intervalo é exatamente um mês inteiro;
 * senão `null`.
 */
export function rotuloMesInteiro(dataInicial?: string, dataFinal?: string): string | null {
  if (!dataInicial || !dataFinal) return null;
  const [y, m, d] = dataInicial.split('-').map(Number);
  if (!y || !m || d !== 1) return null;
  const ref = new Date(y, m - 1, 1);
  if (toYMD(new Date(y, m, 0)) !== dataFinal) return null;
  const mes = ref.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${mes}/${y}`;
}

/**
 * Intervalo amplo para "Qualquer período" no faturamento: sem datas, o
 * GET /financeiro/dashboard assume o mês corrente.
 */
export const PERIODO_TODO_HISTORICO: PeriodoDatas = {
  data_inicial: '2000-01-01',
  data_final: '2100-12-31',
};
