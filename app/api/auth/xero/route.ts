import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_XERO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_XERO_REDIRECT_URI;
  
  // Scopes necesarios para Prado:
  // - openid, profile, email: Para identidad básica del usuario
  // - accounting.contacts: Para leer y crear clientes en Xero
  // - accounting.invoices: Para crear facturas basadas en tus Estimates
  // - offline_access: CRUCIAL. Nos da el refresh_token para sincronizar sin que el usuario esté presente.
  const scopes = [
    'openid',
    'profile',
    'email',
    'accounting.contacts',
    'accounting.invoices',
    'offline_access'
  ].join(' ');

  const xeroAuthUrl = `https://login.xero.com/identity/connect/authorize?` + 
    `response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=prado_auth_state`; // Puedes generar un estado aleatorio aquí para mayor seguridad

  return NextResponse.redirect(xeroAuthUrl);
}