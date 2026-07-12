import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Header from '@/components/dashboard/Header';
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

  // 1. Check authentication session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
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

  // 3. Parallel Secure Tenant Isolated Fetching (Customers & Expenses first)
  const [customersResponse, expensesResponse] = await Promise.all([
    supabase.from('customers').select('*').eq('organization_id', org.id),
    supabase.from('expenses').select('*').eq('organization_id', org.id).order('expense_date', { ascending: false })
  ]);

  const customers = customersResponse.data as Customer[] | null;
  const expenses = expensesResponse.data as Expense[] | null;

  // 4. Resolve isolated properties, jobs, & invoices linked strictly to workspace accounts
  const customerIds = customers?.map(c => c.id) || [];

  // Fetch properties belonging to active workspace customers to avoid organization_id column crash
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

  // Financial Metrics Compilation
  const totalRevenue = invoices?.reduce((acc, inv) => acc + Number(inv.total_amount), 0) || 0;
  const totalExpenses = expenses?.reduce((acc, exp) => acc + Number(exp.amount), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-6xl mx-auto">
        
        <Header orgName={org.name} />
        
        <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Customers customers={customers} />
            <RouteEngine jobs={jobs} />
            <JobSchedule jobs={jobs} />
            <ExpenseLedger expenses={expenses} />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <AddCustomerForm organizationId={org.id} />
            <ScheduleJobForm properties={properties} />
            <LogExpenseForm />
          </div>
        </div>

      </div>
    </main>
  );
}