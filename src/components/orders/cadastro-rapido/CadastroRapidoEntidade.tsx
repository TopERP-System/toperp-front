import { CampoCpfCnpjComConsulta } from '@/components/CampoCpfCnpjComConsulta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { cleanDocument, formatCNPJ, formatCPF } from '@/lib/validators';
import { Categoria, categoriasService } from '@/services/categorias.service';
import { Cliente, clientesService, CreateClienteDto } from '@/services/clientes.service';
import { ConsultaCnpjResponse } from '@/services/cnpj.service';
import {
  CreateFornecedorDto,
  Fornecedor,
  fornecedoresService,
} from '@/services/fornecedores.service';
import { CreateProdutoDto, Produto, produtosService } from '@/services/produtos.service';
import { transportadorasService } from '@/services/transportadoras.service';
import { CreateTransportadoraDto, Transportadora } from '@/types/carrier';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, User, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertaComplementarConsulta } from './AlertaComplementarConsulta';
import {
  DadosComplementaresConsulta,
  mapConsultaCnpj,
} from './mapConsultaDocumento';

export type CadastroRapidoTipo =
  | 'cliente'
  | 'fornecedor'
  | 'transportadora'
  | 'produto';

interface CadastroRapidoEntidadeProps {
  tipo: CadastroRapidoTipo;
  onClose: () => void;
  onCreated: (result: {
    tipo: CadastroRapidoTipo;
    id: number;
    label: string;
    produto?: Produto;
    cliente?: Cliente;
    fornecedor?: Fornecedor;
    transportadora?: Transportadora;
  }) => void;
}

function SeletorTipoPessoa({
  value,
  onChange,
}: {
  value: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  onChange: (v: 'PESSOA_FISICA' | 'PESSOA_JURIDICA') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          { v: 'PESSOA_JURIDICA' as const, label: 'PJ', sub: 'CNPJ', icon: Building2 },
          { v: 'PESSOA_FISICA' as const, label: 'PF', sub: 'CPF', icon: User },
        ] as const
      ).map(({ v, label, sub, icon: Icon }) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition-all',
              selected
                ? 'border-primary/60 bg-primary/10'
                : 'border-border/60 hover:border-primary/30',
            )}
          >
            <Icon className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')} />
            <span>
              <span className="font-medium">{label}</span>
              <span className="ml-1 text-xs text-muted-foreground">({sub})</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

async function complementarCliente(
  id: number,
  dados: DadosComplementaresConsulta,
  tipoPessoa: 'PESSOA_FISICA' | 'PESSOA_JURIDICA',
) {
  const patch: Partial<CreateClienteDto> = {};
  if (tipoPessoa === 'PESSOA_JURIDICA' && dados.nomeRazao) {
    patch.nome_razao = dados.nomeRazao;
  }
  if (dados.inscricaoEstadual) patch.inscricao_estadual = dados.inscricaoEstadual;
  if (dados.endereco) {
    patch.enderecos = [
      {
        ...dados.endereco,
        complemento: '',
        referencia: '',
      },
    ];
  }
  if (dados.telefone) {
    patch.contatos = [{ telefone: dados.telefone, ativo: true }];
  }
  if (Object.keys(patch).length > 0) {
    await clientesService.atualizar(id, patch);
  }
}

async function complementarFornecedor(id: number, dados: DadosComplementaresConsulta) {
  const patch: Partial<CreateFornecedorDto> = {};
  if (dados.inscricaoEstadual) patch.inscricao_estadual = dados.inscricaoEstadual;
  if (dados.endereco) {
    patch.enderecos = [{ ...dados.endereco, complemento: '', referencia: '' }];
  }
  if (dados.telefone) {
    patch.contato = [{ telefone: dados.telefone, ativo: true }];
  }
  if (Object.keys(patch).length > 0) {
    await fornecedoresService.atualizar(id, patch);
  }
}

async function complementarTransportadora(id: number, dados: DadosComplementaresConsulta) {
  const patch: Partial<CreateTransportadoraDto> = {};
  if (dados.nomeFantasia) patch.nome_fantasia = dados.nomeFantasia;
  if (dados.inscricaoEstadual) patch.inscricao_estadual = dados.inscricaoEstadual;
  if (dados.telefone) patch.telefone = dados.telefone;
  if (dados.endereco) {
    Object.assign(patch, {
      cep: dados.endereco.cep,
      logradouro: dados.endereco.logradouro,
      numero: dados.endereco.numero,
      bairro: dados.endereco.bairro,
      cidade: dados.endereco.cidade,
      estado: dados.endereco.estado,
    });
  }
  if (Object.keys(patch).length > 0) {
    await transportadorasService.atualizar(id, patch);
  }
}

export function CadastroRapidoEntidade({ tipo, onClose, onCreated }: CadastroRapidoEntidadeProps) {
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'PESSOA_FISICA' | 'PESSOA_JURIDICA'>('PESSOA_JURIDICA');
  const [documento, setDocumento] = useState('');
  const [precoVenda, setPrecoVenda] = useState<string>('');
  const [estoque, setEstoque] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [dadosConsulta, setDadosConsulta] = useState<DadosComplementaresConsulta | null>(null);
  const [mostrarAlertaConsulta, setMostrarAlertaConsulta] = useState(false);
  const [complementarSegundoPlano, setComplementarSegundoPlano] = useState(false);

  const { data: categoriasData } = useQuery({
    queryKey: ['categorias', 'ativas', 'cadastro-rapido'],
    queryFn: async () => {
      const res = await categoriasService.listar({ limit: 100, statusCategoria: 'ATIVO' });
      return Array.isArray(res) ? res : res.data ?? [];
    },
    enabled: tipo === 'produto',
  });
  const categorias: Categoria[] = Array.isArray(categoriasData) ? categoriasData : [];

  const titulos: Record<CadastroRapidoTipo, string> = {
    cliente: 'Novo cliente rápido',
    fornecedor: 'Novo fornecedor rápido',
    transportadora: 'Nova transportadora rápida',
    produto: 'Novo produto rápido',
  };

  const handleConsultaSucesso = (dados: ConsultaCnpjResponse) => {
    const mapped = mapConsultaCnpj(dados);
    setDadosConsulta(mapped);
    setMostrarAlertaConsulta(true);
    if (mapped.nomeFantasia && !nome.trim()) {
      setNome(mapped.nomeFantasia);
    } else if (mapped.nomeRazao && !nome.trim()) {
      setNome(mapped.nomeRazao);
    }
  };

  const formatarDocumento = (): string | undefined => {
    if (!documento.trim()) return undefined;
    const cleaned = cleanDocument(documento);
    if (tipoPessoa === 'PESSOA_FISICA') {
      if (cleaned.length !== 11) return undefined;
      return formatCPF(cleaned);
    }
    if (cleaned.length !== 14) return undefined;
    return formatCNPJ(cleaned);
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error('Informe o nome');
      return;
    }

    setSalvando(true);
    try {
      if (tipo === 'cliente') {
        const doc = formatarDocumento();
        const dto: CreateClienteDto =
          tipoPessoa === 'PESSOA_JURIDICA'
            ? {
                tipoPessoa: 'PESSOA_JURIDICA',
                statusCliente: 'ATIVO',
                nome_fantasia: nome.trim(),
                ...(doc ? { cpf_cnpj: doc } : {}),
              }
            : {
                tipoPessoa: 'PESSOA_FISICA',
                statusCliente: 'ATIVO',
                nome: nome.trim(),
                ...(doc ? { cpf_cnpj: doc } : {}),
              };
        const criado = await clientesService.criar(dto);
        if (complementarSegundoPlano && dadosConsulta) {
          void complementarCliente(criado.id, dadosConsulta, tipoPessoa)
            .then(() => toast.success('Informações complementares do cliente salvas'))
            .catch(() => toast.error('Não foi possível complementar o cadastro do cliente'));
        }
        onCreated({
          tipo: 'cliente',
          id: criado.id,
          label: criado.nome_fantasia || criado.nome_razao || criado.nome || nome.trim(),
          cliente: criado,
        });
        toast.success('Cliente cadastrado com sucesso!');
      } else if (tipo === 'fornecedor') {
        const doc = formatarDocumento();
        const dto: CreateFornecedorDto = {
          nome_fantasia: nome.trim(),
          statusFornecedor: 'ATIVO',
          ...(tipoPessoa ? { tipoFornecedor: tipoPessoa } : {}),
          ...(doc ? { cpf_cnpj: doc } : {}),
        };
        const criado = await fornecedoresService.criar(dto);
        if (complementarSegundoPlano && dadosConsulta) {
          void complementarFornecedor(criado.id, dadosConsulta)
            .then(() => toast.success('Informações complementares do fornecedor salvas'))
            .catch(() => toast.error('Não foi possível complementar o cadastro do fornecedor'));
        }
        onCreated({
          tipo: 'fornecedor',
          id: criado.id,
          label: criado.nome_fantasia || criado.nome_razao || nome.trim(),
          fornecedor: criado,
        });
        toast.success('Fornecedor cadastrado com sucesso!');
      } else if (tipo === 'transportadora') {
        const doc = formatarDocumento();
        const dto: CreateTransportadoraDto = {
          nome: nome.trim(),
          contato: nome.trim(),
          ativo: true,
          ...(doc && tipoPessoa === 'PESSOA_JURIDICA' ? { cnpj: doc } : {}),
        };
        const criado = await transportadorasService.criar(dto);
        if (complementarSegundoPlano && dadosConsulta) {
          void complementarTransportadora(criado.id, dadosConsulta)
            .then(() => toast.success('Informações complementares da transportadora salvas'))
            .catch(() => toast.error('Não foi possível complementar o cadastro da transportadora'));
        }
        onCreated({
          tipo: 'transportadora',
          id: criado.id,
          label: criado.nome,
          transportadora: criado,
        });
        toast.success('Transportadora cadastrada com sucesso!');
      } else {
        const dto: CreateProdutoDto = {
          nome: nome.trim(),
          statusProduto: 'ATIVO',
          unidade_medida: 'UN',
          sku: '',
        };
        if (precoVenda.trim()) dto.preco_venda = Number(precoVenda);
        if (estoque.trim()) dto.estoque_atual = Number(estoque);
        if (categoriaId) dto.categoriaId = Number(categoriaId);
        const criado = await produtosService.criar(dto);
        onCreated({
          tipo: 'produto',
          id: criado.id,
          label: criado.nome,
          produto: criado,
        });
        toast.success('Produto cadastrado com sucesso!');
      }
      onClose();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error as Error)?.message ||
        'Erro ao cadastrar';
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  const mostraTipoPessoa = tipo === 'cliente' || tipo === 'fornecedor' || tipo === 'transportadora';
  const mostraDocumento = mostraTipoPessoa;
  const labelNome =
    tipo === 'produto'
      ? 'Nome do produto'
      : tipoPessoa === 'PESSOA_JURIDICA' && tipo !== 'transportadora'
        ? 'Nome fantasia'
        : 'Nome';

  return (
    <div className="rounded-xl border border-primary/20 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{titulos[tipo]}</p>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {mostraTipoPessoa && (
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <SeletorTipoPessoa
            value={tipoPessoa}
            onChange={(v) => {
              setTipoPessoa(v);
              setDocumento('');
              setDadosConsulta(null);
              setMostrarAlertaConsulta(false);
              setComplementarSegundoPlano(false);
            }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">
          {labelNome} <span className="text-destructive">*</span>
        </Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={labelNome}
          disabled={salvando}
        />
      </div>

      {mostraDocumento && (
        <div className="space-y-1.5">
          <Label className="text-xs">
            {tipoPessoa === 'PESSOA_FISICA' ? 'CPF' : 'CNPJ'}{' '}
            <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <CampoCpfCnpjComConsulta
            tipoPessoa={tipoPessoa}
            value={documento}
            onChange={setDocumento}
            tipoConsulta={
              tipo === 'cliente' ? 'cliente' : tipo === 'fornecedor' ? 'fornecedor' : 'geral'
            }
            disabled={salvando}
            onConsultaSucesso={handleConsultaSucesso}
            onPreencherCampos={handleConsultaSucesso}
          />
        </div>
      )}

      {mostrarAlertaConsulta && dadosConsulta && (
        <AlertaComplementarConsulta
          visible
          onAceitar={() => {
            setComplementarSegundoPlano(true);
            setMostrarAlertaConsulta(false);
          }}
          onRecusar={() => {
            setComplementarSegundoPlano(false);
            setMostrarAlertaConsulta(false);
          }}
        />
      )}

      {tipo === 'produto' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Preço <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                placeholder="0,00"
                disabled={salvando}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Estoque <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={estoque}
                onChange={(e) => setEstoque(e.target.value)}
                placeholder="0"
                disabled={salvando}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Categoria <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Select value={categoriaId} onValueChange={setCategoriaId} disabled={salvando}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSalvar} disabled={salvando}>
          {salvando ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Salvando...
            </>
          ) : (
            'Cadastrar'
          )}
        </Button>
      </div>
    </div>
  );
}
