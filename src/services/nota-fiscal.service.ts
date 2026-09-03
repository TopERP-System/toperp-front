import { apiClient } from './api';
import type {
  EmitirNotaFiscalPayload,
  ListarNotasFiscaisFiltros,
  ListarNotasFiscaisResponse,
  NotaFiscal,
  NotaFiscalDiagnostico,
  NotaFiscalPreEmissao,
} from '@/types/nota-fiscal';
import { isStatusNotaFinal } from '@/types/nota-fiscal';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

class NotaFiscalService {
  async obterPorPedido(pedidoId: number): Promise<NotaFiscal | null> {
    try {
      return await apiClient.get<NotaFiscal>(`/pedidos/${pedidoId}/nota-fiscal`);
    } catch (error: unknown) {
      const err = error as { isNotFoundError?: boolean; response?: { status?: number } };
      if (err?.isNotFoundError || err?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async obterPreEmissao(pedidoId: number): Promise<NotaFiscalPreEmissao> {
    return apiClient.get<NotaFiscalPreEmissao>(
      `/pedidos/${pedidoId}/nota-fiscal/pre-emissao`,
    );
  }

  async listar(filtros: ListarNotasFiscaisFiltros = {}): Promise<ListarNotasFiscaisResponse> {
    const params = new URLSearchParams();
    if (filtros.page) params.set('page', String(filtros.page));
    if (filtros.limit) params.set('limit', String(filtros.limit));
    if (filtros.busca?.trim()) params.set('busca', filtros.busca.trim());
    if (filtros.status) params.set('status', filtros.status);
    const qs = params.toString();
    return apiClient.get<ListarNotasFiscaisResponse>(
      `/notas-fiscais${qs ? `?${qs}` : ''}`,
    );
  }

  async emitir(
    pedidoId: number,
    payload?: EmitirNotaFiscalPayload,
  ): Promise<NotaFiscal> {
    return apiClient.post<NotaFiscal>(
      `/pedidos/${pedidoId}/nota-fiscal/emitir`,
      payload ?? {},
    );
  }

  async consultar(pedidoId: number): Promise<NotaFiscal> {
    return apiClient.post<NotaFiscal>(`/pedidos/${pedidoId}/nota-fiscal/consultar`, {});
  }

  /**
   * Consulta a Spedy (GET) até status final ou timeout — complementa polling do backend.
   */
  async aguardarProcessamento(
    pedidoId: number,
    opts?: { maxTentativas?: number; intervaloMs?: number },
  ): Promise<NotaFiscal> {
    const maxTentativas = opts?.maxTentativas ?? 15;
    const intervaloMs = opts?.intervaloMs ?? 2000;
    let nota = await this.consultar(pedidoId);

    for (let i = 1; i < maxTentativas && !isStatusNotaFinal(nota.status); i++) {
      await sleep(intervaloMs);
      nota = await this.consultar(pedidoId);
    }

    return nota;
  }

  async baixarPdf(pedidoId: number, numeroPedido?: string): Promise<void> {
    const blob = await apiClient.getBlob(`/pedidos/${pedidoId}/nota-fiscal/pdf`);
    const safe = numeroPedido?.replace(/[^\w-]+/g, '_') || String(pedidoId);
    downloadBlob(blob, `nfe-${safe}.pdf`);
  }

  async baixarXml(pedidoId: number, numeroPedido?: string): Promise<void> {
    const blob = await apiClient.getBlob(`/pedidos/${pedidoId}/nota-fiscal/xml`);
    const safe = numeroPedido?.replace(/[^\w-]+/g, '_') || String(pedidoId);
    downloadBlob(blob, `nfe-${safe}.xml`);
  }

  async obterDiagnostico(pedidoId: number): Promise<NotaFiscalDiagnostico> {
    return apiClient.get<NotaFiscalDiagnostico>(
      `/pedidos/${pedidoId}/nota-fiscal/diagnostico`,
    );
  }
}

export const notaFiscalService = new NotaFiscalService();
