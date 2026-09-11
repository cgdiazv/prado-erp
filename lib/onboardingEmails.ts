import { Resend } from 'resend';
import { getResendFromAddress } from '@/lib/resend';

interface OnboardingParams {
  to: string;
  companyName: string;
  tradeVertical?: string;
  appBaseUrl?: string;
}

// ---------------------------------------------------------------------------
// Email HTML builders
// ---------------------------------------------------------------------------

function buildDay1Html(companyName: string, dashboardUrl: string, tradeLabel: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Create your first Job</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 12px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#009966 0%,#006644 100%);padding:32px 36px;text-align:center;">
            <div style="display:inline-block;background-color:rgba(255,255,255,0.12);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#a7f3d0;margin-bottom:14px;border:1px solid rgba(255,255,255,0.15);">
              Day 1 Tip &bull; Prado Jobs
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
              &#128293; Create your first Job in 60 seconds
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">
              Hi <strong style="color:#0f172a;">${companyName}</strong>,
            </p>
            <p style="margin:0 0 20px 0;font-size:14px;color:#475569;line-height:1.6;">
              The fastest way to see the value of Prado Jobs is to create your first real Job. It only takes about a minute and you'll see how scheduling, dispatch, and billing all connect automatically.
            </p>

            <!-- STEPS -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding:10px 0;vertical-align:top;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="36" style="vertical-align:top;">
                        <div style="width:26px;height:26px;background-color:#009966;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#ffffff;">1</div>
                      </td>
                      <td style="padding-left:4px;">
                        <div style="font-size:13px;font-weight:700;color:#1e293b;">Go to Jobs &rarr; New Job</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">Pick a Customer (or create one on the spot) and describe the ${tradeLabel} work needed.</div>
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
                        <div style="width:26px;height:26px;background-color:#009966;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#ffffff;">2</div>
                      </td>
                      <td style="padding-left:4px;">
                        <div style="font-size:13px;font-weight:700;color:#1e293b;">Schedule a date &amp; assign a technician</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">Prado Jobs notifies your tech automatically and puts the Job on the map.</div>
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
                        <div style="width:26px;height:26px;background-color:#009966;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#ffffff;">3</div>
                      </td>
                      <td style="padding-left:4px;">
                        <div style="font-size:13px;font-weight:700;color:#1e293b;">Mark it Complete &rarr; Invoice in one click</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">When the Job is done, convert it to a professional Invoice and email it to your Customer.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}/jobs/new" style="display:inline-block;background-color:#009966;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;box-shadow:0 4px 14px rgba(0,153,102,0.3);">
                    Create My First Job &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Need a hand? Just reply to this email &mdash; we're here to help.
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">Prado Jobs &mdash; Field Service Software &bull; <a href="${dashboardUrl}" style="color:#009966;text-decoration:none;">pradojob.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDay3Html(companyName: string, dashboardUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Invite your team</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 12px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#009966 0%,#006644 100%);padding:32px 36px;text-align:center;">
            <div style="display:inline-block;background-color:rgba(255,255,255,0.12);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#a7f3d0;margin-bottom:14px;border:1px solid rgba(255,255,255,0.15);">
              Day 3 Tip &bull; Prado Jobs
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
              &#128101; Your team is one invite away
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">
              Hi <strong style="color:#0f172a;">${companyName}</strong>,
            </p>
            <p style="margin:0 0 20px 0;font-size:14px;color:#475569;line-height:1.6;">
              Field service runs on teamwork. Invite your technicians, dispatchers, or office staff so everyone can see and update Jobs in real time &mdash; from any device, anywhere.
            </p>

            <!-- ROLE CARDS -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:28px;overflow:hidden;">
              <tr>
                <td style="padding:14px 20px;background-color:#f1f5f9;border-bottom:1px solid #e2e8f0;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;">Team Roles Available</span>
                </td>
              </tr>
              <tr>
                <td style="padding:20px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#64748b;width:110px;">Technician</td>
                      <td style="padding:6px 0;font-size:13px;color:#0f172a;">View &amp; update assigned Jobs, log time &amp; notes</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#64748b;">Dispatcher</td>
                      <td style="padding:6px 0;font-size:13px;color:#0f172a;">Schedule Jobs, assign techs, manage the calendar</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#64748b;">Admin</td>
                      <td style="padding:6px 0;font-size:13px;color:#0f172a;">Full access — billing, reports, settings</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}/settings/team" style="display:inline-block;background-color:#009966;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;box-shadow:0 4px 14px rgba(0,153,102,0.3);">
                    Invite My Team &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Your teammates get an email invite with a direct link to join your workspace.
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">Prado Jobs &mdash; Field Service Software &bull; <a href="${dashboardUrl}" style="color:#009966;text-decoration:none;">pradojob.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDay7Html(companyName: string, dashboardUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Send your first Invoice</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:40px 12px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#009966 0%,#006644 100%);padding:32px 36px;text-align:center;">
            <div style="display:inline-block;background-color:rgba(255,255,255,0.12);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#a7f3d0;margin-bottom:14px;border:1px solid rgba(255,255,255,0.15);">
              Day 7 Tip &bull; Prado Jobs
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
              &#128181; Ready to send your first Invoice?
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;font-size:15px;color:#334155;line-height:1.6;">
              Hi <strong style="color:#0f172a;">${companyName}</strong>,
            </p>
            <p style="margin:0 0 20px 0;font-size:14px;color:#475569;line-height:1.6;">
              You've had a week to explore Prado Jobs. Now let's put it to work for real &mdash; sending a professional Invoice to a Customer takes less than two minutes.
            </p>

            <!-- INVOICE FLOW CARD -->
            <div style="background-color:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;padding:20px;margin-bottom:28px;">
              <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#009966;">Two ways to invoice</p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #e2e8f0;">
                    <div style="font-size:13px;font-weight:700;color:#1e293b;">From a completed Job</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Open any completed Job &rarr; click <strong>"Convert to Invoice"</strong>. Line items, labor, and Customer details auto-fill.</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;vertical-align:top;">
                    <div style="font-size:13px;font-weight:700;color:#1e293b;">From a Quote</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Send a Quote first, let the Customer approve it, then convert to Invoice with one click.</div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- HIGHLIGHT STAT -->
            <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-radius:12px;padding:16px 20px;margin-bottom:28px;border:1px solid #a7f3d0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#065f46;line-height:1.5;">
                &#128200; <strong>Businesses using Prado Jobs get paid 2&times; faster</strong> because Invoices go out the same day the Job is done.
              </p>
            </div>

            <!-- CTA -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}/invoices/new" style="display:inline-block;background-color:#009966;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;box-shadow:0 4px 14px rgba(0,153,102,0.3);">
                    Create My First Invoice &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- PLAN NUDGE -->
            <div style="background-color:#fff7ed;border-left:4px solid #f97316;padding:14px 16px;border-radius:8px;">
              <p style="margin:0;font-size:12px;color:#9a3412;line-height:1.5;">
                &#9201; <strong>Your 30-day trial has 23 days remaining.</strong> Upgrade any time to keep full access to Jobs, Invoicing, and route optimization &mdash; no disruption to your data.
              </p>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">Prado Jobs &mdash; Field Service Software &bull; <a href="${dashboardUrl}" style="color:#009966;text-decoration:none;">pradojob.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public function — schedule the full 3-email drip sequence at signup
// ---------------------------------------------------------------------------

export async function scheduleOnboardingSequence({
  to,
  companyName,
  tradeVertical,
  appBaseUrl = 'https://pradojob.com',
}: OnboardingParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Onboarding Emails] RESEND_API_KEY not configured — skipping sequence.');
    return;
  }

  const resend = new Resend(apiKey);
  const from = getResendFromAddress({ displayName: 'Prado Jobs' });
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || 'support@pradocommerce.com';

  const baseUrl = appBaseUrl.replace(/\/+$/, '');
  const dashboardUrl = `${baseUrl}/dashboard`;
  const tradeLabel = tradeVertical || 'Field Operations';

  const now = new Date();

  // Day 1: +24 hours
  const day1At = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Day 3: +72 hours
  const day3At = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  // Day 7: +168 hours
  const day7At = new Date(now.getTime() + 168 * 60 * 60 * 1000);

  const emails = [
    {
      label: 'Day 1',
      scheduledAt: day1At.toISOString(),
      subject: `Create your first Job in 60 seconds — ${companyName}`,
      html: buildDay1Html(companyName, dashboardUrl, tradeLabel),
    },
    {
      label: 'Day 3',
      scheduledAt: day3At.toISOString(),
      subject: `Your team is one invite away — ${companyName}`,
      html: buildDay3Html(companyName, dashboardUrl),
    },
    {
      label: 'Day 7',
      scheduledAt: day7At.toISOString(),
      subject: `Ready to send your first Invoice? — ${companyName}`,
      html: buildDay7Html(companyName, dashboardUrl),
    },
  ];

  const results = await Promise.allSettled(
    emails.map(({ scheduledAt, subject, html }) =>
      resend.emails.send({
        from,
        to: [to],
        replyTo,
        subject,
        html,
        scheduledAt,
      })
    )
  );

  results.forEach((result, i) => {
    const { label } = emails[i];
    if (result.status === 'fulfilled') {
      if (result.value.error) {
        console.error(`[Onboarding Emails] ${label} Resend error for ${to}:`, result.value.error);
      } else {
        console.log(`[Onboarding Emails] ${label} scheduled for ${to}, Resend ID: ${result.value.data?.id}`);
      }
    } else {
      console.error(`[Onboarding Emails] ${label} exception for ${to}:`, result.reason);
    }
  });
}
