/**
 * Funções utilitárias para preparar payloads de atualização parcial
 * Conforme GUIA_FRONTEND_ATUALIZACAO_CLIENTES_E_FORNECEDORES.md
 * e GUIA_FRONTEND_EDICAO_FORNECEDOR_ENDERECOS.md
 */

import {
    ClienteFormState,
    ContatoFormState,
    EnderecoFormState,
    FornecedorFormState,
    UpdateClientePayload,
    UpdateContato,
    UpdateEndereco,
    UpdateFornecedorPayload,
} from '@/shared/types/update.types';

/**
 * Converte string vazia para null
 */
function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined) return undefined as any;
  return value === '' ? null : value;
}

/**
 * Remove formatação de CPF/CNPJ (mantém apenas números)
 */
function cleanDocument(document: string | undefined): string | undefined {
  if (!document) return undefined;
  return document.replace(/\D/g, '');
}

/**
 * Prepara payload de atualização de endereço
 * Conforme GUIA_FRONTEND_EDICAO_FORNECEDOR_ENDERECOS.md
 * 
 * Regras:
 * - ID é OBRIGATÓRIO para atualizar, OMITIR para criar novo
 * - Campos obrigatórios: incluir apenas se preenchidos (com trim)
 * - Campos opcionais: "" será convertido para null
 * - Não incluir campos undefined no payload
 */
function prepararEndereco(endereco: EnderecoFormState): UpdateEndereco {
  const payload: UpdateEndereco = {};
  
  // Se tem ID válido (> 0), incluir para atualização
  // Se não tem ID ou isNew = true, omitir (será criado novo)
  if (endereco.id && endereco.id > 0 && !endereco.isNew) {
    payload.id = Number(endereco.id);
  }
  // Se não tem ID, omitir (será criado novo endereço)
  
  const asTrimmedString = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  };

  // Campos obrigatórios (apenas se preenchidos) — coerção para string
  // evita omitir numero quando vier como number do formulário/API.
  const cep = asTrimmedString(endereco.cep);
  if (cep !== undefined) payload.cep = cep;

  const logradouro = asTrimmedString(endereco.logradouro);
  if (logradouro !== undefined) payload.logradouro = logradouro;

  const numero = asTrimmedString(endereco.numero);
  if (numero !== undefined) payload.numero = numero;

  const bairro = asTrimmedString(endereco.bairro);
  if (bairro !== undefined) payload.bairro = bairro;

  const cidade = asTrimmedString(endereco.cidade);
  if (cidade !== undefined) payload.cidade = cidade;

  const estado = asTrimmedString(endereco.estado);
  if (estado !== undefined) payload.estado = estado.toUpperCase();
  
  // Campos opcionais: "" vira null (apenas se definido)
  if (endereco.complemento !== undefined) {
    if (endereco.complemento === '' || endereco.complemento === null) {
      payload.complemento = null;
    } else {
      payload.complemento = String(endereco.complemento).trim();
    }
  }
  if (endereco.referencia !== undefined) {
    if (endereco.referencia === '' || endereco.referencia === null) {
      payload.referencia = null;
    } else {
      payload.referencia = String(endereco.referencia).trim();
    }
  }

  if (endereco.codigo_ibge !== undefined) {
    const ibge = String(endereco.codigo_ibge || '').replace(/\D/g, '').slice(0, 7);
    payload.codigo_ibge = ibge || null;
  }
  
  if (import.meta.env.DEV) {
    console.log('[prepararEndereco] Endereço processado:', {
      id: endereco.id,
      isNew: endereco.isNew,
      temIdNoPayload: !!payload.id,
      payload
    });
  }
  
  return payload;
}

/**
 * Prepara payload de atualização de contato
 */
function prepararContato(contato: ContatoFormState): UpdateContato {
  const payload: UpdateContato = {};
  
  // Incluir ID apenas se não for novo
  if (contato.id && !contato.isNew) {
    payload.id = contato.id;
  }
  
  // Telefone é obrigatório para criar novo
  if (contato.telefone !== undefined) {
    payload.telefone = contato.telefone;
  }
  
  // Converter strings vazias para null
  payload.email = emptyToNull(contato.email);
  payload.nomeContato = emptyToNull(contato.nomeContato);
  payload.outroTelefone = emptyToNull(contato.outroTelefone);
  payload.nomeOutroTelefone = emptyToNull(contato.nomeOutroTelefone);
  payload.observacao = emptyToNull(contato.observacao);
  
  // Ativo tem valor padrão true se não especificado
  if (contato.ativo !== undefined) {
    payload.ativo = contato.ativo;
  }
  
  return payload;
}

/**
 * Prepara payload de atualização parcial de Cliente
 * 
 * @param dadosForm - Dados do formulário
 * @param camposAlterados - Array de nomes dos campos que foram alterados
 * @returns Payload pronto para envio ao backend
 */
export function prepararPayloadAtualizacaoCliente(
  dadosForm: ClienteFormState,
  camposAlterados: string[]
): UpdateClientePayload {
  const payload: UpdateClientePayload = {};
  
  // 1. Adicionar apenas campos que foram alterados
  if (camposAlterados.includes('nome') && dadosForm.nome !== undefined) {
    payload.nome = emptyToNull(dadosForm.nome);
  }
  
  if (camposAlterados.includes('tipoPessoa') && dadosForm.tipoPessoa !== undefined) {
    payload.tipoPessoa = dadosForm.tipoPessoa;
  }
  
  if (camposAlterados.includes('statusCliente') && dadosForm.statusCliente !== undefined) {
    payload.statusCliente = dadosForm.statusCliente;
  }
  
  if (camposAlterados.includes('cpf_cnpj') && dadosForm.cpf_cnpj !== undefined) {
    // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: CPF é opcional
    // Limpar formatação e converter string vazia para null
    const cleaned = cleanDocument(dadosForm.cpf_cnpj);
    // Se o campo foi limpo (vazio), enviar null para remover do banco
    // Se tem valor, enviar apenas números (sem formatação)
    if (!cleaned || cleaned.length === 0) {
      payload.cpf_cnpj = null;
    } else {
      payload.cpf_cnpj = cleaned;
    }
    
    if (import.meta.env.DEV) {
      console.log('[prepararPayloadAtualizacaoCliente] CPF/CNPJ processado:', {
        original: dadosForm.cpf_cnpj,
        cleaned,
        final: payload.cpf_cnpj,
        isNull: payload.cpf_cnpj === null
      });
    }
  }
  
  if (camposAlterados.includes('nome_fantasia') && dadosForm.nome_fantasia !== undefined) {
    payload.nome_fantasia = emptyToNull(dadosForm.nome_fantasia);
  }
  
  if (camposAlterados.includes('nome_razao') && dadosForm.nome_razao !== undefined) {
    payload.nome_razao = emptyToNull(dadosForm.nome_razao);
  }
  
  if (camposAlterados.includes('inscricao_estadual') && dadosForm.inscricao_estadual !== undefined) {
    payload.inscricao_estadual = emptyToNull(dadosForm.inscricao_estadual);
  }

  // Limite de crédito: número ≥ 0 ou null (vazio = sem limite). Conforme GUIA_FRONTEND_LIMITE_CREDITO_EDICAO.md
  // Quando o usuário remove o limite na edição, enviar null para o backend persistir "sem limite"
  if (camposAlterados.includes('limite_credito')) {
    const val = dadosForm.limite_credito;
    if (val === null || val === undefined || (typeof val === 'number' && (isNaN(val) || val < 0))) {
      payload.limite_credito = null;
    } else {
      const num = typeof val === 'number' ? val : Number(val);
      payload.limite_credito = !isNaN(num) && num >= 0 ? Math.round(num * 100) / 100 : null;
    }
  }
  
  // 2. Processar endereços
  // IMPORTANTE: Só enviar o array se houver alterações
  if (camposAlterados.includes('enderecos')) {
    payload.enderecos = dadosForm.enderecos.map(prepararEndereco);
  }
  // Se não incluir 'enderecos' no payload, o backend mantém os existentes
  
  // 3. Processar contatos
  if (camposAlterados.includes('contatos')) {
    payload.contatos = dadosForm.contatos
      .filter(contato => contato.telefone) // Filtrar contatos sem telefone
      .map(prepararContato);
  }
  
  return payload;
}

/**
 * Prepara payload de atualização parcial de Fornecedor
 * Conforme GUIA_FRONTEND_EDICAO_FORNECEDOR_ENDERECOS.md
 * 
 * @param dadosForm - Dados do formulário
 * @param camposAlterados - Array de nomes dos campos que foram alterados
 * @returns Payload pronto para envio ao backend
 */
export function prepararPayloadAtualizacaoFornecedor(
  dadosForm: FornecedorFormState,
  camposAlterados: string[]
): UpdateFornecedorPayload {
  const payload: UpdateFornecedorPayload = {};
  
  // 1. Adicionar apenas campos que foram alterados
  // Campos do fornecedor (apenas se alterados)
  if (camposAlterados.includes('nome_fantasia') && dadosForm.nome_fantasia !== undefined) {
    payload.nome_fantasia = dadosForm.nome_fantasia.trim();
  }
  
  if (camposAlterados.includes('nome_razao') && dadosForm.nome_razao !== undefined) {
    payload.nome_razao = dadosForm.nome_razao.trim();
  }
  
  if (camposAlterados.includes('tipoFornecedor') && dadosForm.tipoFornecedor !== undefined) {
    payload.tipoFornecedor = dadosForm.tipoFornecedor;
  }
  
  if (camposAlterados.includes('statusFornecedor') && dadosForm.statusFornecedor !== undefined) {
    payload.statusFornecedor = dadosForm.statusFornecedor;
  }
  
  if (camposAlterados.includes('cpf_cnpj') && dadosForm.cpf_cnpj !== undefined) {
    // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: CPF é opcional
    // Remover formatação (apenas números) e converter string vazia para null
    const cleaned = cleanDocument(dadosForm.cpf_cnpj);
    // Se o campo foi limpo (vazio), enviar null para remover do banco
    // Se tem valor, enviar apenas números (sem formatação)
    if (!cleaned || cleaned.length === 0) {
      payload.cpf_cnpj = null;
    } else {
      payload.cpf_cnpj = cleaned;
    }
    
    if (import.meta.env.DEV) {
      console.log('[prepararPayloadAtualizacaoFornecedor] CPF/CNPJ processado:', {
        original: dadosForm.cpf_cnpj,
        cleaned,
        final: payload.cpf_cnpj,
        isNull: payload.cpf_cnpj === null
      });
    }
  }
  
  // Campo opcional: "" vira null
  if (camposAlterados.includes('inscricao_estadual') && dadosForm.inscricao_estadual !== undefined) {
    payload.inscricao_estadual = dadosForm.inscricao_estadual === '' 
      ? null 
      : dadosForm.inscricao_estadual.trim();
  }
  
  // 2. Processar endereços
  // IMPORTANTE: Só enviar o array se houver alterações
  // Conforme guia: sempre enviar TODOS os endereços que devem permanecer
  if (camposAlterados.includes('enderecos')) {
    // Processar todos os endereços do formulário
    const enderecosProcessados = dadosForm.enderecos.map(prepararEndereco);
    
    // Filtrar endereços novos vazios (sem campos obrigatórios)
    // Endereços existentes (com ID) devem ser enviados mesmo que parcialmente preenchidos
    payload.enderecos = enderecosProcessados.filter((end) => {
      // Se tem ID, sempre incluir (pode estar sendo atualizado parcialmente)
      // NOTA: IDs inválidos já foram filtrados em prepararAtualizacaoFornecedor
      if (end.id) {
        if (import.meta.env.DEV && (!end.id || end.id <= 0)) {
          console.warn('[prepararPayloadAtualizacaoFornecedor] Endereço com ID inválido detectado:', end);
        }
        return true;
      }
      
      // Se não tem ID (é novo), precisa ter pelo menos campos obrigatórios básicos
      const temCamposObrigatorios = 
        (end.cep && typeof end.cep === 'string' && end.cep.trim() !== '') || 
        (end.logradouro && typeof end.logradouro === 'string' && end.logradouro.trim() !== '') || 
        (end.cidade && typeof end.cidade === 'string' && end.cidade.trim() !== '') || 
        (end.estado && typeof end.estado === 'string' && end.estado.trim() !== '');
      
      if (!temCamposObrigatorios && import.meta.env.DEV) {
        console.warn('[prepararPayloadAtualizacaoFornecedor] Endereço novo vazio ignorado:', end);
      }
      
      return temCamposObrigatorios;
    });
    
    if (import.meta.env.DEV) {
      console.log('[prepararPayloadAtualizacaoFornecedor] Endereços no payload:', {
        totalRecebidos: dadosForm.enderecos.length,
        totalProcessados: enderecosProcessados.length,
        totalEnviados: payload.enderecos.length,
        novos: payload.enderecos.filter(e => !e.id).length,
        existentes: payload.enderecos.filter(e => e.id).length,
        idsEnviados: payload.enderecos.filter(e => e.id).map(e => e.id),
        enderecos: payload.enderecos.map(e => ({
          id: e.id,
          cep: e.cep,
          logradouro: e.logradouro,
          cidade: e.cidade,
          estado: e.estado
        }))
      });
    }
  }
  // Se não incluir 'enderecos' no payload, o backend mantém os existentes
  
  // 3. Processar contatos (singular "contato" para fornecedores)
  if (camposAlterados.includes('contato')) {
    // Filtrar apenas contatos novos sem telefone
    // Contatos existentes (com ID) devem ser incluídos mesmo sem telefone
    payload.contato = dadosForm.contato
      .filter(contato => {
        // Se tem ID, sempre incluir (pode estar sendo atualizado)
        if (contato.id) return true;
        // Se não tem ID (é novo), precisa ter telefone
        return !!contato.telefone?.trim();
      })
      .map(prepararContato);
    
    if (import.meta.env.DEV) {
      console.log('[prepararPayloadAtualizacaoFornecedor] Contatos no payload:', {
        totalEnviados: payload.contato.length,
        novos: payload.contato.filter(c => !c.id).length,
        existentes: payload.contato.filter(c => c.id).length,
        contatos: payload.contato.map(c => ({
          id: c.id,
          telefone: c.telefone,
          email: c.email
        }))
      });
    }
  }
  
  return payload;
}

/**
 * Trata erros da API de atualização
 */
export function tratarErroAtualizacao(error: any): { success: false; error: string } {
  if (error?.response) {
    const status = error.response.status;
    const mensagem = error.response.data?.message || error.response.data?.error || 'Erro desconhecido';
    
    // Log detalhado em desenvolvimento
    if (import.meta.env.DEV) {
      console.error('[tratarErroAtualizacao] Erro detalhado:', {
        status,
        mensagem,
        data: error.response.data,
        error: error.response
      });
    }
    
    switch (status) {
      case 400:
        return { success: false, error: `Dados inválidos: ${mensagem}` };
      case 403:
        return { success: false, error: 'Sem permissão para editar' };
      case 404:
        // Usar mensagem específica do backend se disponível
        const mensagem404 = mensagem !== 'Erro desconhecido' 
          ? mensagem 
          : 'Registro não encontrado. Verifique se o fornecedor existe.';
        return { success: false, error: mensagem404 };
      case 409:
        return { success: false, error: 'CPF/CNPJ já cadastrado' };
      default:
        return { success: false, error: `Erro ${status}: ${mensagem}` };
    }
  }
  
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('ERR_CONNECTION_REFUSED')) {
    return { success: false, error: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.' };
  }
  
  return { success: false, error: error?.message || 'Erro ao conectar com o servidor' };
}



