import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  STATUS_FILTRO_PRODUTOS_LABELS,
  STATUS_PEDIDO_FILTRO_PRODUTOS_LABELS,
  type StatusFiltroProdutosCliente,
  type StatusPedidoFiltroProdutosCliente,
} from "@/lib/relatorio-produtos-cliente";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

const COR_STATUS_PEDIDO: Record<StatusPedidoFiltroProdutosCliente, string> = {
  Todos: "text-primary",
  ABERTO: "text-amber-500",
  ATENDIDO: "text-emerald-500",
  CANCELADO: "text-slate-600",
};

const COR_SITUACAO: Record<StatusFiltroProdutosCliente, string> = {
  Todos: "text-primary",
  PENDENTE: "text-amber-500",
  PAGO_PARCIAL: "text-sky-500",
  PAGO_TOTAL: "text-emerald-500",
  VENCIDO: "text-red-500",
};

type Props = {
  /** Prefixo dos ids (diálogo e página não podem repetir). */
  idPrefix: string;
  statusPedido: StatusPedidoFiltroProdutosCliente;
  onStatusPedido: (v: StatusPedidoFiltroProdutosCliente) => void;
  situacao: StatusFiltroProdutosCliente;
  onSituacao: (v: StatusFiltroProdutosCliente) => void;
  /** Opções em duas colunas a partir de `sm`. */
  grade?: boolean;
  /** Ajusta o texto de ajuda: contas a receber (cliente) ou a pagar (fornecedor). */
  tipoParceiro?: "cliente" | "fornecedor";
};

function Grupo<T extends string>({
  idPrefix,
  titulo,
  ajuda,
  value,
  onChange,
  labels,
  cores,
  grade,
}: {
  idPrefix: string;
  titulo: string;
  ajuda: string;
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
  cores: Record<T, string>;
  grade?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold text-[#1A3B70]">{titulo}</Label>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      </div>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as T)}
        className={cn(
          "space-y-2",
          grade && "sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0",
        )}
      >
        {(Object.keys(labels) as T[]).map((k) => {
          const id = `${idPrefix}-${k.toLowerCase()}`;
          return (
            <div key={k} className="flex items-center space-x-2">
              <RadioGroupItem value={k} id={id} />
              <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer flex-1">
                <Circle className={cn("w-3 h-3", cores[k])} />
                <span className="text-[#1A3B70]">{labels[k]}</span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

/** Status do pedido + situação financeira do relatório "Produtos por cliente". */
export function FiltrosStatusProdutosCliente({
  idPrefix,
  statusPedido,
  onStatusPedido,
  situacao,
  onSituacao,
  grade,
  tipoParceiro = "cliente",
}: Props) {
  const contas = tipoParceiro === "fornecedor" ? "contas a pagar" : "contas a receber";
  return (
    <>
      <Grupo
        idPrefix={`${idPrefix}-pedido`}
        titulo="Status do pedido"
        ajuda="O mesmo da listagem de Pedidos."
        value={statusPedido}
        onChange={onStatusPedido}
        labels={STATUS_PEDIDO_FILTRO_PRODUTOS_LABELS}
        cores={COR_STATUS_PEDIDO}
        grade={grade}
      />
      <Separator />
      <Grupo
        idPrefix={`${idPrefix}-financeiro`}
        titulo="Situação financeira"
        ajuda={`Pelas ${contas} do pedido. Pedido sem conta (não atendido) só aparece em “Todas”.`}
        value={situacao}
        onChange={onSituacao}
        labels={STATUS_FILTRO_PRODUTOS_LABELS}
        cores={COR_SITUACAO}
        grade={grade}
      />
    </>
  );
}
