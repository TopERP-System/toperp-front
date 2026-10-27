import AppLayout from '@/components/layout/AppLayout';
import { ModulePageHeader } from '@/components/layout/ModulePageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { formatDocument } from '@/lib/validators';
import { AssociarProdutoDialog } from '@/components/notas-entrada/AssociarProdutoDialog';
import { CadastrarFornecedorDialog } from '@/components/notas-entrada/CadastrarFornecedorDialog';
import { ItemPrevia, NotaEntradaPrevia, notasEntradaService } from '@/services/notas-entrada.service';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileInput, Loader2, Upload, XCircle } from 'lucide-react';
import { DragEvent, useRef, useState } from 'react';
import { toast } from 'sonner';

const quantidade = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });

export default function NotasEntrada() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  // Fica na tela enquanto a prévia é refeita depois de um cadastro
  const [previa, setPrevia] = useState<NotaEntradaPrevia | null>(null);
  const [cadastrandoFornecedor, setCadastrandoFornecedor] = useState(false);
  const [itemAssociando, setItemAssociando] = useState<ItemPrevia | null>(null);

  const previaMutation = useMutation({
    mutationFn: (file: File) => notasEntradaService.previaXml(file),
    onSuccess: setPrevia,
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Não foi possível ler o XML.');
    },
  });
  const recarregar = () => arquivo && previaMutation.mutate(arquivo);

  const enviar = (file?: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('O arquivo precisa ser .xml');
      return;
    }
    setArquivo(file);
    setPrevia(null);
    previaMutation.mutate(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    enviar(e.dataTransfer.files?.[0]);
  };

  return (
    <AppLayout>
      <div className="min-w-0 p-3 sm:p-4 md:p-6">
        <ModulePageHeader
          icon={FileInput}
          title="Notas de Entrada"
          subtitle="Importe o XML da NF-e de compra para conferir fornecedor, produtos e valores."
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={onDrop}
          className={cn(
            'mb-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors',
            arrastando ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          )}
        >
          {previaMutation.isPending && !previa ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="font-medium">
            {previaMutation.isPending && !previa ? 'Lendo o XML…' : 'Arraste o XML da NF-e aqui ou clique para escolher'}
          </p>
          <p className="text-sm text-muted-foreground">
            {arquivo?.name ?? 'Arquivo .xml da nota de compra (modelo 55), até 5 MB'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              enviar(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {previa && (
          <PreviaNota
            previa={previa}
            atualizando={previaMutation.isPending}
            onCadastrarFornecedor={() => setCadastrandoFornecedor(true)}
            onAssociar={setItemAssociando}
          />
        )}

        {previa && cadastrandoFornecedor && (
          <CadastrarFornecedorDialog
            emitente={previa.nota.emitente}
            open
            onOpenChange={setCadastrandoFornecedor}
            onCadastrado={recarregar}
          />
        )}
        {previa?.fornecedor && itemAssociando && (
          <AssociarProdutoDialog
            item={itemAssociando}
            fornecedorId={previa.fornecedor.id}
            open
            onOpenChange={(aberto) => !aberto && setItemAssociando(null)}
            onSalvo={recarregar}
          />
        )}
      </div>
    </AppLayout>
  );
}

function PreviaNota({
  previa,
  atualizando,
  onCadastrarFornecedor,
  onAssociar,
}: {
  previa: NotaEntradaPrevia;
  atualizando: boolean;
  onCadastrarFornecedor: () => void;
  onAssociar: (item: ItemPrevia) => void;
}) {
  const { nota } = previa;
  const fornecedorNome = previa.fornecedor
    ? previa.fornecedor.nome_fantasia || previa.fornecedor.nome_razao
    : null;

  return (
    <div className={cn('space-y-6 transition-opacity', atualizando && 'pointer-events-none opacity-60')}>
      {previa.pendencias.length > 0 ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Resolva antes de importar</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {previa.pendencias.map((p) => (
                <li key={`${p.campo}-${p.n_item ?? ''}-${p.mensagem}`}>{p.mensagem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Tudo certo para importar</AlertTitle>
          <AlertDescription>Fornecedor e todos os produtos foram reconhecidos.</AlertDescription>
        </Alert>
      )}

      {previa.avisos.length > 0 && (
        <Alert className="border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Confira</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {previa.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            NF-e {nota.numero} · série {nota.serie}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="Emitente">
            <span className="font-medium">{nota.emitente.nome}</span>
            <span className="block text-muted-foreground">{formatDocument(nota.emitente.cpf_cnpj)}</span>
          </Campo>
          <Campo rotulo="Fornecedor no sistema">
            {fornecedorNome ? (
              <span className="font-medium">{fornecedorNome}</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">Não cadastrado</Badge>
                <Button size="sm" variant="outline" className="h-7" onClick={onCadastrarFornecedor}>
                  Cadastrar
                </Button>
              </div>
            )}
          </Campo>
          <Campo rotulo="Emissão">{formatDate(nota.data_emissao)}</Campo>
          <Campo rotulo="Valor total">
            <span className="font-semibold">{formatCurrency(nota.totais.total)}</span>
          </Campo>
          <Campo rotulo="Natureza da operação">{nota.natureza_operacao || '—'}</Campo>
          <Campo rotulo="Chave de acesso" className="sm:col-span-2 lg:col-span-3">
            <span className="break-all font-mono text-xs">{nota.chave_acesso}</span>
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens ({previa.itens.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Item na nota</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>CFOP</TableHead>
                <TableHead>Produto no sistema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previa.itens.map((item) => (
                <TableRow key={item.n_item}>
                  <TableCell className="text-muted-foreground">{item.n_item}</TableCell>
                  <TableCell>
                    <span className="font-medium">{item.descricao}</span>
                    <span className="block text-xs text-muted-foreground">
                      Cód. {item.codigo}
                      {item.ean ? ` · EAN ${item.ean}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {quantidade(item.quantidade)} {item.unidade}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {formatCurrency(item.valor_total)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.cfop}
                    {' → '}
                    {item.cfop_entrada_sugerido ?? <span className="text-destructive">?</span>}
                  </TableCell>
                  <TableCell>
                    {item.produto ? (
                      <>
                        <span className="font-medium">{item.produto.nome}</span>
                        {previa.fornecedor && (
                          <Button
                            variant="link"
                            size="sm"
                            className="ml-1 h-auto p-0 text-xs"
                            onClick={() => onAssociar(item)}
                          >
                            Trocar
                          </Button>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {item.vinculo_origem === 'FORNECEDOR'
                            ? `Vínculo do fornecedor${item.fator_conversao !== 1 ? ` · 1 ${item.unidade} = ${quantidade(item.fator_conversao)} ${item.produto.unidade_medida}` : ''}`
                            : 'Pelo código de barras'}
                        </span>
                      </>
                    ) : previa.fornecedor ? (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => onAssociar(item)}>
                        Associar
                      </Button>
                    ) : (
                      <>
                        <Badge variant="destructive">Não associado</Badge>
                        <span className="block text-xs text-muted-foreground">Cadastre o fornecedor primeiro</span>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Esta é só a conferência do XML: nada foi gravado ainda.
      </p>
    </div>
  );
}

function Campo({
  rotulo,
  className,
  children,
}: {
  rotulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <div>{children}</div>
    </div>
  );
}
