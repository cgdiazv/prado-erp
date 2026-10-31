'use client';

import { useState } from 'react';
import CustomerDetailsForm from '@/components/dashboard/CustomerDetailsForm';
import ServiceSitesSection from '@/components/dashboard/ServiceSitesSection';
import CustomerJobLogTable from '@/components/dashboard/CustomerJobLogTable';
import CustomerInvoicesTable from '@/components/dashboard/CustomerInvoicesTable';
import DeleteCustomerModal from '@/components/dashboard/DeleteCustomerModal';

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
      label: isEs ? 'Detalles del Cliente' : 'Customer Details',
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

  const customerDisplayName =
    `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
    customer?.company_name ||
    'Customer';

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
        {/* Tab 1: Customer Details */}
        <div className={activeTab === 'client-details' ? 'block space-y-6' : 'hidden'}>
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

          <div className="pt-2 flex justify-start">
            <DeleteCustomerModal
              customerId={customerId}
              customerName={customerDisplayName}
              locale={locale}
              triggerClassName="w-full sm:w-auto justify-center bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold py-2 px-4 rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
              customerName={customerDisplayName}
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
