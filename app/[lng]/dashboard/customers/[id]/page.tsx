import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import DeleteSiteButton from '@/components/DeleteSiteButton';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';
import { updateCustomer, deleteCustomer, createProperty, markInvoiceAsPaid } from '../../../../actions';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';
import { US_STATES } from '@/lib/usStates';

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
    redirect('/signup');
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
  const withoutOptional = (label: string) => label.replace(/\s*\((?:optional|opcional)\)\s*/gi, '').trim();

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
              <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">{translations.dashboard.editClientDetails}</h2>
                  <p className="text-[11px] text-slate-400 font-medium">{translations.dashboard.editClientDescription}</p>
                </div>
                
                <form action={async (formData: FormData) => {
                  'use server';
                  await updateCustomer(customerId, formData);
                }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.firstName}</label>
                      <input 
                        type="text" 
                        name="firstName" 
                        defaultValue={customer.first_name} 
                        required 
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition" 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.lastName}</label>
                      <input 
                        type="text" 
                        name="lastName" 
                        defaultValue={customer.last_name} 
                        required 
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{withoutOptional(translations.dashboard.companyOptional)}</label>
                      <input 
                        type="text" 
                        name="companyName" 
                        defaultValue={customer.company_name || ''} 
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.emailAddress}</label>
                      <input 
                        type="email" 
                        name="email" 
                        defaultValue={customer.email || ''} 
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{withoutOptional(translations.dashboard.phoneNumber)}</label>
                      <input 
                        type="text" 
                        name="phone" 
                        defaultValue={customer.phone || ''} 
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.billingAddress}</label>
                      <input 
                        type="text" 
                        name="billingAddress" 
                        defaultValue={customer.billing_address || ''} 
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <button 
                      type="submit" 
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-6 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      {translations.dashboard.saveProfileAdjustments}
                    </button>
                  </div>
                </form>
              </section>

              {/* Service Sites Container Section (MOVED UP ABOVE THE COLUMNS SPLIT) */}
            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">{translations.dashboard.serviceSites}</h2>
                <p className="text-[11px] text-slate-400 font-medium">{translations.dashboard.linkDispatchVectors}</p>
              </div>

              <form action={async (formData: FormData) => {
                'use server';
                await createProperty(customerId, formData);
              }} className="p-4 bg-slate-50 rounded-lg border border-gray-200 space-y-3">
                <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">{translations.dashboard.addNewLocation}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <AddressAutocompleteInput
                    name="streetAddress"
                    placeholder={translations.dashboard.streetAddress}
                    required
                    className="md:col-span-2 rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                  />
                  <input 
                    type="text" 
                    name="city" 
                    placeholder={translations.dashboard.city} 
                    required 
                    className="rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium" 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      name="state"
                      required
                      defaultValue=""
                      className="rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                    >
                      <option value="">{isEs ? 'Selecciona estado' : 'Select state'}</option>
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      name="zipCode" 
                      placeholder={translations.dashboard.zip} 
                      required 
                      className="rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium" 
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input 
                    type="text" 
                    name="serviceNotes" 
                    placeholder={translations.dashboard.gateCodesLabel} 
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium" 
                  />
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-4 py-2 rounded-md transition shadow-xs whitespace-nowrap cursor-pointer"
                  >
                    {translations.dashboard.linkServiceSite}
                  </button>
                </div>
              </form>

              {properties && properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  {properties.map((prop) => (
                    <div key={prop.id} className="p-3 bg-slate-50 rounded-lg border border-gray-200/60 text-xs relative group">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DeleteSiteButton propertyId={prop.id} customerId={customerId} />
                      </div>
                      <p className="font-semibold text-slate-800 pr-6">{prop.street_address}</p>
                      <p className="text-slate-400 mt-0.5">{prop.city}, {prop.state} {prop.zip_code}</p>
                      {prop.service_notes && (
                        <div className="mt-2 text-[11px] bg-amber-50/60 text-amber-900 p-2 rounded border border-amber-200/60 font-medium">
                          <strong>Notes:</strong> {prop.service_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs italic pt-2 text-center">{translations.dashboard.noPropertiesRegistered}</p>
              )}
            </section>

              {/* Job History Manifest Timeline Log */}
              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
                <div className="mb-4 border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translations.dashboard.operationalJobLog}</h2>
                </div>
                {customerJobs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="pb-2">{translations.dashboard.date}</th>
                          <th className="pb-2">{translations.dashboard.location}</th>
                          <th className="pb-2">{translations.dashboard.type}</th>
                          <th className="pb-2 text-right">{translations.dashboard.cost}</th>
                          <th className="pb-2 text-right">{translations.dashboard.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
                        {customerJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-semibold text-slate-800">{job.scheduled_date}</td>
                            <td className="py-3 max-w-[180px] truncate text-slate-400">{job.properties?.street_address}</td>
                            <td className="py-3">
                              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                                {job.job_type}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono font-semibold text-slate-700">${job.cost_amount}</td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                                job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic text-center py-4">{translations.dashboard.noJobsLogged}</p>
                )}
              </section>

              {/* Individual Client Financial Statements Ledger */}
              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
                <div className="mb-4 border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translations.dashboard.invoicesAndLedger}</h2>
                </div>
                {invoices && invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="pb-2">{translations.dashboard.dueDate}</th>
                          <th className="pb-2">{translations.dashboard.taxCharge}</th>
                          <th className="pb-2 text-right">{translations.dashboard.totalOwed}</th>
                          <th className="pb-2 text-right">{translations.dashboard.paymentStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-slate-600">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 text-slate-800 font-semibold">{inv.due_date}</td>
                            <td className="py-3 font-mono text-slate-400">${inv.tax_amount}</td>
                            <td className="py-3 text-right font-mono font-bold text-slate-950">${inv.total_amount}</td>
                            <td className="py-3 text-right">
                              {inv.status === 'paid' ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded text-[10px] uppercase font-bold tracking-wide">
                                  {translations.dashboard.paid}
                                </span>
                              ) : (
                                <form
                                  action={async () => {
                                    'use server';
                                    await markInvoiceAsPaid(inv.id, customerId);
                                  }}
                                  className="inline-block"
                                >
                                  <button
                                    type="submit"
                                    title={translations.dashboard.markAsPaid}
                                    className="px-2 py-0.5 bg-red-50 hover:bg-emerald-50 text-red-700 hover:text-emerald-700 border border-red-200/80 hover:border-emerald-200/80 rounded text-[10px] uppercase font-bold tracking-wide transition cursor-pointer"
                                  >
                                    {translations.dashboard.unpaid}
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic text-center py-4">{translations.dashboard.noStatements}</p>
                )}
              </section>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}