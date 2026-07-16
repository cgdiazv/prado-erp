import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import RouteEngine from '@/components/dashboard/RouteEngine';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';
import { geocodeAddressServer } from '@/lib/googleMapsServer';
import { getUserOrganization } from '@/lib/organization';

export default async function RoutingPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const translations = getTranslations(locale);

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { organization: org } = await getUserOrganization(user.id);
  if (!org) redirect('/signup');

  // 1. SECURITY TIER GUARD: Allow 'enterprise' and active 'trial' profiles, block 'individual'
  if (org.subscription_status === 'individual') {
    redirect('/dashboard?restricted=true');
  }

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect('/dashboard/billing?expired=true');
  }

  // Fetch customer assets and active fleet vehicles in parallel
  const [customersResponse, trucksResponse] = await Promise.all([
    supabase.from('customers').select('id').eq('organization_id', org.id),
    supabase.from('trucks').select('id, name, plate_number').eq('organization_id', org.id).eq('is_active', true)
  ]);

  const customers = customersResponse.data || [];
  const trucks = trucksResponse.data || [];
  const customerIds = customers.map(c => c.id);

  const propertiesResponse = customerIds.length > 0
    ? await supabase.from('properties').select('id').in('customer_id', customerIds)
    : { data: [] };
  const propertyIds = propertiesResponse.data?.map(p => p.id) || [];

  // UPDATED: Added truck_id to the field selection parameters
  const { data: rawJobs } = propertyIds.length > 0
    ? await supabase
        .from('jobs')
        .select('*, truck_id, properties(street_address, latitude, longitude, customer_id, customers(first_name, last_name, company_name))')
        .in('property_id', propertyIds)
        .order('scheduled_date', { ascending: true })
    : { data: [] };

  const geocodedByPropertyId = new Map<string, { latitude: number; longitude: number }>();

  if (rawJobs && rawJobs.length > 0) {
    const missingCoordinateProperties = Array.from(
      new Map(
        rawJobs
          .filter((job) => {
            const hasCoordinates = job.properties?.latitude !== null && job.properties?.longitude !== null;
            return !hasCoordinates && !!job.property_id && !!job.properties?.street_address;
          })
          .map((job) => [job.property_id as string, job.properties?.street_address as string])
      ).entries()
    );

    await Promise.all(
      missingCoordinateProperties.map(async ([propertyId, streetAddress]) => {
        const geocoded = await geocodeAddressServer(streetAddress);
        if (geocoded.latitude === null || geocoded.longitude === null) return;

        geocodedByPropertyId.set(propertyId, {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        });

        await supabase
          .from('properties')
          .update({
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          })
          .eq('id', propertyId);
      })
    );
  }

  const jobs = rawJobs
    ? rawJobs
      .filter((job) => job.status !== 'archived')
      .map((job) => {
        const hasCoordinates = job.properties?.latitude !== null && job.properties?.longitude !== null;
        if (hasCoordinates || !job.property_id) return job;

        const cachedCoordinates = geocodedByPropertyId.get(job.property_id as string);
        if (!cachedCoordinates) return job;

        return {
          ...job,
          properties: {
            ...job.properties,
            latitude: cachedCoordinates.latitude,
            longitude: cachedCoordinates.longitude,
          },
        };
      })
    : [];

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />
      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-6 text-left">
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.dispatchRoutingOptimization}</h1>
              <p className="text-xs text-slate-400 mt-1">{translations.dashboard.dispatchRoutingDescription}</p>
            </div>
              <RouteEngine
                orgId={org.id}
                jobs={jobs || []}
                trucks={trucks}
                locale={locale}
                maxStopsPerTruck={org.max_jobs_per_truck ?? 4}
                autoOptimizeDriveRoutes={org.auto_optimize_drive_routes ?? true}
              />
          </div>
        </main>
      </div>
    </div>
  );
}