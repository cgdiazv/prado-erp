'use client';

import { createContext, useContext } from 'react';

interface DashboardNotificationContextValue {
  hasIncompleteProfile: boolean;
  hasIncompleteOrgProfile: boolean;
}

const DashboardNotificationContext = createContext<DashboardNotificationContextValue>({
  hasIncompleteProfile: false,
  hasIncompleteOrgProfile: false,
});

export function DashboardNotificationProvider({
  children,
  hasIncompleteProfile,
  hasIncompleteOrgProfile,
}: {
  children: React.ReactNode;
  hasIncompleteProfile: boolean;
  hasIncompleteOrgProfile: boolean;
}) {
  return (
    <DashboardNotificationContext.Provider value={{ hasIncompleteProfile, hasIncompleteOrgProfile }}>
      {children}
    </DashboardNotificationContext.Provider>
  );
}

export function useDashboardNotifications() {
  return useContext(DashboardNotificationContext);
}
