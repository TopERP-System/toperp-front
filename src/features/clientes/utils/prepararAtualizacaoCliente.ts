/**
 * Função helper para preparar atualização de cliente conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
 * 
 * Esta função converte os dados do formulário de edição para o formato esperado pelo método atualizarParcial
 */

import { Cliente } from '@/services/clientes.service';
import { ClienteFormState } from '@/shared/types/update.types';

interface EditFormData {
  nome?: string;
  nome_fantasia?: string;
  nome_razao?: string;
  tipoPessoa?: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  statusCliente?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO' | 'INADIMPLENTE';
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  limite_credito?: number | null;
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
    codigo_ibge?: string;
  }>;
  contatos?: Array<{
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
 * Converte dados do formulário de edição para ClienteFormState e identifica campos alterados
 */
export function prepararAtualizacaoCliente(
  clienteOriginal: Cliente,
  dadosEditados: EditFormData
): { formState: ClienteFormState; camposAlterados: string[] } {
  const camposAlterados: string[] = [];
  const formState: ClienteFormState = {
    enderecos: [],
    contatos: [],
  };

  // Verificar campos básicos alterados
  if (dadosEditados.nome !== undefined && dadosEditados.nome !== clienteOriginal.nome) {
    formState.nome = dadosEditados.nome;
    camposAlterados.push('nome');
  }

  if (dadosEditados.tipoPessoa !== undefined && dadosEditados.tipoPessoa !== clienteOriginal.tipoPessoa) {
    formState.tipoPessoa = dadosEditados.tipoPessoa;
    camposAlterados.push('tipoPessoa');
  }

  // Detectar alteração no CPF/CNPJ (incluindo quando é removido/limpo)
  // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: CPF é opcional
  if (dadosEditados.cpf_cnpj !== undefined) {
    const cpfEditado = dadosEditados.cpf_cnpj || "";
    const cpfOriginal = clienteOriginal.cpf_cnpj || "";
    // Comparar valores normalizados (sem formatação)
    // Se ambos estão vazios, não considerar como alteração
    const cpfEditadoLimpo = cpfEditado.replace(/\D/g, '');
    const cpfOriginalLimpo = cpfOriginal.replace(/\D/g, '');
    
    // Considerar alteração se:
    // 1. Valores são diferentes (incluindo quando um está vazio e outro não)
    // 2. Ou quando editado está vazio mas original tinha valor (remoção)
    if (cpfEditadoLimpo !== cpfOriginalLimpo) {
      // Se o campo foi limpo (string vazia), manter como string vazia
      // Será convertido para null no prepararPayloadAtualizacaoCliente
      formState.cpf_cnpj = dadosEditados.cpf_cnpj || "";
      camposAlterados.push('cpf_cnpj');
    }
  }

  if (dadosEditados.nome_fantasia !== undefined && dadosEditados.nome_fantasia !== (clienteOriginal.nome_fantasia || '')) {
    formState.nome_fantasia = dadosEditados.nome_fantasia;
    camposAlterados.push('nome_fantasia');
  }

  if (dadosEditados.nome_razao !== undefined && dadosEditados.nome_razao !== (clienteOriginal.nome_razao || '')) {
    formState.nome_razao = dadosEditados.nome_razao;
    camposAlterados.push('nome_razao');
  }

  if (dadosEditados.inscricao_estadual !== undefined && dadosEditados.inscricao_estadual !== (clienteOriginal.inscricao_estadual || '')) {
    formState.inscricao_estadual = dadosEditados.inscricao_estadual;
    camposAlterados.push('inscricao_estadual');
  }

  if (dadosEditados.limite_credito !== undefined) {
    const originalVal = clienteOriginal.limite_credito ?? null;
    const editVal = dadosEditados.limite_credito ?? null;
    if (originalVal !== editVal) {
      formState.limite_credito = dadosEditados.limite_credito;
      camposAlterados.push('limite_credito');
    }
  }

  // Processar endereços
  // Sempre processar se o array foi fornecido (mesmo que vazio)
  // O guia diz: se o array for enviado, processa; se não for enviado (undefined), mantém existentes
  if (dadosEditados.enderecos !== undefined) {
    // Obter lista de IDs válidos dos endereços originais do cliente
    // Converter para números para comparação correta
    const idsEnderecosValidos = new Set(
      (clienteOriginal.enderecos || [])
        .map(end => end.id ? Number(end.id) : null)
        .filter(id => id !== undefined && id !== null && id > 0)
    );
    
    // IMPORTANTE: Incluir TODOS os endereços do array editado
    // - Endereços com ID válido: serão atualizados
    // - Endereços com ID inválido: serão filtrados (não pertencem ao cliente)
    // - Endereços sem ID: serão criados como novos
    // - Endereços não incluídos no array: serão removidos pelo backend
    formState.enderecos = dadosEditados.enderecos
      .filter((end) => {
        // Se tem ID, validar que pertence ao cliente
        if (end.id) {
          // Converter ID para número para comparação
          const idNumerico = Number(end.id);
          const idValido = idsEnderecosValidos.has(idNumerico);
          if (!idValido && import.meta.env.DEV) {
            console.warn('[prepararAtualizacaoCliente] Endereço com ID inválido filtrado:', {
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
        codigo_ibge: end.codigo_ibge || '',
        isNew: !end.id, // Se não tem ID, é novo
      }));
    
    // Sempre marcar como alterado se o array foi fornecido
    // Isso garante que novos endereços sejam enviados
    camposAlterados.push('enderecos');
    
    if (import.meta.env.DEV) {
      console.log('[prepararAtualizacaoCliente] Endereços processados:', {
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
    formState.enderecos = (clienteOriginal.enderecos || []).map((end) => ({
      id: end.id,
      cep: end.cep || '',
      logradouro: end.logradouro || '',
      numero: end.numero || '',
      complemento: end.complemento || '',
      bairro: end.bairro || '',
      cidade: end.cidade || '',
      estado: end.estado || '',
      referencia: end.referencia || '',
      codigo_ibge: end.codigo_ibge || '',
      isNew: false,
    }));
  }

  // Processar contatos
  if (dadosEditados.contatos !== undefined) {
    // Obter lista de IDs válidos dos contatos originais do cliente
    // Converter para números para comparação correta
    const idsContatosValidos = new Set(
      (clienteOriginal.contato || [])
        .map(cont => cont.id ? Number(cont.id) : null)
        .filter(id => id !== undefined && id !== null && id > 0)
    );
    
    formState.contatos = dadosEditados.contatos
      .filter((cont) => {
        // Se tem ID, validar que pertence ao cliente
        // Contatos existentes SEMPRE devem ser incluídos, mesmo sem telefone
        if (cont.id) {
          // Converter ID para número para comparação
          const idNumerico = Number(cont.id);
          const idValido = idsContatosValidos.has(idNumerico);
          if (!idValido && import.meta.env.DEV) {
            console.warn('[prepararAtualizacaoCliente] Contato com ID inválido filtrado:', {
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
            console.warn('[prepararAtualizacaoCliente] Contato novo sem telefone filtrado:', cont);
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
    if (formState.contatos.length === 0 && (clienteOriginal.contato || []).length > 0) {
      console.warn('[prepararAtualizacaoCliente] ATENÇÃO: Todos os contatos foram filtrados! Mantendo contatos originais.');
      // Se todos foram filtrados, manter os originais para não apagar tudo
      formState.contatos = (clienteOriginal.contato || []).map((cont) => ({
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
      console.log('[prepararAtualizacaoCliente] Contatos processados:', {
        totalRecebidos: dadosEditados.contatos.length,
        totalProcessados: formState.contatos.length,
        novos: formState.contatos.filter(c => !c.id).length,
        existentes: formState.contatos.filter(c => c.id).length,
        idsValidos: Array.from(idsContatosValidos),
        contatos: formState.contatos.map(c => ({
          id: c.id,
          isNew: c.isNew,
          telefone: c.telefone,
          email: c.email
        }))
      });
    }
    
    camposAlterados.push('contatos');
  } else {
    // Se não foi enviado, manter os existentes
    formState.contatos = (clienteOriginal.contato || []).map((cont) => ({
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





