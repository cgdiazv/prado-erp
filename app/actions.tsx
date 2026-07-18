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
import Stripe from 'stripe';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';

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

async function createInvoiceCheckoutSession({
  invoiceId,
  organizationId,
  stripeAccountId,
  customerEmail,
  customerName,
  serviceName,
  baseAmount,
  taxAmount,
  totalAmount,
}: {
  invoiceId: string;
  organizationId: string;
  stripeAccountId: string;
  customerEmail: string;
  customerName: string;
  serviceName: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  const totalAmountCents = Math.round(Number(totalAmount || 0) * 100);
  const baseAmountCents = Math.round(Number(baseAmount || 0) * 100);
  const taxAmountCents = Math.round(Number(taxAmount || 0) * 100);

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
        customerName,
        source: 'prado_invoice',
      },
      payment_intent_data: {
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          platform: 'prado',
          invoiceId,
          organizationId,
          source: 'prado_invoice',
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
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
                  currency: 'usd',
                  unit_amount: taxAmountCents,
                  product_data: {
                    name: 'Estimated Tax (8.25%)',
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
  const jobType = formData.get('jobType') as string;
  const costAmount = parseFloat(formData.get('costAmount') as string || '0');
  const notes = formData.get('notes') as string;
  const truckId = formData.get('truckId') as string || null;

  if (!propertyId || !scheduledDate || !jobType) {
    return { error: 'Missing required fields' };
  }

  const supabase = await createClient();
  const { data: insertedJobs, error } = await supabase
    .from('jobs')
    .insert([
      {
        property_id: propertyId,
        scheduled_date: scheduledDate,
        job_type: jobType,
        cost_amount: costAmount,
        notes: notes,
        status: 'scheduled',
        truck_id: truckId ? truckId : null 
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
            jobType,
            address: property?.street_address ?? null,
            truckName,
            costAmount,
          })
        : null;

      const emailHtml = await render(
        JobScheduledEmail({
          customerName: customerDisplayName,
          jobType,
          scheduledDate,
          address: property?.street_address ?? null,
          costAmount,
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
        subject: `Service Scheduled: ${jobType} on ${scheduledDate}`,
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

export async function updateJobScheduleDetails(jobId: string, scheduledDate: string, truckId: string | null) {
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

    const { error } = await supabase
      .from('jobs')
      .update({
        scheduled_date: scheduledDate,
        truck_id: truckId || null,
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
    .select('id, name, slogan, logo_url, subscription_status, stripe_account_id, stripe_account_charges_enabled, stripe_account_payouts_enabled')
    .eq('owner_id', user?.id)
    .single();

  const organizationName = org?.name?.trim() || 'Prado ERP';
  const organizationSlogan = org?.slogan?.trim() || 'Field Service Software';
  const organizationLogoUrl = org?.logo_url?.trim() || '';

  // 1. Fetch job details AND include nested customer profile information for email delivery
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('*, properties(customer_id, customers(first_name, last_name, email, company_name))')
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

  // 3. Bookkeeping Automation: Auto-generate the customer invoice
  const cost = job.cost_amount;
  const estimatedTax = parseFloat((cost * 0.0825).toFixed(2)); // Standard 8.25% tax rate example
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
      },
    ])
    .select('id')
    .single();

  if (invoiceError) return { error: invoiceError.message };

  const customerDisplayName = `${customerMeta?.first_name || ''} ${customerMeta?.last_name || ''}`.trim() || customerMeta?.company_name || 'Prado Customer';

  let paymentUrl: string | null = null;
  let stripeCheckoutSessionId: string | null = null;

  if (
    org?.id &&
    org?.subscription_status !== 'individual' &&
    org?.stripe_account_id &&
    org?.stripe_account_charges_enabled &&
    org?.stripe_account_payouts_enabled &&
    customerMeta?.email
  ) {
    try {
      const paymentSession = await createInvoiceCheckoutSession({
        invoiceId: invoiceRecord.id,
        organizationId: org.id,
        stripeAccountId: org.stripe_account_id,
        customerEmail: customerMeta.email,
        customerName: customerDisplayName,
        serviceName: job.job_type,
        baseAmount: Number(cost || 0),
        taxAmount: Number(estimatedTax || 0),
        totalAmount: Number(total || 0),
      });

      paymentUrl = paymentSession?.paymentUrl || null;
      stripeCheckoutSessionId = paymentSession?.sessionId || null;
    } catch (paymentErr) {
      console.error('⚠️ Invoice created, but Stripe payment link generation failed:', paymentErr);
    }
  }

  if (paymentUrl || stripeCheckoutSessionId) {
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

  const { data: expenseRecord, error } = await supabase
    .from('expenses')
    .insert([
      {
        expense_date: expenseDate,
        category,
        amount,
        vendor,
        description,
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
  const phone = (formData.get('phone') as string | null)?.trim() || '';
  const preferredDate = (formData.get('preferredDate') as string | null)?.trim() || '';

  if (!name || !email || !companyName || !phone || !preferredDate) {
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
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Preferred Date:</strong> ${preferredDate}</p>
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

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, logo_url, subscription_status')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      return { error: orgError?.message || 'Organization not found.', estimates: [], customers: [], services: [], trucks: [] };
    }

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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { allowed: false, currentCount: 0, message: 'Unauthorized.' };
    }

    // 1. Query the organization's subscription plan
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_status, owner_id')
      .eq('id', organizationId)
      .single();

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

    // 2. Count active members - use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();
    const { data: members, error: countError } = await supabaseAdmin
      .from('organization_users')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (countError) {
      console.error('Detailed error counting organization members:', {
        message: countError.message,
        code: countError.code,
        details: countError.details,
      });
      return { allowed: false, currentCount: 0, message: `Error verifying current members: ${countError.message}` };
    }

    const activeMembers = members?.length || 0;

    // 3. Validate based on Prado business rules
    if (currentPlan === 'individual' && activeMembers >= 1) {
      return { 
        allowed: false, 
        currentCount: activeMembers, 
        message: 'Individual plan ($29) allows only 1 user. Upgrade to Growth plan ($59) to add team members.' 
      };
    }

    if (currentPlan === 'growth' && activeMembers >= 5) {
      return { 
        allowed: false, 
        currentCount: activeMembers, 
        message: 'Growth plan ($59) maximum limit of 5 users reached. Upgrade to Enterprise ($99) for unlimited access.' 
      };
    }

    return { allowed: true, currentCount: activeMembers };
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

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    // 1. Validate plan limits before adding
    const limitCheck = await verifyPlanLimitBeforeAddingMember(payload.organizationId);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.message || 'Plan limit reached.' };
    }

    // 2. Look up user by email via admin API
    const supabaseAdmin = createAdminClient();
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === payload.email);

    if (authUser) {
      // User already has an account - add them directly to organization_users
      // Check if they're already a member
      const { data: existingOrgUser } = await supabase
        .from('organization_users')
        .select('id')
        .eq('organization_id', payload.organizationId)
        .eq('user_id', authUser.id)
        .single();

      if (existingOrgUser) {
        return { success: false, error: 'This user is already a member of this organization.' };
      }

      // Insert the team member record
      const { error: insertError } = await supabase
        .from('organization_users')
        .insert([
          {
            organization_id: payload.organizationId,
            user_id: authUser.id,
            role: payload.role,
          }
        ]);

      if (insertError) {
        console.error('Error adding team member:', insertError);
        return { success: false, error: insertError.message };
      }
    } else {
      // User doesn't have an account yet - create a pending invitation
      inviteToken = randomUUID();
      const { error: inviteError } = await supabase
        .from('organization_invitations')
        .insert([
          {
            organization_id: payload.organizationId,
            email: payload.email,
            role: payload.role,
            invited_by_user_id: user.id,
            invite_token: inviteToken,
          }
        ]);

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

      const inviteLink = authUser 
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://pradojob.com'}/en/dashboard`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'https://pradojob.com'}/en/auth/accept-invite?token=${encodeURIComponent(inviteToken || '')}`;

      const emailHtml = await render(
        <InviteMemberEmail
          inviteeEmail={payload.email}
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

      const subject = authUser 
        ? `${inviterName} added you to ${org?.name || 'Prado ERP'}`
        : `You're invited to join ${org?.name || 'Prado ERP'}`;

      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set - email not sent');
        console.log('Email would be sent to:', payload.email, 'Subject:', subject);
      } else {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmailAddress = process.env.RESEND_FROM_EMAIL || 'notifications@indevasa.com';
        const response = await resend.emails.send({
          from: `${org?.name || 'Prado ERP'} <${fromEmailAddress}>`,
          to: payload.email,
          subject,
          html: htmlString,
        });
        
        if (response.error) {
          console.error('Resend API error:', {
            message: response.error.message,
            name: response.error.name,
          });
        } else {
          console.log('Email sent successfully to', payload.email, 'ID:', response.data?.id);
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    // Verify user is the owner of the organization
    const { data: orgData } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (orgData?.owner_id !== user.id) {
      return { success: false, error: 'Only organization owner can remove members.' };
    }

    // First, try to remove from organization_invitations (pending invites)
    const { error: inviteDeleteError } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('email', email);

    // Second, try to remove from organization_users (accepted members)
    const supabaseAdmin = createAdminClient();
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = authUsers?.users?.find(u => u.email === email);

    if (targetUser) {
      const { error: memberDeleteError } = await supabase
        .from('organization_users')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', targetUser.id);

      if (memberDeleteError && !inviteDeleteError) {
        return { success: false, error: memberDeleteError.message };
      }
    }

    if (inviteDeleteError && !targetUser) {
      return { success: false, error: inviteDeleteError.message };
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, members: [], error: 'Unauthorized.' };
    }

    // Verify user is the owner
    const { data: orgData } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (orgData?.owner_id !== user.id) {
      return { success: false, members: [], error: 'Only organization owner can view members.' };
    }

    // Get accepted team members from organization_users
    const { data: orgUsers, error: usersError } = await supabase
      .from('organization_users')
      .select('user_id, role, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (usersError) {
      return { success: false, members: [], error: usersError.message };
    }

    // Get pending invitations
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('organization_invitations')
      .select('email, role, created_at')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (invitesError) {
      return { success: false, members: [], error: invitesError.message };
    }

    // Look up emails from auth.users for accepted members
    const supabaseAdmin = createAdminClient();
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

    const acceptedMembers = orgUsers?.map(ou => {
      const authUser = authUsers?.users?.find(u => u.id === ou.user_id);
      return {
        email: authUser?.email || 'unknown@example.com',
        role: ou.role,
        invited_at: ou.created_at,
        status: 'accepted' as const,
      };
    }) || [];

    // Map pending invitations
    const pendingMembers = pendingInvites?.map(pi => ({
      email: pi.email,
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