import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, p256dh, auth, organizationId, userAgent } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Missing subscription parameters (endpoint, p256dh, auth)' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const sanitizedOrgId =
      typeof organizationId === 'string' && organizationId.trim().length > 0
        ? organizationId.trim()
        : null;

    // Upsert subscription for this user & endpoint
    const { error: upsertError } = await admin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          organization_id: sanitizedOrgId,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (upsertError) {
      console.error('[PushSubscription] Error upserting subscription:', upsertError);
      return NextResponse.json(
        { error: upsertError.message || 'Failed to save subscription in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[PushSubscription] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const body = await req.json().catch(() => ({}));
    const { endpoint } = body;

    const admin = createAdminClient();

    if (endpoint) {
      await admin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);
    } else {
      // If no specific endpoint provided, clear all subscriptions for this user
      await admin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[PushSubscription DELETE] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
