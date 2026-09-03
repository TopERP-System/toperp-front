/**
 * Componente de tabela de clientes
 */

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cleanDocument, formatCNPJ, formatCPF } from "@/lib/validators";
import { StatusCliente } from "@/services/clientes.service";
import { motion } from "framer-motion";
import {
    Edit,
    Eye,
    FileText,
    Loader2,
    Mail,
    MoreVertical,
    Phone,
    Trash2,
    Users,
    XCircle,
} from "lucide-react";

interface Cliente {
  id: number;
  nome: string;
  nome_fantasia?: string | null;
  nome_razao?: string | null;
  cpf_cnpj: string;
  tipoPessoa: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  statusCliente: "ATIVO" | "INATIVO" | "BLOQUEADO" | "INADIMPLENTE";
  contato?: Array<{
    email?: string;
    telefone?: string;
  }>;
}

interface ClienteTableProps {
  clientes: Cliente[];
  isLoading: boolean;
  error: Error | null;
  searchTerm: string;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onRelatorios?: (id: number) => void;
  onStatusChange?: (id: number, novoStatus: StatusCliente) => void;
  updatingStatusId?: number | null;
}

export const ClienteTable = ({
  clientes,
  isLoading,
  error,
  searchTerm,
  hasActiveFilters,
  onView,
  onEdit,
  onDelete,
  onRelatorios,
  onStatusChange,
  updatingStatusId,
}: ClienteTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ATIVO":
        return "bg-cyan/10 text-cyan";
      case "INATIVO":
        return "bg-muted text-muted-foreground";
      case "BLOQUEADO":
        return "bg-red-500/10 text-red-500";
      case "INADIMPLENTE":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ATIVO":
        return "Ativo";
      case "INATIVO":
        return "Inativo";
      case "BLOQUEADO":
        return "Bloqueado";
      case "INADIMPLENTE":
        return "Inadimplente";
      default:
        return status;
    }
  };

  const formatarDocumento = (cpfCnpj: string | null | undefined, tipoPessoa: "PESSOA_FISICA" | "PESSOA_JURIDICA"): string => {
    if (!cpfCnpj || cpfCnpj.trim() === "") {
      return "-";
    }
    
    // Remove formatação existente e pega apenas números
    const cleaned = cleanDocument(cpfCnpj);
    
    if (!cleaned) {
      return cpfCnpj; // Retorna o valor original se não conseguir limpar
    }
    
    // Formata baseado no tipo de pessoa e tamanho do documento
    if (tipoPessoa === "PESSOA_FISICA") {
      // CPF tem 11 dígitos
      if (cleaned.length === 11) {
        return formatCPF(cleaned);
      }
      // Se não tem 11 dígitos, pode estar incompleto ou ser CNPJ incorreto
      // Retorna formatado parcialmente se possível
      return cleaned;
    } else {
      // CNPJ tem 14 dígitos
      if (cleaned.length === 14) {
        return formatCNPJ(cleaned);
      }
      // Se não tem 14 dígitos, pode estar incompleto ou ser CPF incorreto
      // Retorna formatado parcialmente se possível
      return cleaned;
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando clientes...
                </div>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <XCircle className="w-8 h-8 text-destructive" />
                  <p className="text-destructive font-medium">
                    Erro ao carregar clientes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error
                      ? error.message
                      : "Verifique sua conexão e tente novamente"}
                  </p>
                  {import.meta.env.DEV && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Verifique o console para mais detalhes
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : clientes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-12 h-12 text-muted-foreground/50" />
                  <p className="font-medium">
                    {searchTerm.trim() || hasActiveFilters
                      ? "Nenhum cliente encontrado"
                      : "Nenhum cliente cadastrado"}
                  </p>
                  {!searchTerm.trim() && !hasActiveFilters && (
                    <p className="text-sm">
                      Clique em "Criar Cliente" para adicionar o primeiro
                      cliente
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            clientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell>
                  {cliente.tipoPessoa === "PESSOA_JURIDICA" ? (
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {cliente.nome_fantasia ||
                          cliente.nome_razao ||
                          cliente.nome}
                      </span>
                      {((cliente.nome_fantasia &&
                        cliente.nome_razao &&
                        cliente.nome_fantasia !== cliente.nome_razao) ||
                        (!cliente.nome_fantasia &&
                          cliente.nome_razao &&
                          cliente.nome_razao !== cliente.nome)) && (
                        <span className="text-sm text-muted-foreground">
                          {cliente.nome_razao}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-medium">{cliente.nome}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-muted-foreground">
                    {formatarDocumento(cliente.cpf_cnpj, cliente.tipoPessoa)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {cliente.contato?.[0]?.email || "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {cliente.contato?.[0]?.telefone || "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    {cliente.tipoPessoa === "PESSOA_FISICA" ? "PF" : "PJ"}
                  </span>
                </TableCell>
                <TableCell>
                  {onStatusChange ? (
                    <Select
                      value={cliente.statusCliente}
                      onValueChange={(value) => {
                        if (value !== cliente.statusCliente) {
                          onStatusChange(cliente.id, value as StatusCliente);
                        }
                      }}
                      disabled={updatingStatusId === cliente.id}
                    >
                      <SelectTrigger
                        className={`h-7 w-[140px] text-xs font-medium rounded-full border-0 shadow-none hover:opacity-80 transition-opacity ${getStatusColor(
                          cliente.statusCliente
                        )}`}
                      >
                        <SelectValue>
                          {updatingStatusId === cliente.id ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Atualizando...</span>
                            </div>
                          ) : (
                            getStatusLabel(cliente.statusCliente)
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StatusCliente.ATIVO}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Ativo
                          </div>
                        </SelectItem>
                        <SelectItem value={StatusCliente.INATIVO}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            Inativo
                          </div>
                        </SelectItem>
                        <SelectItem value={StatusCliente.BLOQUEADO}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Bloqueado
                          </div>
                        </SelectItem>
                        <SelectItem value={StatusCliente.INADIMPLENTE}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Inadimplente
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                        cliente.statusCliente
                      )}`}
                    >
                      {getStatusLabel(cliente.statusCliente)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(cliente.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      {onRelatorios && (
                        <DropdownMenuItem onClick={() => onRelatorios(cliente.id)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Relatórios
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(cliente.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(cliente.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </motion.div>
  );
};
