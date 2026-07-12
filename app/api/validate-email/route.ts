import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ available: true });
  }

  const supabase = await createClient();

  // Query your users/organizations profiles table to check for matching emails
  const { data, error } = await supabase
    .from('organizations') // Change table target if your user emails live on a custom profile table
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ available: true });
  }

  // If a record is found, it means the email is already taken
  return NextResponse.json({ available: !data });
}