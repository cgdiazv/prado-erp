'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getPushStatus,
  subscribeToPush as clientSubscribeToPush,
  unsubscribeFromPush as clientUnsubscribeFromPush,
  PushStatus,
} from '@/lib/pushClient';

export interface AppNotification {
  id: string;
  user_id: string;
  organization_id?: string | null;
  title: string;
  body: string;
  type: 'job' | 'quote' | 'invoice' | 'customer' | 'system' | 'general';
  link_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

interface AccountingWarningItem {
  source: 'qbo' | 'xero';
  message: string;
}

interface DashboardNotificationContextValue {
  hasIncompleteProfile: boolean;
  hasIncompleteOrgProfile: boolean;
  accountingWarnings: AccountingWarningItem[];
  dbNotifications: AppNotification[];
  totalUnreadCount: number;
  isLoading: boolean;
  pushStatus: PushStatus;
  markAsRead: (id: string | 'all') => Promise<void>;
  deleteNotification: (id: string | 'all') => Promise<void>;
  enablePushNotifications: () => Promise<{ success: boolean; error?: string }>;
  disablePushNotifications: () => Promise<{ success: boolean; error?: string }>;
  triggerTestNotification: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const defaultPushStatus: PushStatus = {
  isSupported: false,
  isIos: false,
  isStandalone: false,
  permission: 'unsupported',
  isSubscribed: false,
};

const DashboardNotificationContext = createContext<DashboardNotificationContextValue>({
  hasIncompleteProfile: false,
  hasIncompleteOrgProfile: false,
  accountingWarnings: [],
  dbNotifications: [],
  totalUnreadCount: 0,
  isLoading: false,
  pushStatus: defaultPushStatus,
  markAsRead: async () => {},
  deleteNotification: async () => {},
  enablePushNotifications: async () => ({ success: false }),
  disablePushNotifications: async () => ({ success: false }),
  triggerTestNotification: async () => {},
  refreshNotifications: async () => {},
});

export function DashboardNotificationProvider({
  children,
  userId,
  organizationId,
  hasIncompleteProfile,
  hasIncompleteOrgProfile,
  accountingWarnings,
}: {
  children: React.ReactNode;
  userId?: string;
  organizationId?: string;
  hasIncompleteProfile: boolean;
  hasIncompleteOrgProfile: boolean;
  accountingWarnings: AccountingWarningItem[];
}) {
  const [dbNotifications, setDbNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>(defaultPushStatus);

  // Check Web Push status
  useEffect(() => {
    let isMounted = true;
    getPushStatus().then((status) => {
      if (isMounted) setPushStatus(status);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setDbNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn('[DashboardNotificationContext] Failed to fetch notifications:', err);
    }
  }, [userId]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    fetch('/api/notifications')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (isMounted && data) {
          setDbNotifications(data.notifications || []);
        }
      })
      .catch((err) => {
        console.warn('[DashboardNotificationContext] Failed to fetch notifications:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Listen to real-time changes via Supabase Realtime
    const channel = supabase
      .channel(`notifications-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, refreshNotifications]);

  const markAsRead = useCallback(
    async (id: string | 'all') => {
      // Optimistic update
      setDbNotifications((prev) =>
        prev.map((n) => {
          if (id === 'all' || n.id === id) {
            return { ...n, read_at: n.read_at || new Date().toISOString() };
          }
          return n;
        })
      );

      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      } catch (err) {
        console.warn('[DashboardNotificationContext] Error marking as read:', err);
      }
    },
    []
  );

  const deleteNotification = useCallback(
    async (id: string | 'all') => {
      // Optimistic update
      setDbNotifications((prev) =>
        id === 'all' ? [] : prev.filter((n) => n.id !== id)
      );

      try {
        await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('[DashboardNotificationContext] Error deleting notification:', err);
      }
    },
    []
  );

  const enablePushNotifications = useCallback(async () => {
    const res = await clientSubscribeToPush(organizationId);
    const updatedStatus = await getPushStatus();
    setPushStatus(updatedStatus);
    return res;
  }, [organizationId]);

  const disablePushNotifications = useCallback(async () => {
    const res = await clientUnsubscribeFromPush();
    const updatedStatus = await getPushStatus();
    setPushStatus(updatedStatus);
    return res;
  }, []);

  const triggerTestNotification = useCallback(async () => {
    try {
      await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Job Update: Prado Dispatch',
          body: 'A Job status was updated. Tap to view the details.',
          type: 'job',
          linkUrl: '/dashboard/jobs',
        }),
      });
      await refreshNotifications();
    } catch (err) {
      console.warn('[DashboardNotificationContext] Test push error:', err);
    }
  }, [refreshNotifications]);

  // Calculate unread items
  const unreadDbCount = dbNotifications.filter((n) => !n.read_at).length;
  const staticWarningsCount =
    (hasIncompleteProfile ? 1 : 0) +
    (hasIncompleteOrgProfile ? 1 : 0) +
    accountingWarnings.length;
  const totalUnreadCount = unreadDbCount + staticWarningsCount;

  // Sync with App Badging API on supported devices / PWAs
  useEffect(() => {
    if (typeof window !== 'undefined' && 'setAppBadge' in navigator) {
      try {
        if (totalUnreadCount > 0) {
          navigator.setAppBadge(totalUnreadCount);
        } else if ('clearAppBadge' in navigator) {
          navigator.clearAppBadge();
        }
      } catch {
        // Ignore badging API browser discrepancies
      }
    }
  }, [totalUnreadCount]);

  return (
    <DashboardNotificationContext.Provider
      value={{
        hasIncompleteProfile,
        hasIncompleteOrgProfile,
        accountingWarnings,
        dbNotifications,
        totalUnreadCount,
        isLoading,
        pushStatus,
        markAsRead,
        deleteNotification,
        enablePushNotifications,
        disablePushNotifications,
        triggerTestNotification,
        refreshNotifications,
      }}
    >
      {children}
    </DashboardNotificationContext.Provider>
  );
}

export function useDashboardNotifications() {
  return useContext(DashboardNotificationContext);
}
