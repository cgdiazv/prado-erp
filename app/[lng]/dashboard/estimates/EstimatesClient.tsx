'use client';

import { useState, useEffect } from 'react';
import {
  createEstimate,
  updateEstimate,
  updateEstimateStatus,
  convertEstimateToJob,
  getEstimatesDashboardData,
  getEstimateCustomerProperties,
  sendEstimateByEmail,
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

interface ServiceLine {
  id: number;
  serviceId: string;
  price: string;
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
        loading: 'Cargando modulo de estimaciones...',
        pageTitle: 'Estimaciones',
        pageSubtitle: 'Crea propuestas profesionales, envialas a tus clientes y conviertelas en ordenes de trabajo.',
        newEstimate: '+ Nueva Estimacion',
        totalDraft: 'Total en Borrador',
        totalSent: 'Total Enviado',
        totalApproved: 'Total Aprobado',
        filterAll: 'Todos',
        filterDraft: 'Borrador',
        filterSent: 'Enviados',
        filterApproved: 'Aprobados',
        filterDeclined: 'Rechazados',
        rowsPerPage: 'Registros por pagina',
        pageLabel: 'Pagina',
        prevPage: 'Anterior',
        nextPage: 'Siguiente',
        thCustomer: 'Cliente',
        thProposal: 'Servicio',
        thDate: 'Fecha',
        thAmount: 'Importe',
        thStatus: 'Estado',
        thActions: 'Acciones de Flujo',
        noRecords: 'No se encontraron estimaciones en esta categoria.',
        noProperty: 'Sin propiedad vinculada',
        actionEdit: 'Editar',
        actionMarkSent: 'Enviar',
        actionApproveSchedule: 'Aprobar',
        actionDecline: 'Rechazar',
        convertedToJob: 'Enviado a Job',
        declined: 'Rechazado',
        sendingEmail: 'Enviando...',
        sendSuccess: 'Presupuesto enviado exitosamente.',
        sendError: 'Error al enviar presupuesto:',
        modalCreateTitle: 'Nueva Estimacion',
        modalEditTitle: 'Editar Propuesta',
        labelCustomer: 'Cliente Receptor',
        optionSelectCustomer: 'Selecciona un cliente...',
        labelProperty: 'Direccion de Servicio (Propiedad)',
        optionSelectProperty: 'Selecciona una propiedad...',
        optionSelectCustomerFirst: 'Primero selecciona un cliente',
        labelServiceTitle: 'Titulo del Servicio',
        servicesList: 'Servicios y Precios',
        addServiceLine: 'Agregar servicio',
        removeServiceLine: 'Quitar',
        selectService: 'Selecciona un servicio...',
        noServicesSaved: 'No hay servicios guardados en Settings.',
        serviceNamePlaceholder: 'Ej: Reparacion de fuga',
        linePricePlaceholder: '0.00',
        linePriceLabel: 'Precio',
        summaryTotal: 'Total del Presupuesto',
        validationServiceRequired: 'Agrega al menos un servicio con precio valido.',
        servicePlaceholder: 'Ej: Pintura Exterior o Mantenimiento de Techo',
        labelEstimatedAmount: 'Importe Estimado ($)',
        labelNotes: 'Notas / Alcance del Trabajo',
        notesPlaceholder: 'Detalles sobre materiales, mano de obra o condiciones de entrega...',
        labelTruck: 'Camion (opcional)',
        optionSelectTruckOptional: 'Selecciona un camion...',
        cancel: 'Cancelar',
        saveProposal: 'Guardar Estimacion',
        updateProposal: 'Actualizar Propuesta',
        modalApproveTitle: 'Aprobar y Agendar Servicio',
        modalApproveTextStart: 'Estas aprobando el presupuesto por',
        modalApproveTextMid: 'para',
        modalApproveTextEnd: 'Selecciona una fecha para agendarlo inmediatamente en el calendario operativo.',
        fieldDate: 'Fecha de Operacion en Campo',
        approveCreateJob: 'Aprobar y Crear Job',
        approveProcessing: 'Procesando...',
        approveConvertError: 'Cotizacion aprobada, pero fallo la creacion del Job:',
        approveConvertSuccess: 'Cotizacion aprobada y Job agendado con exito!',
      }
    : {
        loading: 'Loading estimates module...',
        pageTitle: 'Estimates',
        pageSubtitle: 'Create professional proposals, send them to your customers, and convert them into work orders.',
        newEstimate: '+ New Estimate',
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
        noRecords: 'No estimates were found in this category.',
        noProperty: 'No linked property',
        actionEdit: 'Edit',
        actionMarkSent: 'Send',
        actionApproveSchedule: 'Approve',
        actionDecline: 'Decline',
        convertedToJob: 'Sent to Job',
        declined: 'Declined',
        sendingEmail: 'Sending...',
        sendSuccess: 'Estimate sent successfully.',
        sendError: 'Error sending estimate:',
        modalCreateTitle: 'New Estimate',
        modalEditTitle: 'Edit Proposal',
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
        serviceNamePlaceholder: 'Ex: Leak repair',
        linePricePlaceholder: '0.00',
        linePriceLabel: 'Price',
        summaryTotal: 'Estimate Total',
        validationServiceRequired: 'Add at least one service with a valid price.',
        servicePlaceholder: 'Ex: Exterior Painting or Roof Maintenance',
        labelEstimatedAmount: 'Estimated Amount ($)',
        labelNotes: 'Notes / Scope of Work',
        notesPlaceholder: 'Details about materials, labor, or delivery conditions...',
        labelTruck: 'Truck (optional)',
        optionSelectTruckOptional: 'Select a truck...',
        cancel: 'Cancel',
        saveProposal: 'Save Estimate',
        updateProposal: 'Update Proposal',
        modalApproveTitle: 'Approve and Schedule Service',
        modalApproveTextStart: 'You are approving the quote for',
        modalApproveTextMid: 'for',
        modalApproveTextEnd: 'Select a date to schedule it immediately in the operations calendar.',
        fieldDate: 'Field Operation Date',
        approveCreateJob: 'Approve and Create Job',
        approveProcessing: 'Processing...',
        approveConvertError: 'Quote approved, but job creation failed:',
        approveConvertSuccess: 'Quote approved and job scheduled successfully!',
      };
  const [estimates, setEstimates] = useState<Estimate[]>(initialData.estimates as any[] || []);
  const [customers, setCustomers] = useState<Customer[]>(initialData.customers as any[] || []);
  const [properties, setProperties] = useState<Property[]>([]);
  const [services, setServices] = useState<Service[]>(initialData.services as any[] || []);
  const [trucks, setTrucks] = useState<Truck[]>(initialData.trucks as any[] || []);
  
  // States de UI
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([{ id: 1, serviceId: '', price: '' }]);
  const [scopeNotes, setScopeNotes] = useState('');

  // State for sending email
  const [sendingEstimateId, setSendingEstimateId] = useState<string | null>(null);
  const [approvingEstimateId, setApprovingEstimateId] = useState<string | null>(null);

  // Cargar propiedades del cliente seleccionado en el formulario
  useEffect(() => {
    if (!selectedCustomerId) {
      setProperties([]);
      return;
    }
    async function fetchProperties() {
      const result = await getEstimateCustomerProperties(selectedCustomerId);
      if (!result?.error && result.properties) {
        setProperties(result.properties as any);
      } else {
        setProperties([]);
      }
    }
    fetchProperties();
  }, [selectedCustomerId]);

  const closeEstimateModal = () => {
    setIsCreateOpen(false);
    setEditingEstimateId(null);
    setSelectedCustomerId('');
    setSelectedPropertyId('');
    setScopeNotes('');
    setServiceLines([{ id: 1, serviceId: '', price: '' }]);
  };

  const parseEstimateForEdit = (estimate: Estimate) => {
    const rawDescription = (estimate.description || '').trim();
    const breakdownLabels = [isEs ? 'Detalle de servicios:' : 'Service breakdown:', 'Service breakdown:', 'Detalle de servicios:'];
    const breakdownLabel = breakdownLabels.find((label) => rawDescription.includes(label));

    let notes = rawDescription;
    let breakdownText = '';

    if (breakdownLabel) {
      const parts = rawDescription.split(breakdownLabel);
      notes = (parts[0] || '').trim();
      breakdownText = (parts.slice(1).join(breakdownLabel) || '').trim();
    }

    const parsedLines = breakdownText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line, index) => {
        const cleaned = line.replace(/^-\s*/, '');
        const match = cleaned.match(/^(.*):\s*\$?([0-9]+(?:\.[0-9]+)?)$/);
        const serviceName = (match?.[1] || '').trim();
        const servicePrice = match?.[2] || '';
        const matchedService = services.find((service) => service.name.trim().toLowerCase() === serviceName.toLowerCase());

        return {
          id: Date.now() + index,
          serviceId: matchedService?.id || services[0]?.id || '',
          price: servicePrice,
        };
      })
      .filter((line) => line.price);

    if (parsedLines.length > 0) {
      return {
        notes,
        lines: parsedLines,
      };
    }

    return {
      notes: rawDescription,
      lines: [{ id: 1, serviceId: '', price: estimate.estimated_amount.toFixed(2) }],
    };
  };

  const openCreateModal = () => {
    setEditingEstimateId(null);
    setSelectedCustomerId('');
    setSelectedPropertyId('');
    setScopeNotes('');
    setServiceLines([{ id: 1, serviceId: '', price: '' }]);
    setIsCreateOpen(true);
  };

  const handleEditEstimate = (estimate: Estimate) => {
    const parsed = parseEstimateForEdit(estimate);
    setEditingEstimateId(estimate.id);
    setSelectedCustomerId(estimate.customer_id);
    setSelectedPropertyId(estimate.property_id || '');
    setScopeNotes(parsed.notes);
    setServiceLines(parsed.lines);
    setIsCreateOpen(true);
  };

  // Manejar creación/edición de cotización
  async function handleSaveEstimate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const validServices = serviceLines
      .map((line) => ({
        serviceId: line.serviceId,
        name: (services.find((service) => service.id === line.serviceId)?.name || '').trim(),
        price: Number.parseFloat(line.price || '0'),
      }))
      .filter((line) => line.serviceId && line.name && line.price > 0);

    if (validServices.length === 0) {
      alert(t.validationServiceRequired);
      return;
    }

    const estimatedAmount = validServices.reduce((sum, line) => sum + line.price, 0);
    const title =
      validServices.length === 1
        ? validServices[0].name
        : isEs
          ? `Presupuesto con ${validServices.length} servicios`
          : `Estimate with ${validServices.length} services`;

    const servicesSummary = validServices
      .map((line) => `- ${line.name}: $${line.price.toFixed(2)}`)
      .join('\n');

    const description = `${scopeNotes.trim() ? `${scopeNotes.trim()}\n\n` : ''}${isEs ? 'Detalle de servicios:' : 'Service breakdown:'}\n${servicesSummary}`;

    formData.set('title', title);
    formData.set('estimatedAmount', estimatedAmount.toFixed(2));
    formData.set('description', description);
    formData.set('lineItemsJson', JSON.stringify(validServices));

    const res = editingEstimateId
      ? await updateEstimate(editingEstimateId, formData)
      : await createEstimate(formData);

    if (res.error) {
      alert(`Error: ${res.error}`);
    } else {
      closeEstimateModal();
      const refreshed = await getEstimatesDashboardData();
      if (!refreshed?.error) {
        setEstimates((refreshed.estimates || []) as any);
      }
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

  const estimateTotal = serviceLines.reduce((sum, line) => {
    const price = Number.parseFloat(line.price || '0');
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);

  const addServiceLine = () => {
    const defaultService = services[0];
    setServiceLines((prev) => [
      ...prev,
      {
        id: Date.now(),
        serviceId: defaultService?.id || '',
        price: defaultService ? Number(defaultService.base_price || 0).toFixed(2) : '',
      },
    ]);
  };

  const removeServiceLine = (id: number) => {
    setServiceLines((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== id) : prev));
  };

  const updateServiceLine = (id: number, field: 'serviceId' | 'price', value: string) => {
    setServiceLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    );
  };

  return (
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-6 md:px-10 pt-10 pb-8 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">

            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.pageTitle}</h1>
                <p className="text-xs text-slate-500 mt-1">{t.pageSubtitle}</p>
              </div>
              <button
                onClick={openCreateModal}
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm"
              >
                {t.newEstimate}
              </button>
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
                    <th className="p-4 text-right w-44">
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
                    <span className="font-semibold text-slate-800">{estimate.title}</span>
                    {estimate.description && (
                      <span className="block text-[10px] text-slate-500 truncate max-w-xs mt-0.5">{estimate.description}</span>
                    )}
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
                  <td className="p-4 text-right space-x-2 w-44">
                    {estimate.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleEditEstimate(estimate)}
                          className="text-[10px] font-bold text-slate-700 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded transition cursor-pointer"
                        >
                          {t.actionEdit}
                        </button>
                        <button
                          onClick={() => handleSendEstimate(estimate.id)}
                          disabled={sendingEstimateId === estimate.id}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 px-2 py-1 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >
                          {sendingEstimateId === estimate.id ? t.sendingEmail : t.actionMarkSent}
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
                  </td>
                </tr>
              ))
            )}
                </tbody>
              </table>
            </div>

      {/* MODAL 1: CREAR ESTIMACION */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editingEstimateId ? t.modalEditTitle : t.modalCreateTitle}</h2>
              <button
                type="button"
                onClick={closeEstimateModal}
                className="cursor-pointer text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSaveEstimate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">{t.labelCustomer}</label>
                <select
                  name="customerId"
                  required
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setSelectedPropertyId('');
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                >
                  <option value="">{t.optionSelectCustomer}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{`${c.first_name} ${c.last_name}`.trim()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">{t.labelProperty}</label>
                <select
                  name="propertyId"
                  disabled={!selectedCustomerId}
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900 disabled:opacity-50"
                >
                  <option value="">{selectedCustomerId ? t.optionSelectProperty : t.optionSelectCustomerFirst}</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.street_address}, {p.city}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-600 font-semibold">{t.servicesList}</label>
                  <button
                    type="button"
                    onClick={addServiceLine}
                    disabled={services.length === 0}
                    className="text-[11px] font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1 rounded-md"
                  >
                    + {t.addServiceLine}
                  </button>
                </div>

                {services.length === 0 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
                    {t.noServicesSaved}
                  </p>
                )}

                <div className="space-y-2">
                  {serviceLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-2 items-center">
                      <select
                        value={line.serviceId}
                        onChange={(e) => {
                          const nextServiceId = e.target.value;
                          const selectedService = services.find((service) => service.id === nextServiceId);
                          updateServiceLine(line.id, 'serviceId', nextServiceId);
                          if (selectedService) {
                            updateServiceLine(line.id, 'price', Number(selectedService.base_price || 0).toFixed(2));
                          }
                        }}
                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                      >
                        <option value="">{t.selectService}</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.price}
                          onChange={(e) => updateServiceLine(line.id, 'price', e.target.value)}
                          placeholder={t.linePricePlaceholder}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                          aria-label={t.linePriceLabel}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeServiceLine(line.id)}
                        disabled={serviceLines.length === 1}
                        className="text-[11px] font-semibold text-red-700 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t.removeServiceLine}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-right">
                  <span className="text-[11px] text-slate-500 font-semibold">{t.summaryTotal}: </span>
                  <span className="text-sm font-bold text-slate-900">${estimateTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">{t.labelNotes}</label>
                <textarea
                  name="description"
                  value={scopeNotes}
                  onChange={(e) => setScopeNotes(e.target.value)}
                  placeholder={t.notesPlaceholder}
                  rows={3}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition font-bold"
                >
                  {editingEstimateId ? t.updateProposal : t.saveProposal}
                </button>
                <button
                  type="button"
                  onClick={closeEstimateModal}
                  className="w-1/2 border border-gray-300 hover:bg-gray-50 p-2.5 rounded-lg transition font-bold text-slate-700"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          </div>
    </main>
  );
}