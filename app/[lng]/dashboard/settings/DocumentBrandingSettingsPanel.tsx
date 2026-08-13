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
  locale?: string;
}

export default function DocumentBrandingSettingsPanel({
  initialNextEstimateNumber = 1001,
  initialNextInvoiceNumber = 1001,
  initialHeaderColor = '#009966',
  locale = 'en',
}: DocumentBrandingSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const safeInitialEstimateNumber = normalizeDocumentSequenceNumber(initialNextEstimateNumber);
  const safeInitialInvoiceNumber = normalizeDocumentSequenceNumber(initialNextInvoiceNumber);
  const safeInitialHeaderColor = normalizeDocumentEmailHeaderColor(initialHeaderColor);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextEstimateNumber, setNextEstimateNumber] = useState(String(safeInitialEstimateNumber));
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(String(safeInitialInvoiceNumber));
  const [headerColor, setHeaderColor] = useState(safeInitialHeaderColor);
  const [currentEstimateNumber, setCurrentEstimateNumber] = useState(safeInitialEstimateNumber);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState(safeInitialInvoiceNumber);
  const [currentHeaderColor, setCurrentHeaderColor] = useState(safeInitialHeaderColor);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!editing) {
      setCurrentEstimateNumber(safeInitialEstimateNumber);
      setCurrentInvoiceNumber(safeInitialInvoiceNumber);
      setCurrentHeaderColor(safeInitialHeaderColor);
      setNextEstimateNumber(String(safeInitialEstimateNumber));
      setNextInvoiceNumber(String(safeInitialInvoiceNumber));
      setHeaderColor(safeInitialHeaderColor);
    }
  }, [safeInitialEstimateNumber, safeInitialInvoiceNumber, safeInitialHeaderColor, editing]);

  const toggleEditing = () => {
    setStatusMessage('');
    setErrorMessage('');
    setEditing((prev) => !prev);
    if (!editing) {
      setNextEstimateNumber(String(currentEstimateNumber));
      setNextInvoiceNumber(String(currentInvoiceNumber));
      setHeaderColor(currentHeaderColor);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatusMessage('');
    setErrorMessage('');

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('nextEstimateNumber', nextEstimateNumber);
    formData.set('nextInvoiceNumber', nextInvoiceNumber);
    formData.set('documentEmailHeaderColor', headerColor);

    const response = await updateDocumentBrandingSettings(formData);
    setLoading(false);

    if (response?.error) {
      setErrorMessage(response.error);
      return;
    }

    const updatedEstimateNumber = normalizeDocumentSequenceNumber(response?.nextEstimateNumber ?? nextEstimateNumber);
    const updatedInvoiceNumber = normalizeDocumentSequenceNumber(response?.nextInvoiceNumber ?? nextInvoiceNumber);
    const updatedHeaderColor = normalizeDocumentEmailHeaderColor(response?.documentEmailHeaderColor ?? headerColor);

    setCurrentEstimateNumber(updatedEstimateNumber);
    setCurrentInvoiceNumber(updatedInvoiceNumber);
    setCurrentHeaderColor(updatedHeaderColor);
    setNextEstimateNumber(String(updatedEstimateNumber));
    setNextInvoiceNumber(String(updatedInvoiceNumber));
    setHeaderColor(updatedHeaderColor);
    setEditing(false);
    setStatusMessage(isEs ? 'Preferencias de documentos actualizadas.' : 'Document settings updated.');
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
          {isEs ? 'Documentos y correos' : 'Documents & Emails'}
        </h3>
        <p className="text-xs text-slate-400">
          {isEs
            ? 'Controla la numeracion de documentos y el color de sus encabezados.'
            : 'Control document numbering and header color.'}
        </p>
      </div>

      {statusMessage ? <p className="px-6 md:px-8 text-xs text-emerald-600">{statusMessage}</p> : null}
      {errorMessage ? <p className="px-6 md:px-8 text-xs text-red-600">{errorMessage}</p> : null}

      <div className="border-y border-slate-200">
        <div className="divide-y divide-slate-200">
          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isEs ? 'Siguiente estimado' : 'Next estimate'}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatDocumentNumber('estimate', currentEstimateNumber) || currentEstimateNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isEs ? 'Siguiente factura' : 'Next invoice'}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatDocumentNumber('invoice', currentInvoiceNumber) || currentInvoiceNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isEs ? 'Color del encabezado' : 'Header color'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: currentHeaderColor }} />
                    <span className="text-sm font-medium text-slate-700">{currentHeaderColor}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleEditing}
                  className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {editing ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                </button>
                {editing ? (
                  <button
                    type="submit"
                    form="document-branding-form"
                    disabled={loading}
                    className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                  >
                    {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar' : 'Update')}
                  </button>
                ) : null}
              </div>
            </div>

            <form id="document-branding-form" onSubmit={handleSubmit} className={editing ? 'mt-4 grid gap-4 md:grid-cols-2' : 'hidden'}>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="next-estimate-number-input">
                  {isEs ? 'Siguiente numero de estimado' : 'Next estimate number'}
                </label>
                <input
                  id="next-estimate-number-input"
                  type="number"
                  min="1"
                  step="1"
                  value={nextEstimateNumber}
                  onChange={(event) => setNextEstimateNumber(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="next-invoice-number-input">
                  {isEs ? 'Siguiente numero de factura' : 'Next invoice number'}
                </label>
                <input
                  id="next-invoice-number-input"
                  type="number"
                  min="1"
                  step="1"
                  value={nextInvoiceNumber}
                  onChange={(event) => setNextInvoiceNumber(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="document-email-header-color-input">
                  {isEs ? 'Color del encabezado' : 'Header color'}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    id="document-email-header-color-input"
                    type="color"
                    value={normalizeDocumentEmailHeaderColor(headerColor)}
                    onChange={(event) => setHeaderColor(event.target.value.toUpperCase())}
                    className="h-11 w-20 rounded-lg border border-gray-300 bg-white p-1"
                    aria-label={isEs ? 'Seleccionar color del encabezado' : 'Select header color'}
                  />
                  <input
                    type="text"
                    value={headerColor}
                    onChange={(event) => setHeaderColor(event.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-emerald-500 sm:w-52"
                    placeholder="#009966"
                    maxLength={7}
                    pattern="#[0-9A-Fa-f]{6}"
                    aria-label={isEs ? 'Color hexadecimal del encabezado' : 'Header hexadecimal color'}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Se usa en estimados, facturas y correos de confirmacion de trabajos.'
                    : 'Used for estimates, invoices, and job confirmation emails.'}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}