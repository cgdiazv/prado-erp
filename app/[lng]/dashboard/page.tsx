import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Metrics from '@/components/dashboard/Metrics';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import TrialBanner from '@/components/TrialBanner';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const supabase = await createClient();
  const translations = getTranslations(locale);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  // Fetch organization context along with trial parameters
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, logo_url, trial_starts_at, subscription_status')
    .eq('owner_id', user.id)
    .single();

  if (!org) redirect('/signup');

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);

  if (trial.isExpired) {
    // Instead of moving routes, we append the query parameter to the current view.
    // The parent layout will instantly pick this up and lock down the screen with your modal!
    redirect('/dashboard?expired=true');
  }

  // Fetch only what's necessary for high-level high-impact KPIs
  const [expensesResponse, customersResponse] = await Promise.all([
    supabase.from('expenses').select('amount').eq('organization_id', org.id),
    supabase.from('customers').select('id').eq('organization_id', org.id)
  ]);

  const expenses = expensesResponse.data || [];
  const customers = customersResponse.data || [];
  const customerIds = customers.map(c => c.id);

  const invoicesResponse = customerIds.length > 0
    ? await supabase.from('invoices').select('total_amount').in('customer_id', customerIds)
    : { data: [] };

  const invoices = invoicesResponse.data || [];

  const totalRevenue = invoices.reduce((acc, inv) => acc + Number(inv.total_amount), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />
      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />
        
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-8 text-left">
            
            {/* Conditional Trial Alert Banner Asset */}
            {org.subscription_status === 'trial' && org.trial_starts_at && (
              <TrialBanner trialStartsAt={org.trial_starts_at} locale={locale} />
            )}
            
            {/* Context Subheader */}
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{org.name}</h1>
              <p className="text-xs text-slate-500 font-medium">{translations.dashboard.metricsSubtitle}</p>
            </div>
            
            {/* General Performance Metrics Cards */}
            <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} locale={locale} />

            {/* Visual Metrics Performance Chart Panel */}
            <PerformanceChart totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} locale={locale} />

          </div>
        </main>
      </div>
    </div>
  );
}