/**
 * Componente do Passo 1 do formulário de cliente
 * Informações Básicas
 */

import { CampoCnpjComConsulta } from "@/components/CampoCnpjComConsulta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanDocument, formatCEP, formatCNPJ, formatCPF, formatTelefone } from "@/lib/validators";
import { ConsultaCnpjResponse } from "@/services/cnpj.service";
import { Building2, Check, Circle, DollarSign, FileText, Hash, User } from "lucide-react";
import { useEffect, useState } from "react";
import { ClienteFormData, ContatoFormData, EnderecoFormData } from "../types/cliente.types";
import { cn } from "@/lib/utils";

interface ClienteFormStep1Props {
  formData: ClienteFormData;
  onFormDataChange: (data: Partial<ClienteFormData>) => void;
  onPreencherEnderecos?: (enderecos: EnderecoFormData[]) => void;
  onPreencherContatos?: (contatos: ContatoFormData[]) => void;
  showTipoSelection?: boolean;
  pageLayout?: boolean;
  onlyTipoSelection?: boolean;
}

export const ClienteFormStep1 = ({
  formData,
  onFormDataChange,
  onPreencherEnderecos,
  onPreencherContatos,
  showTipoSelection = true,
  pageLayout = false,
  onlyTipoSelection = false,
}: ClienteFormStep1Props) => {
  // Estado local para o valor do input de limite de crédito (permite digitação livre)
  const [limiteCreditoInput, setLimiteCreditoInput] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Sincroniza o estado local quando formData.limite_credito mudar externamente (apenas se não estiver focado)
  useEffect(() => {
    if (!isFocused && formData.limite_credito !== undefined && !isNaN(formData.limite_credito)) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(formData.limite_credito);
      setLimiteCreditoInput(formatted.replace('R$', '').trim());
    } else if (!isFocused && formData.limite_credito === undefined) {
      setLimiteCreditoInput('');
    }
  }, [formData.limite_credito, isFocused]);

  const handleTipoPessoaChange = (tipo: "PESSOA_FISICA" | "PESSOA_JURIDICA") => {
    onFormDataChange({
      tipoPessoa: tipo,
      cpf_cnpj: "", // Limpa o campo ao mudar o tipo
    });
  };

  const handleCPFCNPJChange = (value: string) => {
    const cleaned = cleanDocument(value);
    const tipoPessoa = formData.tipoPessoa || "PESSOA_FISICA"; // Default se não informado
    const maxLength = tipoPessoa === "PESSOA_FISICA" ? 11 : 14;
    const limited = cleaned.slice(0, maxLength);

    let formatted = limited;
    if (tipoPessoa === "PESSOA_FISICA" && limited.length === 11) {
      formatted = formatCPF(limited);
    } else if (tipoPessoa === "PESSOA_JURIDICA" && limited.length === 14) {
      formatted = formatCNPJ(limited);
    } else if (limited.length > 0) {
      if (tipoPessoa === "PESSOA_FISICA") {
        formatted = limited
          .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
          .replace(/^(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3")
          .replace(/^(\d{3})(\d{3})$/, "$1.$2")
          .replace(/^(\d{3})$/, "$1");
      } else {
        formatted = limited
          .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
          .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "$1.$2.$3/$4")
          .replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3")
          .replace(/^(\d{2})(\d{3})$/, "$1.$2")
          .replace(/^(\d{2})$/, "$1");
      }
    }

    onFormDataChange({ cpf_cnpj: formatted });
  };

  const handleNomeChange = (value: string) => {
    // Conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md: apenas nome é obrigatório
    // Se tipoPessoa não estiver definido ou for PF, usar nome
    // Se for PJ, usar nome_razao
    const tipoPessoa = formData.tipoPessoa || "PESSOA_FISICA";
    if (tipoPessoa === "PESSOA_JURIDICA") {
      // Para Pessoa Jurídica, o campo "Razão Social" deve ser enviado como nome_razao
      // NÃO enviar campo nome para Pessoa Jurídica
      onFormDataChange({
        nome_razao: value, // Campo principal que será enviado ao backend
      });
    } else {
      // Para Pessoa Física ou não informado, usar apenas nome
      onFormDataChange({ nome: value });
    }
  };

  const handleLimiteCreditoChange = (value: string) => {
    // Remove tudo exceto números
    const apenasNumeros = value.replace(/\D/g, '');
    
    // Se estiver vazio, limpa o valor
    if (apenasNumeros === '') {
      setLimiteCreditoInput('');
      onFormDataChange({ limite_credito: undefined });
      return;
    }
    
    // Converte para número (em centavos para depois dividir)
    const valorEmCentavos = parseInt(apenasNumeros, 10);
    const valorDecimal = valorEmCentavos / 100;
    
    // Atualiza o valor numérico
    onFormDataChange({ limite_credito: valorDecimal });
    
    // Formata visualmente enquanto digita (formato brasileiro)
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valorDecimal);
    
    // Atualiza o input com a formatação visual
    setLimiteCreditoInput(formatted);
  };

  const handleLimiteCreditoBlur = () => {
    setIsFocused(false);
    // Mantém a formatação visual quando sair do campo
    const value = formData.limite_credito;
    if (value !== undefined && !isNaN(value) && value >= 0) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      setLimiteCreditoInput(formatted);
    } else {
      setLimiteCreditoInput('');
    }
  };

  const handleLimiteCreditoFocus = () => {
    setIsFocused(true);
    // Mantém a formatação visual mesmo quando focado
    if (formData.limite_credito !== undefined && !isNaN(formData.limite_credito)) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(formData.limite_credito);
      setLimiteCreditoInput(formatted);
    } else {
      setLimiteCreditoInput('');
    }
  };

  return (
    <div className="space-y-4">
      {showTipoSelection && (
        <div className={pageLayout ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'space-y-3'}>
          {!pageLayout && (
            <Label className="text-sm font-semibold">Tipo de Cliente</Label>
          )}
          <div className={pageLayout ? 'contents' : 'grid grid-cols-2 gap-4'}>
          {(
            [
              { value: 'PESSOA_JURIDICA' as const, label: 'Pessoa Jurídica', sub: 'CNPJ', icon: Building2, color: 'blue' as const },
              { value: 'PESSOA_FISICA' as const, label: 'Pessoa Física', sub: 'CPF', icon: User, color: 'emerald' as const },
            ] as const
          ).map(({ value, label, sub, icon: Icon, color }) => {
            const selected = (formData.tipoPessoa || 'PESSOA_FISICA') === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTipoPessoaChange(value)}
                className={
                  pageLayout
                    ? cn(
                        'group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                        selected
                          ? color === 'blue'
                            ? 'border-blue-500/60 bg-blue-500/10 shadow-sm'
                            : 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                          : 'border-border/60 bg-card hover:border-primary/30',
                      )
                    : cn(
                        'relative rounded-lg border-2 p-6 transition-all',
                        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50',
                      )
                }
              >
                {pageLayout ? (
                  <>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                        selected
                          ? color === 'blue'
                            ? 'bg-blue-500 text-white'
                            : 'bg-emerald-500 text-white'
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/15',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </>
                ) : (
                  <>
                    {selected && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-3">
                      <Icon className={cn('w-8 h-8', selected ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="text-center">
                        <p className={cn('font-semibold', selected ? 'text-primary' : 'text-foreground')}>{label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                      </div>
                    </div>
                  </>
                )}
              </button>
            );
          })}
          </div>
        </div>
      )}

      {onlyTipoSelection ? null : (
        <>
      {/* Nome Fantasia - Apenas para Pessoa Jurídica (PRIMEIRO) - Obrigatório conforme GUIA_FRONTEND_NOME_FANTASIA_RAZAO_SOCIAL.md */}
      {(formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_JURIDICA" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Nome Fantasia <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Nome fantasia da empresa"
            value={formData.nome_fantasia || ""}
            onChange={(e) => onFormDataChange({ nome_fantasia: e.target.value })}
          />
        </div>
      )}

      {/* Nome / Razão Social (SEGUNDO) - Para PJ: Razão Social opcional; para PF: Nome obrigatório */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          {(formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_JURIDICA" ? (
            <>Razão Social <span className="text-xs text-muted-foreground">(opcional)</span></>
          ) : (
            <>Nome <span className="text-destructive">*</span></>
          )}
        </Label>
        <Input
          placeholder={
            (formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_JURIDICA"
              ? "Razão Social da Empresa"
              : "Nome do cliente"
          }
          value={
            (formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_JURIDICA"
              ? formData.nome_razao || formData.nome || ""
              : formData.nome || ""
          }
          onChange={(e) => handleNomeChange(e.target.value)}
        />
      </div>

      {/* CPF/CNPJ - Opcional conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-muted-foreground" />
          {(formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_FISICA" ? "CPF" : "CNPJ"}
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </Label>
        {(formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_JURIDICA" ? (
          // Campo CNPJ com consulta para Pessoa Jurídica
          <CampoCnpjComConsulta
            value={formData.cpf_cnpj || ""}
            onChange={(value) => handleCPFCNPJChange(value)}
            tipoConsulta="cliente"
            placeholder="00.000.000/0000-00"
            onPreencherCampos={(dados: ConsultaCnpjResponse) => {
              // Preencher nome fantasia
              if (dados.nomeFantasia) {
                onFormDataChange({
                  nome_fantasia: dados.nomeFantasia,
                });
              }

              // Preencher razão social
              if (dados.razaoSocial) {
                onFormDataChange({
                  nome_razao: dados.razaoSocial,
                });
              }

              // Definir tipo como Pessoa Jurídica
              onFormDataChange({
                tipoPessoa: "PESSOA_JURIDICA",
              });

              // Preencher inscrição estadual
              if (dados.inscricaoEstadual) {
                onFormDataChange({
                  inscricao_estadual: dados.inscricaoEstadual,
                });
              }

              // Preencher endereço se houver dados (com formatação visual)
              if ((dados.logradouro || dados.cep || dados.cidade) && onPreencherEnderecos) {
                // Formatar CEP visualmente
                const cepFormatado = dados.cep ? formatCEP(dados.cep) : "";
                
                const novoEndereco: EnderecoFormData = {
                  cep: cepFormatado,
                  logradouro: dados.logradouro || "",
                  numero: dados.numero || "",
                  complemento: "",
                  bairro: dados.bairro || "",
                  cidade: dados.cidade || "",
                  estado: dados.uf || "",
                  referencia: "",
                };
                onPreencherEnderecos([novoEndereco]);
              }

              // Preencher contato se houver telefone (com formatação visual)
              if (dados.telefones && dados.telefones.length > 0 && onPreencherContatos) {
                // Formatar telefone visualmente
                const telefoneFormatado = formatTelefone(dados.telefones[0]);
                
                const novoContato: ContatoFormData = {
                  telefone: telefoneFormatado,
                  email: "",
                  nomeContato: "",
                  outroTelefone: "",
                  nomeOutroTelefone: "",
                  observacao: "",
                  ativo: true,
                };
                onPreencherContatos([novoContato]);
              }
            }}
          />
        ) : (
          // Campo CPF simples para Pessoa Física
          <Input
            placeholder="000.000.000-00"
            value={formData.cpf_cnpj || ""}
            onChange={(e) => handleCPFCNPJChange(e.target.value)}
          />
        )}
        {/* Mensagem de validação em tempo real */}
        {(formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_JURIDICA" &&
          formData.cpf_cnpj &&
          cleanDocument(formData.cpf_cnpj).length > 0 &&
          cleanDocument(formData.cpf_cnpj).length !== 14 && (
            <p className="text-xs text-destructive mt-1">
              CNPJ deve ter 14 dígitos.
            </p>
          )}
        {(formData.tipoPessoa || "PESSOA_FISICA") === "PESSOA_FISICA" &&
          formData.cpf_cnpj &&
          cleanDocument(formData.cpf_cnpj).length > 0 &&
          cleanDocument(formData.cpf_cnpj).length !== 11 && (
            <p className="text-xs text-destructive mt-1">
              CPF deve ter 11 dígitos.
            </p>
          )}
      </div>

      {/* Inscrição Estadual - Opcional (PJ e PF / produtor rural) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-muted-foreground" />
          Inscrição Estadual (IE)
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          placeholder="000.000.000.000"
          value={formData.inscricao_estadual || ""}
          onChange={(e) =>
            onFormDataChange({ inscricao_estadual: e.target.value })
          }
        />
      </div>

      {/* Limite de Crédito - Mesmo design da seção de edição */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          Limite de Crédito
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </Label>
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">R$</span>
            <Input
              type="text"
              placeholder="0,00"
              value={limiteCreditoInput}
              onChange={(e) => handleLimiteCreditoChange(e.target.value)}
              onBlur={handleLimiteCreditoBlur}
              onFocus={handleLimiteCreditoFocus}
              className="pl-9 h-11 text-base font-medium border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor máximo de crédito disponível para este cliente. Deixe em branco para sem limite.
          </p>
        </div>
      </div>

      {/* Status Inicial - Opcional conforme GUIA_FRONTEND_CAMPOS_OPCIONAIS.md */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Status Inicial <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onFormDataChange({ statusCliente: "ATIVO" })}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              (formData.statusCliente || "ATIVO") === "ATIVO"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <Circle
              className={`w-4 h-4 ${
                (formData.statusCliente || "ATIVO") === "ATIVO"
                  ? "text-green-500 fill-green-500"
                  : "text-muted-foreground"
              }`}
            />
            <span
              className={`font-medium ${
                (formData.statusCliente || "ATIVO") === "ATIVO"
                  ? "text-primary"
                  : "text-foreground"
              }`}
            >
              Ativo
            </span>
          </button>
          <button
            type="button"
            onClick={() => onFormDataChange({ statusCliente: "INATIVO" })}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              formData.statusCliente === "INATIVO"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <Circle
              className={`w-4 h-4 ${
                formData.statusCliente === "INATIVO"
                  ? "text-muted-foreground fill-muted-foreground"
                  : "text-muted-foreground"
              }`}
            />
            <span
              className={`font-medium ${
                formData.statusCliente === "INATIVO"
                  ? "text-primary"
                  : "text-foreground"
              }`}
            >
              Inativo
            </span>
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

