import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabaseAdmin';

// Initialize VAPID details if configured
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@pradojob.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error('[WebPush] Error setting VAPID details:', err);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  badgeCount?: number;
  tag?: string;
}

export interface CreateNotificationParams {
  userId: string;
  organizationId?: string | null;
  title: string;
  body: string;
  type?: 'job' | 'quote' | 'invoice' | 'customer' | 'system' | 'general';
  linkUrl?: string;
}

/**
 * Sends a Web Push notification to all active devices subscribed by the given user.
 * Prunes expired or invalidated subscriptions automatically (404/410).
 */
export async function sendPushToUser(userId: string, payload: PushNotificationPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[WebPush] VAPID keys not configured, skipping push notification.');
    return { success: false, sentCount: 0, reason: 'missing_keys' };
  }

  const supabase = createAdminClient();

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return { success: true, sentCount: 0, reason: 'no_subscriptions' };
  }

  const stringPayload = JSON.stringify(payload);
  let sentCount = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          stringPayload,
          {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: 'high',
          }
        );
        sentCount++;
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        // If subscription is expired or unsubscribed, queue for deletion
        if (error.statusCode === 404 || error.statusCode === 410) {
          expiredIds.push(sub.id);
        } else {
          console.error('[WebPush] Failed sending push notification to endpoint:', err);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds);
  }

  return { success: true, sentCount };
}

/**
 * Unified helper:
 * 1. Creates an in-app notification row in Supabase 'notifications' table (which triggers Supabase Realtime for active tabs/bell icon).
 * 2. Simultaneously pushes to the user's home screen / device notification tray via Web Push.
 */
export async function createNotificationAndSendPush({
  userId,
  organizationId,
  title,
  body,
  type = 'general',
  linkUrl = '/dashboard',
}: CreateNotificationParams) {
  const supabase = createAdminClient();

  // 1. Insert notification record for the in-app bell navbar center
  const { data: insertedNotification, error: insertError } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      organization_id: organizationId || null,
      title,
      body,
      type,
      link_url: linkUrl,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[WebPush] Error inserting notification:', insertError);
  }

  // 2. Count current unread notifications for badge API
  let unreadCount = 1;
  try {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (typeof count === 'number') {
      unreadCount = count;
    }
  } catch {
    // Keep fallback unreadCount
  }

  // 3. Send Web Push to home screen devices
  const pushResult = await sendPushToUser(userId, {
    title,
    body,
    url: linkUrl,
    badgeCount: unreadCount,
    tag: `prado-${type}`,
  });

  return {
    notification: insertedNotification,
    pushResult,
  };
}
