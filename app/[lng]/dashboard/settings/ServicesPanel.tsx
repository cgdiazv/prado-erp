'use client';

import { useState, type FormEvent } from 'react';
import { createService, deleteService } from './actions';
import { getTranslations } from '@/lib/translations';

type Service = {
  id: string;
  name: string;
  base_price: number | null;
};

interface ServicesPanelProps {
  initialServices: Service[];
  locale?: string;
}

export default function ServicesPanel({ initialServices, locale = 'en' }: ServicesPanelProps) {
  const translations = getTranslations(locale);
  const [services, setServices] = useState(initialServices);
  const [draftName, setDraftName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    setStatusMessage('');

    const response = await createService(normalizedValue);

    setLoading(false);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.service) {
      setServices((currentServices) => [...currentServices, response.service]);
      setDraftName('');
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

    setServices((currentServices) => currentServices.filter((service) => service.id !== serviceId));
    setStatusMessage(`Removed "${serviceName}".`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.servicesSection}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.servicesDescription}</p>
      </div>

      <form onSubmit={handleAddService} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={translations.dashboard.addNewService}
          className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? translations.dashboard.savingLoading : translations.dashboard.addService}
        </button>
      </form>

      {statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}

      <div className="flex flex-wrap gap-2">
        {services.map((service) => (
          <div
            key={service.id}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
          >
            <span>{service.name}</span>
            <button
              type="button"
              onClick={() => handleDeleteService(service.id, service.name)}
              disabled={loading}
              className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:text-gray-400"
              aria-label={`Delete ${service.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
