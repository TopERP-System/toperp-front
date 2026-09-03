import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCEP } from '@/lib/validators';
import { cepService, ConsultaCepResponse } from '@/services/cep.service';
import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export type CepAddressData = ConsultaCepResponse;

interface CepInputWithLookupProps {
  value: string;
  onChange: (cep: string) => void;
  onAddressFound?: (data: CepAddressData) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

export function CepInputWithLookup({
  value,
  onChange,
  onAddressFound,
  disabled = false,
  id,
  placeholder = '00000-000',
}: CepInputWithLookupProps) {
  const [buscando, setBuscando] = useState(false);

  const buscar = async () => {
    if (!value?.replace(/\D/g, '')) {
      toast.error('Informe um CEP válido.');
      return;
    }

    setBuscando(true);
    try {
      const dados = await cepService.buscar(value);
      onChange(formatCEP(dados.cep));
      onAddressFound?.(dados);
      toast.success('CEP encontrado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao buscar CEP.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(formatCEP(e.target.value))}
        disabled={disabled || buscando}
        placeholder={placeholder}
        maxLength={9}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void buscar();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => void buscar()}
        disabled={disabled || buscando}
        title="Buscar CEP"
      >
        {buscando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
