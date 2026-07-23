'use server';

import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

const FEEDBACK_VALUES = ['bad', 'okay', 'good', 'great'] as const;
type FeedbackValue = (typeof FEEDBACK_VALUES)[number];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeFeedbackValue(value: string | null): FeedbackValue | null {
  const normalized = (value || '').trim().toLowerCase();
  return FEEDBACK_VALUES.includes(normalized as FeedbackValue) ? (normalized as FeedbackValue) : null;
}

function normalizeLocale(value: string | null) {
  return (value || '').trim().toLowerCase().startsWith('es') ? 'es' : 'en';
}

function getFeedbackLabel(value: FeedbackValue, locale: string) {
  if (locale === 'es') {
    return {
      bad: 'Mal',
      okay: 'Regular',
      good: 'Bien',
      great: 'Excelente',
    }[value];
  }

  return {
    bad: 'Bad',
    okay: 'Okay',
    good: 'Good',
    great: 'Great',
  }[value];
}

export async function submitDashboardFeedback(formData: FormData) {
  const rating = normalizeFeedbackValue(formData.get('rating') as string | null);
  const locale = normalizeLocale(formData.get('locale') as string | null);

  if (!rating) {
    return { error: 'Invalid feedback rating.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in to submit feedback.' };
  }

  const { organization: org } = await getUserOrganization(user.id);
  if (!org) {
    return { error: 'Workspace not found.' };
  }

  const admin = createAdminClient();
  const feedbackLabel = getFeedbackLabel(rating, locale);

  const { error: insertError } = await admin.from('dashboard_feedback').insert({
    organization_id: org.id,
    user_id: user.id,
    user_email: user.email || null,
    rating,
    rating_label: feedbackLabel,
    locale,
    source: 'dashboard_footer',
  });

  if (insertError) {
    return { error: insertError.message };
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Prado Feedback <notifications@indevasa.com>',
        to: 'info@pradojob.com',
        subject: `Dashboard feedback: ${feedbackLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #0f172a;">
            <h2 style="margin-top: 0; color: #0f172a;">Dashboard feedback received</h2>
            <p><strong>Rating:</strong> ${escapeHtml(feedbackLabel)}</p>
            <p><strong>User email:</strong> ${escapeHtml(user.email || 'Unknown')}</p>
            <p><strong>Organization:</strong> ${escapeHtml(org.name || org.id)}</p>
            <p><strong>Locale:</strong> ${escapeHtml(locale)}</p>
            <p><strong>Submitted at:</strong> ${escapeHtml(new Date().toISOString())}</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Dashboard feedback email failed:', error);
    }
  }

  revalidatePath('/dashboard');
  revalidatePath(`/${locale}/dashboard`);

  return { success: true };
}