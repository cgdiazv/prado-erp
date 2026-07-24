'use server';

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import EstimateEmail from '@/emails/estimate-email';
import InvoiceEmail from '@/emails/invoice-email';
import InviteMemberEmail from '@/emails/invite-member-email';
import JobScheduledEmail from '@/emails/job-scheduled-email';
import JobCompletedEmail from '@/emails/job-completed-email';
import { enqueueXeroCompletedJobInvoice, enqueueXeroExpenseBill } from '@/app/actions/xeroActions';
import { syncInvoiceToQBO } from '@/app/actions/qboActions';
import { geocodeAddressServer } from '@/lib/googleMapsServer';
import { getUserOrganization } from '@/lib/organization';
import { findAuthUserIndexByEmail, findAuthUserIndexByUserIds, normalizeAuthEmail, upsertAuthUserIndex } from '@/lib/userAuthIndex';
import { normalizeCurrencyCode, toStripeCurrency } from '@/lib/currency';
import Stripe from 'stripe';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';
const DEFAULT_INVOICE_TAX_RATE_PERCENT = 8.25;

function normalizeInvoiceTaxRatePercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_INVOICE_TAX_RATE_PERCENT;
  }

  return Math.round(parsed * 100) / 100;
}

function formatTaxRatePercent(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'https://pradojob.com';
}

function buildJobCalendarUrl({
  id,
  scheduledDate,
  jobType,
  address,
  truckName,
  costAmount,
}: {
  id: string;
  scheduledDate: string;
  jobType: string;
  address?: string | null;
  truckName?: string | null;
  costAmount: number;
}) {
  const baseUrl = getAppBaseUrl();
  const params = new URLSearchParams({
    id,
    scheduledDate,
    jobType,
    costAmount: String(costAmount),
  });

  if (address) {
    params.set('address', address);
  }

  if (truckName) {
    params.set('truckName', truckName);
  }

  return `${baseUrl}/api/calendar/job?${params.toString()}`;
}

function addDaysToIsoDate(isoDate: string, days: number): string | null {
  if (!isoDate || !Number.isFinite(days) || days <= 0) return null;

  const base = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;

  base.setUTCDate(base.getUTCDate() + Math.floor(days));
  return base.toISOString().slice(0, 10);
}

async function createInvoiceCheckoutSession({
  invoiceId,
  organizationId,
  customerId,
  stripeAccountId,
  customerEmail,
  customerName,
  serviceName,
  baseAmount,
  taxAmount,
  taxRatePercent,
  currencyCode,
  totalAmount,
  enableAutopayIfPossible,
}: {
  invoiceId: string;
  organizationId: string;
  customerId: string;
  stripeAccountId: string;
  customerEmail: string;
  customerName: string;
  serviceName: string;
  baseAmount: number;
  taxAmount: number;
  taxRatePercent: number;
  currencyCode: string;
  totalAmount: number;
  enableAutopayIfPossible: boolean;
}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  const totalAmountCents = Math.round(Number(totalAmount || 0) * 100);
  const baseAmountCents = Math.round(Number(baseAmount || 0) * 100);
  const taxAmountCents = Math.round(Number(taxAmount || 0) * 100);
  const taxRateLabel = formatTaxRatePercent(normalizeInvoiceTaxRatePercent(taxRatePercent));
  const stripeCurrency = toStripeCurrency(normalizeCurrencyCode(currencyCode));

  if (totalAmountCents <= 0 || baseAmountCents < 0 || taxAmountCents < 0) {
    return null;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const baseUrl = getAppBaseUrl();

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      client_reference_id: invoiceId,
      customer_email: customerEmail,
      success_url: `${baseUrl}/en/payment/success?invoice=${encodeURIComponent(invoiceId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/en/payment/cancel?invoice=${encodeURIComponent(invoiceId)}`,
      metadata: {
        platform: 'prado',
        invoiceId,
        organizationId,
        customerId,
        customerName,
        source: 'prado_invoice',
        enableAutopayIfPossible: enableAutopayIfPossible ? 'true' : 'false',
      },
      payment_intent_data: {
        transfer_data: {
          destination: stripeAccountId,
        },
        setup_future_usage: enableAutopayIfPossible ? 'off_session' : undefined,
        metadata: {
          platform: 'prado',
          invoiceId,
          organizationId,
          customerId,
          source: 'prado_invoice',
          enableAutopayIfPossible: enableAutopayIfPossible ? 'true' : 'false',
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: stripeCurrency,
            unit_amount: baseAmountCents,
            product_data: {
              name: serviceName,
            },
          },
        },
        ...(taxAmountCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: stripeCurrency,
                  unit_amount: taxAmountCents,
                  product_data: {
                    name: `Estimated Tax (${taxRateLabel}%)`,
                  },
                },
              },
            ]
          : []),
      ],
    },
    {
      idempotencyKey: `invoice-session-${invoiceId}`,
    }
  );

  return {
    sessionId: session.id,
    paymentUrl: session.url,
  };
}

export async function createJob(formData: FormData) {
  const propertyId = formData.get('propertyId') as string;
  const scheduledDate = formData.get('scheduledDate') as string;
  const serviceId = (formData.get('serviceId') as string) || null;
  const jobTypeInput = (formData.get('jobType') as string) || '';
  const costAmountInput = parseFloat(formData.get('costAmount') as string || '0');
  const notes = formData.get('notes') as string;
  const truckId = formData.get('truckId') as string || null;
  const formRecurring = (formData.get('isRecurring') as string) === 'true';
  const formRecurrenceIntervalDays = Number.parseInt((formData.get('recurrenceIntervalDays') as string) || '0', 10);
  const formAutoChargeEnabled = (formData.get('autoChargeEnabled') as string) === 'true';

  const supabase = await createClient();

  let resolvedJobType = jobTypeInput;
  let resolvedCostAmount = Number.isFinite(costAmountInput) ? costAmountInput : 0;
  let resolvedIsRecurring = formRecurring;
  let resolvedRecurrenceIntervalDays = Number.isFinite(formRecurrenceIntervalDays) && formRecurrenceIntervalDays > 0 ? formRecurrenceIntervalDays : null;
  let resolvedAutoChargeEnabled = formAutoChargeEnabled;

  if (serviceId) {
    const { data: service } = await supabase
      .from('services')
      .select('id, name, base_price, is_recurring_default, recurrence_interval_days, auto_charge_default')
      .eq('id', serviceId)
      .maybeSingle();

    if (service) {
      resolvedJobType = service.name || resolvedJobType;

      if (!Number.isFinite(costAmountInput) || costAmountInput <= 0) {
        resolvedCostAmount = Number(service.base_price || 0);
      }

      resolvedIsRecurring = Boolean(service.is_recurring_default);
      resolvedRecurrenceIntervalDays = resolvedIsRecurring && Number(service.recurrence_interval_days || 0) > 0
        ? Number(service.recurrence_interval_days)
        : null;
      resolvedAutoChargeEnabled = resolvedIsRecurring ? Boolean(service.auto_charge_default) : false;
    }
  }

  if (!propertyId || !scheduledDate || !resolvedJobType) {
    return { error: 'Missing required fields' };
  }

  if (!Number.isFinite(resolvedCostAmount) || resolvedCostAmount < 0) {
    return { error: 'Invalid cost amount.' };
  }

  if (resolvedIsRecurring && (!resolvedRecurrenceIntervalDays || resolvedRecurrenceIntervalDays < 1)) {
    return { error: 'Recurring jobs require a valid recurrence interval.' };
  }

  const { data: insertedJobs, error } = await supabase
    .from('jobs')
    .insert([
      {
        property_id: propertyId,
        scheduled_date: scheduledDate,
        job_type: resolvedJobType,
        cost_amount: resolvedCostAmount,
        notes: notes,
        status: 'scheduled',
        truck_id: truckId ? truckId : null,
        service_id: serviceId,
        is_recurring: resolvedIsRecurring,
        recurrence_interval_days: resolvedRecurrenceIntervalDays,
        auto_charge_enabled: resolvedAutoChargeEnabled,
      }
    ])
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  const jobId = insertedJobs?.id;

  // Send job scheduled confirmation email to the customer
  try {
    const supabase2 = await createClient();
    const { data: { user } } = await supabase2.auth.getUser();

    const { data: org } = await supabase2
      .from('organizations')
      .select('id, name, slogan, logo_url')
      .eq('owner_id', user?.id)
      .single();

    const { data: property } = await supabase2
      .from('properties')
      .select('street_address, customer_id, customers(first_name, last_name, email, company_name)')
      .eq('id', propertyId)
      .single();

    const customerMeta = (property as any)?.customers;
    const customerEmail = customerMeta?.email;

    if (customerEmail && org) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmailAddress = process.env.RESEND_FROM_EMAIL || 'notifications@indevasa.com';
      const organizationName = org.name?.trim() || 'Prado ERP';
      const customerDisplayName =
        `${customerMeta.first_name || ''} ${customerMeta.last_name || ''}`.trim() ||
        customerMeta.company_name ||
        'Valued Customer';

      let truckName: string | null = null;
      if (truckId) {
        const { data: truck } = await supabase2.from('trucks').select('name').eq('id', truckId).single();
        truckName = truck?.name ?? null;
      }

      const calendarUrl = jobId
        ? buildJobCalendarUrl({
            id: jobId,
            scheduledDate,
            jobType: resolvedJobType,
            address: property?.street_address ?? null,
            truckName,
            costAmount: resolvedCostAmount,
          })
        : null;

      const emailHtml = await render(
        JobScheduledEmail({
          customerName: customerDisplayName,
          jobType: resolvedJobType,
          scheduledDate,
          address: property?.street_address ?? null,
          costAmount: resolvedCostAmount,
          truckName,
          calendarUrl,
          organizationName,
          organizationSlogan: org.slogan?.trim() || 'Field Service Software',
          organizationLogoUrl: org.logo_url?.trim() || '',
        })
      );

      await resend.emails.send({
        from: `${organizationName} <${fromEmailAddress}>`,
        to: customerEmail,
        replyTo: user?.email || process.env.RESEND_REPLY_TO_EMAIL || undefined,
        subject: `Service Scheduled: ${resolvedJobType} on ${scheduledDate}`,
        html: emailHtml,
      });
    }
  } catch (emailErr) {
    console.error('⚠️ Job created but scheduled email failed to send:', emailErr);
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/schedule');
  revalidatePath('/dashboard/routing');
  revalidatePath('/dashboard/print-reports');
  return { success: true };
}

export async function updateJobTruckAssignment(jobId: string, truckId: string | null) {
  if (!jobId) return { error: 'Missing Job ID' };

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) return { error: 'No organizational profile found.' };

    const { error } = await supabase
      .from('jobs')
      .update({ truck_id: truckId })
      .eq('id', jobId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/routing');
    revalidatePath('/dashboard/schedule');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update job assignment.' };
  }
}

export async function updateJobScheduleDetails(
  jobId: string,
  scheduledDate: string,
  truckId: string | null,
  options?: {
    isRecurring?: boolean;
    recurrenceIntervalDays?: number | null;
    autoChargeEnabled?: boolean;
  }
) {
  if (!jobId || !scheduledDate) return { error: 'Missing scheduling parameters.' };

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) return { error: 'No organizational profile found.' };

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', org.id);

    const customerIds = (customers || []).map((customer) => customer.id);
    if (customerIds.length === 0) {
      return { error: 'No customers found for this organization.' };
    }

    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .in('customer_id', customerIds);

    const propertyIds = (properties || []).map((property) => property.id);
    if (propertyIds.length === 0) {
      return { error: 'No properties found for this organization.' };
    }

    const { data: targetJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .in('property_id', propertyIds)
      .maybeSingle();

    if (!targetJob) {
      return { error: 'Job not found for this organization.' };
    }

    const normalizedIsRecurring = Boolean(options?.isRecurring);
    const requestedInterval = Number(options?.recurrenceIntervalDays || 0);
    const normalizedRecurrenceIntervalDays = normalizedIsRecurring
      ? (Number.isFinite(requestedInterval) && requestedInterval > 0 ? Math.floor(requestedInterval) : null)
      : null;
    const normalizedAutoChargeEnabled = normalizedIsRecurring ? Boolean(options?.autoChargeEnabled) : false;

    if (normalizedIsRecurring && !normalizedRecurrenceIntervalDays) {
      return { error: 'Recurring jobs require a valid recurrence interval.' };
    }

    const { error } = await supabase
      .from('jobs')
      .update({
        scheduled_date: scheduledDate,
        truck_id: truckId || null,
        is_recurring: normalizedIsRecurring,
        recurrence_interval_days: normalizedRecurrenceIntervalDays,
        auto_charge_enabled: normalizedAutoChargeEnabled,
      })
      .eq('id', jobId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/schedule');
    revalidatePath('/dashboard/routing');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update schedule details.' };
  }
}

export async function completeJob(jobId: string) {
  if (!jobId) return { error: 'Missing Job ID' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slogan, logo_url, subscription_status, stripe_account_id, stripe_account_charges_enabled, stripe_account_payouts_enabled, invoice_tax_rate_percent, invoice_currency_code')
    .eq('owner_id', user?.id)
    .single();

  const organizationName = org?.name?.trim() || 'Prado ERP';
  const organizationSlogan = org?.slogan?.trim() || 'Field Service Software';
  const organizationLogoUrl = org?.logo_url?.trim() || '';

  // 1. Fetch job details AND include nested customer profile information for email delivery
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('*, properties(customer_id, street_address, customers(id, first_name, last_name, email, company_name, autopay_enabled, stripe_payment_customer_id, stripe_default_payment_method_id))')
    .eq('id', jobId)
    .single();

  if (fetchError || !job) {
    return { error: fetchError?.message || 'Job not found' };
  }

  // 2. Update the job status to 'completed'
  const { error: updateError } = await supabase
    .from('jobs')
    .update({ status: 'completed' })
    .eq('id', jobId);

  if (updateError) return { error: updateError.message };

  const recurrenceIntervalDays = Number(job.recurrence_interval_days || 0);
  if (Boolean(job.is_recurring) && recurrenceIntervalDays > 0) {
    const nextScheduledDate = addDaysToIsoDate(job.scheduled_date, recurrenceIntervalDays);

    if (nextScheduledDate) {
      const { data: existingNextJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('recurring_source_job_id', job.id)
        .eq('scheduled_date', nextScheduledDate)
        .maybeSingle();

      if (!existingNextJob) {
        await supabase
          .from('jobs')
          .insert([
            {
              property_id: job.property_id,
              scheduled_date: nextScheduledDate,
              job_type: job.job_type,
              cost_amount: Number(job.cost_amount || 0),
              notes: job.notes || null,
              status: 'scheduled',
              truck_id: null,
              service_id: job.service_id || null,
              is_recurring: true,
              recurrence_interval_days: recurrenceIntervalDays,
              auto_charge_enabled: Boolean(job.auto_charge_enabled),
              recurring_source_job_id: job.id,
            },
          ]);
      }
    }
  }

  // 3. Bookkeeping Automation: Auto-generate the customer invoice
  const cost = Number(job.cost_amount || 0);
  const taxRatePercent = normalizeInvoiceTaxRatePercent(org?.invoice_tax_rate_percent);
  const invoiceCurrencyCode = normalizeCurrencyCode(org?.invoice_currency_code);
  const estimatedTax = parseFloat((cost * (taxRatePercent / 100)).toFixed(2));
  const total = parseFloat((cost + estimatedTax).toFixed(2));
  
  if (!job.properties) {
    return { error: 'Job properties not found' };
  }
  const customerId = job.properties.customer_id;
  const customerMeta = (job.properties as any).customers; 
  
  // Set the invoice due date to today (due immediately upon completion)
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: invoiceRecord, error: invoiceError } = await supabase
    .from('invoices')
    .insert([
      {
        customer_id: customerId,
        due_date: todayStr,
        status: 'unpaid',
        total_amount: total,
        tax_amount: estimatedTax,
        currency_code: invoiceCurrencyCode,
      },
    ])
    .select('id')
    .single();

  if (invoiceError) return { error: invoiceError.message };

  const customerDisplayName = `${customerMeta?.first_name || ''} ${customerMeta?.last_name || ''}`.trim() || customerMeta?.company_name || 'Prado Customer';

  let paymentUrl: string | null = null;
  let stripeCheckoutSessionId: string | null = null;
  let invoiceWasAutoCharged = false;

  if (
    org?.id &&
    org?.subscription_status !== 'individual' &&
    org?.stripe_account_id &&
    org?.stripe_account_charges_enabled &&
    org?.stripe_account_payouts_enabled &&
    customerMeta?.email
  ) {
    try {
      if (
        Boolean(job.auto_charge_enabled) &&
        Boolean(customerMeta?.autopay_enabled) &&
        customerMeta?.stripe_payment_customer_id &&
        customerMeta?.stripe_default_payment_method_id &&
        Number(total || 0) > 0
      ) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(Number(total || 0) * 100),
          currency: toStripeCurrency(invoiceCurrencyCode),
          customer: customerMeta.stripe_payment_customer_id,
          payment_method: customerMeta.stripe_default_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Prado invoice ${invoiceRecord.id} - ${job.job_type}`,
          transfer_data: {
            destination: org.stripe_account_id,
          },
          metadata: {
            platform: 'prado',
            source: 'prado_invoice_autopay',
            invoiceId: invoiceRecord.id,
            organizationId: org.id,
            customerId,
          },
        });

        if (paymentIntent.status === 'succeeded') {
          invoiceWasAutoCharged = true;
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              stripe_payment_status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', invoiceRecord.id);
        }
      }

      if (!invoiceWasAutoCharged) {
        const paymentSession = await createInvoiceCheckoutSession({
          invoiceId: invoiceRecord.id,
          organizationId: org.id,
          customerId,
          stripeAccountId: org.stripe_account_id,
          customerEmail: customerMeta.email,
          customerName: customerDisplayName,
          serviceName: job.job_type,
          baseAmount: Number(cost || 0),
          taxAmount: Number(estimatedTax || 0),
          taxRatePercent,
          currencyCode: invoiceCurrencyCode,
          totalAmount: Number(total || 0),
          enableAutopayIfPossible: Boolean(job.auto_charge_enabled),
        });

        paymentUrl = paymentSession?.paymentUrl || null;
        stripeCheckoutSessionId = paymentSession?.sessionId || null;
      }
    } catch (paymentErr) {
      console.error('⚠️ Invoice created, but Stripe payment link generation failed:', paymentErr);
    }
  }

  if (!invoiceWasAutoCharged && (paymentUrl || stripeCheckoutSessionId)) {
    const { error: paymentUpdateError } = await supabase
      .from('invoices')
      .update({
        stripe_payment_url: paymentUrl,
        stripe_checkout_session_id: stripeCheckoutSessionId,
        stripe_payment_status: 'open',
      })
      .eq('id', invoiceRecord.id);

    if (paymentUpdateError) {
      console.error('⚠️ Failed to persist Stripe payment metadata on invoice:', paymentUpdateError.message);
    }
  }

  // Queue accounting sync immediately only when no Stripe checkout session exists.
  // For online payments, sync is triggered after successful payment from the Stripe webhook.
  if (org?.id && invoiceRecord?.id && !stripeCheckoutSessionId) {
    const queueResult = await enqueueXeroCompletedJobInvoice({
      organizationId: org.id,
      customerName: customerDisplayName,
      customerEmail: customerMeta?.email || null,
      jobType: job.job_type,
      invoiceId: invoiceRecord.id,
      dueDate: todayStr,
      baseAmount: Number(cost || 0),
      taxAmount: Number(estimatedTax || 0),
      taxRatePercent,
      currencyCode: invoiceCurrencyCode,
    });

    if (!queueResult.success) {
      console.error('Xero queue warning (invoice kept in Prado):', queueResult.error);
    }

    // QBO sync (fire-and-forget, non-blocking)
    syncInvoiceToQBO({
      organizationId: org.id,
      customerName: customerDisplayName,
      customerEmail: customerMeta?.email || null,
      jobType: job.job_type,
      dueDate: todayStr,
      baseAmount: Number(cost || 0),
      taxAmount: Number(estimatedTax || 0),
      taxRatePercent,
      currencyCode: invoiceCurrencyCode,
    }).catch((err) => console.error('QBO sync warning (invoice kept in Prado):', err));
  }

  // 4. EMAIL AUTOMATION ENGINE: Dispatches invoice instantly via Resend if email is verified
  if (customerMeta?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmailAddress = process.env.RESEND_FROM_EMAIL || 'notifications@indevasa.com';
    const fromAddress = `${organizationName} <${fromEmailAddress}>`;
    const replyToAddress = user?.email || process.env.RESEND_REPLY_TO_EMAIL || undefined;
    const customerDisplayName = `${customerMeta.first_name || ''} ${customerMeta.last_name || ''}`.trim() || customerMeta.company_name || 'Valued Customer';
    const invoiceHtml = await render(
      InvoiceEmail({
        customerName: customerDisplayName,
        serviceName: job.job_type,
        dueDate: todayStr,
        baseAmount: cost,
        taxAmount: estimatedTax,
        taxRatePercent,
        currencyCode: invoiceCurrencyCode,
        totalAmount: total,
        paymentUrl: paymentUrl || undefined,
        organizationName,
        organizationSlogan,
        organizationLogoUrl,
      })
    );

    try {
      await resend.emails.send({
        from: fromAddress,
        to: customerMeta.email,
        replyTo: replyToAddress,
        subject: `Invoice for Completed Service - ${job.job_type}`,
        html: invoiceHtml,
      });

      const address = (job.properties as any)?.street_address ?? null;
      const completedHtml = await render(
        JobCompletedEmail({
          customerName: customerDisplayName,
          jobType: job.job_type,
          completedDate: todayStr,
          address,
          baseAmount: cost,
          taxAmount: estimatedTax,
          taxRatePercent,
          currencyCode: invoiceCurrencyCode,
          totalAmount: total,
          organizationName,
          organizationSlogan,
          organizationLogoUrl,
        })
      );
      await resend.emails.send({
        from: fromAddress,
        to: customerMeta.email,
        replyTo: replyToAddress,
        subject: `Service Completed: ${job.job_type}`,
        html: completedHtml,
      });
    } catch (emailErr) {
      console.error('⚠️ Invoice recorded in database, but Resend pipe failed to deliver message:', emailErr);
    }
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/schedule');
  revalidatePath('/dashboard/routing');
  revalidatePath('/dashboard/print-reports');
  return { success: true };
}

export async function createExpense(formData: FormData) {
  const expenseDate = formData.get('expenseDate') as string;
  const category = formData.get('category') as string;
  const amount = parseFloat(formData.get('amount') as string || '0');
  const vendor = formData.get('vendor') as string;
  const description = formData.get('description') as string;
  const jobIdRaw = formData.get('jobId');
  const jobId = typeof jobIdRaw === 'string' && jobIdRaw.trim().length > 0 ? jobIdRaw.trim() : null;

  if (!expenseDate || !category || amount <= 0) {
    return { error: 'Missing or invalid expense parameters' };
  }

  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized operational execution.' };

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!org) return { error: 'No organizational profile found.' };

  if (jobId) {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, property_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return { error: 'Selected job is invalid.' };
    }

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('customer_id')
      .eq('id', job.property_id)
      .single();

    if (propertyError || !property) {
      return { error: 'Selected job is invalid.' };
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('organization_id')
      .eq('id', property.customer_id)
      .single();

    if (customerError || !customer || customer.organization_id !== org.id) {
      return { error: 'Selected job does not belong to your organization.' };
    }
  }

  const { data: expenseRecord, error } = await supabase
    .from('expenses')
    .insert([
      {
        expense_date: expenseDate,
        category,
        amount,
        vendor,
        description,
        job_id: jobId,
        organization_id: org.id
      }
    ])
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Queue expense sync to Xero for batched processing.
  if (org?.id && expenseRecord?.id) {
    const queueResult = await enqueueXeroExpenseBill({
      organizationId: org.id,
      expenseId: expenseRecord.id,
      vendorName: vendor || 'Unknown Vendor',
      expenseDate,
      reference: `Prado Expense - ${category}`,
      description: description || category,
      amount,
    });

    if (!queueResult.success) {
      console.error('Xero queue warning (expense kept in Prado):', queueResult.error);
    }
  }

  revalidatePath('/');
  return { success: true };
}

export async function createCustomer(formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const companyName = formData.get('companyName') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const organizationId = formData.get('organizationId') as string;

  if (!firstName || !lastName || !organizationId) {
    return { error: 'Missing required customer fields' };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('customers')
    .insert([
      {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName || null,
        email: email || null,
        phone: phone || null,
        organization_id: organizationId
      }
    ]);

  if (error) {
    console.error("Supabase Insertion Error details:", error.message);
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateCustomer(customerId: string, formData: FormData) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const companyName = formData.get('companyName') as string || null;
    const email = formData.get('email') as string || null;
    const phone = formData.get('phone') as string || null;
    const billingAddress = formData.get('billingAddress') as string || null;

    if (!firstName || !lastName) return { error: 'Missing required fields.' };

    const { error } = await supabase
      .from('customers')
      .update({
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        email: email,
        phone: phone,
        billing_address: billingAddress
      })
      .eq('id', customerId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update customer.' };
  }
}

export async function deleteCustomer(customerId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to delete customer.' };
  }
}

export async function createProperty(customerId: string, formData: FormData) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const streetAddress = formData.get('streetAddress') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const zipCode = formData.get('zipCode') as string;
    const serviceNotes = formData.get('serviceNotes') as string || null;

    if (!streetAddress || !city || !state || !zipCode) {
      return { error: 'Missing required address fields.' };
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    const fullAddressString = `${streetAddress}, ${city}, ${state} ${zipCode}`;
    const geocoded = await geocodeAddressServer(fullAddressString);
    latitude = geocoded.latitude;
    longitude = geocoded.longitude;

    const supabaseAdmin = createAdminClient();
    const { error: insertError } = await supabaseAdmin
      .from('properties')
      .insert([
        {
          street_address: streetAddress,
          city,
          state,
          zip_code: zipCode,
          service_notes: serviceNotes,
          customer_id: customerId,
          latitude: latitude,   
          longitude: longitude  
        }
      ]);

    if (insertError) {
      console.error("PROPERTY CRITICAL REJECTION:", insertError.message);
      return { error: insertError.message };
    }

    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/'); 
    return { success: true };
  } catch (err: unknown) {
    console.error("PROPERTY FATAL EXCEPTION:", err);
    return { error: (err as Error)?.message || 'Failed to register service site.' };
  }
}

export async function archiveJob(jobId: string) {
  if (!jobId) return { error: 'Missing Job ID' };

  const supabase = await createClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .maybeSingle();

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'archived',
      previous_status: job?.status || null,
    })
    .eq('id', jobId);

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function restoreJob(jobId: string) {
  if (!jobId) return { error: 'Missing Job ID' };

  const supabase = await createClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('previous_status')
    .eq('id', jobId)
    .maybeSingle();

  const restoredStatus = job?.previous_status || 'scheduled';
  const { error } = await supabase
    .from('jobs')
    .update({
      status: restoredStatus,
      previous_status: null,
    })
    .eq('id', jobId);

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function deleteProperty(propertyId: string, customerId: string) {
  if (!propertyId) return { error: 'Missing Property ID' };

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (error) return { error: error.message };

    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to remove service site.' };
  }
}

export async function markInvoiceAsPaid(invoiceId: string, customerId: string) {
  if (!invoiceId) return { error: 'Missing Invoice ID' };

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoiceId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update invoice status.' };
  }
}

export async function submitSupportTicket(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const urgency = formData.get('urgency') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !message) {
    return { error: 'Please fill out all required fields.' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const replyToAddress = user?.email || email || process.env.RESEND_REPLY_TO_EMAIL || undefined;

  try {
    const { error } = await resend.emails.send({
      from: 'notifications@indevasa.com',
      to: 'support@pradojob.com',
      subject: `[${urgency.toUpperCase()} SUPPORT TICKET] From ${name}`,
      replyTo: replyToAddress,
      html: `
        <h2>New Support Hub Ticket Recieved</h2>
        <p><strong>Operator Name:</strong> ${name}</p>
        <p><strong>Reply-To Email:</strong> ${email}</p>
        <p><strong>Urgency Tier:</strong> ${urgency}</p>
        <p><strong>Operational Message Log:</strong></p>
        <blockquote style="background: #f4f4f5; padding: 12px; border-left: 4px solid #10b981; border-radius: 4px;">
          ${message.replace(/\n/g, '<br />')}
        </blockquote>
      `,
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to dispatch ticket pipeline.' };
  }
}

export async function submitDemoRequest(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim() || '';
  const email = (formData.get('email') as string | null)?.trim() || '';
  const companyName = (formData.get('companyName') as string | null)?.trim() || '';
  const phoneCountryCode = (formData.get('phoneCountryCode') as string | null)?.trim() || '+1';
  const phone = (formData.get('phone') as string | null)?.trim() || '';
  const fullPhone = `${phoneCountryCode} ${phone}`.trim();
  const preferredDate = (formData.get('preferredDate') as string | null)?.trim() || '';
  const notes = (formData.get('notes') as string | null)?.trim() || '';

  if (!name || !email || !companyName || !phone) {
    return { error: 'Please fill out all required fields.' };
  }

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createAdminClient();
      const { error: insertError } = await supabaseAdmin.from('leads').insert([
        {
          full_name: name,
          email,
          company_name: companyName,
          phone: fullPhone,
          locale: 'en',
          source: 'demo-request',
        },
      ]);

      if (insertError) {
        console.warn('Demo request insert failed (leads):', insertError.message);
      }
    }

    if (!process.env.RESEND_API_KEY) {
      return { success: true };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: 'Prado Demo <notifications@indevasa.com>',
      to: 'info@pradojob.com',
      replyTo: email,
      subject: `[DEMO REQUEST] ${companyName} - ${name}`,
      html: `
        <h2>New Prado Demo Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><strong>Phone:</strong> ${fullPhone}</p>
        ${preferredDate ? `<p><strong>Preferred Date:</strong> ${preferredDate}</p>` : ''}
        ${notes ? `<p><strong>Notes / Requirements:</strong> ${notes}</p>` : ''}
      `,
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to send demo request.' };
  }
}

export async function hideDemoRecord(recordId: string, returnPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('deleted_demo_records')
    .insert({ user_id: user.id, record_id: recordId });

  if (error) return { error: error.message };

  revalidatePath(returnPath);
  return { success: true };
}

// ==========================================
// MÓDULO DE ESTIMACIONES (ESTIMATES)
// ==========================================

export async function createEstimate(formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Verificar sesión de usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    // 2. Resolver organización
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    // 3. Extraer datos
    const customerId = formData.get('customerId') as string;
    const propertyId = formData.get('propertyId') as string || null;
    let title = formData.get('title') as string;
    let description = formData.get('description') as string || '';
    let estimatedAmount = parseFloat(formData.get('estimatedAmount') as string || '0');

    const lineItemsRaw = formData.get('lineItemsJson') as string | null;
    if (lineItemsRaw) {
      try {
        const parsed = JSON.parse(lineItemsRaw) as Array<{ name: string; price: number }>;
        const validLineItems = parsed.filter(
          (item) => typeof item?.name === 'string' && item.name.trim().length > 0 && Number(item.price) > 0
        );

        if (validLineItems.length > 0) {
          estimatedAmount = validLineItems.reduce((sum, item) => sum + Number(item.price), 0);

          if (!title || !title.trim()) {
            title =
              validLineItems.length === 1
                ? validLineItems[0].name.trim()
                : `Estimate with ${validLineItems.length} services`;
          }

          if (!description || !description.trim()) {
            description =
              'Service breakdown:\n' +
              validLineItems
                .map((item) => `- ${item.name.trim()}: $${Number(item.price).toFixed(2)}`)
                .join('\n');
          }
        }
      } catch {
        // Ignore malformed line items payload and continue with base fields.
      }
    }

    if (!customerId || !title || estimatedAmount <= 0) {
      return { error: 'Missing required parameters or invalid amount.' };
    }

    // 4. Insertar en base de datos
    const { error } = await supabase
      .from('estimates')
      .insert([
        {
          organization_id: org.id,
          customer_id: customerId,
          property_id: propertyId,
          title,
          description,
          estimated_amount: estimatedAmount,
          status: 'draft'
        }
      ]);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to create estimate.' };
  }
}

export async function updateEstimate(estimateId: string, formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    const customerId = formData.get('customerId') as string;
    const propertyId = (formData.get('propertyId') as string) || null;
    let title = formData.get('title') as string;
    let description = (formData.get('description') as string) || '';
    let estimatedAmount = parseFloat((formData.get('estimatedAmount') as string) || '0');

    const lineItemsRaw = formData.get('lineItemsJson') as string | null;
    if (lineItemsRaw) {
      try {
        const parsed = JSON.parse(lineItemsRaw) as Array<{ name: string; price: number }>;
        const validLineItems = parsed.filter(
          (item) => typeof item?.name === 'string' && item.name.trim().length > 0 && Number(item.price) > 0
        );

        if (validLineItems.length > 0) {
          estimatedAmount = validLineItems.reduce((sum, item) => sum + Number(item.price), 0);

          if (!title || !title.trim()) {
            title =
              validLineItems.length === 1
                ? validLineItems[0].name.trim()
                : `Estimate with ${validLineItems.length} services`;
          }

          if (!description || !description.trim()) {
            description =
              'Service breakdown:\n' +
              validLineItems
                .map((item) => `- ${item.name.trim()}: $${Number(item.price).toFixed(2)}`)
                .join('\n');
          }
        }
      } catch {
        // Ignore malformed line items payload and continue with base fields.
      }
    }

    if (!estimateId || !customerId || !title || estimatedAmount <= 0) {
      return { error: 'Missing required parameters or invalid amount.' };
    }

    const { data: existingEstimate, error: existingEstimateError } = await supabase
      .from('estimates')
      .select('id')
      .eq('id', estimateId)
      .eq('organization_id', org.id)
      .single();

    if (existingEstimateError || !existingEstimate) {
      return { error: existingEstimateError?.message || 'Estimate not found for this organization.' };
    }

    const { error } = await supabase
      .from('estimates')
      .update({
        customer_id: customerId,
        property_id: propertyId,
        title,
        description,
        estimated_amount: estimatedAmount,
      })
      .eq('id', estimateId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update estimate.' };
  }
}

export async function sendEstimateByEmail(estimateId: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing.');
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: org } = await supabase
      .from('organizations')
      .select('name, slogan, logo_url')
      .eq('owner_id', user?.id)
      .single();

    const organizationName = org?.name?.trim() || 'Prado ERP';
    const organizationSlogan = org?.slogan?.trim() || 'Field Service Software';
    const organizationLogoUrl = org?.logo_url?.trim() || '';

    // 1. Fetch Estimate and related Customer data
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(
        `
        *,
        customers (
          email,
          first_name,
          last_name
        )
      `
      )
      .eq('id', estimateId)
      .single();

    if (estimateError || !estimate) {
      throw new Error('Estimate not found.');
    }

    const customer = estimate.customers as { email: string; first_name: string; last_name: string };
    if (!customer || !customer.email) {
      throw new Error('Customer email not found for this estimate.');
    }

    // 2. Send email using Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmailAddress = process.env.RESEND_FROM_EMAIL || 'notifications@indevasa.com';
    const fromAddress = `${organizationName} <${fromEmailAddress}>`;
    const replyToAddress = user?.email || process.env.RESEND_REPLY_TO_EMAIL || undefined;
    const emailHtml = await render(
      EstimateEmail({
        customerName: `${customer.first_name} ${customer.last_name}`,
        estimate: estimate as any,
        organizationSlogan,
        organizationName,
        organizationLogoUrl,
      })
    );

    const { error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: [customer.email],
      replyTo: replyToAddress,
      subject: `${organizationName} Estimate: ${estimate.title}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // 3. Update estimate status to 'sent'
    const { error: updateError } = await supabase.from('estimates').update({ status: 'sent' }).eq('id', estimateId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw new Error('Email sent, but failed to update estimate status.');
    }

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[sendEstimateByEmail]: ${message}`);
    return { error: message };
  }
}

export async function getEstimatesDashboardData() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized', estimates: [], customers: [], services: [], trucks: [] };
    }

    const { organization: org, role } = await getUserOrganization(user.id);
    if (!org) {
      return { error: 'Organization not found.', estimates: [], customers: [], services: [], trucks: [] };
    }

    const normalizedRole = (role || '').toLowerCase();
    const canViewImportExport = normalizedRole === 'owner' || normalizedRole === 'admin';

    const { data: estimatesData, error: estimatesError } = await supabase
      .from('estimates')
      .select('*, customers(id, first_name, last_name, company_name), properties(id, street_address, city)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    if (estimatesError) {
      return { error: estimatesError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name')
      .eq('organization_id', org.id)
      .order('last_name', { ascending: true });

    if (customersError) {
      return { error: customersError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('id, name, base_price')
      .eq('organization_id', org.id)
      .not('name', 'like', `${ARCHIVED_SERVICE_PREFIX}%`)
      .order('name', { ascending: true });

    if (servicesError) {
      return { error: servicesError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: trucksData, error: trucksError } = await supabase
      .from('trucks')
      .select('id, name, plate_number, is_active, status')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (trucksError) {
      return { error: trucksError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    return {
      success: true,
      organizationName: org.name || '',
      organizationLogoUrl: org.logo_url || '',
      subscriptionStatus: org.subscription_status || 'trial',
      canViewImportExport,
      estimates: estimatesData || [],
      customers: customersData || [],
      services: servicesData || [],
      trucks: trucksData || [],
    };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to fetch estimates dashboard data.', estimates: [], customers: [], services: [], trucks: [] };
  }
}

export async function getEstimateCustomerProperties(customerId: string) {
  try {
    if (!customerId) return { success: true, properties: [] };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized', properties: [] };

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      return { error: orgError?.message || 'Organization not found.', properties: [] };
    }

    // Validate the selected customer belongs to this organization before loading properties.
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('organization_id', org.id)
      .single();

    if (customerError || !customer) {
      return { error: customerError?.message || 'Customer not found for this organization.', properties: [] };
    }

    const { data, error } = await supabase
      .from('properties')
      .select('id, street_address, city')
      .eq('customer_id', customerId);

    if (error) return { error: error.message, properties: [] };

    return { success: true, properties: data || [] };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to fetch customer properties.', properties: [] };
  }
}

// Cambiar estado de la estimación (draft -> sent -> approved/declined)
export async function updateEstimateStatus(estimateId: string, newStatus: 'draft' | 'sent' | 'approved' | 'declined') {
  if (!estimateId) return { error: 'Missing Estimate ID' };

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('estimates')
      .update({ status: newStatus })
      .eq('id', estimateId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update status.' };
  }
}

// AUTOMATIZACIÓN: Convertir estimación aprobada en un Job agendado automáticamente
export async function convertEstimateToJob(estimateId: string, scheduledDate: string, truckId?: string | null) {
  if (!estimateId || !scheduledDate) return { error: 'Missing parameters.' };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Obtener la estimación
    const { data: estimate, error: fetchError } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', estimateId)
      .single();

    if (fetchError || !estimate) {
      return { error: fetchError?.message || 'Estimate not found.' };
    }

    if (estimate.status !== 'approved') {
      return { error: 'Only approved estimates can be converted to jobs.' };
    }

    const normalizedPropertyId =
      typeof estimate.property_id === 'string' && estimate.property_id.trim() !== '' && estimate.property_id !== 'null'
        ? estimate.property_id
        : null;

    if (!normalizedPropertyId) {
      return { error: 'This estimate has no valid property selected. Please edit the estimate and choose a property before converting.' };
    }

    const conversionMarker = `[ESTIMATE_CONVERSION_ID:${estimate.id}]`;

    // Guard against duplicate jobs from repeated submits for the same estimate.
    const { data: existingConvertedJob, error: existingJobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('property_id', normalizedPropertyId)
      .ilike('notes', `%${conversionMarker}%`)
      .limit(1)
      .maybeSingle();

    if (existingJobError) {
      return { error: existingJobError.message };
    }

    if (existingConvertedJob?.id) {
      return { success: true, duplicate: true };
    }

    // 2. Insertar el nuevo Job basado en los datos de la estimación
    const { error: jobError } = await supabase
      .from('jobs')
      .insert([
        {
          property_id: normalizedPropertyId,
          scheduled_date: scheduledDate,
          job_type: estimate.title, // El título de la cotización pasa a ser el servicio
          cost_amount: estimate.estimated_amount,
          notes: `${conversionMarker}\nConvertido automáticamente desde Cotización. Notas originales:\n${estimate.description || 'Ninguna.'}`,
          status: 'scheduled',
          truck_id: truckId || null
        }
      ]);

    if (jobError) return { error: jobError.message };

    // 3. Notificar al cliente por email sobre la fecha agendada y los servicios incluidos
    const { data: customer } = await supabase
      .from('customers')
      .select('first_name, last_name, email')
      .eq('id', estimate.customer_id)
      .limit(1)
      .maybeSingle();

    if (customer?.email) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, slogan')
        .eq('id', estimate.organization_id)
        .limit(1)
        .maybeSingle();

      const organizationName = org?.name?.trim() || 'Prado ERP';
      const organizationSlogan = org?.slogan?.trim() || 'Field Service Software';

      const parseDescriptionItems = (desc: string | null | undefined) => {
        if (!desc) return [] as Array<{ name: string; cost: string }>;

        const lines = desc.split(/\r?\n/);
        const items: Array<{ name: string; cost: string }> = [];

        lines.forEach((line) => {
          const match = line.match(/^\s*-\s*(.*?):\s*\$(.*?)\s*$/);
          if (match) {
            items.push({
              name: match[1].trim(),
              cost: Number(match[2].replace(/,/g, '')).toFixed(2),
            });
          }
        });

        return items;
      };

      const serviceItems = parseDescriptionItems(estimate.description);
      const formattedDate = Number.isNaN(new Date(`${scheduledDate}T00:00:00`).getTime())
        ? scheduledDate
        : new Date(`${scheduledDate}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

      const servicesHtml =
        serviceItems.length > 0
          ? `<ul style="margin: 10px 0 0 18px; padding: 0; color: #334155;">${serviceItems
              .map(
                (item) =>
                  `<li style="margin: 0 0 6px 0;"><span style="font-weight: 600; color: #0f172a;">${item.name}</span> - $${item.cost}</li>`
              )
              .join('')}</ul>`
          : `<p style="margin: 10px 0 0 0; color: #334155;"><strong>Service:</strong> ${estimate.title}</p>`;

      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmailAddress = process.env.RESEND_FROM_EMAIL || 'notifications@indevasa.com';
      const fromAddress = `${organizationName} <${fromEmailAddress}>`;
      const replyToAddress = user?.email || process.env.RESEND_REPLY_TO_EMAIL || undefined;

      try {
        await resend.emails.send({
          from: fromAddress,
          to: customer.email,
          replyTo: replyToAddress,
          subject: `${organizationName} Service Scheduled: ${estimate.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
              <h2 style="margin: 0 0 4px 0;">Your Service Has Been Scheduled</h2>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">${organizationSlogan}</p>
              <p style="margin: 0 0 12px 0; color: #334155;">Hi ${customer.first_name || customer.last_name || 'there'},</p>
              <p style="margin: 0 0 14px 0; color: #334155;">Your approved estimate has been scheduled. Here are the service details:</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <p style="margin: 0; color: #334155;"><strong>Scheduled Date:</strong> ${formattedDate}</p>
                <p style="margin: 10px 0 0 0; color: #334155;"><strong>Estimate:</strong> ${estimate.title}</p>
                ${servicesHtml}
              </div>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b;">If you need any changes to this appointment, just reply to this email.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Estimate approved and scheduled, but email delivery failed:', emailErr);
      }
    }

    revalidatePath('/dashboard/jobs');
    revalidatePath('/dashboard/estimates');
    revalidatePath('/dashboard/schedule');
    revalidatePath('/dashboard/routing');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Conversion pipeline failed.' };
  }
}

// ==========================================
// TEAM MEMBER MANAGEMENT
// ==========================================

interface CanAddMemberResponse {
  allowed: boolean;
  currentCount: number;
  message?: string;
}

export async function verifyPlanLimitBeforeAddingMember(organizationId: string): Promise<CanAddMemberResponse> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { allowed: false, currentCount: 0, message: 'Unauthorized.' };
    }

    // 1. Query the organization's subscription plan
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('subscription_status, owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError || !orgData) {
      return { allowed: false, currentCount: 0, message: 'Unable to verify organization plan.' };
    }

    // Verify user is the owner or an admin
    if (orgData.owner_id !== user.id) {
      return { allowed: false, currentCount: 0, message: 'Only organization owner can manage team members.' };
    }

    const currentPlan = orgData.subscription_status;

    // Enterprise has no restrictions
    if (currentPlan === 'enterprise') {
      return { allowed: true, currentCount: 0 };
    }

    // 2. Collect accepted members and pending invites to enforce true seat limits.
    const { data: members, error: membersError } = await supabaseAdmin
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId);

    if (membersError) {
      console.error('Detailed error counting organization members:', {
        message: membersError.message,
        code: membersError.code,
        details: membersError.details,
      });
      return { allowed: false, currentCount: 0, message: `Error verifying current members: ${membersError.message}` };
    }

    const { data: pendingInvites, error: invitesError } = await supabaseAdmin
      .from('organization_invitations')
      .select('email')
      .eq('organization_id', organizationId)
      .is('accepted_at', null);

    if (invitesError) {
      console.error('Detailed error counting pending invites:', {
        message: invitesError.message,
        code: invitesError.code,
        details: invitesError.details,
      });
      return { allowed: false, currentCount: 0, message: `Error verifying pending invitations: ${invitesError.message}` };
    }

    const acceptedUserIds = new Set((members || []).map((member) => member.user_id).filter(Boolean));
    const ownerAlreadyCounted = acceptedUserIds.has(orgData.owner_id);
    const ownerSeat = ownerAlreadyCounted ? 0 : 1;
    const acceptedSeats = acceptedUserIds.size;
    const pendingSeats = pendingInvites?.length || 0;
    const seatsUsed = ownerSeat + acceptedSeats + pendingSeats;

    // 3. Validate based on Prado business rules
    if (currentPlan === 'individual' && seatsUsed >= 1) {
      return { 
        allowed: false, 
        currentCount: seatsUsed,
        message: 'Individual plan ($29) allows only 1 user. Upgrade to Growth plan ($59) to add team members.' 
      };
    }

    if (currentPlan === 'growth' && seatsUsed >= 5) {
      return { 
        allowed: false, 
        currentCount: seatsUsed,
        message: 'Growth plan ($59) maximum limit of 5 total users (owner plus team) reached. Upgrade to Enterprise ($99) for unlimited access.' 
      };
    }

    return { allowed: true, currentCount: seatsUsed };
  } catch (error: unknown) {
    console.error('Failed to verify plan limits:', error);
    return { allowed: false, currentCount: 0, message: 'Failed to verify plan limits.' };
  }
}

interface AddTeamMemberPayload {
  organizationId: string;
  email: string;
  role: 'member' | 'admin' | 'accountant' | 'viewer'; // Supervisor, Manager, Accountant, Guest
}

export async function inviteTeamMember(payload: AddTeamMemberPayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let inviteToken: string | null = null;
    const normalizedInviteEmail = normalizeAuthEmail(payload.email);

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    // 1. Validate plan limits before adding
    const limitCheck = await verifyPlanLimitBeforeAddingMember(payload.organizationId);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.message || 'Plan limit reached.' };
    }

    // 2. Look up user by email via app-owned auth index, with one-time bootstrap fallback.
    const supabaseAdmin = createAdminClient();
    const { data: indexedAuthUser, error: authUserLookupError } = await findAuthUserIndexByEmail(supabaseAdmin, normalizedInviteEmail);

    if (authUserLookupError) {
      return { success: false, error: authUserLookupError.message };
    }

    let authUserRecord: { id: string; email: string; invitedPending: boolean } | null = indexedAuthUser
      ? {
          id: indexedAuthUser.user_id,
          email: indexedAuthUser.email,
          invitedPending: Boolean((indexedAuthUser as any)?.user_metadata?.invited_pending),
        }
      : null;

    if (!authUserRecord) {
      const { data: authUsersPage, error: bootstrapLookupError } = await supabaseAdmin.auth.admin.listUsers();
      if (bootstrapLookupError) {
        return { success: false, error: bootstrapLookupError.message };
      }

      const bootstrapUser = authUsersPage?.users?.find(
        (candidate) => candidate.email?.toLowerCase().trim() === normalizedInviteEmail
      ) || null;

      if (bootstrapUser?.id && bootstrapUser.email) {
        await upsertAuthUserIndex(supabaseAdmin, bootstrapUser);
        authUserRecord = {
          id: bootstrapUser.id,
          email: bootstrapUser.email,
          invitedPending: Boolean(bootstrapUser.user_metadata?.invited_pending),
        };
      }
    }

    const hasExistingAuthUser = Boolean(authUserRecord?.id);
    const authUser = authUserRecord;
    const requiresPasswordSetupFlow = !authUser || Boolean(authUser.invitedPending);

    if (hasExistingAuthUser && authUser && !requiresPasswordSetupFlow) {
      // User already has an account - add them directly to organization_users
      // Check if they're already a member
      const { data: existingOrgUser } = await supabaseAdmin
        .from('organization_users')
        .select('id')
        .eq('organization_id', payload.organizationId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existingOrgUser) {
        return { success: false, error: 'This user is already a member of this organization.' };
      }

      // Insert the team member record
      const { error: insertError } = await supabaseAdmin
        .from('organization_users')
        .upsert([
          {
            organization_id: payload.organizationId,
            user_id: authUser.id,
            role: payload.role,
          }
        ], { onConflict: 'organization_id,user_id' });

      if (insertError) {
        console.error('Error adding team member:', insertError);
        return { success: false, error: insertError.message };
      }
    } else {
      // User needs password setup flow. If no auth user exists yet, create pending auth user first.
      if (!authUser) {
        const tempPassword = `Prado!${randomUUID()}`;
        const { data: createdUserResult, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedInviteEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            invited_pending: true,
            needs_profile_completion: true,
            profile_completed: false,
          },
        });

        if (createUserError) {
          return { success: false, error: createUserError.message };
        }

        if (createdUserResult.user) {
          await upsertAuthUserIndex(supabaseAdmin, createdUserResult.user);
        }
      }

      inviteToken = randomUUID();
      const { data: existingPendingInvite } = await supabaseAdmin
        .from('organization_invitations')
        .select('id')
        .eq('organization_id', payload.organizationId)
        .eq('email', normalizedInviteEmail)
        .is('accepted_at', null)
        .maybeSingle();

      const inviteMutation = existingPendingInvite
        ? await supabaseAdmin
            .from('organization_invitations')
            .update({
              role: payload.role,
              invited_by_user_id: user.id,
              invite_token: inviteToken,
            })
            .eq('id', existingPendingInvite.id)
        : await supabaseAdmin
            .from('organization_invitations')
            .insert([
              {
                organization_id: payload.organizationId,
                email: normalizedInviteEmail,
                role: payload.role,
                invited_by_user_id: user.id,
                invite_token: inviteToken,
              }
            ]);

      const inviteError = inviteMutation.error;

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        return { success: false, error: inviteError.message };
      }
    }

    // 4. Send notification email
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, slogan, logo_url')
        .eq('id', payload.organizationId)
        .single();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const inviterName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Your Team';

      const inviteLink = requiresPasswordSetupFlow
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://pradojob.com'}/en/auth/accept-invite?token=${encodeURIComponent(inviteToken || '')}`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'https://pradojob.com'}/en/dashboard`;

      const emailHtml = await render(
        <InviteMemberEmail
          inviteeEmail={normalizedInviteEmail}
          inviterName={inviterName}
          organizationName={org?.name || 'Prado ERP'}
          organizationSlogan={org?.slogan || 'Field Service Software'}
          organizationLogoUrl={org?.logo_url || ''}
          role={payload.role}
          inviteLink={inviteLink}
        />
      );

      const htmlString = typeof emailHtml === 'string' ? emailHtml : String(emailHtml);

      if (!htmlString || htmlString === '[object Object]' || htmlString === '[object Promise]') {
        throw new Error('Failed to render email HTML');
      }

      const subject = requiresPasswordSetupFlow
        ? `You're invited to join ${org?.name || 'Prado ERP'}`
        : `${inviterName} added you to ${org?.name || 'Prado ERP'}`;

      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set - email not sent');
        console.log('Email would be sent to:', normalizedInviteEmail, 'Subject:', subject);
      } else {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmailAddress = process.env.RESEND_FROM_EMAIL || 'notifications@indevasa.com';
        const response = await resend.emails.send({
          from: `${org?.name || 'Prado ERP'} <${fromEmailAddress}>`,
          to: normalizedInviteEmail,
          subject,
          html: htmlString,
        });
        
        if (response.error) {
          console.error('Resend API error:', {
            message: response.error.message,
            name: response.error.name,
          });
        } else {
          console.log('Email sent successfully to', normalizedInviteEmail, 'ID:', response.data?.id);
        }
      }
    } catch (emailError: unknown) {
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      console.error('Failed to send notification email:', errorMessage);
      // Don't fail the invitation if email fails - the member is still added
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: `Invitation sent to ${payload.email}` };
  } catch (error: unknown) {
    console.error('Failed to invite team member:', error);
    return { success: false, error: (error as Error)?.message || 'Failed to invite team member.' };
  }
}

export async function removeTeamMember(organizationId: string, email: string) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    const normalizedEmail = normalizeAuthEmail(email);

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    // Verify user is the owner of the organization
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgData?.owner_id !== user.id) {
      return { success: false, error: 'Only organization owner can remove members.' };
    }

    const { data: ownerAccount } = await supabaseAdmin.auth.admin.getUserById(orgData.owner_id);
    if (ownerAccount?.user?.email && normalizeAuthEmail(ownerAccount.user.email) === normalizedEmail) {
      return { success: false, error: 'Owners cannot remove themselves. Use Delete Account instead.' };
    }

    // First, remove org invitations matching this email.
    const { data: deletedInvites, error: inviteDeleteError } = await supabaseAdmin
      .from('organization_invitations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('email', normalizedEmail)
      .select('id');

    if (inviteDeleteError) {
      return { success: false, error: inviteDeleteError.message };
    }

    // Second, remove accepted org membership by resolving the auth user id.
    const { data: indexedAuthUser, error: indexedAuthUserError } = await findAuthUserIndexByEmail(
      supabaseAdmin,
      normalizedEmail
    );

    if (indexedAuthUserError) {
      return { success: false, error: indexedAuthUserError.message };
    }

    let targetUserId = indexedAuthUser?.user_id || null;

    // Fallback: paginate auth users to recover user id when index is stale/missing.
    if (!targetUserId) {
      const perPage = 200;

      for (let page = 1; page <= 20; page += 1) {
        const { data: authUsersPage, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

        if (listUsersError) {
          return { success: false, error: listUsersError.message };
        }

        const candidate = authUsersPage?.users?.find(
          (authUser) => authUser.email && normalizeAuthEmail(authUser.email) === normalizedEmail
        );

        if (candidate?.id) {
          targetUserId = candidate.id;
          await upsertAuthUserIndex(supabaseAdmin, candidate);
          break;
        }

        if (!authUsersPage?.users?.length || authUsersPage.users.length < perPage) {
          break;
        }
      }
    }

    if (targetUserId && targetUserId === orgData.owner_id) {
      return { success: false, error: 'Owners cannot remove themselves. Use Delete Account instead.' };
    }

    let deletedMembers: Array<{ user_id: string }> = [];

    if (targetUserId) {
      const { data: deletedMemberRows, error: memberDeleteError } = await supabaseAdmin
        .from('organization_users')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', targetUserId)
        .select('user_id');

      if (memberDeleteError) {
        return { success: false, error: memberDeleteError.message };
      }

      deletedMembers = deletedMemberRows || [];
    }

    // If this email belongs to an auth user, only hard-delete account data when the user is not tied to other orgs.
    if (targetUserId) {
      const { data: ownedOrganizations, error: ownedOrganizationsError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('owner_id', targetUserId)
        .neq('id', organizationId)
        .limit(1);

      if (ownedOrganizationsError) {
        return { success: false, error: ownedOrganizationsError.message };
      }

      if ((ownedOrganizations || []).length > 0) {
        return {
          success: false,
          error: 'Cannot delete this user account because they own another organization.',
        };
      }

      const { data: otherMemberships, error: otherMembershipsError } = await supabaseAdmin
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .neq('organization_id', organizationId)
        .limit(1);

      if (otherMembershipsError) {
        return { success: false, error: otherMembershipsError.message };
      }

      if ((otherMemberships || []).length > 0) {
        return {
          success: false,
          error: 'Cannot delete this user account because they are still a member of another organization.',
        };
      }

      const { error: profileDeleteError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('user_id', targetUserId);

      if (profileDeleteError) {
        return { success: false, error: profileDeleteError.message };
      }

      const { error: authIndexDeleteError } = await supabaseAdmin
        .from('user_auth_index')
        .delete()
        .eq('user_id', targetUserId);

      if (authIndexDeleteError) {
        return { success: false, error: authIndexDeleteError.message };
      }

      // Clean up any remaining invitations across organizations for this email before removing auth user.
      const { error: globalInviteDeleteError } = await supabaseAdmin
        .from('organization_invitations')
        .delete()
        .eq('email', normalizedEmail);

      if (globalInviteDeleteError) {
        return { success: false, error: globalInviteDeleteError.message };
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (authDeleteError) {
        return { success: false, error: authDeleteError.message };
      }
    }

    if (!deletedMembers.length && !deletedInvites?.length) {
      return { success: false, error: 'No matching member or invitation found for this email in your organization.' };
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: `${email} removed from the team.` };
  } catch (error: unknown) {
    console.error('Failed to remove team member:', error);
    return { success: false, error: (error as Error)?.message || 'Failed to remove team member.' };
  }
}

export async function getTeamMembers(organizationId: string) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, members: [], error: 'Unauthorized.' };
    }

    // Verify user is owner or manager (admin)
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    const isOwner = orgData?.owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await supabaseAdmin
        .from('organization_users')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if ((membership as any)?.role !== 'admin') {
        return { success: false, members: [], error: 'Only organization owner or manager can view members.' };
      }
    }

    // Get accepted team members from organization_users
    const { data: orgUsers, error: usersError } = await supabaseAdmin
      .from('organization_users')
      .select('user_id, role, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (usersError) {
      return { success: false, members: [], error: usersError.message };
    }

    // Get pending invitations
    const { data: pendingInvites, error: invitesError } = await supabaseAdmin
      .from('organization_invitations')
      .select('email, role, created_at')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (invitesError) {
      return { success: false, members: [], error: invitesError.message };
    }

    // Resolve auth.users and profile metadata for accepted members.
    const memberUserIds = (orgUsers || []).map((ou) => ou.user_id);

    const { data: authUsers, error: authUsersError } = await findAuthUserIndexByUserIds(supabaseAdmin, memberUserIds);

    if (authUsersError) {
      return { success: false, members: [], error: authUsersError.message };
    }

    const { data: userProfiles, error: userProfilesError } = memberUserIds.length > 0
      ? await supabaseAdmin
          .from('user_profiles')
          .select('user_id, first_name, last_name, phone')
          .in('user_id', memberUserIds)
      : { data: [] as any[], error: null as any };

    if (userProfilesError) {
      return { success: false, members: [], error: userProfilesError.message };
    }

    const authUserMap = new Map((authUsers || []).map((u: any) => [u.user_id, u]));
    const profileMap = new Map((userProfiles || []).map((p: any) => [p.user_id, p]));

    const acceptedMembers = orgUsers?.map((ou) => {
      const authUser = authUserMap.get(ou.user_id);
      const profile = profileMap.get(ou.user_id);

      return {
        email: authUser?.email || 'unknown@example.com',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        phone: profile?.phone || null,
        last_login_at: authUser?.last_sign_in_at || null,
        role: ou.role,
        invited_at: ou.created_at,
        status: 'accepted' as const,
      };
    }) || [];

    // Map pending invitations
    const pendingMembers = pendingInvites?.map(pi => ({
      email: pi.email,
      first_name: '',
      last_name: '',
      phone: null,
      last_login_at: null,
      role: pi.role,
      invited_at: pi.created_at,
      status: 'pending' as const,
    })) || [];

    // Combine both lists (accepted first, then pending)
    const members = [...acceptedMembers, ...pendingMembers];

    return { success: true, members };
  } catch (error: unknown) {
    console.error('Failed to fetch team members:', error);
    return { success: false, members: [], error: (error as Error)?.message || 'Failed to fetch team members.' };
  }
}

export async function sendCustomerDirectEmail(payload: {
  customerId: string;
  subject: string;
  message: string;
  locale?: string;
  context?: 'customers_table' | 'customer_profile';
}) {
  try {
    const customerId = String(payload.customerId || '').trim();
    const subject = String(payload.subject || '').trim();
    const message = String(payload.message || '').trim();
    const locale = String(payload.locale || 'en').trim() || 'en';
    const context = payload.context || 'customers_table';

    if (!customerId || !subject || !message) {
      return { error: 'Customer, subject, and message are required.' };
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized operational execution.' };
    }

    const { organization: org } = await getUserOrganization(user.id);
    if (!org) {
      return { error: 'No organizational profile found.' };
    }

    const { data: orgOwnerData } = await supabaseAdmin
      .from('organizations')
      .select('owner_id')
      .eq('id', org.id)
      .maybeSingle();

    let organizationReplyToEmail: string | null = null;

    if (orgOwnerData?.owner_id) {
      const { data: ownerAuthIndex } = await supabaseAdmin
        .from('user_auth_index')
        .select('email')
        .eq('user_id', orgOwnerData.owner_id)
        .maybeSingle();

      organizationReplyToEmail = ownerAuthIndex?.email || null;
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name, email, organization_id')
      .eq('id', customerId)
      .eq('organization_id', org.id)
      .maybeSingle();

    if (customerError || !customer) {
      return { error: customerError?.message || 'Customer not found.' };
    }

    if (!customer.email) {
      return { error: 'Customer email not found.' };
    }

    if (!process.env.RESEND_API_KEY) {
      return { error: 'Email delivery is not configured (missing RESEND_API_KEY).' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const organizationName = org.name || 'Prado';
    const fromEmailAddress = process.env.RESEND_FROM_EMAIL || 'notifications@indevasa.com';
    const fromAddress = `${organizationName} <${fromEmailAddress}>`;
    const replyToAddress =
      organizationReplyToEmail || process.env.RESEND_REPLY_TO_EMAIL || user.email || undefined;
    const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';

    const escapedMessage = message
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
      .replaceAll('\n', '<br />');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #ffffff;">
        <h2 style="margin-top: 0;">${subject}</h2>
        <p>Hi ${customerName},</p>
        <p style="white-space: normal; line-height: 1.5;">${escapedMessage}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 18px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">Sent from ${organizationName} via Prado.</p>
      </div>
    `;

    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: customer.email,
      subject,
      html,
      replyTo: replyToAddress,
    });

    if (sendResult.error) {
      return { error: sendResult.error.message || 'Failed to send email.' };
    }

    await supabaseAdmin.from('customer_email_logs').insert([
      {
        organization_id: org.id,
        customer_id: customer.id,
        sent_by_user_id: user.id,
        to_email: customer.email,
        subject,
        body_preview: message.slice(0, 280),
        context,
      },
    ]);

    revalidatePath('/dashboard/customers');
    revalidatePath(`/${locale}/dashboard/customers`);
    revalidatePath(`/dashboard/customers/${customer.id}`);
    revalidatePath(`/${locale}/dashboard/customers/${customer.id}`);

    return { success: true };
  } catch (error: unknown) {
    return { error: (error as Error)?.message || 'Failed to send customer email.' };
  }
}