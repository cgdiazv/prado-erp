import fs from 'node:fs';
import path from 'node:path';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function buildThanksgivingEmailHtml({
  recipientName = 'Valued Partner',
  organizationName = '',
  dashboardUrl = 'https://pradojob.com/en/dashboard',
}) {
  const safeName = (recipientName || 'Valued Partner').trim();
  const safeOrg = (organizationName || '').trim();
  const footerYear = new Date().getFullYear();
  const orgClause = safeOrg
    ? ` and for trusting us to help power <strong>${safeOrg}</strong>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Happy Thanksgiving from Prado</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fdf8f3; margin: 0; padding: 24px 16px; color: #292524;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fed7aa; overflow: hidden; box-shadow: 0 4px 12px -2px rgba(154, 52, 18, 0.08);">
    <div style="background: linear-gradient(135deg, #d97706 0%, #c2410c 55%, #7c2d12 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background: rgba(255, 255, 255, 0.18); color: #fffbeb; font-weight: 700; padding: 5px 14px; border-radius: 20px; font-size: 11px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.06em;">
        🍂 Season of Gratitude
      </div>
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.25;">
        🦃 Happy Thanksgiving!
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.92;">
        Warm wishes from all of us at Prado
      </p>
    </div>

    <div style="padding: 32px 28px;">
      <h2 style="margin: 0 0 16px 0; font-size: 19px; font-weight: 700; color: #431407;">
        Hello ${safeName},
      </h2>

      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #44403c;">
        As we gather with family and friends this Thanksgiving, we wanted to pause and say a heartfelt <strong>thank you</strong> for being part of the Prado community${orgClause}.
      </p>

      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #44403c;">
        We know how much dedication, early mornings, and hard work go into serving your customers every single day. It is a privilege to build tools that help your business quote, schedule jobs, and get paid with less friction.
      </p>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: 10px; padding: 20px 22px; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #b45309;">
          Our Thanksgiving Wish for You
        </h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350f;">
          May your holiday be filled with warmth, great food, and well-deserved rest with the people who matter most. Here is to a joyful holiday season and continued growth in the year ahead!
        </p>
      </div>

      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #57534e;">
        As always, your Prado workspace is running around the clock whenever you need it, and our team is always just a reply away if there is ever anything we can do to support your business.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 28px; background-color: #c2410c; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.01em;">
          Go to Your Prado Dashboard
        </a>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #78716c;">
        With gratitude,<br />
        <strong style="color: #431407;">The Prado Team</strong>
      </p>
    </div>

    <div style="background: #fff7ed; padding: 18px 24px; text-align: center; font-size: 12px; color: #9a3412; border-top: 1px solid #ffedd5;">
      &copy; ${footerYear} Prado Systems. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

async function resolveTenants(supabase) {
  const [{ data: orgs }, { data: profiles }, { data: authUsersRes }] = await Promise.all([
    supabase.from('organizations').select('id, name, owner_id'),
    supabase.from('user_profiles').select('user_id, first_name, last_name'),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileByUserId = new Map();
  for (const p of profiles || []) {
    profileByUserId.set(p.user_id, p);
  }

  const orgByOwnerId = new Map();
  for (const org of orgs || []) {
    if (org.owner_id && !orgByOwnerId.has(org.owner_id)) {
      orgByOwnerId.set(org.owner_id, org);
    }
  }

  const tenantsByEmail = new Map();
  const authUsers = authUsersRes?.users || [];

  for (const u of authUsers) {
    const email = (u.email || '').trim().toLowerCase();
    if (!email) continue;

    const org = orgByOwnerId.get(u.id);
    const prof = profileByUserId.get(u.id);
    const firstName =
      prof?.first_name?.trim() ||
      u.user_metadata?.first_name?.trim() ||
      (u.user_metadata?.full_name || '').split(' ')[0]?.trim() ||
      '';

    if (org || !tenantsByEmail.has(email)) {
      tenantsByEmail.set(email, {
        email,
        recipientName: firstName || 'Valued Partner',
        organizationName: org?.name?.trim() || '',
      });
    }
  }

  return Array.from(tenantsByEmail.values());
}

async function main() {
  const args = process.argv.slice(2);
  const sendAll = args.includes('--all');
  const testIdx = args.indexOf('--test');
  const testEmail =
    testIdx !== -1 && args[testIdx + 1]
      ? args[testIdx + 1].trim().toLowerCase()
      : 'cgdiazv@gmail.com';

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('Missing RESEND_API_KEY in environment.');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase =
    supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

  const tenants = supabase ? await resolveTenants(supabase) : [];
  console.log(`Discovered ${tenants.length} tenant account(s) in database.`);

  const resend = new Resend(resendApiKey);
  const fromEmail = (process.env.RESEND_FROM_EMAIL || 'notifications@pradocommerce.com').trim();
  const fromAddress = `Prado <${fromEmail}>`;
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL || undefined;

  if (!sendAll) {
    const matchedTenant = tenants.find((t) => t.email === testEmail);
    const recipientName = matchedTenant?.recipientName || 'Carlos';
    const organizationName = matchedTenant?.organizationName || 'Indeva Websites';

    const subject = '🦃 Happy Thanksgiving from the Prado Team!';
    const html = buildThanksgivingEmailHtml({
      recipientName,
      organizationName,
    });

    console.log(
      `Sending TEST Thanksgiving email to ${testEmail} (Name: "${recipientName}", Org: "${organizationName}")...`
    );

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: testEmail,
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error('Failed to send test email:', error);
      process.exit(1);
    }

    console.log(`Test email sent successfully to ${testEmail}! Resend ID: ${data?.id}`);
    return;
  }

  console.log(`Broadcasting Thanksgiving email to all ${tenants.length} tenant(s)...`);
  let sentCount = 0;
  for (const tenant of tenants) {
    const html = buildThanksgivingEmailHtml({
      recipientName: tenant.recipientName,
      organizationName: tenant.organizationName,
    });

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: tenant.email,
      subject: '🦃 Happy Thanksgiving from the Prado Team!',
      html,
      replyTo,
    });

    if (error) {
      console.error(`Failed for ${tenant.email}:`, error.message);
    } else {
      sentCount++;
      console.log(`Sent to ${tenant.email} (${tenant.organizationName || 'No Org'}) -> ID: ${data?.id}`);
    }
  }

  console.log(`Completed broadcast: ${sentCount}/${tenants.length} emails sent.`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
