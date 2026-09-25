import { CreateProdutoDto, Produto } from '@/services/produtos.service';
import { toast } from 'sonner';
import { dadosFiscaisDoProduto, montarTributacoesPayload } from './dadosFiscais';
import { ProdutoFormData } from './prepararCriacaoProduto';

/** Data da API → YYYY-MM-DD (input type="date"). */
function paraDataInput(valor?: string): string | undefined {
  if (!valor) return undefined;
  const data = new Date(valor);
  if (isNaN(data.getTime())) return undefined;
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function produtoParaFormData(produto: Produto): ProdutoFormData {
  const fiscais = dadosFiscaisDoProduto(produto);
  return {
    nome: produto.nome || '',
    descricao: produto.descricao || '',
    sku: produto.sku || '',
    preco_custo: produto.preco_custo || 0,
    preco_venda: produto.preco_venda || 0,
    preco_promocional: produto.preco_promocional,
    estoque_atual: produto.estoque_atual || 0,
    estoque_minimo: produto.estoque_minimo || 0,
    estoque_maximo: produto.estoque_maximo,
    localizacao: produto.localizacao,
    unidade_medida: produto.unidade_medida || 'UN',
    statusProduto: produto.statusProduto || 'ATIVO',
    categoriaId: produto.categoriaId,
    fornecedorId: produto.fornecedorId,
    data_validade: paraDataInput(produto.data_validade),
    observacoes: produto.observacoes || '',
    peso: produto.peso,
    altura: produto.altura,
    largura: produto.largura,
    ...fiscais,
  };
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  return t === '' ? null : t;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return isNaN(n) ? null : n;
}

/**
 * Monta o PATCH da edição: só envia o que mudou; campo opcional apagado vai como null
 * (o backend só limpa quando recebe null explícito).
 */
export function prepararAtualizacaoProduto(
  original: Produto,
  form: ProdutoFormData,
): Partial<CreateProdutoDto> | null {
  const precoVenda = numero(form.preco_venda) ?? original.preco_venda;
  const precoPromocional = numero(form.preco_promocional);
  if (precoPromocional !== null && precoVenda && precoPromocional > precoVenda) {
    toast.error('O preço promocional não pode ser maior que o preço de venda');
    return null;
  }

  // Estoque não é editado aqui — só via Movimentações / pedidos
  const payload: Record<string, unknown> = {
    nome: form.nome || undefined,
    sku: form.sku || undefined,
    preco_custo: numero(form.preco_custo) ?? undefined,
    preco_venda: numero(form.preco_venda) ?? undefined,
    unidade_medida: form.unidade_medida || 'UN',
    statusProduto: form.statusProduto || 'ATIVO',
    categoriaId: form.categoriaId,
  };

  // "Nenhum" no seletor de fornecedor remove o vínculo
  if (form.fornecedorId) {
    payload.fornecedorId = form.fornecedorId;
  } else if (original.fornecedorId) {
    payload.fornecedorId = null;
  }

  const camposTexto = ['descricao', 'ncm', 'cest', 'observacoes', 'data_validade'] as const;
  for (const campo of camposTexto) {
    const antes = texto(campo === 'data_validade' ? paraDataInput(original.data_validade) : original[campo]);
    const depois = texto(form[campo]);
    if (antes !== depois) payload[campo] = depois;
  }

  const camposNumericos = ['preco_promocional', 'peso', 'altura', 'largura'] as const;
  for (const campo of camposNumericos) {
    const antes = numero(original[campo]);
    const depois = numero(form[campo]);
    if (antes !== depois) payload[campo] = depois;
  }

  const origemAntes = original.origem ?? null;
  const origemDepois = form.origem ? Number(form.origem) : null;
  if (origemAntes !== origemDepois) payload.origem = origemDepois;

  const tributacoes = montarTributacoesPayload(form.tributacoes, original.tributacoes ?? []);
  if (tributacoes) payload.tributacoes = tributacoes;

  return payload as Partial<CreateProdutoDto>;
}
