'use client';

import { useState } from 'react';
import CustomerDetailsForm from '@/components/dashboard/CustomerDetailsForm';
import ServiceSitesSection from '@/components/dashboard/ServiceSitesSection';
import CustomerJobLogTable from '@/components/dashboard/CustomerJobLogTable';
import CustomerInvoicesTable from '@/components/dashboard/CustomerInvoicesTable';

export type CustomerTabId = 'client-details' | 'jobs-log' | 'invoice';

interface Property {
  id: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  service_notes?: string | null;
}

interface CustomerDetailTabsProps {
  customerId: string;
  locale?: string;
  initialTab?: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    billing_address?: string | null;
  };
  properties: Property[];
  customerJobs: any[];
  invoices: any[];
  orgTaxRatePercent?: number;
}

export default function CustomerDetailTabs({
  customerId,
  locale = 'en',
  initialTab,
  customer,
  properties,
  customerJobs,
  invoices,
  orgTaxRatePercent = 0,
}: CustomerDetailTabsProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const normalizeInitialTab = (tab?: string): CustomerTabId => {
    if (tab === 'jobs-log' || tab === 'jobs') return 'jobs-log';
    if (tab === 'invoice' || tab === 'invoices') return 'invoice';
    return 'client-details';
  };

  const [activeTab, setActiveTab] = useState<CustomerTabId>(() => normalizeInitialTab(initialTab));

  const handleTabChange = (tabId: CustomerTabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'client-details') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const tabs: Array<{ id: CustomerTabId; label: string }> = [
    {
      id: 'client-details',
      label: isEs ? 'Detalles del Cliente' : 'Client Details',
    },
    {
      id: 'jobs-log',
      label: isEs ? 'Registro de Trabajos' : 'Jobs Log',
    },
    {
      id: 'invoice',
      label: isEs ? 'Facturas' : 'Invoice',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Horizontal Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={isEs ? 'Pestañas de cliente' : 'Customer tabs'}
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

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Client Details */}
        <div className={activeTab === 'client-details' ? 'block' : 'hidden'}>
          <div
            id="tabpanel-client-details"
            role="tabpanel"
            aria-labelledby="tab-client-details"
            className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden divide-y divide-slate-200"
          >
            <CustomerDetailsForm
              customerId={customerId}
              locale={locale}
              initialFirstName={customer.first_name}
              initialLastName={customer.last_name}
              initialCompanyName={customer.company_name || ''}
              initialEmail={customer.email || ''}
              initialPhone={customer.phone || ''}
              initialBillingAddress={customer.billing_address || ''}
            />
            <ServiceSitesSection
              customerId={customerId}
              locale={locale}
              properties={properties || []}
            />
          </div>
        </div>

        {/* Tab 2: Jobs Log */}
        <div className={activeTab === 'jobs-log' ? 'block' : 'hidden'}>
          <div
            id="tabpanel-jobs-log"
            role="tabpanel"
            aria-labelledby="tab-jobs-log"
          >
            <CustomerJobLogTable jobs={customerJobs} locale={locale} />
          </div>
        </div>

        {/* Tab 3: Invoice */}
        <div className={activeTab === 'invoice' ? 'block' : 'hidden'}>
          <div
            id="tabpanel-invoice"
            role="tabpanel"
            aria-labelledby="tab-invoice"
          >
            <CustomerInvoicesTable
              invoices={invoices || []}
              customerId={customerId}
              customerName={`${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || customer?.company_name || 'Customer'}
              customerEmail={customer?.email || null}
              locale={locale}
              orgTaxRatePercent={orgTaxRatePercent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
