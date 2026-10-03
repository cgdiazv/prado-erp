'use client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export interface PushStatus {
  isSupported: boolean;
  isIos: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushNotificationSupported()) {
    return {
      isSupported: false,
      isIos: isIosDevice(),
      isStandalone: isStandalonePwa(),
      permission: 'unsupported',
      isSubscribed: false,
    };
  }

  const isIos = isIosDevice();
  const isStandalone = isStandalonePwa();
  const permission = Notification.permission;

  let isSubscribed = false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      isSubscribed = !!subscription;
    }
  } catch (err) {
    console.warn('[PushClient] Error checking subscription:', err);
  }

  return {
    isSupported: true,
    isIos,
    isStandalone,
    permission,
    isSubscribed,
  };
}

export async function subscribeToPush(organizationId?: string | null): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  const isIos = isIosDevice();
  const isStandalone = isStandalonePwa();

  // On iOS, push notifications are strictly available only when added to the Home Screen
  if (isIos && !isStandalone) {
    return {
      success: false,
      error: 'On iOS, you must add the Prado app to your Home Screen first to enable push notifications.',
    };
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    // 2. Ensure Service Worker is registered and ready
    let registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js');
    }
    await navigator.serviceWorker.ready;

    // 3. Get VAPID public key
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return { success: false, error: 'VAPID public key is missing on the client.' };
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    // 4. Subscribe with PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'Incomplete push subscription generated.' };
    }

    // 5. Send subscription to server
    const res = await fetch('/api/notifications/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        organizationId: organizationId || null,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Failed to save subscription to server.' };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PushClient] Subscription error:', err);
    return { success: false, error: message };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch('/api/notifications/push-subscription', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PushClient] Unsubscribe error:', err);
    return { success: false, error: message };
  }
}
