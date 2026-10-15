import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
import { canUseLiveTracking } from '@/lib/subscriptionAccess';

// In-memory cache for live telematics pings from mobile devices
const liveTelematicsCache = new Map<string, {
  lat: number;
  lng: number;
  speed: number;
  status: 'moving' | 'idle' | 'alert' | 'offline';
  destination?: string;
  driver?: string;
  updatedAt: string;
}>();

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let trucks: Array<{ id: string; name: string; plate_number?: string | null; status?: string | null }> = [];
    let jobsByTruckId = new Map<string, Array<{ job_type: string; street_address?: string; latitude?: number | null; longitude?: number | null }>>();

    if (user) {
      const { organization: org } = await getUserOrganization(user.id);
      if (org) {
        if (!canUseLiveTracking(org.subscription_status)) {
          return NextResponse.json(
            { error: 'Live fleet telematics stream is only available on the Enterprise tier.' },
            { status: 403 }
          );
        }

        const { data: dbTrucks } = await supabase
          .from('trucks')
          .select('id, name, plate_number, status')
          .eq('organization_id', org.id)
          .eq('is_active', true);

        if (dbTrucks && dbTrucks.length > 0) {
          trucks = dbTrucks;
          const truckIds = dbTrucks.map((t) => t.id);

          const { data: dbJobs } = await supabase
            .from('jobs')
            .select('id, truck_id, job_type, properties(street_address, latitude, longitude)')
            .in('truck_id', truckIds)
            .order('scheduled_date', { ascending: true });

          if (dbJobs) {
            dbJobs.forEach((job: any) => {
              if (!job.truck_id) return;
              const list = jobsByTruckId.get(job.truck_id) || [];
              list.push({
                job_type: job.job_type,
                street_address: job.properties?.street_address,
                latitude: job.properties?.latitude,
                longitude: job.properties?.longitude,
              });
              jobsByTruckId.set(job.truck_id, list);
            });
          }
        }
      }
    }

    const formattedVehicles = trucks.map((v) => {
      const cached = liveTelematicsCache.get(v.id);
      const assignedJobs = jobsByTruckId.get(v.id) || [];
      const primaryJob = assignedJobs[0];

      const lat = cached?.lat ?? (primaryJob?.latitude ? Number(primaryJob.latitude) : 0);
      const lng = cached?.lng ?? (primaryJob?.longitude ? Number(primaryJob.longitude) : 0);

      const status: 'moving' | 'idle' | 'alert' | 'offline' =
        cached?.status ?? (v.status === 'inactive' ? 'offline' : 'idle');
      const speed = cached?.speed ?? 0;
      const destination = cached?.destination ?? (primaryJob?.street_address ? `${primaryJob.job_type} - ${primaryJob.street_address}` : '');
      const driver = cached?.driver ?? (v.plate_number ? `Unit ${v.plate_number}` : 'Unassigned');

      return {
        id: v.id,
        name: v.name,
        driver,
        status,
        speed,
        destination,
        lat,
        lng,
        updatedAt: cached?.updatedAt ?? new Date().toISOString(),
      };
    });

    return NextResponse.json({ vehicles: formattedVehicles, total: formattedVehicles.length });
  } catch (error) {
    console.error('[GET /api/telematics/location error]:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicle telematics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicleId, driver, lat, lng, speed, status, destination, action } = body;

    const targetId = vehicleId || 'truck-1';

    if (action === 'stop_streaming') {
      const existing = liveTelematicsCache.get(targetId);
      const updated = {
        lat: existing?.lat ?? 0,
        lng: existing?.lng ?? 0,
        speed: 0,
        status: 'offline' as const,
        destination: 'Off Duty (Shift Ended)',
        driver: driver || existing?.driver || 'Off Duty Driver',
        updatedAt: new Date().toISOString(),
      };
      liveTelematicsCache.set(targetId, updated);
      return NextResponse.json({ success: true, location: { id: targetId, ...updated } });
    }

    if (action === 'assign_driver') {
      const existing = liveTelematicsCache.get(targetId);
      const updated = {
        lat: existing?.lat ?? 0,
        lng: existing?.lng ?? 0,
        speed: existing?.speed ?? 0,
        status: existing?.status ?? 'idle',
        destination: existing?.destination ?? 'Scheduled Dispatch Route',
        driver: driver || 'Unassigned',
        updatedAt: new Date().toISOString(),
      };
      liveTelematicsCache.set(targetId, updated);
      return NextResponse.json({ success: true, location: { id: targetId, ...updated } });
    }

    const numLat = Number(lat);
    const numLng = Number(lng);

    if (isNaN(numLat) || isNaN(numLng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const currentSpeed = typeof speed === 'number' ? Math.round(speed) : 0;
    const computedStatus: 'moving' | 'idle' | 'alert' | 'offline' =
      status || (currentSpeed > 2 ? 'moving' : 'idle');

    const updated = {
      lat: numLat,
      lng: numLng,
      speed: currentSpeed,
      status: computedStatus,
      destination: destination || (computedStatus === 'moving' ? 'En Route (Live GPS Stream)' : 'Idle at Site'),
      driver: driver || 'Active Driver',
      updatedAt: new Date().toISOString(),
    };

    liveTelematicsCache.set(targetId, updated);

    return NextResponse.json({ success: true, location: { id: targetId, ...updated } });
  } catch (error) {
    console.error('[POST /api/telematics/location error]:', error);
    return NextResponse.json({ error: 'Failed to process location ping' }, { status: 500 });
  }
}
