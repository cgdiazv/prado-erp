'use client';

import { useState, type ReactNode } from 'react';

type DocumentSettingsTabId = 'billing-defaults' | 'labor-markups' | 'docs-emails';

interface DocumentSettingsTabsProps {
  billingDefaults: ReactNode;
  laborMarkups: ReactNode;
  docsEmails: ReactNode;
  locale?: string;
  initialTab?: string;
}

export default function DocumentSettingsTabs({
  billingDefaults,
  laborMarkups,
  docsEmails,
  locale = 'en',
  initialTab,
}: DocumentSettingsTabsProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const initialTabId: DocumentSettingsTabId =
    initialTab === 'labor-markups' || initialTab === 'docs-emails' ? initialTab : 'billing-defaults';
  const [activeTab, setActiveTab] = useState<DocumentSettingsTabId>(initialTabId);

  const handleTabChange = (tabId: DocumentSettingsTabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    if (tabId === 'billing-defaults') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tabId);
    }
    window.history.replaceState(null, '', url.pathname + url.search);
  };

  const tabs: Array<{ id: DocumentSettingsTabId; label: string }> = [
    { id: 'billing-defaults', label: isEs ? 'Preferencias de facturación' : 'Billing Defaults' },
    { id: 'labor-markups', label: isEs ? 'Mano de obra y márgenes' : 'Labor & Markups' },
    { id: 'docs-emails', label: isEs ? 'Documentos y correos' : 'Docs & Emails' },
  ];

  return (
    <div className="space-y-4 min-w-0">
      <div className="border-b border-slate-200">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={isEs ? 'Pestañas de documentos y correos' : 'Documents and emails tabs'}
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

      <div
        id="tabpanel-billing-defaults"
        role="tabpanel"
        aria-labelledby="tab-billing-defaults"
        className={activeTab === 'billing-defaults' ? 'block' : 'hidden'}
      >
        {billingDefaults}
      </div>
      <div
        id="tabpanel-labor-markups"
        role="tabpanel"
        aria-labelledby="tab-labor-markups"
        className={activeTab === 'labor-markups' ? 'block' : 'hidden'}
      >
        {laborMarkups}
      </div>
      <div
        id="tabpanel-docs-emails"
        role="tabpanel"
        aria-labelledby="tab-docs-emails"
        className={activeTab === 'docs-emails' ? 'block' : 'hidden'}
      >
        {docsEmails}
      </div>
    </div>
  );
}
