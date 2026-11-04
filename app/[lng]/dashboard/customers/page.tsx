import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AddCustomerModal from '@/components/dashboard/AddCustomerModal';
import CustomersAccountsSection from '@/components/dashboard/CustomersAccountsSection';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
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

  const canAccessCustomers = await hasDashboardModuleAccess(org.id, role, 'customers');
  if (!canAccessCustomers) {
    redirect(`/${locale}/dashboard`);
  }

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);

  if (trial.isExpired) {
    // Redirect them to the dashboard with expired modal active
    redirect(`/${locale}/dashboard?expired=true`);
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

  return (
        <main className="flex-1 overflow-y-auto">
          {/* Main Grid Wrapper */}
          <div className="w-full px-6 md:px-10 pt-10 pb-8 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
            
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.customersTitle}</h1>
                <p className="text-xs text-slate-400 mt-1">{translations.dashboard.customersSubtitle}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex h-8 min-w-0 items-center justify-between gap-2 whitespace-nowrap bg-white border border-gray-200 px-2 rounded-lg shadow-xs">
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wide text-slate-500">{isEs ? 'Pendiente' : 'Unpaid'}</span>
                    <p className="text-sm font-bold text-slate-900">${totalUnpaid.toFixed(2)}</p>
                  </div>
                  <div className="flex h-8 min-w-0 items-center justify-between gap-2 whitespace-nowrap bg-white border border-gray-200 px-2 rounded-lg shadow-xs">
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wide text-slate-500">{isEs ? 'Pagado' : 'Paid'}</span>
                    <p className="text-sm font-bold text-slate-900">${totalPaid.toFixed(2)}</p>
                  </div>
                  <div className="flex h-8 min-w-0 items-center justify-between gap-2 whitespace-nowrap bg-white border border-gray-200 px-2 rounded-lg shadow-xs">
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wide text-slate-500">{isEs ? 'Saldo pendiente' : 'Outstanding'}</span>
                    <p className="text-sm font-bold text-slate-900">${netOutstanding.toFixed(2)}</p>
                  </div>
                </div>
                <AddCustomerModal organizationId={org.id} locale={locale} />
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
  );
}