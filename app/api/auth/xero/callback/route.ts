import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard/settings?xero=error', request.url));
  }

  const clientId = process.env.NEXT_PUBLIC_XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_XERO_REDIRECT_URI;

  try {
    // 1. Intercambiar código por tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Error al intercambiar el token con Xero');
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // 2. Obtener el Tenant ID
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!connectionsResponse.ok) {
      throw new Error('Error al obtener las conexiones de Xero');
    }

    const connections = await connectionsResponse.json();
    const activeConnection = connections[0]; 
    if (!activeConnection) {
      throw new Error('No se encontró ninguna organización activa en Xero');
    }

    const tenantId = activeConnection.tenantId;
    const tenantName = activeConnection.tenantName;

    // 3. Inicializar cliente autenticado para leer la sesion del usuario
    const supabase = await createClient();

    // Cliente administrador para evitar recursion de RLS en organization_users/organizations
    const supabaseAdmin = createAdminClient();

    // Obtener el usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario de Prado no autenticado');
    }

    // Buscar la organización activa del usuario
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      throw new Error('No se encontró la organización del usuario en Prado');
    }

    // 4. Guardar en la base de datos
    const { error: upsertError } = await supabaseAdmin
      .from('xero_connections')
      .upsert({
        organization_id: org.id,
        xero_tenant_id: tenantId,
        xero_tenant_name: tenantName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id'
      });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.redirect(new URL('/dashboard/settings?xero=success', request.url));

  } catch (err: any) {
    console.error('Xero OAuth Callback Error:', err);
    // Devuelve el error real en texto para saber exactamente que fallo
    return new NextResponse(`Error en el Callback de Xero: ${err.message || err}`, { status: 500 });
  }
}