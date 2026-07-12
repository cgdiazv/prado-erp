import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import JobSchedule from '@/components/dashboard/JobSchedule';
import ScheduleJobForm from '@/components/dashboard/ScheduleJobForm';
import { checkTrialExpiry } from '@/lib/trialCheck'; // Import utility

export default async function SchedulePage() {
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

  // UPDATED: Now fetches names and company descriptors to display in the customer selection list
  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, company_name')
    .eq('organization_id', org.id);
    
  const customerIds = customers?.map(c => c.id) || [];

  const properties = customerIds.length > 0
    ? (await supabase.from('properties').select('*').in('customer_id', customerIds)).data
    : [];
  const propertyIds = properties?.map(p => p.id) || [];

  const jobs = propertyIds.length > 0
    ? (await supabase.from('jobs').select('*, properties(street_address, latitude, longitude, customer_id)').in('property_id', propertyIds).order('scheduled_date', { ascending: true })).data
    : [];

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        {/* UPDATED: Passing subscription_status to match the conditional sidebar links */}
        <DashboardSidebar subscriptionStatus={org.subscription_status} />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          {/* Main Grid Wrapper */}
          <div className="max-w-5xl ml-0 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            
            {/* 1. Header Row - Spans full width above both columns */}
            <div className="lg:col-span-3 flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Scheduling</h1>
              <p className="text-xs text-slate-400 mt-1">Review operational execution timelines and work orders</p>
            </div>
            
            {/* 2. Middle Content Column - Sits right below the divider line */}
            <div className="lg:col-span-2">
              <JobSchedule jobs={jobs} />
            </div>
            
            {/* 3. Right Sidebar Form Column - Now explicitly supplies the updated customer metadata array */}
            <div className="lg:col-span-1">
              <ScheduleJobForm properties={properties} customers={customers} />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}