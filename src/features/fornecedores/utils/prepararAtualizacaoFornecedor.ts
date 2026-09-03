/**
 * Função helper para preparar atualização de fornecedor conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
 * 
 * Esta função converte os dados do formulário de edição para o formato esperado pelo método atualizarParcial
 */

import { FornecedorFormState } from '@/shared/types/update.types';
import { Fornecedor } from '@/services/fornecedores.service';

interface EditFormData {
  nome_fantasia?: string;
  nome_razao?: string;
  tipoFornecedor?: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  statusFornecedor?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  enderecos?: Array<{
    id?: number;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    referencia?: string;
  }>;
  contato?: Array<{
    id?: number;
    telefone?: string;
    email?: string;
    nomeContato?: string;
    outroTelefone?: string;
    nomeOutroTelefone?: string;
    observacao?: string;
    ativo?: boolean;
  }>;
}

/**
 * Converte dados do formulário de edição para FornecedorFormState e identifica campos alterados
 */
export function prepararAtualizacaoFornecedor(
  fornecedorOriginal: Fornecedor,
  dadosEditados: EditFormData
): { formState: FornecedorFormState; camposAlterados: string[] } {
  const camposAlterados: string[] = [];
  const formState: FornecedorFormState = {
    enderecos: [],
    contato: [],
  };

  // Verificar campos básicos alterados
  if (dadosEditados.nome_fantasia !== undefined && dadosEditados.nome_fantasia !== (fornecedorOriginal.nome_fantasia || '')) {
    formState.nome_fantasia = dadosEditados.nome_fantasia;
    camposAlterados.push('nome_fantasia');
  }

  if (dadosEditados.nome_razao !== undefined && dadosEditados.nome_razao !== fornecedorOriginal.nome_razao) {
    formState.nome_razao = dadosEditados.nome_razao;
    camposAlterados.push('nome_razao');
  }

  if (dadosEditados.tipoFornecedor !== undefined && dadosEditados.tipoFornecedor !== fornecedorOriginal.tipoFornecedor) {
    formState.tipoFornecedor = dadosEditados.tipoFornecedor;
    camposAlterados.push('tipoFornecedor');
  }

  if (dadosEditados.statusFornecedor !== undefined && dadosEditados.statusFornecedor !== fornecedorOriginal.statusFornecedor) {
    formState.statusFornecedor = dadosEditados.statusFornecedor;
    camposAlterados.push('statusFornecedor');
  }

  if (dadosEditados.cpf_cnpj !== undefined && dadosEditados.cpf_cnpj !== (fornecedorOriginal.cpf_cnpj || '')) {
    formState.cpf_cnpj = dadosEditados.cpf_cnpj;
    camposAlterados.push('cpf_cnpj');
  }

  if (dadosEditados.inscricao_estadual !== undefined && dadosEditados.inscricao_estadual !== (fornecedorOriginal.inscricao_estadual || '')) {
    formState.inscricao_estadual = dadosEditados.inscricao_estadual;
    camposAlterados.push('inscricao_estadual');
  }

  // Processar endereços
  // Sempre processar se o array foi fornecido (mesmo que vazio)
  // O guia diz: se o array for enviado, processa; se não for enviado (undefined), mantém existentes
  if (dadosEditados.enderecos !== undefined) {
    // Obter lista de IDs válidos dos endereços originais do fornecedor
    // Converter para números para comparação correta
    const idsEnderecosValidos = new Set(
      (fornecedorOriginal.enderecos || [])
        .map(end => end.id ? Number(end.id) : null)
        .filter(id => id !== undefined && id !== null && id > 0)
    );
    
    // IMPORTANTE: Incluir TODOS os endereços do array editado
    // - Endereços com ID válido: serão atualizados
    // - Endereços com ID inválido: serão filtrados (não pertencem ao fornecedor)
    // - Endereços sem ID: serão criados como novos
    // - Endereços não incluídos no array: serão removidos pelo backend
    formState.enderecos = dadosEditados.enderecos
      .filter((end) => {
        // Se tem ID, validar que pertence ao fornecedor
        if (end.id) {
          // Converter ID para número para comparação
          const idNumerico = Number(end.id);
          const idValido = idsEnderecosValidos.has(idNumerico);
          if (!idValido && import.meta.env.DEV) {
            console.warn('[prepararAtualizacaoFornecedor] Endereço com ID inválido filtrado:', {
              idOriginal: end.id,
              idNumerico,
              idsValidos: Array.from(idsEnderecosValidos),
              endereco: end
            });
          }
          return idValido;
        }
        // Se não tem ID, é novo endereço - incluir
        return true;
      })
      .map((end) => ({
        // Converter ID para número se existir
        id: end.id ? Number(end.id) : undefined,
      cep: end.cep || '',
      logradouro: end.logradouro || '',
      numero: end.numero || '',
      complemento: end.complemento || '',
      bairro: end.bairro || '',
      cidade: end.cidade || '',
      estado: end.estado || '',
      referencia: end.referencia || '',
      isNew: !end.id, // Se não tem ID, é novo
    }));
    
    // Sempre marcar como alterado se o array foi fornecido
    // Isso garante que novos endereços sejam enviados
    camposAlterados.push('enderecos');
    
    if (import.meta.env.DEV) {
      console.log('[prepararAtualizacaoFornecedor] Endereços processados:', {
        totalRecebidos: dadosEditados.enderecos.length,
        totalProcessados: formState.enderecos.length,
        novos: formState.enderecos.filter(e => !e.id).length,
        existentes: formState.enderecos.filter(e => e.id).length,
        idsValidos: Array.from(idsEnderecosValidos),
        enderecos: formState.enderecos.map(e => ({
          id: e.id,
          isNew: e.isNew,
          cep: e.cep,
          logradouro: e.logradouro,
          cidade: e.cidade
        }))
      });
    }
  } else {
    // Se não foi enviado, manter os existentes
    formState.enderecos = (fornecedorOriginal.enderecos || []).map((end) => ({
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
    }));
  }

  // Processar contatos (singular "contato" para fornecedores)
  if (dadosEditados.contato !== undefined) {
    // Obter lista de IDs válidos dos contatos originais do fornecedor
    // Converter para números para comparação correta
    const idsContatosValidos = new Set(
      (fornecedorOriginal.contato || [])
        .map(cont => cont.id ? Number(cont.id) : null)
        .filter(id => id !== undefined && id !== null && id > 0)
    );
    
    formState.contato = dadosEditados.contato
      .filter((cont) => {
        // Se tem ID, validar que pertence ao fornecedor
        // Contatos existentes SEMPRE devem ser incluídos, mesmo sem telefone
        if (cont.id) {
          // Converter ID para número para comparação
          const idNumerico = Number(cont.id);
          const idValido = idsContatosValidos.has(idNumerico);
          if (!idValido && import.meta.env.DEV) {
            console.warn('[prepararAtualizacaoFornecedor] Contato com ID inválido filtrado:', {
              idOriginal: cont.id,
              idNumerico,
              idsValidos: Array.from(idsContatosValidos),
              contato: cont
            });
          }
          // Se tem ID válido, incluir mesmo sem telefone (pode estar sendo atualizado)
          return idValido;
        }
        // Se não tem ID, é novo contato - só incluir se tiver telefone
        // Contatos novos SEM telefone não devem ser criados
        if (!cont.telefone?.trim()) {
          if (import.meta.env.DEV) {
            console.warn('[prepararAtualizacaoFornecedor] Contato novo sem telefone filtrado:', cont);
          }
          return false;
        }
        return true;
      })
      .map((cont) => ({
        // Converter ID para número se existir
        id: cont.id ? Number(cont.id) : undefined,
        telefone: cont.telefone || '',
        email: cont.email || '',
        nomeContato: cont.nomeContato || '',
        outroTelefone: cont.outroTelefone || '',
        nomeOutroTelefone: cont.nomeOutroTelefone || '',
        observacao: cont.observacao || '',
        ativo: cont.ativo !== undefined ? cont.ativo : true,
        isNew: !cont.id, // Se não tem ID, é novo
      }));
    
    // IMPORTANTE: Validar que não estamos apagando todos os contatos
    if (formState.contato.length === 0 && (fornecedorOriginal.contato || []).length > 0) {
      console.warn('[prepararAtualizacaoFornecedor] ATENÇÃO: Todos os contatos foram filtrados! Mantendo contatos originais.');
      // Se todos foram filtrados, manter os originais para não apagar tudo
      formState.contato = (fornecedorOriginal.contato || []).map((cont) => ({
        id: cont.id ? Number(cont.id) : undefined,
        telefone: cont.telefone || '',
        email: cont.email || '',
        nomeContato: cont.nomeContato || cont.nome_contato || '',
        outroTelefone: cont.outroTelefone || cont.outro_telefone || '',
        nomeOutroTelefone: cont.nomeOutroTelefone || cont.nome_outro_telefone || '',
        observacao: cont.observacao || '',
        ativo: cont.ativo !== undefined ? cont.ativo : true,
        isNew: false,
      }));
    }
    
    if (import.meta.env.DEV) {
      console.log('[prepararAtualizacaoFornecedor] Contatos processados:', {
        totalRecebidos: dadosEditados.contato.length,
        totalProcessados: formState.contato.length,
        novos: formState.contato.filter(c => !c.id).length,
        existentes: formState.contato.filter(c => c.id).length,
        idsValidos: Array.from(idsContatosValidos),
        contatos: formState.contato.map(c => ({
          id: c.id,
          isNew: c.isNew,
          telefone: c.telefone,
          email: c.email
        }))
      });
    }
    
    camposAlterados.push('contato');
  } else {
    // Se não foi enviado, manter os existentes
    formState.contato = (fornecedorOriginal.contato || []).map((cont) => ({
      id: cont.id,
      telefone: cont.telefone || '',
      email: cont.email || '',
      nomeContato: cont.nomeContato || cont.nome_contato || '',
      outroTelefone: cont.outroTelefone || cont.outro_telefone || '',
      nomeOutroTelefone: cont.nomeOutroTelefone || cont.nome_outro_telefone || '',
      observacao: cont.observacao || '',
      ativo: cont.ativo !== undefined ? cont.ativo : true,
      isNew: false,
    }));
  }

  return { formState, camposAlterados };
}



