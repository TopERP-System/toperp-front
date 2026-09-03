import { CampoCnpjComConsulta } from '@/components/CampoCnpjComConsulta';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { cleanDocument, formatCEP, formatCPF, formatTelefone } from '@/lib/validators';
import { ConsultaCnpjResponse } from '@/services/cnpj.service';
import { Building2, Circle, FileText, Hash, User } from 'lucide-react';
import {
  ContatoFormData,
  EnderecoFormData,
  FornecedorFormData,
} from '../types/fornecedor.types';

interface FornecedorFormStep1Props {
  formData: FornecedorFormData;
  onFormDataChange: (data: Partial<FornecedorFormData>) => void;
  onPreencherEnderecos?: (enderecos: EnderecoFormData[]) => void;
  onPreencherContatos?: (contatos: ContatoFormData[]) => void;
  showTipoSelection?: boolean;
  pageLayout?: boolean;
  onlyTipoSelection?: boolean;
}

export function FornecedorFormStep1({
  formData,
  onFormDataChange,
  onPreencherEnderecos,
  onPreencherContatos,
  showTipoSelection = true,
  pageLayout = false,
  onlyTipoSelection = false,
}: FornecedorFormStep1Props) {
  const tipo = formData.tipoFornecedor || 'PESSOA_JURIDICA';

  const handleTipoChange = (novoTipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA') => {
    onFormDataChange({
      tipoFornecedor: novoTipo,
      cpf_cnpj: tipo !== novoTipo ? '' : formData.cpf_cnpj,
      nome_fantasia:
        novoTipo === 'PESSOA_FISICA' && tipo === 'PESSOA_JURIDICA'
          ? ''
          : formData.nome_fantasia,
    });
  };

  const handlePreencherCamposCnpj = (dados: ConsultaCnpjResponse) => {
    if (dados.nomeFantasia) {
      onFormDataChange({ nome_fantasia: dados.nomeFantasia });
    }
    onFormDataChange({ tipoFornecedor: 'PESSOA_JURIDICA' });
    if (dados.inscricaoEstadual) {
      onFormDataChange({ inscricao_estadual: dados.inscricaoEstadual });
    }
    if ((dados.logradouro || dados.cep || dados.cidade) && onPreencherEnderecos) {
      onPreencherEnderecos([
        {
          cep: dados.cep ? formatCEP(dados.cep) : '',
          logradouro: dados.logradouro || '',
          numero: dados.numero || '',
          complemento: '',
          bairro: dados.bairro || '',
          cidade: dados.cidade || '',
          estado: dados.uf || '',
          referencia: '',
        },
      ]);
    }
    if (dados.telefones?.length && onPreencherContatos) {
      onPreencherContatos([
        {
          telefone: formatTelefone(dados.telefones[0]),
          email: '',
          nomeContato: '',
          outroTelefone: '',
          nomeOutroTelefone: '',
          observacao: '',
          ativo: true,
        },
      ]);
    }
  };

  const cardClass = (selected: boolean, color: 'blue' | 'emerald') =>
    cn(
      'group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
      selected
        ? color === 'blue'
          ? 'border-blue-500/60 bg-blue-500/10 shadow-sm'
          : 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
        : 'border-border/60 bg-card hover:border-primary/30',
    );

  const iconWrapClass = (selected: boolean, color: 'blue' | 'emerald') =>
    cn(
      'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
      selected
        ? color === 'blue'
          ? 'bg-blue-500 text-white'
          : 'bg-emerald-500 text-white'
        : 'bg-muted text-muted-foreground group-hover:bg-primary/15',
    );

  return (
    <div className="space-y-4">
      {showTipoSelection && (
        <div className={pageLayout ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'grid grid-cols-2 gap-4'}>
          {(
            [
              { value: 'PESSOA_JURIDICA' as const, label: 'Pessoa Jurídica', sub: 'CNPJ', icon: Building2, color: 'blue' as const },
              { value: 'PESSOA_FISICA' as const, label: 'Pessoa Física', sub: 'CPF', icon: User, color: 'emerald' as const },
            ] as const
          ).map(({ value, label, sub, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTipoChange(value)}
              className={pageLayout ? cardClass(tipo === value, color) : cn(
                'relative rounded-lg border-2 p-6 transition-all',
                tipo === value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50',
              )}
            >
              {pageLayout ? (
                <>
                  <div className={iconWrapClass(tipo === value, color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Icon className={cn('h-8 w-8', tipo === value ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="text-center">
                    <p className={cn('font-semibold', tipo === value ? 'text-primary' : 'text-foreground')}>{label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {onlyTipoSelection ? null : (
        <>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Nome Fantasia <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="Nome Fantasia"
          value={formData.nome_fantasia || ''}
          onChange={(e) => onFormDataChange({ nome_fantasia: e.target.value })}
          required
          className={pageLayout ? 'rounded-xl' : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          {tipo === 'PESSOA_FISICA' ? 'CPF' : 'CNPJ'}
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </Label>
        {tipo === 'PESSOA_JURIDICA' ? (
          <CampoCnpjComConsulta
            value={formData.cpf_cnpj || ''}
            onChange={(value) => onFormDataChange({ cpf_cnpj: value })}
            tipoConsulta="fornecedor"
            onPreencherCampos={handlePreencherCamposCnpj}
            placeholder="00.000.000/0000-00"
          />
        ) : (
          <Input
            placeholder="000.000.000-00"
            value={formData.cpf_cnpj || ''}
            onChange={(e) => {
              const cleaned = cleanDocument(e.target.value).slice(0, 11);
              let formatted = cleaned;
              if (cleaned.length === 11) formatted = formatCPF(cleaned);
              else if (cleaned.length > 0) {
                formatted = cleaned
                  .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
                  .replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3')
                  .replace(/^(\d{3})(\d{3})$/, '$1.$2')
                  .replace(/^(\d{3})$/, '$1');
              }
              onFormDataChange({ cpf_cnpj: formatted });
            }}
            className={pageLayout ? 'rounded-xl' : undefined}
          />
        )}
        {tipo === 'PESSOA_JURIDICA' &&
          formData.cpf_cnpj &&
          cleanDocument(formData.cpf_cnpj).length > 0 &&
          cleanDocument(formData.cpf_cnpj).length !== 14 && (
            <p className="text-xs text-destructive">CNPJ deve ter 14 dígitos.</p>
          )}
        {tipo === 'PESSOA_FISICA' &&
          formData.cpf_cnpj &&
          cleanDocument(formData.cpf_cnpj).length > 0 &&
          cleanDocument(formData.cpf_cnpj).length !== 11 && (
            <p className="text-xs text-destructive">CPF deve ter 11 dígitos.</p>
          )}
      </div>

      {tipo === 'PESSOA_JURIDICA' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            Inscrição Estadual
          </Label>
          <Input
            placeholder="000.000.000.000"
            value={formData.inscricao_estadual || ''}
            onChange={(e) => onFormDataChange({ inscricao_estadual: e.target.value })}
            className={pageLayout ? 'rounded-xl' : undefined}
          />
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-sm font-semibold">Status Inicial</Label>
        <div className="grid grid-cols-2 gap-4">
          {(['ATIVO', 'INATIVO'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onFormDataChange({ statusFornecedor: status })}
              className={cn(
                'flex items-center gap-3 rounded-lg border-2 p-4 transition-all',
                (formData.statusFornecedor || 'ATIVO') === status
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50',
              )}
            >
              <Circle
                className={cn(
                  'h-4 w-4',
                  status === 'ATIVO' && (formData.statusFornecedor || 'ATIVO') === 'ATIVO'
                    ? 'fill-green-500 text-green-500'
                    : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'font-medium',
                  (formData.statusFornecedor || 'ATIVO') === status ? 'text-primary' : 'text-foreground',
                )}
              >
                {status === 'ATIVO' ? 'Ativo' : 'Inativo'}
              </span>
            </button>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
