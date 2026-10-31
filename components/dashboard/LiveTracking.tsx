'use client';

import React, { useEffect, useState } from 'react';
import { Navigation, Truck } from 'lucide-react';
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

type TrackingTabId = 'map' | 'active-vehicles';

interface LiveTrackingProps {
  locale?: string;
}

export default function LiveTracking({ locale = 'en' }: LiveTrackingProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TrackingTabId>('map');
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

  const tabs: { id: TrackingTabId; label: string }[] = [
    {
      id: 'map',
      label: isEs ? 'Mapa' : 'Map',
    },
    {
      id: 'active-vehicles',
      label: `${isEs ? 'Vehículos Activos' : 'Active Vehicles'} (${vehicles.length})`,
    },
  ];

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setActiveTab('map');
  };

  return (
    <div className="space-y-6">
      <div>
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
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={isEs ? 'Pestañas de rastreo en vivo' : 'Live tracking tabs'}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap pb-3 pt-1 px-1 text-sm transition-all border-b-[3px] cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Map */}
        <div
          id="tabpanel-map"
          role="tabpanel"
          aria-labelledby="tab-map"
          className={activeTab === 'map' ? 'block' : 'hidden'}
        >
          <LiveGpsMap vehicles={vehicles} selectedVehicleId={selectedVehicleId} />
        </div>

        {/* Tab 2: Active Vehicles */}
        <div
          id="tabpanel-active-vehicles"
          role="tabpanel"
          aria-labelledby="tab-active-vehicles"
          className={activeTab === 'active-vehicles' ? 'block' : 'hidden'}
        >
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
              {isEs ? 'No se encontraron vehículos activos.' : 'No active vehicle telemetry found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => {
                const isSelected = selectedVehicleId === vehicle.id;
                return (
                  <div
                    key={vehicle.id}
                    onClick={() => handleSelectVehicle(vehicle.id)}
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
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
