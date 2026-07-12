import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Terminate the user session securely on Supabase auth service
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.auth.signOut();
  }

  // 2. Clear out auth tokens and force redirect cleanly to root login path
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    status: 303, // See Other status forces a clean GET request on redirect
  });
}