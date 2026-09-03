import { useState } from 'react';
import { toast } from 'sonner';
import {
  relatoriosClienteService,
  CompartilharRelatorioParams,
  CompartilharRelatorioResponse,
  EnviarEmailParams,
  EnviarEmailResponse,
} from '@/services/relatorios-cliente.service';

interface UseRelatorioClienteParams {
  clienteId: number;
}

export function useRelatorioCliente({ clienteId }: UseRelatorioClienteParams) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadFinanceiro = async (): Promise<void> => {
    setLoading('download-financeiro');
    setError(null);
    try {
      await relatoriosClienteService.downloadRelatorioFinanceiro(clienteId);
      toast.success('Relatório financeiro baixado com sucesso!');
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao baixar relatório financeiro';
      setError(errorMessage);
      
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        toast.error('Você não tem permissão para acessar este relatório');
      } else {
        toast.error(errorMessage);
      }
      
      console.error('Erro ao baixar relatório financeiro:', err);
      throw err;
    } finally {
      setLoading(null);
    }
  };

  const imprimirFinanceiro = async (): Promise<void> => {
    setLoading('imprimir-financeiro');
    setError(null);
    try {
      await relatoriosClienteService.imprimirRelatorioFinanceiro(clienteId);
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao imprimir relatório financeiro';
      setError(errorMessage);
      
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        toast.error('Você não tem permissão para acessar este relatório');
      } else {
        toast.error(errorMessage);
      }
      
      console.error('Erro ao imprimir relatório financeiro:', err);
      throw err;
    } finally {
      setLoading(null);
    }
  };

  const downloadProducao = async (
    dataInicial?: string,
    dataFinal?: string
  ): Promise<void> => {
    setLoading('download-producao');
    setError(null);
    try {
      await relatoriosClienteService.downloadRelatorioProducao(
        clienteId,
        dataInicial,
        dataFinal
      );
      toast.success('Relatório de produção baixado com sucesso!');
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao baixar relatório de produção';
      setError(errorMessage);
      
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        toast.error('Você não tem permissão para acessar este relatório');
      } else {
        toast.error(errorMessage);
      }
      
      console.error('Erro ao baixar relatório de produção:', err);
      throw err;
    } finally {
      setLoading(null);
    }
  };

  const imprimirProducao = async (
    dataInicial?: string,
    dataFinal?: string
  ): Promise<void> => {
    setLoading('imprimir-producao');
    setError(null);
    try {
      await relatoriosClienteService.imprimirRelatorioProducao(
        clienteId,
        dataInicial,
        dataFinal
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao imprimir relatório de produção';
      setError(errorMessage);
      
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        toast.error('Você não tem permissão para acessar este relatório');
      } else {
        toast.error(errorMessage);
      }
      
      console.error('Erro ao imprimir relatório de produção:', err);
      throw err;
    } finally {
      setLoading(null);
    }
  };

  const compartilhar = async (
    params: CompartilharRelatorioParams
  ): Promise<CompartilharRelatorioResponse> => {
    const loadingKey = `compartilhar-${params.tipoRelatorio}`;
    setLoading(loadingKey);
    setError(null);
    try {
      const response = await relatoriosClienteService.compartilharRelatorio(
        clienteId,
        params
      );
      toast.success('Link de compartilhamento gerado com sucesso!');
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao compartilhar relatório';
      setError(errorMessage);
      
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        toast.error('Você não tem permissão para compartilhar este relatório');
      } else {
        toast.error(errorMessage);
      }
      
      console.error('Erro ao compartilhar relatório:', err);
      throw err;
    } finally {
      setLoading(null);
    }
  };

  const enviarEmail = async (
    params: EnviarEmailParams
  ): Promise<EnviarEmailResponse> => {
    setLoading('enviar-email');
    setError(null);
    try {
      const response = await relatoriosClienteService.enviarRelatorioPorEmail(
        clienteId,
        params
      );
      toast.success(`Relatório enviado com sucesso para ${response.email}`);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao enviar relatório por email';
      setError(errorMessage);
      
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        toast.error('Você não tem permissão para enviar este relatório');
      } else {
        toast.error(errorMessage);
      }
      
      console.error('Erro ao enviar relatório por email:', err);
      throw err;
    } finally {
      setLoading(null);
    }
  };

  return {
    loading,
    error,
    downloadFinanceiro,
    imprimirFinanceiro,
    downloadProducao,
    imprimirProducao,
    compartilhar,
    enviarEmail,
  };
}















