import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, Clock, DollarSign, Receipt } from 'lucide-react';
import { ResumoParcelas } from '@/hooks/useParcelasPedido';

interface ParcelasResumoProps {
  resumo: ResumoParcelas;
}

export function ParcelasResumo({ resumo }: ParcelasResumoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Resumo de Parcelas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progresso de Pagamento</span>
            <span className="font-semibold">{resumo.percentual_pago.toFixed(1)}%</span>
          </div>
          <Progress value={resumo.percentual_pago} className="h-2" />
        </div>

        {/* Grid de Informações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total de Parcelas */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de Parcelas</p>
            <p className="text-2xl font-bold">{resumo.total_parcelas}</p>
          </div>

          {/* Parcelas Pagas */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-muted-foreground">Parcelas Pagas</p>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {resumo.parcelas_pagas}/{resumo.total_parcelas}
            </p>
          </div>

          {/* Parcelas Pendentes */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-muted-foreground">Parcelas Pendentes</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {resumo.parcelas_pendentes}
            </p>
          </div>

          {/* Valor Total */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-muted-foreground">Valor Total</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(resumo.valor_total)}</p>
          </div>
        </div>

        {/* Valores Financeiros */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Valor Pago</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(resumo.valor_pago)}
            </p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-sm text-muted-foreground">Valor Restante</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(resumo.valor_restante)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
