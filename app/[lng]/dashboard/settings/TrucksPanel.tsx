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
  const isEs = locale.toLowerCase().startsWith('es');
  const [trucks, setTrucks] = useState(initialTrucks);
  const [selectedTruckId, setSelectedTruckId] = useState(initialTrucks[0]?.id || '');
  const [draftName, setDraftName] = useState('');
  const [draftPlateNumber, setDraftPlateNumber] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedTruck = trucks.find((truck) => truck.id === selectedTruckId) || null;

  const handleAddTruck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = draftName.trim().replace(/\s+/g, ' ');
    const normalizedPlate = draftPlateNumber.trim().replace(/\s+/g, ' ');

    if (!normalizedName) {
      setStatusMessage('Enter a truck name first.');
      return;
    }

    const isDuplicate = trucks.some(
      (truck) =>
        truck.name.toLowerCase() === normalizedName.toLowerCase() &&
        (truck.plate_number || '').toLowerCase() === normalizedPlate.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage(isEs ? 'Ese camion ya existe.' : 'That truck already exists.');
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
      setSelectedTruckId(response.truck.id);
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

    const nextTrucks = trucks.filter((truck) => truck.id !== truckId);
    setTrucks(nextTrucks);
    setSelectedTruckId((currentSelected) => {
      if (currentSelected !== truckId) {
        return currentSelected;
      }

      return nextTrucks[0]?.id || '';
    });
    setStatusMessage(isEs ? `Camion archivado: "${truckName}".` : `Archived "${truckName}".`);
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

      <div className="space-y-3 rounded-xl border border-gray-200 bg-slate-50 p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isEs ? 'Camiones guardados' : 'Saved trucks'}
            </label>
            <select
              value={selectedTruckId}
              onChange={(event) => setSelectedTruckId(event.target.value)}
              disabled={trucks.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none disabled:bg-gray-100 disabled:text-gray-400"
            >
              {trucks.length === 0 ? (
                <option value="">{isEs ? 'No hay camiones guardados' : 'No saved trucks'}</option>
              ) : (
                trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.name}{truck.plate_number ? ` • ${truck.plate_number}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => selectedTruck && handleDeactivateTruck(selectedTruck.id, selectedTruck.name)}
            disabled={loading || !selectedTruck}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            {isEs ? 'Archivar camion' : 'Archive truck'}
          </button>
        </div>

        {selectedTruck ? (
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <span className="font-semibold text-slate-900">{selectedTruck.name}</span>
              {selectedTruck.plate_number ? (
                <span className="text-xs font-semibold text-slate-500">{selectedTruck.plate_number}</span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">
              {selectedTruck.status === 'active'
                ? isEs
                  ? 'Disponible para programacion y rutas.'
                  : 'Available for scheduling and routing.'
                : isEs
                  ? 'Camion archivado.'
                  : 'Truck archived.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
