import type { MenuEntry } from "./menu-config";

export type AppRole =
  | 'ADMIN'
  | 'GERENTE'
  | 'VENDEDOR'
  | 'FINANCEIRO'
  | 'SUPER_ADMIN';

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role?.trim()) return null;
  return role.toUpperCase().trim() as AppRole;
}

/** Acesso a financeiro, contas e centro de despesa (espelha o backend). */
export function canAccessFinanceiro(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'ADMIN' || r === 'GERENTE' || r === 'FINANCEIRO';
}

/** Configurações (visualização GERENTE; edição ADMIN na API). */
export function canAccessSettings(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'ADMIN' || r === 'GERENTE';
}

/** Emissão e gestão de NF-e (espelha backend Spedy). */
export function canManageNotaFiscal(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'ADMIN' || r === 'GERENTE' || r === 'FINANCEIRO';
}

const ROUTE_ROLES: Record<string, AppRole[] | 'all'> = {
  '/dashboard': 'all',
  '/pedidos': 'all',
  '/notas-fiscais': ['ADMIN', 'GERENTE', 'FINANCEIRO'],
  '/clientes': 'all',
  '/produtos': 'all',
  '/estoque': 'all',
  '/transportadoras': 'all',
  '/controle-roca': 'all',
  '/fornecedores': 'all',
  '/financeiro': ['ADMIN', 'GERENTE', 'FINANCEIRO'],
  '/centro-custos': ['ADMIN', 'GERENTE', 'FINANCEIRO'],
  '/contas-a-pagar': ['ADMIN', 'GERENTE', 'FINANCEIRO'],
  '/contas-a-receber': ['ADMIN', 'GERENTE', 'FINANCEIRO'],
  '/settings': ['ADMIN', 'GERENTE'],
};

export function canAccessRoute(
  role: string | null | undefined,
  path: string,
): boolean {
  const base = path.split('?')[0];
  const exact = ROUTE_ROLES[base];
  if (exact) {
    if (exact === 'all') return true;
    const r = normalizeRole(role);
    return !!r && exact.includes(r);
  }
  if (base.startsWith('/financeiro/') || base.startsWith('/contas-a-')) {
    return canAccessFinanceiro(role);
  }
  return true;
}

export function getDefaultRouteForRole(role?: string | null): string {
  const r = normalizeRole(role);
  if (r === 'SUPER_ADMIN') return '/admin';
  if (r === 'VENDEDOR') return '/pedidos';
  return '/dashboard';
}

export function filterMenuByRole<T extends { href: string }>(
  items: T[],
  role?: string | null,
): T[] {
  return items.filter((item) => canAccessRoute(role, item.href));
}

export function filterMenuEntriesByRole(
  entries: MenuEntry[],
  role?: string | null,
): MenuEntry[] {
  return entries.flatMap((entry) => {
    if (entry.kind === "link") {
      return canAccessRoute(role, entry.href) ? [entry] : [];
    }

    const children = entry.children.filter((child) => {
      if (child.kind === "action") return true;
      return canAccessRoute(role, child.href);
    });

    if (children.length === 0) return [];
    return [{ ...entry, children }];
  });
}
