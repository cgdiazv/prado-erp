import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import AddCustomerModal from '@/components/dashboard/AddCustomerModal';
import CustomersAccountsSection from '@/components/dashboard/CustomersAccountsSection';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

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

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) redirect(`/${locale}/auth/access-pending`);
  const canViewImportExport = role === 'owner' || role === 'admin';

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

  const paidBalances = (invoices || []).reduce<Record<string, number>>((accumulator, invoice) => {
    if (invoice.status !== 'paid') return accumulator;

    const amount = Number(invoice.total_amount || 0);
    accumulator[invoice.customer_id] = (accumulator[invoice.customer_id] || 0) + (Number.isFinite(amount) ? amount : 0);
    return accumulator;
  }, {});

  const totalUnpaid = Object.values(unpaidBalances).reduce((sum, amount) => sum + amount, 0);
  const totalPaid = Object.values(paidBalances).reduce((sum, amount) => sum + amount, 0);
  const netOutstanding = Math.max(totalUnpaid - totalPaid, 0);
  const isEs = locale.toLowerCase().startsWith('es');

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        {/* UPDATED: Passing subscription_status to match the conditional sidebar links */}
        <DashboardSidebar
          subscriptionStatus={org.subscription_status}
          locale={locale}
          canViewImportExport={canViewImportExport}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {/* Main Grid Wrapper */}
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
            
            {/* 1. Header Row - Spans completely across the entire width */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.customersTitle}</h1>
                <p className="text-xs text-slate-400 mt-1">{translations.dashboard.customersSubtitle}</p>
              </div>
              <AddCustomerModal organizationId={org.id} locale={locale} />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible mb-2 sm:mb-5 md:mb-2">
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">{isEs ? 'Total pendiente' : 'Total Unpaid'}</span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">${totalUnpaid.toFixed(2)}</p>
              </div>
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">{isEs ? 'Total pagado' : 'Total Paid'}</span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">${totalPaid.toFixed(2)}</p>
              </div>
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{isEs ? 'Neto pendiente' : 'Net Outstanding'}</span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">${netOutstanding.toFixed(2)}</p>
              </div>
            </div>
            
            {/* 2. Customers Section - Now full width */}
            <CustomersAccountsSection
              customers={customers}
              unpaidBalances={unpaidBalances}
              paidBalances={paidBalances}
              locale={locale}
            />

          </div>
        </main>
      </div>
    </div>
  );
}