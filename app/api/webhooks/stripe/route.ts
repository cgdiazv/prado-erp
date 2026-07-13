import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-28' as any,
});

// 2. Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// 3. Initialize Supabase Service Role Client 
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

  // Handle successful sign-up & checkouts
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

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

    } catch (processError: any) {
      console.error('❌ Error executing database mutation routines:', processError.message);
      return NextResponse.json({ error: 'Database mutation operations failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}