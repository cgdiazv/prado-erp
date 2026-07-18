import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import CustomerDetailsForm from '@/components/dashboard/CustomerDetailsForm';
import CustomerInvoicesTable from '@/components/dashboard/CustomerInvoicesTable';
import CustomerJobLogTable from '@/components/dashboard/CustomerJobLogTable';
import ServiceSitesSection from '@/components/dashboard/ServiceSitesSection';
import { deleteCustomer } from '../../../../actions';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

interface CustomerPageProps {
  params: Promise<{ id: string; lng?: string }> | { id: string; lng?: string };
}

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const resolvedParams = await params;
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
  const { organization: org } = await getUserOrganization(user.id);

  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
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
    const fallbackInitial = org.name ? org.name.charAt(0) : "C";
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
        <DashboardNavbar userInitials={fallbackInitial} organizationLogoUrl={org.logo_url || ''} />
        <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status ?? undefined} locale={locale} />
        <main className="flex-1 p-12 text-left">
            <h1 className="text-xl font-bold text-gray-800">{translations.dashboard.customerNotFound}</h1>
            <Link href="/dashboard/customers" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
              {translations.dashboard.returnToCustomers}
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />
      
      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status ?? undefined} locale={locale} />

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-8 text-left">
            
            {/* Navigation Breadcrumb Bar & Actions Layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="flex flex-col gap-1">
                <Link 
                  href="/dashboard/customers" 
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition"
                >
                  {translations.dashboard.backToCustomers}
                </Link>
              </div>

              <form action={async () => {
                'use server';
                await deleteCustomer(customerId);
                redirect('/dashboard/customers');
              }}>
                <button 
                  type="submit"
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold py-1.5 px-3.5 rounded-lg transition shadow-xs cursor-pointer"
                >
                  {translations.dashboard.deleteClientProfile}
                </button>
              </form>
            </div>

            {/* Client Master Profile Banner Section */}
            <header className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md tracking-wide">
                    {translations.dashboard.crmClientAccount}
                  </span>
                  <h1 className="text-3xl font-bold text-slate-900 mt-3">
                    {customer.first_name} {customer.last_name}
                  </h1>
                  <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
                    {customer.company_name || translations.dashboard.individualResidentialAccount}
                  </p>
                  {customer.autopay_enabled ? (
                    <div className="mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      {isEs ? 'Auto cobro activo' : 'Auto Pay Active'}
                    </div>
                  ) : null}
                </div>
                
                <div className="text-xs text-slate-600 space-y-1.5 md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 min-w-[200px]">
                  <div><strong className="text-slate-400 uppercase font-bold text-[10px] tracking-wide block md:inline md:mr-1">{translations.dashboard.email}:</strong> {customer.email || '—'}</div>
                  <div><strong className="text-slate-400 uppercase font-bold text-[10px] tracking-wide block md:inline md:mr-1">{translations.dashboard.phone}:</strong> {customer.phone || '—'}</div>
                  <div><strong className="text-slate-400 uppercase font-bold text-[10px] tracking-wide block md:inline md:mr-1">{translations.dashboard.billingAddressLabel}:</strong> {customer.billing_address || '—'}</div>
                </div>
              </div>
            </header>

            {/* MAIN DATA VIEW AREA */}
            <div className="space-y-8">
              
              {/* HORIZONTAL PROFILE MANAGEMENT WORKSPACE FORM */}
              <CustomerDetailsForm
                customerId={customerId}
                locale={locale}
                initialFirstName={customer.first_name}
                initialLastName={customer.last_name}
                initialCompanyName={customer.company_name || ''}
                initialEmail={customer.email || ''}
                initialPhone={customer.phone || ''}
                initialBillingAddress={customer.billing_address || ''}
              />

              {/* Service Sites Container Section (MOVED UP ABOVE THE COLUMNS SPLIT) */}
            <ServiceSitesSection customerId={customerId} locale={locale} properties={properties || []} />

              {/* Job History Manifest Timeline Log */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translations.dashboard.operationalJobLog}</h2>
                <CustomerJobLogTable jobs={customerJobs} locale={locale} />
              </div>

              <CustomerInvoicesTable invoices={invoices || []} customerId={customerId} locale={locale} />

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}