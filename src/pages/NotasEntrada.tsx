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
import { ConfirmarEntradaCard } from '@/components/notas-entrada/ConfirmarEntradaCard';
import { FornecedorDaNotaDialog } from '@/components/notas-entrada/FornecedorDaNotaDialog';
import { NotasEntradaLista } from '@/components/notas-entrada/NotasEntradaLista';
import { Input } from '@/components/ui/input';
import { ItemPrevia, NotaEntradaPrevia, notasEntradaService } from '@/services/notas-entrada.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileInput, Loader2, Upload, XCircle } from 'lucide-react';
import { DragEvent, useRef, useState } from 'react';
import { toast } from 'sonner';

const quantidade = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
const CFOP_ENTRADA = /^[123]\d{3}$/;

/** Pendências da prévia, trocando as de CFOP pelo CFOP que o usuário digitou na tela. */
function pendenciasComCfop(previa: NotaEntradaPrevia, cfops: Record<number, string>) {
  const outras = previa.pendencias.filter((p) => p.campo !== 'cfop');
  const deCfop = previa.itens.flatMap((item) => {
    const cfop = cfops[item.n_item] ?? '';
    const rotulo = `Item ${item.n_item} – ${item.descricao}`;
    if (!cfop) return [{ campo: 'cfop', n_item: item.n_item, mensagem: `CFOP não informado: ${rotulo}` }];
    if (!CFOP_ENTRADA.test(cfop)) {
      return [{ campo: 'cfop', n_item: item.n_item, mensagem: `CFOP de entrada inválido (${cfop}): ${rotulo}` }];
    }
    return [];
  });
  return [...outras, ...deCfop];
}

export default function NotasEntrada() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  // Fica na tela enquanto a prévia é refeita depois de um cadastro
  const [previa, setPrevia] = useState<NotaEntradaPrevia | null>(null);
  const [resolvendoFornecedor, setResolvendoFornecedor] = useState(false);
  // Fornecedor existente que o usuário associou ao emitente (null: o sistema acha pelo CNPJ/CPF)
  const [fornecedorId, setFornecedorId] = useState<number | null>(null);
  const [itemAssociando, setItemAssociando] = useState<ItemPrevia | null>(null);
  // US06: CFOP de entrada por item (começa com o sugerido; o que o usuário digitou é mantido ao refazer a prévia)
  const [cfops, setCfops] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();

  const previaMutation = useMutation({
    mutationFn: ({ file, fornecedor }: { file: File; fornecedor: number | null }) =>
      notasEntradaService.previaXml(file, fornecedor),
    onSuccess: (dados) => {
      setPrevia(dados);
      setCfops((atuais) => {
        const novos = { ...atuais };
        for (const item of dados.itens) {
          if (novos[item.n_item] === undefined && item.cfop_entrada_sugerido) {
            novos[item.n_item] = item.cfop_entrada_sugerido;
          }
        }
        return novos;
      });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || 'Não foi possível ler o XML.');
    },
  });
  const recarregar = (fornecedor = fornecedorId) => {
    if (arquivo) previaMutation.mutate({ file: arquivo, fornecedor });
  };

  const enviar = (file?: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('O arquivo precisa ser .xml');
      return;
    }
    setArquivo(file);
    setPrevia(null);
    setCfops({});
    setFornecedorId(null);
    previaMutation.mutate({ file, fornecedor: null });
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
          subtitle="Importe o XML da NF-e de compra: confira, resolva o que falta e dê entrada no estoque e no contas a pagar."
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
            pendencias={pendenciasComCfop(previa, cfops)}
            cfops={cfops}
            onCfop={(nItem, cfop) => setCfops((atuais) => ({ ...atuais, [nItem]: cfop }))}
            atualizando={previaMutation.isPending}
            fornecedorAssociado={fornecedorId !== null}
            onResolverFornecedor={() => setResolvendoFornecedor(true)}
            onAssociar={setItemAssociando}
          />
        )}

        {previa && arquivo && (
          <div className="mt-6">
            <ConfirmarEntradaCard
              key={previa.nota.chave_acesso}
              previa={previa}
              arquivo={arquivo}
              cfops={cfops}
              fornecedorId={fornecedorId}
              bloqueado={
                previaMutation.isPending ||
                Boolean(previa.ja_importada) ||
                pendenciasComCfop(previa, cfops).length > 0
              }
              onConfirmada={() => {
                setPrevia(null);
                setArquivo(null);
                setCfops({});
                setFornecedorId(null);
                queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
                queryClient.invalidateQueries({ queryKey: ['notas-entrada'] });
                queryClient.invalidateQueries({ queryKey: ['produtos'] });
              }}
            />
          </div>
        )}

        <div className="mt-6">
          <NotasEntradaLista />
        </div>

        {previa && resolvendoFornecedor && (
          <FornecedorDaNotaDialog
            emitente={previa.nota.emitente}
            associado={fornecedorId !== null ? previa.fornecedor : null}
            open
            onOpenChange={setResolvendoFornecedor}
            onResolvido={(id) => {
              setFornecedorId(id);
              recarregar(id);
            }}
          />
        )}
        {previa?.fornecedor && itemAssociando && (
          <AssociarProdutoDialog
            item={itemAssociando}
            fornecedorId={previa.fornecedor.id}
            open
            onOpenChange={(aberto) => !aberto && setItemAssociando(null)}
            onSalvo={() => recarregar()}
          />
        )}
      </div>
    </AppLayout>
  );
}

function PreviaNota({
  previa,
  pendencias,
  cfops,
  onCfop,
  atualizando,
  fornecedorAssociado,
  onResolverFornecedor,
  onAssociar,
}: {
  previa: NotaEntradaPrevia;
  pendencias: NotaEntradaPrevia['pendencias'];
  cfops: Record<number, string>;
  onCfop: (nItem: number, cfop: string) => void;
  atualizando: boolean;
  /** O usuário escolheu um fornecedor existente (em vez de achar pelo CNPJ/CPF). */
  fornecedorAssociado: boolean;
  onResolverFornecedor: () => void;
  onAssociar: (item: ItemPrevia) => void;
}) {
  const { nota } = previa;
  const fornecedorNome = previa.fornecedor
    ? previa.fornecedor.nome_fantasia || previa.fornecedor.nome_razao
    : null;

  return (
    <div className={cn('space-y-6 transition-opacity', atualizando && 'pointer-events-none opacity-60')}>
      {pendencias.length > 0 ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Resolva antes de importar</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {pendencias.map((p) => (
                <li key={`${p.campo}-${p.n_item ?? ''}-${p.mensagem}`}>{p.mensagem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Tudo certo para importar</AlertTitle>
          <AlertDescription>Fornecedor, produtos e CFOPs resolvidos. Confira os dados abaixo e confirme a entrada.</AlertDescription>
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
              <>
                <span className="font-medium">{fornecedorNome}</span>
                {fornecedorAssociado && (
                  <Button variant="link" size="sm" className="ml-1 h-auto p-0 text-xs" onClick={onResolverFornecedor}>
                    Trocar
                  </Button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">Não encontrado</Badge>
                <Button size="sm" variant="outline" className="h-7" onClick={onResolverFornecedor}>
                  Cadastrar ou associar
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
                <TableHead>CFOP (nota → entrada)</TableHead>
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
                    <span className="mr-1">{item.cfop} →</span>
                    <Input
                      aria-label={`CFOP de entrada do item ${item.n_item}`}
                      className={cn(
                        'inline-flex h-8 w-20',
                        !CFOP_ENTRADA.test(cfops[item.n_item] ?? '') && 'border-destructive',
                      )}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="1102"
                      value={cfops[item.n_item] ?? ''}
                      onChange={(e) => onCfop(item.n_item, e.target.value.replace(/\D/g, ''))}
                    />
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
                        <span className="block text-xs text-muted-foreground">Resolva o fornecedor primeiro</span>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
