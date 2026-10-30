'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DispatchMap from '@/components/DispatchMap';
import { syncVehicleRouteOrder, assignDriverToVehicle } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

interface CustomerSummary {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
}

interface JobProperty {
  street_address: string;
  latitude: number | null;
  longitude: number | null;
  customer_id?: string | null;
  customers?: CustomerSummary | null;
}

interface Job {
  id: string;
  truck_id: string | null;
  route_order?: number | null;
  properties?: JobProperty | null;
  job_type: string;
  status: string;
  scheduled_date?: string | null;
}

interface Truck {
  id: string;
  name: string;
  plate_number: string | null;
}

export interface DriverOption {
  id?: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
}

interface RouteEngineProps {
  orgId: string;
  jobs: Job[] | null;
  trucks: Truck[] | null;
  drivers?: DriverOption[];
  locale?: string;
  initialTab?: string;
  maxStopsPerTruck?: number;
  autoOptimizeDriveRoutes?: boolean;
  canAccessLiveTracking?: boolean;
}

type RouteState = {
  unassignedIds: string[];
  truckRoutes: Record<string, string[]>;
};

type SerializedRouteState = RouteState;
type TabType = 'map' | 'unassigned' | 'routes';

const ROUTE_STORAGE_PREFIX = 'dispatch-routing:planner:';

function getCustomerLabel(job: Job) {
  const customer = job.properties?.customers;
  if (!customer) return '';
  return (
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    customer.company_name ||
    ''
  );
}

function hasCoordinates(job: Job) {
  return job.properties?.latitude !== null && job.properties?.longitude !== null;
}

function routeDistance(a: Job, b: Job) {
  const latA = a.properties?.latitude ?? 0;
  const lngA = a.properties?.longitude ?? 0;
  const latB = b.properties?.latitude ?? 0;
  const lngB = b.properties?.longitude ?? 0;
  return Math.hypot(latA - latB, lngA - lngB);
}

function routeCentroid(jobs: Job[]) {
  const geoJobs = jobs.filter(hasCoordinates);
  if (geoJobs.length === 0) return null;

  const totals = geoJobs.reduce(
    (accumulator, job) => ({
      lat: accumulator.lat + (job.properties?.latitude || 0),
      lng: accumulator.lng + (job.properties?.longitude || 0),
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: totals.lat / geoJobs.length,
    lng: totals.lng / geoJobs.length,
  };
}

function sortJobs(jobs: Job[]) {
  return [...jobs].sort((left, right) => {
    if (left.route_order !== null && left.route_order !== undefined && right.route_order !== null && right.route_order !== undefined) {
      return left.route_order - right.route_order;
    }
    if (left.route_order !== null && left.route_order !== undefined) return -1;
    if (right.route_order !== null && right.route_order !== undefined) return 1;
    const leftTime = left.scheduled_date ? new Date(left.scheduled_date).getTime() : 0;
    const rightTime = right.scheduled_date ? new Date(right.scheduled_date).getTime() : 0;
    return leftTime - rightTime;
  });
}

function buildBaseRouteState(jobs: Job[], trucks: Truck[]): RouteState {
  const truckRoutes: Record<string, string[]> = {};
  trucks.forEach((truck) => {
    truckRoutes[truck.id] = [];
  });

  const unassignedIds: string[] = [];

  sortJobs(jobs).forEach((job) => {
    if (job.truck_id && truckRoutes[job.truck_id]) {
      truckRoutes[job.truck_id].push(job.id);
      return;
    }

    unassignedIds.push(job.id);
  });

  return { unassignedIds, truckRoutes };
}

function normalizeStoredState(stored: SerializedRouteState | null, jobs: Job[], trucks: Truck[]): RouteState {
  const base = buildBaseRouteState(jobs, trucks);
  if (!stored) return base;

  const hasAnyDbRouteOrder = jobs.some((job) => job.route_order !== null && job.route_order !== undefined);
  if (hasAnyDbRouteOrder) {
    return base;
  }

  const jobIdSet = new Set(jobs.map((job) => job.id));
  const usedIds = new Set<string>();

  const normalizedTruckRoutes: Record<string, string[]> = {};
  trucks.forEach((truck) => {
    const storedTruckRoute = stored.truckRoutes?.[truck.id] || [];
    const filtered = storedTruckRoute.filter((jobId) => jobIdSet.has(jobId) && !usedIds.has(jobId));
    filtered.forEach((jobId) => usedIds.add(jobId));
    normalizedTruckRoutes[truck.id] = filtered;
  });

  const normalizedUnassigned = (stored.unassignedIds || []).filter((jobId) => jobIdSet.has(jobId) && !usedIds.has(jobId));
  normalizedUnassigned.forEach((jobId) => usedIds.add(jobId));

  sortJobs(jobs).forEach((job) => {
    if (usedIds.has(job.id)) return;
    if (job.truck_id && normalizedTruckRoutes[job.truck_id]) {
      normalizedTruckRoutes[job.truck_id].push(job.id);
      return;
    }
    normalizedUnassigned.push(job.id);
  });

  return {
    unassignedIds: normalizedUnassigned,
    truckRoutes: normalizedTruckRoutes,
  };
}

function removeJobFromState(state: RouteState, jobId: string) {
  return {
    unassignedIds: state.unassignedIds.filter((currentId) => currentId !== jobId),
    truckRoutes: Object.fromEntries(
      Object.entries(state.truckRoutes).map(([truckId, routeIds]) => [
        truckId,
        routeIds.filter((currentId) => currentId !== jobId),
      ])
    ),
  } satisfies RouteState;
}

function insertJobId(list: string[], jobId: string, beforeJobId?: string | null) {
  const next = [...list.filter((currentId) => currentId !== jobId)];
  if (!beforeJobId) {
    next.push(jobId);
    return next;
  }

  const insertIndex = next.indexOf(beforeJobId);
  if (insertIndex === -1) {
    next.push(jobId);
    return next;
  }

  next.splice(insertIndex, 0, jobId);
  return next;
}

function optimizeJobOrder(routeJobIds: string[], jobMap: Map<string, Job>) {
  const routableJobs = routeJobIds
    .map((jobId) => jobMap.get(jobId))
    .filter((job): job is Job => !!job && hasCoordinates(job));
  const unroutableJobs = routeJobIds.filter((jobId) => !jobMap.get(jobId) || !hasCoordinates(jobMap.get(jobId)!));

  if (routableJobs.length <= 1) {
    return routeJobIds;
  }

  const ordered: Job[] = [];
  const remaining = [...routableJobs];
  ordered.push(remaining.shift()!);

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const distance = routeDistance(current, candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }

  return [...ordered.map((job) => job.id), ...unroutableJobs];
}

function buildOptimizedState(routeState: RouteState, jobMap: Map<string, Job>) {
  return {
    unassignedIds: [...routeState.unassignedIds],
    truckRoutes: Object.fromEntries(
      Object.entries(routeState.truckRoutes).map(([truckId, routeIds]) => [
        truckId,
        optimizeJobOrder(routeIds, jobMap),
      ])
    ),
  } satisfies RouteState;
}

export default function RouteEngine({
  orgId,
  jobs,
  trucks,
  drivers = [],
  locale = 'en',
  initialTab,
  maxStopsPerTruck = 4,
  autoOptimizeDriveRoutes = true,
  canAccessLiveTracking = false,
}: RouteEngineProps) {
  const router = useRouter();
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const removeLabel = isEs ? 'Quitar' : 'Remove';

  const normalizeInitialTab = (tab?: string): TabType => {
    if (tab === 'unassigned' || tab === 'unassigned-jobs') return 'unassigned';
    if (tab === 'routes' || tab === 'fleet-routes') return 'routes';
    return 'map';
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => normalizeInitialTab(initialTab));

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'map') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const routeJobs = useMemo(
    () => (jobs || []).filter((job) => job.status === 'scheduled' || job.status === 'dispatched'),
    [jobs]
  );
  const routeTrucks = trucks || [];
  const jobMap = useMemo(() => new Map(routeJobs.map((job) => [job.id, job])), [routeJobs]);
  const storageKey = `${ROUTE_STORAGE_PREFIX}${orgId}`;
  const driverStorageKey = `dispatch-routing:drivers:${orgId}`;

  const [routeState, setRouteState] = useState<RouteState>(() => buildBaseRouteState(routeJobs, routeTrucks));
  const [vehicleDrivers, setVehicleDrivers] = useState<Record<string, DriverOption>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncingJobId, setSyncingJobId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [collapsedTrucks, setCollapsedTrucks] = useState<Record<string, boolean>>({});

  const toggleTruckCollapse = (truckId: string) => {
    setCollapsedTrucks((previous) => ({
      ...previous,
      [truckId]: !previous[truckId],
    }));
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(driverStorageKey);
      if (stored) {
        setVehicleDrivers(JSON.parse(stored));
      }
    } catch {
      // Ignored
    }
  }, [driverStorageKey]);

  const handleAssignDriver = async (truckId: string, driverEmail: string) => {
    const selected = drivers.find((d) => d.email === driverEmail);

    setVehicleDrivers((prev) => {
      const next = { ...prev };
      if (!driverEmail || !selected) {
        delete next[truckId];
      } else {
        next[truckId] = selected;
      }
      try {
        window.localStorage.setItem(driverStorageKey, JSON.stringify(next));
        if (selected) {
          window.localStorage.setItem(`prado_vehicle_driver_${truckId}`, selected.email);
          window.localStorage.setItem(`prado_driver_vehicle_${selected.email}`, truckId);
          window.localStorage.setItem('prado_driver_name', selected.name);
        } else {
          window.localStorage.removeItem(`prado_vehicle_driver_${truckId}`);
        }
      } catch (err) {
        console.error(err);
      }
      return next;
    });

    try {
      await assignDriverToVehicle(truckId, selected ? selected.name : '', selected ? selected.email : '');
    } catch (err) {
      console.warn('Driver assignment server warning:', err);
    }
  };

  useEffect(() => {
    const baseState = buildBaseRouteState(routeJobs, routeTrucks);

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setRouteState(baseState);
      } else {
        const parsed = JSON.parse(stored) as SerializedRouteState;
        setRouteState(normalizeStoredState(parsed, routeJobs, routeTrucks));
      }
    } catch {
      setRouteState(baseState);
    } finally {
      setIsHydrated(true);
    }
  }, [routeJobs, routeTrucks, storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(routeState));
  }, [routeState, isHydrated, storageKey]);

  useEffect(() => {
    if (!isHydrated || !autoOptimizeDriveRoutes) return;
    setRouteState((previous) => buildOptimizedState(previous, jobMap));
  }, [isHydrated, autoOptimizeDriveRoutes, jobMap]);

  const syncRouteChanges = async (nextState: RouteState, activeJobId?: string | null) => {
    if (activeJobId) {
      setSyncingJobId(activeJobId);
    }
    const result = await syncVehicleRouteOrder(nextState.truckRoutes, nextState.unassignedIds);
    if (result?.error) {
      console.error(result.error);
    } else {
      router.refresh();
    }
    if (activeJobId) {
      setSyncingJobId(null);
    }
  };

  const chooseTruckForJob = (job: Job) => {
    if (routeTrucks.length === 0) return null;

    const assignedWithCentroid = routeTrucks
      .map((truck) => {
        const routeJobIds = routeState.truckRoutes[truck.id] || [];
        const routeJobsForTruck = routeJobIds.map((jobId) => jobMap.get(jobId)).filter((entry): entry is Job => !!entry);
        const centroid = routeCentroid(routeJobsForTruck);
        return {
          truckId: truck.id,
          routeCount: routeJobIds.length,
          centroid,
        };
      })
      .filter((entry) => entry.centroid !== null);

    if (assignedWithCentroid.length === 0) {
      const leastLoaded = [...routeTrucks].sort((left, right) => {
        const leftCount = routeState.truckRoutes[left.id]?.length || 0;
        const rightCount = routeState.truckRoutes[right.id]?.length || 0;
        return leftCount - rightCount;
      });
      return leastLoaded[0]?.id || null;
    }

    const currentJobLat = job.properties?.latitude ?? 0;
    const currentJobLng = job.properties?.longitude ?? 0;

    const bestTruck = assignedWithCentroid.reduce((best, candidate) => {
      const distance = Math.hypot((candidate.centroid?.lat || 0) - currentJobLat, (candidate.centroid?.lng || 0) - currentJobLng);
      if (!best || distance < best.distance || (distance === best.distance && candidate.routeCount < best.routeCount)) {
        return { truckId: candidate.truckId, distance, routeCount: candidate.routeCount };
      }
      return best;
    }, null as null | { truckId: string; distance: number; routeCount: number });

    return bestTruck?.truckId || null;
  };

  const assignJobToTruck = async (jobId: string, truckId: string | null, beforeJobId?: string | null) => {
    let nextState: RouteState = routeState;
    setRouteState((previous) => {
      const job = jobMap.get(jobId);
      if (!job) return previous;

      const cleaned = removeJobFromState(previous, jobId);

      if (typeof truckId === 'string' && truckId) {
        nextState = {
          ...cleaned,
          truckRoutes: {
            ...cleaned.truckRoutes,
            [truckId]: insertJobId(cleaned.truckRoutes[truckId] || [], jobId, beforeJobId),
          },
        };
      } else {
        nextState = {
          ...cleaned,
          unassignedIds: insertJobId(cleaned.unassignedIds, jobId, beforeJobId),
        };
      }
      return nextState;
    });

    await syncRouteChanges(nextState, jobId);
  };

  const moveStopInRoute = async (truckId: string, fromIndex: number, toIndex: number) => {
    const list = routeState.truckRoutes[truckId] || [];
    if (toIndex < 0 || toIndex >= list.length) return;
    const nextList = [...list];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);

    const nextState: RouteState = {
      ...routeState,
      truckRoutes: {
        ...routeState.truckRoutes,
        [truckId]: nextList,
      },
    };
    setRouteState(nextState);
    await syncRouteChanges(nextState);
  };

  const autoAssignJob = async (jobId: string) => {
    const job = jobMap.get(jobId);
    if (!job) return;
    const bestTruck = chooseTruckForJob(job);
    if (!bestTruck) return;
    await assignJobToTruck(jobId, bestTruck);
  };

  const autoAssignAllUnassigned = async () => {
    if (routeTrucks.length === 0 || routeState.unassignedIds.length === 0) return;
    setOptimizing(true);
    let nextState: RouteState = { ...routeState };
    for (const jobId of routeState.unassignedIds) {
      const job = jobMap.get(jobId);
      if (!job) continue;
      const bestTruck = chooseTruckForJob(job);
      if (bestTruck) {
        const cleaned = removeJobFromState(nextState, jobId);
        nextState = {
          ...cleaned,
          truckRoutes: {
            ...cleaned.truckRoutes,
            [bestTruck]: insertJobId(cleaned.truckRoutes[bestTruck] || [], jobId),
          },
        };
      }
    }
    setRouteState(nextState);
    await syncRouteChanges(nextState);
    setOptimizing(false);
  };

  const optimizeAllRoutes = async () => {
    setOptimizing(true);
    const optimized = buildOptimizedState(routeState, jobMap);
    setRouteState(optimized);
    await syncRouteChanges(optimized);
    setOptimizing(false);
  };

  const optimizeTruckRoute = async (truckId: string) => {
    let nextState: RouteState = routeState;
    setRouteState((previous) => {
      nextState = {
        ...previous,
        truckRoutes: {
          ...previous.truckRoutes,
          [truckId]: optimizeJobOrder(previous.truckRoutes[truckId] || [], jobMap),
        },
      } satisfies RouteState;
      return nextState;
    });
    await syncRouteChanges(nextState);
  };

  const overloadedTrucks = routeTrucks.filter((truck) => (routeState.truckRoutes[truck.id] || []).length > maxStopsPerTruck);
  const missingGeoCount = routeJobs.filter((job) => !hasCoordinates(job)).length;

  const tabs: Array<{
    id: TabType;
    label: string;
    count?: number;
    hasWarning?: boolean;
    warningTitle?: string;
  }> = [
    {
      id: 'map',
      label: isEs ? 'Mapa' : 'Map',
    },
    {
      id: 'unassigned',
      label: translations.dashboard.unassignedJobs || (isEs ? 'Trabajos sin asignar' : 'Unassigned Jobs'),
      count: routeState.unassignedIds.length,
      hasWarning: missingGeoCount > 0,
      warningTitle: `${missingGeoCount} ${translations.dashboard.routeMissingGeo}`,
    },
    {
      id: 'routes',
      label: isEs ? 'Rutas de Flota' : 'Fleet Routes',
      count: routeTrucks.length,
      hasWarning: overloadedTrucks.length > 0,
      warningTitle: `${overloadedTrucks.length} ${translations.dashboard.routeCapacityWarning}`,
    },
  ];

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {translations.dashboard.dispatchRoutingOptimization}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {translations.dashboard.dispatchRoutingDescription}
        </p>
      </div>

      {/* Horizontal Tabs Navigation (matching Operations Settings & Customer Details) */}
      <div className="border-b border-slate-200">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={isEs ? 'Pestañas de despacho' : 'Dispatch tabs'}
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
                onClick={() => handleTabChange(tab.id)}
                className={`whitespace-nowrap pb-3 pt-1 px-1 text-sm transition-all border-b-[3px] cursor-pointer inline-flex items-center gap-2 ${
                  isActive
                    ? 'border-emerald-600 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.hasWarning && (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      tab.id === 'unassigned' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    title={tab.warningTitle}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {/* TAB 1: FULL-WIDTH GOOGLE MAP */}
        <div
          id="tabpanel-map"
          role="tabpanel"
          aria-labelledby="tab-map"
          className={activeTab === 'map' ? 'block' : 'hidden'}
        >
        <div className="w-full relative h-[540px] lg:h-[620px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <DispatchMap
            className="w-full h-full rounded-xl overflow-hidden bg-gray-100"
            stops={routeTrucks.flatMap((truck) => {
              const assignedJobIds = routeState.truckRoutes[truck.id] || [];
              return assignedJobIds
                .map((id, index) => {
                  const job = jobMap.get(id);
                  if (!job || !hasCoordinates(job)) return null;
                  return {
                    id: job.id,
                    street_address: job.properties?.street_address || '',
                    latitude: job.properties?.latitude ?? null,
                    longitude: job.properties?.longitude ?? null,
                    job_type: job.job_type,
                    stop_number: index + 1,
                    vehicle_name: vehicleDrivers[truck.id]
                      ? `${truck.name} (${vehicleDrivers[truck.id].name})`
                      : truck.name,
                    customer_name: getCustomerLabel(job),
                  };
                })
                .filter((stop): stop is NonNullable<typeof stop> => stop !== null);
            })}
          />
        </div>
      </div>

      {/* TAB 2: UNASSIGNED JOBS */}
      {activeTab === 'unassigned' && (
        <div
          id="tabpanel-unassigned"
          role="tabpanel"
          aria-labelledby="tab-unassigned"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                  {translations.dashboard.unassignedJobs}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                  routeState.unassignedIds.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {routeState.unassignedIds.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs
                  ? 'Trabajos listos para asignación a vehículos de flota.'
                  : 'Jobs awaiting assignment to fleet vehicles.'}
              </p>
            </div>

            {routeState.unassignedIds.length > 0 && routeTrucks.length > 0 && (
              <button
                type="button"
                onClick={autoAssignAllUnassigned}
                disabled={optimizing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition shadow-2xs self-start sm:self-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-600">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                <span>{isEs ? 'Auto-asignar todos' : 'Auto-Assign All'}</span>
              </button>
            )}
          </div>

          {/* Missing coordinates notice */}
          {missingGeoCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-500 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
              </svg>
              <span>
                {isEs
                  ? `${missingGeoCount} trabajo(s) no tienen coordenadas válidas en el mapa.`
                  : `${missingGeoCount} job(s) do not have valid map coordinates.`}
              </span>
            </div>
          )}

          {/* Unassigned Jobs Grid */}
          {routeState.unassignedIds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {routeState.unassignedIds.map((jobId) => {
                const job = jobMap.get(jobId);
                if (!job) return null;
                const customerLabel = getCustomerLabel(job);
                const isSyncing = syncingJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between gap-3 ${
                      isSyncing ? 'ring-2 ring-emerald-400' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{job.job_type}</h4>
                        </div>
                        {!hasCoordinates(job) && (
                          <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shrink-0">
                            {translations.dashboard.routeMissingGeo}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400 shrink-0">
                          <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.36 7.587a17.068 17.068 0 0 0 3.03 2.198l.019.009.006.002.002.001c.088.04.18.083.273.136Zm.31-7.933a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" clipRule="evenodd" />
                        </svg>
                        <span>{job.properties?.street_address || '—'}</span>
                      </p>

                      {customerLabel && (
                        <p className="text-xs text-slate-500 truncate mt-1 flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400 shrink-0">
                            <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                          </svg>
                          <span>{customerLabel}</span>
                        </p>
                      )}
                    </div>

                    {/* Assignment controls */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              void assignJobToTruck(job.id, e.target.value);
                            }
                          }}
                          className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 hover:border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition cursor-pointer shadow-2xs"
                        >
                          <option value="" disabled>
                            {isEs ? '-- Asignar a Vehículo --' : '-- Assign to Vehicle --'}
                          </option>
                          {routeTrucks.map((truck) => (
                            <option key={truck.id} value={truck.id}>
                              {truck.name} {truck.plate_number ? `(${truck.plate_number})` : ''} ({(routeState.truckRoutes[truck.id] || []).length} stops)
                            </option>
                          ))}
                        </select>
                      </div>
                      {routeTrucks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => void autoAssignJob(job.id)}
                          title={isEs ? 'Asignar automáticamente al vehículo óptimo' : 'Auto-assign to optimal vehicle'}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs shrink-0"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-300 mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <h3 className="text-sm font-semibold text-slate-700">
                {isEs ? 'Todos los trabajos asignados' : 'All jobs assigned'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {isEs
                  ? 'No hay trabajos sin asignar pendientes en este momento.'
                  : 'There are no pending unassigned jobs at this time.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FLEET ROUTES */}
      {activeTab === 'routes' && (
        <div
          id="tabpanel-routes"
          role="tabpanel"
          aria-labelledby="tab-routes"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                  {isEs ? 'Rutas de Flota' : 'Fleet Routes'}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-600">
                  {routeTrucks.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs
                  ? 'Secuencia de paradas, asignación de conductores y optimización por vehículo.'
                  : 'Stop sequences, driver assignments, and vehicle route optimization.'}
              </p>
            </div>
          </div>

          {/* Overloaded vehicles warning */}
          {overloadedTrucks.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 shrink-0">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <span>
                {translations.dashboard.routeCapacityWarning}: {overloadedTrucks.length} {isEs ? 'vehículo(s) exceden el límite de' : 'vehicle(s) exceed the limit of'} {maxStopsPerTruck} {translations.dashboard.routeStops}.
              </span>
            </div>
          )}

          {/* Vehicles List - 2 per row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {routeTrucks.map((truck) => {
              const assignedJobIds = routeState.truckRoutes[truck.id] || [];
              const routeLoad = assignedJobIds.length;
              const loadWarning = routeLoad > maxStopsPerTruck;
              const isCollapsed = collapsedTrucks[truck.id] ?? false;

              return (
                <div
                  key={truck.id}
                  className={`rounded-xl border transition ${
                    loadWarning
                      ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-200'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  {/* Vehicle Header Bar */}
                  <div
                    className="p-3.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/60 rounded-t-xl transition"
                    onClick={() => toggleTruckCollapse(truck.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        aria-label="Toggle vehicle"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span className="truncate">{truck.name}</span>
                          {truck.plate_number && (
                            <span className="text-xs font-normal text-slate-400 truncate">({truck.plate_number})</span>
                          )}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${
                        loadWarning
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : routeLoad > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}>
                        {routeLoad} {translations.dashboard.routeStops}
                      </span>
                      <button
                        type="button"
                        onClick={() => optimizeTruckRoute(truck.id)}
                        disabled={routeLoad <= 1}
                        title={translations.dashboard.routeOptimizeTruck}
                        className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-50 transition shadow-2xs disabled:opacity-40"
                      >
                        {translations.dashboard.routeOptimizeTruck}
                      </button>
                    </div>
                  </div>

                  {/* Driver Assignment Bar */}
                  <div
                    className="px-3.5 py-2.5 bg-white/80 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
                        {isEs ? 'Conductor:' : 'Driver:'}
                      </span>
                      {vehicleDrivers[truck.id] ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate max-w-[130px] sm:max-w-[180px]">
                            {vehicleDrivers[truck.id].name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {isEs ? 'Sin conductor' : 'No driver'}
                        </span>
                      )}
                    </div>

                    <div className="relative shrink-0">
                      <select
                        value={vehicleDrivers[truck.id]?.email || ''}
                        onChange={(e) => void handleAssignDriver(truck.id, e.target.value)}
                        className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition cursor-pointer shadow-2xs"
                      >
                        <option value="">{isEs ? '-- Asignar conductor --' : '-- Assign Driver --'}</option>
                        {drivers.map((driver) => (
                          <option key={driver.email} value={driver.email}>
                            {driver.name} {driver.role === 'driver' ? '• Driver' : `(${driver.role})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stops List */}
                  {!isCollapsed && (
                    <div className="p-3 pt-2 space-y-2 border-t border-slate-200/60">
                      {loadWarning && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                          {translations.dashboard.routeCapacityWarning}: {routeLoad}/{maxStopsPerTruck}
                        </div>
                      )}

                      <div className="space-y-2.5 min-h-[72px]">
                        {assignedJobIds.length > 0 ? (
                          assignedJobIds.map((jobId, index) => {
                            const job = jobMap.get(jobId);
                            if (!job) return null;
                            const customerLabel = getCustomerLabel(job);

                            return (
                              <div
                                key={job.id}
                                className={`rounded-lg border border-slate-200 bg-white p-3 shadow-2xs transition hover:border-slate-300 hover:shadow-xs ${
                                  syncingJobId === job.id ? 'ring-2 ring-emerald-300' : ''
                                }`}
                              >
                                <div className="w-full space-y-1.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shrink-0">
                                        {index + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-900 truncate">
                                        {job.job_type}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                      {/* Move Up */}
                                      <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => void moveStopInRoute(truck.id, index, index - 1)}
                                        title={isEs ? 'Mover arriba' : 'Move up'}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                          <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                                        </svg>
                                      </button>

                                      {/* Move Down */}
                                      <button
                                        type="button"
                                        disabled={index === assignedJobIds.length - 1}
                                        onClick={() => void moveStopInRoute(truck.id, index, index + 1)}
                                        title={isEs ? 'Mover abajo' : 'Move down'}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                          <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                                        </svg>
                                      </button>

                                      {/* Unassign */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void assignJobToTruck(job.id, null);
                                        }}
                                        title={removeLabel}
                                        className="text-[10px] font-semibold uppercase tracking-wider rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                                      >
                                        {removeLabel}
                                      </button>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-slate-500 truncate">{job.properties?.street_address || '—'}</p>
                                  {customerLabel && (
                                    <p className="text-[10px] text-slate-400 truncate">{customerLabel}</p>
                                  )}

                                  {/* Re-assign to another vehicle */}
                                  {routeTrucks.length > 1 && (
                                    <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                                      <span>{isEs ? 'Cambiar a:' : 'Move to:'}</span>
                                      <select
                                        value={truck.id}
                                        onChange={(e) => void assignJobToTruck(job.id, e.target.value)}
                                        className="text-[11px] font-medium rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700 outline-none hover:border-slate-300 max-w-[130px]"
                                      >
                                        {routeTrucks.map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 py-6 px-3 text-center text-xs text-slate-400">
                            {isEs ? 'No hay trabajos asignados a este vehículo.' : 'No jobs assigned to this vehicle.'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
