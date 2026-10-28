import { formatCEP, formatDocument } from '@/lib/validators';
import { CreateFornecedorDto } from '@/services/fornecedores.service';
import { NfeXml, NfeXmlItem } from '@/services/notas-entrada.service';
import { CreateProdutoDto } from '@/services/produtos.service';

/** Mesmo cálculo do backend (common/utils/gtin.util.ts): GTIN-8/12/13/14 com dígito verificador. */
export function gtinValido(codigo: string | null | undefined): boolean {
  if (!codigo || !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(codigo)) return false;
  const digitos = codigo.split('').map(Number);
  const verificador = digitos.pop()!;
  const soma = digitos
    .reverse()
    .reduce((total, d, i) => total + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === verificador;
}

const TELEFONE = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;

/**
 * US08: fornecedor pelos dados do emitente (`<emit>`) do XML. A razão social não vai:
 * o cadastro de fornecedor só usa o nome fantasia (o backend copia para nome_razao).
 */
export function fornecedorDoEmitente(
  emitente: NfeXml['emitente'],
  nomeFantasia?: string,
): CreateFornecedorDto {
  const doc = emitente.cpf_cnpj.replace(/\D/g, '');
  const end = emitente.endereco;
  const dto: CreateFornecedorDto = {
    nome_fantasia: (nomeFantasia ?? emitente.nome_fantasia ?? emitente.nome).trim(),
    tipoFornecedor: doc.length === 11 ? 'PESSOA_FISICA' : 'PESSOA_JURIDICA',
    statusFornecedor: 'ATIVO',
    cpf_cnpj: formatDocument(doc),
  };
  if (emitente.inscricao_estadual && emitente.inscricao_estadual !== 'ISENTO') {
    dto.inscricao_estadual = emitente.inscricao_estadual;
  }
  if (end?.logradouro || end?.cidade) {
    dto.enderecos = [
      {
        cep: end.cep ? formatCEP(end.cep) : undefined,
        logradouro: end.logradouro ?? undefined,
        numero: end.numero?.slice(0, 10) ?? undefined,
        complemento: end.complemento?.slice(0, 50) ?? undefined,
        bairro: end.bairro ?? undefined,
        cidade: end.cidade ?? undefined,
        estado: end.estado ?? undefined,
        ...(end.codigo_ibge ? { codigo_ibge: end.codigo_ibge } : {}),
      },
    ];
  }
  if (end?.telefone && TELEFONE.test(end.telefone)) {
    dto.contato = [{ telefone: end.telefone, ativo: true }];
  }
  return dto;
}

const UNIDADES = ['UN', 'KG', 'LT', 'CX'] as const;

/**
 * US05: produto pelo item do XML. A unidade do produto é a do estoque: com fator ≠ 1
 * (ex.: 1 CX = 12 UN) o custo vira o da unidade do estoque.
 */
export function produtoDoItem(
  item: NfeXmlItem,
  unidade: CreateProdutoDto['unidade_medida'],
  fatorConversao: number,
): CreateProdutoDto {
  const fator = fatorConversao > 0 ? fatorConversao : 1;
  const dto: CreateProdutoDto = {
    nome: item.descricao.trim(),
    sku: '',
    unidade_medida: unidade,
    statusProduto: 'ATIVO',
    estoque_atual: 0,
    estoque_minimo: 0,
    preco_custo: Math.round((item.valor_unitario / fator) * 100) / 100,
  };
  if (item.ncm && /^\d{8}$/.test(item.ncm)) dto.ncm = item.ncm;
  if (item.cest) dto.cest = item.cest;
  if (gtinValido(item.ean)) dto.codigo_barras = item.ean;
  return dto;
}

/** Unidade do item da nota, se for uma das que o produto aceita; senão UN. */
export function unidadeDoItem(item: NfeXmlItem): CreateProdutoDto['unidade_medida'] {
  const u = item.unidade.trim().toUpperCase();
  return (UNIDADES as readonly string[]).includes(u)
    ? (u as CreateProdutoDto['unidade_medida'])
    : 'UN';
}
