'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { updateJobStatusByDriver } from '@/app/actions';

interface CustomerSummary {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface JobProperty {
  street_address: string;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  latitude: number | null;
  longitude: number | null;
  customer_id?: string | null;
  customers?: CustomerSummary | null;
}

export interface ShiftJob {
  id: string;
  truck_id: string | null;
  route_order?: number | null;
  job_type: string;
  status: string;
  scheduled_date?: string | null;
  notes?: string | null;
  cost_amount?: number | null;
  properties?: JobProperty | null;
}

export interface ShiftTruck {
  id: string;
  name: string;
  plate_number: string | null;
  status?: string | null;
}

interface DriverShiftPortalProps {
  trucks: ShiftTruck[];
  jobs: ShiftJob[];
  userEmail?: string | null;
  userName?: string | null;
  locale?: string;
}

export default function DriverShiftPortal({
  trucks,
  jobs,
  userEmail,
  userName,
  locale = 'en',
}: DriverShiftPortalProps) {
  const isEs = locale.startsWith('es');

  // Active Vehicle Selection
  const [selectedTruckId, setSelectedTruckId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (userEmail) {
        const assignedTruck = localStorage.getItem(`prado_driver_vehicle_${userEmail}`);
        if (assignedTruck && trucks.some((t) => t.id === assignedTruck)) return assignedTruck;
      }
      const saved = localStorage.getItem('prado_driver_truck_id');
      if (saved && trucks.some((t) => t.id === saved)) return saved;
    }
    return trucks[0]?.id || '';
  });

  // Shift & Driver State
  const [isShiftActive, setIsShiftActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prado_driver_shift_active') === 'true';
    }
    return false;
  });

  const [driverName, setDriverName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prado_driver_name');
      if (saved) return saved;
    }
    return userName || userEmail || 'Driver 1';
  });

  const [shiftStartTime, setShiftStartTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prado_driver_shift_start') || null;
    }
    return null;
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isGpsStreaming, setIsGpsStreaming] = useState<boolean>(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state to local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prado_driver_truck_id', selectedTruckId);
      localStorage.setItem('prado_driver_shift_active', isShiftActive ? 'true' : 'false');
      localStorage.setItem('prado_driver_name', driverName);
      if (shiftStartTime) {
        localStorage.setItem('prado_driver_shift_start', shiftStartTime);
      } else {
        localStorage.removeItem('prado_driver_shift_start');
      }
    }
  }, [selectedTruckId, isShiftActive, driverName, shiftStartTime]);

  // Elapsed Shift Timer
  useEffect(() => {
    if (!isShiftActive || !shiftStartTime) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(shiftStartTime).getTime();
    const updateElapsed = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isShiftActive, shiftStartTime]);

  // Helper to format elapsed seconds
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filter jobs for selected vehicle
  const vehicleJobs = jobs.filter((j) => j.truck_id === selectedTruckId);
  const pendingJobs = vehicleJobs.filter((j) => j.status !== 'completed');
  const completedJobs = vehicleJobs.filter((j) => j.status === 'completed');

  const displayedJobs = vehicleJobs.filter((job) => {
    if (activeTab === 'pending') return job.status !== 'completed';
    if (activeTab === 'completed') return job.status === 'completed';
    return true;
  });

  // Selected vehicle object
  const currentTruck = trucks.find((t) => t.id === selectedTruckId);

  // Send telematics location ping to API
  const sendTelematicsPing = async (lat: number, lng: number, speed: number = 0) => {
    if (!selectedTruckId) return;

    try {
      const nextPending = pendingJobs[0];
      const destination = nextPending?.properties?.street_address
        ? `${nextPending.job_type} - ${nextPending.properties.street_address}`
        : isShiftActive
        ? 'On Duty - Route En Route'
        : 'Off Duty';

      const res = await fetch('/api/telematics/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedTruckId,
          driver: driverName,
          lat,
          lng,
          speed: Math.round(speed * 2.23694), // convert m/s to mph if from geolocation
          status: speed > 1 ? 'moving' : 'idle',
          destination,
        }),
      });

      if (res.ok) {
        setLastPingTime(new Date().toLocaleTimeString());
        setGpsError(null);
      }
    } catch (err) {
      console.error('Telematics ping error:', err);
    }
  };

  // Start Shift
  const handleStartShift = () => {
    const now = new Date().toISOString();
    setIsShiftActive(true);
    setShiftStartTime(now);
    setIsGpsStreaming(true);

    // Initial GPS ping if browser supports it
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, speed } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });
          sendTelematicsPing(latitude, longitude, speed || 0);
        },
        (err) => {
          console.warn('Geolocation initial query error:', err);
          setGpsError(isEs ? 'Permiso de ubicación denegado' : 'Location permission denied');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // End Shift
  const handleEndShift = async () => {
    setIsShiftActive(false);
    setShiftStartTime(null);
    setIsGpsStreaming(false);

    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Inform API that shift has ended
    if (selectedTruckId) {
      try {
        await fetch('/api/telematics/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleId: selectedTruckId,
            driver: driverName,
            action: 'stop_streaming',
          }),
        });
      } catch (err) {
        console.error('Failed to notify end shift:', err);
      }
    }
  };

  // Live GPS Streaming watcher
  useEffect(() => {
    if (!isShiftActive || !isGpsStreaming) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });
          sendTelematicsPing(latitude, longitude, speed || 0);
        },
        (err) => {
          console.warn('Geolocation stream error:', err);
          setGpsError(err.message);
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isShiftActive, isGpsStreaming, selectedTruckId, driverName]);

  // Handle status update for a job
  const handleJobStatusChange = async (jobId: string, newStatus: 'scheduled' | 'in_progress' | 'completed') => {
    setUpdatingJobId(jobId);
    try {
      const res = await updateJobStatusByDriver(jobId, newStatus);
      if (res?.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error('Job status update error:', err);
    } finally {
      setUpdatingJobId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEs ? 'Portal de Turnos de Chofer' : 'Driver Shift Portal'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isEs
              ? 'Control de turno, transmisión telemática en tiempo real y ejecución de paradas.'
              : 'Clock in, broadcast live telematics GPS, and complete assigned route jobs.'}
          </p>
        </div>

        {/* Shift Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/${locale}/dashboard/routing`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
          >
            {isEs ? 'Rutas de Despacho' : 'Dispatch Routing'}
          </Link>

          {isShiftActive ? (
            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-right flex items-center gap-2 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-800 font-mono">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleEndShift}
                className="px-3.5 py-1.5 rounded-lg font-semibold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition duration-150 cursor-pointer flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                {isEs ? 'Finalizar Turno' : 'End Shift'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartShift}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition duration-150 cursor-pointer flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isEs ? 'Iniciar Turno' : 'Start Shift'}
            </button>
          )}
        </div>
      </div>

      {/* Driver & Vehicle Setup Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vehicle Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {isEs ? 'Vehículo Asignado' : 'Assigned Vehicle'}
            </label>
            {userEmail && typeof window !== 'undefined' && localStorage.getItem(`prado_driver_vehicle_${userEmail}`) === selectedTruckId && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isEs ? 'Asignado hoy' : 'Assigned today'}
              </span>
            )}
          </div>
          <select
            value={selectedTruckId}
            onChange={(e) => setSelectedTruckId(e.target.value)}
            disabled={isShiftActive}
            className="w-full text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {trucks.length === 0 ? (
              <option value="">{isEs ? 'No hay vehículos registrados' : 'No vehicles configured'}</option>
            ) : (
              trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.name} {truck.plate_number ? `(${truck.plate_number})` : ''}
                </option>
              ))
            )}
          </select>
          {isShiftActive && (
            <p className="text-[11px] text-amber-600 mt-1">
              {isEs ? 'Finaliza el turno para cambiar de vehículo' : 'End shift to switch vehicle'}
            </p>
          )}
        </div>

        {/* Driver Name Input */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            {isEs ? 'Nombre del Operador' : 'Driver Name'}
          </label>
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="Driver Name"
            className="w-full text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
        </div>

        {/* Live GPS Telematics Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isEs ? 'Transmisión GPS' : 'Live GPS Broadcast'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                isGpsStreaming
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isGpsStreaming ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isGpsStreaming ? (isEs ? 'Activo' : 'Broadcasting') : (isEs ? 'Inactivo' : 'Standby')}
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {lastPingTime
                ? `${isEs ? 'Último ping:' : 'Last ping:'} ${lastPingTime}`
                : isEs ? 'Esperando inicio de turno' : 'Awaiting clock-in'}
            </span>
            {isShiftActive && (
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      sendTelematicsPing(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0);
                    });
                  }
                }}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
              >
                {isEs ? 'Enviar Ping' : 'Ping GPS'}
              </button>
            )}
          </div>
          {gpsError && <p className="text-[10px] text-rose-500 mt-1">{gpsError}</p>}
        </div>
      </div>

      {/* Route Stops Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.856 1.928a1.125 1.125 0 01-1.006 0L9.503 3.813a1.125 1.125 0 00-1.006 0L3.622 6.565c-.383.19-.622.58-.622 1.006v12.166c0 .836.88 1.38 1.628 1.006l3.856-1.928a1.125 1.125 0 011.006 0l3.856 1.928a1.125 1.125 0 001.006 0z" />
              </svg>
              {isEs ? 'Itinerario de Paradas del Vehículo' : 'Assigned Route Job Manifest'}
              {currentTruck && (
                <span className="text-xs font-medium text-slate-500 font-mono">
                  [{currentTruck.name}]
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEs
                ? `${vehicleJobs.length} trabajos asignados en este itinerario.`
                : `${vehicleJobs.length} total jobs scheduled for this vehicle.`}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEs ? 'Todos' : 'All'} ({vehicleJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEs ? 'Pendientes' : 'Pending'} ({pendingJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEs ? 'Completados' : 'Done'} ({completedJobs.length})
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="mt-4 space-y-3">
          {displayedJobs.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-400 mx-auto mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <h3 className="text-sm font-semibold text-slate-700">
                {isEs ? 'No hay trabajos en este listado' : 'No jobs found in this category'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isEs
                  ? 'Asigna trabajos a este vehículo desde el módulo de Enrutamiento de Despacho.'
                  : 'Assign jobs to this vehicle in the Dispatch Routing module.'}
              </p>
              <Link
                href={`/${locale}/dashboard/routing`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
              >
                {isEs ? 'Ir a Enrutamiento de Despacho' : 'Go to Dispatch Routing'}
              </Link>
            </div>
          ) : (
            displayedJobs.map((job, idx) => {
              const customer = job.properties?.customers;
              const customerName = customer?.company_name
                ? customer.company_name
                : customer?.first_name || customer?.last_name
                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                : isEs ? 'Cliente no especificado' : 'Customer Unassigned';

              const address = job.properties?.street_address
                ? `${job.properties.street_address}${job.properties.city ? `, ${job.properties.city}` : ''}${job.properties.state ? `, ${job.properties.state}` : ''}`
                : isEs ? 'Sin dirección registrada' : 'No address specified';

              const encodedAddress = encodeURIComponent(address);
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

              const isCompleted = job.status === 'completed';
              const isInProgress = job.status === 'in_progress';
              const isUpdating = updatingJobId === job.id;

              return (
                <div
                  key={job.id}
                  className={`border rounded-xl p-4 transition duration-150 ${
                    isCompleted
                      ? 'bg-slate-50/70 border-slate-200 opacity-80'
                      : isInProgress
                      ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Stop Sequence Indicator */}
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-slate-200 text-slate-700'
                            : isInProgress
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {job.route_order ? `#${job.route_order}` : `#${idx + 1}`}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{customerName}</h4>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {job.job_type}
                          </span>
                          {isInProgress && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                              {isEs ? 'En Progreso' : 'In Progress'}
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 uppercase tracking-wider">
                              {isEs ? 'Completado' : 'Completed'}
                            </span>
                          )}
                        </div>

                        {/* Address */}
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-slate-400 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span>{address}</span>
                        </p>

                        {/* Notes */}
                        {job.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            {job.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Phone call shortcut if available */}
                      {customer?.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          title={`Call ${customerName}`}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </a>
                      )}

                      {/* Google Maps Turn-by-Turn Button */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center gap-1.5 border border-slate-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.856 1.928a1.125 1.125 0 01-1.006 0L9.503 3.813a1.125 1.125 0 00-1.006 0L3.622 6.565c-.383.19-.622.58-.622 1.006v12.166c0 .836.88 1.38 1.628 1.006l3.856-1.928a1.125 1.125 0 011.006 0l3.856 1.928a1.125 1.125 0 001.006 0z" />
                        </svg>
                        {isEs ? 'Navegar' : 'Navigate'}
                      </a>

                      {/* Status Toggle Buttons */}
                      {!isCompleted ? (
                        <>
                          {!isInProgress ? (
                            <button
                              type="button"
                              onClick={() => handleJobStatusChange(job.id, 'in_progress')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {isEs ? 'Iniciar Parada' : 'Start Stop'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJobStatusChange(job.id, 'completed')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              {isEs ? 'Completar' : 'Complete Job'}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJobStatusChange(job.id, 'scheduled')}
                          disabled={isUpdating}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                        >
                          {isEs ? 'Reabrir' : 'Reopen'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
