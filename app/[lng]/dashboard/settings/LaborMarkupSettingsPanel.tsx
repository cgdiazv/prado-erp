'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Pencil, Check, X, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  updateLaborMarkupSettings,
  createCustomLaborRateAction,
  updateCustomLaborRateAction,
  deleteCustomLaborRateAction,
} from './actions';
import type { CustomLaborRate } from '@/lib/customLaborRates';

interface LaborMarkupSettingsPanelProps {
  initialLaborRate?: number | null;
  initialLaborCost?: number | null;
  initialMaterialsMarkup?: number | null;
  initialNightLaborRate?: number | null;
  initialNightLaborCost?: number | null;
  initialHolidayEmergencyLaborRate?: number | null;
  initialHolidayEmergencyLaborCost?: number | null;
  initialCustomLaborRates?: CustomLaborRate[];
  locale?: string;
  mode?: 'labor' | 'materials';
}

type BuiltInLaborTierKey = 'standard' | 'night' | 'emergency';

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
  initialHolidayEmergencyLaborRate = 165.0,
  initialHolidayEmergencyLaborCost = 75.0,
  initialCustomLaborRates = [],
  locale = 'en',
  mode = 'labor',
}: LaborMarkupSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const isMaterialsMode = mode === 'materials';

  const safeInitialLaborRate = normalizeMoney(initialLaborRate, 95.0);
  const safeInitialLaborCost = normalizeMoney(initialLaborCost, 45.0);
  const safeInitialMarkup = normalizeMoney(initialMaterialsMarkup, 30.0);
  const safeInitialNightLaborRate = normalizeMoney(initialNightLaborRate, 135.0);
  const safeInitialNightLaborCost = normalizeMoney(initialNightLaborCost, 65.0);
  const safeInitialHolidayEmergencyLaborRate = normalizeMoney(initialHolidayEmergencyLaborRate, 165.0);
  const safeInitialHolidayEmergencyLaborCost = normalizeMoney(initialHolidayEmergencyLaborCost, 75.0);

  const [editingMaterials, setEditingMaterials] = useState(false);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Create new custom labor rate state
  const [editingCreate, setEditingCreate] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftHourlyCost, setDraftHourlyCost] = useState('45.00');
  const [draftHourlyPrice, setDraftHourlyPrice] = useState('95.00');

  // Custom labor rates list & inline edit state
  const [customRates, setCustomRates] = useState<CustomLaborRate[]>(initialCustomLaborRates);
  const [editCustomName, setEditCustomName] = useState('');
  const [editCustomDescription, setEditCustomDescription] = useState('');
  const [editCustomCost, setEditCustomCost] = useState('0.00');
  const [editCustomPrice, setEditCustomPrice] = useState('0.00');

  const [laborRate, setLaborRate] = useState(safeInitialLaborRate);
  const [laborCost, setLaborCost] = useState(safeInitialLaborCost);
  const [materialsMarkup, setMaterialsMarkup] = useState(safeInitialMarkup);
  const [nightLaborRate, setNightLaborRate] = useState(safeInitialNightLaborRate);
  const [nightLaborCost, setNightLaborCost] = useState(safeInitialNightLaborCost);
  const [holidayEmergencyLaborRate, setHolidayEmergencyLaborRate] = useState(safeInitialHolidayEmergencyLaborRate);
  const [holidayEmergencyLaborCost, setHolidayEmergencyLaborCost] = useState(safeInitialHolidayEmergencyLaborCost);

  const [laborRateInput, setLaborRateInput] = useState(safeInitialLaborRate.toFixed(2));
  const [laborCostInput, setLaborCostInput] = useState(safeInitialLaborCost.toFixed(2));
  const [materialsMarkupInput, setMaterialsMarkupInput] = useState(safeInitialMarkup.toFixed(2));
  const [nightLaborRateInput, setNightLaborRateInput] = useState(safeInitialNightLaborRate.toFixed(2));
  const [nightLaborCostInput, setNightLaborCostInput] = useState(safeInitialNightLaborCost.toFixed(2));
  const [holidayEmergencyLaborRateInput, setHolidayEmergencyLaborRateInput] = useState(safeInitialHolidayEmergencyLaborRate.toFixed(2));
  const [holidayEmergencyLaborCostInput, setHolidayEmergencyLaborCostInput] = useState(safeInitialHolidayEmergencyLaborCost.toFixed(2));

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setCustomRates(initialCustomLaborRates);
  }, [initialCustomLaborRates]);

  useEffect(() => {
    const rate = normalizeMoney(initialLaborRate, 95.0);
    const cost = normalizeMoney(initialLaborCost, 45.0);
    const markup = normalizeMoney(initialMaterialsMarkup, 30.0);
    const nRate = normalizeMoney(initialNightLaborRate, 135.0);
    const nCost = normalizeMoney(initialNightLaborCost, 65.0);
    const hRate = normalizeMoney(initialHolidayEmergencyLaborRate, 165.0);
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
    setHolidayEmergencyLaborRate(hRate);
    setHolidayEmergencyLaborRateInput(hRate.toFixed(2));
    setHolidayEmergencyLaborCost(hCost);
    setHolidayEmergencyLaborCostInput(hCost.toFixed(2));
  }, [
    initialLaborRate,
    initialLaborCost,
    initialMaterialsMarkup,
    initialNightLaborRate,
    initialNightLaborCost,
    initialHolidayEmergencyLaborRate,
    initialHolidayEmergencyLaborCost,
  ]);

  const resetInputsToSaved = () => {
    setLaborRateInput(laborRate.toFixed(2));
    setLaborCostInput(laborCost.toFixed(2));
    setMaterialsMarkupInput(materialsMarkup.toFixed(2));
    setNightLaborRateInput(nightLaborRate.toFixed(2));
    setNightLaborCostInput(nightLaborCost.toFixed(2));
    setHolidayEmergencyLaborRateInput(holidayEmergencyLaborRate.toFixed(2));
    setHolidayEmergencyLaborCostInput(holidayEmergencyLaborCost.toFixed(2));
  };

  const startEditingBuiltInTier = (tier: BuiltInLaborTierKey) => {
    setStatusMessage('');
    setErrorMessage('');
    resetInputsToSaved();
    setEditingTier(tier);
  };

  const startEditingCustomRate = (rate: CustomLaborRate) => {
    setStatusMessage('');
    setErrorMessage('');
    setEditCustomName(rate.name);
    setEditCustomDescription(rate.description || '');
    setEditCustomCost(rate.hourlyCost.toFixed(2));
    setEditCustomPrice(rate.hourlyPrice.toFixed(2));
    setEditingTier(rate.id);
  };

  const cancelEditingTier = () => {
    setEditingTier(null);
    setErrorMessage('');
    resetInputsToSaved();
  };

  const startEditingMaterials = () => {
    setStatusMessage('');
    setErrorMessage('');
    resetInputsToSaved();
    setEditingMaterials(true);
  };

  const cancelEditingMaterials = () => {
    setEditingMaterials(false);
    setErrorMessage('');
    resetInputsToSaved();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    } else if (e.key === 'Escape') {
      if (isMaterialsMode) {
        cancelEditingMaterials();
      } else {
        cancelEditingTier();
      }
    }
  };

  const handleCreateCustomRate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const normalizedName = draftName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      setErrorMessage(isEs ? 'Ingresa el nombre de la tarifa.' : 'Enter a labor rate name.');
      return;
    }

    const parsedCost = Number.parseFloat(draftHourlyCost);
    const parsedPrice = Number.parseFloat(draftHourlyPrice);

    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setErrorMessage(isEs ? 'Ingresa un costo por hora válido.' : 'Enter a valid hourly cost.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMessage(isEs ? 'Ingresa un precio por hora válido.' : 'Enter a valid hourly price.');
      return;
    }

    setLoadingActionId('create-custom');
    const res = await createCustomLaborRateAction({
      name: normalizedName,
      description: draftDescription.trim(),
      hourlyCost: parsedCost,
      hourlyPrice: parsedPrice,
    });
    setLoadingActionId(null);

    if (res?.error) {
      setErrorMessage(res.error);
      return;
    }

    if (res?.rates) {
      setCustomRates(res.rates);
      setDraftName('');
      setDraftDescription('');
      setDraftHourlyCost('45.00');
      setDraftHourlyPrice('95.00');
      setEditingCreate(false);
      setStatusMessage(
        isEs
          ? `Tarifa "${normalizedName}" agregada correctamente.`
          : `Added labor rate "${normalizedName}" successfully.`
      );
    }
  };

  const handleSaveCustomRate = async (rateId: string) => {
    setStatusMessage('');
    setErrorMessage('');

    const normalizedName = editCustomName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      setErrorMessage(isEs ? 'Ingresa el nombre de la tarifa.' : 'Enter a labor rate name.');
      return;
    }

    const parsedCost = Number.parseFloat(editCustomCost);
    const parsedPrice = Number.parseFloat(editCustomPrice);

    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setErrorMessage(isEs ? 'Ingresa un costo por hora válido.' : 'Enter a valid hourly cost.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMessage(isEs ? 'Ingresa un precio por hora válido.' : 'Enter a valid hourly price.');
      return;
    }

    setLoadingActionId(`update-${rateId}`);
    const res = await updateCustomLaborRateAction({
      id: rateId,
      name: normalizedName,
      description: editCustomDescription.trim(),
      hourlyCost: parsedCost,
      hourlyPrice: parsedPrice,
    });
    setLoadingActionId(null);

    if (res?.error) {
      setErrorMessage(res.error);
      return;
    }

    if (res?.rates) {
      setCustomRates(res.rates);
      setEditingTier(null);
      setStatusMessage(
        isEs
          ? `Tarifa "${normalizedName}" actualizada correctamente.`
          : `Updated labor rate "${normalizedName}" successfully.`
      );
    }
  };

  const handleDeleteCustomRate = async (rate: CustomLaborRate) => {
    setStatusMessage('');
    setErrorMessage('');
    setLoadingActionId(`delete-${rate.id}`);

    const res = await deleteCustomLaborRateAction(rate.id);
    setLoadingActionId(null);

    if (res?.error) {
      setErrorMessage(res.error);
      return;
    }

    if (res?.rates) {
      setCustomRates(res.rates);
      setStatusMessage(
        isEs
          ? `Tarifa "${rate.name}" eliminada.`
          : `Removed labor rate "${rate.name}".`
      );
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
    const parsedHolidayEmergencyLaborRate = Number.parseFloat(holidayEmergencyLaborRateInput);
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

    if (!Number.isFinite(parsedHolidayEmergencyLaborRate) || parsedHolidayEmergencyLaborRate < 0) {
      setLoading(false);
      setErrorMessage(
        isEs
          ? 'Ingresa una tarifa de feriados y emergencias válida (mayor o igual a 0).'
          : 'Enter a valid holidays and emergency labor rate (>= 0).'
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
    formData.set('defaultHolidayEmergencyLaborRate', String(parsedHolidayEmergencyLaborRate));
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
    const nextHolidayEmergencyLaborRate = normalizeMoney(
      response?.holidayEmergencyLaborRate,
      parsedHolidayEmergencyLaborRate
    );
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
    setHolidayEmergencyLaborRate(nextHolidayEmergencyLaborRate);
    setHolidayEmergencyLaborRateInput(nextHolidayEmergencyLaborRate.toFixed(2));
    setHolidayEmergencyLaborCost(nextHolidayEmergencyLaborCost);
    setHolidayEmergencyLaborCostInput(nextHolidayEmergencyLaborCost.toFixed(2));

    setEditingMaterials(false);
    setEditingTier(null);
    setStatusMessage(
      isMaterialsMode
        ? isEs
          ? 'Margen de materiales actualizado correctamente.'
          : 'Materials markup updated successfully.'
        : isEs
        ? 'Tarifa de mano de obra actualizada correctamente.'
        : 'Labor rate updated successfully.'
    );
  };

  const builtInLaborRows: Array<{
    tier: BuiltInLaborTierKey;
    title: string;
    subtitle: string;
    cost: number;
    costInput: string;
    setCostInput: (val: string) => void;
    price: number;
    priceInput: string;
    setPriceInput: (val: string) => void;
  }> = [
    {
      tier: 'standard',
      title: isEs ? 'Mano de Obra – Estándar' : 'Service Labor – Standard',
      subtitle: isEs ? 'Horario laboral regular' : 'Standard business hours',
      cost: laborCost,
      costInput: laborCostInput,
      setCostInput: setLaborCostInput,
      price: laborRate,
      priceInput: laborRateInput,
      setPriceInput: setLaborRateInput,
    },
    {
      tier: 'night',
      title: isEs ? 'Mano de Obra – Horario Nocturno' : 'Service Labor – After Hours',
      subtitle: isEs ? 'Turno nocturno y fuera de horario' : 'Night and after-hours shift',
      cost: nightLaborCost,
      costInput: nightLaborCostInput,
      setCostInput: setNightLaborCostInput,
      price: nightLaborRate,
      priceInput: nightLaborRateInput,
      setPriceInput: setNightLaborRateInput,
    },
    {
      tier: 'emergency',
      title: isEs ? 'Mano de Obra – Feriados y Emergencias' : 'Service Labor – Holidays & Emergency',
      subtitle: isEs ? 'Atención urgente y días festivos' : 'Urgent dispatch and holidays',
      cost: holidayEmergencyLaborCost,
      costInput: holidayEmergencyLaborCostInput,
      setCostInput: setHolidayEmergencyLaborCostInput,
      price: holidayEmergencyLaborRate,
      priceInput: holidayEmergencyLaborRateInput,
      setPriceInput: setHolidayEmergencyLaborRateInput,
    },
  ];

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              {isMaterialsMode
                ? isEs
                  ? 'Margen Comercial de Materiales'
                  : 'Materials Markup Defaults'
                : isEs
                ? 'Tarifas y Costos de Mano de Obra'
                : 'Labor Rate & Cost Defaults'}
            </h3>
            <p className="text-xs text-slate-500">
              {isMaterialsMode
                ? isEs
                  ? 'Define el porcentaje de margen predeterminado aplicado sobre el costo de materiales y suministros en tus cotizaciones.'
                  : 'Define the default markup percentage applied to materials and supplies cost on quotes.'
                : isEs
                ? 'Define los costos internos por hora y los precios por hora facturados al cliente para cada tarifa.'
                : 'Define internal hourly costs and customer hourly prices for each labor rate tier.'}
            </p>
          </div>

          {isMaterialsMode ? (
            <div className="flex items-center gap-3 shrink-0 pt-0.5">
              {editingMaterials ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditingMaterials}
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
                  onClick={startEditingMaterials}
                  className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
                >
                  {isEs ? 'Editar' : 'Edit'}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStatusMessage('');
                setErrorMessage('');
                setEditingCreate((current) => !current);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              {editingCreate ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Cancelar' : 'Cancel'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Agregar tarifa' : 'Add Labor Rate'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {statusMessage ? (
        <div className="mx-6 md:mx-8 p-3 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-700">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mx-6 md:mx-8 p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {!isMaterialsMode && editingCreate && (
        <div className="mx-6 md:mx-8 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-3">
            {isEs ? 'Nueva Tarifa de Mano de Obra' : 'New Labor Rate'}
          </p>
          <form onSubmit={handleCreateCustomRate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Nombre de la tarifa' : 'Labor Rate Name'}
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Ej: Técnico Principal, Ayudante, Cuadrilla...'
                      : 'e.g. Lead Technician, Apprentice, 2-Person Crew...'
                  }
                  required
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Costo por hora ($)' : 'Hourly Cost ($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftHourlyCost}
                  onChange={(e) => setDraftHourlyCost(e.target.value)}
                  placeholder="45.00"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Precio por hora ($)' : 'Hourly Price ($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftHourlyPrice}
                  onChange={(e) => setDraftHourlyPrice(e.target.value)}
                  placeholder="95.00"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isEs ? 'Descripción (opcional)' : 'Description (optional)'}
              </label>
              <input
                type="text"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder={
                  isEs
                    ? 'Breve descripción del rol o condición de esta tarifa'
                    : 'Short description of role or condition for this labor rate'
                }
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={loadingActionId === 'create-custom'}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:bg-emerald-400 cursor-pointer"
              >
                {loadingActionId === 'create-custom'
                  ? isEs
                    ? 'Guardando...'
                    : 'Saving...'
                  : isEs
                  ? 'Guardar tarifa'
                  : 'Save Labor Rate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isMaterialsMode ? (
        <div className="border-y border-slate-200">
          <div className={`px-6 md:px-8 py-5 transition ${editingMaterials ? 'bg-emerald-50/40 border-l-4 border-l-emerald-600' : ''}`}>
            <div className="w-full max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isEs ? 'Margen de Materiales' : 'Materials Markup'}
                  </label>
                  {editingMaterials ? (
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
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-base font-bold text-slate-800">
                      {materialsMarkup.toFixed(2)}%
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isEs ? 'Margen comercial sobre costo de repuestos' : 'Added to contractor supplies cost'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500">
                  {isEs ? 'Descripción' : 'Description'}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {isEs ? 'Costo por hora' : 'Hourly cost'}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {isEs ? 'Precio por hora' : 'Hourly price'}
                </th>
                <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">
                  {isEs ? 'Acciones' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {/* Built-in 3 Labor Tiers */}
              {builtInLaborRows.map((row) => {
                const isEditingRow = editingTier === row.tier;

                return (
                  <tr
                    key={row.tier}
                    className={`transition ${
                      isEditingRow ? 'bg-emerald-50/30' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-6 md:px-8 py-4">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">{row.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{row.subtitle}</p>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      {isEditingRow ? (
                        <div className="relative w-32">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.costInput}
                            onChange={(e) => row.setCostInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingBuiltInTier(row.tier)}
                          title={isEs ? 'Haz clic para editar' : 'Click to edit'}
                          className="text-xs sm:text-sm font-medium text-slate-800 hover:text-emerald-700 cursor-pointer"
                        >
                          ${row.cost.toFixed(2)}
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      {isEditingRow ? (
                        <div className="relative w-32">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.priceInput}
                            onChange={(e) => row.setPriceInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingBuiltInTier(row.tier)}
                          title={isEs ? 'Haz clic para editar' : 'Click to edit'}
                          className="text-xs sm:text-sm font-medium text-slate-800 hover:text-emerald-700 cursor-pointer"
                        >
                          ${row.price.toFixed(2)}
                        </button>
                      )}
                    </td>

                    <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                      {isEditingRow ? (
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={cancelEditingTier}
                            disabled={loading}
                            title={isEs ? 'Cancelar' : 'Cancel'}
                            aria-label={isEs ? 'Cancelar' : 'Cancel'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={loading}
                            title={isEs ? 'Actualizar' : 'Update'}
                            aria-label={isEs ? 'Actualizar' : 'Update'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/80 transition cursor-pointer disabled:opacity-50"
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingBuiltInTier(row.tier)}
                          title={isEs ? 'Editar tarifa' : 'Edit rate'}
                          aria-label={isEs ? 'Editar tarifa' : 'Edit rate'}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition duration-150 cursor-pointer border border-transparent hover:border-emerald-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* User-Created Custom Labor Rates */}
              {customRates.map((rate) => {
                const isEditingRow = editingTier === rate.id;
                const isUpdating = loadingActionId === `update-${rate.id}`;
                const isDeleting = loadingActionId === `delete-${rate.id}`;

                if (isEditingRow) {
                  return (
                    <tr key={rate.id} className="bg-emerald-50/30 align-top">
                      <td className="px-6 md:px-8 py-4 space-y-2 min-w-[240px]">
                        <input
                          type="text"
                          value={editCustomName}
                          onChange={(e) => setEditCustomName(e.target.value)}
                          placeholder={isEs ? 'Nombre de la tarifa' : 'Labor rate name'}
                          required
                          className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                        <input
                          type="text"
                          value={editCustomDescription}
                          onChange={(e) => setEditCustomDescription(e.target.value)}
                          placeholder={isEs ? 'Descripción (opcional)' : 'Description (optional)'}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="relative w-32">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCustomCost}
                            onChange={(e) => setEditCustomCost(e.target.value)}
                            autoFocus
                            className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="relative w-32">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCustomPrice}
                            onChange={(e) => setEditCustomPrice(e.target.value)}
                            className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      </td>

                      <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={cancelEditingTier}
                            disabled={isUpdating}
                            title={isEs ? 'Cancelar' : 'Cancel'}
                            aria-label={isEs ? 'Cancelar' : 'Cancel'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveCustomRate(rate.id)}
                            disabled={isUpdating}
                            title={isEs ? 'Actualizar' : 'Update'}
                            aria-label={isEs ? 'Actualizar' : 'Update'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/80 transition cursor-pointer disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={rate.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 md:px-8 py-4">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">{rate.name}</p>
                      {rate.description ? (
                        <p className="text-[11px] text-slate-400 mt-0.5">{rate.description}</p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-0.5 italic">
                          {isEs ? 'Tarifa personalizada' : 'Custom labor rate'}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEditingCustomRate(rate)}
                        title={isEs ? 'Haz clic para editar' : 'Click to edit'}
                        className="text-xs sm:text-sm font-medium text-slate-800 hover:text-emerald-700 cursor-pointer"
                      >
                        ${rate.hourlyCost.toFixed(2)}
                      </button>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEditingCustomRate(rate)}
                        title={isEs ? 'Haz clic para editar' : 'Click to edit'}
                        className="text-xs sm:text-sm font-medium text-slate-800 hover:text-emerald-700 cursor-pointer"
                      >
                        ${rate.hourlyPrice.toFixed(2)}
                      </button>
                    </td>

                    <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEditingCustomRate(rate)}
                          title={isEs ? 'Editar tarifa' : 'Edit rate'}
                          aria-label={isEs ? 'Editar tarifa' : 'Edit rate'}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition duration-150 cursor-pointer border border-transparent hover:border-emerald-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCustomRate(rate)}
                          disabled={isDeleting}
                          title={isEs ? 'Eliminar tarifa' : 'Delete rate'}
                          aria-label={isEs ? 'Eliminar tarifa' : 'Delete rate'}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition duration-150 cursor-pointer border border-transparent hover:border-red-100 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
