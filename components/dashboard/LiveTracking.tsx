'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation, Radio, Truck } from 'lucide-react';
import LiveGpsMap from '@/components/maps/LiveGpsMap';

type Vehicle = {
  id: string;
  name: string;
  driver: string;
  status: 'moving' | 'idle' | 'alert' | 'offline';
  speed: number;
  destination: string;
  lat: number;
  lng: number;
};

interface LiveTrackingProps {
  locale?: string;
}

export default function LiveTracking({ locale = 'en' }: LiveTrackingProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isEs = locale.toLowerCase().startsWith('es');

  const fetchLiveLocations = async () => {
    try {
      const res = await fetch('/api/telematics/location');
      if (res.ok) {
        const data = await res.json();
        if (data.vehicles && Array.isArray(data.vehicles)) {
          setVehicles(data.vehicles);
        }
      }
    } catch (err) {
      console.error('[LiveTracking] Failed to fetch live locations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLocations();
    const interval = setInterval(fetchLiveLocations, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEs ? 'Telemetría y Rastreo GPS en Vivo' : 'Live Fleet Telematics & GPS Stream'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEs
              ? 'Rastreo GPS en tiempo real, verificación de geocercas y flujo de telemetría de vehículos.'
              : 'Real-time GPS tracking, geofence site verification, and vehicle telemetry stream.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs">
            <Radio size={14} className="text-emerald-600 animate-pulse" />
            {isEs ? 'Flujo de Telemetría Activo' : 'Live Telematics Stream'}
          </span>
          <Link
            href={`/${locale}/dashboard/routing`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
          >
            {isEs ? 'Rutas de Despacho' : 'Dispatch Routing'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Vehicles Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {isEs ? 'Vehículos Activos' : 'Active Vehicles'} ({vehicles.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
              {isEs ? 'No se encontraron vehículos activos.' : 'No active vehicle telemetry found.'}
            </div>
          ) : (
            vehicles.map((vehicle) => {
              const isSelected = selectedVehicleId === vehicle.id;
              return (
                <div
                  key={vehicle.id}
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                  className={`cursor-pointer space-y-2 rounded-xl border p-4 transition shadow-2xs ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Truck size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{vehicle.name}</span>
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        vehicle.status === 'moving'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : vehicle.status === 'alert'
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : vehicle.status === 'offline'
                          ? 'border-slate-200 bg-slate-100 text-slate-500'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {vehicle.status === 'moving'
                        ? (isEs ? 'En movimiento' : 'Moving')
                        : vehicle.status === 'alert'
                        ? (isEs ? 'Alerta' : 'Alert')
                        : vehicle.status === 'offline'
                        ? (isEs ? 'Fuera de turno' : 'Off Duty')
                        : (isEs ? 'En espera' : 'Idle')}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>
                      {isEs ? 'Conductor' : 'Driver'}: <strong className="text-slate-800">{vehicle.driver}</strong>
                    </span>
                    <span>
                      {isEs ? 'Velocidad' : 'Speed'}: <strong className="text-slate-800">{vehicle.speed} mph</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                    <Navigation size={12} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{vehicle.destination}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live GPS Map */}
        <div className="lg:col-span-2">
          <LiveGpsMap vehicles={vehicles} />
        </div>
      </div>
    </div>
  );
}
