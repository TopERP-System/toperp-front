import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useParcelasPedido } from '@/hooks/useParcelasPedido';
import { ChevronDown, ChevronUp, Loader2, Receipt } from 'lucide-react';
import { useState } from 'react';
import { ParcelasChecklist } from './ParcelasChecklist';
import { ParcelasResumo } from './ParcelasResumo';

interface ParcelasPedidoProps {
  pedidoId: number | null;
}

export function ParcelasPedido({ pedidoId }: ParcelasPedidoProps) {
  const {
    parcelas,
    resumo,
    loading,
    error,
    eParcelado,
    carregarParcelas,
    marcarParcelaPaga,
    desmarcarParcelaPaga,
  } = useParcelasPedido(pedidoId);

  const [mostrarParcelas, setMostrarParcelas] = useState(false);

  // Não renderizar se não for parcelado
  if (!eParcelado) {
    return null;
  }

  if (loading && parcelas.length === 0) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Erro ao carregar parcelas: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            <CardTitle>Parcelas do Pedido</CardTitle>
            {resumo && (
              <Badge
                variant={
                  resumo.parcelas_pagas === resumo.total_parcelas
                    ? 'default'
                    : 'secondary'
                }
                className={
                  resumo.parcelas_pagas === resumo.total_parcelas
                    ? 'bg-green-600 hover:bg-green-700'
                    : ''
                }
              >
                {resumo.parcelas_pagas}/{resumo.total_parcelas} pagas
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumo sempre visível */}
        {resumo && <ParcelasResumo resumo={resumo} />}

        {/* Checklist (expansível) */}
        <Collapsible open={mostrarParcelas} onOpenChange={setMostrarParcelas}>
          <div className="flex justify-end mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                {mostrarParcelas ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Ocultar Parcelas
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Ver Parcelas
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {parcelas.length > 0 ? (
              <ParcelasChecklist
                parcelas={parcelas}
                onMarcarPaga={marcarParcelaPaga}
                onDesmarcarPaga={desmarcarParcelaPaga}
                onPagamentoRegistrado={() => carregarParcelas(true)}
                usarFluxoPagamentos={true}
                loading={loading}
              />
            ) : (
              <Alert>
                <AlertDescription>Nenhuma parcela encontrada</AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
