import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import JobSchedule from '@/components/dashboard/JobSchedule';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';

export default async function SchedulePage({
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
    .select('id, name, trial_starts_at, subscription_status')
    .eq('owner_id', user.id)
    .single();
  if (!org) redirect('/signup');

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect('/dashboard/billing?expired=true');
  }

  // Fetch customer, service, and active truck records for the schedule form
  const [customersResponse, servicesResponse, trucksResponse] = await Promise.all([
    supabase.from('customers').select('id, first_name, last_name, company_name').eq('organization_id', org.id),
    supabase.from('services').select('id, name, base_price').eq('organization_id', org.id).order('name', { ascending: true }),
    supabase.from('trucks').select('id, name, plate_number, is_active, status').eq('organization_id', org.id).eq('is_active', true).order('name', { ascending: true })
  ]);

  const customers = customersResponse.data || [];
  const services = servicesResponse.data || [];
  const trucks = trucksResponse.data || [];
  const customerIds = customers.map(c => c.id);

  const properties = customerIds.length > 0
    ? (await supabase.from('properties').select('*').in('customer_id', customerIds)).data
    : [];
  const propertyIds = properties?.map(p => p.id) || [];

  const jobs = propertyIds.length > 0
    ? (await supabase.from('jobs').select('*, properties(street_address, latitude, longitude, customer_id)').in('property_id', propertyIds).order('scheduled_date', { ascending: true })).data
    : [];

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-8 text-left">
            
            {/* Header Row */}
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.jobScheduling}</h1>
              <p className="text-xs text-slate-400 mt-1">{translations.dashboard.jobSchedulingDescription}</p>
            </div>
            
            {/* Job Schedule — full width with modal trigger in header */}
            <JobSchedule
              jobs={jobs}
              properties={properties || []}
              customers={customers}
              services={services}
              trucks={trucks}
              isIndividualAccount={org.subscription_status === 'individual'}
              locale={locale}
            />

          </div>
        </main>
      </div>
    </div>
  );
}