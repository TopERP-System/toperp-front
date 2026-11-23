import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cleanDocument, formatDocument } from '@/lib/validators';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

export interface ParceiroOpcao {
  id: number;
  nome: string;
  cpf_cnpj?: string | null;
}

interface ParceiroComboboxProps {
  opcoes: ParceiroOpcao[];
  value?: number;
  onChange: (id: number | undefined) => void;
  placeholder?: string;
  vazioMensagem?: string;
  className?: string;
  disabled?: boolean;
}

/** Renderizar milhares de linhas trava o navegador; o usuário refina digitando. */
const LIMITE_RESULTADOS = 100;

const normalizarTexto = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function filtrarParceiros(opcoes: ParceiroOpcao[], busca: string) {
  const termo = normalizarTexto(busca);
  if (!termo) return opcoes;
  const digitos = cleanDocument(busca);
  // "12.345" ou "12345" busca no documento; "Fazenda 2" continua sendo busca por nome
  const buscaPorDocumento = digitos.length > 0 && /^[\d.\-/\s]+$/.test(busca.trim());
  return opcoes.filter((opcao) => {
    if (normalizarTexto(opcao.nome).includes(termo)) return true;
    return buscaPorDocumento && cleanDocument(opcao.cpf_cnpj ?? '').includes(digitos);
  });
}

export function ParceiroCombobox({
  opcoes,
  value,
  onChange,
  placeholder = 'Digite o nome ou CPF/CNPJ',
  vazioMensagem = 'Nenhum resultado encontrado',
  className,
  disabled,
}: ParceiroComboboxProps) {
  const selecionado = opcoes.find((o) => Number(o.id) === Number(value));
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(
    () => (editando ? filtrarParceiros(opcoes, busca) : opcoes),
    [opcoes, busca, editando],
  );
  const visiveis = filtradas.slice(0, LIMITE_RESULTADOS);

  useEffect(() => setIndiceAtivo(0), [busca]);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-indice="${indiceAtivo}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [indiceAtivo, aberto]);

  const fechar = () => {
    setAberto(false);
    setEditando(false);
    setBusca('');
  };

  const selecionar = (opcao: ParceiroOpcao) => {
    onChange(Number(opcao.id));
    fechar();
  };

  const abrir = () => {
    if (disabled) return;
    setAberto(true);
    const indiceSelecionado = opcoes.findIndex((o) => Number(o.id) === Number(value));
    setIndiceAtivo(indiceSelecionado >= 0 && indiceSelecionado < LIMITE_RESULTADOS ? indiceSelecionado : 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!aberto) return abrir();
      setIndiceAtivo((i) => Math.min(i + 1, visiveis.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (!aberto) return;
      e.preventDefault(); // não submete o formulário do pedido
      const opcao = visiveis[indiceAtivo];
      if (opcao) selecionar(opcao);
    } else if (e.key === 'Escape' && aberto) {
      e.preventDefault();
      fechar();
    } else if (e.key === 'Tab') {
      fechar();
    }
  };

  const textoInput = editando ? busca : selecionado?.nome ?? '';

  return (
    <Popover open={aberto} onOpenChange={(open) => (open ? abrir() : fechar())}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded={aberto}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled}
            className={cn('pl-9 pr-16', className)}
            placeholder={selecionado ? selecionado.nome : placeholder}
            value={textoInput}
            onFocus={abrir}
            onClick={() => !aberto && abrir()}
            onChange={(e) => {
              setEditando(true);
              setBusca(e.target.value);
              if (!aberto) setAberto(true);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {selecionado && !disabled && (
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpar seleção"
                onClick={() => {
                  onChange(undefined);
                  setBusca('');
                  inputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className="pointer-events-none h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Clique no próprio campo não deve fechar a lista
          if (inputRef.current?.parentElement?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        <div ref={listaRef} role="listbox" className="max-h-72 overflow-y-auto">
          {visiveis.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">{vazioMensagem}</div>
          ) : (
            visiveis.map((opcao, indice) => {
              const ativo = indice === indiceAtivo;
              const marcado = Number(opcao.id) === Number(value);
              return (
                <div
                  key={opcao.id}
                  role="option"
                  aria-selected={marcado}
                  data-indice={indice}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                    ativo && 'bg-accent text-accent-foreground',
                  )}
                  onMouseEnter={() => setIndiceAtivo(indice)}
                  // mousedown evita que o input perca o foco antes da seleção
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selecionar(opcao);
                  }}
                >
                  <Check className={cn('h-4 w-4 shrink-0', marcado ? 'opacity-100' : 'opacity-0')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opcao.nome}</div>
                    {opcao.cpf_cnpj && (
                      <div className="text-xs text-muted-foreground">{formatDocument(opcao.cpf_cnpj)}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {filtradas.length > LIMITE_RESULTADOS && (
            <div className="border-t px-2 py-2 text-center text-xs text-muted-foreground">
              Mostrando {LIMITE_RESULTADOS} de {filtradas.length}. Continue digitando para refinar.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
