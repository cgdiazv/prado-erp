import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import JobSchedule from '@/components/dashboard/JobSchedule';
import ScheduleJobForm from '@/components/dashboard/ScheduleJobForm';

export default async function SchedulePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase.from('organizations').select('id, name').eq('owner_id', user.id).single();
  if (!org) redirect('/signup');

  const { data: customers } = await supabase.from('customers').select('id').eq('organization_id', org.id);
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
        <DashboardSidebar />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Scheduling</h1>
                <p className="text-xs text-slate-400 mt-1">Review operational execution timelines and work orders</p>
              </div>
              <JobSchedule jobs={jobs} />
            </div>
            <div className="lg:col-span-1 pt-14">
              <ScheduleJobForm properties={properties} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}