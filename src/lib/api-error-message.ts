/** Normaliza mensagens de erro da API (NestJS, Spedy, validação). */
export function normalizeApiErrorMessage(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed && trimmed !== '[object Object]' ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeApiErrorMessage(item))
      .filter((item): item is string => !!item);
    return parts.length > 0 ? parts.join('; ') : null;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return (
      normalizeApiErrorMessage(obj.message) ||
      normalizeApiErrorMessage(obj.detail) ||
      normalizeApiErrorMessage(obj.title) ||
      normalizeApiErrorMessage(obj.description) ||
      normalizeApiErrorMessage(obj.error) ||
      (Array.isArray(obj.errors) ? normalizeApiErrorMessage(obj.errors) : null)
    );
  }

  return null;
}

export function extractApiErrorMessage(error: unknown): string {
  const err = error as {
    message?: unknown;
    response?: { data?: unknown; status?: number };
  };

  const fromResponse = normalizeApiErrorMessage(err?.response?.data);
  if (fromResponse) return fromResponse;

  const nested = err?.response?.data as { message?: unknown } | undefined;
  const fromNested = normalizeApiErrorMessage(nested?.message);
  if (fromNested) return fromNested;

  const fromError = normalizeApiErrorMessage(err?.message);
  if (
    fromError &&
    !/^Request failed with status code \d+$/i.test(fromError)
  ) {
    return fromError;
  }

  const status = err?.response?.status;
  if (status) return `Erro ${status} ao processar a requisição.`;

  return 'Não foi possível concluir a operação.';
}
