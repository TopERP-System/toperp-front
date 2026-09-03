import { apiClient } from '@/services/api';
import { useEffect, useState } from 'react';

export interface Parcela {
  id: number;
  pedido_id: number;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  status: 'PENDENTE' | 'PAGA' | 'ABERTA' | 'PARCIALMENTE_PAGA' | 'EM_COMPENSACAO';
  data_vencimento: string;
  data_pagamento?: string | null;
  valor_pago?: number;
  valor_restante?: number;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResumoParcelas {
  total_parcelas: number;
  parcelas_pagas: number;
  parcelas_pendentes: number;
  valor_total: number;
  valor_pago: number;
  valor_restante: number;
  percentual_pago: number;
}

interface ParcelasResponse {
  parcelas: Parcela[];
  resumo: ResumoParcelas;
}

interface VerificarParceladoResponse {
  pedido_id: number;
  e_parcelado: boolean;
}

export const useParcelasPedido = (pedidoId: number | null) => {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [resumo, setResumo] = useState<ResumoParcelas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eParcelado, setEParcelado] = useState(false);

  // Verificar se pedido é parcelado
  const verificarParcelado = async () => {
    if (!pedidoId) return false;

    try {
      const data = await apiClient.get<VerificarParceladoResponse>(
        `/pedidos/${pedidoId}/parcelas/verificar-parcelado`
      );
      setEParcelado(data.e_parcelado);
      return data.e_parcelado;
    } catch (err: any) {
      console.error('Erro ao verificar parcelado:', err);
      setEParcelado(false);
      return false;
    }
  };

  // Carregar parcelas
  const carregarParcelas = async (forcarCarregamento = false) => {
    if (!pedidoId) return;
    if (!forcarCarregamento && !eParcelado) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<ParcelasResponse>(
        `/pedidos/${pedidoId}/parcelas`
      );
      setParcelas(data.parcelas);
      setResumo(data.resumo);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar parcelas');
      console.error('Erro ao carregar parcelas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Marcar parcela como paga
  const marcarParcelaPaga = async (
    parcelaId: number,
    dataPagamento?: string,
    observacoes?: string
  ) => {
    if (!pedidoId) throw new Error('Pedido ID não informado');

    try {
      await apiClient.patch(
        `/pedidos/${pedidoId}/parcelas/${parcelaId}/marcar-paga`,
        {
          data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
          observacoes: observacoes || null,
        }
      );

      // Recarregar parcelas para atualizar resumo
      await carregarParcelas(true);
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao marcar parcela como paga');
    }
  };

  // Desmarcar parcela como paga
  const desmarcarParcelaPaga = async (parcelaId: number) => {
    if (!pedidoId) throw new Error('Pedido ID não informado');

    try {
      await apiClient.patch(
        `/pedidos/${pedidoId}/parcelas/${parcelaId}/desmarcar-paga`,
        {}
      );

      // Recarregar parcelas para atualizar resumo
      await carregarParcelas(true);
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao desmarcar parcela');
    }
  };

  // Verificar e carregar automaticamente
  useEffect(() => {
    const inicializar = async () => {
      if (!pedidoId) return;
      
      const parcelado = await verificarParcelado();
      if (parcelado) {
        // Forçar carregamento mesmo que eParcelado ainda não tenha sido atualizado
        await carregarParcelas(true);
      }
    };

    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  return {
    parcelas,
    resumo,
    loading,
    error,
    eParcelado,
    carregarParcelas,
    marcarParcelaPaga,
    desmarcarParcelaPaga,
    verificarParcelado,
  };
};
