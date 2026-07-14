import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Customers from '@/components/dashboard/Customers';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';

export default async function CustomersPage({
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
    // Redirect them to a dedicated internal billing page to pay
    redirect('/dashboard/billing?expired=true');
  }

  const { data: customers } = await supabase.from('customers').select('*').eq('organization_id', org.id);
  const customerIds = customers?.map((customer) => customer.id) || [];
  const { data: invoices } = customerIds.length > 0
    ? await supabase
        .from('invoices')
        .select('customer_id, total_amount, status')
        .in('customer_id', customerIds)
    : { data: [] };

  const unpaidBalances = (invoices || []).reduce<Record<string, number>>((accumulator, invoice) => {
    if (invoice.status !== 'unpaid') return accumulator;

    const amount = Number(invoice.total_amount || 0);
    accumulator[invoice.customer_id] = (accumulator[invoice.customer_id] || 0) + (Number.isFinite(amount) ? amount : 0);
    return accumulator;
  }, {});

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        {/* UPDATED: Passing subscription_status to match the conditional sidebar links */}
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          {/* Main Grid Wrapper */}
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-8 text-left">
            
            {/* 1. Header Row - Spans completely across the entire width */}
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.customersTitle}</h1>
              <p className="text-xs text-slate-400 mt-1">{translations.dashboard.customersSubtitle}</p>
            </div>
            
            {/* 2. Customers Section - Now full width */}
            <Customers customers={customers} unpaidBalances={unpaidBalances} organizationId={org.id} locale={locale} />

          </div>
        </main>
      </div>
    </div>
  );
}