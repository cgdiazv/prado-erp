'use client';

import { useState, type FormEvent } from 'react';
import { createService, deleteService } from './actions';
import { getTranslations } from '@/lib/translations';

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
  const [services, setServices] = useState(initialServices);
  const [editingCreate, setEditingCreate] = useState(false);
  const [editingManage, setEditingManage] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(initialServices[0]?.id || '');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftBasePrice, setDraftBasePrice] = useState('0.00');
  const [draftIsRecurring, setDraftIsRecurring] = useState(false);
  const [draftRecurrenceIntervalDays, setDraftRecurrenceIntervalDays] = useState('30');
  const [draftAutoChargeDefault, setDraftAutoChargeDefault] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedService = services.find((service) => service.id === selectedServiceId) || null;

  const handleAddService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedValue = draftName.trim().replace(/\s+/g, ' ');
    if (!normalizedValue) {
      setStatusMessage('Enter a service name first.');
      return;
    }

    const isDuplicate = services.some(
      (service) => service.name.toLowerCase() === normalizedValue.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage('That service already exists.');
      return;
    }

    const parsedBasePrice = Number.parseFloat(draftBasePrice);
    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setStatusMessage(isEs ? 'Ingresa un precio base valido.' : 'Enter a valid base price.');
      return;
    }

    setLoading(true);
    setStatusMessage('');

    const response = await createService({
      name: normalizedValue,
      description: draftDescription.trim(),
      basePrice: parsedBasePrice,
      isRecurringDefault: draftIsRecurring,
      recurrenceIntervalDays: draftIsRecurring ? Number.parseInt(draftRecurrenceIntervalDays || '0', 10) : null,
      autoChargeDefault: draftIsRecurring ? draftAutoChargeDefault : false,
    });

    setLoading(false);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.service) {
      setServices((currentServices) => [...currentServices, response.service]);
      setSelectedServiceId(response.service.id);
      setDraftName('');
      setDraftDescription('');
      setDraftBasePrice('0.00');
      setDraftIsRecurring(false);
      setDraftRecurrenceIntervalDays('30');
      setDraftAutoChargeDefault(false);
      setStatusMessage(`Added "${normalizedValue}".`);
    }
  };

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    setLoading(true);
    setStatusMessage('');

    const response = await deleteService(serviceId);

    setLoading(false);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    const nextServices = services.filter((service) => service.id !== serviceId);
    setServices(nextServices);
    setSelectedServiceId((currentSelected) => {
      if (currentSelected !== serviceId) {
        return currentSelected;
      }

      return nextServices[0]?.id || '';
    });
    setStatusMessage(isEs ? `Servicio archivado: "${serviceName}".` : `Archived "${serviceName}".`);
  };

  const toggleCreateSection = () => {
    setStatusMessage('');
    setEditingCreate((current) => !current);
  };

  const toggleManageSection = () => {
    setStatusMessage('');
    setEditingManage((current) => !current);
  };

  const handleArchiveSelectedService = () => {
    if (!selectedService) return;
    void handleDeleteService(selectedService.id, selectedService.name);
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.servicesSection}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.servicesDescription}</p>
      </div>

      {statusMessage ? <p className="px-6 md:px-8 text-xs text-slate-500">{statusMessage}</p> : null}

      <div className="border-y border-slate-200">
        <div className="divide-y divide-slate-200">
          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{isEs ? 'Agregar servicio' : 'Add service'}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{isEs ? 'Crea un nuevo servicio para tu operacion.' : 'Create a new service for your operation.'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleCreateSection}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {editingCreate ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                </button>
                {editingCreate ? (
                  <button
                    type="submit"
                    form="services-create-form"
                    disabled={loading}
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                  >
                    {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Agregar nuevo' : 'Add New')}
                  </button>
                ) : null}
              </div>
            </div>
            <form id="services-create-form" onSubmit={handleAddService} className={editingCreate ? 'mt-3 space-y-3' : 'hidden'}>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isEs ? 'Nombre del servicio' : 'Service name'}
                  </label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder={translations.dashboard.addNewService}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
                  />
                </div>
                <div className="w-full sm:w-48 space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isEs ? 'Precio base' : 'Base price'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draftBasePrice}
                    onChange={(event) => setDraftBasePrice(event.target.value)}
                    placeholder={isEs ? 'Precio base' : 'Base price'}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Descripcion' : 'Description'}
                </label>
                <textarea
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  placeholder={isEs ? 'Descripcion del servicio' : 'Service description'}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none resize-y"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={draftIsRecurring}
                    onChange={(event) => setDraftIsRecurring(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  {isEs ? 'Servicio recurrente por defecto' : 'Recurring service by default'}
                </label>

                {draftIsRecurring ? (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {isEs ? 'Frecuencia (dias)' : 'Frequency (days)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draftRecurrenceIntervalDays}
                        onChange={(event) => setDraftRecurrenceIntervalDays(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={draftAutoChargeDefault}
                        onChange={(event) => setDraftAutoChargeDefault(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                      />
                      {isEs ? 'Intentar auto cobro despues del primer pago en linea' : 'Try auto-charge after first online payment'}
                    </label>
                  </>
                ) : null}
              </div>
            </form>
          </div>

          <div className="px-6 md:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{isEs ? 'Servicios guardados' : 'Saved services'}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {selectedService?.name || (isEs ? 'No hay servicios guardados' : 'No saved services')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleManageSection}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {editingManage ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                </button>
                {editingManage ? (
                  <button
                    type="button"
                    onClick={handleArchiveSelectedService}
                    disabled={loading || !selectedService}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:text-red-300"
                  >
                    {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Archivar' : 'Archive')}
                  </button>
                ) : null}
              </div>
            </div>

            <div className={editingManage ? 'mt-3 space-y-3' : 'hidden'}>
              <div className="flex-1 space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Servicios guardados' : 'Saved services'}
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  disabled={services.length === 0}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {services.length === 0 ? (
                    <option value="">{isEs ? 'No hay servicios guardados' : 'No saved services'}</option>
                  ) : (
                    services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedService ? (
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <span className="font-semibold text-slate-900">{selectedService.name}</span>
                    <span className="text-xs font-semibold text-emerald-700">
                      ${(selectedService.base_price ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedService.description || (isEs ? 'Sin descripcion.' : 'No description.')}
                  </p>
                  {selectedService.is_recurring_default ? (
                    <p className="text-xs text-slate-500">
                      {isEs ? 'Recurrente cada' : 'Recurring every'} {selectedService.recurrence_interval_days || 0} {isEs ? 'dias' : 'days'}
                      {selectedService.auto_charge_default ? ` • ${isEs ? 'Auto cobro activado por defecto' : 'Auto-charge default enabled'}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">{isEs ? 'Servicio no recurrente por defecto.' : 'Non-recurring by default.'}</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
