'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Printer, Plus } from 'lucide-react';
import {
  updateEstimateStatus,
  convertEstimateToJob,
  getEstimatesDashboardData,
  sendEstimateByEmail,
  deleteEstimate,
} from '@/app/actions';
import { useRouter, useParams } from 'next/navigation';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
}

interface Property {
  id: string;
  street_address: string;
  city: string;
}

interface Estimate {
  id: string;
  title: string;
  description: string | null;
  estimated_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'declined';
  customer_id: string;
  property_id: string | null;
  created_at: string;
  customers: Customer;
  properties: Property | null;
  payment_terms?: string | null;
}

interface Service {
  id: string;
  name: string;
  base_price: number;
}

interface Truck {
  id: string;
  name: string;
  plate_number: string | null;
  is_active: boolean | null;
  status: string | null;
}

export type LineItemType = 'service' | 'labor' | 'material';

export interface ServiceLine {
  id: number;
  type: LineItemType;
  serviceId: string;
  customName?: string;
  price: string;
  hours?: string;
  laborRate?: string;
  laborCost?: string;
  materialCost?: string;
  materialMarkup?: string;
}

type SortColumn = 'customer' | 'proposal' | 'date' | 'amount' | 'status' | 'actions';
type SortDirection = 'asc' | 'desc';

interface EstimatesClientProps {
    initialData: Awaited<ReturnType<typeof getEstimatesDashboardData>>;
}

export default function EstimatesClient({ initialData }: EstimatesClientProps) {
  const router = useRouter();
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const t = isEs
    ? {
        loading: 'Cargando módulo de cotizaciones...',
        pageTitle: 'Cotizaciones',
        pageSubtitle: 'Crea cotizaciones profesionales, envíalas a tus clientes y conviértelas en órdenes de trabajo.',
        newEstimate: '+ Nueva Cotización',
        totalDraft: 'Total en Borrador',
        totalSent: 'Total Enviado',
        totalApproved: 'Total Aprobado',
        filterAll: 'Todos',
        filterDraft: 'Borrador',
        filterSent: 'Enviados',
        filterApproved: 'Aprobados',
        filterDeclined: 'Rechazados',
        rowsPerPage: 'Registros por página',
        pageLabel: 'Página',
        prevPage: 'Anterior',
        nextPage: 'Siguiente',
        thCustomer: 'Cliente',
        thProposal: 'Servicio',
        thDate: 'Fecha',
        thAmount: 'Importe',
        thStatus: 'Estado',
        thActions: 'Acciones de Flujo',
        noRecords: 'No se encontraron cotizaciones en esta categoría.',
        noProperty: 'Sin propiedad vinculada',
        actionEdit: 'Editar',
        actionDelete: 'Eliminar',
        actionMarkSent: 'Enviar',
        actionApproveSchedule: 'Aprobar',
        actionDecline: 'Rechazar',
        actionPrint: 'Imprimir cotización',
        confirmDeleteDraft: '¿Estás seguro de que deseas eliminar este borrador de cotización?',
        deleteError: 'Error al eliminar cotización:',
        deleting: 'Eliminando...',
        convertedToJob: 'Enviado a Job',
        declined: 'Rechazado',
        sendingEmail: 'Enviando...',
        sendSuccess: 'Cotización enviada exitosamente.',
        sendError: 'Error al enviar cotización:',
        modalCreateTitle: 'Nueva Cotización',
        modalEditTitle: 'Editar Cotización',
        labelCustomer: 'Cliente Receptor',
        optionSelectCustomer: 'Selecciona un cliente...',
        labelProperty: 'Dirección de Servicio (Propiedad)',
        optionSelectProperty: 'Selecciona una propiedad...',
        optionSelectCustomerFirst: 'Primero selecciona un cliente',
        labelServiceTitle: 'Título del Servicio',
        servicesList: 'Servicios y Precios',
        addServiceLine: 'Agregar servicio',
        removeServiceLine: 'Quitar',
        selectService: 'Selecciona un servicio...',
        noServicesSaved: 'No hay servicios guardados en Settings.',
        noServicesSavedHint: 'No hay servicios guardados en Ajustes. Puedes escribir el servicio manualmente abajo o configurarlos en Ajustes.',
        configureServicesLink: 'Configurar servicios en Ajustes →',
        customServiceOption: '+ Servicio personalizado...',
        selectFromCatalog: 'Seleccionar del catálogo',
        serviceNamePlaceholder: 'Ej: Reparación de fuga',
        linePricePlaceholder: '0.00',
        linePriceLabel: 'Precio',
        summaryTotal: 'Total de la Cotización',
        validationServiceRequired: 'Agrega al menos un servicio con precio válido.',
        servicePlaceholder: 'Ej: Pintura Exterior o Mantenimiento de Techo',
        labelEstimatedAmount: 'Importe de la Cotización ($)',
        labelNotes: 'Notas / Alcance del Trabajo',
        notesPlaceholder: 'Detalles sobre materiales, mano de obra o condiciones de entrega...',
        labelTruck: 'Camión (opcional)',
        optionSelectTruckOptional: 'Selecciona un camión...',
        cancel: 'Cancelar',
        saveProposal: 'Guardar Cotización',
        updateProposal: 'Actualizar Cotización',
        modalApproveTitle: 'Aprobar y Agendar Servicio',
        modalApproveTextStart: 'Estás aprobando la cotización por',
        modalApproveTextMid: 'para',
        modalApproveTextEnd: 'Selecciona una fecha para agendarlo inmediatamente en el calendario operativo.',
        fieldDate: 'Fecha de Operación en Campo',
        approveCreateJob: 'Aprobar y Crear Job',
        approveProcessing: 'Procesando...',
        approveConvertError: 'Cotización aprobada, pero falló la creación del Job:',
        approveConvertSuccess: 'Cotización aprobada y Job agendado con éxito!',
        labelPaymentTerms: 'Términos de Pago',
        paymentTermsPlaceholder: 'Ej: 50% anticipo al aprobar, 50% al finalizar',
        addLaborLine: '+ Mano de Obra',
        addMaterialLine: '+ Materiales',
        lineTypeService: 'Servicio',
        lineTypeLabor: 'Mano de Obra',
        lineTypeMaterial: 'Materiales',
        labelHours: 'Horas',
        labelRatePerHour: 'Tarifa $/hr',
        labelCostPerHour: 'Costo $/hr',
        labelMaterialCost: 'Costo contratista ($)',
        labelMarkup: 'Margen / Markup (%)',
        profitabilityTitle: 'Rentabilidad Estimada',
        profitabilityAdminOnly: 'Privado para Admin',
        totalQuoted: 'Total Cotizado',
        estCost: 'Costo Est.',
        estMargin: 'Margen Est.',
        laborSummaryHint: 'Mano de obra calculada con tarifa predeterminada.',
        materialsSummaryHint: 'Precio con markup predeterminado de materiales.',
      }
    : {
        loading: 'Loading quotes module...',
        pageTitle: 'Quotes',
        pageSubtitle: 'Create professional quotes, send them to your customers, and convert them into work orders.',
        newEstimate: '+ New Quote',
        totalDraft: 'Total in Draft',
        totalSent: 'Total Sent',
        totalApproved: 'Total Approved',
        filterAll: 'All',
        filterDraft: 'Draft',
        filterSent: 'Sent',
        filterApproved: 'Approved',
        filterDeclined: 'Declined',
        rowsPerPage: 'Rows per page',
        pageLabel: 'Page',
        prevPage: 'Prev',
        nextPage: 'Next',
        thCustomer: 'Customer',
        thProposal: 'Service',
        thDate: 'Date',
        thAmount: 'Amount',
        thStatus: 'Status',
        thActions: 'Workflow Actions',
        noRecords: 'No quotes were found in this category.',
        noProperty: 'No linked property',
        actionEdit: 'Edit',
        actionDelete: 'Delete',
        actionMarkSent: 'Send',
        actionApproveSchedule: 'Approve',
        actionDecline: 'Decline',
        actionPrint: 'Print quote',
        confirmDeleteDraft: 'Are you sure you want to delete this draft quote?',
        deleteError: 'Error deleting quote:',
        deleting: 'Deleting...',
        convertedToJob: 'Sent to Job',
        declined: 'Declined',
        sendingEmail: 'Sending...',
        sendSuccess: 'Quote sent successfully.',
        sendError: 'Error sending quote:',
        modalCreateTitle: 'New Quote',
        modalEditTitle: 'Edit Quote',
        labelCustomer: 'Customer',
        optionSelectCustomer: 'Select a customer...',
        labelProperty: 'Service Address (Property)',
        optionSelectProperty: 'Select a property...',
        optionSelectCustomerFirst: 'Select a customer first',
        labelServiceTitle: 'Service Title',
        servicesList: 'Services and Prices',
        addServiceLine: 'Add service',
        removeServiceLine: 'Remove',
        selectService: 'Select a service...',
        noServicesSaved: 'No saved services found in Settings.',
        noServicesSavedHint: 'No saved services found in Settings. You can enter service names manually below or configure them in Settings.',
        configureServicesLink: 'Configure services in Settings →',
        customServiceOption: '+ Custom service...',
        selectFromCatalog: 'Select from catalog',
        serviceNamePlaceholder: 'Ex: Leak repair',
        linePricePlaceholder: '0.00',
        linePriceLabel: 'Price',
        summaryTotal: 'Quote Total',
        validationServiceRequired: 'Add at least one service with a valid price.',
        servicePlaceholder: 'Ex: Exterior Painting or Roof Maintenance',
        labelEstimatedAmount: 'Quote Amount ($)',
        labelNotes: 'Notes / Scope of Work',
        notesPlaceholder: 'Details about materials, labor, or delivery conditions...',
        labelTruck: 'Truck (optional)',
        optionSelectTruckOptional: 'Select a truck...',
        cancel: 'Cancel',
        saveProposal: 'Save Quote',
        updateProposal: 'Update Quote',
        modalApproveTitle: 'Approve and Schedule Service',
        modalApproveTextStart: 'You are approving the quote for',
        modalApproveTextMid: 'for',
        modalApproveTextEnd: 'Select a date to schedule it immediately in the operations calendar.',
        fieldDate: 'Field Operation Date',
        approveCreateJob: 'Approve and Create Job',
        approveProcessing: 'Processing...',
        approveConvertError: 'Quote approved, but job creation failed:',
        approveConvertSuccess: 'Quote approved and job scheduled successfully!',
        labelPaymentTerms: 'Payment Terms',
        paymentTermsPlaceholder: 'Ex: 50% deposit upon approval, 50% upon completion',
        addLaborLine: '+ Labor',
        addMaterialLine: '+ Materials',
        lineTypeService: 'Service',
        lineTypeLabor: 'Labor',
        lineTypeMaterial: 'Materials',
        labelHours: 'Hours',
        labelRatePerHour: 'Rate $/hr',
        labelCostPerHour: 'Cost $/hr',
        labelMaterialCost: 'Cost to you ($)',
        labelMarkup: 'Markup (%)',
        profitabilityTitle: 'Internal Profitability',
        profitabilityAdminOnly: 'Admin Only',
        totalQuoted: 'Total Quoted',
        estCost: 'Est. Cost',
        estMargin: 'Est. Margin',
        laborSummaryHint: 'Labor auto-calculated with your default hourly rate.',
        materialsSummaryHint: 'Price with default materials markup.',
      };
  const [estimates, setEstimates] = useState<Estimate[]>(initialData.estimates as any[] || []);
  const [customers, setCustomers] = useState<Customer[]>(initialData.customers as any[] || []);
  const [properties, setProperties] = useState<Property[]>([]);
  const [services, setServices] = useState<Service[]>(initialData.services as any[] || []);
  const [trucks, setTrucks] = useState<Truck[]>(initialData.trucks as any[] || []);
  
  // States de UI
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // State for sending email and deleting
  const [sendingEstimateId, setSendingEstimateId] = useState<string | null>(null);
  const [approvingEstimateId, setApprovingEstimateId] = useState<string | null>(null);
  const [deletingEstimateId, setDeletingEstimateId] = useState<string | null>(null);

  async function handleDeleteEstimate(estimateId: string) {
    if (!confirm(t.confirmDeleteDraft)) return;

    setDeletingEstimateId(estimateId);
    try {
      const res = await deleteEstimate(estimateId);
      if (res.error) {
        alert(`${t.deleteError} ${res.error}`);
      } else {
        setEstimates((prev) => prev.filter((e) => e.id !== estimateId));
        router.refresh();
      }
    } catch (err: any) {
      alert(`${t.deleteError} ${err?.message || 'Failed to delete'}`);
    } finally {
      setDeletingEstimateId(null);
    }
  }

  // Handle sending estimate via email
  async function handleSendEstimate(estimateId: string) {
    if (sendingEstimateId) return; // Prevent double-clicks

    setSendingEstimateId(estimateId);
    try {
      // This server action should send the email AND then update the status to 'sent'
      const result = await sendEstimateByEmail(estimateId);
      if (result.error) {
        alert(`${t.sendError} ${result.error}`);
      } else {
        alert(t.sendSuccess);
        // Refresh data to show the new 'sent' status
        const refreshed = await getEstimatesDashboardData();
        if (!refreshed?.error) {
          setEstimates((refreshed.estimates || []) as any);
        }
        router.refresh();
      }
    } catch (error) {
      alert(`${t.sendError} ${(error as Error).message}`);
    } finally {
      setSendingEstimateId(null);
    }
  }

  // Cambiar estado rápidamente
  async function handleStatusChange(id: string, status: 'draft' | 'sent' | 'approved' | 'declined') {
    if (status === 'approved') {
      setApprovingEstimateId(id);

      const statusRes = await updateEstimateStatus(id, 'approved');
      if (statusRes.error) {
        alert(statusRes.error);
        setApprovingEstimateId(null);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const convertRes = await convertEstimateToJob(id, todayStr, null);
      if (convertRes.error) {
        alert(`${t.approveConvertError} ${convertRes.error}`);
      }

      const refreshed = await getEstimatesDashboardData();
      if (!refreshed?.error) {
        setEstimates((refreshed.estimates || []) as any);
      }
      router.refresh();

      setApprovingEstimateId(null);
      return;
    }

    const res = await updateEstimateStatus(id, status);
    if (res.error) {
      alert(res.error);
    } else {
      const refreshed = await getEstimatesDashboardData();
      if (!refreshed?.error) {
        setEstimates((refreshed.estimates || []) as any);
      }
      router.refresh();
    }
  }

  const filteredEstimates = statusFilter === 'all' 
    ? estimates 
    : estimates.filter(e => e.status === statusFilter);

  const getCustomerLabel = (estimate: Estimate) =>
    `${estimate.customers.first_name} ${estimate.customers.last_name}`.trim().toLowerCase();

  const getStatusRank = (status: Estimate['status']) => {
    const rank: Record<Estimate['status'], number> = {
      draft: 1,
      sent: 2,
      approved: 3,
      declined: 4,
    };
    return rank[status];
  };

  const getActionsRank = (estimate: Estimate) => {
    if (estimate.status === 'draft') return 1;
    if (estimate.status === 'sent') return 2;
    if (estimate.status === 'approved') return 3;
    return 4;
  };

  const sortedEstimates = [...filteredEstimates].sort((a, b) => {
    let result = 0;

    if (sortColumn === 'customer') {
      result = getCustomerLabel(a).localeCompare(getCustomerLabel(b));
    } else if (sortColumn === 'proposal') {
      result = a.title.localeCompare(b.title);
    } else if (sortColumn === 'date') {
      result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortColumn === 'amount') {
      result = a.estimated_amount - b.estimated_amount;
    } else if (sortColumn === 'status') {
      result = getStatusRank(a.status) - getStatusRank(b.status);
    } else if (sortColumn === 'actions') {
      result = getActionsRank(a) - getActionsRank(b);
    }

    return sortDirection === 'asc' ? result : -result;
  });

  const totalPages = Math.max(1, Math.ceil(sortedEstimates.length / pageSize));
  const paginatedEstimates = sortedEstimates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.pageTitle}</h1>
            <p className="text-xs text-slate-500 mt-1">{t.pageSubtitle}</p>
          </div>
          <Link
            href={`/${locale}/dashboard/estimates/new`}
            className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newEstimate}</span>
          </Link>
        </div>

            {/* Tarjetas de Resumen Rapido */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible mb-2 sm:mb-5 md:mb-2">
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t.totalDraft}</span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  ${estimates.filter(e => e.status === 'draft').reduce((acc, curr) => acc + curr.estimated_amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">{t.totalSent}</span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  ${estimates.filter(e => e.status === 'sent').reduce((acc, curr) => acc + curr.estimated_amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">{t.totalApproved}</span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  ${estimates.filter(e => e.status === 'approved').reduce((acc, curr) => acc + curr.estimated_amount, 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Barra de Filtros + Paginacion */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 md:mb-3">
              {/* Desktop filter buttons */}
              <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                {['all', 'draft', 'sent', 'approved', 'declined'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {filter === 'all' ? t.filterAll : filter === 'draft' ? t.filterDraft : filter === 'sent' ? t.filterSent : filter === 'approved' ? t.filterApproved : t.filterDeclined}
                  </button>
                ))}
              </div>
              
              {/* Mobile filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="sm:hidden text-xs bg-white border border-gray-300 rounded-md px-3 py-1.5 text-slate-700 w-full"
              >
                {['all', 'draft', 'sent', 'approved', 'declined'].map((filter) => (
                  <option key={filter} value={filter}>
                    {filter === 'all' ? t.filterAll : filter === 'draft' ? t.filterDraft : filter === 'sent' ? t.filterSent : filter === 'approved' ? t.filterApproved : t.filterDeclined}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 sm:ml-auto">
                <label htmlFor="estimate-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {t.rowsPerPage}
                </label>
                <select
                  id="estimate-page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-xs bg-white border border-gray-300 rounded-md px-2 py-1.5 text-slate-700"
                >
                  {[25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.prevPage}
                </button>

                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {t.pageLabel} {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.nextPage}
                </button>
              </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="border border-gray-200 bg-white rounded-xl overflow-x-auto shadow-xs">
              <table className="min-w-[900px] sm:min-w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50 text-slate-500 font-bold">
                    <th className="p-4 w-28">
                      <button
                        type="button"
                        onClick={() => handleSort('date')}
                        className="inline-flex items-center gap-1"
                      >
                        <span>{t.thDate}</span>
                        <span className="inline-flex flex-col leading-none text-[8px]">
                          <span className={sortColumn === 'date' && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
                          <span className={sortColumn === 'date' && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
                        </span>
                      </button>
                    </th>
                    <th className="p-4 w-52">
                      <button
                        type="button"
                        onClick={() => handleSort('customer')}
                        className="inline-flex items-center gap-1"
                      >
                        <span>{t.thCustomer}</span>
                        <span className="inline-flex flex-col leading-none text-[8px]">
                          <span className={sortColumn === 'customer' && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
                          <span className={sortColumn === 'customer' && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
                        </span>
                      </button>
                    </th>
                    <th className="p-4">
                      <button
                        type="button"
                        onClick={() => handleSort('proposal')}
                        className="inline-flex items-center gap-1"
                      >
                        <span>{t.thProposal}</span>
                        <span className="inline-flex flex-col leading-none text-[8px]">
                          <span className={sortColumn === 'proposal' && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
                          <span className={sortColumn === 'proposal' && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
                        </span>
                      </button>
                    </th>
                    <th className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('amount')}
                        className="inline-flex items-center gap-1 justify-end"
                      >
                        <span>{t.thAmount}</span>
                        <span className="inline-flex flex-col leading-none text-[8px]">
                          <span className={sortColumn === 'amount' && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
                          <span className={sortColumn === 'amount' && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
                        </span>
                      </button>
                    </th>
                    <th className="p-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="inline-flex items-center gap-1 justify-center"
                      >
                        <span>{t.thStatus}</span>
                        <span className="inline-flex flex-col leading-none text-[8px]">
                          <span className={sortColumn === 'status' && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
                          <span className={sortColumn === 'status' && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
                        </span>
                      </button>
                    </th>
                    <th className="p-4 text-right w-52">
                      <button
                        type="button"
                        onClick={() => handleSort('actions')}
                        className="inline-flex items-center gap-1 justify-end"
                      >
                        <span>{t.thActions}</span>
                        <span className="inline-flex flex-col leading-none text-[8px]">
                          <span className={sortColumn === 'actions' && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
                          <span className={sortColumn === 'actions' && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
                        </span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
            {filteredEstimates.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">{t.noRecords}</td>
              </tr>
            ) : (
              paginatedEstimates.map((estimate) => (
                <tr key={estimate.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 w-28 text-slate-700 whitespace-nowrap">
                    {new Date(estimate.created_at).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-slate-900">
                      {`${estimate.customers.first_name} ${estimate.customers.last_name}`.trim()}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {estimate.properties?.street_address || t.noProperty}
                    </span>
                  </td>
                  <td className="p-4 w-52">
                    <span className="font-semibold text-slate-900 block truncate" title={estimate.title}>
                      {estimate.title}
                    </span>
                    {estimate.payment_terms ? (
                      <span className="inline-block mt-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {estimate.payment_terms}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-800 whitespace-nowrap">${estimate.estimated_amount.toFixed(2)}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      estimate.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      estimate.status === 'sent' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      estimate.status === 'declined' ? 'bg-red-100 text-red-700 border border-red-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {estimate.status === 'draft' ? t.filterDraft : estimate.status === 'sent' ? t.filterSent : estimate.status === 'approved' ? t.filterApproved : t.filterDeclined}
                    </span>
                  </td>
                  <td className="p-4 text-right w-52">
                    <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                      {estimate.status === 'draft' && (
                        <>
                          <Link
                            href={`/${locale}/dashboard/estimates/${estimate.id}/edit`}
                            className="text-[10px] font-bold text-slate-700 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded transition cursor-pointer inline-block"
                          >
                            {t.actionEdit}
                          </Link>
                          <button
                            onClick={() => handleSendEstimate(estimate.id)}
                            disabled={sendingEstimateId === estimate.id || deletingEstimateId === estimate.id}
                            className="text-[10px] font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 px-2 py-1 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                          >
                            {sendingEstimateId === estimate.id ? t.sendingEmail : t.actionMarkSent}
                          </button>
                          <button
                            onClick={() => handleDeleteEstimate(estimate.id)}
                            disabled={deletingEstimateId === estimate.id || sendingEstimateId === estimate.id}
                            className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-2 py-1 rounded transition cursor-pointer disabled:opacity-50"
                            title={t.actionDelete}
                          >
                            {deletingEstimateId === estimate.id ? t.deleting : t.actionDelete}
                          </button>
                        </>
                      )}
                      {estimate.status === 'sent' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(estimate.id, 'approved')}
                            disabled={approvingEstimateId === estimate.id}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 px-2 py-1 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                          >
                            {approvingEstimateId === estimate.id ? t.approveProcessing : t.actionApproveSchedule}
                          </button>
                          <button
                            onClick={() => handleStatusChange(estimate.id, 'declined')}
                            className="text-[10px] font-bold text-red-700 hover:text-red-800 hover:bg-red-50 border border-red-200 px-2 py-1 rounded transition cursor-pointer"
                          >
                            {t.actionDecline}
                          </button>
                        </>
                      )}
                      {estimate.status === 'approved' && (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md border border-gray-200 shadow-xs select-none">{t.convertedToJob}</span>
                      )}
                      {estimate.status === 'declined' && (
                        <span className="text-[10px] text-red-500 font-bold">{t.declined}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => window.open(`/api/estimates/${estimate.id}/pdf?lng=${locale}`, '_blank', 'noopener,noreferrer')}
                        title={t.actionPrint}
                        aria-label={t.actionPrint}
                        className="inline-flex items-center justify-center p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition duration-150 cursor-pointer border border-transparent hover:border-gray-200"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
                </tbody>
              </table>
            </div>

          </div>
    </main>
  );
}