import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_QBO_REDIRECT_URI;

  const scopes = [
    'com.intuit.quickbooks.accounting',
  ].join(' ');

  const state = 'prado_qbo_state';

  const qboAuthUrl =
    `https://appcenter.intuit.com/connect/oauth2?` +
    `response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}`;

  return NextResponse.redirect(qboAuthUrl);
}
