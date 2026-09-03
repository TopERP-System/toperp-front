import FornecedorForm, { FornecedorFormSubmitData } from '@/components/fornecedores/FornecedorForm';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { prepararCriacaoFornecedor } from '@/features/fornecedores/utils/prepararCriacaoFornecedor';
import { fornecedoresService } from '@/services/fornecedores.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function NovoFornecedor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: fornecedoresService.criar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      await queryClient.invalidateQueries({ queryKey: ['fornecedores-estatisticas'] });
      await queryClient.invalidateQueries({ queryKey: ['fornecedores-todos-estatisticas'] });
      toast.success('Fornecedor cadastrado com sucesso!');
      navigate('/fornecedores');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao cadastrar fornecedor');
    },
  });

  const handleSubmit = (data: FornecedorFormSubmitData) => {
    const payload = prepararCriacaoFornecedor(data);
    if (payload) createMutation.mutate(payload);
  };

  const salvando = createMutation.isPending;

  return (
    <AppLayout>
      <div className="min-w-0 bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => navigate('/fornecedores')}
                aria-label="Voltar para Fornecedores"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Novo Fornecedor</h1>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados para cadastrar um novo fornecedor no sistema
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate('/fornecedores')}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="fornecedor-form-page"
                variant="gradient"
                className="gap-2 rounded-xl"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Criar Fornecedor'
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <FornecedorForm onSubmit={handleSubmit} isPending={salvando} />
        </div>
      </div>
    </AppLayout>
  );
}
