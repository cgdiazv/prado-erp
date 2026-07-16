import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, companyName } = await request.json();

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. Register user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Signup failed.' }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Create their own organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: companyName, owner_id: userId, auto_optimize_drive_routes: false }])
      .select('id')
      .single();

    if (orgError || !orgData) {
      return NextResponse.json({ error: orgError?.message || 'Failed to create organization.' }, { status: 400 });
    }

    // 3. Check for pending invitations and add user to those organizations
    const { data: pendingInvites } = await supabase
      .from('organization_invitations')
      .select('organization_id, role')
      .eq('email', email)
      .is('accepted_at', null);

    if (pendingInvites && pendingInvites.length > 0) {
      // Add user to each organization they were invited to
      const orgUserInserts = pendingInvites.map(invite => ({
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role,
      }));

      await supabase
        .from('organization_users')
        .insert(orgUserInserts);

      // Mark invitations as accepted
      await supabase
        .from('organization_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('email', email)
        .is('accepted_at', null);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || 'Server Error' }, { status: 500 });
  }
}