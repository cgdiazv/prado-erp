import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Metrics from '@/components/dashboard/Metrics';

export default async function DashboardHome() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single();

  if (!org) redirect('/signup');

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
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        <DashboardSidebar />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-8 text-left">
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{org.name}</h1>
              <p className="text-xs text-slate-500 font-medium">Workspace operational metrics and fleet logs hub</p>
            </div>
            
            <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} />

            <div className="p-8 bg-white rounded-xl border border-gray-200 shadow-xs max-w-2xl">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">System Broadcast</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Welcome to your command console terminal interface. Use the vertical navigation panel on the left sidebar to manage specialized operations profiles.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}