import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import PrintPageButton from '@/components/dashboard/PrintPageButton';
import PrintReportFilters from '@/components/dashboard/PrintReportFilters';

type ReportType = 'revenue' | 'expenses' | 'jobs' | 'customers' | 'estimates' | 'schedule';
type PeriodType = '30d' | 'quarter' | 'year' | 'custom';

const REPORT_TYPES: ReportType[] = ['revenue', 'expenses', 'jobs', 'customers', 'estimates', 'schedule'];
const PERIOD_TYPES: PeriodType[] = ['30d', 'quarter', 'year', 'custom'];

function toPeriodStart(period: PeriodType): Date {
  const now = new Date();

  if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1);
  }

  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }

  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function isReportType(value: string | undefined): value is ReportType {
  return typeof value === 'string' && REPORT_TYPES.includes(value as ReportType);
}

function isPeriodType(value: string | undefined): value is PeriodType {
  return typeof value === 'string' && PERIOD_TYPES.includes(value as PeriodType);
}

function isDateInput(value: string | undefined): value is string {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateShort(value: string | null | undefined, locale: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale.startsWith('es') ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default async function PrintReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ report?: string; period?: string; start?: string; end?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  const reportParam = resolvedSearchParams.report;
  const periodParam = resolvedSearchParams.period;

  const selectedReport: ReportType = isReportType(reportParam) ? reportParam : 'revenue';
  const selectedPeriod: PeriodType = isPeriodType(periodParam) ? periodParam : '30d';

  const fallbackStart = toPeriodStart(selectedPeriod === 'custom' ? '30d' : selectedPeriod);
  const today = new Date();

  const selectedStartDate = isDateInput(resolvedSearchParams.start)
    ? new Date(`${resolvedSearchParams.start}T00:00:00`)
    : fallbackStart;
  const selectedEndDate = isDateInput(resolvedSearchParams.end)
    ? new Date(`${resolvedSearchParams.end}T23:59:59.999`)
    : today;

  const hasValidCustomRange =
    selectedPeriod === 'custom' &&
    isDateInput(resolvedSearchParams.start) &&
    isDateInput(resolvedSearchParams.end) &&
    selectedStartDate.getTime() <= selectedEndDate.getTime();

  const effectiveStartDate = hasValidCustomRange ? selectedStartDate : fallbackStart;
  const effectiveEndDate = hasValidCustomRange ? selectedEndDate : today;

  const rangeStart = new Date(
    effectiveStartDate.getFullYear(),
    effectiveStartDate.getMonth(),
    effectiveStartDate.getDate(),
    0,
    0,
    0,
    0
  );
  const rangeEnd = new Date(
    effectiveEndDate.getFullYear(),
    effectiveEndDate.getMonth(),
    effectiveEndDate.getDate(),
    23,
    59,
    59,
    999
  );

  const rangeStartISO = rangeStart.toISOString();
  const rangeEndISO = rangeEnd.toISOString();
  const rangeStartDate = rangeStartISO.slice(0, 10);
  const rangeEndDate = rangeEndISO.slice(0, 10);
  const customStartValue = isDateInput(resolvedSearchParams.start) ? resolvedSearchParams.start : rangeStartDate;
  const customEndValue = isDateInput(resolvedSearchParams.end) ? resolvedSearchParams.end : rangeEndDate;

  const t = isEs
    ? {
        title: 'Imprimir Reportes',
        subtitle: 'Genera reportes listos para imprimir y compartir con tu equipo o contabilidad.',
        sectionTitle: 'Reportes Disponibles',
        sectionDescription: 'Selecciona un reporte y genera una vista optimizada para impresion en papel o PDF.',
        reportRevenue: 'Resumen de Ingresos',
        reportExpenses: 'Resumen de Gastos',
        reportJobs: 'Rendimiento de Jobs',
        reportCustomers: 'Estado de Clientes',
        reportEstimates: 'Conversion de Cotizaciones',
        reportSchedule: 'Agenda Semanal',
        periodLabel: 'Periodo',
        periodMonth: 'Ultimos 30 dias',
        periodQuarter: 'Trimestre actual',
        periodYear: 'Ano actual',
        periodCustom: 'Rango personalizado',
        startDate: 'Fecha inicio',
        endDate: 'Fecha fin',
        selectRange: 'Seleccionar rango',
        applyRange: 'Aplicar rango',
        generate: 'Generar Vista de Impresion',
        print: 'Imprimir / Guardar PDF',
        totalRevenue: 'Total facturado',
        totalPaid: 'Pagado',
        totalUnpaid: 'Pendiente',
        records: 'Registros',
        thDate: 'Fecha',
        thCustomer: 'Cliente',
        thAmount: 'Monto',
        thStatus: 'Estado',
        totalExpenses: 'Total de gastos',
        thCategory: 'Categoria',
        thVendor: 'Proveedor',
        completedJobs: 'Jobs completados',
        scheduledJobs: 'Jobs agendados',
        thJobType: 'Servicio',
        thAddress: 'Direccion',
        totalCustomers: 'Clientes totales',
        withDebt: 'Con deuda',
        thName: 'Nombre',
        thEmail: 'Email',
        thOutstanding: 'Saldo pendiente',
        thPaid: 'Pagado',
        estimatesCreated: 'Cotizaciones creadas',
        approved: 'Aprobadas',
        conversionRate: 'Tasa de conversion',
        thTitle: 'Titulo',
        thCreated: 'Creada',
        upcomingJobs: 'Proximos jobs',
        thWhen: 'Programado',
        thTruck: 'Camion',
        noData: 'No hay datos en el periodo seleccionado.',
      }
    : {
        title: 'Print Reports',
        subtitle: 'Generate print-ready reports to share with your team or accounting workflow.',
        sectionTitle: 'Available Reports',
        sectionDescription: 'Select a report and generate a print-optimized view for paper or PDF.',
        reportRevenue: 'Revenue Summary',
        reportExpenses: 'Expense Summary',
        reportJobs: 'Job Performance',
        reportCustomers: 'Customer Status',
        reportEstimates: 'Estimate Conversion',
        reportSchedule: 'Weekly Schedule',
        periodLabel: 'Period',
        periodMonth: 'Last 30 days',
        periodQuarter: 'Current quarter',
        periodYear: 'Current year',
        periodCustom: 'Custom range',
        startDate: 'Start date',
        endDate: 'End date',
        selectRange: 'Select range',
        applyRange: 'Apply range',
        generate: 'Generate Print View',
        print: 'Print / Save PDF',
        totalRevenue: 'Total invoiced',
        totalPaid: 'Paid',
        totalUnpaid: 'Unpaid',
        records: 'Records',
        thDate: 'Date',
        thCustomer: 'Customer',
        thAmount: 'Amount',
        thStatus: 'Status',
        totalExpenses: 'Total expenses',
        thCategory: 'Category',
        thVendor: 'Vendor',
        completedJobs: 'Completed jobs',
        scheduledJobs: 'Scheduled jobs',
        thJobType: 'Service',
        thAddress: 'Address',
        totalCustomers: 'Total customers',
        withDebt: 'With debt',
        thName: 'Name',
        thEmail: 'Email',
        thOutstanding: 'Outstanding',
        thPaid: 'Paid',
        estimatesCreated: 'Estimates created',
        approved: 'Approved',
        conversionRate: 'Conversion rate',
        thTitle: 'Title',
        thCreated: 'Created',
        upcomingJobs: 'Upcoming jobs',
        thWhen: 'Scheduled',
        thTruck: 'Truck',
        noData: 'No records found for the selected period.',
      };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, logo_url, subscription_status')
    .eq('owner_id', user.id)
    .single();

  if (!org) {
    redirect('/signup');
  }

  const initial = org.name ? org.name.charAt(0) : 'C';

  const reportLabels: Record<ReportType, string> = {
    revenue: t.reportRevenue,
    expenses: t.reportExpenses,
    jobs: t.reportJobs,
    customers: t.reportCustomers,
    estimates: t.reportEstimates,
    schedule: t.reportSchedule,
  };

  const periodLabels: Record<PeriodType, string> = {
    '30d': t.periodMonth,
    quarter: t.periodQuarter,
    year: t.periodYear,
    custom: t.periodCustom,
  };

  let reportSummary: Array<{ label: string; value: string }> = [];
  let reportHeaders: string[] = [];
  let reportRows: Array<string[]> = [];

  if (selectedReport === 'revenue') {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name')
      .eq('organization_id', org.id);
    const customerMap = new Map<string, string>();
    (customers || []).forEach((c) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'Unknown';
      customerMap.set(c.id, name);
    });

    const customerIds = (customers || []).map((c) => c.id);
    const { data: invoices } = customerIds.length
      ? await supabase
          .from('invoices')
          .select('created_at, customer_id, total_amount, status')
          .in('customer_id', customerIds)
            .gte('created_at', rangeStartISO)
            .lte('created_at', rangeEndISO)
          .order('created_at', { ascending: false })
      : { data: [] as any[] };

    const totalRevenue = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const totalPaid = (invoices || [])
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const totalUnpaid = (invoices || [])
      .filter((inv) => inv.status === 'unpaid')
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    reportSummary = [
      { label: t.totalRevenue, value: formatCurrency(totalRevenue) },
      { label: t.totalPaid, value: formatCurrency(totalPaid) },
      { label: t.totalUnpaid, value: formatCurrency(totalUnpaid) },
      { label: t.records, value: String(invoices?.length || 0) },
    ];
    reportHeaders = [t.thDate, t.thCustomer, t.thAmount, t.thStatus];
    reportRows = (invoices || []).map((inv) => [
      formatDateShort(inv.created_at, locale),
      customerMap.get(inv.customer_id) || 'Unknown',
      formatCurrency(Number(inv.total_amount || 0)),
      String(inv.status || '-'),
    ]);
  }

  if (selectedReport === 'expenses') {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('expense_date, category, vendor, amount')
      .eq('organization_id', org.id)
      .gte('expense_date', rangeStartDate)
      .lte('expense_date', rangeEndDate)
      .order('expense_date', { ascending: false });

    const totalExpenses = (expenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    reportSummary = [
      { label: t.totalExpenses, value: formatCurrency(totalExpenses) },
      { label: t.records, value: String(expenses?.length || 0) },
    ];
    reportHeaders = [t.thDate, t.thCategory, t.thVendor, t.thAmount];
    reportRows = (expenses || []).map((exp) => [
      formatDateShort(exp.expense_date, locale),
      String(exp.category || '-'),
      String(exp.vendor || '-'),
      formatCurrency(Number(exp.amount || 0)),
    ]);
  }

  if (selectedReport === 'jobs' || selectedReport === 'schedule') {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name')
      .eq('organization_id', org.id);
    const customerIds = (customers || []).map((c) => c.id);

    const customerMap = new Map<string, string>();
    (customers || []).forEach((c) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'Unknown';
      customerMap.set(c.id, name);
    });

    const { data: properties } = customerIds.length
      ? await supabase.from('properties').select('id, customer_id, street_address').in('customer_id', customerIds)
      : { data: [] as any[] };
    const propertyIds = (properties || []).map((p) => p.id);
    const propertyMap = new Map<string, { customerName: string; address: string }>();
    (properties || []).forEach((p) => {
      propertyMap.set(p.id, {
        customerName: customerMap.get(p.customer_id) || 'Unknown',
        address: p.street_address || '-',
      });
    });

    const { data: jobs } = propertyIds.length
      ? await supabase
          .from('jobs')
          .select('scheduled_date, job_type, cost_amount, status, property_id, truck_id')
          .in('property_id', propertyIds)
            .gte('scheduled_date', rangeStartDate)
            .lte('scheduled_date', rangeEndDate)
          .order('scheduled_date', { ascending: true })
      : { data: [] as any[] };

    const completedCount = (jobs || []).filter((job) => job.status === 'completed').length;
    const scheduledCount = (jobs || []).filter((job) => job.status === 'scheduled').length;

    if (selectedReport === 'jobs') {
      reportSummary = [
        { label: t.completedJobs, value: String(completedCount) },
        { label: t.scheduledJobs, value: String(scheduledCount) },
        { label: t.records, value: String(jobs?.length || 0) },
      ];
      reportHeaders = [t.thWhen, t.thCustomer, t.thJobType, t.thAmount, t.thStatus];
      reportRows = (jobs || []).map((job) => [
        formatDateShort(job.scheduled_date, locale),
        propertyMap.get(job.property_id)?.customerName || 'Unknown',
        String(job.job_type || '-'),
        formatCurrency(Number(job.cost_amount || 0)),
        String(job.status || '-'),
      ]);
    } else {
      reportSummary = [
        { label: t.upcomingJobs, value: String(jobs?.length || 0) },
        { label: t.scheduledJobs, value: String(scheduledCount) },
      ];
      reportHeaders = [t.thWhen, t.thCustomer, t.thAddress, t.thJobType, t.thStatus];
      reportRows = (jobs || []).map((job) => [
        formatDateShort(job.scheduled_date, locale),
        propertyMap.get(job.property_id)?.customerName || 'Unknown',
        propertyMap.get(job.property_id)?.address || '-',
        String(job.job_type || '-'),
        String(job.status || '-'),
      ]);
    }
  }

  if (selectedReport === 'customers') {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, email')
      .eq('organization_id', org.id)
      .order('last_name', { ascending: true });

    const customerIds = (customers || []).map((c) => c.id);
    const { data: invoices } = customerIds.length
      ? await supabase
          .from('invoices')
          .select('customer_id, total_amount, status, created_at')
          .in('customer_id', customerIds)
            .gte('created_at', rangeStartISO)
            .lte('created_at', rangeEndISO)
      : { data: [] as any[] };

    const unpaidByCustomer = new Map<string, number>();
    const paidByCustomer = new Map<string, number>();

    (invoices || []).forEach((inv) => {
      const amount = Number(inv.total_amount || 0);
      if (inv.status === 'unpaid') {
        unpaidByCustomer.set(inv.customer_id, (unpaidByCustomer.get(inv.customer_id) || 0) + amount);
      }
      if (inv.status === 'paid') {
        paidByCustomer.set(inv.customer_id, (paidByCustomer.get(inv.customer_id) || 0) + amount);
      }
    });

    const withDebt = Array.from(unpaidByCustomer.values()).filter((v) => v > 0).length;

    reportSummary = [
      { label: t.totalCustomers, value: String(customers?.length || 0) },
      { label: t.withDebt, value: String(withDebt) },
      { label: t.records, value: String(customers?.length || 0) },
    ];
    reportHeaders = [t.thName, t.thEmail, t.thOutstanding, t.thPaid];
    reportRows = (customers || []).map((customer) => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || 'Unknown';
      return [
        name,
        String(customer.email || '-'),
        formatCurrency(unpaidByCustomer.get(customer.id) || 0),
        formatCurrency(paidByCustomer.get(customer.id) || 0),
      ];
    });
  }

  if (selectedReport === 'estimates') {
    const { data: estimates } = await supabase
      .from('estimates')
      .select('created_at, title, estimated_amount, status')
      .eq('organization_id', org.id)
      .gte('created_at', rangeStartISO)
      .lte('created_at', rangeEndISO)
      .order('created_at', { ascending: false });

    const approvedCount = (estimates || []).filter((est) => est.status === 'approved').length;
    const conversionRate = estimates?.length ? Math.round((approvedCount / estimates.length) * 100) : 0;

    reportSummary = [
      { label: t.estimatesCreated, value: String(estimates?.length || 0) },
      { label: t.approved, value: String(approvedCount) },
      { label: t.conversionRate, value: `${conversionRate}%` },
    ];
    reportHeaders = [t.thCreated, t.thTitle, t.thAmount, t.thStatus];
    reportRows = (estimates || []).map((est) => [
      formatDateShort(est.created_at, locale),
      String(est.title || '-'),
      formatCurrency(Number(est.estimated_amount || 0)),
      String(est.status || '-'),
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />

      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-8 text-left">
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-400 mt-1">{t.subtitle}</p>
            </div>

            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.sectionTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{t.sectionDescription}</p>
              </div>

              <PrintReportFilters
                reportTypes={REPORT_TYPES}
                periodTypes={PERIOD_TYPES}
                reportLabels={reportLabels}
                periodLabels={periodLabels}
                selectedReport={selectedReport}
                selectedPeriod={selectedPeriod}
                customStartValue={customStartValue}
                customEndValue={customEndValue}
                sectionTitle={t.sectionTitle}
                periodLabel={t.periodLabel}
                periodCustomLabel={t.periodCustom}
                startDateLabel={t.startDate}
                endDateLabel={t.endDate}
                selectRangeLabel={t.selectRange}
                generateLabel={t.generate}
              />
            </section>

            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{reportLabels[selectedReport]}</h3>
                <PrintPageButton label={t.print} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {reportSummary.map((metric) => (
                  <div key={metric.label} className="border border-gray-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{metric.label}</p>
                    <p className="text-lg font-extrabold text-slate-900 mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>

              {reportRows.length === 0 ? (
                <p className="text-xs text-slate-500">{t.noData}</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {reportHeaders.map((header) => (
                          <th key={header} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row, rowIndex) => (
                        <tr key={`${row.join('-')}-${rowIndex}`} className="border-t border-gray-100 hover:bg-slate-50/60">
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`} className="py-2.5 px-3 text-sm text-gray-800">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <style>{`
        @media print {
          .print-hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          aside {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
