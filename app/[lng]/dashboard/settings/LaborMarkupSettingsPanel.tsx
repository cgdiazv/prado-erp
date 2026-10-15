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

  const startEditing = () => {
    setStatusMessage('');
    setErrorMessage('');
    setLaborRateInput(laborRate.toFixed(2));
    setLaborCostInput(laborCost.toFixed(2));
    setMaterialsMarkupInput(materialsMarkup.toFixed(2));
    setNightLaborRateInput(nightLaborRate.toFixed(2));
    setNightLaborCostInput(nightLaborCost.toFixed(2));
    setHolidayEmergencyLaborCostInput(holidayEmergencyLaborCost.toFixed(2));
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setErrorMessage('');
    setLaborRateInput(laborRate.toFixed(2));
    setLaborCostInput(laborCost.toFixed(2));
    setMaterialsMarkupInput(materialsMarkup.toFixed(2));
    setNightLaborRateInput(nightLaborRate.toFixed(2));
    setNightLaborCostInput(nightLaborCost.toFixed(2));
    setHolidayEmergencyLaborCostInput(holidayEmergencyLaborCost.toFixed(2));
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              {isEs ? 'Tarifas y Márgenes Predeterminados' : 'Labor & Markup Defaults'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEs
                ? 'Define los valores estándar para calcular automáticamente horas trabajadas, costo de materiales y rentabilidad en tus cotizaciones.'
                : 'Define standard values to automatically calculate labor hours, materials cost, and profit margins on quotes.'}
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
          <div className="w-full max-w-3xl space-y-5">
            {/* Row 1: Standard Rates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Labor Rate */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Tarifa al Cliente ($/hr)' : 'Labor Rate ($/hr)'}
                </label>
                {editing ? (
                  <div className="relative mt-1.5">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={laborRateInput}
                      onChange={(e) => setLaborRateInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="95.00"
                      className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                      autoFocus
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    {laborRate.toFixed(2)} / hr
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  {isEs ? 'Tarifa estándar facturada al cliente' : 'Standard rate billed to customer'}
                </p>
              </div>

              {/* Labor Cost */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Costo de Mano de Obra ($/hr)' : 'Labor Cost ($/hr)'}
                </label>
                {editing ? (
                  <div className="relative mt-1.5">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={laborCostInput}
                      onChange={(e) => setLaborCostInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="45.00"
                      className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    {laborCost.toFixed(2)} / hr
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  {isEs ? 'Costo interno privado (sueldo + overhead)' : 'Private cost (wage + overhead)'}
                </p>
              </div>

              {/* Materials Markup */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Margen de Materiales (%)' : 'Materials Markup (%)'}
                </label>
                {editing ? (
                  <div className="relative mt-1.5">
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 text-xs">%</span>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      step="0.01"
                      value={materialsMarkupInput}
                      onChange={(e) => setMaterialsMarkupInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="30.00"
                      className="w-full rounded-lg border border-emerald-300 bg-white pl-3 pr-7 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                    <Percent className="w-4 h-4 text-blue-600" />
                    {materialsMarkup.toFixed(2)}%
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  {isEs ? 'Margen comercial sobre costo de repuestos' : 'Added to contractor supplies cost'}
                </p>
              </div>
            </div>

            {/* Row 2: Night & Emergency Rates */}
            <div className="pt-4 border-t border-slate-200/60">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Night Labor Rate */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isEs ? 'Tarifa Nocturna ($/hr)' : 'Night Hours Labor Rate ($/hr)'}
                  </label>
                  {editing ? (
                    <div className="relative mt-1.5">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nightLaborRateInput}
                        onChange={(e) => setNightLaborRateInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="135.00"
                        className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-indigo-600" />
                      {nightLaborRate.toFixed(2)} / hr
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isEs ? 'Tarifa nocturna facturada al cliente' : 'Night rate billed to customer'}
                  </p>
                </div>

                {/* Night Labor Cost */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isEs ? 'Costo de Mano de Obra Nocturna ($/hr)' : 'Night Hours Labor Cost ($/hr)'}
                  </label>
                  {editing ? (
                    <div className="relative mt-1.5">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nightLaborCostInput}
                        onChange={(e) => setNightLaborCostInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="65.00"
                        className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-slate-500" />
                      {nightLaborCost.toFixed(2)} / hr
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isEs ? 'Costo interno nocturno privado (sueldo + overhead)' : 'Private night cost (wage + overhead)'}
                  </p>
                </div>

                {/* Holiday & Emergency Cost */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isEs ? 'Costo Feriados y Emergencias ($/hr)' : 'Holidays & Emergency Labor Cost ($/hr)'}
                  </label>
                  {editing ? (
                    <div className="relative mt-1.5">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={holidayEmergencyLaborCostInput}
                        onChange={(e) => setHolidayEmergencyLaborCostInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="75.00"
                        className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-base font-bold text-slate-800 flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-slate-500" />
                      {holidayEmergencyLaborCost.toFixed(2)} / hr
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isEs ? 'Costo interno privado para feriados y emergencias' : 'Private holiday & emergency cost (wage + overhead)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
