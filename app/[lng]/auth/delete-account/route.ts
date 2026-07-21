import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeSurveyReasons(payload: string | null) {
  if (!payload) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return parsed
      .map((reason) => String(reason).trim())
      .filter((reason) => reason.length > 0)
      .slice(0, 10);
  } catch {
    return [] as string[];
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const formData = await request.formData();
  const surveyReasons = normalizeSurveyReasons(formData.get('surveyReasons') as string | null);

  const requestUrl = new URL(request.url);
  const [, lng] = requestUrl.pathname.split('/');
  const safeLng = lng || 'en';

  if (!user) {
    return NextResponse.redirect(`${requestUrl.origin}/${safeLng}/login`, {
      status: 303,
    });
  }

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, subscription_status')
        .eq('owner_id', user.id)
        .maybeSingle();

      await resend.emails.send({
        from: 'Prado Alerts <notifications@indevasa.com>',
        to: process.env.ADMIN_ALERT_EMAIL || 'info@pradojob.com',
        subject: 'Account Deleted - User Feedback',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #0f172a;">
            <h2 style="margin-top: 0; color: #0f172a;">User account deletion reported</h2>
            <p><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
            <p><strong>User email:</strong> ${escapeHtml(user.email || 'Unknown')}</p>
            <p><strong>Organization ID:</strong> ${escapeHtml(org?.id || 'Unknown')}</p>
            <p><strong>Organization name:</strong> ${escapeHtml(org?.name || 'Unknown')}</p>
            <p><strong>Subscription status:</strong> ${escapeHtml(org?.subscription_status || 'Unknown')}</p>
            <p><strong>Deletion survey reasons:</strong></p>
            ${
              surveyReasons.length > 0
                ? `<ul>${surveyReasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`
                : '<p>User deleted account without selecting survey reasons.</p>'
            }
          </div>
        `,
      });
    }
  } catch (feedbackError) {
    console.error('Delete account feedback email failed:', feedbackError);
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('Delete account failed:', error.message);
    return NextResponse.redirect(`${requestUrl.origin}/${safeLng}/dashboard/settings?delete=error`, {
      status: 303,
    });
  }

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/${safeLng}/signup`, {
    status: 303,
  });
}