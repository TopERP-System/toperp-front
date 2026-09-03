// Funções de validação de CNPJ e CPF

/**
 * Remove caracteres especiais de CNPJ/CPF
 */
export function cleanDocument(document: string): string {
  return document.replace(/[^\d]/g, '');
}

/**
 * Valida CNPJ usando algoritmo oficial da Receita Federal
 * Baseado na documentação da API
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cleanDocument(cnpj);
  
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais (ex: 11111111111111)
  // Regra da Receita Federal: CNPJs não podem ter todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Extrai os 12 primeiros dígitos e os 2 dígitos verificadores
  const base = cleaned.substring(0, 12);
  const verificadores = cleaned.substring(12);
  
  // Valida primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (firstDigit !== parseInt(verificadores.charAt(0))) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  weight = 6;
  const baseWithFirstDigit = base + firstDigit;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(baseWithFirstDigit.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (secondDigit !== parseInt(verificadores.charAt(1))) return false;
  
  return true;
}

/**
 * Valida CPF usando algoritmo oficial da Receita Federal
 * Baseado na documentação da API
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cleanDocument(cpf);
  
  if (cleaned.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (ex: 11111111111)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Extrai os 9 primeiros dígitos e os 2 dígitos verificadores
  const base = cleaned.substring(0, 9);
  const verificadores = cleaned.substring(9);
  
  // Valida primeiro dígito verificador
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(base.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  let firstDigit = remainder === 10 || remainder === 11 ? 0 : remainder;
  
  if (firstDigit !== parseInt(verificadores.charAt(0))) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  const baseWithFirstDigit = base + firstDigit;
  
  for (let i = 0; i < 10; i++) {
    sum += parseInt(baseWithFirstDigit.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  let secondDigit = remainder === 10 || remainder === 11 ? 0 : remainder;
  
  if (secondDigit !== parseInt(verificadores.charAt(1))) return false;
  
  return true;
}

/**
 * Valida CNPJ ou CPF
 */
export function validateCNPJOrCPF(document: string): boolean {
  const cleaned = cleanDocument(document);
  
  if (cleaned.length === 11) {
    return validateCPF(document);
  } else if (cleaned.length === 14) {
    return validateCNPJ(document);
  }
  
  return false;
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanDocument(cnpj);
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF
 */
export function formatCPF(cpf: string): string {
  const cleaned = cleanDocument(cpf);
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ ou CPF automaticamente
 */
export function formatDocument(document: string): string {
  if (!document) return document;
  const cleaned = cleanDocument(document);
  if (cleaned.length === 11) {
    return formatCPF(cleaned);
  } else if (cleaned.length === 14) {
    return formatCNPJ(cleaned);
  }
  // Se já está formatado, retorna como está
  return document;
}

/**
 * Remove caracteres especiais de CEP
 */
export function cleanCEP(cep: string): string {
  return cep.replace(/[^\d]/g, '');
}

/**
 * Formata CEP no formato 00000-000
 * Aceita CEP parcial e formata enquanto digita
 */
export function formatCEP(cep: string): string {
  if (!cep) return cep;
  
  const cleaned = cleanCEP(cep);
  
  // Limita a 8 dígitos
  const limited = cleaned.slice(0, 8);
  
  // Formata conforme o tamanho
  if (limited.length <= 5) {
    // Apenas números, sem hífen ainda
    return limited;
  } else {
    // Adiciona hífen após o 5º dígito
    return limited.replace(/^(\d{5})(\d{0,3})$/, '$1-$2');
  }
}

/**
 * Remove caracteres especiais de telefone
 */
export function cleanTelefone(telefone: string): string {
  return telefone.replace(/[^\d]/g, '');
}

/**
 * Formata telefone no formato (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo)
 * Aceita telefone parcial e formata enquanto digita
 */
export function formatTelefone(telefone: string): string {
  if (!telefone) return telefone;
  
  const cleaned = cleanTelefone(telefone);
  
  // Limita a 11 dígitos (DDD + 9 dígitos para celular)
  const limited = cleaned.slice(0, 11);
  
  // Formata conforme o tamanho
  if (limited.length === 0) {
    return '';
  } else if (limited.length <= 2) {
    // Apenas DDD, sem formatação ainda
    return `(${limited}`;
  } else if (limited.length <= 6) {
    // DDD + início do número (até 4 dígitos)
    return limited.replace(/^(\d{2})(\d{0,4})$/, '($1) $2');
  } else if (limited.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return limited.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  } else {
    // Telefone celular: (00) 00000-0000
    return limited.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3');
  }
}

/**
 * Exibe no input um número já salvo (formatado, só dígitos ou com 55).
 */
export function telefoneArmazenadoParaCampo(
  armazenado: string | null | undefined,
): string {
  if (!armazenado?.trim()) return '';
  const d = cleanTelefone(armazenado);
  if (!d) return armazenado.trim();
  if (d.startsWith('55') && d.length >= 12) {
    return formatTelefone(d.slice(2, 13));
  }
  return formatTelefone(d.slice(0, 11));
}

/**
 * Para API / WhatsApp: telefone formatado (BR) e whatsapp só dígitos com código 55.
 */
export function normalizarTelefoneWhatsappEnvio(telefoneUi: string): {
  telefone?: string;
  whatsapp?: string;
} {
  const bruto = cleanTelefone(telefoneUi || '');
  if (!bruto) return {};

  let local = bruto;
  if (bruto.startsWith('55') && bruto.length >= 12) {
    local = bruto.slice(2, 13);
  } else {
    local = bruto.slice(0, 11);
  }

  const formatted = formatTelefone(local);
  const digitsLocal = cleanTelefone(formatted);
  if (digitsLocal.length < 10) {
    return { telefone: formatted || undefined };
  }

  const whatsapp =
    bruto.startsWith('55') && bruto.length >= 12
      ? bruto.slice(0, 13)
      : `55${digitsLocal}`;

  return {
    telefone: formatted || undefined,
    whatsapp,
  };
}

