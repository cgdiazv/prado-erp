import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CustomerDetailTabs from '@/components/dashboard/CustomerDetailTabs';
import CustomerEmailModal from '@/components/dashboard/CustomerEmailModal';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

interface CustomerPageProps {
  params: Promise<{ id: string; lng?: string }> | { id: string; lng?: string };
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}

export default async function CustomerDetailPage({ params, searchParams }: CustomerPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTab = resolvedSearchParams.tab;
  const { id: customerId, lng } = resolvedParams;
  const locale = lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const translations = getTranslations(locale);
  const supabase = await createClient();

  // 1. Verify authenticated context
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch workspace organization context
  const { organization: org, role } = await getUserOrganization(user.id);

  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const canAccessCustomers = await hasDashboardModuleAccess(org.id, role, 'customers');
  if (!canAccessCustomers) {
    redirect(`/${locale}/dashboard`);
  }

  // 3. Fetch all components securely isolated to this customer's profile scope
  const [
    { data: customer },
    { data: properties },
    { data: invoices },
    { data: jobs }
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase.from('properties').select('*').eq('customer_id', customerId),
    supabase.from('invoices').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('jobs')
      .select('*, properties(customer_id, street_address)')
      .order('scheduled_date', { ascending: false })
  ]);

  // Filter out jobs that only belong to this customer's distinct properties
  const customerJobs = jobs?.filter((job) => job.properties && job.properties.customer_id === customerId) || [];

  if (!customer) {
    return (
      <main className="flex-1 px-6 md:px-10 pt-10 pb-8 text-left">
        <h1 className="text-xl font-bold text-gray-800">{translations.dashboard.customerNotFound}</h1>
        <Link href="/dashboard/customers" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          {translations.dashboard.returnToCustomers}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 space-y-8 text-left">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link
              href="/dashboard/customers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition"
            >
              {translations.dashboard.backToCustomers}
            </Link>
          </div>
        </div>

        {/* Customer Master Profile Banner Section */}
        <header className="space-y-2.5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {customer.first_name} {customer.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {customer.company_name || translations.dashboard.individualResidentialAccount}
              </p>
              {customer.autopay_enabled ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  {isEs ? 'Auto cobro activo' : 'Auto Pay Active'}
                </span>
              ) : null}
            </div>
          </div>

          {/* Contact Details directly under company name */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-600 pt-0.5">
            <div>
              <strong className="text-slate-400 uppercase font-bold text-[10px] tracking-wide mr-1.5">{translations.dashboard.email}:</strong>
              {customer.email ? (
                <CustomerEmailModal
                  locale={locale}
                  customerId={customer.id}
                  customerEmail={customer.email}
                  customerName={`${customer.first_name} ${customer.last_name}`.trim()}
                  context="customer_profile"
                  className="cursor-pointer text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                />
              ) : (
                '—'
              )}
            </div>
            <div>
              <strong className="text-slate-400 uppercase font-bold text-[10px] tracking-wide mr-1.5">{translations.dashboard.phone}:</strong>
              <span className="text-slate-700 font-medium">{customer.phone || '—'}</span>
            </div>
            <div>
              <strong className="text-slate-400 uppercase font-bold text-[10px] tracking-wide mr-1.5">{translations.dashboard.billingAddressLabel}:</strong>
              <span className="text-slate-700 font-medium">{customer.billing_address || '—'}</span>
            </div>
          </div>
        </header>

        {/* Horizontal Sub-tabs (Customer Details | Jobs Log | Invoice) */}
        <CustomerDetailTabs
          customerId={customerId}
          locale={locale}
          initialTab={initialTab}
          customer={customer}
          properties={properties || []}
          customerJobs={customerJobs}
          invoices={invoices || []}
          orgTaxRatePercent={Number(org.invoice_tax_rate_percent ?? 0)}
        />
      </div>
    </main>
  );
}
