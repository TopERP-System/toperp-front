import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCEP, formatCNPJ, formatTelefone } from '@/lib/validators';
import { CreateTransportadoraDto, Transportadora } from '@/types/carrier';
import { Building2, Circle, FileText, Hash, Info, Loader2, Mail, MapPin, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CarrierFormProps {
  /** Controla visibilidade do modal */
  isOpen: boolean;
  
  /** Callback ao fechar */
  onClose: () => void;
  
  /** Callback ao submeter formulário */
  onSubmit: (data: CreateTransportadoraDto) => void;
  
  /** Transportadora para edição (null = criação) */
  carrier?: Transportadora | null;
  
  /** Se está processando */
  isPending?: boolean;
}

export function CarrierForm({
  isOpen,
  onClose,
  onSubmit,
  carrier,
  isPending = false,
}: CarrierFormProps) {
  const [formData, setFormData] = useState<CreateTransportadoraDto & { contato?: string }>({
    nome: '',
    contato: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    telefone: '',
    email: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    ativo: true,
    observacoes: '',
  });

  const [contatoError, setContatoError] = useState<string>('');
  const [telefoneError, setTelefoneError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  useEffect(() => {
    if (carrier) {
      setFormData({
        nome: carrier.nome || '',
        contato: carrier.contato || '',
        nome_fantasia: carrier.nome_fantasia || '',
        cnpj: carrier.cnpj || '',
        inscricao_estadual: carrier.inscricao_estadual || '',
        telefone: carrier.telefone || '',
        email: carrier.email || '',
        cep: carrier.cep || '',
        logradouro: carrier.logradouro || '',
        numero: carrier.numero || '',
        complemento: carrier.complemento || '',
        bairro: carrier.bairro || '',
        cidade: carrier.cidade || '',
        estado: carrier.estado || '',
        ativo: carrier.ativo ?? true,
        observacoes: carrier.observacoes || '',
      });
    } else {
      // Reset form
      setFormData({
        nome: '',
        contato: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        telefone: '',
        email: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        ativo: true,
        observacoes: '',
      });
    }
  }, [carrier, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContatoError('');
    setTelefoneError('');
    setEmailError('');
    
    // Validação básica
    if (!formData.nome || formData.nome.trim().length < 3) {
      return;
    }

    // Validação de contato (obrigatório na criação, opcional na edição)
    if (!carrier) {
      const contatoVal = (formData.contato || '').trim();
      if (!contatoVal) {
        setContatoError('O contato é obrigatório.');
        toast.error('O contato é obrigatório.');
        return;
      }
      if (contatoVal.length > 255) {
        setContatoError('O contato deve ter entre 1 e 255 caracteres.');
        toast.error('O contato deve ter entre 1 e 255 caracteres.');
        return;
      }
    } else {
      const contatoVal = (formData.contato || '').trim();
      if (contatoVal && contatoVal.length > 255) {
        setContatoError('O contato deve ter entre 1 e 255 caracteres.');
        toast.error('O contato deve ter entre 1 e 255 caracteres.');
        return;
      }
    }

    // Validação de telefone e e-mail (obrigatórios)
    const telefoneVal = (formData.telefone || '').replace(/\D/g, '');
    if (telefoneVal.length < 10) {
      setTelefoneError('O telefone é obrigatório (mínimo 10 dígitos).');
      toast.error('O telefone é obrigatório (mínimo 10 dígitos).');
      return;
    }

    const emailVal = (formData.email || '').trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailVal) {
      setEmailError('O e-mail é obrigatório.');
      toast.error('O e-mail é obrigatório.');
      return;
    }
    if (!emailRegex.test(emailVal)) {
      setEmailError('Digite um e-mail válido.');
      toast.error('Digite um e-mail válido.');
      return;
    }

    const contatoTrimmed = (formData.contato ?? '').trim();
    const payload: CreateTransportadoraDto = {
      ...formData,
      contato: contatoTrimmed, // Obrigatório na criação (já validado), opcional na edição (backend ignora se vazio)
    };

    // Validação de CNPJ conforme GUIA_FRONTEND_CORRECOES_BACKEND.md
    if (formData.cnpj) {
      const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        return;
      }
      payload.cnpj = cnpjLimpo;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {carrier ? 'Editar Transportadora' : 'Nova Transportadora'}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {carrier
              ? 'Atualize as informações da transportadora no sistema'
              : 'Preencha os dados para criar uma nova transportadora'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 pt-6">
          {/* Seção: Informações Básicas */}
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Building2 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Informações Básicas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Dados principais da transportadora
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Nome/Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Nome da transportadora"
                  required
                  minLength={3}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Nome Fantasia
                </Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_fantasia: e.target.value })
                  }
                  placeholder="Nome fantasia (opcional)"
                  maxLength={255}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    CNPJ
                  </Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj || ''}
                    onChange={(e) => {
                      // Remove tudo que não é número
                      const apenasNumeros = e.target.value.replace(/\D/g, '');
                      // Limita a 14 dígitos
                      const limitado = apenasNumeros.slice(0, 14);
                      // Formata apenas para exibição
                      const formatted = formatCNPJ(limitado);
                      setFormData({ ...formData, cnpj: formatted });
                    }}
                    placeholder="12345678000190"
                    maxLength={18}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite apenas números (14 dígitos)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    Inscrição Estadual
                  </Label>
                  <Input
                    id="inscricao_estadual"
                    value={formData.inscricao_estadual || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        inscricao_estadual: e.target.value,
                      })
                    }
                    placeholder="Inscrição estadual (opcional)"
                    maxLength={50}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Contato */}
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Phone className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Contato
                </h3>
                <p className="text-sm text-muted-foreground">
                  Informações de contato da transportadora
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Nome do contato {!carrier && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="contato"
                  value={formData.contato || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, contato: e.target.value });
                    setContatoError('');
                  }}
                  placeholder="Ex.: João Silva"
                  maxLength={255}
                  className={contatoError ? 'border-destructive' : ''}
                />
                {contatoError && (
                  <p className="text-sm text-destructive">{contatoError}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Telefone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="telefone"
                    value={formData.telefone || ''}
                    onChange={(e) => {
                      const formatted = formatTelefone(e.target.value);
                      setFormData({ ...formData, telefone: formatted });
                      setTelefoneError('');
                    }}
                    placeholder="(00) 00000-0000"
                    maxLength={20}
                    className={telefoneError ? 'border-destructive' : ''}
                  />
                  {telefoneError && (
                    <p className="text-sm text-destructive">{telefoneError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setEmailError('');
                    }}
                    placeholder="exemplo@email.com"
                    pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                  {!emailError && (
                    <p className="text-xs text-muted-foreground">
                      Digite um e-mail válido (ex: exemplo@email.com)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Endereço */}
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MapPin className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Endereço
                </h3>
                <p className="text-sm text-muted-foreground">
                  Localização da transportadora
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    CEP
                  </Label>
                  <Input
                    id="cep"
                    value={formData.cep || ''}
                    onChange={(e) => {
                      const formatted = formatCEP(e.target.value);
                      setFormData({ ...formData, cep: formatted });
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Estado (UF)
                  </Label>
                  <Input
                    id="estado"
                    value={formData.estado || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estado: e.target.value.toUpperCase().slice(0, 2),
                      })
                    }
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Logradouro
                </Label>
                <Input
                  id="logradouro"
                  value={formData.logradouro || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, logradouro: e.target.value })
                  }
                  placeholder="Rua, Avenida, etc."
                  maxLength={255}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Número
                  </Label>
                  <Input
                    id="numero"
                    value={formData.numero || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, numero: e.target.value })
                    }
                    placeholder="123"
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Complemento
                  </Label>
                  <Input
                    id="complemento"
                    value={formData.complemento || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, complemento: e.target.value })
                    }
                    placeholder="Apto, Sala, etc."
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Bairro
                  </Label>
                  <Input
                    id="bairro"
                    value={formData.bairro || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, bairro: e.target.value })
                    }
                    placeholder="Nome do bairro"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Cidade
                  </Label>
                  <Input
                    id="cidade"
                    value={formData.cidade || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, cidade: e.target.value })
                    }
                    placeholder="Nome da cidade"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Outros */}
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <Info className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Outros
                </h3>
                <p className="text-sm text-muted-foreground">
                  Observações e status da transportadora
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  placeholder="Observações adicionais sobre a transportadora"
                  rows={3}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Status</Label>
                <div className="grid grid-cols-2 gap-4">
                  {(['ATIVO', 'INATIVO'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          ativo: status === 'ATIVO',
                        })
                      }
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        (status === 'ATIVO' && formData.ativo) ||
                        (status === 'INATIVO' && !formData.ativo)
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <Circle
                        className={`w-4 h-4 ${
                          (status === 'ATIVO' && formData.ativo) ||
                          (status === 'INATIVO' && !formData.ativo)
                            ? status === 'ATIVO'
                              ? 'text-green-500 fill-green-500'
                              : 'text-muted-foreground fill-muted-foreground'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <span className="font-medium">{status}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="gradient"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {carrier ? 'Atualizando...' : 'Criando...'}
              </>
            ) : (
              carrier ? 'Atualizar Transportadora' : 'Criar Transportadora'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

