import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  EscopoCfop,
  fiscalService,
  formatarNcm,
  TabelaFiscal,
  TipoOperacaoFiscal,
} from '@/services/fiscal.service';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Opcao {
  codigo: string;
  descricao: string;
  /** Linha secundária: segmento (CEST) ou caminho na hierarquia (NCM). */
  detalhe?: string;
}

interface CodigoFiscalLookupProps {
  tabela: TabelaFiscal | 'ncm';
  value: string;
  onChange: (codigo: string) => void;
  /** Título da janela de busca. */
  titulo: string;
  operacao?: TipoOperacaoFiscal;
  escopo?: EscopoCfop;
  /** Só CEST: lista primeiro os CEST aplicáveis a este NCM. */
  ncm?: string;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  className?: string;
}

const TABELAS_ESTATICAS_STALE = Infinity;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function filtrar(opcoes: Opcao[], termo: string): Opcao[] {
  const t = normalizar(termo);
  if (!t) return opcoes;
  const digitos = t.replace(/[\s.\-/]/g, '');
  if (/^\d+$/.test(digitos)) return opcoes.filter((o) => o.codigo.startsWith(digitos));
  const palavras = t.split(/\s+/);
  return opcoes.filter((o) => {
    const texto = normalizar(`${o.codigo} ${o.descricao} ${o.detalhe ?? ''}`);
    return palavras.every((p) => texto.includes(p));
  });
}

/** Termo com atraso, para não consultar a API a cada tecla (busca de NCM). */
function useTermoComAtraso(termo: string, ms = 300): string {
  const [valor, setValor] = useState(termo);
  useEffect(() => {
    const id = setTimeout(() => setValor(termo), ms);
    return () => clearTimeout(id);
  }, [termo, ms]);
  return valor;
}

/**
 * Campo de código fiscal com busca na tabela oficial (AC 4).
 * Aceita digitação direta; avisa quando o código digitado não existe na tabela.
 */
export function CodigoFiscalLookup({
  tabela,
  value,
  onChange,
  titulo,
  operacao,
  escopo,
  ncm,
  placeholder,
  invalid,
  id,
  className,
}: CodigoFiscalLookupProps) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [todosCest, setTodosCest] = useState(false);
  const ehNcm = tabela === 'ncm';
  const digitos = value.replace(/\D/g, '');
  const ncmDigitos = (ncm ?? '').replace(/\D/g, '');

  // Tabela completa (para a descrição do código atual e para a busca local)
  const tabelaQuery = useQuery({
    queryKey: ['fiscal', 'tabela', tabela, operacao ?? null, escopo ?? null],
    queryFn: () =>
      fiscalService.listarTabela(tabela as TabelaFiscal, { operacao, escopo }),
    enabled: !ehNcm,
    staleTime: TABELAS_ESTATICAS_STALE,
  });

  // CEST aplicáveis ao NCM do produto
  const cestDoNcmQuery = useQuery({
    queryKey: ['fiscal', 'tabela', 'cest', 'ncm', ncmDigitos],
    queryFn: () => fiscalService.listarTabela('cest', { ncm: ncmDigitos }),
    enabled: tabela === 'cest' && ncmDigitos.length >= 2 && aberto,
    staleTime: TABELAS_ESTATICAS_STALE,
  });

  // NCM: busca na API (tabela grande)
  const termoNcm = useTermoComAtraso(termo);
  const buscaNcmQuery = useQuery({
    queryKey: ['fiscal', 'ncm', 'busca', termoNcm],
    queryFn: () => fiscalService.buscarNcm(termoNcm),
    enabled: ehNcm && aberto && termoNcm.trim().length >= 2,
    staleTime: 60 * 60 * 1000,
  });

  // NCM: descrição do código já informado
  const ncmAtualQuery = useQuery({
    queryKey: ['fiscal', 'ncm', 'codigo', digitos],
    queryFn: () => fiscalService.buscarNcm(digitos, 1),
    enabled: ehNcm && digitos.length === 8,
    staleTime: 60 * 60 * 1000,
  });

  const paraOpcao = (i: { codigo: string; descricao: string; segmento?: string }): Opcao => ({
    codigo: i.codigo,
    descricao: i.descricao,
    detalhe: i.segmento,
  });

  const opcoes: Opcao[] = useMemo(() => {
    if (ehNcm) {
      return (buscaNcmQuery.data ?? []).map((n) => ({
        codigo: n.codigo,
        descricao: n.descricao,
        detalhe: n.caminho,
      }));
    }
    const usarCestDoNcm =
      tabela === 'cest' && !todosCest && ncmDigitos.length >= 2 && (cestDoNcmQuery.data?.length ?? 0) > 0;
    const base = usarCestDoNcm ? cestDoNcmQuery.data! : tabelaQuery.data ?? [];
    return filtrar(base.map(paraOpcao), termo).slice(0, 200);
  }, [ehNcm, buscaNcmQuery.data, tabela, todosCest, ncmDigitos, cestDoNcmQuery.data, tabelaQuery.data, termo]);

  const atual: Opcao | undefined = useMemo(() => {
    if (!digitos) return undefined;
    if (ehNcm) {
      const n = ncmAtualQuery.data?.find((x) => x.codigo === digitos);
      return n && { codigo: n.codigo, descricao: n.descricao, detalhe: n.caminho };
    }
    const item = tabelaQuery.data?.find((x) => x.codigo === digitos);
    return item && paraOpcao(item);
  }, [digitos, ehNcm, ncmAtualQuery.data, tabelaQuery.data]);

  const carregouAtual = ehNcm ? ncmAtualQuery.isFetched : tabelaQuery.isFetched;
  const naoEncontrado =
    !!digitos && carregouAtual && !atual && (!ehNcm || digitos.length === 8) && !tabelaQuery.isError;

  const selecionar = (codigo: string) => {
    onChange(ehNcm ? formatarNcm(codigo) : codigo);
    setAberto(false);
    setTermo('');
  };

  const carregando = ehNcm
    ? buscaNcmQuery.isFetching
    : tabelaQuery.isLoading || cestDoNcmQuery.isFetching;
  const mostrandoCestDoNcm =
    tabela === 'cest' && !todosCest && ncmDigitos.length >= 2 && (cestDoNcmQuery.data?.length ?? 0) > 0;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-2">
        <Input
          id={id}
          className={cn('rounded-xl font-mono', invalid && 'border-destructive')}
          placeholder={placeholder}
          value={value}
          maxLength={ehNcm ? 10 : tabela === 'cest' ? 9 : 4}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-xl"
          onClick={() => setAberto(true)}
          aria-label={`Buscar ${titulo}`}
          title={`Buscar ${titulo}`}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {atual ? (
        <p className="line-clamp-2 text-xs text-muted-foreground" title={atual.descricao}>
          {atual.descricao}
        </p>
      ) : naoEncontrado ? (
        <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Código não encontrado na tabela oficial
        </p>
      ) : null}

      <Dialog
        open={aberto}
        onOpenChange={(open) => {
          setAberto(open);
          if (!open) setTermo('');
        }}
      >
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Buscar {titulo}</DialogTitle>
            <DialogDescription>
              {ehNcm
                ? 'Digite o código ou parte da descrição (mínimo 2 caracteres).'
                : 'Pesquise pelo código ou pela descrição e selecione o código correto.'}
            </DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false} className="border-t">
            <CommandInput
              placeholder={ehNcm ? 'Ex.: queijo, 0406' : 'Código ou descrição…'}
              value={termo}
              onValueChange={setTermo}
            />
            {tabela === 'cest' && ncmDigitos.length >= 2 && (
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
                <span>
                  {mostrandoCestDoNcm
                    ? `Mostrando CEST aplicáveis ao NCM ${formatarNcm(ncmDigitos)}`
                    : todosCest
                      ? 'Mostrando todos os CEST'
                      : `Nenhum CEST do convênio para o NCM ${formatarNcm(ncmDigitos)}`}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setTodosCest((v) => !v)}
                >
                  {todosCest ? 'Só os do NCM' : 'Ver todos'}
                </Button>
              </div>
            )}
            <CommandList className="max-h-[50vh]">
              {carregando ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : (
                <CommandEmpty>
                  {ehNcm && termo.trim().length < 2
                    ? 'Digite ao menos 2 caracteres.'
                    : 'Nenhum código encontrado.'}
                </CommandEmpty>
              )}
              <CommandGroup>
                {opcoes.map((o) => (
                  <CommandItem
                    key={o.codigo}
                    value={o.codigo}
                    onSelect={() => selecionar(o.codigo)}
                    className="flex items-start gap-3"
                  >
                    <span className="w-24 shrink-0 font-mono text-sm font-semibold">
                      {ehNcm ? formatarNcm(o.codigo) : o.codigo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{o.descricao}</span>
                      {o.detalhe && (
                        <span className="block text-xs text-muted-foreground">{o.detalhe}</span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
