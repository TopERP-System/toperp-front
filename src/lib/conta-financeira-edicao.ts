import type {
  ContaFinanceira,
  CreateContaFinanceiraDto,
} from "@/services/financeiro.service";

export type ContaFinanceiraEdicaoForm = CreateContaFinanceiraDto & {
  data_emissao: string;
  data_prevista?: string;
};

/** Valor para input type="date" (YYYY-MM-DD). */
export function toDateInputValue(val: unknown): string {
  if (val == null || val === "") return "";
  if (typeof val === "string") {
    const ymd = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymd) return ymd[1];
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

export function toEditValorOriginal(val: unknown): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const t = val.trim();
    if (t.includes(",") && !/\.\d{2}$/.test(t)) {
      return parseFloat(t.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(t.replace(",", ".")) || 0;
  }
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function pickOptionalId(...candidates: unknown[]): number | undefined {
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = typeof c === "number" ? c : parseInt(String(c), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

/** Normaliza GET /contas-financeiras/:id para o formulário. */
export function mapContaApiParaEdicao(
  raw: ContaFinanceira | Record<string, unknown>,
): ContaFinanceiraEdicaoForm {
  const r = raw as Record<string, unknown>;
  const cliente = r.cliente as { id?: number } | undefined;
  const fornecedor = r.fornecedor as { id?: number } | undefined;
  const pedido = r.pedido as { id?: number } | undefined;

  return {
    tipo: (r.tipo as CreateContaFinanceiraDto["tipo"]) || "PAGAR",
    previsao: r.previsao === true || r.previsao === "t",
    descricao: String(r.descricao ?? ""),
    valor_original: toEditValorOriginal(r.valor_original),
    data_emissao: toDateInputValue(r.data_emissao),
    data_vencimento: toDateInputValue(r.data_vencimento),
    data_prevista: toDateInputValue(r.data_prevista),
    data_pagamento: r.data_pagamento
      ? toDateInputValue(r.data_pagamento)
      : undefined,
    cliente_id: pickOptionalId(r.cliente_id, cliente?.id, r.clienteId),
    fornecedor_id: pickOptionalId(
      r.fornecedor_id,
      fornecedor?.id,
      r.fornecedorId,
    ),
    pedido_id: pickOptionalId(r.pedido_id, pedido?.id, r.pedidoId),
    roca_id: pickOptionalId(r.roca_id, r.rocaId),
    forma_pagamento:
      (r.forma_pagamento as CreateContaFinanceiraDto["forma_pagamento"]) ??
      undefined,
    observacoes: r.observacoes != null ? String(r.observacoes) : undefined,
  };
}

export function buildPatchContaFinanceira(
  editConta: ContaFinanceiraEdicaoForm,
  options?: {
    tipoFixo?: "RECEBER" | "PAGAR";
    isPrevisao?: boolean;
  },
): Partial<CreateContaFinanceiraDto> {
  if (options?.isPrevisao) {
    return {
      descricao: editConta.descricao,
      valor_original: Number(editConta.valor_original),
      data_prevista: editConta.data_prevista,
      data_emissao: editConta.data_emissao || undefined,
      cliente_id:
        editConta.cliente_id != null && editConta.cliente_id > 0
          ? editConta.cliente_id
          : null,
      roca_id:
        editConta.roca_id != null && editConta.roca_id > 0
          ? editConta.roca_id
          : null,
      forma_pagamento: editConta.forma_pagamento,
      observacoes: editConta.observacoes,
    };
  }

  const tipo = options?.tipoFixo ?? editConta.tipo;

  const dados: Partial<CreateContaFinanceiraDto> = {
    tipo,
    descricao: editConta.descricao.trim(),
    valor_original: editConta.valor_original,
    data_emissao: editConta.data_emissao,
    data_vencimento: editConta.data_vencimento,
    pedido_id:
      editConta.pedido_id != null && editConta.pedido_id > 0
        ? editConta.pedido_id
        : null,
    roca_id:
      editConta.roca_id != null && editConta.roca_id > 0
        ? editConta.roca_id
        : null,
  };

  // Só envia o vínculo do tipo da conta. "Nenhum" vira null e limpa no banco.
  // Não enviar o outro campo evita erro do backend ("cliente_id só em RECEBER", etc.).
  if (tipo === "RECEBER") {
    dados.cliente_id =
      editConta.cliente_id != null && editConta.cliente_id > 0
        ? editConta.cliente_id
        : null;
  } else if (tipo === "PAGAR") {
    dados.fornecedor_id =
      editConta.fornecedor_id != null && editConta.fornecedor_id > 0
        ? editConta.fornecedor_id
        : null;
  }

  if (editConta.forma_pagamento) {
    dados.forma_pagamento = editConta.forma_pagamento;
  }
  if (editConta.data_pagamento?.trim()) {
    dados.data_pagamento = editConta.data_pagamento;
  }
  if (editConta.observacoes?.trim()) {
    dados.observacoes = editConta.observacoes.trim();
  }

  return dados;
}
