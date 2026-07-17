import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';

const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');
  const error = searchParams.get('error');

  if (error || !code || !realmId) {
    return NextResponse.redirect(new URL('/dashboard/settings/integrations?qbo=error', request.url));
  }

  const clientId = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_QBO_REDIRECT_URI;

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch(QBO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for QBO tokens');
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // 2. Fetch company name from QBO
    const baseUrl = process.env.QBO_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    let companyName: string | null = null;
    try {
      const companyRes = await fetch(
        `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json',
          },
        }
      );
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        companyName = companyData?.CompanyInfo?.CompanyName ?? null;
      }
    } catch {
      // Company name is optional — continue without it
    }

    // 3. Get authenticated user and organization
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Prado user not authenticated');

    const supabaseAdmin = createAdminClient();
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) throw new Error('Organization not found');

    // 4. Upsert connection record
    const { error: upsertError } = await supabaseAdmin
      .from('qbo_connections')
      .upsert(
        {
          organization_id: org.id,
          realm_id: realmId,
          company_name: companyName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      );

    if (upsertError) throw upsertError;

    return NextResponse.redirect(new URL('/dashboard/settings/integrations?qbo=success', request.url));
  } catch (err: any) {
    console.error('QBO OAuth Callback Error:', err);
    return new NextResponse(`QBO Callback Error: ${err.message || err}`, { status: 500 });
  }
}
