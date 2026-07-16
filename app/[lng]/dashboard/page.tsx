import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardViewToggle from '@/components/dashboard/DashboardViewToggle';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Metrics from '@/components/dashboard/Metrics';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import TrialBanner from '@/components/TrialBanner';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';

type DashboardView = 'operations' | 'financials';

export default async function DashboardHome({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const supabase = await createClient();
  const translations = getTranslations(locale);
  const requestedView = resolvedSearchParams.view;
  const activeView: DashboardView = requestedView === 'financials' ? 'financials' : 'operations';

  const t = isEs
    ? {
        modeOperations: 'Operaciones Primero',
        modeFinancials: 'Finanzas Primero',
        priorityAlerts: 'Alertas Prioritarias',
        noAlerts: 'Sin alertas criticas por ahora.',
        overdueInvoices: 'Facturas vencidas',
        unassignedJobs: 'Jobs sin camion asignado',
        upcomingJobs: 'Jobs en los proximos 7 dias',
        sentEstimates: 'Estimaciones enviadas sin respuesta',
        draftEstimates: 'Estimaciones en borrador',
        incompleteJobs: 'Jobs incompletos',
        noUpcomingJobs: 'No hay jobs proximos. Programa tu siguiente servicio.',
        nextActions: 'Plan de Accion',
        actionScheduleJob: 'Agendar Job',
        actionManageInvoices: 'Gestionar Facturas',
        actionManageEstimates: 'Gestionar Estimaciones',
        actionTrackExpenses: 'Registrar Gastos',
      }
    : {
        modeOperations: 'Operations First',
        modeFinancials: 'Financials First',
        priorityAlerts: 'Priority Alerts',
        noAlerts: 'No critical alerts right now.',
        overdueInvoices: 'Overdue invoices',
        unassignedJobs: 'Jobs without assigned truck',
        upcomingJobs: 'Jobs in the next 7 days',
        sentEstimates: 'Sent estimates awaiting response',
        draftEstimates: 'Draft estimates pending send',
        incompleteJobs: 'Incomplete jobs',
        noUpcomingJobs: 'No upcoming jobs. Schedule your next service.',
        nextActions: 'Action Plan',
        actionScheduleJob: 'Schedule Job',
        actionManageInvoices: 'Manage Invoices',
        actionManageEstimates: 'Manage Estimates',
        actionTrackExpenses: 'Track Expenses',
      };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  // Fetch organization context along with trial parameters
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, logo_url, trial_starts_at, subscription_status')
    .eq('owner_id', user.id)
    .single();

  if (!org) redirect('/signup');

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);

  if (trial.isExpired) {
    // Instead of moving routes, we append the query parameter to the current view.
    // The parent layout will instantly pick this up and lock down the screen with your modal!
    redirect('/dashboard?expired=true');
  }

  // Fetch headline metrics and customer scope.
  const [expensesResponse, customersResponse, estimatesResponse] = await Promise.all([
    supabase.from('expenses').select('amount, expense_date').eq('organization_id', org.id),
    supabase.from('customers').select('id').eq('organization_id', org.id),
    supabase.from('estimates').select('status').eq('organization_id', org.id),
  ]);

  const expenses = expensesResponse.data || [];
  const customers = customersResponse.data || [];
  const estimates = estimatesResponse.data || [];
  const customerIds = customers.map(c => c.id);

  const [invoicesResponse, propertiesResponse] = customerIds.length > 0
    ? await Promise.all([
        supabase.from('invoices').select('total_amount, status, due_date').in('customer_id', customerIds),
        supabase.from('properties').select('id').in('customer_id', customerIds),
      ])
    : [{ data: [] }, { data: [] }];

  const properties = propertiesResponse.data || [];
  const propertyIds = properties.map((property) => property.id);

  const jobsResponse = propertyIds.length > 0
    ? await supabase
        .from('jobs')
        .select('scheduled_date, status, truck_id')
        .in('property_id', propertyIds)
    : { data: [] };

  const invoices = invoicesResponse.data || [];
  const jobs = jobsResponse.data || [];
  const activeJobs = jobs.filter((job) => job.status !== 'archived');

  const totalRevenue = invoices.reduce((acc, inv) => acc + Number(inv.total_amount), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  const toDayKey = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const rollingDates: Date[] = Array.from({ length: 25 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (24 - index));
    return date;
  });

  const rollingDateKeys = new Set(rollingDates.map((date) => toDayKey(date)));
  const revenueByDay = new Map<string, number>();
  const expensesByDay = new Map<string, number>();

  rollingDates.forEach((date) => {
    const key = toDayKey(date);
    revenueByDay.set(key, 0);
    expensesByDay.set(key, 0);
  });

  invoices.forEach((invoice) => {
    if (!invoice.due_date) return;
    const key = invoice.due_date;
    if (!rollingDateKeys.has(key)) return;
    revenueByDay.set(key, (revenueByDay.get(key) || 0) + Number(invoice.total_amount || 0));
  });

  expenses.forEach((expense) => {
    if (!expense.expense_date) return;
    const key = expense.expense_date;
    if (!rollingDateKeys.has(key)) return;
    expensesByDay.set(key, (expensesByDay.get(key) || 0) + Number(expense.amount || 0));
  });

  const trendData = rollingDates.map((date) => {
    const key = toDayKey(date);
    const revenue = revenueByDay.get(key) || 0;
    const expense = expensesByDay.get(key) || 0;

    return {
      dateLabel: date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
      revenue,
      expenses: expense,
      netIncome: revenue - expense,
    };
  });

  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status !== 'unpaid' || !inv.due_date) return false;
    const dueDate = new Date(inv.due_date);
    return !Number.isNaN(dueDate.getTime()) && dueDate < today;
  }).length;

  const unassignedScheduledJobs = activeJobs.filter((job) => job.status === 'scheduled' && !job.truck_id).length;
  const upcomingJobs = activeJobs.filter((job) => {
    if (!job.scheduled_date || job.status === 'completed') return false;
    const scheduled = new Date(job.scheduled_date);
    return !Number.isNaN(scheduled.getTime()) && scheduled >= today && scheduled <= sevenDaysFromNow;
  }).length;
  const incompleteJobs = activeJobs.filter((job) => job.status !== 'completed').length;
  const sentEstimates = estimates.filter((estimate) => estimate.status === 'sent').length;
  const draftEstimates = estimates.filter((estimate) => estimate.status === 'draft').length;

  const initial = org.name ? org.name.charAt(0) : "C";

  const operationsPanel = (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{t.priorityAlerts}</h2>
          {(overdueInvoices === 0 && unassignedScheduledJobs === 0 && sentEstimates === 0 && draftEstimates === 0) && (
            <span className="text-xs font-medium text-emerald-600">{t.noAlerts}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{t.sentEstimates}</span>
            <span className="text-sm font-bold text-slate-800">{sentEstimates}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">{t.draftEstimates}</span>
            <span className="text-sm font-bold text-slate-700">{draftEstimates}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{t.upcomingJobs}</span>
            <span className="text-sm font-bold text-slate-800">{upcomingJobs}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{t.unassignedJobs}</span>
            <span className="text-sm font-bold text-slate-800">{unassignedScheduledJobs}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{t.incompleteJobs}</span>
            <span className="text-sm font-bold text-slate-800">{incompleteJobs}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{t.overdueInvoices}</span>
            <span className="text-sm font-bold text-slate-800">{overdueInvoices}</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3">{t.nextActions}</h2>
        <div className="space-y-2">
          <Link href={`/${locale}/dashboard/estimates`} className="block rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            {t.actionManageEstimates}
          </Link>
          <Link href={`/${locale}/dashboard/schedule`} className="block rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            {t.actionScheduleJob}
          </Link>
          <Link href={`/${locale}/dashboard/invoices-ledger`} className="block rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            {t.actionManageInvoices}
          </Link>
          <Link href={`/${locale}/dashboard/ledger`} className="block rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            {t.actionTrackExpenses}
          </Link>
        </div>

        {upcomingJobs === 0 && (
          <p className="text-xs text-slate-400 mt-4">{t.noUpcomingJobs}</p>
        )}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />
      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />
        
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-8 text-left">
            
            {/* Conditional Trial Alert Banner Asset */}
            {org.subscription_status === 'trial' && org.trial_starts_at && (
              <TrialBanner trialStartsAt={org.trial_starts_at} locale={locale} />
            )}
            
            {/* Context Subheader */}
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{org.name}</h1>
              <p className="text-xs text-slate-500 font-medium">{translations.dashboard.metricsSubtitle}</p>
            </div>

            <DashboardViewToggle
              activeView={activeView}
              operationsLabel={t.modeOperations}
              financialsLabel={t.modeFinancials}
            />

            {activeView === 'operations' ? (
              <>
                {operationsPanel}
                <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} locale={locale} />
                <PerformanceChart
                  totalRevenue={totalRevenue}
                  totalExpenses={totalExpenses}
                  netProfit={netProfit}
                  trendData={trendData}
                  locale={locale}
                />
              </>
            ) : (
              <>
                <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} locale={locale} />
                <PerformanceChart
                  totalRevenue={totalRevenue}
                  totalExpenses={totalExpenses}
                  netProfit={netProfit}
                  trendData={trendData}
                  locale={locale}
                />
                {operationsPanel}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}