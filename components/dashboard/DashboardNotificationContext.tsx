'use client';

import { createContext, useContext } from 'react';

interface DashboardNotificationContextValue {
  hasIncompleteProfile: boolean;
}

const DashboardNotificationContext = createContext<DashboardNotificationContextValue>({
  hasIncompleteProfile: false,
});

export function DashboardNotificationProvider({
  children,
  hasIncompleteProfile,
}: {
  children: React.ReactNode;
  hasIncompleteProfile: boolean;
}) {
  return (
    <DashboardNotificationContext.Provider value={{ hasIncompleteProfile }}>
      {children}
    </DashboardNotificationContext.Provider>
  );
}

export function useDashboardNotifications() {
  return useContext(DashboardNotificationContext);
}
