import { FormSection } from '@/components/forms/FormSection';
import { ResumoCardSubmitButton, resumoHeaderClass } from '@/components/forms/ResumoCardSubmitButton';
import { ResumoScrollFollower } from '@/components/forms/ResumoScrollFollower';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClienteFormStep1,
  ClienteFormStep2,
  ClienteFormStep2Actions,
  ClienteFormStep3,
  ClienteFormStep3Actions,
  ClienteFormStep4,
  ClienteFormStep4Actions,
} from '@/features/clientes/components';
import {
  ClienteFormData,
  ContatoFormData,
  EnderecoFormData,
} from '@/features/clientes/types/cliente.types';
import { cn, formatCurrency } from '@/lib/utils';
import { CondicaoPagamento, FormaPagamento } from '@/shared/types/condicao-pagamento.types';
import { CreditCard, MapPin, Phone, User } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

export interface ClienteFormSubmitData {
  cliente: ClienteFormData;
  enderecos: EnderecoFormData[];
  contatos: ContatoFormData[];
  condicoesPagamento?: CondicaoPagamento[];
}

interface ClienteFormProps {
  onSubmit: (data: ClienteFormSubmitData) => void;
  isPending?: boolean;
}

const initialFormData: ClienteFormData = {
  nome: '',
  nome_fantasia: '',
  nome_razao: '',
  tipoPessoa: 'PESSOA_FISICA',
  statusCliente: 'ATIVO',
  cpf_cnpj: '',
  inscricao_estadual: '',
  limite_credito: undefined,
};

export default function ClienteForm({ onSubmit, isPending = false }: ClienteFormProps) {
  const [formData, setFormData] = useState<ClienteFormData>(initialFormData);
  const [enderecos, setEnderecos] = useState<EnderecoFormData[]>([]);
  const [contatos, setContatos] = useState<ContatoFormData[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);

  const tipo = formData.tipoPessoa || 'PESSOA_FISICA';
  const statusAtivo = (formData.statusCliente || 'ATIVO') === 'ATIVO';
  const nomeExibicao = useMemo(() => {
    if (tipo === 'PESSOA_JURIDICA') {
      return formData.nome_fantasia?.trim() || formData.nome_razao?.trim() || '—';
    }
    return formData.nome?.trim() || '—';
  }, [formData, tipo]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      cliente: formData,
      enderecos,
      contatos,
      condicoesPagamento: condicoesPagamento.length > 0 ? condicoesPagamento : undefined,
    });
  };

  const handleAddEndereco = () => {
    setEnderecos([
      ...enderecos,
      {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        referencia: '',
      },
    ]);
  };

  const handleAddContato = () => {
    setContatos([
      ...contatos,
      {
        telefone: '',
        email: '',
        nomeContato: '',
        outroTelefone: '',
        nomeOutroTelefone: '',
        observacao: '',
        ativo: true,
      },
    ]);
  };

  const handleAddCondicao = () => {
    setCondicoesPagamento([
      ...condicoesPagamento,
      {
        descricao: '',
        forma_pagamento: FormaPagamento.PIX,
        parcelado: false,
        padrao: condicoesPagamento.length === 0,
        prazo_dias: 0,
      },
    ]);
  };

  return (
    <form id="cliente-form-page" onSubmit={handleSubmit} className="space-y-6">
      <ClienteFormStep1
        formData={formData}
        onFormDataChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
        pageLayout
        showTipoSelection
        onlyTipoSelection
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="min-w-0 flex-1 space-y-6 pb-8">
          <FormSection
            icon={User}
            title="Informações básicas"
            description="Nome, documento, limite de crédito e status do cliente."
          >
            <ClienteFormStep1
              formData={formData}
              onFormDataChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
              onPreencherEnderecos={setEnderecos}
              onPreencherContatos={setContatos}
              showTipoSelection={false}
            />
          </FormSection>

          <FormSection
            icon={CreditCard}
            title="Condições de pagamento"
            description="Prazos e formas de pagamento padrão para pedidos deste cliente."
            action={<ClienteFormStep4Actions onAdd={handleAddCondicao} />}
          >
            <ClienteFormStep4
              condicoesPagamento={condicoesPagamento}
              onCondicoesPagamentoChange={setCondicoesPagamento}
              embedded
            />
          </FormSection>

          <FormSection
            icon={MapPin}
            title="Endereços"
            description="Localizações de entrega ou correspondência."
            action={<ClienteFormStep2Actions onAdd={handleAddEndereco} />}
          >
            <ClienteFormStep2
              enderecos={enderecos}
              onEnderecosChange={setEnderecos}
              embedded
            />
          </FormSection>

          <FormSection
            icon={Phone}
            title="Contatos"
            description="Telefones, e-mails e pessoas de contato."
            action={<ClienteFormStep3Actions onAdd={handleAddContato} />}
          >
            <ClienteFormStep3
              contatos={contatos}
              onContatosChange={setContatos}
              totalEnderecos={enderecos.length}
              embedded
            />
          </FormSection>
        </div>

        <aside className="w-full shrink-0 lg:w-[280px] lg:self-stretch xl:w-[320px]">
          <ResumoScrollFollower>
            <Card className="overflow-hidden border-border/60 shadow-md transition-shadow duration-300 hover:shadow-lg">
              <div className={cn('px-5 py-4 text-white', resumoHeaderClass(statusAtivo))}>
                <p className="text-xs font-medium uppercase tracking-wider opacity-90">Resumo</p>
                <p className="mt-1 text-lg font-semibold">
                  {tipo === 'PESSOA_JURIDICA' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </p>
                <p className="mt-3 truncate text-xl font-bold tracking-tight">{nomeExibicao}</p>
              </div>
              <CardContent className="space-y-3 p-5 pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{formData.statusCliente || 'ATIVO'}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Documento</span>
                    <span className="max-w-[55%] truncate text-right font-medium">
                      {formData.cpf_cnpj?.trim() || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Endereços</span>
                    <span className="font-medium">{enderecos.length}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Contatos</span>
                    <span className="font-medium">{contatos.length}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Condições</span>
                    <span className="font-medium">{condicoesPagamento.length}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Limite</span>
                    <span className="font-medium">
                      {formData.limite_credito != null && formData.limite_credito >= 0
                        ? formatCurrency(formData.limite_credito)
                        : 'Sem limite'}
                    </span>
                  </div>
                </div>
                <ResumoCardSubmitButton
                  label="Criar Cliente"
                  pendingLabel="Cadastrando..."
                  isPending={isPending}
                />
              </CardContent>
            </Card>
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Campos marcados com * são obrigatórios. Revise os dados antes de salvar.
            </p>
          </ResumoScrollFollower>
        </aside>
      </div>
    </form>
  );
}
