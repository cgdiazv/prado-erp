import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Metrics from '@/components/dashboard/Metrics';
import Customers from '@/components/dashboard/Customers';
import RouteEngine from '@/components/dashboard/RouteEngine';
import JobSchedule from '@/components/dashboard/JobSchedule';
import ExpenseLedger from '@/components/dashboard/ExpenseLedger';
import AddCustomerForm from '@/components/dashboard/AddCustomerForm';
import ScheduleJobForm from '@/components/dashboard/ScheduleJobForm';
import LogExpenseForm from '@/components/dashboard/LogExpenseForm';

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

  // 1. Check authentication session securely
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Fetch specific workspace organization context
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single();

  if (!org) {
    redirect('/signup');
  }

  // 3. Secure Multi-Tenant Data Retrieval
  const [customersResponse, expensesResponse] = await Promise.all([
    supabase.from('customers').select('*').eq('organization_id', org.id),
    supabase.from('expenses').select('*').eq('organization_id', org.id).order('expense_date', { ascending: false })
  ]);

  const customers = customersResponse.data as Customer[] | null;
  const expenses = expensesResponse.data as Expense[] | null;

  const customerIds = customers?.map(c => c.id) || [];

  // Fetch properties belonging directly to active workspace customers
  const propertiesResponse = customerIds.length > 0
    ? await supabase.from('properties').select('*').in('customer_id', customerIds)
    : { data: [] };

  const properties = propertiesResponse.data as Property[] | null;
  const propertyIds = properties?.map(p => p.id) || [];

  const [jobsResponse, invoicesResponse] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, properties(street_address, latitude, longitude, customer_id)')
      .in('property_id', propertyIds)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('invoices')
      .select('*')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
  ]);

  const jobs = jobsResponse.data as Job[] | null;
  const invoices = invoicesResponse.data as Invoice[] | null;

  // Compile Financial Accounting KPIs
  const totalRevenue = invoices?.reduce((acc, inv) => acc + Number(inv.total_amount), 0) || 0;
  const totalExpenses = expenses?.reduce((acc, exp) => acc + Number(exp.amount), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} />
      
      <div className="flex flex-1 relative">
        {/* Reusable Operational Left Sidebar Panel */}
        <DashboardSidebar />

        {/* Dynamic Workspace Context Viewport */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Context Subheader */}
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{org.name}</h1>
              <p className="text-xs text-slate-500 font-medium">Workspace operational metrics and fleet logs hub</p>
            </div>
            
            {/* General Performance Metrics Cards */}
            <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} />

            {/* Core Operations Interface Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Primary Workspace Engine Panels */}
              <div className="lg:col-span-2 space-y-8">
                <div id="customers"><Customers customers={customers} /></div>
                <div id="routing"><RouteEngine jobs={jobs} /></div>
                <div id="schedule"><JobSchedule jobs={jobs} /></div>
                <div id="ledger"><ExpenseLedger expenses={expenses} /></div>
              </div>

              {/* Functional Sidebar Transaction Management Forms */}
              <div className="lg:col-span-1 space-y-6">
                <AddCustomerForm organizationId={org.id} />
                <ScheduleJobForm properties={properties} />
                <LogExpenseForm />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}