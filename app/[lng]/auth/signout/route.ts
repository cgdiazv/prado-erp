import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

async function handleSignOut(request: Request) {
  const supabase = await createClient();

  // 1. Terminate the user session securely on Supabase auth service
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.auth.signOut();
  }

  // 2. Clear out auth tokens and force redirect cleanly to root login path
  const requestUrl = new URL(request.url);
  const [, lng] = requestUrl.pathname.split('/');
  const safeLng = lng || 'en';

  return NextResponse.redirect(`${requestUrl.origin}/${safeLng}/login`, {
    status: 303, // See Other status forces a clean GET request on redirect
  });
}

export async function GET(request: Request) {
  return handleSignOut(request);
}

export async function POST(request: Request) {
  return handleSignOut(request);
}