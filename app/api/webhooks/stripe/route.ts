import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { enqueueXeroCompletedJobInvoice } from '@/app/actions/xeroActions';
import { syncInvoiceToQBO } from '@/app/actions/qboActions';

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 2. Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// 3. Initialize Supabase Service Role Client 
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getInvoiceIdFromSession(session: Stripe.Checkout.Session) {
  const metadataInvoiceId = session.metadata?.invoiceId || session.metadata?.invoice_id;
  return metadataInvoiceId || session.client_reference_id || null;
}

async function handleInvoiceCheckoutPaid(session: Stripe.Checkout.Session) {
  const invoiceId = getInvoiceIdFromSession(session);
  if (!invoiceId) {
    return NextResponse.json({ ignored: true, reason: 'Missing invoice id' }, { status: 200 });
  }

  const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .select('id, customer_id, due_date, total_amount, tax_amount, status, stripe_payment_status, customers(first_name, last_name, company_name, email, organization_id)')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoiceError || !invoiceRow) {
    console.error('Invoice checkout webhook received unknown invoice id:', invoiceId, invoiceError?.message);
    return NextResponse.json({ ignored: true, reason: 'Invoice not found' }, { status: 200 });
  }

  if (invoiceRow.status === 'paid' || invoiceRow.stripe_payment_status === 'paid') {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  const paidAt = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'paid',
      stripe_payment_status: 'paid',
      paid_at: paidAt,
    })
    .eq('id', invoiceRow.id);

  if (updateError) {
    console.error('Failed updating invoice paid status from Stripe webhook:', updateError.message);
    return NextResponse.json({ error: 'Failed to mark invoice paid' }, { status: 500 });
  }

  const customer = (invoiceRow as any).customers || null;
  const organizationId = customer?.organization_id;
  const customerName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || customer?.company_name || 'Prado Customer';
  const totalAmount = Number(invoiceRow.total_amount || 0);
  const taxAmount = Number(invoiceRow.tax_amount || 0);
  const baseAmount = Math.max(0, Number((totalAmount - taxAmount).toFixed(2)));

  if (organizationId) {
    const queueResult = await enqueueXeroCompletedJobInvoice({
      organizationId,
      customerName,
      customerEmail: customer?.email || null,
      jobType: `Invoice ${invoiceRow.id}`,
      invoiceId: invoiceRow.id,
      dueDate: invoiceRow.due_date,
      baseAmount,
      taxAmount,
    });

    if (!queueResult.success) {
      console.error('Xero queue warning from Stripe invoice webhook:', queueResult.error);
    }

    syncInvoiceToQBO({
      organizationId,
      customerName,
      customerEmail: customer?.email || null,
      jobType: `Invoice ${invoiceRow.id}`,
      dueDate: invoiceRow.due_date,
      baseAmount,
      taxAmount,
    }).catch((err) => console.error('QBO sync warning from Stripe invoice webhook:', err));

    try {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, owner_id')
        .eq('id', organizationId)
        .maybeSingle();

      const ownerId = org?.owner_id;
      if (ownerId) {
        const { data: ownerUserData } = await supabaseAdmin.auth.admin.getUserById(ownerId);
        const ownerEmail = ownerUserData?.user?.email;

        if (ownerEmail) {
          await resend.emails.send({
            from: 'Prado Alerts <notifications@indevasa.com>',
            to: ownerEmail,
            subject: `Invoice Paid: ${customerName}`,
            html: `
              <h2>Invoice payment received</h2>
              <p><strong>Organization:</strong> ${org?.name || 'Prado Workspace'}</p>
              <p><strong>Invoice ID:</strong> ${invoiceRow.id}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Total Paid:</strong> $${totalAmount.toFixed(2)} USD</p>
              <p><strong>Paid At:</strong> ${paidAt}</p>
            `,
          });
        }
      }
    } catch (notifyErr) {
      console.error('Invoice paid, but subscriber notification failed:', notifyErr);
    }
  }

  return NextResponse.json({ received: true, invoicePaid: invoiceRow.id }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  // Security Check
  try {
    if (!sig) throw new Error('Missing stripe-signature header');
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed:`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const failedSession = event.data.object as Stripe.Checkout.Session;
    const invoiceId = getInvoiceIdFromSession(failedSession);

    if (invoiceId) {
      await supabaseAdmin
        .from('invoices')
        .update({ stripe_payment_status: 'failed' })
        .eq('id', invoiceId);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Handle successful sign-up & checkouts
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;

    const isInvoiceCheckout =
      session.metadata?.source === 'prado_invoice' ||
      Boolean(session.metadata?.invoiceId) ||
      Boolean(session.metadata?.invoice_id);

    if (isInvoiceCheckout) {
      if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
        return NextResponse.json({ received: true, pending: true }, { status: 200 });
      }

      return handleInvoiceCheckoutPaid(session);
    }

    try {
      // FIXED: Pull target organization identifier from client_reference_id matching your checkout links
      const organizationId = session.client_reference_id || session.metadata?.organizationId;

      if (!organizationId) {
        console.error('⚠️ Webhook received session without a valid organization tracker identifier.');
        return NextResponse.json({ error: 'Missing organization reference ID context' }, { status: 400 });
      }

      let productNames = 'Prado Operating Plan';
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        if (lineItems && lineItems.data.length > 0) {
          productNames = lineItems.data.map(item => item.description).join(', ');
        }
      } catch (lineError) {
        console.log('ℹ️ Line items could not be parsed, utilizing default labels.');
      }

      // Automatically determine tier names depending on checkout pricing lines
      let assignedStatus = 'individual';
      if (productNames.toLowerCase().includes('growth')) {
        assignedStatus = 'growth';
      }
      if (productNames.toLowerCase().includes('enterprise')) {
        assignedStatus = 'enterprise';
      }

      // 4. Update Database: Activate the organization's subscription status in Supabase
      const { error: dbError } = await supabaseAdmin
        .from('organizations')
        .update({ subscription_status: assignedStatus }) // Upgrades to 'individual', 'growth', or 'enterprise'
        .eq('id', organizationId);

      if (dbError) throw dbError;
      console.log(`Supabase Synced: ✅ Organization ${organizationId} successfully upgraded to (${assignedStatus}) status.`);

      // Send Custom Branding Receipt HTML Email via Resend
      const customerName = session.customer_details?.name || 'Valued Operator';
      const customerEmail = session.customer_details?.email;
      const netSales = (session.amount_total || 0) / 100;
      let orderNumber = session.id.replace('cs_live_', 'CH_');

      if (customerEmail) {
        await resend.emails.send({
          from: 'Prado <billing@pradosa.com>',
          to: customerEmail,
          subject: `Your Prado Receipt Summary`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; text-align: left; color: #1e293b;">
              <h2 style="color: #10b981; text-align: center;">Welcome to Prado Operations</h2>
              <p>Hi ${customerName},</p>
              <p>Your workspace is unlocked and active. We have successfully processed your monthly subscription setup parameters:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #F9FAFB;">
                  <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Reference Token</td>
                  <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right;">#${orderNumber.slice(0, 15)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Activated Profile</td>
                  <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right;">${productNames}</td>
                </tr>
                <tr style="background-color: #F9FAFB;">
                  <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Monthly Total</td>
                  <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #10B981;">$${netSales.toFixed(2)} USD</td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #6B7280; text-align: center; margin-top: 30px;">
                Log into your dashboard menu to start calculating dispatch paths. For invoicing help, reply to this email.
              </p>
            </div>
          `,
        });
        console.log(`✉️ Operational dispatch activation invoice receipt sent to ${customerEmail}`);
      }

      // Notify internal inbox for successful paid checkout events.
      try {
        await resend.emails.send({
          from: 'Prado Alerts <notifications@indevasa.com>',
          to: process.env.ADMIN_ALERT_EMAIL || 'info@pradojob.com',
          subject: `New Prado Checkout (${assignedStatus})`,
          html: `
            <h2>Successful Stripe Checkout</h2>
            <p><strong>Customer Name:</strong> ${customerName}</p>
            <p><strong>Customer Email:</strong> ${customerEmail || 'N/A'}</p>
            <p><strong>Organization ID:</strong> ${organizationId}</p>
            <p><strong>Assigned Plan:</strong> ${assignedStatus}</p>
            <p><strong>Products:</strong> ${productNames}</p>
            <p><strong>Total:</strong> $${netSales.toFixed(2)} USD</p>
            <p><strong>Session ID:</strong> ${session.id}</p>
          `,
        });
      } catch (alertErr) {
        console.error('Checkout processed, but admin alert email failed:', alertErr);
      }

    } catch (processError: any) {
      console.error('❌ Error executing database mutation routines:', processError.message);
      return NextResponse.json({ error: 'Database mutation operations failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}