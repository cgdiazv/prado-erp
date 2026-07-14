'use client';

import { useState, type FormEvent } from 'react';
import { createService, deleteService } from './actions';
import { getTranslations } from '@/lib/translations';

type Service = {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
};

interface ServicesPanelProps {
  initialServices: Service[];
  locale?: string;
}

export default function ServicesPanel({ initialServices, locale = 'en' }: ServicesPanelProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [services, setServices] = useState(initialServices);
  const [selectedServiceId, setSelectedServiceId] = useState(initialServices[0]?.id || '');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftBasePrice, setDraftBasePrice] = useState('0.00');
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

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.servicesSection}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.servicesDescription}</p>
      </div>

      <form onSubmit={handleAddService} className="space-y-3">
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
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed sm:self-start"
          >
            {loading ? translations.dashboard.savingLoading : translations.dashboard.addService}
          </button>
        </div>
      </form>

      {statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}

      <div className="space-y-3 rounded-xl border border-gray-200 bg-slate-50 p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
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
          <button
            type="button"
            onClick={() => selectedService && handleDeleteService(selectedService.id, selectedService.name)}
            disabled={loading || !selectedService}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            {isEs ? 'Archivar servicio' : 'Archive service'}
          </button>
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
