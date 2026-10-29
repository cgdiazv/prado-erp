'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createStandaloneInvoice } from '@/app/actions';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import {
  X,
  DollarSign,
  Calendar,
  Percent,
  UploadCloud,
  Camera,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  FileText,
  Image as ImageIcon,
  Send,
  HelpCircle,
} from 'lucide-react';

export interface CustomerOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdInvoice: any) => void;
  customers: CustomerOption[];
  defaultCustomerId?: string;
  locale?: string;
  orgTaxRatePercent?: number;
  orgCurrencyCode?: string;
}

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  sizeLabel: string;
}

// Client-side canvas compression to ensure snappy uploads even on mobile cellular data
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

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  customers,
  defaultCustomerId = '',
  locale = 'en',
  orgTaxRatePercent = 8.25,
  orgCurrencyCode = 'USD',
}: CreateInvoiceModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const MAX_PHOTOS = 6;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('0');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(orgTaxRatePercent);
  const [invoiceType, setInvoiceType] = useState<'standard' | 'deposit' | 'final'>('standard');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up preview object URLs
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomerId(defaultCustomerId || (customers[0]?.id ?? ''));
      setCustomerSearch('');
      setServiceName('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setBaseAmount('');
      setTaxRatePercent(typeof orgTaxRatePercent === 'number' ? orgTaxRatePercent : 8.25);
      setTaxAmount('0');
      setInvoiceType('standard');
      setNotes('');
      setSendEmail(true);
      setPhotos([]);
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
      setIsCompressing(false);
    }
  }, [isOpen, defaultCustomerId, customers, orgTaxRatePercent]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const comp = (c.company_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || comp.includes(q) || email.includes(q);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  if (!isOpen) return null;

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
    setTaxRatePercent(rateVal);
    const num = parseFloat(baseAmount);
    if (!isNaN(num) && num >= 0) {
      const autoTax = parseFloat((num * (rateVal / 100)).toFixed(2));
      setTaxAmount(autoTax.toFixed(2));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedCustomerId) {
      setErrorMessage(isEs ? 'Por favor selecciona un cliente.' : 'Please select a customer.');
      return;
    }

    if (parsedBase <= 0) {
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
      formData.append('serviceName', serviceName.trim() || (isEs ? 'Servicio General' : 'General Service'));
      formData.append('baseAmount', parsedBase.toString());
      formData.append('taxRatePercent', taxRatePercent.toString());
      formData.append('taxAmount', parsedTax.toString());
      formData.append('dueDate', dueDate);
      formData.append('invoiceType', invoiceType);
      formData.append('notes', notes.trim());
      formData.append('sendEmail', sendEmail ? 'true' : 'false');

      photos.forEach((item) => {
        formData.append('photos', item.file);
      });

      const res = await createStandaloneInvoice(formData);

      if (res.error) {
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        isEs
          ? '¡Factura creada y emitida exitosamente!'
          : 'Invoice created and issued successfully!'
      );

      if (onSuccess) {
        onSuccess(res.invoice);
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Failed to create standalone invoice:', err);
      setErrorMessage(
        err?.message || (isEs ? 'Error al crear la factura.' : 'Failed to create invoice.')
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {isEs ? 'Nueva Factura' : 'Create New Invoice'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEs
                ? 'Emite una factura sin requerir cotización ni agendamiento previo.'
                : 'Issue an invoice directly without prior quote or scheduled job.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              {isEs ? 'Cliente' : 'Customer'} <span className="text-red-500">*</span>
            </label>
            {defaultCustomerId && selectedCustomer ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || selectedCustomer.company_name}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedCustomer.email || (isEs ? 'Sin correo' : 'No email')}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isEs ? 'Fijado al cliente actual' : 'Current Customer'}
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {customers.length > 8 && (
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={isEs ? 'Buscar cliente por nombre o email...' : 'Search customer by name or email...'}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                )}
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                >
                  <option value="">{isEs ? '-- Selecciona un cliente --' : '-- Select a customer --'}</option>
                  {filteredCustomers.map((c) => {
                    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'Customer';
                    const comp = c.company_name && c.first_name ? ` (${c.company_name})` : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {`${name}${comp} — ${c.email || (isEs ? 'Sin correo' : 'No email')}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Service Description & Invoice Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                {isEs ? 'Descripción del Servicio' : 'Service Description'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder={isEs ? 'Ej: Mantenimiento HVAC, Limpieza de Jardín, etc.' : 'e.g. HVAC Repair, Yard Clean-up, etc.'}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                {isEs ? 'Fecha de Vencimiento' : 'Due Date'}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
              />
              <div className="flex gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickDueDate(0)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  {isEs ? 'Hoy' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDueDate(15)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  +15 {isEs ? 'días' : 'days'}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDueDate(30)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  +30 {isEs ? 'días' : 'days'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isEs ? 'Tipo de Factura' : 'Invoice Type'}
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
              >
                <option value="standard">{isEs ? 'Estándar' : 'Standard'}</option>
                <option value="deposit">{isEs ? 'Anticipo' : 'Deposit'}</option>
                <option value="final">{isEs ? 'Saldo Final' : 'Final Balance'}</option>
              </select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-500" />
                  {isEs ? 'Subtotal (Monto Base)' : 'Subtotal (Base Amount)'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
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
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Percent className="w-3 h-3 text-slate-500" />
                  {isEs ? 'Impuesto / Tax (%)' : 'Sales Tax (%)'}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRatePercent}
                    onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                    className="w-20 text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
                  />
                  <span className="text-xs font-semibold text-slate-500">
                    = {formatCurrency(parsedTax, currencyCode)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isEs ? 'Total a Cobrar:' : 'Total Due:'}
              </span>
              <span className="text-lg font-black text-emerald-700">
                {formatCurrency(calculatedTotal, currencyCode)}
              </span>
            </div>
          </div>

          {/* Finished Work Photos / Proof of Work Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                {isEs ? 'Fotos del Trabajo Realizado' : 'Finished Work Photos (Proof of Work)'}
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {photos.length} / {MAX_PHOTOS}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isEs
                ? 'Sube fotos del trabajo terminado para adjuntarlas al correo y PDF de la factura.'
                : 'Attach completed work photos to verify service in both the invoice email and PDF.'}
            </p>

            {/* Upload Zone */}
            {photos.length < MAX_PHOTOS && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
              >
                <div className="flex items-center gap-2 text-emerald-600">
                  <UploadCloud className="w-5 h-5" />
                  <Camera className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {isEs ? 'Haz clic para subir o arrastra tus fotos aquí' : 'Click to upload or drag photos here'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isEs ? 'Soporta JPG, PNG, WEBP. Compresión automática.' : 'Supports JPG, PNG, WEBP. Fast automatic compression.'}
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

            {/* Photo Preview Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
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

          {/* Notes / Terms */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isEs ? 'Notas / Términos de Pago (Opcional)' : 'Notes / Payment Terms (Optional)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEs ? 'Términos adicionales, garantía o instrucciones...' : 'Additional terms, warranty or instructions...'}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
            />
          </div>

          {/* Send Email Checkbox */}
          {selectedCustomer?.email && (
            <label className="flex items-start gap-2.5 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  {isEs ? 'Enviar factura por correo inmediatamente' : 'Send invoice email to customer immediately'}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEs ? 'Se enviará a:' : 'Will be sent to:'}{' '}
                  <span className="font-semibold text-slate-700">{selectedCustomer.email}</span>{' '}
                  {photos.length > 0
                    ? isEs
                      ? `con ${photos.length} foto(s) del trabajo adjunta(s).`
                      : `with ${photos.length} attached finished work photo(s).`
                    : ''}
                </p>
              </div>
            </label>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEs ? 'Creando Factura...' : 'Creating Invoice...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEs ? 'Emitir Factura' : 'Create & Issue Invoice'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
