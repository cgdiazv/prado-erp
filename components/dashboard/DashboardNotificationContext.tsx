'use client';

import { createContext, useContext } from 'react';

interface AccountingWarningItem {
  source: 'qbo' | 'xero';
  message: string;
}

interface DashboardNotificationContextValue {
  hasIncompleteProfile: boolean;
  hasIncompleteOrgProfile: boolean;
  accountingWarnings: AccountingWarningItem[];
}

const DashboardNotificationContext = createContext<DashboardNotificationContextValue>({
  hasIncompleteProfile: false,
  hasIncompleteOrgProfile: false,
  accountingWarnings: [],
});

export function DashboardNotificationProvider({
  children,
  hasIncompleteProfile,
  hasIncompleteOrgProfile,
  accountingWarnings,
}: {
  children: React.ReactNode;
  hasIncompleteProfile: boolean;
  hasIncompleteOrgProfile: boolean;
  accountingWarnings: AccountingWarningItem[];
}) {
  return (
    <DashboardNotificationContext.Provider value={{ hasIncompleteProfile, hasIncompleteOrgProfile, accountingWarnings }}>
      {children}
    </DashboardNotificationContext.Provider>
  );
}

export function useDashboardNotifications() {
  return useContext(DashboardNotificationContext);
}
