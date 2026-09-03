/**
 * Utilitários para manipulação e verificação de tokens JWT
 */

export interface TokenPayload {
  sub?: string;
  email?: string;
  role?: string;
  schema_name?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decodifica um token JWT sem verificar a assinatura
 * @param token Token JWT
 * @returns Payload decodificado ou null se inválido
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
}

/**
 * Verifica se um token JWT está expirado
 * @param token Token JWT
 * @returns true se expirado, false caso contrário
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true; // Considera expirado se não tiver exp
  }

  const exp = payload.exp * 1000; // Converter para milissegundos
  const agora = Date.now();
  return agora > exp;
}

/**
 * Verifica se um token JWT está próximo do vencimento (dentro de 5 minutos)
 * @param token Token JWT
 * @returns true se próximo do vencimento
 */
export function isTokenNearExpiration(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const exp = payload.exp * 1000;
  const agora = Date.now();
  const cincoMinutos = 5 * 60 * 1000;
  
  return exp - agora < cincoMinutos;
}

/**
 * Verifica se o token contém schema_name
 * @param token Token JWT
 * @returns true se contém schema_name
 */
export function hasSchemaName(token: string): boolean {
  const payload = decodeToken(token);
  return !!payload?.schema_name;
}

/**
 * Obtém o schema_name do token
 * @param token Token JWT
 * @returns schema_name ou null
 */
export function getSchemaName(token: string): string | null {
  const payload = decodeToken(token);
  return payload?.schema_name || null;
}

/**
 * Obtém informações do token para debug
 * @param token Token JWT
 * @returns Objeto com informações do token
 */
export function getTokenInfo(token: string) {
  const payload = decodeToken(token);
  if (!payload) {
    return {
      valid: false,
      expired: true,
      hasSchemaName: false,
      schemaName: null,
      expiresAt: null,
      expiresIn: null,
    };
  }

  const exp = payload.exp ? payload.exp * 1000 : null;
  const agora = Date.now();
  const expired = exp ? agora > exp : true;
  const expiresIn = exp ? Math.max(0, Math.floor((exp - agora) / 1000)) : null;

  return {
    valid: true,
    expired,
    nearExpiration: exp ? exp - agora < 5 * 60 * 1000 : false,
    hasSchemaName: !!payload.schema_name,
    schemaName: payload.schema_name || null,
    expiresAt: exp ? new Date(exp).toISOString() : null,
    expiresIn: expiresIn ? `${Math.floor(expiresIn / 60)} minutos` : null,
    role: payload.role || null,
    email: payload.email || payload.sub || null,
  };
}

/**
 * Valida um token JWT completamente
 * @param token Token JWT
 * @returns Objeto com resultado da validação
 */
export function validateToken(token: string | null): {
  valid: boolean;
  expired: boolean;
  hasSchemaName: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!token) {
    errors.push('Token não encontrado');
    return {
      valid: false,
      expired: true,
      hasSchemaName: false,
      errors,
    };
  }

  const payload = decodeToken(token);
  if (!payload) {
    errors.push('Token inválido (formato incorreto)');
    return {
      valid: false,
      expired: true,
      hasSchemaName: false,
      errors,
    };
  }

  if (isTokenExpired(token)) {
    errors.push('Token expirado');
  }

  const role = payload.role?.toUpperCase?.()?.trim();
  if (role !== 'SUPER_ADMIN' && !hasSchemaName(token)) {
    errors.push('Token não contém schema_name (obrigatório)');
  }

  return {
    valid: errors.length === 0,
    expired: isTokenExpired(token),
    hasSchemaName: hasSchemaName(token),
    errors,
  };
}
