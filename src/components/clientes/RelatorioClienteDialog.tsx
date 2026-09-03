import { useState } from 'react';
import { Download, Printer, Share2, Mail, Loader2, Copy, Check, BarChart3, FileText, Calendar, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useRelatorioCliente } from '@/hooks/useRelatorioCliente';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RelatorioClienteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  clienteNome?: string;
}

export function RelatorioClienteDialog({
  isOpen,
  onClose,
  clienteId,
  clienteNome,
}: RelatorioClienteDialogProps) {
  const {
    loading,
    error,
    downloadFinanceiro,
    imprimirFinanceiro,
    downloadProducao,
    imprimirProducao,
    compartilhar,
    enviarEmail,
  } = useRelatorioCliente({ clienteId });

  const [dataInicial, setDataInicial] = useState<string>('');
  const [dataFinal, setDataFinal] = useState<string>('');
  const [emailDestinatarioFinanceiro, setEmailDestinatarioFinanceiro] = useState<string>('');
  const [emailDestinatarioProducao, setEmailDestinatarioProducao] = useState<string>('');
  const [linkCompartilhado, setLinkCompartilhado] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [horasValidade, setHorasValidade] = useState<number>(24);
  const [showCompartilharVia, setShowCompartilharVia] = useState(false);
  const [tipoRelatorioCompartilhado, setTipoRelatorioCompartilhado] = useState<'financeiro' | 'producao' | null>(null);

  const handleDownloadFinanceiro = async () => {
    try {
      await downloadFinanceiro();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleImprimirFinanceiro = async () => {
    try {
      await imprimirFinanceiro();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleDownloadProducao = async () => {
    try {
      await downloadProducao(
        dataInicial || undefined,
        dataFinal || undefined
      );
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleImprimirProducao = async () => {
    try {
      await imprimirProducao(
        dataInicial || undefined,
        dataFinal || undefined
      );
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleCompartilhar = async (tipoRelatorio: 'financeiro' | 'producao') => {
    try {
      const response = await compartilhar({
        tipoRelatorio,
        dataInicial: dataInicial || undefined,
        dataFinal: dataFinal || undefined,
        horasValidade,
      });
      
      setLinkCompartilhado(response.url);
      setTipoRelatorioCompartilhado(tipoRelatorio);
      setShowCompartilharVia(true);
      
      // Copiar para clipboard
      try {
        await navigator.clipboard.writeText(response.url);
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar link:', err);
      }
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleEnviarEmail = async (tipoRelatorio: 'financeiro' | 'producao') => {
    const emailDestinatario = tipoRelatorio === 'financeiro' 
      ? emailDestinatarioFinanceiro 
      : emailDestinatarioProducao;

    if (!emailDestinatario.trim()) {
      toast.error('Email do destinatário é obrigatório');
      return;
    }

    try {
      await enviarEmail({
        email: emailDestinatario,
        tipoRelatorio,
        dataInicial: dataInicial || undefined,
        dataFinal: dataFinal || undefined,
      });
      
      if (tipoRelatorio === 'financeiro') {
        setEmailDestinatarioFinanceiro('');
      } else {
        setEmailDestinatarioProducao('');
      }
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const copiarLink = async () => {
    if (!linkCompartilhado) return;
    
    try {
      await navigator.clipboard.writeText(linkCompartilhado);
      setLinkCopiado(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  const abrirWhatsApp = () => {
    if (!linkCompartilhado) return;
    
    const message = encodeURIComponent(
      `Relatório do cliente ${clienteNome || clienteId}\n\n${linkCompartilhado}`
    );
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setShowCompartilharVia(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Relatórios do Cliente</DialogTitle>
              <DialogDescription className="mt-1">
                Gere e compartilhe relatórios personalizados
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros de Período */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicial" className="text-sm font-medium">
                Data Inicial (opcional)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="dataInicial"
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFinal" className="text-sm font-medium">
                Data Final (opcional)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="dataFinal"
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Relatório Financeiro */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Relatório Financeiro</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleDownloadFinanceiro}
                disabled={loading === 'download-financeiro'}
                variant="outline"
                size="sm"
              >
                {loading === 'download-financeiro' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Baixando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleImprimirFinanceiro}
                disabled={loading === 'imprimir-financeiro'}
                variant="outline"
                size="sm"
              >
                {loading === 'imprimir-financeiro' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleCompartilhar('financeiro')}
                disabled={loading === 'compartilhar-financeiro'}
                variant={showCompartilharVia && tipoRelatorioCompartilhado === 'financeiro' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  showCompartilharVia && tipoRelatorioCompartilhado === 'financeiro' && 'border-primary'
                )}
              >
                {loading === 'compartilhar-financeiro' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="Email do destinatário"
                  value={emailDestinatarioFinanceiro}
                  onChange={(e) => setEmailDestinatarioFinanceiro(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => handleEnviarEmail('financeiro')}
                disabled={loading === 'enviar-email' || !emailDestinatarioFinanceiro.trim()}
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                {loading === 'enviar-email' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Relatório de Produção */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg">Relatório de Produção</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleDownloadProducao}
                disabled={loading === 'download-producao'}
                variant="outline"
                size="sm"
              >
                {loading === 'download-producao' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Baixando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleImprimirProducao}
                disabled={loading === 'imprimir-producao'}
                variant="outline"
                size="sm"
              >
                {loading === 'imprimir-producao' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleCompartilhar('producao')}
                disabled={loading === 'compartilhar-producao'}
                variant={showCompartilharVia && tipoRelatorioCompartilhado === 'producao' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  showCompartilharVia && tipoRelatorioCompartilhado === 'producao' && 'border-primary'
                )}
              >
                {loading === 'compartilhar-producao' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="Email do destinatário"
                  value={emailDestinatarioProducao}
                  onChange={(e) => setEmailDestinatarioProducao(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => handleEnviarEmail('producao')}
                disabled={loading === 'enviar-email' || !emailDestinatarioProducao.trim()}
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                {loading === 'enviar-email' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Compartilhar via */}
          {showCompartilharVia && linkCompartilhado && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Compartilhar via</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCompartilharVia(false);
                    setLinkCompartilhado(null);
                    setTipoRelatorioCompartilhado(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={abrirWhatsApp}
                  className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-border rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all cursor-pointer group"
                >
                  <div className="p-3 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <span className="font-medium text-sm">WhatsApp</span>
                </button>
                
                <button
                  onClick={copiarLink}
                  className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-border rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer group"
                >
                  <div className="p-3 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    {linkCopiado ? (
                      <Check className="w-8 h-8 text-purple-600" />
                    ) : (
                      <Copy className="w-8 h-8 text-purple-600" />
                    )}
                  </div>
                  <span className="font-medium text-sm">
                    {linkCopiado ? 'Copiado!' : 'Copiar Link'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Mensagem de Erro */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}













