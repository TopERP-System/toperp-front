/**
 * Utilitários para debug e diagnóstico de conexão com a API
 */

import { getTokenInfo, validateToken, type TokenPayload } from './token-utils';

// Importação dinâmica para evitar dependência circular
const getApiClient = async () => {
  const { apiClient } = await import('@/services/api');
  return apiClient;
};

export interface ApiDiagnosticResult {
  timestamp: string;
  apiUrl: string;
  token: {
    exists: boolean;
    valid: boolean;
    expired: boolean;
    hasSchemaName: boolean;
    schemaName: string | null;
    expiresIn: string | null;
    errors: string[];
  };
  connectivity: {
    reachable: boolean;
    responseTime: number | null;
    error: string | null;
  };
  health: {
    status: 'ok' | 'error' | 'timeout';
    message: string | null;
  };
}

/**
 * Testa a conectividade básica com a API
 */
async function testConnectivity(): Promise<{
  reachable: boolean;
  responseTime: number | null;
  error: string | null;
}> {
  const startTime = Date.now();
  
  try {
    // Tentar fazer uma requisição simples (health check ou endpoint público)
    // Se não houver endpoint de health, tentar um GET simples
    const response = await fetch(
      import.meta.env.VITE_API_URL || 'https://sistemaerp-3.onrender.com/api/v1',
      {
        method: 'HEAD', // HEAD é mais leve que GET
        signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    return {
      reachable: true,
      responseTime,
      error: null,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    let errorMessage = 'Erro desconhecido';
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      errorMessage = 'Timeout: A API não respondeu em 5 segundos';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Não foi possível conectar à API. Verifique sua conexão com a internet.';
    } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      errorMessage = 'Conexão recusada. A API pode não estar rodando.';
    } else if (error.message.includes('ERR_CONNECTION_CLOSED')) {
      errorMessage = 'Conexão fechada. A API pode ter encerrado a conexão.';
    } else {
      errorMessage = error.message || 'Erro desconhecido';
    }
    
    return {
      reachable: false,
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Testa o endpoint de health da API (se disponível)
 */
async function testHealthEndpoint(): Promise<{
  status: 'ok' | 'error' | 'timeout';
  message: string | null;
}> {
  try {
    const apiClient = await getApiClient();
    const response = await apiClient.get('/health', { public: true });
    return {
      status: 'ok',
      message: 'API está respondendo corretamente',
    };
  } catch (error: any) {
    if (error.message.includes('timeout') || error.name === 'AbortError') {
      return {
        status: 'timeout',
        message: 'Timeout ao verificar saúde da API',
      };
    }
    
    // Se o endpoint não existir, não é necessariamente um erro crítico
    if (error.response?.status === 404) {
      return {
        status: 'ok',
        message: 'Endpoint de health não disponível (não crítico)',
      };
    }
    
    return {
      status: 'error',
      message: error.message || 'Erro ao verificar saúde da API',
    };
  }
}

/**
 * Executa diagnóstico completo da API
 */
export async function runApiDiagnostic(): Promise<ApiDiagnosticResult> {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://sistemaerp-3.onrender.com/api/v1';
  const token = localStorage.getItem('access_token');
  
  // Validar token
  const tokenValidation = token ? validateToken(token) : {
    valid: false,
    expired: true,
    hasSchemaName: false,
    errors: ['Token não encontrado'],
  };
  
  const tokenInfo = token ? getTokenInfo(token) : {
    schemaName: null,
    expiresIn: null,
  };
  
  // Testar conectividade
  const connectivity = await testConnectivity();
  
  // Testar health endpoint
  const health = await testHealthEndpoint();
  
  return {
    timestamp: new Date().toISOString(),
    apiUrl,
    token: {
      exists: !!token,
      valid: tokenValidation.valid,
      expired: tokenValidation.expired,
      hasSchemaName: tokenValidation.hasSchemaName,
      schemaName: tokenInfo.schemaName,
      expiresIn: tokenInfo.expiresIn,
      errors: tokenValidation.errors,
    },
    connectivity,
    health,
  };
}

/**
 * Exibe diagnóstico no console (apenas em desenvolvimento)
 */
export function logApiDiagnostic(result: ApiDiagnosticResult) {
  if (!import.meta.env.DEV) {
    return; // Não logar em produção
  }
  
  console.group('🔍 [API Diagnostic]');
  console.log('📅 Timestamp:', result.timestamp);
  console.log('🌐 API URL:', result.apiUrl);
  
  console.group('🔑 Token');
  console.log('Existe:', result.token.exists);
  console.log('Válido:', result.token.valid);
  console.log('Expirado:', result.token.expired);
  console.log('Tem schema_name:', result.token.hasSchemaName);
  console.log('Schema name:', result.token.schemaName);
  console.log('Expira em:', result.token.expiresIn);
  if (result.token.errors.length > 0) {
    console.error('Erros:', result.token.errors);
  }
  console.groupEnd();
  
  console.group('🌐 Conectividade');
  console.log('Acessível:', result.connectivity.reachable);
  console.log('Tempo de resposta:', result.connectivity.responseTime, 'ms');
  if (result.connectivity.error) {
    console.error('Erro:', result.connectivity.error);
  }
  console.groupEnd();
  
  console.group('💚 Health');
  console.log('Status:', result.health.status);
  if (result.health.message) {
    console.log('Mensagem:', result.health.message);
  }
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Função helper para debug rápido (disponível no console do navegador)
 */
export function debugApi() {
  if (typeof window === 'undefined') {
    console.warn('debugApi() só está disponível no navegador');
    return;
  }
  
  console.log('🔍 Executando diagnóstico da API...');
  runApiDiagnostic()
    .then((result) => {
      logApiDiagnostic(result);
      return result;
    })
    .catch((error) => {
      console.error('❌ Erro ao executar diagnóstico:', error);
    });
}

// Disponibilizar no window para acesso via console do navegador
if (typeof window !== 'undefined') {
  (window as any).debugApi = debugApi;
  (window as any).getTokenInfo = (token: string) => {
    const info = getTokenInfo(token);
    console.log('📋 Token Info:', info);
    return info;
  };
}
