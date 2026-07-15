import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import RouteEngine from '@/components/dashboard/RouteEngine';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';

async function geocodeAddress(address: string) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || !address) return { latitude: null, longitude: null };

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat as number,
        longitude: location.lng as number,
      };
    }
  } catch (error) {
    console.error('Routing geocode failed:', error);
  }

  return { latitude: null, longitude: null };
}

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

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, logo_url, trial_starts_at, subscription_status')
    .eq('owner_id', user.id)
    .single();
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

  const jobs = rawJobs
    ? await Promise.all(rawJobs.map(async (job) => {
        const streetAddress = job.properties?.street_address || '';
        const hasCoordinates = job.properties?.latitude !== null && job.properties?.longitude !== null;

        if (hasCoordinates) return job;

        const geocoded = await geocodeAddress(streetAddress);
        return {
          ...job,
          properties: {
            ...job.properties,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          },
        };
      }))
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
              <RouteEngine orgId={org.id} jobs={jobs || []} trucks={trucks} locale={locale} />
          </div>
        </main>
      </div>
    </div>
  );
}