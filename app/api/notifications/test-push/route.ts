import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
import { createNotificationAndSendPush } from '@/lib/webPush';

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

    const { organization: org } = await getUserOrganization(user.id);

    const body = await req.json().catch(() => ({}));
    const title = body.title || 'Job Scheduled: Lawn Maintenance';
    const message = body.body || 'A new Job has been assigned and scheduled for today at 2:00 PM.';
    const type = body.type || 'job';
    const linkUrl = body.linkUrl || '/dashboard/jobs';

    const result = await createNotificationAndSendPush({
      userId: user.id,
      organizationId: org?.id ?? null,
      title,
      body: message,
      type,
      linkUrl,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    console.error('[Notifications Test Push] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
