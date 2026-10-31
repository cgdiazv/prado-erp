'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  Search,
  X,
  ChevronsUpDown,
  UploadCloud,
  Camera,
} from 'lucide-react';
import { createStandaloneInvoice } from '@/app/actions';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import type { CustomerOption, ServiceOption } from '@/components/dashboard/CreateInvoiceModal';

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  sizeLabel: string;
}

interface InvoiceEditorProps {
  locale: string;
  customers: CustomerOption[];
  services: ServiceOption[];
  orgTaxRatePercent?: number;
  orgCurrencyCode?: string | null;
  preselectedCustomerId?: string;
  returnToCustomer?: boolean;
}

// Client-side canvas compression for fast uploads on mobile & desktop
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (file.size <= 300 * 1024) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InvoiceEditor({
  locale,
  customers = [],
  services = [],
  orgTaxRatePercent = 8.25,
  orgCurrencyCode = 'USD',
  preselectedCustomerId = '',
  returnToCustomer = false,
}: InvoiceEditorProps) {
  const router = useRouter();
  const isEs = locale.toLowerCase().startsWith('es');
  const MAX_PHOTOS = 6;

  const backHref =
    returnToCustomer && preselectedCustomerId
      ? `/${locale}/dashboard/customers/${preselectedCustomerId}?tab=invoice`
      : `/${locale}/dashboard/invoices-ledger`;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerComboboxRef = useRef<HTMLDivElement>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(orgTaxRatePercent ?? 8.25);
  const [taxAmount, setTaxAmount] = useState<string>('0.00');
  const [invoiceType, setInvoiceType] = useState<'standard' | 'deposit' | 'final'>('standard');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerComboboxRef.current &&
        !customerComboboxRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const activeCustomerEmail = selectedCustomer?.email || null;

  const filteredCustomers = useMemo(() => {
    const q = customerSearchTerm.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const company = (c.company_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || email.includes(q);
    });
  }, [customers, customerSearchTerm]);

  const currencyCode = normalizeCurrencyCode(orgCurrencyCode);
  const parsedBase = parseFloat(baseAmount) || 0;
  const parsedTax = parseFloat(taxAmount) || 0;
  const calculatedTotal = parseFloat((parsedBase + parsedTax).toFixed(2));

  const handleBaseAmountChange = (val: string) => {
    setBaseAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      if (taxRatePercent > 0) {
        const autoTax = parseFloat((num * (taxRatePercent / 100)).toFixed(2));
        setTaxAmount(autoTax.toFixed(2));
      } else {
        setTaxAmount('0.00');
      }
    } else {
      setTaxAmount('0.00');
    }
  };

  const handleTaxRateChange = (rateVal: number) => {
    const validRate = isNaN(rateVal) ? 0 : Math.max(0, Math.min(100, rateVal));
    setTaxRatePercent(validRate);
    const num = parseFloat(baseAmount);
    if (!isNaN(num) && num >= 0) {
      const autoTax = parseFloat((num * (validRate / 100)).toFixed(2));
      setTaxAmount(autoTax.toFixed(2));
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (!serviceId) return;
    const found = services.find((s) => s.id === serviceId);
    if (!found) return;

    const price = Number(found.base_price || 0);
    setServiceName(found.name);
    if (!notes.trim()) {
      setNotes(found.name);
    }
    if (price > 0) {
      const formattedBase = price.toFixed(2);
      setBaseAmount(formattedBase);
      const computedTax = parseFloat((price * (taxRatePercent / 100)).toFixed(2));
      setTaxAmount(computedTax.toFixed(2));
    }
  };

  const handleQuickDepositPreset = (percentage: number) => {
    const currentBase = Number(baseAmount || 0);
    if (currentBase > 0) {
      const newBase = parseFloat((currentBase * (percentage / 100)).toFixed(2));
      setBaseAmount(newBase.toFixed(2));
      const newTax = parseFloat((newBase * (taxRatePercent / 100)).toFixed(2));
      setTaxAmount(newTax.toFixed(2));
      setInvoiceType('deposit');
      if (!notes.trim()) {
        setNotes(isEs ? `Anticipo ${percentage}%` : `${percentage}% Deposit`);
      }
    }
  };

  const handleQuickDueDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const availableSlots = MAX_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setErrorMessage(
        isEs
          ? `Límite alcanzado: máximo ${MAX_PHOTOS} fotos permitidas.`
          : `Limit reached: maximum ${MAX_PHOTOS} photos allowed.`
      );
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, availableSlots);
    setIsCompressing(true);

    try {
      const newItems: PhotoItem[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file: compressed,
          previewUrl,
          sizeLabel: formatBytes(compressed.size),
        });
      }

      setPhotos((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error('Error processing photos:', err);
      setErrorMessage(
        isEs
          ? 'Error al procesar algunas fotos. Intenta de nuevo.'
          : 'Error processing some photos. Please try again.'
      );
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!selectedCustomerId) {
      setErrorMessage(isEs ? 'Por favor selecciona un cliente.' : 'Please select a customer.');
      return;
    }

    if (!serviceName.trim()) {
      setErrorMessage(
        isEs ? 'Por favor ingresa una descripción del servicio.' : 'Please enter a service description.'
      );
      return;
    }

    if (parsedBase <= 0 && calculatedTotal <= 0) {
      setErrorMessage(isEs ? 'El subtotal debe ser mayor a 0.' : 'Subtotal must be greater than 0.');
      return;
    }

    if (!dueDate) {
      setErrorMessage(isEs ? 'Por favor ingresa una fecha de vencimiento.' : 'Please choose a due date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('customerId', selectedCustomerId);
      formData.append('serviceName', serviceName.trim());
      formData.append('baseAmount', parsedBase.toString());
      formData.append('taxRatePercent', taxRatePercent.toString());
      formData.append('taxAmount', parsedTax.toString());
      formData.append('dueDate', dueDate);
      formData.append('invoiceType', invoiceType);
      formData.append('notes', notes.trim());
      formData.append('sendEmail', sendEmail && Boolean(activeCustomerEmail) ? 'true' : 'false');

      photos.forEach((item) => {
        formData.append('photos', item.file);
      });

      const res = await createStandaloneInvoice(formData);

      if (res.error) {
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      router.push(backHref);
      router.refresh();
    } catch (err: any) {
      console.error('Failed to create standalone invoice:', err);
      setErrorMessage(
        err?.message || (isEs ? 'Error al crear la factura.' : 'Failed to create invoice.')
      );
      setIsSubmitting(false);
    }
  };

  const invoiceTypeLabel =
    invoiceType === 'deposit'
      ? isEs
        ? 'Anticipo'
        : 'Deposit'
      : invoiceType === 'final'
      ? isEs
        ? 'Saldo Final'
        : 'Final Balance'
      : isEs
      ? 'Estándar'
      : 'Standard';

  return (
    <div className="flex-1 w-full min-h-screen bg-slate-50/50 pb-20">
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {returnToCustomer
                  ? isEs
                    ? 'Volver al Cliente'
                    : 'Back to Customer'
                  : isEs
                  ? 'Volver a Facturas'
                  : 'Back to Invoices'}
              </span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {isEs ? 'Nueva Factura' : 'Create New Invoice'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Link
              href={backHref}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </Link>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || isCompressing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEs ? 'Creando Factura...' : 'Creating Invoice...'}</span>
                </>
              ) : (
                <span>{isEs ? 'Emitir Factura' : 'Create & Issue Invoice'}</span>
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
          {/* LEFT COLUMN: The Builder (7 of 12 columns) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Customer & Service Details Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  {isEs ? '1. Cliente y Detalles del Servicio' : '1. Customer & Service Details'}
                </h2>
                {selectedCustomer && (
                  <span className="text-[11px] font-medium text-slate-500">
                    {selectedCustomer.company_name ? `${selectedCustomer.company_name} • ` : ''}
                    {`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Searchable Customer Combobox */}
                <div className="relative" ref={customerComboboxRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEs ? 'Cliente' : 'Customer'} <span className="text-red-500">*</span>
                  </label>
                  <input type="hidden" name="customerId" value={selectedCustomerId} required />

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={
                        isCustomerDropdownOpen
                          ? customerSearchTerm
                          : selectedCustomer
                          ? `${selectedCustomer.company_name ? `${selectedCustomer.company_name} - ` : ''}${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim()
                          : customerSearchTerm
                      }
                      placeholder={
                        isEs
                          ? 'Buscar cliente por nombre o empresa...'
                          : 'Search customer by name or company...'
                      }
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        if (!isCustomerDropdownOpen) {
                          setIsCustomerDropdownOpen(true);
                        }
                      }}
                      className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-14 py-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition outline-none"
                    />

                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                      {selectedCustomerId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId('');
                            setCustomerSearchTerm('');
                            setIsCustomerDropdownOpen(true);
                          }}
                          title={isEs ? 'Quitar cliente seleccionado' : 'Clear selected customer'}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
                      >
                        <ChevronsUpDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isCustomerDropdownOpen && (
                    <div className="absolute z-30 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1 text-xs">
                      {filteredCustomers.length === 0 ? (
                        <div className="px-3.5 py-3 text-slate-400 text-center">
                          {isEs ? 'No se encontraron clientes' : 'No customers found'}
                        </div>
                      ) : (
                        filteredCustomers.map((c) => {
                          const isSelected = c.id === selectedCustomerId;
                          const displayName =
                            `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
                            c.company_name ||
                            'Customer';
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearchTerm('');
                                setIsCustomerDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50/80 text-emerald-950 font-semibold'
                                  : 'text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              <div className="truncate">
                                <span className="block truncate">{displayName}</span>
                                {(c.company_name || c.email) && (
                                  <span className="block text-[11px] text-slate-500 truncate">
                                    {[c.company_name, c.email].filter(Boolean).join(' • ')}
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Optional Catalog Service */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEs ? 'Servicio del Catálogo (Opcional)' : 'Catalog Service (Optional)'}
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => handleServiceSelect(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition outline-none"
                  >
                    <option value="">
                      {isEs
                        ? 'Concepto personalizado / Seleccionar servicio...'
                        : 'Custom concept / Select a saved service...'}
                    </option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                        {service.base_price != null
                          ? ` — ${formatCurrency(Number(service.base_price), currencyCode)}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isEs ? 'Descripción del Servicio' : 'Service Description'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Ej: Mantenimiento HVAC, Limpieza de Jardín, etc.'
                      : 'e.g. HVAC Repair, Yard Clean-up, etc.'
                  }
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition outline-none"
                />
              </div>

              {/* Due Date & Invoice Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEs ? 'Fecha de Vencimiento' : 'Due Date'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition outline-none"
                  />
                  <div className="flex gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate(0)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      {isEs ? 'Hoy' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate(15)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      +15 {isEs ? 'días' : 'days'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate(30)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      +30 {isEs ? 'días' : 'days'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEs ? 'Tipo de Factura' : 'Invoice Type'}
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as 'standard' | 'deposit' | 'final')}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition outline-none"
                  >
                    <option value="standard">{isEs ? 'Estándar' : 'Standard'}</option>
                    <option value="deposit">{isEs ? 'Anticipo' : 'Deposit'}</option>
                    <option value="final">{isEs ? 'Saldo Final' : 'Final Balance'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Pricing & Tax Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  {isEs ? '2. Montos e Impuestos' : '2. Pricing & Tax'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEs ? 'Subtotal (Monto Base)' : 'Subtotal (Base Amount)'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={baseAmount}
                      onChange={(e) => handleBaseAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs pl-7 pr-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {isEs ? 'Impuesto / Tax (%)' : 'Sales Tax (%)'}
                    </label>
                    {typeof orgTaxRatePercent === 'number' && orgTaxRatePercent !== taxRatePercent && (
                      <button
                        type="button"
                        onClick={() => handleTaxRateChange(orgTaxRatePercent)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                      >
                        {orgTaxRatePercent}% Org
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRatePercent}
                      onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                      className="w-24 text-xs px-3 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                    />
                    <span className="text-xs font-semibold text-slate-600">
                      = {formatCurrency(parsedTax, currencyCode)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deposit Shortcuts */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isEs ? 'Atajos de anticipo:' : 'Deposit shortcuts:'}
                </span>
                {[50, 30, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickDepositPreset(pct)}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Photos & Notes Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  {isEs ? '3. Fotos del Trabajo y Notas' : '3. Finished Work Photos & Notes'}
                </h2>
                <span className="text-[11px] font-semibold text-slate-400">
                  {photos.length} / {MAX_PHOTOS}
                </span>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs text-slate-500">
                  {isEs
                    ? 'Sube fotos del trabajo terminado para adjuntarlas al correo y PDF de la factura.'
                    : 'Attach completed work photos to verify service in both the invoice email and PDF.'}
                </p>

                {photos.length < MAX_PHOTOS && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40 rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="flex items-center gap-2 text-emerald-600">
                      <UploadCloud className="w-5 h-5" />
                      <Camera className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {isEs
                        ? 'Haz clic para subir o arrastra tus fotos aquí'
                        : 'Click to upload or drag photos here'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isEs
                        ? 'Soporta JPG, PNG, WEBP. Compresión automática.'
                        : 'Supports JPG, PNG, WEBP. Fast automatic compression.'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      className="hidden"
                    />
                  </div>
                )}

                {isCompressing && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isEs ? 'Optimizando fotos...' : 'Optimizing photos for snappy upload...'}</span>
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                    {photos.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square shadow-2xs"
                      >
                        <img
                          src={item.previewUrl}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(item.id);
                            }}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-1 right-1 text-[9px] bg-slate-900/70 text-white font-mono px-1 py-0.5 rounded backdrop-blur-xs">
                          {item.sizeLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isEs ? 'Notas / Términos de Pago (Opcional)' : 'Notes / Payment Terms (Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Términos adicionales, garantía o instrucciones...'
                      : 'Additional terms, warranty, or payment instructions...'
                  }
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition outline-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Invoice Summary & Submission (5 of 12 columns) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-gray-100 pb-3">
                {isEs ? 'Resumen de Factura' : 'Invoice Summary'}
              </h3>

              <div className="space-y-2.5 text-xs">
                {selectedCustomer && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{isEs ? 'Cliente' : 'Customer'}:</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                      {`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() ||
                        selectedCustomer.company_name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-600">
                  <span>{isEs ? 'Tipo' : 'Type'}:</span>
                  <span className="font-medium text-slate-900">{invoiceTypeLabel}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>{isEs ? 'Vencimiento' : 'Due Date'}:</span>
                  <span className="font-medium text-slate-900">{dueDate || '—'}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>{isEs ? 'Subtotal' : 'Subtotal'}:</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(parsedBase, currencyCode)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    {isEs ? 'Impuesto' : 'Sales Tax'} ({taxRatePercent}%):
                  </span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(parsedTax, currencyCode)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-slate-50/80 p-4 space-y-1">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {isEs ? 'Total a Cobrar' : 'Total Due'}
                </span>
                <span className="block text-2xl font-black text-slate-900">
                  {formatCurrency(calculatedTotal, currencyCode)}
                </span>
              </div>

              {activeCustomerEmail && (
                <label className="flex items-start gap-2.5 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      {isEs
                        ? 'Enviar factura por correo inmediatamente'
                        : 'Send invoice email to customer immediately'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isEs ? 'Se enviará a:' : 'Will be sent to:'}{' '}
                      <span className="font-semibold text-slate-700">{activeCustomerEmail}</span>{' '}
                      {photos.length > 0
                        ? isEs
                          ? `con ${photos.length} foto(s) del trabajo adjunta(s).`
                          : `with ${photos.length} attached finished work photo(s).`
                        : ''}
                    </p>
                  </div>
                </label>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressing}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEs ? 'Creando Factura...' : 'Creating Invoice...'}</span>
                    </>
                  ) : (
                    <span>{isEs ? 'Emitir Factura' : 'Create & Issue Invoice'}</span>
                  )}
                </button>

                <Link
                  href={backHref}
                  className="text-center block w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-medium text-slate-600 transition"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </Link>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

