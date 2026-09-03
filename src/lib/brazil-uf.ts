export const BRAZILIAN_UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type BrazilUf = (typeof BRAZILIAN_UFS)[number];

export function isValidBrazilUf(uf?: string | null): boolean {
  if (!uf?.trim()) return false;
  return BRAZILIAN_UFS.includes(uf.trim().toUpperCase() as BrazilUf);
}

export function normalizeBrazilUf(uf?: string | null): string {
  return String(uf ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 2);
}
