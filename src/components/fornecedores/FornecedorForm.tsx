import { FormSection } from '@/components/forms/FormSection';
import { ResumoCardSubmitButton, resumoHeaderClass } from '@/components/forms/ResumoCardSubmitButton';
import { ResumoScrollFollower } from '@/components/forms/ResumoScrollFollower';
import { Card, CardContent } from '@/components/ui/card';
import { FornecedorFormStep1 } from '@/features/fornecedores/components/FornecedorFormStep1';
import {
  FornecedorFormStep2,
  FornecedorFormStep2Actions,
} from '@/features/fornecedores/components/FornecedorFormStep2';
import {
  FornecedorFormStep3,
  FornecedorFormStep3Actions,
} from '@/features/fornecedores/components/FornecedorFormStep3';
import {
  ContatoFormData,
  EnderecoFormData,
  FornecedorFormData,
} from '@/features/fornecedores/types/fornecedor.types';
import { cn } from '@/lib/utils';
import { MapPin, Phone, Truck } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

export interface FornecedorFormSubmitData {
  fornecedor: FornecedorFormData;
  enderecos: EnderecoFormData[];
  contatos: ContatoFormData[];
}

interface FornecedorFormProps {
  onSubmit: (data: FornecedorFormSubmitData) => void;
  isPending?: boolean;
}

const initialFormData: FornecedorFormData = {
  nome_fantasia: '',
  tipoFornecedor: 'PESSOA_JURIDICA',
  statusFornecedor: 'ATIVO',
  cpf_cnpj: '',
  inscricao_estadual: '',
};

export default function FornecedorForm({ onSubmit, isPending = false }: FornecedorFormProps) {
  const [formData, setFormData] = useState<FornecedorFormData>(initialFormData);
  const [enderecos, setEnderecos] = useState<EnderecoFormData[]>([]);
  const [contatos, setContatos] = useState<ContatoFormData[]>([]);

  const tipo = formData.tipoFornecedor || 'PESSOA_JURIDICA';
  const statusAtivo = (formData.statusFornecedor || 'ATIVO') === 'ATIVO';
  const nomeExibicao = useMemo(
    () => formData.nome_fantasia?.trim() || '—',
    [formData.nome_fantasia],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ fornecedor: formData, enderecos, contatos });
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

  return (
    <form id="fornecedor-form-page" onSubmit={handleSubmit} className="space-y-6">
      <FornecedorFormStep1
        formData={formData}
        onFormDataChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
        pageLayout
        showTipoSelection
        onlyTipoSelection
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="min-w-0 flex-1 space-y-6 pb-8">
          <FormSection
            icon={Truck}
            title="Informações básicas"
            description="Nome fantasia, documento, inscrição estadual e status."
          >
            <FornecedorFormStep1
              formData={formData}
              onFormDataChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
              onPreencherEnderecos={setEnderecos}
              onPreencherContatos={setContatos}
              showTipoSelection={false}
            />
          </FormSection>

          <FormSection
            icon={MapPin}
            title="Endereços"
            description="Localizações do fornecedor."
            action={
              <FornecedorFormStep2Actions onAdd={handleAddEndereco} />
            }
          >
            <FornecedorFormStep2
              enderecos={enderecos}
              onEnderecosChange={setEnderecos}
              embedded
            />
          </FormSection>

          <FormSection
            icon={Phone}
            title="Contatos"
            description="Telefones e e-mails para comunicação."
            action={<FornecedorFormStep3Actions onAdd={handleAddContato} />}
          >
            <FornecedorFormStep3
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
                    <span className="font-medium">{formData.statusFornecedor || 'ATIVO'}</span>
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
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Contatos</span>
                    <span className="font-medium">{contatos.length}</span>
                  </div>
                </div>
                <ResumoCardSubmitButton
                  label="Criar Fornecedor"
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
