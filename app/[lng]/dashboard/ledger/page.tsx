import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import ExpenseLedger from '@/components/dashboard/ExpenseLedger';
import LogExpenseModal from '@/components/dashboard/LogExpenseModal';
import { checkTrialExpiry } from '@/lib/trialCheck'; // Import utility
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

export default async function LedgerPage({
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
  if (!org) redirect(`/${locale}/auth/access-pending`);

  // 1. SECURITY TIER GUARD: Allow 'enterprise' and active 'trial' profiles, block 'individual'
if (org.subscription_status === 'individual') {
  redirect('/dashboard?restricted=true');
}

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);

  if (trial.isExpired) {
    // Redirect them to a dedicated internal billing page to pay
    redirect('/dashboard/billing?expired=true');
  }

  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', org.id);

  const customerIds = (customers || []).map((customer) => customer.id);

  const { data: properties } = customerIds.length > 0
    ? await supabase
        .from('properties')
        .select('id')
        .in('customer_id', customerIds)
    : { data: [] };

  const propertyIds = (properties || []).map((property) => property.id);

  const [{ data: expenses }, { data: jobs }] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, jobs(id, job_type, scheduled_date)')
      .eq('organization_id', org.id)
      .order('expense_date', { ascending: false }),
    propertyIds.length > 0
      ? supabase
          .from('jobs')
          .select('id, job_type, scheduled_date, status, properties(street_address)')
          .in('property_id', propertyIds)
          .neq('status', 'archived')
          .order('scheduled_date', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />
      <div className="flex flex-1 relative">
        {/* UPDATED: Passing the explicit subscription status down to the sidebar component */}
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          {/* Main Grid Wrapper */}
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-8 text-left">
            
            {/* 1. Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.expenseLedger}</h1>
                <p className="text-xs text-slate-400 mt-1">{translations.dashboard.expenseLedgerDescription}</p>
              </div>
              <LogExpenseModal locale={locale} jobs={jobs || []} />
            </div>
            
            {/* 2. Expense Ledger - full width with modal trigger in header */}
            <ExpenseLedger expenses={expenses} locale={locale} />

          </div>
        </main>
      </div>
    </div>
  );
}