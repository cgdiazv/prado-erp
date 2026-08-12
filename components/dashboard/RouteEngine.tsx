'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DispatchMap from '@/components/DispatchMap';
import { updateJobTruckAssignment } from '@/app/actions';
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

interface RouteEngineProps {
  orgId: string;
  jobs: Job[] | null;
  trucks: Truck[] | null;
  locale?: string;
  maxStopsPerTruck?: number;
  autoOptimizeDriveRoutes?: boolean;
}

type RouteState = {
  unassignedIds: string[];
  truckRoutes: Record<string, string[]>;
};

type DragSource = {
  jobId: string;
  fromTruckId: string | null;
};

type SerializedRouteState = RouteState;

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
  locale = 'en',
  maxStopsPerTruck = 4,
  autoOptimizeDriveRoutes = true,
}: RouteEngineProps) {
  const router = useRouter();
  const translations = getTranslations(locale);
  const removeLabel = locale.toLowerCase().startsWith('es') ? 'Quitar' : 'Remove';
  const routeJobs = useMemo(
    () => (jobs || []).filter((job) => job.status === 'scheduled' || job.status === 'dispatched'),
    [jobs]
  );
  const routeTrucks = trucks || [];
  const jobMap = useMemo(() => new Map(routeJobs.map((job) => [job.id, job])), [routeJobs]);
  const storageKey = `${ROUTE_STORAGE_PREFIX}${orgId}`;

  const [routeState, setRouteState] = useState<RouteState>(() => buildBaseRouteState(routeJobs, routeTrucks));
  const [isHydrated, setIsHydrated] = useState(false);
  const [draggingJob, setDraggingJob] = useState<DragSource | null>(null);
  const [syncingJobId, setSyncingJobId] = useState<string | null>(null);
  const [mapDropActive, setMapDropActive] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const touchDragHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);

  const clearTouchHold = () => {
    if (!touchDragHoldRef.current) return;
    clearTimeout(touchDragHoldRef.current);
    touchDragHoldRef.current = null;
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

  const persistAssignment = async (jobId: string, truckId: string | null) => {
    setSyncingJobId(jobId);
    const result = await updateJobTruckAssignment(jobId, truckId);

    if (result?.error) {
      console.error(result.error);
    } else {
      router.refresh();
    }

    setSyncingJobId(null);
  };

  const moveJob = (
    jobId: string,
    target: { truckId?: string | null; beforeJobId?: string | null }
  ) => {
    setRouteState((previous) => {
      const job = jobMap.get(jobId);
      if (!job) return previous;

      const cleaned = removeJobFromState(previous, jobId);

      if (typeof target.truckId === 'string') {
        return {
          ...cleaned,
          truckRoutes: {
            ...cleaned.truckRoutes,
            [target.truckId]: insertJobId(cleaned.truckRoutes[target.truckId] || [], jobId, target.beforeJobId),
          },
        };
      }

      return {
        ...cleaned,
        unassignedIds: insertJobId(cleaned.unassignedIds, jobId, target.beforeJobId),
      };
    });
  };

  const handleDragStart = (jobId: string, fromTruckId: string | null) => {
    setDraggingJob({ jobId, fromTruckId });
  };

  const handleDragEnd = () => {
    clearTouchHold();
    touchStartPointRef.current = null;
    setDraggingJob(null);
    setMapDropActive(false);
  };

  const startTouchHoldDrag = (
    event: React.TouchEvent<HTMLElement>,
    jobId: string,
    fromTruckId: string | null
  ) => {
    if (!canStartTouchDrag(event.target)) return;
    const touch = event.touches[0];
    if (!touch) return;

    touchStartPointRef.current = { x: touch.clientX, y: touch.clientY };
    clearTouchHold();
    touchDragHoldRef.current = setTimeout(() => {
      setDraggingJob({ jobId, fromTruckId });
      touchDragHoldRef.current = null;
    }, 280);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const startPoint = touchStartPointRef.current;
    if (!startPoint || draggingJob) return;
    const touch = event.touches[0];
    if (!touch) return;

    const movedX = Math.abs(touch.clientX - startPoint.x);
    const movedY = Math.abs(touch.clientY - startPoint.y);

    if (movedX > 8 || movedY > 8) {
      clearTouchHold();
    }
  };

  useEffect(() => {
    return () => {
      clearTouchHold();
    };
  }, []);

  const handleTouchDrop = async (clientX: number, clientY: number) => {
    if (!draggingJob) return;

    const dropElement = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const dropZone = dropElement?.closest('[data-route-dropzone]') as HTMLElement | null;
    const dropTarget = dropZone?.dataset.routeDropzone;

    if (!dropTarget) {
      handleDragEnd();
      return;
    }

    if (dropTarget === 'map') {
      await handleDropToMap();
      return;
    }

    const [zoneType, zoneId, beforeJobId] = dropTarget.split(':');

    if (zoneType === 'unassigned') {
      await handleDropToUnassigned(zoneId || undefined);
      return;
    }

    if (zoneType === 'truck' && zoneId) {
      await handleDropToTruck(zoneId, beforeJobId || undefined);
      return;
    }

    handleDragEnd();
  };

  const canStartTouchDrag = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return true;
    return !target.closest('button, a, input, select, textarea, label');
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
    moveJob(jobId, { truckId, beforeJobId });
    setDraggingJob(null);

    const currentJob = jobMap.get(jobId);
    if (!currentJob) return;

    if (truckId !== currentJob.truck_id) {
      await persistAssignment(jobId, truckId);
    }
  };

  const handleDropToTruck = async (truckId: string, beforeJobId?: string | null) => {
    if (!draggingJob) return;
    await assignJobToTruck(draggingJob.jobId, truckId, beforeJobId);
  };

  const handleDropToUnassigned = async (beforeJobId?: string | null) => {
    if (!draggingJob) return;
    await assignJobToTruck(draggingJob.jobId, null, beforeJobId);
  };

  const handleDropToMap = async () => {
    if (!draggingJob) return;
    const job = jobMap.get(draggingJob.jobId);
    if (!job) return;

    const bestTruck = chooseTruckForJob(job);
    if (!bestTruck) {
      await handleDropToUnassigned();
      return;
    }

    await assignJobToTruck(job.id, bestTruck);
  };

  const optimizeAllRoutes = async () => {
    setOptimizing(true);
    setRouteState((previous) => buildOptimizedState(previous, jobMap));
    setOptimizing(false);
  };

  const optimizeTruckRoute = (truckId: string) => {
    setRouteState((previous) => {
      const next = {
        ...previous,
        truckRoutes: {
          ...previous.truckRoutes,
          [truckId]: optimizeJobOrder(previous.truckRoutes[truckId] || [], jobMap),
        },
      } satisfies RouteState;
      return next;
    });
  };

  const renderJobCard = (jobId: string, sourceTruckId: string | null, beforeJobId?: string | null) => {
    const job = jobMap.get(jobId);
    if (!job) return null;

    const customerLabel = getCustomerLabel(job);
    const isSyncing = syncingJobId === job.id;

    return (
      <div
        key={job.id}
        data-route-dropzone={`unassigned:${job.id}`}
        draggable
        onDragStart={() => handleDragStart(job.id, sourceTruckId)}
        onDragEnd={handleDragEnd}
        onTouchStart={(event) => startTouchHoldDrag(event, job.id, sourceTruckId)}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleDragEnd}
        onTouchEnd={(event) => {
          clearTouchHold();
          touchStartPointRef.current = null;
          if (!draggingJob) return;
          const touch = event.changedTouches[0];
          if (!touch) return;
          void handleTouchDrop(touch.clientX, touch.clientY);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (sourceTruckId === null) {
            void handleDropToUnassigned(beforeJobId);
          } else {
            void handleDropToTruck(sourceTruckId, beforeJobId);
          }
        }}
        className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition ${
          draggingJob?.jobId === job.id ? 'opacity-50 scale-[0.99]' : 'hover:border-slate-300 hover:shadow-md'
        } ${isSyncing ? 'ring-2 ring-slate-200' : ''}`}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {translations.dashboard.routeReorderHint}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {translations.dashboard.stop}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-slate-900 break-words">{job.job_type}</h4>
          <p className="text-xs text-slate-500 break-words">{job.properties?.street_address || '—'}</p>
          {customerLabel && (
            <p className="text-[11px] text-slate-400 break-words">{translations.dashboard.routeCustomer}: {customerLabel}</p>
          )}
        </div>
      </div>
    );
  };

  const mapDropMessage = draggingJob
    ? translations.dashboard.routeAutoAssignMap
    : translations.dashboard.routeSavedLocally;

  const overloadedTrucks = routeTrucks.filter((truck) => (routeState.truckRoutes[truck.id] || []).length > maxStopsPerTruck);
  const missingGeoCount = routeJobs.filter((job) => !hasCoordinates(job)).length;
  const routeAlerts = [
    {
      label: translations.dashboard.routeCapacityWarning,
      value: overloadedTrucks.length,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-500 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )
    },
    {
      label: translations.dashboard.routeMissingGeo,
      value: missingGeoCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-rose-500 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      )
    },
    {
      label: translations.dashboard.unassignedJobs,
      value: routeState.unassignedIds.length,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      )
    },
  ];

  return (
    <section className="space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{translations.dashboard.googleMapsRouteDispatch}</h2>
            <p className="text-xs text-slate-400 mt-1">{translations.dashboard.visualStopOptimization}</p>
          </div>
          <div className="text-right space-y-1">
            <button
              type="button"
              onClick={optimizeAllRoutes}
              disabled={optimizing}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              {optimizing ? `${translations.dashboard.routeOptimizeAll}...` : translations.dashboard.routeOptimizeAll}
            </button>
            <p className="text-[11px] text-slate-400">{mapDropMessage}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Metric Cards to the Left of the Map */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-3">
            {routeAlerts.map((alert) => (
              <div
                key={alert.label}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {alert.label}
                  </span>
                  {alert.icon}
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {alert.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Google Map */}
          <div
            className="lg:col-span-9 relative"
            data-route-dropzone="map"
            onDragOver={(event) => {
              event.preventDefault();
              setMapDropActive(true);
            }}
            onDragLeave={() => setMapDropActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              void handleDropToMap();
              setMapDropActive(false);
            }}
          >
            <DispatchMap
              stops={[
                ...routeTrucks.flatMap((truck) => routeState.truckRoutes[truck.id] || []),
              ]
                .map((id) => jobMap.get(id))
                .filter((job): job is Job => !!job && hasCoordinates(job))
                .map((job) => ({
                  id: job.id,
                  street_address: job.properties?.street_address || '',
                  latitude: job.properties?.latitude ?? null,
                  longitude: job.properties?.longitude ?? null,
                  job_type: job.job_type,
                }))}
            />
            {mapDropActive && (
              <div className="absolute inset-0 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-500/10 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm">
                  {translations.dashboard.routeAutoAssignMap}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{translations.dashboard.unassignedJobs}</h2>
              <p className="text-xs text-slate-400 mt-1">{translations.dashboard.routeReorderHint}</p>
            </div>
            <span className="text-xs font-medium text-slate-500">{routeState.unassignedIds.length} {translations.dashboard.routeStops}</span>
          </div>

          <div
            data-route-dropzone="unassigned"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleDropToUnassigned();
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[260px] rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3"
          >
            {routeState.unassignedIds.length > 0 ? (
              routeState.unassignedIds.map((jobId, index) => renderJobCard(jobId, null, routeState.unassignedIds[index]))
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-center">
                <p className="text-xs text-slate-400 px-6">{translations.dashboard.routeSavedLocally}</p>
              </div>
            )}
          </div>
        </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{translations.dashboard.routeRoutes}</h2>
            <p className="text-xs text-slate-400 mt-1">{translations.dashboard.routeDropHint}</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{translations.dashboard.routeSavedLocally}</span>
        </div>

        <div className="space-y-4">
          {routeTrucks.map((truck) => {
            const assignedJobIds = routeState.truckRoutes[truck.id] || [];
            const routeLoad = assignedJobIds.length;
            const loadWarning = routeLoad > maxStopsPerTruck;
            return (
              <div
                key={truck.id}
                data-route-dropzone={`truck:${truck.id}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleDropToTruck(truck.id);
                }}
                className={`rounded-xl border bg-slate-50/70 p-3 ${loadWarning ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{truck.name}</h3>
                    <p className="text-[11px] text-slate-400">{truck.plate_number || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-1 ${loadWarning ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-600 bg-white border border-slate-200'}`}>
                      {routeLoad} {translations.dashboard.routeStops}
                    </span>
                    <button
                      type="button"
                      onClick={() => optimizeTruckRoute(truck.id)}
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition shadow-sm"
                    >
                      {translations.dashboard.routeOptimizeTruck}
                    </button>
                  </div>
                </div>

                {loadWarning && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    {translations.dashboard.routeCapacityWarning}: {routeLoad}/{maxStopsPerTruck}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 min-h-[72px]">
                  {assignedJobIds.length > 0 ? (
                    assignedJobIds.map((jobId, index) => {
                      const job = jobMap.get(jobId);
                      if (!job) return null;

                      return (
                        <div
                          key={job.id}
                          data-route-dropzone={`truck:${truck.id}:${job.id}`}
                          draggable
                          onDragStart={() => handleDragStart(job.id, truck.id)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(event) => startTouchHoldDrag(event, job.id, truck.id)}
                          onTouchMove={handleTouchMove}
                          onTouchCancel={handleDragEnd}
                          onTouchEnd={(event) => {
                            clearTouchHold();
                            touchStartPointRef.current = null;
                            if (!draggingJob) return;
                            const touch = event.changedTouches[0];
                            if (!touch) return;
                            void handleTouchDrop(touch.clientX, touch.clientY);
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            void handleDropToTruck(truck.id, job.id);
                          }}
                          className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition ${
                            draggingJob?.jobId === job.id ? 'opacity-50 scale-[0.99]' : 'hover:border-slate-300 hover:shadow-md'
                          }`}
                        >
                          <div className="w-full space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                {translations.dashboard.stop} {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  moveJob(job.id, { truckId: null });
                                  void persistAssignment(job.id, null);
                                }}
                                className="text-[10px] font-semibold uppercase tracking-wider rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 hover:bg-white"
                              >
                                {removeLabel}
                              </button>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 break-words">{job.job_type}</p>
                            <p className="text-xs text-slate-500 break-words">{job.properties?.street_address || '—'}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
                      {translations.dashboard.routeDropHint}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}
