'use server';

import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabaseServer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

function formatStripeConnectError(error: unknown): string {
  const message = (error as Error)?.message || 'Failed to start Stripe onboarding.';
  const normalized = message.toLowerCase();

  if (normalized.includes('signed up for connect') || normalized.includes('create new accounts')) {
    return 'Stripe setup is still in progress on Prado. Please contact your Prado admin to enable Stripe Connect on the platform account, then try again.';
  }

  if (normalized.includes('responsibilities of managing losses') || normalized.includes('/settings/connect/platform-profile')) {
    return 'Stripe setup is still in progress on Prado. The platform owner must finish the Connect platform profile in Stripe before subscribers can connect.';
  }

  if (normalized.includes('api key')) {
    return 'Stripe is temporarily unavailable for this workspace. Please contact your Prado admin to verify Stripe keys and environment mode.';
  }

  if (normalized.includes('permission') || normalized.includes('not authorized') || normalized.includes('forbidden')) {
    return 'Your Stripe onboarding request could not be completed. Please contact your Prado admin to review platform permissions.';
  }

  return message;
}

type StripeStatusResult = {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
  error?: string;
};

function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'https://pradojob.com';
}

function revalidatePaymentPaths(locale: string): void {
  revalidatePath(`/${locale}/dashboard/settings/integrations`);
  revalidatePath(`/${locale}/dashboard/settings`);
}

export async function createStripeConnectAccountLink(locale = 'en'): Promise<{ url?: string; error?: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Stripe is not configured on the server.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in to connect Stripe.' };
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, stripe_account_id, stripe_soft_disconnected')
    .eq('owner_id', user.id)
    .single();

  if (orgError || !org) {
    return { error: 'Workspace not found.' };
  }

  let accountId = org.stripe_account_id || null;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || undefined,
        metadata: {
          organizationId: org.id,
          ownerUserId: user.id,
        },
      });

      accountId = account.id;

      const { error: saveError } = await supabase
        .from('organizations')
        .update({
          stripe_account_id: accountId,
          stripe_soft_disconnected: false,
          stripe_account_charges_enabled: Boolean(account.charges_enabled),
          stripe_account_payouts_enabled: Boolean(account.payouts_enabled),
        })
        .eq('id', org.id);

      if (saveError) {
        return { error: saveError.message };
      }
    }

    if (org.stripe_soft_disconnected) {
      const { error: reconnectError } = await supabase
        .from('organizations')
        .update({ stripe_soft_disconnected: false })
        .eq('id', org.id);

      if (reconnectError) {
        return { error: reconnectError.message };
      }
    }

    const baseUrl = getAppBaseUrl();
    const normalizedLocale = (locale || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/${normalizedLocale}/dashboard/settings/integrations?stripe=refresh`,
      return_url: `${baseUrl}/${normalizedLocale}/dashboard/settings/integrations?stripe=return`,
      type: 'account_onboarding',
    });

    revalidatePaymentPaths(normalizedLocale);
    return { url: accountLink.url };
  } catch (error: unknown) {
    return { error: formatStripeConnectError(error) };
  }
}

export async function getStripeAccountStatus(locale = 'en'): Promise<StripeStatusResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      connected: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      error: 'Stripe is not configured on the server.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      connected: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      error: 'You must be signed in to view Stripe status.',
    };
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, stripe_account_id, stripe_soft_disconnected')
    .eq('owner_id', user.id)
    .single();

  if (orgError || !org) {
    return {
      connected: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      error: 'Workspace not found.',
    };
  }

  if (!org.stripe_account_id) {
    return {
      connected: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
    };
  }

  if (org.stripe_soft_disconnected) {
    const normalizedLocale = (locale || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
    revalidatePaymentPaths(normalizedLocale);

    return {
      connected: true,
      accountId: org.stripe_account_id,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
    };
  }

  try {
    const account = await stripe.accounts.retrieve(org.stripe_account_id);

    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const requirementsDue = account.requirements?.currently_due || [];

    await supabase
      .from('organizations')
      .update({
        stripe_account_charges_enabled: chargesEnabled,
        stripe_account_payouts_enabled: payoutsEnabled,
      })
      .eq('id', org.id);

    const normalizedLocale = (locale || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
    revalidatePaymentPaths(normalizedLocale);

    return {
      connected: true,
      accountId: account.id,
      chargesEnabled,
      payoutsEnabled,
      requirementsDue,
    };
  } catch (error: unknown) {
    return {
      connected: true,
      accountId: org.stripe_account_id,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      error: (error as Error)?.message || 'Failed to read Stripe status.',
    };
  }
}

export async function disconnectStripeAccount(locale = 'en'): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in to disconnect Stripe.' };
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (orgError || !org) {
    return { error: 'Workspace not found.' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_soft_disconnected: true,
      stripe_account_charges_enabled: false,
      stripe_account_payouts_enabled: false,
    })
    .eq('id', org.id);

  if (error) {
    return { error: error.message };
  }

  const normalizedLocale = (locale || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  revalidatePaymentPaths(normalizedLocale);

  return { success: true };
}
