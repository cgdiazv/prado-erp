import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { updateCustomer, deleteCustomer, createProperty } from '../../actions';

interface CustomerPageProps {
  params: { id: string };
}

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const { id: customerId } = params;
  const supabase = await createClient();

  // 1. Verify authenticated context
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch all components securely isolated to this customer's profile scope
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
      <div className="min-h-screen bg-gray-50 p-12 text-center">
        <h1 className="text-xl font-bold text-gray-800">Customer Profile Not Found</h1>
        <Link href="/" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          ← Return to Dispatch Hub
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb Bar */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition">
            ← Back to Dispatch Hub
          </Link>

          {/* SECURE ISOLATED DELETE MANAGEMENT TRIGGER */}
          <form action={async () => {
            'use server';
            await deleteCustomer(customerId);
            redirect('/');
          }}>
            <button 
              type="submit"
              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold py-1 px-3 rounded-lg transition"
            >
              Delete Client Profile
            </button>
          </form>
        </div>

        {/* Client Master Profile Card */}
        <header className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md tracking-wide">
                CRM Client Account
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
                {customer.first_name} {customer.last_name}
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                {customer.company_name || 'Individual Residential Account'}
              </p>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1 md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
              <div><strong className="text-gray-700">Email:</strong> {customer.email || '—'}</div>
              <div><strong className="text-gray-700">Phone:</strong> {customer.phone || '—'}</div>
              <div><strong className="text-gray-700">Billing Address:</strong> {customer.billing_address || '—'}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Properties Layout & Live Edit Management Workspace */}
          <div className="md:col-span-1 space-y-6">
            
            {/* EDIT PROFILE INPUT FORMS CONTAINER */}
            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-md font-bold text-gray-800 mb-1">Edit Client Details</h2>
              <p className="text-[11px] text-gray-400 mb-3">Modify account registration entries directly.</p>
              
              <form action={async (formData: FormData) => {
                'use server';
                await updateCustomer(customerId, formData);
              }} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">First Name</label>
                  <input 
                    type="text" 
                    name="firstName" 
                    defaultValue={customer.first_name} 
                    required 
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium" 
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    name="lastName" 
                    defaultValue={customer.last_name} 
                    required 
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Company (Optional)</label>
                  <input 
                    type="text" 
                    name="companyName" 
                    defaultValue={customer.company_name || ''} 
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    defaultValue={customer.email || ''} 
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium" 
                  />
                </div>

                {/* NEW PHONE FIELD */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    name="phone" 
                    defaultValue={customer.phone || ''} 
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium" 
                  />
                </div>

                {/* NEW BILLING ADDRESS FIELD */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Billing Address</label>
                  <input 
                    type="text" 
                    name="billingAddress" 
                    defaultValue={customer.billing_address || ''} 
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg transition shadow-sm"
                >
                  Save Profile Adjustments
                </button>
              </form>
            </section>

            {/* Service Sites Container */}
            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Service Sites</h2>

              {/* INLINE ADD SERVICE SITE (PROPERTY) FORM */}
              <form action={async (formData: FormData) => {
                'use server';
                await createProperty(customerId, formData);
              }} className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <p className="text-[11px] font-bold uppercase text-gray-500 tracking-wide">Add New Service Site</p>
                
                <input 
                  type="text" 
                  name="streetAddress" 
                  placeholder="Street Address" 
                  required 
                  className="w-full rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
                />
                
                <div className="grid grid-cols-3 gap-1.5">
                  <input 
                    type="text" 
                    name="city" 
                    placeholder="City" 
                    required 
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
                  />
                  <input 
                    type="text" 
                    name="state" 
                    placeholder="State" 
                    required 
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
                  />
                  <input 
                    type="text" 
                    name="zipCode" 
                    placeholder="Zip" 
                    required 
                    className="w-full rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
                  />
                </div>

                <input 
                  type="text" 
                  name="serviceNotes" 
                  placeholder="Gate codes, pet notices... (Optional)" 
                  className="w-full rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
                />

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-1.5 rounded-md transition shadow-sm"
                >
                  + Link Service Site
                </button>
              </form>

              {/* Properties Display List */}
              {properties && properties.length > 0 ? (
                <div className="space-y-3">
                  {properties.map((prop) => (
                    <div key={prop.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                      <p className="font-semibold text-gray-800">{prop.street_address}</p>
                      <p className="text-gray-400 mt-0.5">{prop.city}, {prop.state} {prop.zip_code}</p>
                      {prop.service_notes && (
                        <div className="mt-2 text-[11px] bg-amber-50 text-amber-800 p-1.5 rounded border border-amber-100">
                          <strong>Notes:</strong> {prop.service_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs italic">No properties registered.</p>
              )}
            </section>
          </div>

          {/* Right Column: Dynamic Timeline Records & Accounting Ledger */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Job History Manifest Timeline */}
            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Operational Job Log</h2>
              {customerJobs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-medium uppercase tracking-wider">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2 text-right">Cost</th>
                        <th className="pb-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                      {customerJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 font-semibold text-gray-700">{job.scheduled_date}</td>
                          <td className="py-2.5 max-w-[140px] truncate text-gray-400">{job.properties?.street_address}</td>
                          <td className="py-2.5"><span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">{job.job_type}</span></td>
                          <td className="py-2.5 text-right font-mono">${job.cost_amount}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
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
                <p className="text-gray-400 text-xs italic">No service visits scheduled or logged.</p>
              )}
            </section>

            {/* Individual Client Financial Statements Ledger */}
            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Invoices & Statement Ledger</h2>
              {invoices && invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-medium uppercase tracking-wider">
                        <th className="pb-2">Due Date</th>
                        <th className="pb-2">Tax Charge</th>
                        <th className="pb-2 text-right">Total Owed</th>
                        <th className="pb-2 text-right">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/50">
                          <td className="py-3 text-gray-700 font-semibold">{inv.due_date}</td>
                          <td className="py-3 font-mono text-gray-400">${inv.tax_amount}</td>
                          <td className="py-3 text-right font-mono font-bold text-gray-950">${inv.total_amount}</td>
                          <td className="py-3 text-right">
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] uppercase font-bold tracking-wide">
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-xs italic">No statements cut for this profile yet.</p>
              )}
            </section>

          </div>
        </div>

      </div>
    </main>
  );
}