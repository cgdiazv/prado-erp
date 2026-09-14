'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  Building2,
  User,
  FileText,
  Clock,
  Package,
  Wrench,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import {
  createEstimate,
  updateEstimate,
  getEstimateCustomerProperties,
} from '@/app/actions';

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

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string;
}

export interface Property {
  id: string;
  street_address: string;
  city: string;
}

export interface Service {
  id: string;
  name: string;
  base_price: number;
}

interface QuoteEditorProps {
  locale: string;
  mode: 'create' | 'edit';
  initialEstimate?: any;
  initialProperties?: Property[];
  customers: Customer[];
  services: Service[];
  defaultLaborRate: number;
  defaultLaborCost: number;
  defaultMaterialsMarkup: number;
  defaultPaymentTerms: string;
  preselectedCustomerId?: string;
}

export default function QuoteEditor({
  locale,
  mode,
  initialEstimate,
  initialProperties = [],
  customers,
  services,
  defaultLaborRate,
  defaultLaborCost,
  defaultMaterialsMarkup,
  defaultPaymentTerms,
  preselectedCustomerId,
}: QuoteEditorProps) {
  const router = useRouter();
  const isEs = locale === 'es';

  // UI Strings
  const t = {
    backToQuotes: isEs ? 'Volver a Cotizaciones' : 'Back to Quotes',
    newQuoteTitle: isEs ? 'Nueva Cotización' : 'New Quote',
    editQuoteTitle: isEs ? 'Editar Cotización' : 'Edit Quote',
    pageSubtitle: isEs
      ? 'Define servicios, mano de obra y materiales con cálculo de rentabilidad en tiempo real.'
      : 'Define services, labor, and materials with real-time profitability tracking.',
    saveQuote: isEs ? 'Guardar Cotización' : 'Save Quote',
    saveChanges: isEs ? 'Guardar Cambios' : 'Save Changes',
    saving: isEs ? 'Guardando...' : 'Saving...',
    cancel: isEs ? 'Cancelar' : 'Cancel',
    customerSectionTitle: isEs ? '1. Cliente y Propiedad' : '1. Customer & Property',
    selectCustomer: isEs ? 'Seleccionar Cliente...' : 'Select Customer...',
    selectProperty: isEs ? 'Seleccionar Propiedad...' : 'Select Property...',
    noCustomerSelected: isEs ? 'Primero selecciona un cliente' : 'Select a customer first',
    noPropertiesFound: isEs ? 'Sin propiedades registradas' : 'No properties found',
    itemsSectionTitle: isEs ? '2. Detalle de Servicios y Costos' : '2. Line Items & Costs',
    addService: isEs ? '+ Servicio' : '+ Service',
    addLabor: isEs ? '+ Mano de Obra' : '+ Labor',
    addMaterial: isEs ? '+ Materiales' : '+ Materials',
    termsSectionTitle: isEs ? '3. Términos y Notas de Alcance' : '3. Terms & Scope Notes',
    paymentTermsLabel: isEs ? 'Condiciones de Pago' : 'Payment Terms',
    paymentTermsPlaceholder: isEs ? 'ej. 50% anticipo, 50% al finalizar' : 'e.g. 50% deposit, 50% on completion',
    notesLabel: isEs ? 'Notas de Alcance / Instrucciones (Visibles en el PDF)' : 'Scope Notes / Instructions (Visible on PDF)',
    notesPlaceholder: isEs
      ? 'Detalles específicos del trabajo, condiciones del sitio, garantías...'
      : 'Specific job details, site requirements, warranty notes...',
    profitabilityTitle: isEs ? 'Rentabilidad Interna' : 'Internal Profitability',
    totalQuoted: isEs ? 'Total Cotizado' : 'Total Quoted',
    estCost: isEs ? 'Costo Estimado' : 'Est. Cost',
    estMargin: isEs ? 'Margen Est.' : 'Est. Margin',
    summaryTitle: isEs ? 'Resumen de la Cotización' : 'Quote Summary',
    summaryTotal: isEs ? 'Total a Facturar' : 'Total to Bill',
    breakdownNotice: isEs
      ? 'Los costos privados de mano de obra y márgenes de materiales son estrictamente internos y nunca se muestran al cliente.'
      : 'Private labor costs and material markups are strictly internal and will never appear on customer-facing documents.',
    validationCustomer: isEs ? 'Por favor selecciona un cliente.' : 'Please select a customer.',
    validationLineItems: isEs ? 'Debes agregar al menos una línea con precio mayor a 0.' : 'Please add at least one line item with a price greater than 0.',
    laborRateLabel: isEs ? 'Tarifa $/hr' : 'Rate $/hr',
    laborHoursLabel: isEs ? 'Horas' : 'Hours',
    laborPrivateCostLabel: isEs ? 'Costo interno' : 'Internal cost',
    materialCostLabel: isEs ? 'Costo para ti ($)' : 'Cost to you ($)',
    materialMarkupLabel: isEs ? 'Margen (%)' : 'Markup (%)',
    suggestedPrice: isEs ? 'Precio sugerido' : 'Suggested price',
    materialProfit: isEs ? 'Ganancia en materiales' : 'Materials profit',
  };

  // State initialization
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    return initialEstimate?.customer_id || preselectedCustomerId || '';
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    return initialEstimate?.property_id || '';
  });
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [scopeNotes, setScopeNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(
    initialEstimate?.payment_terms || defaultPaymentTerms || 'Due on Receipt'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Line Items Helper
  const createDefaultLine = (type: LineItemType = 'service'): ServiceLine => {
    const defaultService = services.length > 0 ? services[0] : null;
    if (type === 'labor') {
      const hrs = '3';
      const rate = defaultLaborRate;
      return {
        id: Date.now() + Math.random(),
        type: 'labor',
        serviceId: '__custom__',
        customName: isEs ? 'Mano de obra' : 'Labor',
        hours: hrs,
        laborRate: rate.toFixed(2),
        laborCost: defaultLaborCost.toFixed(2),
        price: (Number.parseFloat(hrs) * rate).toFixed(2),
      };
    }
    if (type === 'material') {
      const cost = 100;
      const markup = defaultMaterialsMarkup;
      const price = cost * (1 + markup / 100);
      return {
        id: Date.now() + Math.random(),
        type: 'material',
        serviceId: '__custom__',
        customName: isEs ? 'Materiales y suministros' : 'Materials & Supplies',
        materialCost: cost.toFixed(2),
        materialMarkup: markup.toFixed(0),
        price: price.toFixed(2),
      };
    }
    return {
      id: Date.now() + Math.random(),
      type: 'service',
      serviceId: defaultService ? defaultService.id : '__custom__',
      customName: '',
      price: defaultService ? Number(defaultService.base_price || 0).toFixed(2) : '',
    };
  };

  // Parse lines if editing
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(() => {
    if (!initialEstimate) {
      return [createDefaultLine('service')];
    }

    const rawDescription = (initialEstimate.description || '').trim();
    const breakdownLabels = ['Detalle de servicios:', 'Service breakdown:'];
    const breakdownLabel = breakdownLabels.find((label) => rawDescription.includes(label));

    let breakdownText = '';
    if (breakdownLabel) {
      const parts = rawDescription.split(breakdownLabel);
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

        const laborMatch = serviceName.match(/^(.*?)(?:\s*\(([0-9.]+)\s*hrs?\))$/i);
        if (laborMatch) {
          const hours = laborMatch[2];
          const taskName = laborMatch[1].trim();
          const parsedPrice = Number.parseFloat(servicePrice) || 0;
          const calculatedRate =
            Number(hours) > 0 ? (parsedPrice / Number(hours)).toFixed(2) : defaultLaborRate.toFixed(2);
          return {
            id: Date.now() + index,
            type: 'labor' as LineItemType,
            serviceId: '__custom__',
            customName: taskName || (isEs ? 'Mano de obra' : 'Labor'),
            hours,
            laborRate: calculatedRate,
            laborCost: defaultLaborCost.toFixed(2),
            price: servicePrice,
          };
        }

        if (/material/i.test(serviceName)) {
          const parsedPrice = Number.parseFloat(servicePrice) || 0;
          const estimatedCost = (parsedPrice / (1 + defaultMaterialsMarkup / 100)).toFixed(2);
          return {
            id: Date.now() + index,
            type: 'material' as LineItemType,
            serviceId: '__custom__',
            customName: serviceName,
            materialCost: estimatedCost,
            materialMarkup: defaultMaterialsMarkup.toFixed(2),
            price: servicePrice,
          };
        }

        const matchedService = services.find(
          (service) => service.name.trim().toLowerCase() === serviceName.toLowerCase()
        );

        return {
          id: Date.now() + index,
          type: 'service' as LineItemType,
          serviceId: matchedService ? matchedService.id : '__custom__',
          customName: matchedService ? '' : serviceName,
          price: servicePrice,
        };
      })
      .filter((line) => line.price);

    if (parsedLines.length > 0) {
      return parsedLines;
    }

    const matchedService = services.find(
      (service) => service.name.trim().toLowerCase() === (initialEstimate.title || '').trim().toLowerCase()
    );
    return [
      {
        id: 1,
        type: 'service' as LineItemType,
        serviceId: matchedService ? matchedService.id : (services.length > 0 ? '' : '__custom__'),
        customName: matchedService ? '' : (initialEstimate.title || ''),
        price: Number(initialEstimate.estimated_amount || 0).toFixed(2),
      },
    ];
  });

  // Extract initial scope notes if editing
  useEffect(() => {
    if (initialEstimate?.description) {
      const rawDescription = (initialEstimate.description || '').trim();
      const breakdownLabels = ['Detalle de servicios:', 'Service breakdown:'];
      const breakdownLabel = breakdownLabels.find((label) => rawDescription.includes(label));
      if (breakdownLabel) {
        const parts = rawDescription.split(breakdownLabel);
        setScopeNotes((parts[0] || '').trim());
      } else {
        setScopeNotes(rawDescription);
      }
    }
  }, [initialEstimate]);

  // Load customer properties when selected customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setProperties([]);
      setSelectedPropertyId('');
      return;
    }

    // Don't refetch if initialProperties already belongs to this customer
    if (initialEstimate?.customer_id === selectedCustomerId && initialProperties.length > 0) {
      setProperties(initialProperties);
      return;
    }

    let isMounted = true;
    async function loadProperties() {
      setLoadingProperties(true);
      const res = await getEstimateCustomerProperties(selectedCustomerId);
      if (isMounted) {
        if (res.success && res.properties) {
          setProperties(res.properties);
          // If previous property doesn't exist in new list, reset it
          if (!res.properties.some((p: any) => p.id === selectedPropertyId)) {
            setSelectedPropertyId(res.properties[0]?.id || '');
          }
        } else {
          setProperties([]);
          setSelectedPropertyId('');
        }
        setLoadingProperties(false);
      }
    }

    loadProperties();
    return () => {
      isMounted = false;
    };
  }, [selectedCustomerId]);

  // Line Item actions
  const addServiceLine = (type: LineItemType = 'service') => {
    setServiceLines((prev) => [...prev, createDefaultLine(type)]);
  };

  const removeServiceLine = (id: number) => {
    if (serviceLines.length === 1) {
      setServiceLines([createDefaultLine('service')]);
      return;
    }
    setServiceLines((prev) => prev.filter((line) => line.id !== id));
  };

  const updateServiceLine = (id: number, field: keyof ServiceLine, value: any) => {
    setServiceLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const updated = { ...line, [field]: value };

        if (line.type === 'labor') {
          if (field === 'hours' || field === 'laborRate') {
            const hrs = Number.parseFloat(field === 'hours' ? value : line.hours || '0') || 0;
            const rate = Number.parseFloat(field === 'laborRate' ? value : line.laborRate || String(defaultLaborRate)) || 0;
            updated.price = (hrs * rate).toFixed(2);
          }
        } else if (line.type === 'material') {
          if (field === 'materialCost' || field === 'materialMarkup') {
            const cost = Number.parseFloat(field === 'materialCost' ? value : line.materialCost || '0') || 0;
            const markup = Number.parseFloat(field === 'materialMarkup' ? value : line.materialMarkup || String(defaultMaterialsMarkup)) || 0;
            updated.price = (cost * (1 + markup / 100)).toFixed(2);
          }
        }

        return updated;
      })
    );
  };

  // Real-time calculations
  const profitability = useMemo(() => {
    let totalQuoted = 0;
    let estCost = 0;

    for (const line of serviceLines) {
      const linePrice = Number.parseFloat(line.price || '0') || 0;
      totalQuoted += linePrice;

      if (line.type === 'labor') {
        const hrs = Number.parseFloat(line.hours || '0') || 0;
        const internalCostPerHour = Number.parseFloat(line.laborCost || String(defaultLaborCost)) || 0;
        estCost += hrs * internalCostPerHour;
      } else if (line.type === 'material') {
        const costToYou = Number.parseFloat(line.materialCost || '0') || 0;
        estCost += costToYou;
      } else {
        estCost += linePrice * 0.6; // Default baseline assumption for standard services
      }
    }

    const estMarginDollar = Math.max(0, totalQuoted - estCost);
    const estMarginPercent = totalQuoted > 0 ? (estMarginDollar / totalQuoted) * 100 : 0;

    return {
      totalQuoted,
      estCost,
      estMarginDollar,
      estMarginPercent,
    };
  }, [serviceLines, defaultLaborCost, defaultMaterialsMarkup]);

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCustomerId) {
      setErrorMessage(t.validationCustomer);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const validServices = serviceLines
      .map((line) => {
        let name = '';
        if (line.type === 'labor') {
          const hours = Number.parseFloat(line.hours || '1');
          const hoursLabel = hours === 1 ? '1 hr' : `${hours} hrs`;
          const baseName = line.customName?.trim() || (isEs ? 'Mano de obra' : 'Labor');
          name = `${baseName} (${hoursLabel})`;
        } else if (line.type === 'material') {
          name = line.customName?.trim() || (isEs ? 'Materiales y suministros' : 'Materials & Supplies');
        } else {
          const isCustom = line.serviceId === '__custom__' || services.length === 0;
          const matchedService = services.find((service) => service.id === line.serviceId);
          name = (isCustom ? (line.customName || '') : (matchedService?.name || '')).trim();
        }

        return {
          type: line.type,
          serviceId: line.type === 'service' && line.serviceId !== '__custom__' ? line.serviceId : null,
          name,
          price: Number.parseFloat(line.price || '0'),
          hours: line.hours,
          laborRate: line.laborRate,
          laborCost: line.laborCost,
          materialCost: line.materialCost,
          materialMarkup: line.materialMarkup,
        };
      })
      .filter((line) => line.name && line.price > 0);

    if (validServices.length === 0) {
      setErrorMessage(t.validationLineItems);
      return;
    }

    const estimatedAmount = validServices.reduce((sum, line) => sum + line.price, 0);
    const title =
      validServices.length === 1
        ? validServices[0].name
        : isEs
          ? `Presupuesto con ${validServices.length} servicios`
          : `Quote with ${validServices.length} services`;

    const servicesSummary = validServices
      .map((line) => `- ${line.name}: $${line.price.toFixed(2)}`)
      .join('\n');

    const description = `${scopeNotes.trim() ? `${scopeNotes.trim()}\n\n` : ''}${
      isEs ? 'Detalle de servicios:' : 'Service breakdown:'
    }\n${servicesSummary}`;

    const formData = new FormData();
    formData.set('customerId', selectedCustomerId);
    formData.set('propertyId', selectedPropertyId || '');
    formData.set('title', title);
    formData.set('estimatedAmount', estimatedAmount.toFixed(2));
    formData.set('description', description);
    formData.set('paymentTerms', paymentTerms);
    formData.set('lineItemsJson', JSON.stringify(validServices));

    setIsSaving(true);
    try {
      const res =
        mode === 'edit' && initialEstimate?.id
          ? await updateEstimate(initialEstimate.id, formData)
          : await createEstimate(formData);

      if (res.error) {
        setErrorMessage(res.error);
        setIsSaving(false);
      } else {
        router.push(`/${locale}/dashboard/estimates`);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save quote');
      setIsSaving(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/dashboard/estimates`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.backToQuotes}</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                {mode === 'edit' ? t.editQuoteTitle : t.newQuoteTitle}
                {mode === 'edit' && initialEstimate?.estimate_number && (
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {initialEstimate.estimate_number}
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Link
              href={`/${locale}/dashboard/estimates`}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
            >
              {t.cancel}
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.saving}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{mode === 'edit' ? t.saveChanges : t.saveQuote}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-column container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: The Builder (7 of 12 columns ~ 60%) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Customer & Property Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">{t.customerSectionTitle}</h2>
                </div>
                {selectedCustomer && (
                  <span className="text-[11px] font-medium text-slate-500">
                    {selectedCustomer.company_name ? `${selectedCustomer.company_name} • ` : ''}
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEs ? 'Cliente' : 'Customer'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                    required
                  >
                    <option value="">{t.selectCustomer}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name ? `${c.company_name} - ` : ''}
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEs ? 'Propiedad / Dirección' : 'Property / Address'}
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    disabled={!selectedCustomerId || loadingProperties}
                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition disabled:opacity-50 disabled:bg-slate-50"
                  >
                    <option value="">
                      {!selectedCustomerId
                        ? t.noCustomerSelected
                        : loadingProperties
                          ? (isEs ? 'Cargando propiedades...' : 'Loading properties...')
                          : properties.length === 0
                            ? t.noPropertiesFound
                            : t.selectProperty}
                    </option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.street_address}, {p.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Line Items Builder Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">{t.itemsSectionTitle}</h2>
                </div>

                {/* Add Line Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addServiceLine('service')}
                    className="cursor-pointer text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-slate-500" />
                    <span>{t.addService}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addServiceLine('labor')}
                    className="cursor-pointer text-[11px] font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>{t.addLabor}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addServiceLine('material')}
                    className="cursor-pointer text-[11px] font-semibold text-amber-800 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <Package className="w-3 h-3 text-amber-600" />
                    <span>{t.addMaterial}</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3.5">
                {serviceLines.map((line, index) => {
                  const isCustom = line.serviceId === '__custom__';

                  return (
                    <div
                      key={line.id}
                      className="group relative rounded-xl border border-gray-200 bg-slate-50/40 hover:bg-slate-50/80 p-4 transition space-y-3"
                    >
                      {/* Top bar of item card: Type indicator + Delete button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                          {line.type === 'labor' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                              <Clock className="w-2.5 h-2.5" />
                              {isEs ? 'Mano de Obra' : 'Labor'}
                            </span>
                          ) : line.type === 'material' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                              <Package className="w-2.5 h-2.5" />
                              {isEs ? 'Materiales' : 'Materials'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              <Wrench className="w-2.5 h-2.5" />
                              {isEs ? 'Servicio' : 'Service'}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeServiceLine(line.id)}
                          className="cursor-pointer text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition"
                          title={isEs ? 'Eliminar línea' : 'Delete item'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line content based on type */}
                      {line.type === 'labor' ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_110px_120px] gap-2.5 items-end">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                {isEs ? 'Descripción del trabajo' : 'Labor Description'}
                              </label>
                              <input
                                type="text"
                                value={line.customName || ''}
                                onChange={(e) => updateServiceLine(line.id, 'customName', e.target.value)}
                                placeholder={isEs ? 'ej. Instalación, reparación, cableado' : 'e.g. Installation, diagnostics'}
                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                {t.laborHoursLabel}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line.hours || ''}
                                  onChange={(e) => updateServiceLine(line.id, 'hours', e.target.value)}
                                  placeholder="3"
                                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs pr-7 focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] text-slate-400 font-semibold pointer-events-none">
                                  hrs
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                {t.laborRateLabel}
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[10px] text-slate-400 font-semibold pointer-events-none">
                                  $
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.laborRate || ''}
                                  onChange={(e) => updateServiceLine(line.id, 'laborRate', e.target.value)}
                                  placeholder={defaultLaborRate.toFixed(2)}
                                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs pl-5 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                {isEs ? 'Precio Total ($)' : 'Total Price ($)'}
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[10px] text-emerald-600 font-semibold pointer-events-none">
                                  $
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.price || ''}
                                  onChange={(e) => updateServiceLine(line.id, 'price', e.target.value)}
                                  className="w-full bg-emerald-50/60 border border-emerald-300 rounded-lg p-2 text-emerald-950 font-bold text-xs pl-5 focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] text-slate-500 bg-white border border-gray-200/80 rounded-lg px-3 py-1.5">
                            <span>
                              {isEs ? 'Fórmula: ' : 'Formula: '}
                              <strong className="text-slate-700">
                                {line.hours || '0'} hrs x ${Number(line.laborRate || defaultLaborRate).toFixed(2)}/hr = ${Number(line.price || 0).toFixed(2)}
                              </strong>
                            </span>
                            <span className="text-slate-500">
                              {isEs ? 'Costo interno privado: ' : 'Private internal cost: '}
                              <strong className="text-slate-700">
                                ${(
                                  (Number.parseFloat(line.hours || '0') || 0) *
                                  (Number.parseFloat(line.laborCost || String(defaultLaborCost)) || 0)
                                ).toFixed(2)}
                              </strong>{' '}
                              (${Number(line.laborCost || defaultLaborCost).toFixed(2)}/hr)
                            </span>
                          </div>
                        </div>
                      ) : line.type === 'material' ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_95px_120px] gap-2.5 items-end">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                {isEs ? 'Materiales / Suministros' : 'Materials / Supplies'}
                              </label>
                              <input
                                type="text"
                                value={line.customName || ''}
                                onChange={(e) => updateServiceLine(line.id, 'customName', e.target.value)}
                                placeholder={isEs ? 'ej. Tubería, cableado, repuestos' : 'e.g. Pipes, wiring, supplies'}
                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                {t.materialCostLabel}
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[10px] text-slate-400 font-semibold pointer-events-none">
                                  $
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.materialCost || ''}
                                  onChange={(e) => updateServiceLine(line.id, 'materialCost', e.target.value)}
                                  placeholder="100.00"
                                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs pl-5 focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                {t.materialMarkupLabel}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={line.materialMarkup || ''}
                                  onChange={(e) => updateServiceLine(line.id, 'materialMarkup', e.target.value)}
                                  placeholder={defaultMaterialsMarkup.toFixed(0)}
                                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs pr-6 focus:ring-1 focus:ring-amber-500"
                                />
                                <span className="absolute inset-y-0 right-0 pr-2 flex items-center text-[10px] text-slate-400 font-semibold pointer-events-none">
                                  %
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                {isEs ? 'Precio Total ($)' : 'Total Price ($)'}
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[10px] text-emerald-600 font-semibold pointer-events-none">
                                  $
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.price || ''}
                                  onChange={(e) => updateServiceLine(line.id, 'price', e.target.value)}
                                  className="w-full bg-emerald-50/60 border border-emerald-300 rounded-lg p-2 text-emerald-950 font-bold text-xs pl-5 focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] text-slate-500 bg-white border border-gray-200/80 rounded-lg px-3 py-1.5">
                            <span>
                              {t.suggestedPrice}:{' '}
                              <strong className="text-slate-700">
                                ${Number(line.materialCost || 0).toFixed(2)} +{' '}
                                {Number(line.materialMarkup || defaultMaterialsMarkup).toFixed(0)}% = $
                                {Number(line.price || 0).toFixed(2)}
                              </strong>
                            </span>
                            <span className="text-emerald-700 font-medium">
                              {t.materialProfit}:{' '}
                              <strong>
                                $
                                {Math.max(
                                  0,
                                  (Number.parseFloat(line.price || '0') || 0) -
                                    (Number.parseFloat(line.materialCost || '0') || 0)
                                ).toFixed(2)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Standard Service Item */
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2.5 items-center">
                          {services.length === 0 ? (
                            <input
                              type="text"
                              value={line.customName || ''}
                              onChange={(e) => updateServiceLine(line.id, 'customName', e.target.value)}
                              placeholder={isEs ? 'Nombre del servicio' : 'Service name'}
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                          ) : isCustom ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={line.customName || ''}
                                onChange={(e) => updateServiceLine(line.id, 'customName', e.target.value)}
                                placeholder={isEs ? 'Nombre del servicio personalizado' : 'Custom service name'}
                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  updateServiceLine(line.id, 'serviceId', services[0]?.id || '');
                                  updateServiceLine(line.id, 'customName', '');
                                  if (services[0]) {
                                    updateServiceLine(line.id, 'price', Number(services[0].base_price || 0).toFixed(2));
                                  }
                                }}
                                title={isEs ? 'Seleccionar del catálogo' : 'Select from catalog'}
                                className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 px-2 py-2 border border-gray-300 rounded-lg bg-slate-50 hover:bg-slate-100 whitespace-nowrap transition"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <select
                              value={line.serviceId}
                              onChange={(e) => {
                                const nextServiceId = e.target.value;
                                if (nextServiceId === '__custom__') {
                                  updateServiceLine(line.id, 'serviceId', '__custom__');
                                  updateServiceLine(line.id, 'customName', '');
                                  return;
                                }
                                const selectedService = services.find((service) => service.id === nextServiceId);
                                updateServiceLine(line.id, 'serviceId', nextServiceId);
                                if (selectedService) {
                                  updateServiceLine(line.id, 'price', Number(selectedService.base_price || 0).toFixed(2));
                                }
                              }}
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">{isEs ? 'Seleccionar Servicio...' : 'Select Service...'}</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name}
                                </option>
                              ))}
                              <option value="__custom__">{isEs ? '+ Servicio personalizado...' : '+ Custom service...'}</option>
                            </select>
                          )}

                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.price}
                              onChange={(e) => updateServiceLine(line.id, 'price', e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-900 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Terms & Scope Notes Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">{t.termsSectionTitle}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t.paymentTermsLabel}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={
                        ['Due on Receipt', 'Net 15', 'Net 30', 'Net 60', '50% Deposit / 50% Completion'].includes(
                          paymentTerms
                        )
                          ? paymentTerms
                          : 'Custom'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'Custom') {
                          setPaymentTerms(e.target.value);
                        }
                      }}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                    >
                      <option value="Due on Receipt">{isEs ? 'Al contado / Al recibir' : 'Due on Receipt'}</option>
                      <option value="Net 15">Net 15 (15 días)</option>
                      <option value="Net 30">Net 30 (30 días)</option>
                      <option value="Net 60">Net 60 (60 días)</option>
                      <option value="50% Deposit / 50% Completion">
                        {isEs ? '50% Anticipo / 50% Al Finalizar' : '50% Deposit / 50% Completion'}
                      </option>
                      <option value="Custom">{isEs ? 'Personalizado...' : 'Custom...'}</option>
                    </select>

                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder={t.paymentTermsPlaceholder}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t.notesLabel}
                  </label>
                  <textarea
                    rows={4}
                    value={scopeNotes}
                    onChange={(e) => setScopeNotes(e.target.value)}
                    placeholder={t.notesPlaceholder}
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Profitability & Live Financial Summary (5 of 12 columns ~ 40%) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            {/* Card A: Internal Profitability Scorecard (Light Theme, No Admin Tag) */}
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {t.profitabilityTitle}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-800/80 uppercase tracking-wider bg-emerald-100/60 px-2 py-0.5 rounded-full">
                  {isEs ? 'Privado' : 'Internal'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
                  <span className="block text-[11px] text-slate-500 mb-0.5">{t.totalQuoted}</span>
                  <strong className="text-base font-bold text-slate-950">
                    ${profitability.totalQuoted.toFixed(2)}
                  </strong>
                </div>

                <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
                  <span className="block text-[11px] text-slate-500 mb-0.5">{t.estCost}</span>
                  <strong className="text-base font-bold text-slate-800">
                    ${profitability.estCost.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="rounded-xl bg-white/90 border border-emerald-200 p-3.5 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] text-slate-500">{t.estMargin}</span>
                  <span className="text-xs text-slate-500">
                    ${profitability.estMarginDollar.toFixed(2)} {isEs ? 'ganancia' : 'profit'}
                  </span>
                </div>
                <strong className="text-xl font-extrabold text-emerald-700">
                  {profitability.estMarginPercent.toFixed(1)}%
                </strong>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t.breakdownNotice}
              </p>
            </div>

            {/* Card B: Document Summary & Submission */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                {t.summaryTitle}
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{isEs ? 'Líneas añadidas' : 'Line items'}:</span>
                  <span className="font-semibold text-slate-900">{serviceLines.length}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>{t.paymentTermsLabel}:</span>
                  <span className="font-medium text-slate-900 truncate max-w-[180px]">{paymentTerms}</span>
                </div>

                {selectedCustomer && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{isEs ? 'Cliente' : 'Customer'}:</span>
                    <span className="font-medium text-slate-900 truncate max-w-[180px]">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-slate-50/80 p-4 space-y-1">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t.summaryTotal}
                </span>
                <span className="block text-2xl font-black text-slate-900">
                  ${profitability.totalQuoted.toFixed(2)}
                </span>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.saving}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{mode === 'edit' ? t.saveChanges : t.saveQuote}</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/${locale}/dashboard/estimates`}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition block text-center"
                >
                  {t.cancel}
                </Link>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
