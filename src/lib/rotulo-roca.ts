/**
 * Rótulos exibidos no lugar de "Roça" fora do módulo Controle de Roça.
 * Singular vem das configurações do tenant (padrão: Roça).
 */

export const ROTULO_ROCA_PADRAO = 'Roça';

export function normalizarRotuloRoca(raw?: string | null): string {
  const t = String(raw ?? '').trim();
  if (!t) return ROTULO_ROCA_PADRAO;
  return t.slice(0, 40);
}

/** Pluralização simples em PT-BR para rótulos curtos. */
export function pluralizarRotuloRoca(singular: string): string {
  const s = normalizarRotuloRoca(singular);
  if (/ão$/i.test(s)) return s.replace(/ão$/i, 'ões');
  if (/ã$/i.test(s)) return s.replace(/ã$/i, 'ãs');
  if (/l$/i.test(s)) return s.replace(/l$/i, 'is');
  if (/r$/i.test(s) || /z$/i.test(s)) return `${s}es`;
  if (/m$/i.test(s)) return s.replace(/m$/i, 'ns');
  return `${s}s`;
}

export type RotulosRoca = {
  /** Ex.: Empresa */
  singular: string;
  /** Ex.: Empresas */
  plural: string;
  /** Ex.: empresa (minúsculo) */
  singularLower: string;
  /** Ex.: empresas */
  pluralLower: string;
  /** Ex.: Todas as empresas / Todos os centros */
  todas: string;
  /** Ex.: Selecione uma empresa */
  selecione: string;
  /** Ex.: Buscar empresa… */
  buscar: string;
  /** Ex.: Nenhuma empresa encontrada. */
  nenhumaEncontrada: string;
  /** Ex.: Empresa #12 */
  comId: (id: number | string) => string;
  /** Menu / módulo Controle — sempre o nome do módulo, não o rótulo customizado. */
  menuControle: string;
};

export function buildRotulosRoca(raw?: string | null): RotulosRoca {
  const singular = normalizarRotuloRoca(raw);
  const plural = pluralizarRotuloRoca(singular);
  const singularLower = singular.toLocaleLowerCase('pt-BR');
  const pluralLower = plural.toLocaleLowerCase('pt-BR');
  const feminino = /[aáàãâ]$/i.test(singular);
  const todas = feminino
    ? `Todas as ${pluralLower}`
    : `Todos os ${pluralLower}`;
  const artigo = feminino ? 'uma' : 'um';

  return {
    singular,
    plural,
    singularLower,
    pluralLower,
    todas,
    selecione: `Selecione ${artigo} ${singularLower}`,
    buscar: `Buscar ${singularLower}…`,
    nenhumaEncontrada: `Nenhuma ${singularLower} encontrada.`,
    comId: (id) => `${singular} #${id}`,
    menuControle: 'Controle de Roça',
  };
}
