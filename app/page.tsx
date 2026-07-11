import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DispatchMap from '@/components/DispatchMap';
import { createJob, completeJob, createExpense, createCustomer } from './actions';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
}

interface Property {
  id: string;
  street_address: string;
  latitude: number | null;
  longitude: number | null;
  customer_id: string;
}

interface Job {
  id: string;
  scheduled_date: string;
  job_type: string;
  cost_amount: number;
  status: string;
  properties?: {
    street_address: string;
    latitude: number | null;
    longitude: number | null;
    customer_id: string;
  } | null;
}

interface Invoice {
  id: string;
  due_date: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  created_at: string;
}

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  vendor?: string | null;
  description?: string | null;
  amount: number;
  organization_id: string;
}

export default async function DashboardHome() {
  const supabase = await createClient();

  // 1. Check authentication session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch organization context
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single();

  if (!org) {
    redirect('/signup');
  }

  // 3. Parallel Tenant Isolated Fetching
  const customersResponse = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', org.id);
  const customers = customersResponse.data as Customer[] | null;

  const [propertiesResponse, jobsResponse, invoicesResponse, expensesResponse] = await Promise.all([
    supabase.from('properties').select('*'),
    supabase.from('jobs').select('*, properties(street_address, latitude, longitude, customer_id)').order('scheduled_date', { ascending: true }),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').eq('organization_id', org.id).order('expense_date', { ascending: false })
  ]);

  const properties = propertiesResponse.data as Property[] | null;
  const jobs = jobsResponse.data as Job[] | null;
  const invoices = invoicesResponse.data as Invoice[] | null;
  const expenses = expensesResponse.data as Expense[] | null;

  // Financial Metrics
  const totalRevenue = invoices?.reduce((acc, inv) => acc + Number(inv.total_amount), 0) || 0;
  const totalExpenses = expenses?.reduce((acc, exp) => acc + Number(exp.amount), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-6xl mx-auto">
        
        {/* TOP BAR */}
        <header className="mb-8 border-b pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-emerald-700">Prado ERP</h1>
            <p className="text-sm text-gray-500 font-medium">Workspace: <span className="text-gray-800 font-bold">{org.name}</span></p>
          </div>
          <form action={async () => {
            'use server';
            const serverSupabase = await createClient();
            await serverSupabase.auth.signOut();
            redirect('/login');
          }}>
            <button type="submit" className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition shadow-xs">
              Sign Out
            </button>
          </form>
        </header>

        {/* METRICS PANELS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-xs uppercase font-medium text-gray-400 block mb-1">Total Invoiced Revenue</span>
            <span className="text-2xl font-bold text-gray-950 font-mono">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-xs uppercase font-medium text-gray-400 block mb-1">Tracked Expenses</span>
            <span className="text-2xl font-bold text-red-600 font-mono">${totalExpenses.toFixed(2)}</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-xs uppercase font-medium text-gray-400 block mb-1">Net Income</span>
            <span className={`text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${netProfit.toFixed(2)}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* ACTIVE CUSTOMERS */}
            <section className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Active Customers</h2>
              {customers && customers.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                            <Link href={`/customers/${customer.id}`}>{customer.first_name} {customer.last_name}</Link>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{customer.company_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{customer.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No customers linked to this workspace.</p>
              )}
            </section>

            {/* ROUTE ENGINE COMPONENT */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-1 text-gray-800">Google Maps Route Dispatch</h2>
              <p className="text-xs text-gray-400 mb-4">Visual stop optimization map coordinates.</p>
              <div className="mb-4">
                <DispatchMap stops={jobs?.filter(j => j.status === 'scheduled').map(j => ({ id: j.id, street_address: j.properties?.street_address || '', latitude: j.properties?.latitude || null, longitude: j.properties?.longitude || null, job_type: j.job_type })) || []} />
              </div>

              {/* Today's Route List Display */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Today's Route Order</span>
                {jobs?.filter(j => j.status === 'scheduled').map((job, idx) => (
                  <div key={job.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border text-xs">
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-md text-[10px] whitespace-nowrap tracking-wide uppercase">Stop {idx + 1}</span>
                    <span className="font-medium text-gray-800">{job.properties?.street_address}</span>
                    <span className="ml-auto text-gray-400 bg-white px-2 py-0.5 rounded border text-[11px]">Service: {job.job_type}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* LIVE SCHEDULE TRACKING */}
            <section className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Live Job Schedule</h2>
              {jobs && jobs.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-700">{job.scheduled_date}</td>
                          <td className="px-4 py-3 text-gray-500">{job.properties?.street_address || '—'}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold">{job.job_type}</span></td>
                          <td className="px-4 py-3 font-mono">${job.cost_amount}</td>
                          <td className="px-4 py-3 text-right">
                            {job.status === 'scheduled' && (
                              <form action={async () => {
                                'use server';
                                await completeJob(job.id);
                              }}>
                                <button type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-3 rounded shadow-xs transition">Mark Done</button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No active dispatch logs found.</p>
              )}
            </section>

            {/* EXPENSE LEDGER */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Tracked Expenses</h2>
              {expenses && expenses.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 text-xs">{exp.expense_date}</td>
                          <td className="px-4 py-3"><span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-medium">{exp.category}</span></td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{exp.description || '—'}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-mono font-semibold">-${exp.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">No operational expenses reported.</p>
              )}
            </section>

          </div>

          {/* INPUT FORM SIDEBAR PANELS */}
          <div className="lg:col-span-1 space-y-6">

            {/* CRM ACCOUNT INGESTION PANEL */}
<section className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
  <h3 className="text-lg font-semibold mb-1 text-gray-800">Add New Customer</h3>
  <p className="text-xs text-gray-400 mb-3">Onboard a client account into this workspace profile.</p>
  
  <form action={createCustomer as any} className="space-y-3">
    <input type="hidden" name="organizationId" value={org.id} />
    <div className="grid grid-cols-2 gap-2">
      <input 
        type="text" 
        name="firstName" 
        placeholder="First Name" 
        required 
        className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
      />
      <input 
        type="text" 
        name="lastName" 
        placeholder="Last Name" 
        required 
        className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
      />
    </div>
    
    <input 
      type="text" 
      name="companyName" 
      placeholder="Company Name (Optional)" 
      className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
    />
    
    <input 
      type="email" 
      name="email" 
      placeholder="Customer Email Address" 
      className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white" 
    />

    <button 
      type="submit" 
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-xs font-semibold"
    >
      Register Client Profile
    </button>
  </form>
</section>
            
            {/* SCHEDULER */}
            <section className="bg-white p-5 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Schedule Job</h3>
              <form action={createJob as any} className="space-y-3">
                <select name="propertyId" required className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none">
                  <option value="">-- Select Target Site --</option>
                  {properties?.map((p) => (
                    <option key={p.id} value={p.id}>{p.street_address}</option>
                  ))}
                </select>
                <input type="date" name="scheduledDate" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
                <select name="jobType" required className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none">
                  <option value="Mowing">Standard Lawn Mowing</option>
                  <option value="Trimming">Hedge & Tree Trimming</option>
                </select>
                <input type="number" step="0.01" name="costAmount" placeholder="Price ($)" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-xs">
                  Dispatch Job Target
                </button>
              </form>
            </section>

            {/* EXPENSES FORMS */}
            <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Log Expense</h3>
              <form action={createExpense as any} className="space-y-3">
                <input type="date" name="expenseDate" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
                <select name="category" required className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none">
                  <option value="Fuel">Fuel</option>
                  <option value="Equipment Maintenance">Equipment Maintenance</option>
                </select>
                <input type="number" step="0.01" name="amount" placeholder="Amount ($)" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-xs">
                  Save Expense Entry
                </button>
              </form>
            </section>
            
          </div>
        </div>

      </div>
    </main>
  );
}