import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import RouteEngine from '@/components/dashboard/RouteEngine';
import { checkTrialExpiry } from '@/lib/trialCheck';

export default async function RoutingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, trial_starts_at, subscription_status')
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
  const { data: jobs } = propertyIds.length > 0
    ? await supabase
        .from('jobs')
        .select('*, truck_id, properties(street_address, latitude, longitude, customer_id)')
        .in('property_id', propertyIds)
        .order('scheduled_date', { ascending: true })
    : { data: [] };

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-4xl ml-0 space-y-6 text-left">
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dispatch Routing Optimization</h1>
              <p className="text-xs text-slate-400 mt-1">Calculate street fleet paths and coordinate target location dispatch matrices</p>
            </div>
            {/* UPDATED: Now supplying both the job records and the truck list to the engine */}
            <RouteEngine jobs={jobs || []} trucks={trucks} />
          </div>
        </main>
      </div>
    </div>
  );
}