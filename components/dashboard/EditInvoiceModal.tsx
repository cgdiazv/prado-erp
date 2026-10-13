'use client';

import React, { useState, useEffect } from 'react';
import { updateInvoice, resendInvoiceEmail } from '@/app/actions';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import {
  X,
  FileEdit,
  DollarSign,
  Calendar,
  Percent,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export interface EditableInvoice {
  id: string;
  invoice_number?: number | null;
  due_date: string;
  total_amount: number | string | null;
  tax_amount: number | string | null;
  currency_code?: string | null;
  status: string | null;
  stripe_payment_url?: string | null;
  invoice_type?: string | null;
  notes?: string | null;
  customerName?: string;
  customerEmail?: string | null;
}

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: EditableInvoice | null;
  onSuccess?: (updatedInvoice: any) => void;
  locale?: string;
  orgTaxRatePercent?: number;
}

export default function EditInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
  locale = 'en',
  orgTaxRatePercent = 8.25,
}: EditInvoiceModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const [dueDate, setDueDate] = useState('');
  const [baseAmount, setBaseAmount] = useState<string>('0');
  const [taxAmount, setTaxAmount] = useState<string>('0');
  const [invoiceType, setInvoiceType] = useState<'standard' | 'deposit' | 'final'>('standard');
  const [notes, setNotes] = useState('');
  const [sendUpdatedEmail, setSendUpdatedEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmailOnly, setIsSendingEmailOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (invoice && isOpen) {
      const initialTotal = Number(invoice.total_amount || 0);
      const initialTax = Number(invoice.tax_amount || 0);
      const initialBase = Math.max(0, initialTotal - initialTax);

      setDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setBaseAmount(initialBase.toFixed(2));
      setTaxAmount(initialTax.toFixed(2));
      setInvoiceType((invoice.invoice_type as any) || 'standard');
      setNotes(invoice.notes || '');
      setSendUpdatedEmail(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const currencyCode = normalizeCurrencyCode(invoice.currency_code);
  const calculatedTotal = parseFloat((Number(baseAmount || 0) + Number(taxAmount || 0)).toFixed(2));

  const handleBaseAmountChange = (val: string) => {
    setBaseAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && orgTaxRatePercent > 0) {
      const autoTax = parseFloat((num * (orgTaxRatePercent / 100)).toFixed(2));
      setTaxAmount(autoTax.toFixed(2));
    }
  };

  const handleQuickDepositPreset = (percentage: number) => {
    const currentBase = Number(baseAmount || 0);
    if (currentBase > 0) {
      const newBase = parseFloat((currentBase * (percentage / 100)).toFixed(2));
      setBaseAmount(newBase.toFixed(2));
      const newTax = parseFloat((newBase * (orgTaxRatePercent / 100)).toFixed(2));
      setTaxAmount(newTax.toFixed(2));
      setInvoiceType('deposit');
      setNotes(isEs ? `Anticipo ${percentage}%` : `${percentage}% Deposit`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsedBase = Number(baseAmount || 0);
    const parsedTax = Number(taxAmount || 0);
    const total = parseFloat((parsedBase + parsedTax).toFixed(2));

    if (total <= 0) {
      setError(isEs ? 'El monto total debe ser mayor a 0.' : 'Total amount must be greater than 0.');
      return;
    }

    if (!dueDate) {
      setError(isEs ? 'Por favor ingresa una fecha de vencimiento.' : 'Please enter a due date.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateInvoice(invoice.id, {
        dueDate,
        totalAmount: total,
        taxAmount: parsedTax,
        notes: notes.trim() || null,
        invoiceType,
        sendUpdatedEmail,
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        isEs
          ? 'Factura actualizada exitosamente.'
          : 'Invoice updated successfully.'
      );

      if (onSuccess) {
        onSuccess({
          ...invoice,
          due_date: dueDate,
          total_amount: total,
          tax_amount: parsedTax,
          notes: notes.trim() || null,
          invoice_type: invoiceType,
          stripe_payment_url: result.invoice?.stripe_payment_url || invoice.stripe_payment_url,
        });
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || (isEs ? 'Error al actualizar la factura.' : 'Failed to update invoice.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectResend = async () => {
    if (!invoice.customerEmail) {
      setError(isEs ? 'El cliente no tiene un correo configurado.' : 'Customer does not have an email configured.');
      return;
    }

    setIsSendingEmailOnly(true);
    setError(null);
    try {
      const res = await resendInvoiceEmail(invoice.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage(
          isEs
            ? 'Correo con la factura reenviado correctamente.'
            : 'Invoice email resent successfully.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Error sending email.');
    } finally {
      setIsSendingEmailOnly(false);
    }
  };

  const invoiceNumberLabel = invoice.invoice_number
    ? `#${invoice.invoice_number}`
    : `INV-${invoice.id.slice(0, 6).toUpperCase()}`;

  const isPaid = (invoice.status || '').toLowerCase() === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  {isEs ? 'Editar Factura' : 'Edit Invoice'} {invoiceNumberLabel}
                </h3>
                {isPaid && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {isEs ? 'Pagada' : 'Paid'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {invoice.customerName || (isEs ? 'Cliente' : 'Customer')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
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

          {isPaid ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>{isEs ? 'Factura ya pagada' : 'Invoice already paid'}</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                {isEs
                  ? 'Esta factura ya fue pagada y su importe financiero está bloqueado para preservar la integridad contable. Puedes reenviar el recibo o generar una factura de saldo final.'
                  : 'This invoice has already been paid and its financial amount is locked for accounting compliance. You can resend the receipt or create a final balance invoice.'}
              </p>
              {invoice.customerEmail && (
                <button
                  type="button"
                  onClick={handleDirectResend}
                  disabled={isSendingEmailOnly}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs transition"
                >
                  {isSendingEmailOnly ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isEs ? 'Reenviar Recibo al Cliente' : 'Resend Receipt to Customer'}
                </button>
              )}
            </div>
          ) : (
            <form id="edit-invoice-form" onSubmit={handleSubmit} className="space-y-4">
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
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition ${
                        invoiceType === type.id
                          ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xs'
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
                      value={baseAmount}
                      onChange={(e) => handleBaseAmountChange(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition font-mono font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Tax Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      {isEs ? `Impuestos (${orgTaxRatePercent}%)` : `Tax (${orgTaxRatePercent}%)`}
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
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition font-mono font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Deposit calculation shortcuts */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  {isEs ? 'Atajos anticipo:' : 'Deposit shortcuts:'}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickDepositPreset(50)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDepositPreset(30)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDepositPreset(25)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                >
                  25%
                </button>
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
                {invoice.stripe_payment_url && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    {isEs ? 'Stripe Activo' : 'Stripe Active'}
                  </span>
                )}
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
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-slate-800"
                  />
                </div>
              </div>

              {/* Notes / Concept */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? 'Concepto / Notas de la Factura' : 'Concept / Invoice Notes'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Ej: Anticipo del 50% para compra de materiales...'
                      : 'E.g., 50% deposit for materials and scheduling...'
                  }
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-slate-800 resize-none"
                />
              </div>

              {/* Send Email Checkbox */}
              {invoice.customerEmail && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={sendUpdatedEmail}
                    onChange={(e) => setSendUpdatedEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-800">
                      {isEs
                        ? 'Enviar factura actualizada por correo al cliente'
                        : 'Email updated invoice to customer'}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {invoice.customerEmail}
                    </p>
                  </div>
                </label>
              )}

              {/* Stripe Regeneration Note */}
              {invoice.stripe_payment_url && (
                <div className="flex items-start gap-2 p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-[11px] text-sky-800">
                  <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    {isEs
                      ? 'Al guardar cambios, el enlace de pago de Stripe se regenerará automáticamente con el nuevo monto.'
                      : 'When saving changes, the Stripe payment link will automatically be updated with the new amount.'}
                  </span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          {invoice.customerEmail && !isPaid ? (
            <button
              type="button"
              onClick={handleDirectResend}
              disabled={isSendingEmailOnly || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-50"
            >
              {isSendingEmailOnly ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isEs ? 'Reenviar Correo' : 'Resend Email'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            {!isPaid && (
              <button
                type="submit"
                form="edit-invoice-form"
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs shadow-sky-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEs ? 'Guardar Cambios' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
