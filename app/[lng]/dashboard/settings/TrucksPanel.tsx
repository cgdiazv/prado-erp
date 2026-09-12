'use client';

import { useState, type FormEvent } from 'react';
import { createTruck, deactivateTruck, reactivateTruck } from './actions';
import { getTranslations } from '@/lib/translations';
import { Truck, Plus, X } from 'lucide-react';

type TruckItem = {
  id: string;
  name: string;
  plate_number: string | null;
  is_active: boolean | null;
  status: string | null;
};

interface TrucksPanelProps {
  initialTrucks: TruckItem[];
  locale?: string;
}

export default function TrucksPanel({ initialTrucks, locale = 'en' }: TrucksPanelProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [trucks, setTrucks] = useState<TruckItem[]>(initialTrucks);
  const [editingCreate, setEditingCreate] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPlateNumber, setDraftPlateNumber] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeTrucks = trucks.filter((truck) => truck.is_active !== false);
  const archivedTrucks = trucks.filter((truck) => truck.is_active === false);

  const handleAddTruck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = draftName.trim().replace(/\s+/g, ' ');
    const normalizedPlate = draftPlateNumber.trim().replace(/\s+/g, ' ');

    if (!normalizedName) {
      setStatusMessage(isEs ? 'Ingresa el nombre del vehículo.' : 'Enter a vehicle name first.');
      return;
    }

    const isDuplicate = activeTrucks.some(
      (truck) =>
        truck.name.toLowerCase() === normalizedName.toLowerCase() &&
        (truck.plate_number || '').toLowerCase() === normalizedPlate.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage(isEs ? 'Ese vehículo ya existe.' : 'That vehicle already exists.');
      return;
    }

    setLoadingAction('create');
    setStatusMessage('');

    const response = await createTruck(normalizedName, normalizedPlate || null);

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.truck) {
      setTrucks((currentTrucks) => {
        const filtered = currentTrucks.filter((t) => t.id !== response.truck.id);
        return [response.truck, ...filtered];
      });
      setDraftName('');
      setDraftPlateNumber('');
      setEditingCreate(false);
      setStatusMessage(isEs ? `Vehículo "${normalizedName}" agregado con éxito.` : `Added "${normalizedName}" successfully.`);
    }
  };

  const handleDeactivateTruck = async (truckId: string, truckName: string) => {
    setLoadingAction(truckId);
    setStatusMessage('');

    const response = await deactivateTruck(truckId);

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    setTrucks((currentTrucks) =>
      currentTrucks.map((truck) =>
        truck.id === truckId ? { ...truck, is_active: false, status: 'inactive' } : truck
      )
    );
    setStatusMessage(isEs ? `Vehículo archivado: "${truckName}".` : `Archived "${truckName}".`);
  };

  const handleReactivateTruck = async (truckId: string, truckName: string) => {
    setLoadingAction(truckId);
    setStatusMessage('');

    const response = await reactivateTruck(truckId);

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    setTrucks((currentTrucks) =>
      currentTrucks.map((truck) =>
        truck.id === truckId ? { ...truck, is_active: true, status: 'active' } : truck
      )
    );
    setStatusMessage(isEs ? `Vehículo reactivado: "${truckName}".` : `Restored "${truckName}".`);
  };

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            {translations.dashboard.trucksSection || (isEs ? 'Vehículos' : 'Vehicles')}
          </h3>
          <p className="text-xs text-slate-400">
            {translations.dashboard.trucksDescription || (isEs ? 'Crea y administra los vehículos de tu flota.' : 'Create and manage fleet vehicles for your dispatch operations.')}
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
              <span>{isEs ? 'Agregar vehículo' : 'Add Vehicle'}</span>
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
            {isEs ? 'Nuevo Vehículo' : 'New Vehicle'}
          </p>
          <form onSubmit={handleAddTruck} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={translations.dashboard.truckName || (isEs ? 'Nombre del vehículo (ej. Camión 1)' : 'Vehicle name (e.g. Van #1)')}
              className="flex-1 rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
            <input
              type="text"
              value={draftPlateNumber}
              onChange={(event) => setDraftPlateNumber(event.target.value)}
              placeholder={translations.dashboard.plateNumber || (isEs ? 'Número de placa' : 'Plate number')}
              className="sm:w-48 rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loadingAction === 'create'}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:bg-emerald-400 cursor-pointer shrink-0"
            >
              {loadingAction === 'create' ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar vehículo' : 'Save Vehicle')}
            </button>
          </form>
        </div>
      )}

      {/* Complete List of Saved Vehicles */}
      <div className="border-t border-slate-200 px-6 md:px-8 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? 'Vehículos guardados' : 'Saved Vehicles'}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {activeTrucks.length}
            </span>
          </div>
        </div>

        {activeTrucks.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Truck className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {isEs ? 'No hay vehículos guardados' : 'No saved vehicles'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isEs
                ? 'Agrega un vehículo arriba para asignarlo a trabajos y rutas.'
                : 'Add a vehicle above to assign it to jobs and routing.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            {activeTrucks.map((truck) => (
              <div
                key={truck.id}
                className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {truck.name}
                      </span>
                      {truck.plate_number ? (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          {truck.plate_number}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {isEs ? 'Sin placa' : 'No plate'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isEs
                        ? 'Disponible para programación y rutas'
                        : 'Available for scheduling and routing'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {isEs ? 'Activo' : 'Active'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeactivateTruck(truck.id, truck.name)}
                    disabled={loadingAction === truck.id}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                  >
                    {loadingAction === truck.id
                      ? (isEs ? 'Archivando...' : 'Archiving...')
                      : (isEs ? 'Archivar' : 'Archive')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archived Vehicles Section (if any) */}
        {archivedTrucks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>
                {isEs ? 'Vehículos archivados' : 'Archived vehicles'} ({archivedTrucks.length})
              </span>
              <span className="text-[10px] text-slate-400">{showArchived ? '▲' : '▼'}</span>
            </button>

            {showArchived && (
              <div className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                {archivedTrucks.map((truck) => (
                  <div
                    key={truck.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 opacity-75"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-200/60 flex items-center justify-center text-slate-400 shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {truck.name}
                        </span>
                        {truck.plate_number ? (
                          <span className="ml-2 font-mono text-xs text-slate-500">
                            {truck.plate_number}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReactivateTruck(truck.id, truck.name)}
                      disabled={loadingAction === truck.id}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {loadingAction === truck.id
                        ? (isEs ? 'Restaurando...' : 'Restoring...')
                        : (isEs ? 'Restaurar' : 'Restore')}
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
