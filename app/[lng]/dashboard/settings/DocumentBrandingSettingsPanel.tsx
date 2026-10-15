'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  formatDocumentNumber,
  normalizeDocumentEmailHeaderColor,
  normalizeDocumentSequenceNumber,
} from '@/lib/documentBranding';
import { updateDocumentBrandingSettings } from './actions';

interface DocumentBrandingSettingsPanelProps {
  initialNextEstimateNumber?: number | null;
  initialNextInvoiceNumber?: number | null;
  initialHeaderColor?: string | null;
  initialDefaultPaymentTerms?: string | null;
  locale?: string;
}

export default function DocumentBrandingSettingsPanel({
  initialNextEstimateNumber = 1001,
  initialNextInvoiceNumber = 1001,
  initialHeaderColor = '#009966',
  initialDefaultPaymentTerms = 'Due on Receipt',
  locale = 'en',
}: DocumentBrandingSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const safeInitialEstimateNumber = normalizeDocumentSequenceNumber(initialNextEstimateNumber);
  const safeInitialInvoiceNumber = normalizeDocumentSequenceNumber(initialNextInvoiceNumber);
  const safeInitialHeaderColor = normalizeDocumentEmailHeaderColor(initialHeaderColor);
  const safeInitialPaymentTerms = initialDefaultPaymentTerms?.trim() || 'Due on Receipt';

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextEstimateNumber, setNextEstimateNumber] = useState(String(safeInitialEstimateNumber));
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(String(safeInitialInvoiceNumber));
  const [headerColor, setHeaderColor] = useState(safeInitialHeaderColor);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(safeInitialPaymentTerms);

  const [currentEstimateNumber, setCurrentEstimateNumber] = useState(safeInitialEstimateNumber);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState(safeInitialInvoiceNumber);
  const [currentHeaderColor, setCurrentHeaderColor] = useState(safeInitialHeaderColor);
  const [currentPaymentTerms, setCurrentPaymentTerms] = useState(safeInitialPaymentTerms);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!editing) {
      setCurrentEstimateNumber(safeInitialEstimateNumber);
      setCurrentInvoiceNumber(safeInitialInvoiceNumber);
      setCurrentHeaderColor(safeInitialHeaderColor);
      setCurrentPaymentTerms(safeInitialPaymentTerms);
      setNextEstimateNumber(String(safeInitialEstimateNumber));
      setNextInvoiceNumber(String(safeInitialInvoiceNumber));
      setHeaderColor(safeInitialHeaderColor);
      setDefaultPaymentTerms(safeInitialPaymentTerms);
    }
  }, [safeInitialEstimateNumber, safeInitialInvoiceNumber, safeInitialHeaderColor, safeInitialPaymentTerms, editing]);

  const startEditing = () => {
    setStatusMessage('');
    setErrorMessage('');
    setNextEstimateNumber(String(currentEstimateNumber));
    setNextInvoiceNumber(String(currentInvoiceNumber));
    setHeaderColor(currentHeaderColor);
    setDefaultPaymentTerms(currentPaymentTerms);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setErrorMessage('');
    setNextEstimateNumber(String(currentEstimateNumber));
    setNextInvoiceNumber(String(currentInvoiceNumber));
    setHeaderColor(currentHeaderColor);
    setDefaultPaymentTerms(currentPaymentTerms);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleSave = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    setLoading(true);
    setStatusMessage('');
    setErrorMessage('');

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('nextEstimateNumber', nextEstimateNumber);
    formData.set('nextInvoiceNumber', nextInvoiceNumber);
    formData.set('documentEmailHeaderColor', headerColor);
    formData.set('defaultPaymentTerms', defaultPaymentTerms);

    const response = await updateDocumentBrandingSettings(formData);
    setLoading(false);

    if (response?.error) {
      setErrorMessage(response.error);
      return;
    }

    const updatedEstimateNumber = normalizeDocumentSequenceNumber(response?.nextEstimateNumber ?? nextEstimateNumber);
    const updatedInvoiceNumber = normalizeDocumentSequenceNumber(response?.nextInvoiceNumber ?? nextInvoiceNumber);
    const updatedHeaderColor = normalizeDocumentEmailHeaderColor(response?.documentEmailHeaderColor ?? headerColor);
    const updatedPaymentTerms = response?.defaultPaymentTerms ?? defaultPaymentTerms;

    setCurrentEstimateNumber(updatedEstimateNumber);
    setCurrentInvoiceNumber(updatedInvoiceNumber);
    setCurrentHeaderColor(updatedHeaderColor);
    setCurrentPaymentTerms(updatedPaymentTerms);
    setNextEstimateNumber(String(updatedEstimateNumber));
    setNextInvoiceNumber(String(updatedInvoiceNumber));
    setHeaderColor(updatedHeaderColor);
    setDefaultPaymentTerms(updatedPaymentTerms);
    setEditing(false);
    setStatusMessage(isEs ? 'Preferencias de documentos actualizadas.' : 'Document settings updated.');
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              {isEs ? 'Documentos y correos' : 'Documents & Emails'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEs
                ? 'Controla la numeración de documentos, términos de pago y color de sus encabezados.'
                : 'Control document numbering, payment terms, and header color.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={loading}
                  className="cursor-pointer text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={loading}
                  className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 transition"
                >
                  {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar' : 'Update')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                {isEs ? 'Editar' : 'Edit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {statusMessage ? <p className="px-6 md:px-8 text-xs text-emerald-600 font-medium">{statusMessage}</p> : null}
      {errorMessage ? <p className="px-6 md:px-8 text-xs text-red-600 font-medium">{errorMessage}</p> : null}

      <div className="border-y border-slate-200">
        <div className={`px-6 md:px-8 py-5 transition ${editing ? 'bg-emerald-50/40 border-l-4 border-l-emerald-600' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            {/* Next Quote Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {isEs ? 'Siguiente cotización' : 'Next quote'}
              </label>
              {editing ? (
                <div className="mt-1">
                  <input
                    id="next-estimate-number-input"
                    type="number"
                    min="1"
                    step="1"
                    value={nextEstimateNumber}
                    onChange={(event) => setNextEstimateNumber(event.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                    autoFocus
                  />
                </div>
              ) : (
                <p className="mt-1 text-base font-bold text-slate-800">
                  {formatDocumentNumber('estimate', currentEstimateNumber) || currentEstimateNumber}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isEs ? 'Número correlativo para cotizaciones' : 'Sequential number for new quotes'}
              </p>
            </div>

            {/* Next Invoice Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {isEs ? 'Siguiente factura' : 'Next invoice'}
              </label>
              {editing ? (
                <div className="mt-1">
                  <input
                    id="next-invoice-number-input"
                    type="number"
                    min="1"
                    step="1"
                    value={nextInvoiceNumber}
                    onChange={(event) => setNextInvoiceNumber(event.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
              ) : (
                <p className="mt-1 text-base font-bold text-slate-800">
                  {formatDocumentNumber('invoice', currentInvoiceNumber) || currentInvoiceNumber}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isEs ? 'Número correlativo para facturas' : 'Sequential number for new invoices'}
              </p>
            </div>

            {/* Default Payment Terms */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {isEs ? 'Términos de pago predeterminados' : 'Default payment terms'}
              </label>
              {editing ? (
                <div className="mt-1 space-y-2">
                  <select
                    id="default-payment-terms-input"
                    value={['Due on Receipt', 'Net 15', 'Net 30', 'Net 60', '50% Deposit / 50% Completion'].includes(defaultPaymentTerms) ? defaultPaymentTerms : 'Custom'}
                    onChange={(event) => {
                      if (event.target.value !== 'Custom') {
                        setDefaultPaymentTerms(event.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs cursor-pointer"
                  >
                    <option value="Due on Receipt">{isEs ? 'Al contado / Al recibir' : 'Due on Receipt'}</option>
                    <option value="Net 15">Net 15 (15 días)</option>
                    <option value="Net 30">Net 30 (30 días)</option>
                    <option value="Net 60">Net 60 (60 días)</option>
                    <option value="50% Deposit / 50% Completion">{isEs ? '50% Anticipo / 50% Al Finalizar' : '50% Deposit / 50% Completion'}</option>
                    <option value="Custom">{isEs ? 'Personalizado...' : 'Custom...'}</option>
                  </select>
                  {!['Due on Receipt', 'Net 15', 'Net 30', 'Net 60', '50% Deposit / 50% Completion'].includes(defaultPaymentTerms) && (
                    <input
                      type="text"
                      value={defaultPaymentTerms}
                      onChange={(event) => setDefaultPaymentTerms(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isEs ? 'Ej: 50% anticipo al aprobar, saldo al terminar' : 'Ex: 50% deposit upon approval, balance upon completion'}
                      className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                    />
                  )}
                </div>
              ) : (
                <p className="mt-1 text-base font-bold text-slate-800">{currentPaymentTerms}</p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isEs ? 'Plazo de vencimiento en facturas' : 'Due timeframe applied on invoices'}
              </p>
            </div>

            {/* Header Color */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {isEs ? 'Color del encabezado' : 'Header color'}
              </label>
              {editing ? (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="document-email-header-color-input"
                    type="color"
                    value={normalizeDocumentEmailHeaderColor(headerColor)}
                    onChange={(event) => setHeaderColor(event.target.value.toUpperCase())}
                    className="h-8 w-12 rounded-lg border border-emerald-300 bg-white p-0.5 cursor-pointer shadow-2xs"
                    aria-label={isEs ? 'Seleccionar color del encabezado' : 'Select header color'}
                  />
                  <input
                    type="text"
                    value={headerColor}
                    onChange={(event) => setHeaderColor(event.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    className="w-32 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-mono font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                    placeholder="#009966"
                    maxLength={7}
                    pattern="#[0-9A-Fa-f]{6}"
                    aria-label={isEs ? 'Color hexadecimal del encabezado' : 'Header hexadecimal color'}
                  />
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full border border-slate-200 shadow-2xs" style={{ backgroundColor: currentHeaderColor }} />
                  <span className="text-base font-mono font-bold text-slate-800">{currentHeaderColor}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isEs
                  ? 'Se usa en cotizaciones, facturas y correos'
                  : 'Used on quotes, invoices, and email headers'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}