import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { checkTrialExpiry } from '@/lib/trialCheck';
import StripePayoutsView, {
  type StripeBalanceTransactionRecord,
  type StripePayoutRecord,
} from '@/components/dashboard/StripePayoutsView';

export const dynamic = 'force-dynamic';

export default async function PayoutsPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const [canAccessInvoice, canAccessExpenses] = await Promise.all([
    hasDashboardModuleAccess(org.id, role, 'invoice'),
    hasDashboardModuleAccess(org.id, role, 'expenses'),
  ]);

  if (!canAccessInvoice && !canAccessExpenses) {
    redirect(`/${locale}/dashboard`);
  }

  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect(`/${locale}/dashboard?expired=true`);
  }

  const { data: orgStripe } = await supabase
    .from('organizations')
    .select(
      'stripe_account_id, stripe_soft_disconnected, stripe_account_charges_enabled, stripe_account_payouts_enabled, invoice_currency_code'
    )
    .eq('id', org.id)
    .maybeSingle();

  const stripeAccountId = orgStripe?.stripe_account_id || org.stripe_account_id || null;
  const isSoftDisconnected = Boolean(orgStripe?.stripe_soft_disconnected);
  const stripeConnected = Boolean(stripeAccountId && !isSoftDisconnected);
  const currencyCode = orgStripe?.invoice_currency_code || org.invoice_currency_code || 'USD';

  let availableBalance = 0;
  let pendingBalance = 0;
  let inTransitTotal = 0;
  let paidLast30DaysTotal = 0;
  let payouts: StripePayoutRecord[] = [];
  let transactions: StripeBalanceTransactionRecord[] = [];
  let errorMessage: string | null = null;

  if (stripeConnected && stripeAccountId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const [balanceRes, payoutsRes, balanceTxRes] = await Promise.all([
        stripe.balance.retrieve({}, { stripeAccount: stripeAccountId }),
        stripe.payouts.list({ limit: 50 }, { stripeAccount: stripeAccountId }),
        stripe.balanceTransactions.list({ limit: 50 }, { stripeAccount: stripeAccountId }),
      ]);

      availableBalance =
        (balanceRes.available || []).reduce((sum, item) => sum + Number(item.amount || 0), 0) / 100;
      pendingBalance =
        (balanceRes.pending || []).reduce((sum, item) => sum + Number(item.amount || 0), 0) / 100;

      const thirtyDaysAgoUnix = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

      payouts = (payoutsRes.data || []).map((p) => {
        const amountDollars = Number(p.amount || 0) / 100;
        if (p.status === 'in_transit' || p.status === 'pending') {
          inTransitTotal += amountDollars;
        }
        if (p.status === 'paid' && p.arrival_date >= thirtyDaysAgoUnix) {
          paidLast30DaysTotal += amountDollars;
        }

        return {
          id: p.id,
          amount: amountDollars,
          currency: (p.currency || currencyCode).toUpperCase(),
          status: p.status,
          created: p.created,
          arrivalDate: p.arrival_date,
          method: p.method || 'standard',
          failureMessage: p.failure_message || null,
        };
      });

      transactions = (balanceTxRes.data || [])
        .filter((tx) => tx.type !== 'payout')
        .map((tx) => ({
          id: tx.id,
          amount: Number(tx.amount || 0) / 100,
          fee: Number(tx.fee || 0) / 100,
          net: Number(tx.net || 0) / 100,
          currency: (tx.currency || currencyCode).toUpperCase(),
          status: tx.status,
          type: tx.type,
          description: tx.description,
          created: tx.created,
          availableOn: tx.available_on,
        }));
    } catch (err: any) {
      console.error('[PayoutsPage] Failed to fetch Stripe Connect balance/payouts:', err);
      errorMessage = err?.message || 'Unable to load live Stripe payout data.';
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
        <StripePayoutsView
          locale={locale}
          stripeConnected={stripeConnected}
          payoutsEnabled={Boolean(org.stripe_account_payouts_enabled)}
          chargesEnabled={Boolean(org.stripe_account_charges_enabled)}
          currencyCode={currencyCode}
          availableBalance={availableBalance}
          pendingBalance={pendingBalance}
          inTransitTotal={inTransitTotal}
          paidLast30DaysTotal={paidLast30DaysTotal}
          payouts={payouts}
          transactions={transactions}
          errorMessage={errorMessage}
        />
      </div>
    </main>
  );
}
