/**
 * Dialog completo para criação de cliente
 */

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CondicaoPagamento } from "@/shared/types/condicao-pagamento.types";
import { Loader2, Plus, Users } from "lucide-react";
import { useState } from "react";
import {
    ClienteFormData,
    ContatoFormData,
    EnderecoFormData,
} from "../types/cliente.types";
import { ClienteFormStep1 } from "./ClienteFormStep1";
import { ClienteFormStep2 } from "./ClienteFormStep2";
import { ClienteFormStep3 } from "./ClienteFormStep3";
import { ClienteFormStep4 } from "./ClienteFormStep4";

interface ClienteCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    cliente: ClienteFormData;
    enderecos: EnderecoFormData[];
    contatos: ContatoFormData[];
    condicoesPagamento?: CondicaoPagamento[];
  }) => void;
  isPending?: boolean;
}

export const ClienteCreateDialog = ({
  open,
  onOpenChange,
  onCreate,
  isPending = false,
}: ClienteCreateDialogProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: apenas nome é obrigatório
  // Todos os outros campos são opcionais (valores padrão apenas para UI)
  const [formData, setFormData] = useState<ClienteFormData>({
    nome: "",
    nome_fantasia: "",
    nome_razao: "",
    tipoPessoa: "PESSOA_FISICA", // Valor padrão apenas para UI, não será enviado se não selecionado
    statusCliente: "ATIVO", // Valor padrão apenas para UI, não será enviado se não selecionado
    cpf_cnpj: "",
    inscricao_estadual: "",
    limite_credito: undefined,
  });
  // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: endereços e contatos são opcionais
  // Não criar arrays vazios por padrão - usuário adiciona se necessário
  const [enderecos, setEnderecos] = useState<EnderecoFormData[]>([]);
  const [contatos, setContatos] = useState<ContatoFormData[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);

  const handleFormDataChange = (data: Partial<ClienteFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = () => {
    onCreate({
      cliente: formData,
      enderecos,
      contatos,
      condicoesPagamento: condicoesPagamento.length > 0 ? condicoesPagamento : undefined,
    });
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      nome: "",
      nome_fantasia: "",
      nome_razao: "",
      tipoPessoa: "PESSOA_FISICA",
      statusCliente: "ATIVO",
      cpf_cnpj: "",
      inscricao_estadual: "",
      limite_credito: undefined,
    });
    setEnderecos([]);
    setContatos([]);
    setCondicoesPagamento([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="gradient" className="gap-2">
          <Plus className="w-4 h-4" />
          Criar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Novo Cliente</DialogTitle>
                <DialogDescription className="mt-1">
                  Passo {currentStep} de 4
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={(currentStep / 4) * 100} className="h-2" />
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Passo 1: Informações Básicas */}
          {currentStep === 1 && (
            <ClienteFormStep1
              formData={formData}
              onFormDataChange={handleFormDataChange}
              onPreencherEnderecos={setEnderecos}
              onPreencherContatos={setContatos}
            />
          )}

          {/* Passo 2: Condições de Pagamento */}
          {currentStep === 2 && (
            <ClienteFormStep4
              condicoesPagamento={condicoesPagamento}
              onCondicoesPagamentoChange={setCondicoesPagamento}
            />
          )}

          {/* Passo 3: Endereços */}
          {currentStep === 3 && (
            <ClienteFormStep2
              enderecos={enderecos}
              onEnderecosChange={setEnderecos}
            />
          )}

          {/* Passo 4: Contatos */}
          {currentStep === 4 && (
            <ClienteFormStep3
              contatos={contatos}
              onContatosChange={setContatos}
              totalEnderecos={enderecos.length}
            />
          )}

          {/* Botões de Navegação */}
          <div className="flex gap-3 pt-4 border-t">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
                className="flex-1"
              >
                Voltar
              </Button>
            )}
            {currentStep < 4 ? (
              <Button
                type="button"
                variant="gradient"
                onClick={handleNextStep}
                className="flex-1"
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="button"
                variant="gradient"
                onClick={handleCreate}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Finalizar Cadastro"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
