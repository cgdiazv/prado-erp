'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createManualInvoice } from '@/app/actions';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import {
  X,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface InvoiceCustomerOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
}

export interface InvoiceServiceOption {
  id: string;
  name: string;
  base_price: number | null;
}

interface CreateInvoiceModalProps {
  customers?: InvoiceCustomerOption[];
  services?: InvoiceServiceOption[];
  defaultCustomerId?: string;
  defaultCustomerName?: string;
  defaultCustomerEmail?: string | null;
  orgTaxRatePercent?: number;
  currencyCode?: string | null;
  locale?: string;
  triggerLabel?: string;
  onSuccess?: (createdInvoice: any) => void;
}

export default function CreateInvoiceModal({
  customers = [],
  services = [],
  defaultCustomerId,
  defaultCustomerName,
  defaultCustomerEmail,
  orgTaxRatePercent = 0,
  currencyCode: rawCurrencyCode,
  locale = 'en',
  triggerLabel,
  onSuccess,
}: CreateInvoiceModalProps) {
  const router = useRouter();
  const isEs = locale.toLowerCase().startsWith('es');
  const currencyCode = normalizeCurrencyCode(rawCurrencyCode);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId || '');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('0.00');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(() =>
    typeof orgTaxRatePercent === 'number' ? orgTaxRatePercent : 0
  );
  const [invoiceType, setInvoiceType] = useState<'standard' | 'deposit' | 'final'>('standard');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialRate = typeof orgTaxRatePercent === 'number' ? orgTaxRatePercent : 0;
      setSelectedCustomerId(defaultCustomerId || '');
      setSelectedServiceId('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setBaseAmount('');
      setTaxAmount('0.00');
      setTaxRatePercent(initialRate);
      setInvoiceType('standard');
      setNotes('');
      setSendEmail(true);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultCustomerId, orgTaxRatePercent]);

  const activeCustomer = useMemo(() => {
    if (defaultCustomerId && customers.length === 0) {
      return {
        id: defaultCustomerId,
        first_name: defaultCustomerName || '',
        last_name: '',
        company_name: null,
        email: defaultCustomerEmail || null,
      };
    }
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId, defaultCustomerId, defaultCustomerName, defaultCustomerEmail]);

  const activeCustomerEmail = activeCustomer?.email || defaultCustomerEmail || null;

  const calculatedTotal = parseFloat(
    (Number(baseAmount || 0) + Number(taxAmount || 0)).toFixed(2)
  );

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

  const handleTaxAmountChange = (val: string) => {
    setTaxAmount(val);
    const parsedTax = parseFloat(val);
    const parsedBase = parseFloat(baseAmount);
    if (!isNaN(parsedTax) && !isNaN(parsedBase) && parsedBase > 0) {
      const computedRate = parseFloat(((parsedTax / parsedBase) * 100).toFixed(2));
      setTaxRatePercent(computedRate);
    } else if (parsedTax === 0) {
      setTaxRatePercent(0);
    }
  };

  const handleTaxRatePercentChange = (val: string | number) => {
    const parsedRate = typeof val === 'number' ? val : parseFloat(val);
    const validRate = isNaN(parsedRate) ? 0 : Math.max(0, Math.min(100, parsedRate));
    setTaxRatePercent(validRate);
    const parsedBase = parseFloat(baseAmount);
    if (!isNaN(parsedBase) && parsedBase >= 0) {
      const computedTax = parseFloat((parsedBase * (validRate / 100)).toFixed(2));
      setTaxAmount(computedTax.toFixed(2));
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (!serviceId) return;
    const found = services.find((s) => s.id === serviceId);
    if (!found) return;

    const price = Number(found.base_price || 0);
    setNotes(found.name);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetCustomerId = defaultCustomerId || selectedCustomerId;
    if (!targetCustomerId) {
      setError(isEs ? 'Por favor selecciona un cliente.' : 'Please select a customer.');
      return;
    }

    const parsedBase = Number(baseAmount || 0);
    const parsedTax = Number(taxAmount || 0);
    const total = parseFloat((parsedBase + parsedTax).toFixed(2));

    if (total <= 0) {
      setError(
        isEs ? 'El monto total debe ser mayor a 0.' : 'Total amount must be greater than 0.'
      );
      return;
    }

    if (!dueDate) {
      setError(
        isEs ? 'Por favor ingresa una fecha de vencimiento.' : 'Please enter a due date.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await createManualInvoice({
        customerId: targetCustomerId,
        dueDate,
        totalAmount: total,
        taxAmount: parsedTax,
        notes: notes.trim() || null,
        invoiceType,
        sendEmail: Boolean(sendEmail && activeCustomerEmail),
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        isEs ? 'Factura creada exitosamente.' : 'Invoice created successfully.'
      );

      if (onSuccess && result.invoice) {
        onSuccess(result.invoice);
      }

      router.refresh();

      setTimeout(() => {
        setIsOpen(false);
      }, 700);
    } catch (err: any) {
      setError(
        err?.message || (isEs ? 'Error al crear la factura.' : 'Failed to create invoice.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText =
    triggerLabel || (isEs ? '+ Nueva Factura' : '+ New Invoice');

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
      >
        {buttonText}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isEs ? 'Nueva Factura' : 'New Invoice'}
                </h3>
                <p className="text-xs text-slate-500">
                  {defaultCustomerName
                    ? defaultCustomerName
                    : isEs
                      ? 'Genera una factura directa sin necesidad de cotización previa'
                      : 'Create a direct invoice without a prior quote or job'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form id="create-invoice-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Customer Selection (shown when not locked to a single customer) */}
                {!defaultCustomerId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEs ? 'Cliente' : 'Customer'}
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-slate-800 outline-none"
                    >
                      <option value="">
                        {isEs ? 'Selecciona un cliente...' : 'Select a customer...'}
                      </option>
                      {customers.map((c) => {
                        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
                        const label =
                          fullName && c.company_name
                            ? `${fullName} (${c.company_name})`
                            : fullName || c.company_name || 'Customer';
                        return (
                          <option key={c.id} value={c.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Optional Catalog Service Quick-Fill */}
                {services.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEs ? 'Servicio del Catálogo (Opcional)' : 'Catalog Service (Optional)'}
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => handleServiceSelect(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-slate-800 outline-none"
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
                )}

                {/* Invoice Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEs ? 'Tipo de Factura' : 'Invoice Type'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'standard', label: isEs ? 'Estándar' : 'Standard' },
                      { id: 'deposit', label: isEs ? 'Anticipo' : 'Deposit' },
                      { id: 'final', label: isEs ? 'Saldo Final' : 'Final Balance' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setInvoiceType(type.id as any)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                          invoiceType === type.id
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amounts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Base Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        {isEs ? 'Subtotal (Base)' : 'Subtotal (Base)'}
                      </label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {currencyCode}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={baseAmount}
                        onChange={(e) => handleBaseAmountChange(e.target.value)}
                        required
                        className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Tax Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          {isEs ? 'Impuestos' : 'Tax'}
                        </label>
                        <div
                          className="inline-flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-md px-1.5 py-0.5 transition"
                          title={isEs ? 'Tasa de impuesto dinámica (%)' : 'Dynamic tax rate (%)'}
                        >
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={taxRatePercent}
                            onChange={(e) => handleTaxRatePercentChange(e.target.value)}
                            className="w-10 text-[11px] font-bold text-slate-700 bg-transparent text-right outline-none p-0"
                          />
                          <span className="text-[11px] font-bold text-slate-500">%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {typeof orgTaxRatePercent === 'number' &&
                          orgTaxRatePercent !== taxRatePercent && (
                            <button
                              type="button"
                              onClick={() => handleTaxRatePercentChange(orgTaxRatePercent)}
                              className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                            >
                              {orgTaxRatePercent}% Org
                            </button>
                          )}
                        <span className="text-[11px] font-semibold text-slate-400">
                          {currencyCode}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={taxAmount}
                        onChange={(e) => handleTaxAmountChange(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Deposit calculation shortcuts */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isEs ? 'Atajos anticipo:' : 'Deposit shortcuts:'}
                  </span>
                  {[50, 30, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickDepositPreset(pct)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Total Summary Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {isEs ? 'Total a Cobrar' : 'Total Amount Due'}
                    </span>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {formatCurrency(calculatedTotal, currencyCode)}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEs ? 'Fecha de Vencimiento' : 'Due Date'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {/* Concept / Invoice Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEs ? 'Concepto / Descripción del Servicio' : 'Concept / Service Description'}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      isEs
                        ? 'Ej: Mantenimiento general, instalación o servicio completado...'
                        : 'E.g., General maintenance, installation, or completed service...'
                    }
                    className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-slate-800 resize-none outline-none"
                  />
                </div>

                {/* Send Email Checkbox */}
                {activeCustomerEmail && (
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 accent-emerald-600"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-semibold text-slate-800">
                        {isEs
                          ? 'Enviar factura por correo al cliente al crearla'
                          : 'Email invoice to customer upon creation'}
                      </span>
                      <p className="text-[11px] text-slate-500">{activeCustomerEmail}</p>
                    </div>
                  </label>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="create-invoice-form"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEs ? 'Crear Factura' : 'Create Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

