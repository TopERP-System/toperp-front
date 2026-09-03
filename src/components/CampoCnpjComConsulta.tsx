// components/CampoCnpjComConsulta.tsx

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cleanDocument, formatCNPJ } from '@/lib/validators';
import { cnpjService, ConsultaCnpjResponse } from '@/services/cnpj.service';
import { Loader2, Search } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface CampoCnpjComConsultaProps {
  value: string;
  onChange: (value: string) => void;
  onConsultaSucesso?: (dados: ConsultaCnpjResponse) => void;
  onConsultaErro?: (erro: string) => void;
  tipoConsulta?: 'cliente' | 'fornecedor' | 'geral';
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  // Para preencher campos do formulário
  onPreencherCampos?: (dados: ConsultaCnpjResponse) => void;
}

export const CampoCnpjComConsulta: React.FC<CampoCnpjComConsultaProps> = ({
  value,
  onChange,
  onConsultaSucesso,
  onConsultaErro,
  tipoConsulta = 'geral',
  disabled = false,
  placeholder = '00.000.000/0000-00',
  className = '',
  onPreencherCampos,
}) => {
  const [consultando, setConsultando] = useState(false);

  const validarCnpj = (cnpj: string): boolean => {
    const cnpjLimpo = cleanDocument(cnpj);
    return cnpjLimpo.length === 14;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const formatado = formatCNPJ(valor);
    onChange(formatado);
  };

  const handleConsultar = async () => {
    const cnpjLimpo = cleanDocument(value);
    
    if (!validarCnpj(value)) {
      const mensagemErro = 'CNPJ inválido. Digite um CNPJ válido com 14 dígitos.';
      toast.error(mensagemErro);
      if (onConsultaErro) {
        onConsultaErro(mensagemErro);
      }
      return;
    }

    setConsultando(true);

    try {
      let dados: ConsultaCnpjResponse;

      // Escolher endpoint baseado no tipo
      switch (tipoConsulta) {
        case 'cliente':
          dados = await cnpjService.consultarParaCliente(value);
          break;
        case 'fornecedor':
          dados = await cnpjService.consultarParaFornecedor(value);
          break;
        default:
          dados = await cnpjService.consultar(value);
      }

      // Preencher campos automaticamente se callback fornecido
      if (onPreencherCampos) {
        onPreencherCampos(dados);
      }

      // Callback de sucesso
      if (onConsultaSucesso) {
        onConsultaSucesso(dados);
      }

      toast.success('Dados consultados com sucesso!');
    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro ao consultar CNPJ';
      toast.error(mensagemErro);
      if (onConsultaErro) {
        onConsultaErro(mensagemErro);
      }
    } finally {
      setConsultando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !consultando && validarCnpj(value)) {
      e.preventDefault();
      handleConsultar();
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        type="text"
        value={value}
        onChange={handleCnpjChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled || consultando}
        maxLength={18} // 14 dígitos + 4 caracteres de formatação
        className="flex-1"
      />
      <Button
        type="button"
        onClick={handleConsultar}
        disabled={consultando || !validarCnpj(value) || disabled}
        variant="outline"
        size="icon"
        title="Consultar CNPJ na Receita Federal"
      >
        {consultando ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};
