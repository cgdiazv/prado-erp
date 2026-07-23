'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { isPradoManagementUser } from '@/lib/pradoManagement';

const ALLOWED_SUBSCRIPTION_STATUS = new Set([
  'trial',
  'individual',
  'growth',
  'enterprise',
  'cancelled',
  'past_due',
]);

function managementRedirect(locale: string, state: 'updated' | 'error', message?: string) {
  const params = new URLSearchParams();

  if (state === 'updated') {
    params.set('updated', '1');
  }

  if (state === 'error' && message) {
    params.set('error', message);
  }

  const query = params.toString();
  redirect(`/${locale}/management${query ? `?${query}` : ''}`);
}

export async function updateSubscriberAccount(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const organizationId = String(formData.get('organizationId') || '').trim();
  const rawStatus = String(formData.get('subscriptionStatus') || '').trim().toLowerCase();
  const rawTrialStartsAt = String(formData.get('trialStartsAt') || '').trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPradoManagementUser(user)) {
    redirect(`/${locale}/dashboard`);
  }

  if (!organizationId) {
    managementRedirect(locale, 'error', 'Organization ID is required.');
  }

  if (!ALLOWED_SUBSCRIPTION_STATUS.has(rawStatus)) {
    managementRedirect(locale, 'error', 'Invalid subscription status.');
  }

  let normalizedTrialStartsAt: string | null = null;

  if (rawTrialStartsAt) {
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawTrialStartsAt);

    if (!isValidDate) {
      managementRedirect(locale, 'error', 'Trial start must use YYYY-MM-DD format.');
    }

    normalizedTrialStartsAt = new Date(`${rawTrialStartsAt}T00:00:00.000Z`).toISOString();
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: rawStatus,
      trial_starts_at: normalizedTrialStartsAt,
    })
    .eq('id', organizationId);

  if (error) {
    managementRedirect(locale, 'error', error.message);
  }

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'updated');
}
