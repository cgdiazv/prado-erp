'use client';

import { useState, type FormEvent } from 'react';
import { createTruck, deactivateTruck } from './actions';
import { getTranslations } from '@/lib/translations';

type Truck = {
  id: string;
  name: string;
  plate_number: string | null;
  is_active: boolean | null;
  status: string | null;
};

interface TrucksPanelProps {
  initialTrucks: Truck[];
  locale?: string;
}

export default function TrucksPanel({ initialTrucks, locale = 'en' }: TrucksPanelProps) {
  const translations = getTranslations(locale);
  const [trucks, setTrucks] = useState(initialTrucks);
  const [draftName, setDraftName] = useState('');
  const [draftPlateNumber, setDraftPlateNumber] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddTruck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = draftName.trim().replace(/\s+/g, ' ');
    const normalizedPlate = draftPlateNumber.trim().replace(/\s+/g, ' ');

    if (!normalizedName) {
      setStatusMessage('Enter a truck name first.');
      return;
    }

    setLoading(true);
    setStatusMessage('');

    const response = await createTruck(normalizedName, normalizedPlate || null);

    setLoading(false);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.truck) {
      setTrucks((currentTrucks) => [response.truck, ...currentTrucks]);
      setDraftName('');
      setDraftPlateNumber('');
      setStatusMessage(`Added "${normalizedName}".`);
    }
  };

  const handleDeactivateTruck = async (truckId: string, truckName: string) => {
    setLoading(true);
    setStatusMessage('');

    const response = await deactivateTruck(truckId);

    setLoading(false);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    setTrucks((currentTrucks) => currentTrucks.filter((truck) => truck.id !== truckId));
    setStatusMessage(`Deactivated "${truckName}".`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.trucksSection}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.trucksDescription}</p>
      </div>

      <form onSubmit={handleAddTruck} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={translations.dashboard.truckName}
          className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
        />
        <input
          type="text"
          value={draftPlateNumber}
          onChange={(event) => setDraftPlateNumber(event.target.value)}
          placeholder={translations.dashboard.plateNumber}
          className="sm:w-48 rounded-lg border border-gray-300 p-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? translations.dashboard.savingLoading : translations.dashboard.addTruck}
        </button>
      </form>

      {statusMessage ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}

      <div className="flex flex-wrap gap-2">
        {trucks.map((truck) => (
          <div
            key={truck.id}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
          >
            <span>{truck.name}{truck.plate_number ? ` • ${truck.plate_number}` : ''}</span>
            <button
              type="button"
              onClick={() => handleDeactivateTruck(truck.id, truck.name)}
              disabled={loading}
              className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:text-gray-400"
              aria-label={`Deactivate ${truck.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
