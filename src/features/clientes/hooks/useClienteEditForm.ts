/**
 * Hook para gerenciar o estado do formulário de edição de cliente
 * Conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ClienteFormState,
  EnderecoFormState,
  ContatoFormState,
} from '@/shared/types/update.types';
import { Cliente } from '@/services/clientes.service';

export function useClienteEditForm(cliente: Cliente | null) {
  const [formData, setFormData] = useState<ClienteFormState>({
    enderecos: [],
    contatos: [],
  });
  const [camposAlterados, setCamposAlterados] = useState<Set<string>>(new Set());

  // Carregar dados iniciais quando o cliente é selecionado
  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        tipoPessoa: cliente.tipoPessoa,
        cpf_cnpj: cliente.cpf_cnpj,
        nome_fantasia: cliente.nome_fantasia || '',
        nome_razao: cliente.nome_razao || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
        statusCliente: cliente.statusCliente,
        enderecos: (cliente.enderecos || []).map((end) => ({
          id: end.id,
          cep: end.cep || '',
          logradouro: end.logradouro || '',
          numero: end.numero || '',
          complemento: end.complemento || '',
          bairro: end.bairro || '',
          cidade: end.cidade || '',
          estado: end.estado || '',
          referencia: end.referencia || '',
          isNew: false,
        })),
        contatos: (cliente.contato || []).map((cont) => ({
          id: cont.id,
          telefone: cont.telefone || '',
          email: cont.email || '',
          nomeContato: cont.nomeContato || cont.nome_contato || '',
          outroTelefone: cont.outroTelefone || cont.outro_telefone || '',
          nomeOutroTelefone: cont.nomeOutroTelefone || cont.nome_outro_telefone || '',
          observacao: cont.observacao || '',
          ativo: cont.ativo !== undefined ? cont.ativo : true,
          isNew: false,
        })),
      });
      setCamposAlterados(new Set());
    }
  }, [cliente]);

  // Atualizar campo do cliente
  const atualizarCampo = useCallback((campo: string, valor: any) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
    setCamposAlterados((prev) => new Set([...prev, campo]));
  }, []);

  // Adicionar novo endereço
  const adicionarEndereco = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      enderecos: [
        ...prev.enderecos,
        {
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          referencia: '',
          isNew: true,
        },
      ],
    }));
    setCamposAlterados((prev) => new Set([...prev, 'enderecos']));
  }, []);

  // Remover endereço
  const removerEndereco = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      enderecos: prev.enderecos.filter((_, i) => i !== index),
    }));
    setCamposAlterados((prev) => new Set([...prev, 'enderecos']));
  }, []);

  // Atualizar endereço
  const atualizarEndereco = useCallback(
    (index: number, campo: string, valor: string) => {
      setFormData((prev) => ({
        ...prev,
        enderecos: prev.enderecos.map((endereco, i) =>
          i === index ? { ...endereco, [campo]: valor } : endereco
        ),
      }));
      setCamposAlterados((prev) => new Set([...prev, 'enderecos']));
    },
    []
  );

  // Adicionar novo contato
  const adicionarContato = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      contatos: [
        ...prev.contatos,
        {
          telefone: '',
          email: '',
          nomeContato: '',
          outroTelefone: '',
          nomeOutroTelefone: '',
          observacao: '',
          ativo: true,
          isNew: true,
        },
      ],
    }));
    setCamposAlterados((prev) => new Set([...prev, 'contatos']));
  }, []);

  // Remover contato
  const removerContato = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      contatos: prev.contatos.filter((_, i) => i !== index),
    }));
    setCamposAlterados((prev) => new Set([...prev, 'contatos']));
  }, []);

  // Atualizar contato
  const atualizarContato = useCallback(
    (index: number, campo: string, valor: any) => {
      setFormData((prev) => ({
        ...prev,
        contatos: prev.contatos.map((contato, i) =>
          i === index ? { ...contato, [campo]: valor } : contato
        ),
      }));
      setCamposAlterados((prev) => new Set([...prev, 'contatos']));
    },
    []
  );

  // Resetar formulário
  const resetForm = useCallback(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        tipoPessoa: cliente.tipoPessoa,
        cpf_cnpj: cliente.cpf_cnpj,
        nome_fantasia: cliente.nome_fantasia || '',
        nome_razao: cliente.nome_razao || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
        statusCliente: cliente.statusCliente,
        enderecos: (cliente.enderecos || []).map((end) => ({
          id: end.id,
          cep: end.cep || '',
          logradouro: end.logradouro || '',
          numero: end.numero || '',
          complemento: end.complemento || '',
          bairro: end.bairro || '',
          cidade: end.cidade || '',
          estado: end.estado || '',
          referencia: end.referencia || '',
          isNew: false,
        })),
        contatos: (cliente.contato || []).map((cont) => ({
          id: cont.id,
          telefone: cont.telefone || '',
          email: cont.email || '',
          nomeContato: cont.nomeContato || cont.nome_contato || '',
          outroTelefone: cont.outroTelefone || cont.outro_telefone || '',
          nomeOutroTelefone: cont.nomeOutroTelefone || cont.nome_outro_telefone || '',
          observacao: cont.observacao || '',
          ativo: cont.ativo !== undefined ? cont.ativo : true,
          isNew: false,
        })),
      });
      setCamposAlterados(new Set());
    }
  }, [cliente]);

  return {
    formData,
    camposAlterados: Array.from(camposAlterados),
    atualizarCampo,
    adicionarEndereco,
    removerEndereco,
    atualizarEndereco,
    adicionarContato,
    removerContato,
    atualizarContato,
    resetForm,
  };
}





