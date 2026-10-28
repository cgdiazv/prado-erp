import { Resend } from 'resend';
import { getResendFromAddress } from '@/lib/resend';

interface WelcomeEmailParams {
  to: string;
  companyName: string;
  tradeVertical?: string;
  appBaseUrl?: string;
}

export function buildWelcomeEmailHtml({
  companyName,
  tradeVertical,
  appBaseUrl = 'https://pradojob.com',
}: {
  companyName: string;
  tradeVertical?: string;
  appBaseUrl?: string;
}): string {
  const baseUrl = appBaseUrl.replace(/\/+$/, '');
  const logoUrl = `${baseUrl}/icon.png`;
  const dashboardUrl = `${baseUrl}/dashboard`;
  const quotesUrl = `${baseUrl}/dashboard/estimates`;
  const billingUrl = `${baseUrl}/dashboard/billing`;
  const supportUrl = `${baseUrl}/support`;
  const footerYear = new Date().getFullYear();

  const tradeLabel = tradeVertical?.trim();
  const prosTarget = tradeLabel
    ? `${tradeLabel} Pros`
    : 'HVAC, plumbing, electrical, and trade Pros';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Let's Get You Set Up &bull; Prado</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08),0 8px 10px -6px rgba(15,23,42,0.04);border:1px solid #e2e8f0;">

          <!-- TOP BAR WITH PRADO LOGO -->
          <tr>
            <td style="padding:18px 32px;background-color:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;">
                          <img
                            src="${logoUrl}"
                            alt="Prado"
                            width="32"
                            height="32"
                            style="display:block;width:32px;height:32px;border-radius:8px;object-fit:cover;"
                          />
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.4px;">Prado</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:12px;color:#64748b;">
                    Need help? <a href="mailto:support@pradojob.com" style="color:#009966;font-weight:600;text-decoration:none;">support@pradojob.com</a>
                    <span style="color:#cbd5e1;margin:0 6px;">|</span>
                    <a href="${supportUrl}" style="color:#64748b;text-decoration:none;">Help Center</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 1. ACTION-ORIENTED HERO BANNER -->
          <tr>
            <td style="background:linear-gradient(135deg,#064e3b 0%,#047857 50%,#009966 100%);padding:42px 32px;text-align:center;color:#ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background-color:rgba(255,255,255,0.15);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#a7f3d0;margin-bottom:16px;border:1px solid rgba(255,255,255,0.2);">
                      30-Day Free Trial Ready
                    </div>
                    <h1 style="margin:0 0 12px 0;font-size:30px;font-weight:900;letter-spacing:-0.5px;line-height:1.15;color:#ffffff;text-transform:uppercase;">
                      LET'S GET YOU SET UP
                    </h1>
                    <p style="margin:0 0 24px 0;font-size:15px;color:#d1fae5;max-width:460px;line-height:1.5;font-weight:500;">
                      Your Prado trial is ready with tools built for <strong style="color:#ffffff;">${prosTarget}</strong>.
                    </p>
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${dashboardUrl}" style="display:inline-block;background-color:#f59e0b;color:#0f172a;text-decoration:none;font-size:15px;font-weight:800;padding:14px 38px;border-radius:50px;box-shadow:0 4px 16px rgba(0,0,0,0.25);letter-spacing:0.2px;">
                            Get started
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. 3-STEP QUICK START ONBOARDING BODY -->
          <tr>
            <td style="padding:36px 32px 32px 32px;">
              <p style="margin:0 0 20px 0;font-size:15px;color:#334155;line-height:1.6;">
                Your Prado trial is live, and it's ready with tools built for <strong>${prosTarget}</strong> like you. Most platforms take months to implement and require consultants. Prado doesn't. You'll be sending Quotes and dispatching Jobs today. Here's how:
              </p>

              <!-- STEPS -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:24px 0 20px 0;">
                <!-- Step 1 -->
                <tr>
                  <td style="padding-bottom:18px;vertical-align:top;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="32" style="vertical-align:top;">
                          <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:22px;">1.</div>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="font-size:14px;line-height:1.5;color:#334155;">
                            <strong style="color:#0f172a;">Log In to Prado:</strong> Sign in on desktop or mobile to get started.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Step 2 -->
                <tr>
                  <td style="padding-bottom:18px;vertical-align:top;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="32" style="vertical-align:top;">
                          <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:22px;">2.</div>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="font-size:14px;line-height:1.5;color:#334155;">
                            <strong style="color:#0f172a;">Set up your company &amp; operations:</strong> Add your business details, logo, and operational settings in under 2 minutes &mdash; simple, fast, and ready to go.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Step 3 -->
                <tr>
                  <td style="padding-bottom:10px;vertical-align:top;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="32" style="vertical-align:top;">
                          <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:22px;">3.</div>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="font-size:14px;line-height:1.5;color:#334155;">
                            <strong style="color:#0f172a;">Send your first Quote:</strong> Create a Job, add your line items, and send a professional Quote in minutes.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${quotesUrl}" style="display:inline-block;background-color:#f59e0b;color:#0f172a;text-decoration:none;font-size:15px;font-weight:800;padding:14px 40px;border-radius:50px;box-shadow:0 4px 14px rgba(245,158,11,0.35);letter-spacing:0.2px;">
                      Create a Quote
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:10px;">
                    <span style="font-size:12px;color:#64748b;font-weight:500;">Time to complete: 3 minutes</span>
                  </td>
                </tr>
              </table>

              <!-- PLAN LINK -->
              <p style="margin:22px 0 0 0;font-size:13px;color:#475569;text-align:center;">
                Like what you see? <a href="${billingUrl}" style="color:#009966;font-weight:700;text-decoration:underline;">Find the right plan for your business here &rarr;</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f8fafc;padding:28px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <div style="margin-bottom:12px;">
                <img
                  src="${logoUrl}"
                  alt="Prado"
                  width="36"
                  height="36"
                  style="display:inline-block;width:36px;height:36px;border-radius:8px;margin:0 auto;"
                />
              </div>
              <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">
                Need help or have questions? Contact <a href="mailto:support@pradojob.com" style="color:#009966;text-decoration:none;font-weight:600;">support@pradojob.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                &copy; ${footerYear} Prado &bull; 12828 Willow Centre Dr Ste D, Houston, TX 77066 &bull; All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail({
  to,
  companyName,
  tradeVertical,
  appBaseUrl = 'https://pradojob.com',
}: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[Welcome Email] RESEND_API_KEY not configured — skipping.');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const resend = new Resend(apiKey);
    const from = getResendFromAddress({ displayName: 'Prado' });

    const emailHtml = buildWelcomeEmailHtml({
      companyName,
      tradeVertical,
      appBaseUrl,
    });

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'support@pradocommerce.com',
      subject: `Let's get you set up, ${companyName}! 🚀`,
      html: emailHtml,
    });

    if (error) {
      console.error('[Welcome Email] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Welcome Email] Sent to ${to} (${companyName}), Resend ID: ${data?.id}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Welcome Email] Exception:', message);
    return { success: false, error: message };
  }
}


