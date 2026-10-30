'use client';

import { useState } from 'react';
import ServicesPanel from './ServicesPanel';
import TrucksPanel from './TrucksPanel';
import ExpenseCategoriesPanel from './ExpenseCategoriesPanel';
import { getTranslations } from '@/lib/translations';

type Service = {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  is_recurring_default: boolean | null;
  recurrence_interval_days: number | null;
  auto_charge_default: boolean | null;
};

type TruckItem = {
  id: string;
  name: string;
  plate_number: string | null;
  is_active: boolean | null;
  status: string | null;
};

export type OperationsTabId = 'services' | 'vehicles' | 'expense-categories';

interface OperationsSettingsTabsProps {
  services: Service[];
  trucks: TruckItem[];
  locale?: string;
  isIndividualAccount?: boolean;
  initialTab?: string;
}

export default function OperationsSettingsTabs({
  services,
  trucks,
  locale = 'en',
  isIndividualAccount = false,
  initialTab,
}: OperationsSettingsTabsProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');

  const normalizeInitialTab = (tab?: string): OperationsTabId => {
    if (tab === 'vehicles' && !isIndividualAccount) return 'vehicles';
    if (tab === 'expense-categories' && !isIndividualAccount) return 'expense-categories';
    return 'services';
  };

  const [activeTab, setActiveTab] = useState<OperationsTabId>(() => normalizeInitialTab(initialTab));

  const handleTabChange = (tabId: OperationsTabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'services') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const tabs: Array<{ id: OperationsTabId; label: string }> = [
    {
      id: 'services',
      label: translations.dashboard.servicesSection || (isEs ? 'Servicios' : 'Services'),
    },
    ...(!isIndividualAccount
      ? [
          {
            id: 'vehicles' as OperationsTabId,
            label: translations.dashboard.trucksSection || (isEs ? 'Vehículos' : 'Vehicles'),
          },
          {
            id: 'expense-categories' as OperationsTabId,
            label:
              translations.dashboard.expenseCategoriesSection ||
              (isEs ? 'Categorías de gastos' : 'Expense Categories'),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 min-w-0">
      {/* Horizontal Sub-tabs */}
      <div className="border-b border-slate-200">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={isEs ? 'Pestañas de operaciones' : 'Operations sub-tabs'}
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

      {/* Active Tab Content Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div
          id="tabpanel-services"
          role="tabpanel"
          aria-labelledby="tab-services"
          className={activeTab === 'services' ? 'block' : 'hidden'}
        >
          <ServicesPanel initialServices={services} locale={locale} />
        </div>

        {!isIndividualAccount && (
          <div
            id="tabpanel-vehicles"
            role="tabpanel"
            aria-labelledby="tab-vehicles"
            className={activeTab === 'vehicles' ? 'block' : 'hidden'}
          >
            <TrucksPanel initialTrucks={trucks} locale={locale} />
          </div>
        )}

        {!isIndividualAccount && (
          <div
            id="tabpanel-expense-categories"
            role="tabpanel"
            aria-labelledby="tab-expense-categories"
            className={activeTab === 'expense-categories' ? 'block' : 'hidden'}
          >
            <ExpenseCategoriesPanel locale={locale} />
          </div>
        )}
      </div>
    </div>
  );
}
