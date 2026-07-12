import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email || !email.includes('@')) {
    return NextResponse.json({ available: true });
  }

  // Initialize the admin client targeting the protected 'auth' schema explicitly
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'auth' }, // ← Switches PostgREST focus to the internal auth schema
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Now you can cleanly query the internal 'users' table just like a normal table
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

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