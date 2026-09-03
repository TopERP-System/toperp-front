import { cleanDocument, formatCNPJ, formatCPF } from '@/lib/validators';
import { CreateFornecedorDto } from '@/services/fornecedores.service';
import { toast } from 'sonner';
import {
  ContatoFormData,
  EnderecoFormData,
  FornecedorFormData,
} from '../types/fornecedor.types';

export function prepararCriacaoFornecedor(input: {
  fornecedor: FornecedorFormData;
  enderecos: EnderecoFormData[];
  contatos: ContatoFormData[];
}): CreateFornecedorDto | null {
  const { fornecedor, enderecos, contatos } = input;

  if (!fornecedor.nome_fantasia || fornecedor.nome_fantasia.trim().length === 0) {
    toast.error('O nome fantasia é obrigatório');
    return null;
  }

  if (fornecedor.nome_fantasia.length > 255) {
    toast.error('O nome fantasia deve ter no máximo 255 caracteres');
    return null;
  }

  let cpfCnpjFormatado: string | undefined;
  if (fornecedor.cpf_cnpj && fornecedor.cpf_cnpj.trim() !== '') {
    const cleanedDoc = cleanDocument(fornecedor.cpf_cnpj);
    const tipoFornecedor = fornecedor.tipoFornecedor || 'PESSOA_JURIDICA';

    if (tipoFornecedor === 'PESSOA_FISICA') {
      if (cleanedDoc.length !== 11) {
        toast.error('CPF deve ter 11 dígitos');
        return null;
      }
      cpfCnpjFormatado = formatCPF(cleanedDoc);
    } else {
      if (cleanedDoc.length !== 14) {
        toast.error('CNPJ deve ter 14 dígitos');
        return null;
      }
      cpfCnpjFormatado = formatCNPJ(cleanedDoc);
    }
  }

  const enderecosValidos = enderecos.filter(
    (end) =>
      (end.cep && end.cep.trim()) ||
      (end.logradouro && end.logradouro.trim()) ||
      (end.cidade && end.cidade.trim()),
  );

  const contatosValidos = contatos.filter(
    (cont) => cont.telefone && cont.telefone.trim() !== '',
  );

  return {
    nome_fantasia: fornecedor.nome_fantasia.trim(),
    ...(fornecedor.tipoFornecedor ? { tipoFornecedor: fornecedor.tipoFornecedor } : {}),
    ...(fornecedor.statusFornecedor ? { statusFornecedor: fornecedor.statusFornecedor } : {}),
    ...(cpfCnpjFormatado ? { cpf_cnpj: cpfCnpjFormatado } : {}),
    ...(fornecedor.inscricao_estadual?.trim()
      ? { inscricao_estadual: fornecedor.inscricao_estadual.trim() }
      : {}),
    ...(enderecosValidos.length > 0 ? { enderecos: enderecosValidos } : {}),
    ...(contatosValidos.length > 0 ? { contato: contatosValidos } : {}),
  };
}
