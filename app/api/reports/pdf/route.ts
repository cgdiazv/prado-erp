import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@/lib/supabaseServer';

type ReportType = 'revenue' | 'expenses' | 'jobs' | 'customers' | 'estimates' | 'schedule';
type PeriodType = '30d' | 'quarter' | 'year' | 'custom';

const REPORT_TYPES: ReportType[] = ['revenue', 'expenses', 'jobs', 'customers', 'estimates', 'schedule'];
const PERIOD_TYPES: PeriodType[] = ['30d', 'quarter', 'year', 'custom'];

function isReportType(value: string | null): value is ReportType {
  return !!value && REPORT_TYPES.includes(value as ReportType);
}

function isPeriodType(value: string | null): value is PeriodType {
  return !!value && PERIOD_TYPES.includes(value as PeriodType);
}

function isDateInput(value: string | null): value is string {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toPeriodStart(period: Exclude<PeriodType, 'custom'>): Date {
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

function fitText(text: string, maxLen = 120) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}...`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportParam = searchParams.get('report');
    const periodParam = searchParams.get('period');
    const lng = searchParams.get('lng') || 'en';

    const selectedReport: ReportType = isReportType(reportParam) ? reportParam : 'revenue';
    const selectedPeriod: PeriodType = isPeriodType(periodParam) ? periodParam : '30d';

    const fallbackStart = toPeriodStart(selectedPeriod === 'custom' ? '30d' : selectedPeriod);
    const today = new Date();

    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const selectedStartDate = isDateInput(startParam) ? new Date(`${startParam}T00:00:00`) : fallbackStart;
    const selectedEndDate = isDateInput(endParam) ? new Date(`${endParam}T23:59:59.999`) : today;

    const hasValidCustomRange =
      selectedPeriod === 'custom' &&
      isDateInput(startParam) &&
      isDateInput(endParam) &&
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

    const reportLabels: Record<ReportType, string> = lng.startsWith('es')
      ? {
          revenue: 'Resumen de Ingresos',
          expenses: 'Resumen de Gastos',
          jobs: 'Rendimiento de Jobs',
          customers: 'Estado de Clientes',
          estimates: 'Conversion de Cotizaciones',
          schedule: 'Agenda Semanal',
        }
      : {
          revenue: 'Revenue Summary',
          expenses: 'Expense Summary',
          jobs: 'Job Performance',
          customers: 'Customer Status',
          estimates: 'Estimate Conversion',
          schedule: 'Weekly Schedule',
        };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    let summary: Array<{ label: string; value: string }> = [];
    let headers: string[] = [];
    let rows: string[][] = [];

    if (selectedReport === 'revenue') {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name')
        .eq('organization_id', org.id);

      const customerMap = new Map<string, string>();
      (customers || []).forEach((c: any) => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'Unknown';
        customerMap.set(c.id, name);
      });

      const customerIds = (customers || []).map((c: any) => c.id);
      const { data: invoices } = customerIds.length
        ? await supabase
            .from('invoices')
            .select('created_at, customer_id, total_amount, status')
            .in('customer_id', customerIds)
            .gte('created_at', rangeStartISO)
            .lte('created_at', rangeEndISO)
            .order('created_at', { ascending: false })
        : { data: [] as any[] };

      const totalRevenue = (invoices || []).reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
      const totalPaid = (invoices || [])
        .filter((inv: any) => inv.status === 'paid')
        .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
      const totalUnpaid = (invoices || [])
        .filter((inv: any) => inv.status === 'unpaid')
        .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);

      summary = [
        { label: 'Total', value: formatCurrency(totalRevenue) },
        { label: 'Paid', value: formatCurrency(totalPaid) },
        { label: 'Unpaid', value: formatCurrency(totalUnpaid) },
        { label: 'Records', value: String(invoices?.length || 0) },
      ];
      headers = ['Date', 'Customer', 'Amount', 'Status'];
      rows = (invoices || []).map((inv: any) => [
        formatDateShort(inv.created_at, lng),
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

      const totalExpenses = (expenses || []).reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
      summary = [
        { label: 'Total', value: formatCurrency(totalExpenses) },
        { label: 'Records', value: String(expenses?.length || 0) },
      ];
      headers = ['Date', 'Category', 'Vendor', 'Amount'];
      rows = (expenses || []).map((exp: any) => [
        formatDateShort(exp.expense_date, lng),
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
      const customerIds = (customers || []).map((c: any) => c.id);

      const customerMap = new Map<string, string>();
      (customers || []).forEach((c: any) => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'Unknown';
        customerMap.set(c.id, name);
      });

      const { data: properties } = customerIds.length
        ? await supabase.from('properties').select('id, customer_id, street_address').in('customer_id', customerIds)
        : { data: [] as any[] };

      const propertyIds = (properties || []).map((p: any) => p.id);
      const propertyMap = new Map<string, { customerName: string; address: string }>();
      (properties || []).forEach((p: any) => {
        propertyMap.set(p.id, {
          customerName: customerMap.get(p.customer_id) || 'Unknown',
          address: p.street_address || '-',
        });
      });

      const { data: jobs } = propertyIds.length
        ? await supabase
            .from('jobs')
            .select('scheduled_date, job_type, cost_amount, status, property_id')
            .in('property_id', propertyIds)
            .gte('scheduled_date', rangeStartDate)
            .lte('scheduled_date', rangeEndDate)
            .order('scheduled_date', { ascending: true })
        : { data: [] as any[] };

      const completed = (jobs || []).filter((job: any) => job.status === 'completed').length;
      const scheduled = (jobs || []).filter((job: any) => job.status === 'scheduled').length;

      if (selectedReport === 'jobs') {
        summary = [
          { label: 'Completed', value: String(completed) },
          { label: 'Scheduled', value: String(scheduled) },
          { label: 'Records', value: String(jobs?.length || 0) },
        ];
        headers = ['Scheduled', 'Customer', 'Service', 'Amount', 'Status'];
        rows = (jobs || []).map((job: any) => [
          formatDateShort(job.scheduled_date, lng),
          propertyMap.get(job.property_id)?.customerName || 'Unknown',
          String(job.job_type || '-'),
          formatCurrency(Number(job.cost_amount || 0)),
          String(job.status || '-'),
        ]);
      } else {
        summary = [
          { label: 'Upcoming', value: String(jobs?.length || 0) },
          { label: 'Scheduled', value: String(scheduled) },
        ];
        headers = ['Scheduled', 'Customer', 'Address', 'Service', 'Status'];
        rows = (jobs || []).map((job: any) => [
          formatDateShort(job.scheduled_date, lng),
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

      const customerIds = (customers || []).map((c: any) => c.id);
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

      (invoices || []).forEach((inv: any) => {
        const amount = Number(inv.total_amount || 0);
        if (inv.status === 'unpaid') unpaidByCustomer.set(inv.customer_id, (unpaidByCustomer.get(inv.customer_id) || 0) + amount);
        if (inv.status === 'paid') paidByCustomer.set(inv.customer_id, (paidByCustomer.get(inv.customer_id) || 0) + amount);
      });

      const withDebt = Array.from(unpaidByCustomer.values()).filter((v) => v > 0).length;

      summary = [
        { label: 'Customers', value: String(customers?.length || 0) },
        { label: 'With debt', value: String(withDebt) },
      ];
      headers = ['Name', 'Email', 'Outstanding', 'Paid'];
      rows = (customers || []).map((customer: any) => {
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

      const approved = (estimates || []).filter((est: any) => est.status === 'approved').length;
      const conversionRate = estimates?.length ? Math.round((approved / estimates.length) * 100) : 0;

      summary = [
        { label: 'Estimates', value: String(estimates?.length || 0) },
        { label: 'Approved', value: String(approved) },
        { label: 'Conversion', value: `${conversionRate}%` },
      ];
      headers = ['Created', 'Title', 'Amount', 'Status'];
      rows = (estimates || []).map((est: any) => [
        formatDateShort(est.created_at, lng),
        String(est.title || '-'),
        formatCurrency(Number(est.estimated_amount || 0)),
        String(est.status || '-'),
      ]);
    }

    const pdfDoc = await PDFDocument.create();
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([792, 612]);
    const margin = 40;
    const lineHeight = 14;
    let y = page.getHeight() - margin;

    const ensureSpace = (required = lineHeight) => {
      if (y - required < margin) {
        page = pdfDoc.addPage([792, 612]);
        y = page.getHeight() - margin;
      }
    };

    page.drawText(org.name || 'Prado ERP', {
      x: margin,
      y,
      size: 18,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 24;

    page.drawText(`${reportLabels[selectedReport]} (${rangeStartDate} to ${rangeEndDate})`, {
      x: margin,
      y,
      size: 11,
      font: regular,
      color: rgb(0.25, 0.25, 0.25),
    });
    y -= 22;

    page.drawText('Summary', {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 16;

    summary.forEach((metric) => {
      ensureSpace();
      page.drawText(`${metric.label}: ${metric.value}`, {
        x: margin,
        y,
        size: 10,
        font: regular,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= lineHeight;
    });

    y -= 10;
    ensureSpace(24);

    page.drawText('Details', {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 16;

    if (headers.length > 0) {
      ensureSpace();
      page.drawText(fitText(headers.join(' | '), 140), {
        x: margin,
        y,
        size: 9,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    }

    if (rows.length === 0) {
      ensureSpace();
      page.drawText('No records for selected range.', {
        x: margin,
        y,
        size: 10,
        font: regular,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= lineHeight;
    } else {
      rows.forEach((row) => {
        ensureSpace();
        page.drawText(fitText(row.join(' | '), 140), {
          x: margin,
          y,
          size: 9,
          font: regular,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= lineHeight;
      });
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `${selectedReport}-${rangeStartDate}-to-${rangeEndDate}.pdf`;
    const pdfSafeBytes = Uint8Array.from(pdfBytes);
    const pdfBlob = new Blob([pdfSafeBytes], { type: 'application/pdf' });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate report PDF.';
    return new NextResponse(message, { status: 500 });
  }
}
