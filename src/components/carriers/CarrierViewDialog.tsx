import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Transportadora } from '@/types/carrier';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Calendar, CheckCircle, Eye, FileText, Mail, MapPin, Phone, User, XCircle } from 'lucide-react';

interface CarrierViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  carrier: Transportadora | null;
}

export function CarrierViewDialog({ isOpen, onClose, carrier }: CarrierViewDialogProps) {
  if (!carrier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Visualizar Transportadora
          </DialogTitle>
          <DialogDescription>
            Informações completas da transportadora
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Informações Básicas</h3>
                <p className="text-sm text-muted-foreground">
                  Dados principais da transportadora
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-12">
              <div>
                <Label className="text-muted-foreground">Nome/Razão Social</Label>
                <p className="font-medium">{carrier.nome || '--'}</p>
              </div>
              {carrier.nome_fantasia && (
                <div>
                  <Label className="text-muted-foreground">Nome Fantasia</Label>
                  <p className="font-medium">{carrier.nome_fantasia}</p>
                </div>
              )}
              {carrier.cnpj && (
                <div>
                  <Label className="text-muted-foreground">CNPJ</Label>
                  <p className="font-medium font-mono">{carrier.cnpj}</p>
                </div>
              )}
              {carrier.inscricao_estadual && (
                <div>
                  <Label className="text-muted-foreground">Inscrição Estadual</Label>
                  <p className="font-medium">{carrier.inscricao_estadual}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge variant={carrier.ativo ? 'default' : 'secondary'} className={carrier.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}>
                    {carrier.ativo ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contato */}
          {(carrier.contato || carrier.email || carrier.telefone) && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Contato</h3>
                    <p className="text-sm text-muted-foreground">
                      Informações de contato
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pl-12">
                  {carrier.contato && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nome do contato
                      </Label>
                      <p className="font-medium">{carrier.contato}</p>
                    </div>
                  )}
                  {carrier.email && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        E-mail
                      </Label>
                      <p className="font-medium">{carrier.email}</p>
                    </div>
                  )}
                  {carrier.telefone && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefone
                      </Label>
                      <p className="font-medium">{carrier.telefone}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Endereço */}
          {(carrier.cep || carrier.logradouro || carrier.numero || carrier.complemento || carrier.bairro || carrier.cidade || carrier.estado) && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Endereço</h3>
                    <p className="text-sm text-muted-foreground">
                      Informações de localização
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pl-12">
                  {carrier.cep && (
                    <div>
                      <Label className="text-muted-foreground">CEP</Label>
                      <p className="font-medium font-mono">{carrier.cep}</p>
                    </div>
                  )}
                  {carrier.logradouro && (
                    <div>
                      <Label className="text-muted-foreground">Logradouro</Label>
                      <p className="font-medium">{carrier.logradouro}</p>
                    </div>
                  )}
                  {carrier.numero && (
                    <div>
                      <Label className="text-muted-foreground">Número</Label>
                      <p className="font-medium">{carrier.numero}</p>
                    </div>
                  )}
                  {carrier.complemento && (
                    <div>
                      <Label className="text-muted-foreground">Complemento</Label>
                      <p className="font-medium">{carrier.complemento}</p>
                    </div>
                  )}
                  {carrier.bairro && (
                    <div>
                      <Label className="text-muted-foreground">Bairro</Label>
                      <p className="font-medium">{carrier.bairro}</p>
                    </div>
                  )}
                  {carrier.cidade && (
                    <div>
                      <Label className="text-muted-foreground">Cidade</Label>
                      <p className="font-medium">{carrier.cidade}</p>
                    </div>
                  )}
                  {carrier.estado && (
                    <div>
                      <Label className="text-muted-foreground">Estado (UF)</Label>
                      <p className="font-medium">{carrier.estado}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Observações */}
          {carrier.observacoes && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Observações</h3>
                    <p className="text-sm text-muted-foreground">
                      Informações adicionais
                    </p>
                  </div>
                </div>

                <div className="pl-12">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{carrier.observacoes}</p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Informações do Sistema */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Informações do Sistema</h3>
                <p className="text-sm text-muted-foreground">
                  Datas de criação e atualização
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-12">
              <div>
                <Label className="text-muted-foreground">Criado em</Label>
                <p className="font-medium">
                  {carrier.created_at
                    ? format(new Date(carrier.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '--'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Atualizado em</Label>
                <p className="font-medium">
                  {carrier.updated_at
                    ? format(new Date(carrier.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '--'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



