import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardViewToggle from '@/components/dashboard/DashboardViewToggle';
import Metrics from '@/components/dashboard/Metrics';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import TrialBanner from '@/components/TrialBanner';
import OnboardingTour from '@/components/OnboardingTour';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

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
        alertPendingCustomer: 'Estimaciones Enviadas: Cliente Pendiente',
        alertNextSteps: 'Estimaciones en Borrador: Siguientes Pasos',
        alertNextSevenDays: 'Trabajo Proximo: 7 Dias',
        alertUnassignedJobs: 'Alerta Critica: Jobs Sin Camion',
        alertIncompleteWork: 'Tareas: Trabajo Incompleto',
        alertOverdueInvoices: 'Accion Urgente: Facturas Vencidas',
        alertAwaitingCustomer: 'Esperando interaccion del cliente.',
        alertReadyToFinalize: 'Listo para finalizar y enviar.',
        alertReviewSchedule: 'Revisa la agenda y recursos requeridos.',
        alertAssignAssets: 'Asigna activos a jobs sin camion.',
        alertResolvePending: 'Identifica y resuelve tareas pendientes.',
        alertSendReminders: 'Envia recordatorios para cuentas sin pagar.',
        alertViewAll: 'Ver Todo',
        alertResolveAll: 'Resolver Todo',
        alertResolveNow: 'Resolver Ahora',
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
        alertPendingCustomer: 'Sent Estimates: Pending Customer',
        alertNextSteps: 'Draft Estimates: Next Steps',
        alertNextSevenDays: 'Upcoming Work: Next 7 Days',
        alertUnassignedJobs: 'Critical Alert: Unassigned Jobs',
        alertIncompleteWork: 'Tasks: Incomplete Work',
        alertOverdueInvoices: 'Urgent Action: Overdue Invoices',
        alertAwaitingCustomer: 'Awaiting customer interaction.',
        alertReadyToFinalize: 'Ready to finalize and send.',
        alertReviewSchedule: 'Review schedule and resource requirements.',
        alertAssignAssets: 'Assign assets to jobs without a truck.',
        alertResolvePending: 'Identify and resolve pending job-related tasks.',
        alertSendReminders: 'Send reminders for unpaid customer accounts.',
        alertViewAll: 'View All',
        alertResolveAll: 'Resolve All',
        alertResolveNow: 'Resolve Now',
        nextActions: 'Action Plan',
        actionScheduleJob: 'Schedule Job',
        actionManageInvoices: 'Manage Invoices',
        actionManageEstimates: 'Manage Estimates',
        actionTrackExpenses: 'Track Expenses',
      };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { organization: org } = await getUserOrganization(user.id);

  if (!org) redirect(`/${locale}/auth/access-pending`);
  const isIndividualAccount = org.subscription_status === 'individual';

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

  const priorityAlertCards = [
    {
      key: 'sent-estimates',
      count: sentEstimates,
      title: t.alertPendingCustomer,
      subtitle: t.alertAwaitingCustomer,
      cta: t.alertViewAll,
      href: `/${locale}/dashboard/estimates`,
      cardClass: 'border-emerald-300 bg-emerald-50/40',
      badgeClass: 'bg-emerald-600 text-white',
      buttonClass: 'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    },
    {
      key: 'draft-estimates',
      count: draftEstimates,
      title: t.alertNextSteps,
      subtitle: t.alertReadyToFinalize,
      cta: t.alertViewAll,
      href: `/${locale}/dashboard/estimates`,
      cardClass: 'border-emerald-300 bg-emerald-50/40',
      badgeClass: 'bg-emerald-600 text-white',
      buttonClass: 'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    },
    {
      key: 'upcoming-jobs',
      count: upcomingJobs,
      title: t.alertNextSevenDays,
      subtitle: t.alertReviewSchedule,
      cta: t.alertViewAll,
      href: `/${locale}/dashboard/schedule`,
      cardClass: 'border-emerald-300 bg-emerald-50/40',
      badgeClass: 'bg-emerald-600 text-white',
      buttonClass: 'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    },
    {
      key: 'unassigned-jobs',
      count: unassignedScheduledJobs,
      title: t.alertUnassignedJobs,
      subtitle: t.alertAssignAssets,
      cta: t.alertResolveAll,
      href: `/${locale}/dashboard/schedule`,
      cardClass: 'border-emerald-300 bg-emerald-50/40',
      badgeClass: 'bg-emerald-600 text-white',
      buttonClass: 'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    },
    {
      key: 'incomplete-jobs',
      count: incompleteJobs,
      title: t.alertIncompleteWork,
      subtitle: t.alertResolvePending,
      cta: t.alertViewAll,
      href: `/${locale}/dashboard/schedule`,
      cardClass: 'border-emerald-300 bg-emerald-50/40',
      badgeClass: 'bg-emerald-600 text-white',
      buttonClass: 'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    },
    {
      key: 'overdue-invoices',
      count: overdueInvoices,
      title: t.alertOverdueInvoices,
      subtitle: t.alertSendReminders,
      cta: t.alertResolveNow,
      href: `/${locale}/dashboard/invoices-ledger`,
      cardClass: 'border-emerald-300 bg-emerald-50/40',
      badgeClass: 'bg-emerald-600 text-white',
      buttonClass: 'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    },
  ];

  const operationsQuickActions = (
    <div className="tour-quick-actions grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
      <Link
        href={`/${locale}/dashboard/estimates`}
        className="cursor-pointer rounded-lg border border-gray-200 bg-white h-20 p-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-center sm:h-auto sm:flex-row sm:justify-center sm:px-3 sm:py-1.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-7 w-7 text-emerald-700 sm:h-5 sm:w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12h6m-6 3h3.75M3 16.5V7.5A2.25 2.25 0 015.25 5.25h5.379a1.125 1.125 0 01.795.33l5.121 5.121a1.125 1.125 0 01.33.795V16.5A2.25 2.25 0 0114.625 18.75h-9.375A2.25 2.25 0 013 16.5z" />
        </svg>
        <span>{t.actionManageEstimates}</span>
      </Link>

      <Link
        href={`/${locale}/dashboard/schedule`}
        className="cursor-pointer rounded-lg border border-gray-200 bg-white h-20 p-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-center sm:h-auto sm:flex-row sm:justify-center sm:px-3 sm:py-1.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-7 w-7 text-emerald-700 sm:h-5 sm:w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span>{t.actionScheduleJob}</span>
      </Link>

      <Link
        href={`/${locale}/dashboard/invoices-ledger`}
        className="cursor-pointer rounded-lg border border-gray-200 bg-white h-20 p-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-center sm:h-auto sm:flex-row sm:justify-center sm:px-3 sm:py-1.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-7 w-7 text-emerald-700 sm:h-5 sm:w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7.5 4.5h9A1.5 1.5 0 0118 6v12a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 18V6a1.5 1.5 0 011.5-1.5z" />
        </svg>
        <span>{t.actionManageInvoices}</span>
      </Link>

      {!isIndividualAccount && (
        <Link
          href={`/${locale}/dashboard/expense-ledger`}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white h-20 p-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-center sm:h-auto sm:flex-row sm:justify-center sm:px-3 sm:py-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-7 w-7 text-emerald-700 sm:h-5 sm:w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t.actionTrackExpenses}</span>
        </Link>
      )}
    </div>
  );

  const operationsPanel = (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{t.priorityAlerts}</h2>
          {(overdueInvoices === 0 && unassignedScheduledJobs === 0 && sentEstimates === 0 && draftEstimates === 0) && (
            <span className="text-xs font-medium text-emerald-600">{t.noAlerts}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {priorityAlertCards.map((card) => (
            <div key={card.key} className={`rounded-lg border px-3 py-2.5 flex items-center justify-between gap-3 ${card.cardClass}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`h-7 w-7 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${card.badgeClass}`}>
                  {card.count}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{card.title}</p>
                  <p className="text-xs text-slate-600 truncate">{card.subtitle}</p>
                </div>
              </div>
              <Link href={card.href} className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${card.buttonClass}`}>
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-5xl ml-0 space-y-8 text-left">
        <OnboardingTour locale={locale} />
        
        {/* Conditional Trial Alert Banner Asset */}
        {org.subscription_status === 'trial' && org.trial_starts_at && (
          <TrialBanner trialStartsAt={org.trial_starts_at} locale={locale} />
        )}
        
        {/* Context Subheader */}
        <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{org.name}</h1>
          <p className="text-xs text-slate-500 font-medium">{translations.dashboard.metricsSubtitle}</p>
        </div>

        <div className="mt-0 sm:mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DashboardViewToggle
            activeView={activeView}
            operationsLabel={t.modeOperations}
            financialsLabel={t.modeFinancials}
          />
          {operationsQuickActions}
        </div>

        {activeView === 'operations' ? (
          <>
            {operationsPanel}
            <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} locale={locale} />
            <PerformanceChart
              invoices={invoices}
              expenses={expenses}
              locale={locale}
            />
          </>
        ) : (
          <>
            <Metrics totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} locale={locale} />
            <PerformanceChart
              invoices={invoices}
              expenses={expenses}
              locale={locale}
            />
            {operationsPanel}
          </>
        )}

      </div>
    </main>
  );
}