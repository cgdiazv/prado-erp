'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { updateLaborMarkupSettings } from './actions';
import { DollarSign, Percent } from 'lucide-react';

interface LaborMarkupSettingsPanelProps {
  initialLaborRate?: number | null;
  initialLaborCost?: number | null;
  initialMaterialsMarkup?: number | null;
  initialNightLaborRate?: number | null;
  initialNightLaborCost?: number | null;
  initialHolidayEmergencyLaborCost?: number | null;
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
  initialNightLaborRate = 135.0,
  initialNightLaborCost = 65.0,
  initialHolidayEmergencyLaborCost = 75.0,
  locale = 'en',
}: LaborMarkupSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const safeInitialLaborRate = normalizeMoney(initialLaborRate, 95.0);
  const safeInitialLaborCost = normalizeMoney(initialLaborCost, 45.0);
  const safeInitialMarkup = normalizeMoney(initialMaterialsMarkup, 30.0);
  const safeInitialNightLaborRate = normalizeMoney(initialNightLaborRate, 135.0);
  const safeInitialNightLaborCost = normalizeMoney(initialNightLaborCost, 65.0);
  const safeInitialHolidayEmergencyLaborCost = normalizeMoney(initialHolidayEmergencyLaborCost, 75.0);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [laborRate, setLaborRate] = useState(safeInitialLaborRate);
  const [laborCost, setLaborCost] = useState(safeInitialLaborCost);
  const [materialsMarkup, setMaterialsMarkup] = useState(safeInitialMarkup);
  const [nightLaborRate, setNightLaborRate] = useState(safeInitialNightLaborRate);
  const [nightLaborCost, setNightLaborCost] = useState(safeInitialNightLaborCost);
  const [holidayEmergencyLaborCost, setHolidayEmergencyLaborCost] = useState(safeInitialHolidayEmergencyLaborCost);

  const [laborRateInput, setLaborRateInput] = useState(safeInitialLaborRate.toFixed(2));
  const [laborCostInput, setLaborCostInput] = useState(safeInitialLaborCost.toFixed(2));
  const [materialsMarkupInput, setMaterialsMarkupInput] = useState(safeInitialMarkup.toFixed(2));
  const [nightLaborRateInput, setNightLaborRateInput] = useState(safeInitialNightLaborRate.toFixed(2));
  const [nightLaborCostInput, setNightLaborCostInput] = useState(safeInitialNightLaborCost.toFixed(2));
  const [holidayEmergencyLaborCostInput, setHolidayEmergencyLaborCostInput] = useState(safeInitialHolidayEmergencyLaborCost.toFixed(2));

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const rate = normalizeMoney(initialLaborRate, 95.0);
    const cost = normalizeMoney(initialLaborCost, 45.0);
    const markup = normalizeMoney(initialMaterialsMarkup, 30.0);
    const nRate = normalizeMoney(initialNightLaborRate, 135.0);
    const nCost = normalizeMoney(initialNightLaborCost, 65.0);
    const hCost = normalizeMoney(initialHolidayEmergencyLaborCost, 75.0);
    setLaborRate(rate);
    setLaborRateInput(rate.toFixed(2));
    setLaborCost(cost);
    setLaborCostInput(cost.toFixed(2));
    setMaterialsMarkup(markup);
    setMaterialsMarkupInput(markup.toFixed(2));
    setNightLaborRate(nRate);
    setNightLaborRateInput(nRate.toFixed(2));
    setNightLaborCost(nCost);
    setNightLaborCostInput(nCost.toFixed(2));
    setHolidayEmergencyLaborCost(hCost);
    setHolidayEmergencyLaborCostInput(hCost.toFixed(2));
  }, [initialLaborRate, initialLaborCost, initialMaterialsMarkup, initialNightLaborRate, initialNightLaborCost, initialHolidayEmergencyLaborCost]);

  const toggleEditing = () => {
    setStatusMessage('');
    setErrorMessage('');
    setEditing((prev) => !prev);
    if (!editing) {
      setLaborRateInput(laborRate.toFixed(2));
      setLaborCostInput(laborCost.toFixed(2));
      setMaterialsMarkupInput(materialsMarkup.toFixed(2));
      setNightLaborRateInput(nightLaborRate.toFixed(2));
      setNightLaborCostInput(nightLaborCost.toFixed(2));
      setHolidayEmergencyLaborCostInput(holidayEmergencyLaborCost.toFixed(2));
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
    const parsedNightLaborRate = Number.parseFloat(nightLaborRateInput);
    const parsedNightLaborCost = Number.parseFloat(nightLaborCostInput);
    const parsedHolidayEmergencyLaborCost = Number.parseFloat(holidayEmergencyLaborCostInput);

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

    if (!Number.isFinite(parsedNightLaborRate) || parsedNightLaborRate < 0) {
      setLoading(false);
      setErrorMessage(
        isEs ? 'Ingresa una tarifa nocturna válida (mayor o igual a 0).' : 'Enter a valid night labor rate (>= 0).'
      );
      return;
    }

    if (!Number.isFinite(parsedNightLaborCost) || parsedNightLaborCost < 0) {
      setLoading(false);
      setErrorMessage(
        isEs ? 'Ingresa un costo nocturno válido (mayor o igual a 0).' : 'Enter a valid night labor cost (>= 0).'
      );
      return;
    }

    if (!Number.isFinite(parsedHolidayEmergencyLaborCost) || parsedHolidayEmergencyLaborCost < 0) {
      setLoading(false);
      setErrorMessage(
        isEs
          ? 'Ingresa un costo de feriados y emergencias válido (mayor o igual a 0).'
          : 'Enter a valid holidays and emergency labor cost (>= 0).'
      );
      return;
    }

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('defaultLaborRate', String(parsedLaborRate));
    formData.set('defaultLaborCost', String(parsedLaborCost));
    formData.set('defaultMaterialsMarkup', String(parsedMarkup));
    formData.set('defaultNightLaborRate', String(parsedNightLaborRate));
    formData.set('defaultNightLaborCost', String(parsedNightLaborCost));
    formData.set('defaultHolidayEmergencyLaborCost', String(parsedHolidayEmergencyLaborCost));

    const response = await updateLaborMarkupSettings(formData);

    setLoading(false);

    if (response?.error) {
      setErrorMessage(response.error);
      return;
    }

    const nextLaborRate = normalizeMoney(response?.laborRate, parsedLaborRate);
    const nextLaborCost = normalizeMoney(response?.laborCost, parsedLaborCost);
    const nextMarkup = normalizeMoney(response?.materialsMarkup, parsedMarkup);
    const nextNightLaborRate = normalizeMoney(response?.nightLaborRate, parsedNightLaborRate);
    const nextNightLaborCost = normalizeMoney(response?.nightLaborCost, parsedNightLaborCost);
    const nextHolidayEmergencyLaborCost = normalizeMoney(
      response?.holidayEmergencyLaborCost,
      parsedHolidayEmergencyLaborCost
    );

    setLaborRate(nextLaborRate);
    setLaborRateInput(nextLaborRate.toFixed(2));
    setLaborCost(nextLaborCost);
    setLaborCostInput(nextLaborCost.toFixed(2));
    setMaterialsMarkup(nextMarkup);
    setMaterialsMarkupInput(nextMarkup.toFixed(2));
    setNightLaborRate(nextNightLaborRate);
    setNightLaborRateInput(nextNightLaborRate.toFixed(2));
    setNightLaborCost(nextNightLaborCost);
    setNightLaborCostInput(nextNightLaborCost.toFixed(2));
    setHolidayEmergencyLaborCost(nextHolidayEmergencyLaborCost);
    setHolidayEmergencyLaborCostInput(nextHolidayEmergencyLaborCost.toFixed(2));

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
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
          {isEs ? 'Tarifas y Márgenes Predeterminados' : 'Labor & Markup Defaults'}
        </h3>
        <p className="text-xs text-slate-500">
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
              <div className="w-full max-w-2xl space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {isEs ? 'Tarifa al Cliente ($/hr)' : 'Labor Rate ($/hr)'}
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

                <div className="pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {isEs ? 'Tarifa Nocturna ($/hr)' : 'Night Hours Labor Rate ($/hr)'}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        {nightLaborRate.toFixed(2)} / hr
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isEs ? 'Tarifa nocturna facturada al cliente' : 'Night rate billed to customer'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {isEs ? 'Costo de Mano de Obra Nocturna ($/hr)' : 'Night Hours Labor Cost ($/hr)'}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-slate-500" />
                        {nightLaborCost.toFixed(2)} / hr
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isEs ? 'Costo interno nocturno privado (sueldo + overhead)' : 'Private night cost (wage + overhead)'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {isEs ? 'Costo Feriados y Emergencias ($/hr)' : 'Holidays & Emergency Labor Cost ($/hr)'}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-slate-500" />
                        {holidayEmergencyLaborCost.toFixed(2)} / hr
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isEs ? 'Costo interno privado para feriados y emergencias' : 'Private holiday & emergency cost (wage + overhead)'}
                      </p>
                    </div>
                  </div>
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
              className={editing ? 'mt-6 pt-5 border-t border-slate-100 space-y-5' : 'hidden'}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                    htmlFor="default-labor-rate-input"
                  >
                    {isEs ? 'Tarifa al Cliente ($/hr)' : 'Labor Rate ($/hr)'}
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
                    {isEs ? 'Costo Privado ($/hr)' : 'Labor Cost ($/hr - Private)'}
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
                    {isEs ? 'Margen de Materiales (%)' : 'Materials Markup (%)'}
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
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                    htmlFor="default-night-labor-rate-input"
                  >
                    {isEs ? 'Tarifa Nocturna ($/hr)' : 'Night Hours Labor Rate ($/hr)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                    <input
                      id="default-night-labor-rate-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={nightLaborRateInput}
                      onChange={(event) => setNightLaborRateInput(event.target.value)}
                      placeholder="135.00"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? 'Ejemplo: 135.00 para $135/hr nocturno.' : 'Example: 135.00 for $135/hr night rate.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                    htmlFor="default-night-labor-cost-input"
                  >
                    {isEs ? 'Costo Privado Nocturno ($/hr)' : 'Night Hours Labor Cost ($/hr - Private)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                    <input
                      id="default-night-labor-cost-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={nightLaborCostInput}
                      onChange={(event) => setNightLaborCostInput(event.target.value)}
                      placeholder="65.00"
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
                    htmlFor="default-holiday-emergency-labor-cost-input"
                  >
                    {isEs ? 'Costo Feriados y Emergencias ($/hr)' : 'Holidays & Emergency Labor Cost ($/hr - Private)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                    <input
                      id="default-holiday-emergency-labor-cost-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={holidayEmergencyLaborCostInput}
                      onChange={(event) => setHolidayEmergencyLaborCostInput(event.target.value)}
                      placeholder="75.00"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? 'Solo visible para el dueño/admin.' : 'Internal only. Hidden from customers.'}
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
