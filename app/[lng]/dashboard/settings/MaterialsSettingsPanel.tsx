'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  createCatalogMaterialAction,
  updateCatalogMaterialAction,
  archiveCatalogMaterialAction,
  restoreCatalogMaterialAction,
  seedTradeMaterialsAction,
  updateLaborMarkupSettings,
} from './actions';
import { TRADE_VERTICAL_OPTIONS } from '@/lib/sampleData';
import type { CatalogMaterialItem } from '@/lib/customMaterialsCatalog';
import { Plus, X, Pencil, Archive, Check, RotateCcw, Loader2 } from 'lucide-react';

interface MaterialsSettingsPanelProps {
  initialMaterials: CatalogMaterialItem[];
  initialMaterialsMarkup?: number;
  initialLaborRate?: number;
  initialLaborCost?: number;
  initialNightLaborRate?: number;
  initialNightLaborCost?: number;
  initialHolidayEmergencyLaborRate?: number;
  initialHolidayEmergencyLaborCost?: number;
  locale?: string;
  defaultTradeVertical?: string;
}

export default function MaterialsSettingsPanel({
  initialMaterials,
  initialMaterialsMarkup = 30,
  initialLaborRate = 95,
  initialLaborCost = 45,
  initialNightLaborRate = 135,
  initialNightLaborCost = 65,
  initialHolidayEmergencyLaborRate = 165,
  initialHolidayEmergencyLaborCost = 75,
  locale = 'en',
  defaultTradeVertical = 'Lawn Care & Landscaping',
}: MaterialsSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const [materials, setMaterials] = useState<CatalogMaterialItem[]>(initialMaterials);
  const [defaultMarkup, setDefaultMarkup] = useState<number>(initialMaterialsMarkup);
  const [defaultMarkupInput, setDefaultMarkupInput] = useState<string>(
    Number(initialMaterialsMarkup ?? 30).toFixed(2)
  );
  const [editingDefaultMarkup, setEditingDefaultMarkup] = useState(false);

  const [editingCreate, setEditingCreate] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftUnitCost, setDraftUnitCost] = useState('0.00');
  const [draftMarkupPercent, setDraftMarkupPercent] = useState(
    Number(initialMaterialsMarkup ?? 30).toFixed(2)
  );

  // Inline Edit state for existing materials
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUnitCost, setEditUnitCost] = useState('0.00');
  const [editMarkupPercent, setEditMarkupPercent] = useState('30.00');

  // Preset Trade loader state
  const [selectedTradePreset, setSelectedTradePreset] = useState<string>(
    TRADE_VERTICAL_OPTIONS.includes(defaultTradeVertical)
      ? defaultTradeVertical
      : 'Lawn Care & Landscaping'
  );

  const [statusMessage, setStatusMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  useEffect(() => {
    const normalized = Number(initialMaterialsMarkup ?? 30);
    setDefaultMarkup(normalized);
    setDefaultMarkupInput(normalized.toFixed(2));
  }, [initialMaterialsMarkup]);

  const activeMaterials = materials.filter((m) => !m.archived);
  const archivedMaterials = materials.filter((m) => Boolean(m.archived));

  const computeCustomerPrice = (cost: number, markup: number) => {
    const c = Number.isFinite(cost) && cost >= 0 ? cost : 0;
    const m = Number.isFinite(markup) && markup >= 0 ? markup : 0;
    return Math.round(c * (1 + m / 100) * 100) / 100;
  };

  const handleSaveDefaultMarkup = async () => {
    const parsedMarkup = Number.parseFloat(defaultMarkupInput);
    if (!Number.isFinite(parsedMarkup) || parsedMarkup < 0 || parsedMarkup > 500) {
      setStatusMessage(
        isEs
          ? 'El margen predeterminado debe estar entre 0% y 500%.'
          : 'Default markup must be between 0% and 500%.'
      );
      return;
    }

    setLoadingAction('save-default-markup');
    setStatusMessage('');

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('defaultLaborRate', String(initialLaborRate));
    formData.set('defaultLaborCost', String(initialLaborCost));
    formData.set('defaultMaterialsMarkup', String(parsedMarkup));
    formData.set('defaultNightLaborRate', String(initialNightLaborRate));
    formData.set('defaultNightLaborCost', String(initialNightLaborCost));
    formData.set('defaultHolidayEmergencyLaborRate', String(initialHolidayEmergencyLaborRate));
    formData.set('defaultHolidayEmergencyLaborCost', String(initialHolidayEmergencyLaborCost));

    const res = await updateLaborMarkupSettings(formData);
    setLoadingAction(null);

    if (res?.error) {
      setStatusMessage(res.error);
      return;
    }

    const updatedMarkup = Number(res?.materialsMarkup ?? parsedMarkup);
    setDefaultMarkup(updatedMarkup);
    setDefaultMarkupInput(updatedMarkup.toFixed(2));
    setDraftMarkupPercent(updatedMarkup.toFixed(2));
    setEditingDefaultMarkup(false);
    setStatusMessage(
      isEs
        ? `Margen predeterminado actualizado a ${updatedMarkup.toFixed(2)}%.`
        : `Default materials markup updated to ${updatedMarkup.toFixed(2)}%.`
    );
  };

  const handleLoadTradeDefaults = async () => {
    setLoadingAction('seed-defaults');
    setStatusMessage('');

    const response = await seedTradeMaterialsAction(selectedTradePreset);
    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.items) {
      setMaterials(response.items);
      setStatusMessage(
        isEs
          ? `Materiales predeterminados de "${selectedTradePreset}" cargados.`
          : `Loaded default materials for "${selectedTradePreset}".`
      );
    }
  };

  const handleAddMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = draftName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      setStatusMessage(
        isEs ? 'Ingresa el nombre del material.' : 'Enter a material name first.'
      );
      return;
    }

    const parsedCost = Number.parseFloat(draftUnitCost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setStatusMessage(isEs ? 'Ingresa un costo unitario válido.' : 'Enter a valid unit cost.');
      return;
    }

    const parsedMarkup = Number.parseFloat(draftMarkupPercent);
    if (!Number.isFinite(parsedMarkup) || parsedMarkup < 0 || parsedMarkup > 500) {
      setStatusMessage(
        isEs ? 'El margen debe estar entre 0% y 500%.' : 'Markup must be between 0% and 500%.'
      );
      return;
    }

    setLoadingAction('create');
    setStatusMessage('');

    const response = await createCatalogMaterialAction({
      name: normalizedName,
      description: draftDescription.trim(),
      unitCost: parsedCost,
      markupPercent: parsedMarkup,
    });

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.items) {
      setMaterials(response.items);
      setDraftName('');
      setDraftDescription('');
      setDraftUnitCost('0.00');
      setDraftMarkupPercent(defaultMarkup.toFixed(2));
      setEditingCreate(false);
      setStatusMessage(
        isEs
          ? `Material "${normalizedName}" agregado con éxito.`
          : `Added "${normalizedName}" successfully.`
      );
    }
  };

  const startEditingMaterial = (material: CatalogMaterialItem) => {
    setStatusMessage('');
    setEditingMaterialId(material.id);
    setEditName(material.name);
    setEditDescription(material.description || '');
    setEditUnitCost(Number(material.unitCost ?? 0).toFixed(2));
    setEditMarkupPercent(Number(material.markupPercent ?? defaultMarkup).toFixed(2));
  };

  const cancelEditingMaterial = () => {
    setEditingMaterialId(null);
  };

  const handleUpdateMaterial = async (materialId: string) => {
    const normalizedName = editName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      setStatusMessage(isEs ? 'Ingresa el nombre del material.' : 'Enter a material name.');
      return;
    }

    const parsedCost = Number.parseFloat(editUnitCost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setStatusMessage(isEs ? 'Ingresa un costo unitario válido.' : 'Enter a valid unit cost.');
      return;
    }

    const parsedMarkup = Number.parseFloat(editMarkupPercent);
    if (!Number.isFinite(parsedMarkup) || parsedMarkup < 0 || parsedMarkup > 500) {
      setStatusMessage(
        isEs ? 'El margen debe estar entre 0% y 500%.' : 'Markup must be between 0% and 500%.'
      );
      return;
    }

    setLoadingAction(`update-${materialId}`);
    setStatusMessage('');

    const response = await updateCatalogMaterialAction({
      id: materialId,
      name: normalizedName,
      description: editDescription.trim(),
      unitCost: parsedCost,
      markupPercent: parsedMarkup,
    });

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.items) {
      setMaterials(response.items);
      setEditingMaterialId(null);
      setStatusMessage(
        isEs
          ? `Material "${normalizedName}" actualizado.`
          : `Updated "${normalizedName}" successfully.`
      );
    }
  };

  const handleArchiveMaterial = async (materialId: string, materialName: string) => {
    setLoadingAction(materialId);
    setStatusMessage('');

    const response = await archiveCatalogMaterialAction(materialId);
    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.items) {
      setMaterials(response.items);
      setStatusMessage(
        isEs ? `Material archivado: "${materialName}".` : `Archived "${materialName}".`
      );
    }
  };

  const handleRestoreMaterial = async (materialId: string, materialName: string) => {
    setLoadingAction(materialId);
    setStatusMessage('');

    const response = await restoreCatalogMaterialAction(materialId);
    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.items) {
      setMaterials(response.items);
      setStatusMessage(
        isEs ? `Material restaurado: "${materialName}".` : `Restored "${materialName}".`
      );
    }
  };

  const draftCalculatedPrice = computeCustomerPrice(
    Number.parseFloat(draftUnitCost) || 0,
    Number.parseFloat(draftMarkupPercent) || 0
  );

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8 space-y-3">
        {/* Line 1: Title & + Add Material button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              {isEs ? 'Materiales y Suministros' : 'Materials'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEs
                ? 'Administra tu catálogo de materiales, costos unitarios, porcentaje de margen y precios al cliente.'
                : 'Manage your materials catalog, unit costs, markup percentage, and customer prices.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusMessage('');
              setDraftMarkupPercent(defaultMarkup.toFixed(2));
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
                <span>{isEs ? 'Agregar material' : 'New Material'}</span>
              </>
            )}
          </button>
        </div>

        {/* Line 2 (Stacked): Industry Preset Dropdown + Load Default Materials + Default Markup setting */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTradePreset}
              onChange={(e) => setSelectedTradePreset(e.target.value)}
              aria-label={isEs ? 'Seleccionar industria' : 'Select industry preset'}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {TRADE_VERTICAL_OPTIONS.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLoadTradeDefaults}
              disabled={loadingAction === 'seed-defaults'}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              {loadingAction === 'seed-defaults'
                ? isEs
                  ? 'Cargando...'
                  : 'Loading...'
                : isEs
                ? 'Cargar predeterminados'
                : 'Load Default Materials'}
            </button>
          </div>

          {/* Workspace Default Markup Quick Editor */}
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="font-medium text-slate-500">
              {isEs ? 'Margen predeterminado:' : 'Default markup:'}
            </span>
            {editingDefaultMarkup ? (
              <div className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="0.01"
                  value={defaultMarkupInput}
                  onChange={(e) => setDefaultMarkupInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSaveDefaultMarkup();
                    } else if (e.key === 'Escape') {
                      setEditingDefaultMarkup(false);
                      setDefaultMarkupInput(defaultMarkup.toFixed(2));
                    }
                  }}
                  autoFocus
                  className="w-16 rounded border border-emerald-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                />
                <span className="text-slate-500">%</span>
                <button
                  type="button"
                  onClick={() => void handleSaveDefaultMarkup()}
                  disabled={loadingAction === 'save-default-markup'}
                  className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  title={isEs ? 'Guardar' : 'Save'}
                >
                  {loadingAction === 'save-default-markup' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDefaultMarkup(false);
                    setDefaultMarkupInput(defaultMarkup.toFixed(2));
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={isEs ? 'Cancelar' : 'Cancel'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDefaultMarkup(true)}
                className="inline-flex items-center gap-1 font-bold text-slate-800 hover:text-emerald-700 cursor-pointer"
                title={isEs ? 'Editar margen predeterminado' : 'Edit default markup'}
              >
                <span>{defaultMarkup.toFixed(2)}%</span>
                <Pencil className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div className="mx-6 md:mx-8 p-3 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-700">
          {statusMessage}
        </div>
      ) : null}

      {editingCreate && (
        <div className="mx-6 md:mx-8 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-3">
            {isEs ? 'Nuevo Material' : 'New Material'}
          </p>
          <form onSubmit={handleAddMaterial} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Nombre del material' : 'Material Name'}
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder={
                    isEs
                      ? 'Ej: Filtro MERV 13, Mulch, Capacitor...'
                      : 'e.g. MERV 13 Air Filter, Hardwood Mulch, Capacitor...'
                  }
                  required
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Costo unitario ($)' : 'Unit Cost ($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftUnitCost}
                  onChange={(event) => setDraftUnitCost(event.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Margen (%)' : 'Markup (%)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="0.01"
                  value={draftMarkupPercent}
                  onChange={(event) => setDraftMarkupPercent(event.target.value)}
                  placeholder="30.00"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isEs ? 'Descripción (opcional)' : 'Description (optional)'}
              </label>
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder={isEs ? 'Descripción detallada del material...' : 'Detailed material description...'}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-slate-600">
                {isEs ? 'Precio sugerido al cliente:' : 'Customer price with markup:'}{' '}
                <strong className="text-slate-900">${draftCalculatedPrice.toFixed(2)}</strong>
              </span>

              <button
                type="submit"
                disabled={loadingAction === 'create'}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:bg-emerald-400 cursor-pointer"
              >
                {loadingAction === 'create'
                  ? isEs
                    ? 'Guardando...'
                    : 'Saving...'
                  : isEs
                  ? 'Guardar material'
                  : 'Save Material'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Materials Table */}
      <div className="border-t border-slate-200">
        {activeMaterials.length === 0 ? (
          <div className="px-6 md:px-8 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {isEs ? 'No hay materiales guardados' : 'No saved materials'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isEs
                ? 'Haz clic en "Cargar predeterminados" o agrega un material arriba para usarlo en tus cotizaciones.'
                : 'Click "Load Default Materials" or add a material above to use it on quotes.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500">
                    {isEs ? 'Descripción' : 'Description'}
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {isEs ? 'Costo unitario' : 'Unit cost'}
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {isEs ? 'Margen' : 'Markup'}
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {isEs ? 'Precio al cliente' : 'Customer price'}
                  </th>
                  <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">
                    {isEs ? 'Acciones' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {activeMaterials.map((material) => {
                  const isEditingThis = editingMaterialId === material.id;
                  const isUpdating = loadingAction === `update-${material.id}`;

                  if (isEditingThis) {
                    const livePrice = computeCustomerPrice(
                      Number.parseFloat(editUnitCost) || 0,
                      Number.parseFloat(editMarkupPercent) || 0
                    );

                    return (
                      <tr key={material.id} className="bg-emerald-50/30 align-top">
                        <td className="px-6 md:px-8 py-4 space-y-2 min-w-[260px]">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder={isEs ? 'Nombre del material' : 'Material name'}
                            required
                            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                          <textarea
                            rows={2}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder={
                              isEs
                                ? 'Descripción detallada del material...'
                                : 'Detailed material description...'
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-y"
                          />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="relative w-28">
                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editUnitCost}
                              onChange={(e) => setEditUnitCost(e.target.value)}
                              autoFocus
                              className="w-full rounded-lg border border-emerald-300 bg-white pl-6 pr-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="relative w-24">
                            <input
                              type="number"
                              min="0"
                              max="500"
                              step="0.01"
                              value={editMarkupPercent}
                              onChange={(e) => setEditMarkupPercent(e.target.value)}
                              className="w-full rounded-lg border border-emerald-300 bg-white pl-2.5 pr-6 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            />
                            <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 text-xs">
                              %
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900">
                          ${livePrice.toFixed(2)}
                        </td>

                        <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={cancelEditingMaterial}
                              disabled={isUpdating}
                              title={isEs ? 'Cancelar' : 'Cancel'}
                              aria-label={isEs ? 'Cancelar' : 'Cancel'}
                              className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateMaterial(material.id)}
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

                  const customerPrice = computeCustomerPrice(
                    material.unitCost,
                    material.markupPercent
                  );

                  return (
                    <tr key={material.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 md:px-8 py-4">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900">
                          {material.name}
                        </p>
                        {material.description ? (
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed max-w-2xl">
                            {material.description}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-0.5 italic">
                            {isEs ? 'Sin descripción' : 'No description'}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEditingMaterial(material)}
                          title={isEs ? 'Haz clic para editar el costo' : 'Click to edit cost'}
                          className="text-xs sm:text-sm font-medium text-slate-800 hover:text-emerald-700 cursor-pointer"
                        >
                          ${Number(material.unitCost ?? 0).toFixed(2)}
                        </button>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEditingMaterial(material)}
                          title={isEs ? 'Haz clic para editar el margen' : 'Click to edit markup'}
                          className="text-xs sm:text-sm font-medium text-slate-700 hover:text-emerald-700 cursor-pointer"
                        >
                          {Number(material.markupPercent ?? 0).toFixed(2)}%
                        </button>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900">
                        ${customerPrice.toFixed(2)}
                      </td>

                      <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingMaterial(material)}
                            title={isEs ? 'Editar material' : 'Edit material'}
                            aria-label={isEs ? 'Editar material' : 'Edit material'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition duration-150 cursor-pointer border border-transparent hover:border-emerald-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchiveMaterial(material.id, material.name)}
                            disabled={loadingAction === material.id}
                            title={isEs ? 'Archivar material' : 'Archive material'}
                            aria-label={isEs ? 'Archivar material' : 'Archive material'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition duration-150 cursor-pointer border border-transparent hover:border-red-100 disabled:opacity-50"
                          >
                            {loadingAction === material.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                              <Archive className="w-4 h-4" />
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

        {/* Archived Materials Section (if any) */}
        {archivedMaterials.length > 0 && (
          <div className="px-6 md:px-8 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>
                {isEs ? 'Materiales archivados' : 'Archived materials'} ({archivedMaterials.length})
              </span>
              <span className="text-[10px] text-slate-400">{showArchived ? '▲' : '▼'}</span>
            </button>

            {showArchived && (
              <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                {archivedMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 opacity-75"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {material.name}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        ${Number(material.unitCost ?? 0).toFixed(2)} (+{Number(material.markupPercent ?? 0).toFixed(0)}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreMaterial(material.id, material.name)}
                      disabled={loadingAction === material.id}
                      title={isEs ? 'Restaurar material' : 'Restore material'}
                      aria-label={isEs ? 'Restaurar material' : 'Restore material'}
                      className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {loadingAction === material.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
