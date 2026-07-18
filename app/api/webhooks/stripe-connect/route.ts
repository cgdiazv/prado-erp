import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe Connect webhook is not configured.' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(error as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({
        stripe_account_charges_enabled: Boolean(account.charges_enabled),
        stripe_account_payouts_enabled: Boolean(account.payouts_enabled),
      })
      .eq('stripe_account_id', account.id)
      .eq('stripe_soft_disconnected', false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
