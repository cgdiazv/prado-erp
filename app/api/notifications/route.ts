import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: notifications, error } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      // If table doesn't exist yet, gracefully return empty array
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const unreadCount = (notifications || []).filter((n) => !n.read_at).length;

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount,
    });
  } catch (err: unknown) {
    console.error('[Notifications GET] Error:', err);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body; // 'all' or specific UUID

    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (id === 'all') {
      await admin
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);
    } else if (typeof id === 'string') {
      await admin
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Notifications PATCH] Error:', err);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const admin = createAdminClient();

    if (id === 'all') {
      await admin.from('notifications').delete().eq('user_id', user.id);
    } else if (id) {
      await admin.from('notifications').delete().eq('id', id).eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Notifications DELETE] Error:', err);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}

