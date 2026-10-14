import { createAdminClient } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import InvoiceReminderEmail from '@/emails/invoice-reminder-email';
import { getResendFromAddress } from '@/lib/resend';
import { formatDocumentNumber, normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';
import { normalizeCurrencyCode } from '@/lib/currency';

export interface ProcessRemindersResult {
  success: boolean;
  totalOverdue: number;
  remindersSent: number;
  skippedRecentlyReminded: number;
  skippedNoEmail: number;
  errors: string[];
}

/**
 * Calculates calendar days elapsed between a past ISO due date and now.
 */
function calculateDaysOverdue(dueDateString: string): number {
  const due = new Date(dueDateString);
  const now = new Date();
  if (Number.isNaN(due.getTime())) return 0;
  const diffMs = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Sends an overdue payment reminder email for a specific invoice.
 */
export async function sendInvoiceOverdueReminder(
  invoiceId: string,
  options: { force?: boolean } = {}
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  if (!invoiceId) return { success: false, error: 'Missing invoice ID.' };

  const adminClient = createAdminClient();

  // Fetch invoice details with customer, job, and organization
  const { data: invoice, error: fetchError } = await adminClient
    .from('invoices')
    .select(`
      id,
      organization_id,
      customer_id,
      job_id,
      invoice_number,
      due_date,
      tax_amount,
      total_amount,
      currency_code,
      status,
      stripe_payment_url,
      notes,
      last_reminder_sent_at,
      reminder_count,
      customers (
        id,
        first_name,
        last_name,
        company_name,
        email,
        organization_id
      ),
      jobs (
        id,
        job_type
      ),
      organizations:organization_id (
        id,
        name,
        slogan,
        logo_url,
        invoice_tax_rate_percent,
        invoice_currency_code,
        document_email_header_color
      )
    `)
    .eq('id', invoiceId)
    .maybeSingle();

  if (fetchError || !invoice) {
    return { success: false, error: fetchError?.message || 'Invoice not found.' };
  }

  if (invoice.status === 'paid') {
    return { success: false, error: 'Invoice has already been marked as paid.' };
  }

  if (!invoice.due_date) {
    return { success: false, error: 'Invoice does not have a due date configured.' };
  }

  const daysOverdue = calculateDaysOverdue(invoice.due_date);
  const isOverdue = new Date(invoice.due_date) < new Date();
  if (!isOverdue && !options.force) {
    return { success: false, error: 'Invoice is not overdue yet.' };
  }

  const customer = invoice.customers as {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    email?: string | null;
  } | null;

  if (!customer?.email) {
    return { success: false, error: 'Customer has no email address configured.' };
  }

  // Rate limiting: unless forced, do not resend reminder if sent within the past 3 days
  if (!options.force && invoice.last_reminder_sent_at) {
    const lastSent = new Date(invoice.last_reminder_sent_at);
    const msSinceLast = Date.now() - lastSent.getTime();
    const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);
    if (daysSinceLast < 3) {
      return { success: true, skipped: true };
    }
  }

  const org = (invoice.organizations as {
    id?: string;
    name?: string | null;
    slogan?: string | null;
    logo_url?: string | null;
    invoice_tax_rate_percent?: number | null;
    invoice_currency_code?: string | null;
    document_email_header_color?: string | null;
  } | null) || null;

  const organizationName = org?.name?.trim() || 'Prado Systems';
  const organizationSlogan = org?.slogan?.trim() || '';
  const organizationLogoUrl = org?.logo_url?.trim() || '';
  const documentEmailHeaderColor = normalizeDocumentEmailHeaderColor(org?.document_email_header_color);
  const fromAddress = getResendFromAddress({ email: process.env.RESEND_FROM_EMAIL, displayName: organizationName });
  const replyToAddress = process.env.RESEND_REPLY_TO_EMAIL || undefined;

  const customerDisplayName =
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    customer.company_name ||
    'Customer';

  const formattedInvoiceNumber = formatDocumentNumber('invoice', invoice.invoice_number);
  const totalAmount = Number(invoice.total_amount || 0);
  const taxAmount = Number(invoice.tax_amount || 0);
  const baseAmount = Math.max(0, parseFloat((totalAmount - taxAmount).toFixed(2)));
  const taxRatePercent = Number(org?.invoice_tax_rate_percent ?? 8.25);
  const serviceName = (invoice.jobs as any)?.job_type || invoice.notes || 'Service Invoice';
  const currencyCode = normalizeCurrencyCode(invoice.currency_code || org?.invoice_currency_code);

  const reminderHtml = await render(
    InvoiceReminderEmail({
      customerName: customerDisplayName,
      serviceName,
      dueDate: invoice.due_date,
      daysOverdue,
      baseAmount,
      taxAmount,
      taxRatePercent,
      currencyCode,
      totalAmount,
      invoiceNumber: invoice.invoice_number,
      paymentUrl: invoice.stripe_payment_url || undefined,
      organizationName,
      organizationSlogan,
      organizationLogoUrl,
      headerColor: documentEmailHeaderColor,
    })
  );

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured.' };
  }

  const resend = new Resend(apiKey);
  const subject = formattedInvoiceNumber
    ? `[PAYMENT REMINDER] ${organizationName} Invoice ${formattedInvoiceNumber} is Past Due`
    : `[PAYMENT REMINDER] Outstanding Invoice for ${serviceName} - ${organizationName}`;

  const { error: sendError } = await resend.emails.send({
    from: fromAddress,
    to: customer.email,
    replyTo: replyToAddress,
    subject,
    html: reminderHtml,
  });

  if (sendError) {
    return { success: false, error: sendError.message };
  }

  // Update last_reminder_sent_at and increment reminder_count
  const nextReminderCount = Number(invoice.reminder_count || 0) + 1;
  const nowIso = new Date().toISOString();

  await adminClient
    .from('invoices')
    .update({
      last_reminder_sent_at: nowIso,
      reminder_count: nextReminderCount,
    })
    .eq('id', invoice.id);

  return { success: true };
}

/**
 * Scans for all overdue unpaid invoices and sends reminder emails.
 * Includes rate-limiting (default: at least 3 days between reminders).
 */
export async function processOverdueInvoiceReminders(
  options: {
    organizationId?: string;
    minDaysBetweenReminders?: number;
    batchSize?: number;
  } = {}
): Promise<ProcessRemindersResult> {
  const minDays = options.minDaysBetweenReminders ?? 3;
  const batchSize = Math.max(1, Math.min(200, options.batchSize ?? 50));
  const todayIso = new Date().toISOString().split('T')[0];

  const adminClient = createAdminClient();

  let query = adminClient
    .from('invoices')
    .select(`
      id,
      organization_id,
      customer_id,
      due_date,
      status,
      last_reminder_sent_at,
      reminder_count,
      customers (
        id,
        email
      )
    `)
    .eq('status', 'unpaid')
    .lt('due_date', todayIso)
    .order('due_date', { ascending: true })
    .limit(batchSize);

  if (options.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }

  const { data: overdueInvoices, error: queryError } = await query;

  if (queryError) {
    return {
      success: false,
      totalOverdue: 0,
      remindersSent: 0,
      skippedRecentlyReminded: 0,
      skippedNoEmail: 0,
      errors: [queryError.message],
    };
  }

  const invoices = overdueInvoices || [];
  let sentCount = 0;
  let skippedRecentlyReminded = 0;
  let skippedNoEmail = 0;
  const errors: string[] = [];

  for (const inv of invoices) {
    const customer = inv.customers as { email?: string | null } | null;
    if (!customer?.email) {
      skippedNoEmail++;
      continue;
    }

    if (inv.last_reminder_sent_at) {
      const lastSentTime = new Date(inv.last_reminder_sent_at).getTime();
      const daysSince = (Date.now() - lastSentTime) / (1000 * 60 * 60 * 24);
      if (daysSince < minDays) {
        skippedRecentlyReminded++;
        continue;
      }
    }

    const result = await sendInvoiceOverdueReminder(inv.id, { force: false });
    if (result.success) {
      if (result.skipped) {
        skippedRecentlyReminded++;
      } else {
        sentCount++;
      }
    } else if (result.error) {
      errors.push(`Invoice ${inv.id}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    totalOverdue: invoices.length,
    remindersSent: sentCount,
    skippedRecentlyReminded,
    skippedNoEmail,
    errors,
  };
}
