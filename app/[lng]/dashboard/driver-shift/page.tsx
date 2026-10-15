import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DriverShiftPortal from '@/components/dashboard/DriverShiftPortal';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { canUseDispatchEngine } from '@/lib/subscriptionAccess';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getUserOrganization } from '@/lib/organization';

export default async function DriverShiftPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) redirect(`/${locale}/auth/access-pending`);

  const canAccessDispatch = await hasDashboardModuleAccess(org.id, role, 'dispatch');
  if (!canAccessDispatch) {
    redirect(`/${locale}/dashboard`);
  }

  if (!canUseDispatchEngine(org.subscription_status)) {
    redirect(`/${locale}/dashboard?restricted=true`);
  }

  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect(`/${locale}/dashboard?expired=true`);
  }

  // Fetch active fleet trucks
  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, name, plate_number, status')
    .eq('organization_id', org.id)
    .eq('is_active', true);

  // Fetch customer assets for property lookups
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', org.id);

  const customerIds = (customers || []).map((c) => c.id);

  const { data: properties } = customerIds.length > 0
    ? await supabase.from('properties').select('id').in('customer_id', customerIds)
    : { data: [] };

  const propertyIds = (properties || []).map((p) => p.id);

  // Fetch jobs assigned to fleet properties
  const { data: rawJobs } = propertyIds.length > 0
    ? await supabase
        .from('jobs')
        .select(
          'id, truck_id, route_order, job_type, status, scheduled_date, notes, cost_amount, properties(street_address, city, state, zip_code, latitude, longitude, customer_id, customers(first_name, last_name, company_name, phone, email))'
        )
        .in('property_id', propertyIds)
        .order('route_order', { ascending: true, nullsFirst: false })
    : { data: [] };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 text-left">
        <DriverShiftPortal
          trucks={trucks || []}
          jobs={(rawJobs as any) || []}
          locale={locale}
          userEmail={user.email}
          userName={user.user_metadata?.full_name}
        />
      </div>
    </main>
  );
}
