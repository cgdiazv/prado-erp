import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Customers from '@/components/dashboard/Customers';
import AddCustomerForm from '@/components/dashboard/AddCustomerForm';
import { checkTrialExpiry } from '@/lib/trialCheck'; // Import utility

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
  .from('organizations')
  .select('id, name, trial_starts_at, subscription_status')
  .eq('owner_id', user.id)
  .single();
  if (!org) redirect('/signup');

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);

  if (trial.isExpired) {
    // Redirect them to a dedicated internal billing page to pay
    redirect('/dashboard/billing?expired=true');
  }

  const { data: customers } = await supabase.from('customers').select('*').eq('organization_id', org.id);

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        <DashboardSidebar />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          {/* Main Grid Wrapper */}
          <div className="max-w-5xl ml-0 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            
            {/* 1. Header Row - Spans completely across the entire 3-column top width */}
            <div className="lg:col-span-3 flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Accounts Manager</h1>
              <p className="text-xs text-slate-400 mt-1">Review business directory logs and coordinate profiles</p>
            </div>
            
            {/* 2. Middle Content Column - Sits flush against the grey divider line */}
            <div className="lg:col-span-2">
              <Customers customers={customers} />
            </div>
            
            {/* 3. Right Sidebar Form Column - Aligns perfectly to the top of the middle content */}
            <div className="lg:col-span-1">
              <AddCustomerForm organizationId={org.id} />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}