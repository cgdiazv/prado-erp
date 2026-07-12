import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, companyName } = await request.json();

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Register user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Signup failed.' }, { status: 400 });
    }

    // 2. Create organization
    const { error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: companyName, owner_id: authData.user.id }]);

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || 'Server Error' }, { status: 500 });
  }
}