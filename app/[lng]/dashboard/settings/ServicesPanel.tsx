'use client';

import { useState, type FormEvent } from 'react';
import {
  createService,
  updateService,
  deleteService,
  restoreService,
  seedTradeServicesAction,
} from './actions';
import { getTranslations } from '@/lib/translations';
import { TRADE_VERTICAL_OPTIONS } from '@/lib/sampleData';
import { Plus, X } from 'lucide-react';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';

type Service = {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  is_recurring_default: boolean | null;
  recurrence_interval_days: number | null;
  auto_charge_default: boolean | null;
};

interface ServicesPanelProps {
  initialServices: Service[];
  locale?: string;
  defaultTradeVertical?: string;
}

export default function ServicesPanel({
  initialServices,
  locale = 'en',
  defaultTradeVertical = 'Lawn Care & Landscaping',
}: ServicesPanelProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [services, setServices] = useState<Service[]>(initialServices);
  const [editingCreate, setEditingCreate] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftBasePrice, setDraftBasePrice] = useState('0.00');
  const [draftIsRecurring, setDraftIsRecurring] = useState(false);
  const [draftRecurrenceIntervalDays, setDraftRecurrenceIntervalDays] = useState('30');
  const [draftAutoChargeDefault, setDraftAutoChargeDefault] = useState(false);

  // Inline Edit state for existing services
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('0.00');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurrenceIntervalDays, setEditRecurrenceIntervalDays] = useState('30');
  const [editAutoChargeDefault, setEditAutoChargeDefault] = useState(false);

  // Preset Trade loader state
  const [selectedTradePreset, setSelectedTradePreset] = useState<string>(
    TRADE_VERTICAL_OPTIONS.includes(defaultTradeVertical)
      ? defaultTradeVertical
      : 'Lawn Care & Landscaping'
  );

  const [statusMessage, setStatusMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeServices = services.filter((s) => !s.name.startsWith(ARCHIVED_SERVICE_PREFIX));
  const archivedServices = services.filter((s) => s.name.startsWith(ARCHIVED_SERVICE_PREFIX));

  const startEditingService = (service: Service) => {
    setStatusMessage('');
    setEditingServiceId(service.id);
    setEditName(service.name);
    setEditDescription(service.description || '');
    setEditBasePrice(Number(service.base_price ?? 0).toFixed(2));
    setEditIsRecurring(Boolean(service.is_recurring_default));
    setEditRecurrenceIntervalDays(String(service.recurrence_interval_days || 30));
    setEditAutoChargeDefault(Boolean(service.auto_charge_default));
  };

  const cancelEditingService = () => {
    setEditingServiceId(null);
  };

  const handleUpdateService = async (event: FormEvent<HTMLFormElement>, serviceId: string) => {
    event.preventDefault();

    const normalizedName = editName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      setStatusMessage(isEs ? 'Ingresa el nombre del servicio.' : 'Enter a service name.');
      return;
    }

    const parsedBasePrice = Number.parseFloat(editBasePrice);
    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setStatusMessage(isEs ? 'Ingresa un precio base válido.' : 'Enter a valid base price.');
      return;
    }

    setLoadingAction(`update-${serviceId}`);
    setStatusMessage('');

    const response = await updateService({
      id: serviceId,
      name: normalizedName,
      description: editDescription.trim(),
      basePrice: parsedBasePrice,
      isRecurringDefault: editIsRecurring,
      recurrenceIntervalDays: editIsRecurring
        ? Number.parseInt(editRecurrenceIntervalDays || '30', 10)
        : null,
      autoChargeDefault: editIsRecurring ? editAutoChargeDefault : false,
    });

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.service) {
      setServices((currentServices) =>
        currentServices.map((s) => (s.id === serviceId ? response.service : s))
      );
      setEditingServiceId(null);
      setStatusMessage(
        isEs
          ? `Servicio "${normalizedName}" actualizado ($${Number(response.service.base_price ?? parsedBasePrice).toFixed(2)}).`
          : `Updated "${normalizedName}" ($${Number(response.service.base_price ?? parsedBasePrice).toFixed(2)}).`
      );
    }
  };

  const handleLoadTradeDefaults = async () => {
    setLoadingAction('seed-defaults');
    setStatusMessage('');

    const response = await seedTradeServicesAction(selectedTradePreset);
    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.services) {
      setServices(response.services);
      setStatusMessage(
        isEs
          ? `Servicios predeterminados de "${selectedTradePreset}" cargados.`
          : `Loaded default services for "${selectedTradePreset}".`
      );
    }
  };

  const handleAddService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedValue = draftName.trim().replace(/\s+/g, ' ');
    if (!normalizedValue) {
      setStatusMessage(isEs ? 'Ingresa el nombre del servicio.' : 'Enter a service name first.');
      return;
    }

    const isDuplicate = activeServices.some(
      (service) => service.name.toLowerCase() === normalizedValue.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage(isEs ? 'Ese servicio ya existe.' : 'That service already exists.');
      return;
    }

    const parsedBasePrice = Number.parseFloat(draftBasePrice);
    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setStatusMessage(isEs ? 'Ingresa un precio base válido.' : 'Enter a valid base price.');
      return;
    }

    setLoadingAction('create');
    setStatusMessage('');

    const response = await createService({
      name: normalizedValue,
      description: draftDescription.trim(),
      basePrice: parsedBasePrice,
      isRecurringDefault: draftIsRecurring,
      recurrenceIntervalDays: draftIsRecurring ? Number.parseInt(draftRecurrenceIntervalDays || '0', 10) : null,
      autoChargeDefault: draftIsRecurring ? draftAutoChargeDefault : false,
    });

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.service) {
      setServices((currentServices) => {
        const filtered = currentServices.filter((s) => s.id !== response.service.id);
        return [...filtered, response.service];
      });
      setDraftName('');
      setDraftDescription('');
      setDraftBasePrice('0.00');
      setDraftIsRecurring(false);
      setDraftRecurrenceIntervalDays('30');
      setDraftAutoChargeDefault(false);
      setEditingCreate(false);
      setStatusMessage(isEs ? `Servicio "${normalizedValue}" agregado con éxito.` : `Added "${normalizedValue}" successfully.`);
    }
  };

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    setLoadingAction(serviceId);
    setStatusMessage('');

    const response = await deleteService(serviceId);

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    const archivedName = serviceName.startsWith(ARCHIVED_SERVICE_PREFIX)
      ? serviceName
      : `${ARCHIVED_SERVICE_PREFIX}${serviceName}`;

    setServices((currentServices) =>
      currentServices.map((service) =>
        service.id === serviceId ? { ...service, name: archivedName } : service
      )
    );
    setStatusMessage(isEs ? `Servicio archivado: "${serviceName}".` : `Archived "${serviceName}".`);
  };

  const handleRestoreService = async (serviceId: string, serviceName: string) => {
    setLoadingAction(serviceId);
    setStatusMessage('');

    const response = await restoreService(serviceId);

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.service) {
      setServices((currentServices) =>
        currentServices.map((service) =>
          service.id === serviceId ? response.service : service
        )
      );
      const cleanName = serviceName.startsWith(ARCHIVED_SERVICE_PREFIX)
        ? serviceName.slice(ARCHIVED_SERVICE_PREFIX.length)
        : serviceName;
      setStatusMessage(isEs ? `Servicio restaurado: "${cleanName}".` : `Restored "${cleanName}".`);
    }
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            {translations.dashboard.servicesSection || (isEs ? 'Servicios' : 'Services')}
          </h3>
          <p className="text-xs text-slate-400">
            {translations.dashboard.servicesDescription ||
              (isEs
                ? 'Administra tu catálogo de servicios, descripciones detalladas y precios base editables.'
                : 'Manage your service catalog, detailed descriptions, and editable base prices.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
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
                : 'Load Default Services'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusMessage('');
              setEditingCreate((current) => !current);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
          >
            {editingCreate ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>{isEs ? 'Cancelar' : 'Cancel'}</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{isEs ? 'Agregar servicio' : 'Add Service'}</span>
              </>
            )}
          </button>
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
            {isEs ? 'Nuevo Servicio' : 'New Service'}
          </p>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Nombre del servicio' : 'Service Name'}
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder={translations.dashboard.addNewService || (isEs ? 'Nombre del servicio' : 'Service name')}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-48 space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Precio base' : 'Base Price'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftBasePrice}
                  onChange={(event) => setDraftBasePrice(event.target.value)}
                  placeholder="0.00"
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
                placeholder={isEs ? 'Descripción del servicio' : 'Service description'}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftIsRecurring}
                  onChange={(event) => setDraftIsRecurring(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                {isEs ? 'Servicio recurrente por defecto' : 'Recurring service by default'}
              </label>

              {draftIsRecurring ? (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {isEs ? 'Frecuencia (días)' : 'Frequency (days)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={draftRecurrenceIntervalDays}
                      onChange={(event) => setDraftRecurrenceIntervalDays(event.target.value)}
                      className="w-full sm:w-48 rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftAutoChargeDefault}
                      onChange={(event) => setDraftAutoChargeDefault(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    {isEs ? 'Auto cobro después del primer pago en línea' : 'Auto-charge after first online payment'}
                  </label>

                  <p className="text-[11px] text-slate-500">
                    {isEs
                      ? 'El siguiente trabajo se crea automáticamente al completar el trabajo actual.'
                      : 'The next job is created automatically when the current job is completed.'}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={loadingAction === 'create'}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:bg-emerald-400 cursor-pointer"
              >
                {loadingAction === 'create' ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar servicio' : 'Save Service')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete List of Saved Services */}
      <div className="border-t border-slate-200 px-6 md:px-8 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? 'Servicios guardados' : 'Saved Services'}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {activeServices.length}
            </span>
          </div>
        </div>

        {activeServices.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-700">
              {isEs ? 'No hay servicios guardados' : 'No saved services'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isEs
                ? 'Haz clic en "Cargar predeterminados" o agrega un servicio arriba para asignarlo a cotizaciones y trabajos.'
                : 'Click "Load Default Services" or add a service above to assign it to quotes and jobs.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            {activeServices.map((service) => {
              const isEditingThis = editingServiceId === service.id;

              if (isEditingThis) {
                return (
                  <form
                    key={service.id}
                    onSubmit={(e) => handleUpdateService(e, service.id)}
                    className="p-4 bg-emerald-50/40 border-l-4 border-l-emerald-600 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {isEs ? 'Nombre del servicio' : 'Service Name'}
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>

                      <div className="w-full sm:w-44 space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {isEs ? 'Precio Base ($)' : 'Base Price ($)'}
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editBasePrice}
                            onChange={(e) => setEditBasePrice(e.target.value)}
                            required
                            autoFocus
                            className="w-full rounded-lg border border-emerald-400 bg-white pl-6 pr-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {isEs ? 'Descripción detallada' : 'Detailed Description'}
                      </label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder={isEs ? 'Descripción detallada del servicio...' : 'Detailed scope and description...'}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-y"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsRecurring}
                            onChange={(e) => setEditIsRecurring(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{isEs ? 'Recurrente' : 'Recurring'}</span>
                        </label>

                        {editIsRecurring && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <span>{isEs ? 'Cada' : 'Every'}</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={editRecurrenceIntervalDays}
                              onChange={(e) => setEditRecurrenceIntervalDays(e.target.value)}
                              className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500"
                            />
                            <span>{isEs ? 'días' : 'days'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEditingService}
                          disabled={loadingAction === `update-${service.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                        >
                          {isEs ? 'Cancelar' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={loadingAction === `update-${service.id}`}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer disabled:opacity-50"
                        >
                          {loadingAction === `update-${service.id}`
                            ? isEs
                              ? 'Guardando...'
                              : 'Saving...'
                            : isEs
                            ? 'Guardar cambios'
                            : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={service.id}
                  className="px-4 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">
                        {service.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditingService(service)}
                        title={isEs ? 'Haz clic para editar el precio' : 'Click to edit price'}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        ${(service.base_price ?? 0).toFixed(2)}
                      </button>
                      {service.is_recurring_default ? (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {isEs ? 'Cada' : 'Every'} {service.recurrence_interval_days || 30} {isEs ? 'días' : 'days'}
                          {service.auto_charge_default ? ` • ${isEs ? 'Auto-cobro' : 'Auto-charge'}` : ''}
                        </span>
                      ) : null}
                    </div>
                    {service.description ? (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                        {service.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        {isEs ? 'Sin descripción' : 'No description'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => startEditingService(service)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {isEs ? 'Editar' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id, service.name)}
                      disabled={loadingAction === service.id}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      {loadingAction === service.id
                        ? (isEs ? 'Archivando...' : 'Archiving...')
                        : (isEs ? 'Archivar' : 'Archive')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Archived Services Section (if any) */}
        {archivedServices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>
                {isEs ? 'Servicios archivados' : 'Archived services'} ({archivedServices.length})
              </span>
              <span className="text-[10px] text-slate-400">{showArchived ? '▲' : '▼'}</span>
            </button>

            {showArchived && (
              <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                {archivedServices.map((service) => {
                  const cleanName = service.name.startsWith(ARCHIVED_SERVICE_PREFIX)
                    ? service.name.slice(ARCHIVED_SERVICE_PREFIX.length)
                    : service.name;

                  return (
                    <div
                      key={service.id}
                      className="px-4 py-3 flex items-center justify-between gap-4 opacity-75"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {cleanName}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          ${(service.base_price ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreService(service.id, service.name)}
                        disabled={loadingAction === service.id}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-50 transition cursor-pointer"
                      >
                        {loadingAction === service.id
                          ? (isEs ? 'Restaurando...' : 'Restoring...')
                          : (isEs ? 'Restaurar' : 'Restore')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
