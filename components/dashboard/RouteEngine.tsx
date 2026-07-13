import DispatchMap from '@/components/DispatchMap';
import { getTranslations } from '@/lib/translations';

interface Job {
  id: string;
  truck_id: string | null; // <-- ADDED: Track asset linkage
  properties?: {
    street_address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  job_type: string;
  status: string;
}

// <-- ADDED: Interface for dynamic truck fleet data
interface Truck {
  id: string;
  name: string;
  plate_number: string | null;
}

interface RouteEngineProps {
  jobs: Job[] | null;
  trucks: Truck[] | null; // <-- ADDED: Accept trucks array parameter from parent context
  locale?: string;
}

export default function RouteEngine({ jobs, trucks, locale = 'en' }: RouteEngineProps) {
  const translations = getTranslations(locale);
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-1 text-gray-800">{translations.dashboard.googleMapsRouteDispatch}</h2>
      <p className="text-xs text-gray-400 mb-4">{translations.dashboard.visualStopOptimization}</p>
      <div className="mb-4">
        {/* UPDATED: Expanded filter to include 'dispatched' jobs for map visibility */}
        <DispatchMap stops={jobs?.filter(j => j.status === 'scheduled' || j.status === 'dispatched').map(j => ({ id: j.id, street_address: j.properties?.street_address || '', latitude: j.properties?.latitude || null, longitude: j.properties?.longitude || null, job_type: j.job_type })) || []} />
      </div>

      {/* Today's Route List Display */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">{translations.dashboard.todaysRouteOrder}</span>
        {/* UPDATED: Expanded filter to include 'dispatched' jobs in the route list */}
        {jobs?.filter(j => j.status === 'scheduled' || j.status === 'dispatched').map((job, idx) => {
          // Find matching vehicle inside your fleet index parameters
          const assignedTruck = trucks?.find(t => t.id === job.truck_id);

          return (
            <div key={job.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 text-xs">
              <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-md text-[10px] whitespace-nowrap tracking-wide uppercase">{translations.dashboard.stop} {idx + 1}</span>
              <span className="font-medium text-gray-800">{job.properties?.street_address}</span>
              
              <div className="ml-auto flex items-center gap-2">
                {/* Dynamic Fleet Vehicle Badge */}
                <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${
                  assignedTruck 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {assignedTruck 
                    ? `${assignedTruck.name}${assignedTruck.plate_number ? ` (${assignedTruck.plate_number})` : ''}` 
                    : translations.dashboard.unassignedFleetAsset}
                </span>
                
                <span className="text-gray-400 bg-white px-2 py-0.5 rounded border text-[11px]">{translations.dashboard.serviceLabel}: {job.job_type}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}