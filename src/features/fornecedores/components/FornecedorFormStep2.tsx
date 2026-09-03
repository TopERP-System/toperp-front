import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EnderecoForm } from '@/features/clientes/components/EnderecoForm';
import { EnderecoFormData } from '../types/fornecedor.types';

interface FornecedorFormStep2Props {
  enderecos: EnderecoFormData[];
  onEnderecosChange: (enderecos: EnderecoFormData[]) => void;
  embedded?: boolean;
}

export function FornecedorFormStep2({
  enderecos,
  onEnderecosChange,
  embedded = false,
}: FornecedorFormStep2Props) {
  const handleAdd = () => {
    onEnderecosChange([
      ...enderecos,
      {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        referencia: '',
      },
    ]);
  };

  const content = (
    <div className="space-y-4">
      {enderecos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum endereço adicionado. Clique em &quot;Adicionar endereço&quot; se desejar incluir.
        </p>
      ) : null}
      {enderecos.map((endereco, index) => (
        <EnderecoForm
          key={index}
          endereco={endereco}
          index={index}
          totalEnderecos={enderecos.length}
          onChange={(updated) => {
            const next = [...enderecos];
            next[index] = updated;
            onEnderecosChange(next);
          }}
          onRemove={() => onEnderecosChange(enderecos.filter((_, i) => i !== index))}
        />
      ))}
    </div>
  );

  if (embedded) return content;

  return <div className="space-y-6">{content}</div>;
}

export function FornecedorFormStep2Actions({ onAdd }: { onAdd: () => void }) {
  return (
    <Button type="button" onClick={onAdd} variant="outline" size="sm" className="rounded-xl">
      <Plus className="mr-2 h-4 w-4" />
      Adicionar endereço
    </Button>
  );
}

FornecedorFormStep2.Actions = FornecedorFormStep2Actions;
