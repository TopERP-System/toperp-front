import { buildRotulosRoca, type RotulosRoca } from '@/lib/rotulo-roca';
import { configuracoesService } from '@/services/configuracoes.service';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useConfiguracoesTenant(enabled = true) {
  return useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => configuracoesService.obter(),
    enabled,
    staleTime: 60_000,
  });
}

/** Rótulos de Roça/Empresa para Dashboard, Financeiro, Comercial e Movimentações. */
export function useRotuloRoca(): RotulosRoca & {
  ocultarMenuControleRoca: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useConfiguracoesTenant(true);
  const rotulos = useMemo(
    () => buildRotulosRoca(data?.rotulo_roca),
    [data?.rotulo_roca],
  );

  return {
    ...rotulos,
    ocultarMenuControleRoca: Boolean(data?.ocultar_menu_controle_roca),
    isLoading,
  };
}
