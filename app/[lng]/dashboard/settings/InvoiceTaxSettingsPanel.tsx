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

  const toggleEditing = () => {
    setStatusMessage('');
    setErrorMessage('');
    setEditing((prev) => !prev);
    if (!editing) {
      setRateInput(currentRate.toFixed(2));
      setCurrencyCode(currentCurrencyCode);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    setStatusMessage(isEs ? 'Preferencias de facturacion actualizadas.' : 'Billing defaults updated.');
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
          {isEs ? 'Preferencias de facturacion' : 'Billing Defaults'}
        </h3>
        <p className="text-xs text-slate-400">
          {isEs
            ? 'Configura el tax y la moneda por defecto para nuevas facturas (USD o EUR).'
            : 'Set the default tax and currency for new invoices (USD or EUR).'}
        </p>
      </div>

      {statusMessage ? <p className="px-6 md:px-8 text-xs text-emerald-600">{statusMessage}</p> : null}
      {errorMessage ? <p className="px-6 md:px-8 text-xs text-red-600">{errorMessage}</p> : null}

      <div className="border-y border-slate-200">
        <div className="divide-y divide-slate-200">
          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isEs ? 'Tax configurado' : 'Configured tax'}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">{formatRateLabel(currentRate)}%</p>
                <p className="mt-1 text-xs text-slate-500">{isEs ? 'Moneda' : 'Currency'}: {currentCurrencyCode}</p>
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
                    form="invoice-tax-rate-form"
                    disabled={loading}
                    className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                  >
                    {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar' : 'Update')}
                  </button>
                ) : null}
              </div>
            </div>

            <form id="invoice-tax-rate-form" onSubmit={handleSubmit} className={editing ? 'mt-3 space-y-3' : 'hidden'}>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invoice-tax-rate-input">
                  {isEs ? 'Tax (%)' : 'Tax (%)'}
                </label>
                <input
                  id="invoice-tax-rate-input"
                  type="number"
                  min="0"
                  max="30"
                  step="0.01"
                  value={rateInput}
                  onChange={(event) => setRateInput(event.target.value)}
                  className="w-full sm:w-52 rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                />
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Ejemplo: 8.25 para 8.25%.'
                    : 'Example: use 8.25 for 8.25%.'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="invoice-currency-code-input">
                  {isEs ? 'Moneda' : 'Currency'}
                </label>
                <select
                  id="invoice-currency-code-input"
                  value={currencyCode}
                  onChange={(event) => setCurrencyCode(normalizeCurrencyCode(event.target.value))}
                  className="w-full sm:w-52 rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
