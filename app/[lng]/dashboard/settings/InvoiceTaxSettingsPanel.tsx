'use client';

import { useState, type FormEvent } from 'react';
import { updateInvoiceTaxRate } from './actions';
import { normalizeCurrencyCode, type SupportedCurrencyCode } from '@/lib/currency';

interface InvoiceTaxSettingsPanelProps {
  initialTaxRatePercent?: number | null;
  initialCurrencyCode?: string | null;
  locale?: string;
}

function normalizeRate(value: number): number {
  if (!Number.isFinite(value)) return 8.25;
  return Math.round(value * 100) / 100;
}

function formatRateLabel(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export default function InvoiceTaxSettingsPanel({
  initialTaxRatePercent = 8.25,
  initialCurrencyCode = 'USD',
  locale = 'en',
}: InvoiceTaxSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const safeInitialRate = normalizeRate(Number(initialTaxRatePercent ?? 8.25));
  const safeInitialCurrency = normalizeCurrencyCode(initialCurrencyCode);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateInput, setRateInput] = useState(safeInitialRate.toFixed(2));
  const [currentRate, setCurrentRate] = useState(safeInitialRate);
  const [currentCurrencyCode, setCurrentCurrencyCode] = useState<SupportedCurrencyCode>(safeInitialCurrency);
  const [currencyCode, setCurrencyCode] = useState<SupportedCurrencyCode>(safeInitialCurrency);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const startEditing = () => {
    setStatusMessage('');
    setErrorMessage('');
    setRateInput(currentRate.toFixed(2));
    setCurrencyCode(currentCurrencyCode);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setErrorMessage('');
    setRateInput(currentRate.toFixed(2));
    setCurrencyCode(currentCurrencyCode);
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

    const normalizedRate = Number.parseFloat(rateInput);
    if (!Number.isFinite(normalizedRate) || normalizedRate < 0 || normalizedRate > 30) {
      setLoading(false);
      setErrorMessage(isEs ? 'Ingresa una tasa entre 0 y 30.' : 'Enter a tax rate between 0 and 30.');
      return;
    }

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('invoiceTaxRatePercent', String(normalizedRate));
    formData.set('invoiceCurrencyCode', currencyCode);

    const response = await updateInvoiceTaxRate(formData);

    setLoading(false);

    if (response?.error) {
      setErrorMessage(response.error);
      return;
    }

    const nextRate = normalizeRate(Number(response?.taxRatePercent ?? normalizedRate));
    const nextCurrency = normalizeCurrencyCode(response?.currencyCode ?? currencyCode);
    setCurrentRate(nextRate);
    setRateInput(nextRate.toFixed(2));
    setCurrentCurrencyCode(nextCurrency);
    setCurrencyCode(nextCurrency);
    setEditing(false);
    setStatusMessage(isEs ? 'Preferencias de facturación actualizadas.' : 'Billing defaults updated.');
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              {isEs ? 'Preferencias de facturación' : 'Billing Defaults'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEs
                ? 'Configura el impuesto (tax) y la moneda por defecto para nuevas facturas (USD o EUR).'
                : 'Set the default tax and currency for new invoices (USD or EUR).'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
            {/* Tax */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {isEs ? 'Tax configurado (%)' : 'Configured tax (%)'}
              </label>
              {editing ? (
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 text-xs">%</span>
                  <input
                    id="invoice-tax-rate-input"
                    type="number"
                    min="0"
                    max="30"
                    step="0.01"
                    value={rateInput}
                    onChange={(event) => setRateInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-emerald-300 bg-white pl-3 pr-7 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                    autoFocus
                  />
                </div>
              ) : (
                <p className="mt-1 text-base font-bold text-slate-800">{formatRateLabel(currentRate)}%</p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isEs ? 'Ejemplo: 8.25 para 8.25%.' : 'Example: use 8.25 for 8.25%.'}
              </p>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {isEs ? 'Moneda' : 'Currency'}
              </label>
              {editing ? (
                <div className="mt-1">
                  <select
                    id="invoice-currency-code-input"
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(normalizeCurrencyCode(event.target.value))}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              ) : (
                <p className="mt-1 text-base font-bold text-slate-800">{currentCurrencyCode}</p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isEs ? 'Moneda predeterminada para facturación' : 'Default currency for invoicing'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
