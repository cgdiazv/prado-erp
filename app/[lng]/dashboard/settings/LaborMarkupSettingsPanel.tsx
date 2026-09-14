'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { updateLaborMarkupSettings } from './actions';
import { DollarSign, Percent, ShieldCheck } from 'lucide-react';

interface LaborMarkupSettingsPanelProps {
  initialLaborRate?: number | null;
  initialLaborCost?: number | null;
  initialMaterialsMarkup?: number | null;
  locale?: string;
}

function normalizeMoney(value: number | null | undefined, defaultValue: number): number {
  if (value == null || !Number.isFinite(value) || value < 0) return defaultValue;
  return Math.round(value * 100) / 100;
}

export default function LaborMarkupSettingsPanel({
  initialLaborRate = 95.0,
  initialLaborCost = 45.0,
  initialMaterialsMarkup = 30.0,
  locale = 'en',
}: LaborMarkupSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const safeInitialLaborRate = normalizeMoney(initialLaborRate, 95.0);
  const safeInitialLaborCost = normalizeMoney(initialLaborCost, 45.0);
  const safeInitialMarkup = normalizeMoney(initialMaterialsMarkup, 30.0);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [laborRate, setLaborRate] = useState(safeInitialLaborRate);
  const [laborCost, setLaborCost] = useState(safeInitialLaborCost);
  const [materialsMarkup, setMaterialsMarkup] = useState(safeInitialMarkup);

  const [laborRateInput, setLaborRateInput] = useState(safeInitialLaborRate.toFixed(2));
  const [laborCostInput, setLaborCostInput] = useState(safeInitialLaborCost.toFixed(2));
  const [materialsMarkupInput, setMaterialsMarkupInput] = useState(safeInitialMarkup.toFixed(2));

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const rate = normalizeMoney(initialLaborRate, 95.0);
    const cost = normalizeMoney(initialLaborCost, 45.0);
    const markup = normalizeMoney(initialMaterialsMarkup, 30.0);
    setLaborRate(rate);
    setLaborRateInput(rate.toFixed(2));
    setLaborCost(cost);
    setLaborCostInput(cost.toFixed(2));
    setMaterialsMarkup(markup);
    setMaterialsMarkupInput(markup.toFixed(2));
  }, [initialLaborRate, initialLaborCost, initialMaterialsMarkup]);

  const toggleEditing = () => {
    setStatusMessage('');
    setErrorMessage('');
    setEditing((prev) => !prev);
    if (!editing) {
      setLaborRateInput(laborRate.toFixed(2));
      setLaborCostInput(laborCost.toFixed(2));
      setMaterialsMarkupInput(materialsMarkup.toFixed(2));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatusMessage('');
    setErrorMessage('');

    const parsedLaborRate = Number.parseFloat(laborRateInput);
    const parsedLaborCost = Number.parseFloat(laborCostInput);
    const parsedMarkup = Number.parseFloat(materialsMarkupInput);

    if (!Number.isFinite(parsedLaborRate) || parsedLaborRate < 0) {
      setLoading(false);
      setErrorMessage(
        isEs ? 'Ingresa una tarifa de mano de obra válida (mayor o igual a 0).' : 'Enter a valid labor rate (>= 0).'
      );
      return;
    }

    if (!Number.isFinite(parsedLaborCost) || parsedLaborCost < 0) {
      setLoading(false);
      setErrorMessage(
        isEs ? 'Ingresa un costo de mano de obra válido (mayor o igual a 0).' : 'Enter a valid labor cost (>= 0).'
      );
      return;
    }

    if (!Number.isFinite(parsedMarkup) || parsedMarkup < 0 || parsedMarkup > 500) {
      setLoading(false);
      setErrorMessage(
        isEs ? 'El margen de materiales debe estar entre 0% y 500%.' : 'Materials markup must be between 0% and 500%.'
      );
      return;
    }

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('defaultLaborRate', String(parsedLaborRate));
    formData.set('defaultLaborCost', String(parsedLaborCost));
    formData.set('defaultMaterialsMarkup', String(parsedMarkup));

    const response = await updateLaborMarkupSettings(formData);

    setLoading(false);

    if (response?.error) {
      setErrorMessage(response.error);
      return;
    }

    const nextLaborRate = normalizeMoney(response?.laborRate, parsedLaborRate);
    const nextLaborCost = normalizeMoney(response?.laborCost, parsedLaborCost);
    const nextMarkup = normalizeMoney(response?.materialsMarkup, parsedMarkup);

    setLaborRate(nextLaborRate);
    setLaborRateInput(nextLaborRate.toFixed(2));
    setLaborCost(nextLaborCost);
    setLaborCostInput(nextLaborCost.toFixed(2));
    setMaterialsMarkup(nextMarkup);
    setMaterialsMarkupInput(nextMarkup.toFixed(2));

    setEditing(false);
    setStatusMessage(
      isEs
        ? 'Tarifas y márgenes de cotizaciones actualizados correctamente.'
        : 'Labor rates and materials markup updated successfully.'
    );
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {isEs ? 'Tarifas de Mano de Obra y Márgenes' : 'Labor & Markup Settings'}
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3" />
            {isEs ? 'Cotizaciones / Quotes' : 'Quote Defaults'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {isEs
            ? 'Define los valores estándar para calcular automáticamente horas trabajadas, costo de materiales y rentabilidad en tus cotizaciones.'
            : 'Define standard values to automatically calculate labor hours, materials cost, and profit margins on quotes.'}
        </p>
      </div>

      {statusMessage ? <p className="px-6 md:px-8 text-xs text-emerald-600 font-medium">{statusMessage}</p> : null}
      {errorMessage ? <p className="px-6 md:px-8 text-xs text-red-600 font-medium">{errorMessage}</p> : null}

      <div className="border-y border-slate-200">
        <div className="divide-y divide-slate-200">
          <div className="px-6 md:px-8 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isEs ? 'Tarifa al Cliente ($/hr)' : 'Billable Labor Rate ($/hr)'}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    {laborRate.toFixed(2)} / hr
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isEs ? 'Tarifa estándar facturada al cliente' : 'Standard rate billed to customer'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isEs ? 'Costo de Mano de Obra ($/hr)' : 'Labor Cost ($/hr)'}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    {laborCost.toFixed(2)} / hr
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isEs ? 'Costo interno privado (sueldo + overhead)' : 'Private cost (wage + overhead)'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isEs ? 'Margen de Materiales (%)' : 'Materials Markup (%)'}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                    <Percent className="w-4 h-4 text-blue-600" />
                    {materialsMarkup.toFixed(2)}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isEs ? 'Margen comercial sobre costo de repuestos' : 'Added to contractor supplies cost'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
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
                    form="labor-markup-settings-form"
                    disabled={loading}
                    className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                  >
                    {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar' : 'Update')}
                  </button>
                ) : null}
              </div>
            </div>

            <form
              id="labor-markup-settings-form"
              onSubmit={handleSubmit}
              className={editing ? 'mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-5' : 'hidden'}
            >
              <div className="space-y-1">
                <label
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                  htmlFor="default-labor-rate-input"
                >
                  {isEs ? 'Tarifa al Cliente ($/hr)' : 'Default Labor Rate ($/hr)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                  <input
                    id="default-labor-rate-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborRateInput}
                    onChange={(event) => setLaborRateInput(event.target.value)}
                    placeholder="95.00"
                    className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEs ? 'Ejemplo: 95.00 para $95/hr.' : 'Example: 95.00 for $95/hr.'}
                </p>
              </div>

              <div className="space-y-1">
                <label
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                  htmlFor="default-labor-cost-input"
                >
                  {isEs ? 'Costo Privado ($/hr)' : 'Default Labor Cost ($/hr - Private)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                  <input
                    id="default-labor-cost-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborCostInput}
                    onChange={(event) => setLaborCostInput(event.target.value)}
                    placeholder="45.00"
                    className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEs ? 'Solo visible para el dueño/admin.' : 'Internal only. Hidden from customers.'}
                </p>
              </div>

              <div className="space-y-1">
                <label
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                  htmlFor="default-materials-markup-input"
                >
                  {isEs ? 'Margen de Materiales (%)' : 'Default Materials Markup (%)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs">%</span>
                  <input
                    id="default-materials-markup-input"
                    type="number"
                    min="0"
                    max="500"
                    step="0.01"
                    value={materialsMarkupInput}
                    onChange={(event) => setMaterialsMarkupInput(event.target.value)}
                    placeholder="30.00"
                    className="w-full rounded-lg border border-gray-300 pl-3 pr-7 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEs ? 'Ejemplo: 30 para agregar 30% al costo.' : 'Example: 30 to add 30% to supplies cost.'}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
