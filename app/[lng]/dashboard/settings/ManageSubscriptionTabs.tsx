'use client';

import { useState, type ReactNode } from 'react';

export type ManageSubscriptionTabId = 'billing' | 'referrals' | 'cancel';

interface ManageSubscriptionTabsProps {
  billingPanel: ReactNode;
  referralsPanel: ReactNode;
  cancelPanel: ReactNode;
  locale?: string;
  initialTab?: string;
}

export default function ManageSubscriptionTabs({
  billingPanel,
  referralsPanel,
  cancelPanel,
  locale = 'en',
  initialTab,
}: ManageSubscriptionTabsProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const normalizeInitialTab = (tab?: string): ManageSubscriptionTabId => {
    if (tab === 'referrals' || tab === 'referral') return 'referrals';
    if (
      tab === 'cancel' ||
      tab === 'cancellation' ||
      tab === 'delete-account' ||
      tab === 'delete'
    ) {
      return 'cancel';
    }
    return 'billing';
  };

  const [activeTab, setActiveTab] = useState<ManageSubscriptionTabId>(() =>
    normalizeInitialTab(initialTab)
  );

  const handleTabChange = (tabId: ManageSubscriptionTabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'billing') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const tabs: Array<{ id: ManageSubscriptionTabId; label: string }> = [
    {
      id: 'billing',
      label: isEs ? 'Facturación y Facturas' : 'Billing & Invoices',
    },
    {
      id: 'referrals',
      label: isEs ? 'Programa de Referidos' : 'Referral Program',
    },
    {
      id: 'cancel',
      label: isEs ? 'Cancelar Suscripción' : 'Cancel Subscription',
    },
  ];

  return (
    <div className="min-w-0">
      {/* Horizontal Sub-tabs */}
      <div className="px-4">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar relative z-10"
          role="tablist"
          aria-label={isEs ? 'Pestañas de suscripción' : 'Manage subscription tabs'}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={`whitespace-nowrap pb-3 pt-1 px-1 text-sm transition-all border-b-[3px] cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Panels */}
      <div
        id="tabpanel-billing"
        role="tabpanel"
        aria-labelledby="tab-billing"
        className={activeTab === 'billing' ? 'block' : 'hidden'}
      >
        {billingPanel}
      </div>

      <div
        id="tabpanel-referrals"
        role="tabpanel"
        aria-labelledby="tab-referrals"
        className={activeTab === 'referrals' ? 'block' : 'hidden'}
      >
        {referralsPanel}
      </div>

      <div
        id="tabpanel-cancel"
        role="tabpanel"
        aria-labelledby="tab-cancel"
        className={activeTab === 'cancel' ? 'block' : 'hidden'}
      >
        {cancelPanel}
      </div>
    </div>
  );
}
