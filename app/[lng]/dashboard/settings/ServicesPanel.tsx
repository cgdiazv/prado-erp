'use client';

import { useState, type FormEvent } from 'react';
import { createService, deleteService, restoreService } from './actions';
import { getTranslations } from '@/lib/translations';
import { Wrench, Plus, X } from 'lucide-react';

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
}

export default function ServicesPanel({ initialServices, locale = 'en' }: ServicesPanelProps) {
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
  const [statusMessage, setStatusMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeServices = services.filter((s) => !s.name.startsWith(ARCHIVED_SERVICE_PREFIX));
  const archivedServices = services.filter((s) => s.name.startsWith(ARCHIVED_SERVICE_PREFIX));

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
            {translations.dashboard.servicesDescription || (isEs ? 'Agrega o administra tipos de servicio para tus trabajos.' : 'Add or manage service types for your jobs.')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatusMessage('');
            setEditingCreate((current) => !current);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer self-start sm:self-auto"
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
          <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Wrench className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {isEs ? 'No hay servicios guardados' : 'No saved services'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isEs
                ? 'Agrega un servicio arriba para asignarlo a cotizaciones y trabajos.'
                : 'Add a service above to assign it to quotes and jobs.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            {activeServices.map((service) => (
              <div
                key={service.id}
                className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {service.name}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                        ${(service.base_price ?? 0).toFixed(2)}
                      </span>
                      {service.is_recurring_default ? (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {isEs ? 'Cada' : 'Every'} {service.recurrence_interval_days || 30} {isEs ? 'días' : 'days'}
                          {service.auto_charge_default ? ` • ${isEs ? 'Auto-cobro' : 'Auto-charge'}` : ''}
                        </span>
                      ) : null}
                    </div>
                    {service.description ? (
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xl">
                        {service.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5 italic">
                        {isEs ? 'Sin descripción' : 'No description'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {isEs ? 'Activo' : 'Active'}
                  </span>
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
            ))}
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
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-200/60 flex items-center justify-center text-slate-400 shrink-0">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-700 truncate">
                            {cleanName}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            ${(service.base_price ?? 0).toFixed(2)}
                          </span>
                        </div>
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
