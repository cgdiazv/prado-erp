import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import JobSchedule from '@/components/dashboard/JobSchedule';
import ScheduleJobModal from '@/components/dashboard/ScheduleJobModal';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';

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

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) redirect(`/${locale}/auth/access-pending`);

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect('/dashboard/billing?expired=true');
  }

  // Fetch customer, service, and active truck records for the schedule form
  const [customersResponse, servicesResponse, trucksResponse] = await Promise.all([
    supabase.from('customers').select('id, first_name, last_name, company_name').eq('organization_id', org.id),
    supabase
      .from('services')
      .select('id, name, base_price, is_recurring_default, recurrence_interval_days, auto_charge_default')
      .eq('organization_id', org.id)
      .not('name', 'like', `${ARCHIVED_SERVICE_PREFIX}%`)
      .order('name', { ascending: true }),
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

  return (
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-6 md:px-10 pt-10 pb-8 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
            
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.jobScheduling}</h1>
                <p className="text-xs text-slate-400 mt-1">{translations.dashboard.jobSchedulingDescription}</p>
              </div>
              <ScheduleJobModal
                properties={properties || []}
                customers={customers}
                services={services}
                trucks={trucks}
                isIndividualAccount={org.subscription_status === 'individual'}
                locale={locale}
              />
            </div>
            
            {/* Job Schedule — full width with modal trigger in header */}
            <JobSchedule
              jobs={jobs}
              trucks={trucks}
              locale={locale}
            />

          </div>
    </main>
  );
}