import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

interface PaginationProps {
  /** Página atual (1-indexed) */
  currentPage: number;
  
  /** Total de páginas */
  totalPages: number;
  
  /** Total de itens */
  totalItems: number;
  
  /** Callback ao mudar de página */
  onPageChange: (page: number) => void;
  
  /** Classes CSS adicionais */
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * 15 + 1;
  const endItem = Math.min(currentPage * 15, totalItems);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      // Mostrar todas as páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sempre mostrar primeira página
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      // Páginas ao redor da atual
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Sempre mostrar última página
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 mt-4', className)}>
      <div className="text-sm text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{startItem}</span> a{' '}
        <span className="font-medium text-foreground">{endItem}</span> de{' '}
        <span className="font-medium text-foreground">{totalItems}</span> transportadoras
      </div>

      <PaginationRoot>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              className={cn(
                'cursor-pointer',
                currentPage === 1 && 'pointer-events-none opacity-50'
              )}
            />
          </PaginationItem>

          {pageNumbers.map((page, index) => (
            <PaginationItem key={index}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={page === currentPage}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              className={cn(
                'cursor-pointer',
                currentPage === totalPages && 'pointer-events-none opacity-50'
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </PaginationRoot>
    </div>
  );
}



