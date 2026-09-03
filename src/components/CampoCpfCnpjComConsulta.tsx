import { CampoCnpjComConsulta } from '@/components/CampoCnpjComConsulta';
import { Input } from '@/components/ui/input';
import { cleanDocument, formatCPF, formatCNPJ } from '@/lib/validators';
import { ConsultaCnpjResponse } from '@/services/cnpj.service';
import React from 'react';

interface CampoCpfCnpjComConsultaProps {
  tipoPessoa: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  value: string;
  onChange: (value: string) => void;
  tipoConsulta?: 'cliente' | 'fornecedor' | 'geral';
  disabled?: boolean;
  onConsultaSucesso?: (dados: ConsultaCnpjResponse) => void;
  onPreencherCampos?: (dados: ConsultaCnpjResponse) => void;
}

export const CampoCpfCnpjComConsulta: React.FC<CampoCpfCnpjComConsultaProps> = ({
  tipoPessoa,
  value,
  onChange,
  tipoConsulta = 'geral',
  disabled = false,
  onConsultaSucesso,
  onPreencherCampos,
}) => {
  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = cleanDocument(raw);
    if (tipoPessoa === 'PESSOA_FISICA') {
      onChange(cleaned.length <= 11 ? formatCPF(cleaned) : formatCPF(cleaned.slice(0, 11)));
    } else {
      onChange(cleaned.length <= 14 ? formatCNPJ(cleaned) : formatCNPJ(cleaned.slice(0, 14)));
    }
  };

  if (tipoPessoa === 'PESSOA_JURIDICA') {
    return (
      <CampoCnpjComConsulta
        value={value}
        onChange={onChange}
        tipoConsulta={tipoConsulta}
        disabled={disabled}
        placeholder="00.000.000/0000-00"
        onConsultaSucesso={onConsultaSucesso}
        onPreencherCampos={onPreencherCampos}
      />
    );
  }

  return (
    <Input
      type="text"
      value={value}
      onChange={handleDocumentoChange}
      placeholder="000.000.000-00"
      disabled={disabled}
      maxLength={14}
    />
  );
};
