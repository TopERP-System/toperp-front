import { CarrierForm } from '@/components/carriers/CarrierForm';
import { CarrierOrdersDialog } from '@/components/carriers/CarrierOrdersDialog';
import { CarrierStats } from '@/components/carriers/CarrierStats';
import { CarrierTable } from '@/components/carriers/CarrierTable';
import { CarrierViewDialog } from '@/components/carriers/CarrierViewDialog';
import { DeleteCarrierDialog } from '@/components/carriers/DeleteCarrierDialog';
import { Pagination } from '@/components/carriers/Pagination';
import { SearchInput } from '@/components/carriers/SearchInput';
import AppLayout from '@/components/layout/AppLayout';
import { ModulePageHeader } from '@/components/layout/ModulePageHeader';
import { Button } from '@/components/ui/button';
import { useCarriers } from '@/hooks/useCarriers';
import { Loader2, Plus, Truck } from 'lucide-react';
import { useState } from 'react';

export default function Transportadoras() {
  const {
    carriers,
    totalCarriers,
    currentPage,
    totalPages,
    searchTerm,
    selectedCarrier,
    carrierToDelete,
    orders,
    isLoading,
    isFormOpen,
    isDeleteDialogOpen,
    isOrdersDialogOpen,
    isCreating,
    isUpdating,
    setCurrentPage,
    handleSearch,
    createCarrier,
    updateCarrier,
    deleteCarrier,
    toggleCarrierStatus,
    handleStatusChange,
    updatingStatusId,
    getOrdersByCarrier,
    openCreateForm,
    openEditForm,
    openDeleteDialog,
    openOrdersDialog,
    closeForm,
    closeDeleteDialog,
    closeOrdersDialog,
  } = useCarriers();

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [carrierToView, setCarrierToView] = useState<any>(null);

  const handleView = (carrier: any) => {
    setCarrierToView(carrier);
    setIsViewDialogOpen(true);
  };

  const handleCloseView = () => {
    setIsViewDialogOpen(false);
    setCarrierToView(null);
  };

  const handleSubmit = (data: any) => {
    if (selectedCarrier) {
      updateCarrier(selectedCarrier.id, data);
    } else {
      createCarrier(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (carrierToDelete) {
      deleteCarrier(carrierToDelete);
    }
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 md:p-6 min-w-0">
        <ModulePageHeader
          icon={Truck}
          title="Transportadoras"
          subtitle="Gestão de transportadoras do ERP, com visão de ativas e inativas."
          loadingHint={isLoading ? 'Carregando transportadoras…' : undefined}
          actions={
            <Button onClick={openCreateForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Transportadora
            </Button>
          }
        />

        <div>
          <CarrierStats carriers={carriers} />

          {/* Barra de Ações */}
          <div className="bg-card border rounded-xl p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Buscar por nome ou CNPJ..."
                />
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-card border rounded-xl p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CarrierTable
                  carriers={carriers}
                  searchTerm={searchTerm}
                  onEdit={openEditForm}
                  onDelete={openDeleteDialog}
                  onStatusChange={handleStatusChange}
                  updatingStatusId={updatingStatusId}
                  onViewOrders={openOrdersDialog}
                  onView={handleView}
                />

                {carriers.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCarriers}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Modais */}
        <CarrierForm
          isOpen={isFormOpen}
          onClose={closeForm}
          onSubmit={handleSubmit}
          carrier={selectedCarrier}
          isPending={isCreating || isUpdating}
        />

        <DeleteCarrierDialog
          isOpen={isDeleteDialogOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteConfirm}
          carrier={carrierToDelete}
        />

        <CarrierOrdersDialog
          isOpen={isOrdersDialogOpen}
          onClose={closeOrdersDialog}
          carrier={selectedCarrier}
          orders={selectedCarrier ? getOrdersByCarrier(selectedCarrier.id) : []}
        />

        <CarrierViewDialog
          isOpen={isViewDialogOpen}
          onClose={handleCloseView}
          carrier={carrierToView}
        />
      </div>
    </AppLayout>
  );
}
