import { Resend } from 'resend';
import { getResendFromAddress } from '@/lib/resend';

interface WelcomeEmailParams {
  to: string;
  companyName: string;
  tradeVertical?: string;
  appBaseUrl?: string;
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
    const from = getResendFromAddress({ displayName: 'Prado Jobs' });

    const baseUrl = appBaseUrl.replace(/\/+$/, '');
    const dashboardUrl = `${baseUrl}/dashboard`;
    const loginUrl = `${baseUrl}/login`;
    const tradeLabel = tradeVertical || 'Field Operations';
    const footerYear = new Date().getFullYear();

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Prado Jobs!</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08),0 8px 10px -6px rgba(15,23,42,0.04);border:1px solid #e2e8f0;">

          <!-- HERO HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#009966 0%,#006644 100%);padding:40px 36px;text-align:center;color:#ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- Brand Pill -->
                    <div style="display:inline-block;background-color:rgba(255,255,255,0.12);padding:6px 16px;border-radius:30px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#a7f3d0;margin-bottom:16px;border:1px solid rgba(255,255,255,0.15);">
                      PRADO JOBS &bull; FIELD SERVICE SOFTWARE
                    </div>
                    <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.25;color:#ffffff;">
                      Welcome aboard!
                    </h1>
                    <p style="margin:10px 0 0 0;font-size:14px;color:#d1fae5;max-width:440px;line-height:1.5;">
                      Your workspace for <strong style="color:#ffffff;">${companyName}</strong> is live and ready to go.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">
                Hi <strong style="color:#0f172a;">${companyName}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#475569;line-height:1.6;">
                Welcome to <strong>Prado Jobs</strong>! Your 30-day free trial workspace is set up and we've pre-loaded it with sample jobs matched to <strong>${tradeLabel}</strong> so you can explore scheduling, routing, and billing right away.
              </p>

              <!-- WORKSPACE SUMMARY BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:28px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 20px;background-color:#f1f5f9;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;">
                      Your Workspace Summary
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;width:130px;">Company</td>
                        <td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;">${companyName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;">Trade</td>
                        <td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;">${tradeLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;">Trial</td>
                        <td style="padding:6px 0;font-size:12px;font-weight:600;color:#059669;">
                          <span style="display:inline-block;background-color:#d1fae5;color:#065f46;padding:2px 8px;border-radius:6px;">30 Days Free</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#009966;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:15px 36px;border-radius:12px;box-shadow:0 4px 14px rgba(0,153,102,0.35);text-align:center;">
                      Launch My Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- FEATURE PILLARS -->
              <h3 style="margin:0 0 16px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">
                What you can do starting today
              </h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" style="vertical-align:top;">
                          <div style="width:28px;height:28px;background-color:#d1fae5;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">&#128295;</div>
                        </td>
                        <td>
                          <div style="font-size:13px;font-weight:700;color:#1e293b;">Jobs &amp; Work Orders</div>
                          <div style="font-size:12px;color:#64748b;margin-top:2px;">Create, assign, and track Jobs from dispatch to completion with real-time status updates.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" style="vertical-align:top;">
                          <div style="width:28px;height:28px;background-color:#dbeafe;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">&#128197;</div>
                        </td>
                        <td>
                          <div style="font-size:13px;font-weight:700;color:#1e293b;">Scheduling &amp; Dispatch</div>
                          <div style="font-size:12px;color:#64748b;margin-top:2px;">Drag-and-drop calendar, GPS route optimization, and automated technician alerts.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" style="vertical-align:top;">
                          <div style="width:28px;height:28px;background-color:#fef3c7;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">&#128179;</div>
                        </td>
                        <td>
                          <div style="font-size:13px;font-weight:700;color:#1e293b;">Quotes &amp; Invoices</div>
                          <div style="font-size:12px;color:#64748b;margin-top:2px;">Send professional Quotes, convert them to Invoices in one click, and collect payment online.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" style="vertical-align:top;">
                          <div style="width:28px;height:28px;background-color:#f3e8ff;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">&#128101;</div>
                        </td>
                        <td>
                          <div style="font-size:13px;font-weight:700;color:#1e293b;">Customer Management</div>
                          <div style="font-size:12px;color:#64748b;margin-top:2px;">Full customer profiles, service history, Vehicles, and automated welcome emails for every new Customer.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- SUPPORT NOTE -->
              <div style="background-color:#f8fafc;border-left:4px solid #009966;padding:14px 16px;border-radius:8px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;color:#334155;line-height:1.5;">
                  <strong>Need help getting started?</strong> Reply directly to this email and our team will walk you through setting up your first Job, scheduling, and billing flow.
                </p>
              </div>

              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                Keep an eye on your inbox &mdash; we'll send you a few quick tips over the next few days to help you get the most out of Prado Jobs.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#334155;">
                Prado Jobs &mdash; Field Service Software
              </p>
              <p style="margin:0 0 10px 0;font-size:11px;color:#64748b;">
                This message was automatically sent to confirm your new workspace at <a href="https://pradojob.com" style="color:#009966;text-decoration:underline;font-weight:600;">pradojob.com</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                Log in at any time: <a href="${loginUrl}" style="color:#009966;text-decoration:underline;">${loginUrl}</a>
              </p>
              <p style="margin:10px 0 0 0;font-size:10px;color:#cbd5e1;">
                &copy; ${footerYear} Prado Commerce. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'support@pradocommerce.com',
      subject: `Welcome to Prado Jobs, ${companyName}! Your workspace is ready 🚀`,
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
