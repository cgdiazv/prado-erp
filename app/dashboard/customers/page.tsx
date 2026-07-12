import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Customers from '@/components/dashboard/Customers';
import AddCustomerForm from '@/components/dashboard/AddCustomerForm';

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase.from('organizations').select('id, name').eq('owner_id', user.id).single();
  if (!org) redirect('/signup');

  const { data: customers } = await supabase.from('customers').select('*').eq('organization_id', org.id);

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        <DashboardSidebar />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Accounts Manager</h1>
                <p className="text-xs text-slate-400 mt-1">Review business directory logs and coordinate profiles</p>
              </div>
              <Customers customers={customers} />
            </div>
            <div className="lg:col-span-1 pt-14">
              <AddCustomerForm organizationId={org.id} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}