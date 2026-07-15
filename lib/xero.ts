import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getValidXeroToken(organizationId: string) {
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

  // 1. Obtener la conexión actual desde Supabase
  const { data: connection, error } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error || !connection) {
    throw new Error('La organización no está conectada a Xero.');
  }

  const now = new Date();
  const expiresAt = new Date(connection.expires_at);

  // 2. Si el token sigue siendo válido (con un margen de 1 minuto), lo devolvemos
  if (expiresAt.getTime() - now.getTime() > 60000) {
    return {
      accessToken: connection.access_token,
      tenantId: connection.xero_tenant_id,
    };
  }

  // 3. Si expiró, usamos el refresh_token para pedir uno nuevo a Xero
  console.log('El token de Xero ha expirado. Refrescando...');
  
  const clientId = process.env.NEXT_PUBLIC_XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error('No se pudo refrescar el token de Xero. Es posible que el usuario deba reconectarse.');
  }

  const newTokens = await response.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // 4. Actualizar los nuevos tokens en Supabase
  await supabase
    .from('xero_connections')
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);

  return {
    accessToken: newTokens.access_token,
    tenantId: connection.xero_tenant_id,
  };
}