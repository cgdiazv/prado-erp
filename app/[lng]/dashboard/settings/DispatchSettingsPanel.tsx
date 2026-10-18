'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { updateDispatchSettings } from './actions';
import { getTranslations } from '@/lib/translations';

interface DispatchSettingsPanelProps {
  initialMaxJobsPerTruck?: number | null;
  initialAutoOptimizeDriveRoutes?: boolean | null;
  locale?: string;
}

export default function DispatchSettingsPanel({
  initialMaxJobsPerTruck = 4,
  initialAutoOptimizeDriveRoutes = true,
  locale = 'en',
}: DispatchSettingsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const translations = getTranslations(locale);

  const [maxJobsPerTruck, setMaxJobsPerTruck] = useState<number | string>(
    initialMaxJobsPerTruck ?? 4
  );
  const [autoOptimize, setAutoOptimize] = useState<boolean>(
    initialAutoOptimizeDriveRoutes ?? true
  );
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMaxJobsPerTruck(initialMaxJobsPerTruck ?? 4);
    setAutoOptimize(initialAutoOptimizeDriveRoutes ?? true);
  }, [initialMaxJobsPerTruck, initialAutoOptimizeDriveRoutes]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const parsedStops =
      typeof maxJobsPerTruck === 'string'
        ? Number.parseInt(maxJobsPerTruck, 10)
        : maxJobsPerTruck;

    if (!Number.isFinite(parsedStops) || parsedStops < 1 || parsedStops > 100) {
      setLoading(false);
      setErrorMessage(
        isEs
          ? 'El número máximo de paradas debe estar entre 1 y 100.'
          : 'Max stops must be a number between 1 and 100.'
      );
      return;
    }

    const formData = new FormData();
    formData.set('locale', locale);
    formData.set('maxJobsPerTruck', String(parsedStops));
    if (autoOptimize) {
      formData.append('autoOptimizeDriveRoutes', 'true');
    } else {
      formData.append('autoOptimizeDriveRoutes', 'false');
    }

    try {
      const response = await updateDispatchSettings(formData);
      setLoading(false);

      if (response?.error) {
        setErrorMessage(response.error);
        return;
      }

      if (typeof response?.maxJobsPerTruck === 'number') {
        setMaxJobsPerTruck(response.maxJobsPerTruck);
      }
      if (typeof response?.autoOptimizeDriveRoutes === 'boolean') {
        setAutoOptimize(response.autoOptimizeDriveRoutes);
      }

      setStatusMessage(
        isEs
          ? 'Se guardó la opción de máximo de paradas correctamente.'
          : 'Max stops option saved successfully.'
      );
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(
        err?.message ||
          (isEs
            ? 'Error al guardar la configuración de despacho.'
            : 'Failed to update dispatch settings.')
      );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
          {translations.dashboard.dispatchSettings}
        </h3>
        <p className="text-xs text-slate-400">
          {translations.dashboard.dispatchSettingsDescription}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            id="optimize-paths"
            type="checkbox"
            name="autoOptimizeDriveRoutes"
            checked={autoOptimize}
            onChange={(e) => {
              setAutoOptimize(e.target.checked);
              setStatusMessage(null);
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <div>
            <label
              htmlFor="optimize-paths"
              className="text-sm font-semibold text-slate-800 block cursor-pointer"
            >
              {translations.dashboard.autoOptimizeDriveRoutes}
            </label>
            <span className="text-xs text-slate-400">
              {translations.dashboard.autoOptimizeDescription}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="max-jobs-per-truck"
            className="block text-xs font-semibold text-gray-500 uppercase"
          >
            {translations.dashboard.routeMaxStops}
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              id="max-jobs-per-truck"
              type="number"
              name="maxJobsPerTruck"
              min={1}
              max={100}
              value={maxJobsPerTruck}
              onChange={(e) => {
                setMaxJobsPerTruck(e.target.value);
                setStatusMessage(null);
              }}
              className="w-full sm:w-32 rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {loading
                ? isEs
                  ? 'Guardando...'
                  : 'Saving...'
                : isEs
                ? 'Actualizar configuración'
                : 'Update Dispatch Settings'}
            </button>
          </div>

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <p className="text-xs text-slate-400">
            {isEs
              ? 'Define el umbral de sobrecarga para alertas y planificación de rutas por vehículo.'
              : 'Defines the overload threshold for route planning and vehicle capacity alerts.'}
          </p>
        </div>
      </form>
    </div>
  );
}
