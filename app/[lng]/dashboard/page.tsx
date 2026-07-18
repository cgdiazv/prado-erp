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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasCompletedProfile = Boolean(
    profile?.first_name?.trim() && profile?.last_name?.trim()
  );

  if (!hasCompletedProfile) {
    redirect(`/${locale}/dashboard/profile-settings`);
  }
  
  const { organization: org } = await getUserOrganization(user.id);

  if (!org) redirect('/signup');
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

  const initial = org.name ? org.name.charAt(0) : "C";

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

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DashboardViewToggle
                activeView={activeView}
                operationsLabel={t.modeOperations}
                financialsLabel={t.modeFinancials}
              />

              <div className="flex flex-wrap gap-2 sm:justify-end sm:ml-auto">
                <Link href={`/${locale}/dashboard/estimates`} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                  {t.actionManageEstimates}
                </Link>
                <Link href={`/${locale}/dashboard/schedule`} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                  {t.actionScheduleJob}
                </Link>
                <Link href={`/${locale}/dashboard/invoices-ledger`} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                  {t.actionManageInvoices}
                </Link>
                {!isIndividualAccount && (
                  <Link href={`/${locale}/dashboard/ledger`} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                    {t.actionTrackExpenses}
                  </Link>
                )}
              </div>
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
      </div>
    </div>
  );
}