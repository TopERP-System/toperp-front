import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRotuloRoca } from "@/hooks/useRotuloRoca";
import {
  buildPatchContaFinanceira,
  mapContaApiParaEdicao,
  type ContaFinanceiraEdicaoForm,
} from "@/lib/conta-financeira-edicao";
import {
  Cliente,
  clientesService,
  extractClientesFromResponse,
} from "@/services/clientes.service";
import { controleRocaService } from "@/services/controle-roca.service";
import {
  CreateContaFinanceiraDto,
  financeiroService,
} from "@/services/financeiro.service";
import { Fornecedor, fornecedoresService } from "@/services/fornecedores.service";
import type { Roca } from "@/types/roca";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CreditCard,
  FileText,
  Info,
  Loader2,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type PedidoEdicaoOption = {
  id?: number;
  pedido_id?: number;
  numero_pedido?: string;
};

export type EditarContaFinanceiraDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: number | null;
  title?: string;
  description?: string;
  /** Oculta o seletor de tipo e força o tipo no PATCH */
  tipoFixo?: "RECEBER" | "PAGAR";
  /** Visão Geral: permite alternar Receita/Despesa */
  allowTipoChange?: boolean;
  clientes?: Cliente[];
  fornecedores?: Fornecedor[];
  pedidos?: PedidoEdicaoOption[];
  invalidateQueryKeys?: readonly (readonly unknown[])[];
  onSuccess?: () => void;
};

export function EditarContaFinanceiraDialog({
  open,
  onOpenChange,
  contaId,
  title = "Editar Conta Financeira",
  description = "Edite os campos desejados da conta financeira",
  tipoFixo,
  allowTipoChange = false,
  clientes: clientesProp = [],
  fornecedores: fornecedoresProp = [],
  pedidos = [],
  invalidateQueryKeys = [],
  onSuccess,
}: EditarContaFinanceiraDialogProps) {
  const rotulo = useRotuloRoca();
  const queryClient = useQueryClient();
  const [editConta, setEditConta] = useState<ContaFinanceiraEdicaoForm | null>(
    null,
  );

  const { data: contaSelecionada, isLoading: isLoadingConta } = useQuery({
    queryKey: ["conta-financeira", contaId],
    queryFn: async () => {
      if (!contaId) return null;
      return await financeiroService.buscarPorId(contaId);
    },
    enabled: open && contaId != null && contaId > 0,
    retry: false,
  });

  const { data: clientesFetched } = useQuery({
    queryKey: ["clientes", "editar-conta"],
    queryFn: async () => {
      const response = await clientesService.listar({
        limit: 500,
        statusCliente: "ATIVO",
      });
      return extractClientesFromResponse(response);
    },
    enabled: open && clientesProp.length === 0,
    retry: false,
  });

  const { data: fornecedoresFetched } = useQuery({
    queryKey: ["fornecedores", "editar-conta"],
    queryFn: async () => {
      const response = await fornecedoresService.listar({ limit: 500 });
      if (Array.isArray(response)) return response;
      if (Array.isArray((response as { fornecedores?: Fornecedor[] })?.fornecedores)) {
        return (response as { fornecedores: Fornecedor[] }).fornecedores;
      }
      if (Array.isArray((response as { data?: Fornecedor[] })?.data)) {
        return (response as { data: Fornecedor[] }).data;
      }
      return [];
    },
    enabled: open && fornecedoresProp.length === 0,
    retry: false,
  });

  const { data: rocasData } = useQuery({
    queryKey: ["editar-conta", "rocas-ativas"],
    queryFn: () => controleRocaService.listarRocas(undefined, false),
    enabled: open,
    retry: false,
  });

  const clientes = clientesProp.length > 0 ? clientesProp : (clientesFetched ?? []);
  const fornecedores =
    fornecedoresProp.length > 0 ? fornecedoresProp : (fornecedoresFetched ?? []);

  const rocasLista: Roca[] = Array.isArray(rocasData)
    ? rocasData
    : (rocasData as { rocas?: Roca[] })?.rocas ?? [];

  const isEditPrevisao = Boolean(
    contaSelecionada?.previsao ||
      contaSelecionada?.status === "PREVISAO" ||
      editConta?.previsao,
  );

  const showTipoSelector = allowTipoChange && !tipoFixo && !isEditPrevisao;

  useEffect(() => {
    if (
      !open ||
      !contaSelecionada ||
      contaId == null ||
      contaSelecionada.id !== contaId
    ) {
      return;
    }
    const mapped = mapContaApiParaEdicao(contaSelecionada);
    if (tipoFixo) {
      mapped.tipo = tipoFixo;
    }
    setEditConta(mapped);
  }, [contaSelecionada, open, contaId, tipoFixo]);

  useEffect(() => {
    if (!open) {
      setEditConta(null);
    }
  }, [open]);

  const pedidosSelect = useMemo(
    () =>
      pedidos.filter((pedido) => {
        const pedidoId = pedido.pedido_id ?? pedido.id;
        return pedidoId != null;
      }),
    [pedidos],
  );

  const updateContaMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateContaFinanceiraDto>;
    }) => financeiroService.atualizar(id, data),
    onSuccess: async () => {
      for (const key of invalidateQueryKeys) {
        await queryClient.invalidateQueries({ queryKey: [...key] });
      }
      if (contaId != null) {
        await queryClient.invalidateQueries({
          queryKey: ["conta-financeira", contaId],
        });
      }
      toast.success("Conta atualizada com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: {
          data?: { message?: string | string[]; error?: { message?: string } };
          status?: number;
        };
        message?: string;
      };
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(", ")
          : null) ||
        (err?.response?.status === 500
          ? "Erro interno do servidor. Verifique os dados e tente novamente."
          : "Erro ao atualizar conta");
      toast.error(
        typeof errorMessage === "string" ? errorMessage : "Erro ao atualizar conta",
      );
    },
  });

  const handleUpdate = () => {
    if (contaId == null || !editConta) return;

    if (isEditPrevisao) {
      if (
        !editConta.descricao?.trim() ||
        !editConta.valor_original ||
        !editConta.data_prevista
      ) {
        toast.error("Preencha descrição, valor e data prevista");
        return;
      }
      updateContaMutation.mutate({
        id: contaId,
        data: buildPatchContaFinanceira(editConta, { isPrevisao: true }),
      });
      return;
    }

    if (
      !editConta.descricao?.trim() ||
      !editConta.valor_original ||
      !editConta.data_vencimento
    ) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    updateContaMutation.mutate({
      id: contaId,
      data: buildPatchContaFinanceira(editConta, { tipoFixo }),
    });
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setEditConta(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {title}
                {isEditPrevisao ? (
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
                    Previsão
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
            {contaSelecionada && editConta ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const mapped = mapContaApiParaEdicao(contaSelecionada);
                    if (tipoFixo) mapped.tipo = tipoFixo;
                    setEditConta(mapped);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        {isLoadingConta ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : editConta ? (
          <div className="space-y-8 pt-6">
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Informações Básicas</h3>
                  <p className="text-sm text-muted-foreground">
                    Dados principais da conta
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Descrição *
                  </Label>
                  <Input
                    placeholder="Ex: Pedido VEND-2026-00001 - Parcela 1/4"
                    value={editConta.descricao}
                    onChange={(e) =>
                      setEditConta({ ...editConta, descricao: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showTipoSelector ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Tipo *</Label>
                      <Select
                        value={editConta.tipo}
                        onValueChange={(value: "RECEBER" | "PAGAR") =>
                          setEditConta({ ...editConta, tipo: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RECEBER">Receita</SelectItem>
                          <SelectItem value="PAGAR">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {isEditPrevisao ? "Valor previsto *" : "Valor Original *"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editConta.valor_original || ""}
                      onChange={(e) =>
                        setEditConta({
                          ...editConta,
                          valor_original: e.target.value
                            ? Number(e.target.value)
                            : 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ShoppingCart className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Relacionamentos</h3>
                  <p className="text-sm text-muted-foreground">
                    Cliente, fornecedor e pedido vinculados
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Cliente</Label>
                  <Select
                    value={
                      editConta.cliente_id != null
                        ? String(editConta.cliente_id)
                        : "none"
                    }
                    onValueChange={(value) =>
                      setEditConta({
                        ...editConta,
                        cliente_id:
                          value && value !== "none" ? Number(value) : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id.toString()}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Fornecedor</Label>
                  <Select
                    value={
                      editConta.fornecedor_id != null
                        ? String(editConta.fornecedor_id)
                        : "none"
                    }
                    onValueChange={(value) =>
                      setEditConta({
                        ...editConta,
                        fornecedor_id:
                          value && value !== "none" ? Number(value) : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {fornecedores.map((fornecedor) => (
                        <SelectItem
                          key={fornecedor.id}
                          value={fornecedor.id.toString()}
                        >
                          {fornecedor.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Pedido</Label>
                  <Select
                    value={
                      editConta.pedido_id != null
                        ? String(editConta.pedido_id)
                        : "none"
                    }
                    onValueChange={(value) =>
                      setEditConta({
                        ...editConta,
                        pedido_id:
                          value && value !== "none" ? Number(value) : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pedido" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {pedidosSelect.map((pedido) => {
                        const pedidoId = pedido.pedido_id ?? pedido.id!;
                        return (
                          <SelectItem key={pedidoId} value={String(pedidoId)}>
                            {pedido.numero_pedido || `PED-${pedidoId}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{rotulo.singular}</Label>
                  <Select
                    value={
                      editConta.roca_id != null ? String(editConta.roca_id) : "none"
                    }
                    onValueChange={(value) =>
                      setEditConta({
                        ...editConta,
                        roca_id:
                          value && value !== "none" ? Number(value) : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={rotulo.selecione} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {rocasLista
                        .filter((r) => r.ativo !== false)
                        .map((roca) => (
                          <SelectItem key={roca.id} value={String(roca.id)}>
                            {roca.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Calendar className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Datas</h3>
                  <p className="text-sm text-muted-foreground">
                    {isEditPrevisao
                      ? "Criação e data prevista de entrada"
                      : "Emissão, vencimento e pagamento"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Data de Emissão{isEditPrevisao ? "" : " *"}
                  </Label>
                  <Input
                    type="date"
                    value={editConta.data_emissao}
                    onChange={(e) =>
                      setEditConta({ ...editConta, data_emissao: e.target.value })
                    }
                  />
                </div>
                {isEditPrevisao ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-violet-700">
                      Data prevista *
                    </Label>
                    <Input
                      type="date"
                      className="border-violet-200 focus-visible:ring-violet-400"
                      value={editConta.data_prevista || ""}
                      onChange={(e) =>
                        setEditConta({
                          ...editConta,
                          data_prevista: e.target.value,
                        })
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Data de Vencimento *
                      </Label>
                      <Input
                        type="date"
                        value={editConta.data_vencimento}
                        onChange={(e) =>
                          setEditConta({
                            ...editConta,
                            data_vencimento: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Data de Pagamento
                      </Label>
                      <Input
                        type="date"
                        value={editConta.data_pagamento || ""}
                        onChange={(e) =>
                          setEditConta({
                            ...editConta,
                            data_pagamento: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <CreditCard className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Pagamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Forma de pagamento
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Forma de Pagamento</Label>
                <Select
                  value={editConta.forma_pagamento ?? "none"}
                  onValueChange={(value) =>
                    setEditConta({
                      ...editConta,
                      forma_pagamento:
                        value === "none"
                          ? undefined
                          : (value as ContaFinanceiraEdicaoForm["forma_pagamento"]),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gray-500/10">
                  <Info className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Observações</h3>
                  <p className="text-sm text-muted-foreground">
                    Informações adicionais sobre a transação
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Observações</Label>
                <Textarea
                  placeholder="Observações adicionais sobre a transação"
                  value={editConta.observacoes || ""}
                  onChange={(e) =>
                    setEditConta({
                      ...editConta,
                      observacoes: e.target.value || undefined,
                    })
                  }
                  rows={4}
                />
              </div>
            </div>

            <Button
              onClick={handleUpdate}
              className="w-full"
              variant="gradient"
              disabled={updateContaMutation.isPending}
            >
              {updateContaMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar Conta"
              )}
            </Button>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Carregando dados da conta...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
