
import DispatchMap from '@/components/DispatchMap';

interface Job {
  id: string;
  properties?: {
    street_address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  job_type: string;
  status: string;
}

interface RouteEngineProps {
  jobs: Job[] | null;
}

export default function RouteEngine({ jobs }: RouteEngineProps) {
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-1 text-gray-800">Google Maps Route Dispatch</h2>
      <p className="text-xs text-gray-400 mb-4">Visual stop optimization map coordinates.</p>
      <div className="mb-4">
        <DispatchMap stops={jobs?.filter(j => j.status === 'scheduled').map(j => ({ id: j.id, street_address: j.properties?.street_address || '', latitude: j.properties?.latitude || null, longitude: j.properties?.longitude || null, job_type: j.job_type })) || []} />
      </div>

      {/* Today's Route List Display */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Today&apos;s Route Order</span>
        {jobs?.filter(j => j.status === 'scheduled').map((job, idx) => (
          <div key={job.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 text-xs">
            <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-md text-[10px] whitespace-nowrap tracking-wide uppercase">Stop {idx + 1}</span>
            <span className="font-medium text-gray-800">{job.properties?.street_address}</span>
            <span className="ml-auto text-gray-400 bg-white px-2 py-0.5 rounded border text-[11px]">Service: {job.job_type}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
