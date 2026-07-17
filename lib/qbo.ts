import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

function getBaseUrl() {
  return process.env.QBO_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

export function getQBOBaseUrl() {
  return getBaseUrl();
}

export async function getValidQBOToken(organizationId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const { data: connection, error } = await supabase
    .from('qbo_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error || !connection) {
    throw new Error('Organization is not connected to QuickBooks Online.');
  }

  const now = new Date();
  const expiresAt = new Date(connection.expires_at);

  // Return existing token if still valid (with 1 min buffer)
  if (expiresAt.getTime() - now.getTime() > 60000) {
    return {
      accessToken: connection.access_token,
      realmId: connection.realm_id,
    };
  }

  // Refresh the token
  const clientId = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;

  const response = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh QBO token. The user may need to reconnect.');
  }

  const newTokens = await response.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  await supabase
    .from('qbo_connections')
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);

  return {
    accessToken: newTokens.access_token,
    realmId: connection.realm_id,
  };
}
