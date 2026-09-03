import { cleanDocument, formatCNPJ, formatCPF } from '@/lib/validators';
import { CreateClienteDto } from '@/services/clientes.service';
import { CondicaoPagamento } from '@/shared/types/condicao-pagamento.types';
import { toast } from 'sonner';
import {
  ClienteFormData,
  ContatoFormData,
  EnderecoFormData,
} from '../types/cliente.types';

export function prepararCriacaoCliente(input: {
  cliente: ClienteFormData;
  enderecos: EnderecoFormData[];
  contatos: ContatoFormData[];
  condicoesPagamento?: CondicaoPagamento[];
}): CreateClienteDto | null {
  const { cliente, enderecos, contatos, condicoesPagamento } = input;

  const ehPessoaJuridica =
    cliente.tipoPessoa === 'PESSOA_JURIDICA' ||
    (!!cliente.nome_fantasia?.trim() && !cliente.nome?.trim());

  if (ehPessoaJuridica) {
    if (!cliente.nome_fantasia || cliente.nome_fantasia.trim() === '') {
      toast.error('Nome Fantasia é obrigatório para Pessoa Jurídica.');
      return null;
    }
  } else if (!cliente.nome || cliente.nome.trim() === '') {
    toast.error('Nome é obrigatório');
    return null;
  }

  let formattedDoc: string | undefined;
  if (cliente.cpf_cnpj && cliente.cpf_cnpj.trim() !== '') {
    const cleanedDoc = cleanDocument(cliente.cpf_cnpj);
    const tipoPessoa = cliente.tipoPessoa || 'PESSOA_FISICA';

    if (tipoPessoa === 'PESSOA_FISICA') {
      if (cleanedDoc.length !== 11) {
        toast.error('CPF deve ter 11 dígitos');
        return null;
      }
      formattedDoc = formatCPF(cleanedDoc);
    } else {
      if (cleanedDoc.length !== 14) {
        toast.error('CNPJ deve ter 14 dígitos');
        return null;
      }
      formattedDoc = formatCNPJ(cleanedDoc);
    }
  }

  const enderecosValidos = enderecos.filter((end) => end.cep || end.logradouro || end.cidade);
  const contatosValidos = contatos.filter((cont) => cont.telefone || cont.email || cont.nomeContato);

  try {
    const clienteToCreate: CreateClienteDto = {
      ...(cliente.tipoPessoa === 'PESSOA_JURIDICA'
        ? {
            tipoPessoa: 'PESSOA_JURIDICA' as const,
            statusCliente: cliente.statusCliente || 'ATIVO',
            nome_fantasia: cliente.nome_fantasia?.trim() || '',
            ...(cliente.nome_razao?.trim() ? { nome_razao: cliente.nome_razao.trim() } : {}),
          }
        : {
            nome: cliente.nome || '',
          }),
      ...(cliente.tipoPessoa ? { tipoPessoa: cliente.tipoPessoa } : {}),
      ...(cliente.statusCliente ? { statusCliente: cliente.statusCliente } : {}),
      ...(cliente.inscricao_estadual?.trim()
        ? { inscricao_estadual: cliente.inscricao_estadual }
        : {}),
      ...(formattedDoc ? { cpf_cnpj: formattedDoc } : {}),
      ...(cliente.limite_credito !== undefined &&
      cliente.limite_credito !== null &&
      cliente.limite_credito >= 0
        ? { limite_credito: cliente.limite_credito }
        : cliente.limite_credito === null
          ? { limite_credito: null }
          : {}),
      ...(enderecosValidos.length > 0 ? { enderecos: enderecosValidos } : {}),
      ...(contatosValidos.length > 0 ? { contatos: contatosValidos } : {}),
      ...(condicoesPagamento && condicoesPagamento.length > 0
        ? {
            condicoes_pagamento: condicoesPagamento.map((cp) => {
              const descricaoLabel = cp.descricao?.trim() || '(sem descrição)';
              if (cp.parcelado) {
                if (!cp.numero_parcelas || cp.numero_parcelas < 1) {
                  toast.error(
                    `Condição "${descricaoLabel}": Número de parcelas inválido.`,
                  );
                  throw new Error(`Número de parcelas inválido: ${descricaoLabel}`);
                }
                if (!cp.parcelas || cp.parcelas.length === 0) {
                  toast.error(`Condição "${descricaoLabel}": Parcelas não foram criadas.`);
                  throw new Error(`Parcelas não criadas: ${descricaoLabel}`);
                }
                if (cp.parcelas.length !== cp.numero_parcelas) {
                  toast.error(
                    `Condição "${descricaoLabel}": Número de parcelas inconsistente.`,
                  );
                  throw new Error(`Parcelas inconsistentes: ${descricaoLabel}`);
                }
              }

              const condicaoPagamento: Record<string, unknown> = {
                ...(cp.descricao != null && cp.descricao !== ''
                  ? { descricao: cp.descricao.trim() }
                  : {}),
                forma_pagamento: cp.forma_pagamento,
                parcelado: cp.parcelado,
                padrao: cp.padrao,
              };

              if (cp.parcelado) {
                condicaoPagamento.numero_parcelas = Number(cp.numero_parcelas);
                condicaoPagamento.parcelas = cp.parcelas.map((p) => ({
                  numero_parcela: Number(p.numero_parcela),
                  dias_vencimento: Number(p.dias_vencimento),
                  percentual: Number(p.percentual),
                }));
              } else {
                condicaoPagamento.prazo_dias = cp.prazo_dias ?? 0;
              }

              return condicaoPagamento;
            }),
          }
        : {}),
    };

    return clienteToCreate;
  } catch {
    return null;
  }
}
