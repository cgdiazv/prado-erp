import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { seedTradeSampleData } from '@/lib/sampleData';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardViewToggle from '@/components/dashboard/DashboardViewToggle';
import Metrics from '@/components/dashboard/Metrics';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import TrialBanner from '@/components/TrialBanner';
import OnboardingTour from '@/components/OnboardingTour';
import DashboardFeedbackStrip from './DashboardFeedbackStrip';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';
import { canUseExpenseLedger } from '@/lib/subscriptionAccess';
import { getUserOrganization } from '@/lib/organization';
import { Plus } from 'lucide-react';

type DashboardView = 'operations' | 'financials';

type TrendDirection = 'up' | 'down';

type MetricTrend = {
  direction: TrendDirection;
  percentage: number;
};

export default async function DashboardHome({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ view?: string; tour?: string; expired?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const supabase = await createClient();
  const translations = getTranslations(locale);
  const requestedView = resolvedSearchParams.view;
  const requestedTour = resolvedSearchParams.tour;
  const requestedExpired = resolvedSearchParams.expired;
  const activeView: DashboardView = requestedView === 'financials' ? 'financials' : 'operations';
  const forceStartTour = requestedTour === '1';

  const t = isEs
    ? {
        modeOperations: 'Operaciones Primero',
        modeFinancials: 'Finanzas Primero',
        priorityAlerts: 'Alertas Prioritarias',
        noAlerts: 'Sin alertas criticas por ahora.',
        overdueInvoices: 'Facturas vencidas',
        unassignedJobs: 'Jobs sin camion asignado',
        upcomingJobs: 'Jobs en los proximos 7 dias',
        sentEstimates: 'Cotizaciones enviadas sin respuesta',
        draftEstimates: 'Cotizaciones en borrador',
        incompleteJobs: 'Jobs incompletos',
        noUpcomingJobs: 'No hay jobs próximos. Programa tu siguiente servicio.',
        alertPendingCustomer: 'Cotizaciones Enviadas: Cliente Pendiente',
        alertNextSteps: 'Cotizaciones en Borrador: Siguientes Pasos',
        alertNextSevenDays: 'Trabajo Próximo: 7 Días',
        alertUnassignedJobs: 'Alerta Crítica: Jobs Sin Camión',
        alertIncompleteWork: 'Tareas: Trabajo Incompleto',
        alertOverdueInvoices: 'Acción Urgente: Facturas Vencidas',
        alertAwaitingCustomer: 'Esperando interacción del cliente.',
        alertReadyToFinalize: 'Listo para finalizar y enviar.',
        alertReviewSchedule: 'Revisa la agenda y recursos requeridos.',
        alertAssignAssets: 'Asigna activos a jobs sin camión.',
        alertResolvePending: 'Identifica y resuelve tareas pendientes.',
        alertSendReminders: 'Envía recordatorios para cuentas sin pagar.',
        alertViewAll: 'Ver Todo',
        alertResolveAll: 'Resolver Todo',
        alertResolveNow: 'Resolver Ahora',
        nextActions: 'Plan de Acción',
        actionScheduleJob: 'Agendar Job',
        actionManageInvoices: 'Gestionar Facturas',
        actionManageEstimates: 'Gestionar Cotizaciones',
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
        sentEstimates: 'Sent quotes awaiting response',
        draftEstimates: 'Draft quotes pending send',
        incompleteJobs: 'Incomplete jobs',
        noUpcomingJobs: 'No upcoming jobs. Schedule your next service.',
        alertPendingCustomer: 'Sent Quotes: Pending Customer',
        alertNextSteps: 'Draft Quotes: Next Steps',
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
        actionManageEstimates: 'Manage Quotes',
        actionTrackExpenses: 'Track Expenses',
      };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { organization: org } = await getUserOrganization(user.id);

  if (!org) redirect(`/${locale}/auth/access-pending`);
  const canAccessExpenseLedger = canUseExpenseLedger(org.subscription_status);

  // Auto-initialize trial_starts_at in Supabase if missing for trial organization
  if ((!org.subscription_status || org.subscription_status === 'trial') && !org.trial_starts_at) {
    try {
      const supabaseAdmin = createAdminClient();
      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from('organizations')
        .update({ trial_starts_at: nowIso, subscription_status: 'trial' })
        .eq('id', org.id);
      org.trial_starts_at = nowIso;
      org.subscription_status = 'trial';
    } catch (e) {
      console.error('Failed to auto-set trial_starts_at:', e);
    }
  }

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);

  if (trial.isExpired && requestedExpired !== 'true') {
    // Instead of moving routes, we append the query parameter to the current view.
    // The parent layout will instantly pick this up and lock down the screen with your modal!
    redirect(`/${locale}/dashboard?expired=true`);
  }

  // Fetch headline metrics and customer scope.
  const [expensesResponse, customersResponse, estimatesResponse] = await Promise.all([
    supabase.from('expenses').select('amount, expense_date').eq('organization_id', org.id),
    supabase.from('customers').select('id').eq('organization_id', org.id),
    supabase.from('estimates').select('status').eq('organization_id', org.id),
  ]);

  const expenses = expensesResponse.data || [];
  let customers = customersResponse.data || [];
  const estimates = estimatesResponse.data || [];

  // Auto-heal / pre-fill sample data if account has no customers yet
  if (customers.length === 0) {
    try {
      const supabaseAdmin = createAdminClient();
      const userTrade = user.user_metadata?.trade_vertical || 'Lawn Care & Landscaping';
      await seedTradeSampleData(supabaseAdmin, org.id, userTrade);

      const { data: reloadedCustomers } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', org.id);

      if (reloadedCustomers && reloadedCustomers.length > 0) {
        customers = reloadedCustomers;
      }
    } catch (autoSeedErr) {
      console.error('Auto-seeding sample data error:', autoSeedErr);
    }
  }

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

  const parseIsoDate = (value: string | null | undefined) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);

  const currentPeriodStart = new Date(periodEnd);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - 29);
  currentPeriodStart.setHours(0, 0, 0, 0);

  const previousPeriodEnd = new Date(currentPeriodStart);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
  previousPeriodEnd.setHours(23, 59, 59, 999);

  const previousPeriodStart = new Date(previousPeriodEnd);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 29);
  previousPeriodStart.setHours(0, 0, 0, 0);

  const isWithinRange = (date: Date, rangeStart: Date, rangeEnd: Date) => date >= rangeStart && date <= rangeEnd;

  const sumInvoiceAmountInRange = (rangeStart: Date, rangeEnd: Date) => {
    return invoices.reduce((total, invoice) => {
      const invoiceDate = parseIsoDate(invoice.due_date);
      if (!invoiceDate || !isWithinRange(invoiceDate, rangeStart, rangeEnd)) return total;
      return total + Number(invoice.total_amount || 0);
    }, 0);
  };

  const sumExpenseAmountInRange = (rangeStart: Date, rangeEnd: Date) => {
    return expenses.reduce((total, expense) => {
      const expenseDate = parseIsoDate(expense.expense_date);
      if (!expenseDate || !isWithinRange(expenseDate, rangeStart, rangeEnd)) return total;
      return total + Number(expense.amount || 0);
    }, 0);
  };

  const currentRevenueWindow = sumInvoiceAmountInRange(currentPeriodStart, periodEnd);
  const currentExpensesWindow = sumExpenseAmountInRange(currentPeriodStart, periodEnd);
  const currentNetWindow = currentRevenueWindow - currentExpensesWindow;

  const previousRevenueWindow = sumInvoiceAmountInRange(previousPeriodStart, previousPeriodEnd);
  const previousExpensesWindow = sumExpenseAmountInRange(previousPeriodStart, previousPeriodEnd);
  const previousNetWindow = previousRevenueWindow - previousExpensesWindow;

  const buildTrend = (currentValue: number, previousValue: number): MetricTrend => {
    const delta = currentValue - previousValue;

    if (previousValue === 0) {
      return {
        direction: delta >= 0 ? 'up' : 'down',
        percentage: currentValue === 0 ? 0 : 100,
      };
    }

    const percentage = Math.abs((delta / Math.abs(previousValue)) * 100);

    return {
      direction: delta >= 0 ? 'up' : 'down',
      percentage,
    };
  };

  const metricTrends = {
    revenue: buildTrend(currentRevenueWindow, previousRevenueWindow),
    expenses: buildTrend(currentExpensesWindow, previousExpensesWindow),
    netProfit: buildTrend(currentNetWindow, previousNetWindow),
  };

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
    },
    {
      key: 'draft-estimates',
      count: draftEstimates,
      title: t.alertNextSteps,
      subtitle: t.alertReadyToFinalize,
      cta: t.alertViewAll,
      href: `/${locale}/dashboard/estimates`,
    },
    {
      key: 'upcoming-jobs',
      count: upcomingJobs,
      title: t.alertNextSevenDays,
      subtitle: t.alertReviewSchedule,
      cta: t.alertViewAll,
      href: `/${locale}/dashboard/schedule`,
    },
    {
      key: 'unassigned-jobs',
      count: unassignedScheduledJobs,
      title: t.alertUnassignedJobs,
      subtitle: t.alertAssignAssets,
      cta: t.alertResolveAll,
      href: `/${locale}/dashboard/schedule`,
    },
    {
      key: 'incomplete-jobs',
      count: incompleteJobs,
      title: t.alertIncompleteWork,
      subtitle: t.alertResolvePending,
      cta: t.alertViewAll,
      href: `/${locale}/dashboard/schedule`,
    },
    {
      key: 'overdue-invoices',
      count: overdueInvoices,
      title: t.alertOverdueInvoices,
      subtitle: t.alertSendReminders,
      cta: t.alertResolveNow,
      href: `/${locale}/dashboard/invoices-ledger`,
    },
  ];

  const operationsQuickActions = (
    <div className="tour-quick-actions flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
      <Link
        href={`/${locale}/dashboard/estimates`}
        className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
      >
        <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>{t.actionManageEstimates}</span>
      </Link>

      <Link
        href={`/${locale}/dashboard/schedule`}
        className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
      >
        <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>{t.actionScheduleJob}</span>
      </Link>

      <Link
        href={`/${locale}/dashboard/invoices-ledger`}
        className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
      >
        <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>{t.actionManageInvoices}</span>
      </Link>

      {canAccessExpenseLedger && (
        <Link
          href={`/${locale}/dashboard/expense-ledger`}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>{t.actionTrackExpenses}</span>
        </Link>
      )}
    </div>
  );

  const operationsPanel = (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-5 space-y-4 tour-priority-alerts">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{t.priorityAlerts}</h2>
          {(overdueInvoices === 0 && unassignedScheduledJobs === 0 && sentEstimates === 0 && draftEstimates === 0) && (
            <span className="text-xs font-medium text-emerald-600">{t.noAlerts}</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {priorityAlertCards.map((card) => (
            <div
              key={card.key}
              className="relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300 min-h-[110px]"
            >
              <span className="absolute left-0 top-3.5 h-4 w-0.5 rounded-r bg-slate-300" />
              <div>
                <p className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug">{card.title}</p>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-normal">{card.subtitle}</p>
              </div>
              <div className="flex items-center justify-between pt-4 mt-auto">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">{card.count}</span>
                <Link
                  href={card.href}
                  className="cursor-pointer shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                >
                  {card.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 space-y-8 text-left">
        <OnboardingTour locale={locale} userStorageKey={user.id} forceStart={forceStartTour} />
        
        {/* Conditional Trial Alert Banner Asset */}
        {org.subscription_status === 'trial' && org.trial_starts_at && (
          <TrialBanner trialStartsAt={org.trial_starts_at} locale={locale} />
        )}
        
        {/* Context Subheader */}
        <div className="flex flex-col gap-1">
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

        <div className="space-y-8 !mt-3 sm:!mt-4">
          {activeView === 'operations' ? (
            <>
              {operationsPanel}
              <Metrics
                totalRevenue={totalRevenue}
                totalExpenses={totalExpenses}
                netProfit={netProfit}
                trends={metricTrends}
                locale={locale}
              />
              <PerformanceChart
                invoices={invoices}
                expenses={expenses}
                locale={locale}
              />
            </>
          ) : (
            <>
              <Metrics
                totalRevenue={totalRevenue}
                totalExpenses={totalExpenses}
                netProfit={netProfit}
                trends={metricTrends}
                locale={locale}
              />
              <PerformanceChart
                invoices={invoices}
                expenses={expenses}
                locale={locale}
              />
              {operationsPanel}
            </>
          )}
        </div>

        <DashboardFeedbackStrip locale={locale} />

      </div>
    </main>
  );
}