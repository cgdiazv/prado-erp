'use client';

import { useState, type FormEvent } from 'react';
import { createTruck, deactivateTruck, reactivateTruck, updateTruck } from './actions';
import { getTranslations } from '@/lib/translations';
import { Plus, X, Pencil, Archive, Check, RotateCcw, Loader2 } from 'lucide-react';

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
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlateNumber, setEditPlateNumber] = useState('');

  const activeTrucks = trucks.filter((truck) => truck.is_active !== false);
  const archivedTrucks = trucks.filter((truck) => truck.is_active === false);

  const startEditing = (truck: TruckItem) => {
    setEditingTruckId(truck.id);
    setEditName(truck.name);
    setEditPlateNumber(truck.plate_number || '');
    setStatusMessage('');
  };

  const cancelEditing = () => {
    setEditingTruckId(null);
    setEditName('');
    setEditPlateNumber('');
  };

  const handleUpdateTruck = async (truckId: string) => {
    const normalizedName = editName.trim().replace(/\s+/g, ' ');
    const normalizedPlate = editPlateNumber.trim().replace(/\s+/g, ' ');

    if (!normalizedName) {
      setStatusMessage(isEs ? 'Ingresa el nombre del vehículo.' : 'Enter a vehicle name first.');
      return;
    }

    const isDuplicate = activeTrucks.some(
      (truck) =>
        truck.id !== truckId &&
        truck.name.toLowerCase() === normalizedName.toLowerCase() &&
        (truck.plate_number || '').toLowerCase() === normalizedPlate.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage(
        isEs
          ? 'Otro vehículo activo ya tiene ese nombre y placa.'
          : 'Another active vehicle already has that name and plate.'
      );
      return;
    }

    setLoadingAction(`update_${truckId}`);
    setStatusMessage('');

    const response = await updateTruck(truckId, normalizedName, normalizedPlate || null);

    setLoadingAction(null);

    if (response?.error) {
      setStatusMessage(response.error);
      return;
    }

    if (response?.truck) {
      setTrucks((currentTrucks) =>
        currentTrucks.map((t) => (t.id === truckId ? response.truck : t))
      );
      cancelEditing();
      setStatusMessage(
        isEs
          ? `Vehículo "${normalizedName}" actualizado con éxito.`
          : `Updated "${normalizedName}" successfully.`
      );
    }
  };

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
            {translations.dashboard.trucksDescription ||
              (isEs
                ? 'Crea y administra los vehículos de tu flota.'
                : 'Create and manage fleet vehicles for your dispatch operations.')}
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
              placeholder={translations.dashboard.truckName || (isEs ? 'Nombre del vehículo (ej. Van #1)' : 'Vehicle name (e.g. Van #1)')}
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

      {/* Vehicles Table */}
      <div className="border-t border-slate-200">
        {activeTrucks.length === 0 ? (
          <div className="px-6 md:px-8 py-8 text-center">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500">
                    {isEs ? 'Descripción' : 'Description'}
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {isEs ? 'Número de placa' : 'Plate number'}
                  </th>
                  <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">
                    {isEs ? 'Acciones' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {activeTrucks.map((truck) => {
                  const isEditingThis = editingTruckId === truck.id;
                  const isUpdating = loadingAction === `update_${truck.id}`;

                  if (isEditingThis) {
                    return (
                      <tr key={truck.id} className="bg-emerald-50/30">
                        <td className="px-6 md:px-8 py-4 min-w-[220px]">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder={translations.dashboard.truckName || (isEs ? 'Nombre del vehículo' : 'Vehicle name')}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleUpdateTruck(truck.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="w-full max-w-md rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editPlateNumber}
                            onChange={(e) => setEditPlateNumber(e.target.value)}
                            placeholder={translations.dashboard.plateNumber || (isEs ? 'Número de placa' : 'Plate number')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleUpdateTruck(truck.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="w-40 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </td>

                        <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={isUpdating}
                              title={isEs ? 'Cancelar' : 'Cancel'}
                              aria-label={isEs ? 'Cancelar' : 'Cancel'}
                              className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateTruck(truck.id)}
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
                    <tr key={truck.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 md:px-8 py-4">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900">
                          {truck.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isEs
                            ? 'Disponible para programación y rutas'
                            : 'Available for scheduling and routing'}
                        </p>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {truck.plate_number ? (
                          <button
                            type="button"
                            onClick={() => startEditing(truck)}
                            title={isEs ? 'Haz clic para editar' : 'Click to edit'}
                            className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200 font-medium transition cursor-pointer"
                          >
                            {truck.plate_number}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(truck)}
                            className="text-xs text-slate-400 hover:text-slate-600 italic cursor-pointer"
                          >
                            {isEs ? 'Sin placa' : 'No plate'}
                          </button>
                        )}
                      </td>

                      <td className="px-6 md:px-8 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(truck)}
                            title={isEs ? 'Editar vehículo' : 'Edit vehicle'}
                            aria-label={isEs ? 'Editar vehículo' : 'Edit vehicle'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition duration-150 cursor-pointer border border-transparent hover:border-emerald-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivateTruck(truck.id, truck.name)}
                            disabled={loadingAction === truck.id}
                            title={isEs ? 'Archivar vehículo' : 'Archive vehicle'}
                            aria-label={isEs ? 'Archivar vehículo' : 'Archive vehicle'}
                            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition duration-150 cursor-pointer border border-transparent hover:border-red-100 disabled:opacity-50"
                          >
                            {loadingAction === truck.id ? (
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

        {/* Archived Vehicles Section (if any) */}
        {archivedTrucks.length > 0 && (
          <div className="px-6 md:px-8 py-4 border-t border-slate-100">
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
                    <button
                      type="button"
                      onClick={() => handleReactivateTruck(truck.id, truck.name)}
                      disabled={loadingAction === truck.id}
                      title={isEs ? 'Restaurar vehículo' : 'Restore vehicle'}
                      aria-label={isEs ? 'Restaurar vehículo' : 'Restore vehicle'}
                      className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {loadingAction === truck.id ? (
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
