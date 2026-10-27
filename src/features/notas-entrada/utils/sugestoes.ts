import type { ItemPrevia } from '@/services/notas-entrada.service';

export type ItemComSugestao = ItemPrevia & { sugestao: NonNullable<ItemPrevia['sugestao']> };

/** Itens ainda sem produto que têm um produto sugerido pelo nome. */
export const comSugestao = (itens: ItemPrevia[]) =>
  itens.filter((i): i is ItemComSugestao => !i.produto && Boolean(i.sugestao));
