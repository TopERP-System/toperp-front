import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCEP, formatTelefone, telefoneArmazenadoParaCampo } from '@/lib/validators';
import { Mail, MapPin, Phone } from 'lucide-react';

export interface RocaEnderecoContatoData {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  referencia?: string;
  telefone?: string;
  email?: string;
}

export const ROCA_ENDERECO_CONTATO_VAZIO: RocaEnderecoContatoData = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  referencia: '',
  telefone: '',
  email: '',
};

export function RocaEnderecoContatoFields({
  value,
  onChange,
  embedded = false,
}: {
  value: RocaEnderecoContatoData;
  onChange: (next: RocaEnderecoContatoData) => void;
  /** Dentro do card "Informações da roça" — sem borda extra */
  embedded?: boolean;
}) {
  const set = (field: keyof RocaEnderecoContatoData, raw: string) => {
    onChange({ ...value, [field]: raw });
  };

  const fields = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input
            placeholder="00000-000"
            value={value.cep ?? ''}
            maxLength={9}
            onChange={(e) => set('cep', formatCEP(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Logradouro</Label>
          <Input
            placeholder="Rua, estrada, sítio..."
            value={value.logradouro ?? ''}
            onChange={(e) => set('logradouro', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Número</Label>
          <Input
            placeholder="S/N"
            value={value.numero ?? ''}
            onChange={(e) => set('numero', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Complemento</Label>
          <Input
            placeholder="Bloco, lote..."
            value={value.complemento ?? ''}
            onChange={(e) => set('complemento', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Bairro</Label>
          <Input
            value={value.bairro ?? ''}
            onChange={(e) => set('bairro', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input
            value={value.cidade ?? ''}
            onChange={(e) => set('cidade', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Estado (UF)</Label>
          <Input
            placeholder="ES"
            maxLength={2}
            value={value.estado ?? ''}
            onChange={(e) => set('estado', e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-2">
          <Label>Referência</Label>
          <Input
            placeholder="Ponto de referência"
            value={value.referencia ?? ''}
            onChange={(e) => set('referencia', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            Telefone
          </Label>
          <Input
            placeholder="(00) 00000-0000"
            value={telefoneArmazenadoParaCampo(value.telefone)}
            onChange={(e) => set('telefone', formatTelefone(e.target.value))}
            maxLength={15}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            E-mail
          </Label>
          <Input
            type="email"
            placeholder="contato@exemplo.com"
            value={value.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Endereço e contato
            <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            CEP, logradouro, cidade, telefone e e-mail — cadastro interno da roça (opcional).
          </p>
        </div>
        {fields}
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <MapPin className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Endereço e contato</h3>
          <p className="text-xs text-muted-foreground">
            Dados opcionais de localização e contato da roça (não aparecem no relatório de pedidos).
          </p>
        </div>
      </div>
      {fields}
    </div>
  );
}
