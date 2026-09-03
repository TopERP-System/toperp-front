/**
 * Converte texto digitado em pt-BR (ou número) para valor em reais.
 * Alinhado ao backend (`moeda-entrada.util.ts`) — evita `parseFloat("2.900,00")` → 2.9.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseValorMonetarioEntrada(raw: string | number): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw !== 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  let s = raw
    .trim()
    .replace(/\s/g, '')
    .replace(/\u00A0/g, '');
  s = s.replace(/^R\$\s?/i, '');

  if (s === '') {
    return null;
  }
  const neg = s.startsWith('-');
  if (neg) {
    s = s.slice(1);
  }
  if (s === '') {
    return null;
  }

  let n: number;

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
    n = parseFloat(s);
  } else {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount === 0) {
      n = parseFloat(s);
    } else if (dotCount === 1) {
      const parts = s.split('.');
      const right = parts[1] ?? '';
      if (right.length === 3) {
        n = parseFloat((parts[0] ?? '') + right);
      } else {
        n = parseFloat(s);
      }
    } else {
      const parts = s.split('.');
      const last = parts[parts.length - 1] ?? '';
      if (last.length <= 2) {
        const intPart = parts.slice(0, -1).join('');
        n = parseFloat(intPart + '.' + last);
      } else {
        n = parseFloat(s.replace(/\./g, ''));
      }
    }
  }

  if (!Number.isFinite(n)) {
    return null;
  }
  return round2(neg ? -n : n);
}

/** Exibe número para o usuário editar no padrão brasileiro (ex.: 2900 → "2.900,00"). */
export function formatValorMonetarioBr(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
