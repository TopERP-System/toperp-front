/**
 * Modalidade do frete da NF-e (`modFrete`). Mesmos códigos do backend (`ModalidadeFrete`).
 * Padrão no cadastro do cliente; o pedido guarda o que o usuário definiu.
 */
export const MODALIDADE_FRETE_SEM_TRANSPORTE = 9;

export const MODALIDADES_FRETE = [
  { value: 0, label: "Por conta do remetente (CIF)", descricao: "A empresa contrata e paga a entrega." },
  { value: 1, label: "Por conta do destinatário (FOB)", descricao: "O cliente contrata/paga o frete ou retira." },
  { value: 2, label: "Por conta de terceiros", descricao: "Outra pessoa ou empresa paga o frete." },
  { value: 3, label: "Transporte próprio do remetente", descricao: "Entrega com veículo da empresa." },
  { value: 4, label: "Transporte próprio do destinatário", descricao: "O cliente busca com veículo próprio." },
  { value: 9, label: "Sem transporte", descricao: "Ex.: venda no balcão. Não usa transportadora." },
] as const;

export function labelModalidadeFrete(valor: number | null | undefined): string | null {
  return MODALIDADES_FRETE.find((m) => m.value === valor)?.label ?? null;
}

/** Valor vindo da API → modalidade válida ou null. */
export function parseModalidadeFrete(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return MODALIDADES_FRETE.some((m) => m.value === n) ? n : null;
}
