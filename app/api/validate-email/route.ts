import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { findAuthUserIndexByEmail, normalizeAuthEmail } from '@/lib/userAuthIndex';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email || !email.includes('@')) {
    return NextResponse.json({ available: true });
  }

  // Initialize the admin client for auth lookups via the supported Admin API.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    const { data, error } = await findAuthUserIndexByEmail(supabaseAdmin, normalizeAuthEmail(email));

    if (error) {
      // Fallback gracefully to let registration proceed if the database check hits an issue
      return NextResponse.json({ available: true });
    }

    // If data comes back with a record, it means the email is already claimed
    return NextResponse.json({ available: !data });
  } catch (err) {
    return NextResponse.json({ available: true });
  }
}