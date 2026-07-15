import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabaseServer';

type LeadPayload = {
  name?: string;
  email?: string;
  company?: string;
  locale?: string;
  source?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toAbsoluteUrl(url: string, baseUrl: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return new URL(url, baseUrl).toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadPayload;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const company = body.company?.trim();
    const locale = body.locale?.trim() || 'en';
    const normalizedLocale = locale.toLowerCase().startsWith('es') ? 'es' : 'en';
    const source = body.source?.trim() || 'pricing-manual-banner';

    if (!name || !email || !company) {
      return NextResponse.json({ error: 'Name, email, and company are required.' }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const defaultGuideUrl =
      normalizedLocale === 'es'
        ? '/prado_guia_operativa_website.pdf'
        : '/prado_operational_guide_website_en.pdf';

    const localeConfiguredGuideUrl =
      normalizedLocale === 'es'
        ? process.env.MANUAL_GUIDE_URL_ES || process.env.NEXT_PUBLIC_MANUAL_GUIDE_URL_ES
        : process.env.MANUAL_GUIDE_URL_EN || process.env.NEXT_PUBLIC_MANUAL_GUIDE_URL_EN;

    const genericConfiguredGuideUrl = process.env.MANUAL_GUIDE_URL || process.env.NEXT_PUBLIC_MANUAL_GUIDE_URL;
    const siteBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://pradojob.com';
    const resolvedGuideUrl = localeConfiguredGuideUrl || genericConfiguredGuideUrl || defaultGuideUrl;
    const absoluteGuideUrl = toAbsoluteUrl(resolvedGuideUrl, siteBaseUrl);

    // Persist to Supabase when service credentials are available.
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createAdminClient();
      const { error: insertError } = await supabaseAdmin
        .from('manual_download_leads')
        .insert([
          {
            full_name: name,
            email,
            company_name: company,
            locale,
            source,
          },
        ]);

      if (insertError) {
        console.warn('Lead capture insert failed (manual_download_leads):', insertError.message);
      }
    }

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailSubject =
        normalizedLocale === 'es'
          ? 'Tu Guia Operativa Completa de Prado'
          : 'Your Complete Prado User Guide';

      const emailHeading =
        normalizedLocale === 'es'
          ? 'Tu guia ya esta lista'
          : 'Your guide is ready';

      const emailBody =
        normalizedLocale === 'es'
          ? 'Gracias por tu interes en Prado. Haz clic en el siguiente enlace para acceder a la guia completa.'
          : 'Thanks for your interest in Prado. Click the link below to access the complete user guide.';

      const emailCta = normalizedLocale === 'es' ? 'Abrir guia completa' : 'Open complete guide';

      await resend.emails.send({
        from: 'notifications@indevasa.com',
        to: email,
        subject: emailSubject,
        html: `
          <h2>${emailHeading}</h2>
          <p>${emailBody}</p>
          <p><a href="${absoluteGuideUrl}" target="_blank" rel="noopener noreferrer">${emailCta}</a></p>
        `,
      });

      await resend.emails.send({
        from: 'notifications@indevasa.com',
        to: process.env.ADMIN_ALERT_EMAIL || 'info@pradojob.com',
        subject: 'Nuevo lead - Descarga de Guia Operativa Prado',
        html: `
          <h2>Nuevo lead de guia operativa</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Empresa:</strong> ${company}</p>
          <p><strong>Locale:</strong> ${locale}</p>
          <p><strong>Fuente:</strong> ${source}</p>
          <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        `,
      });
    } else {
      return NextResponse.json({ error: 'Email delivery is not configured yet.' }, { status: 503 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}