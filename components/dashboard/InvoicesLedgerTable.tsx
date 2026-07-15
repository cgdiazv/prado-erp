'use client';

import { useState } from 'react';
import { markInvoiceAsPaid } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

type FilterType = 'all' | 'unpaid' | 'paid';

interface InvoiceRow {
  id: string;
  customer_id: string;
  due_date: string;
  tax_amount: number;
  total_amount: number;
  status: 'paid' | 'unpaid';
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
}

interface InvoicesLedgerTableProps {
  invoices: InvoiceRow[];
  locale?: string;
}

export default function InvoicesLedgerTable({ invoices, locale = 'en' }: InvoicesLedgerTableProps) {
  const translations = getTranslations(locale);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredInvoices =
    filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unpaid', label: 'Unpaid' },
    { key: 'paid', label: 'Paid' },
  ];

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 ${
              filter === key
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredInvoices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3">{translations.dashboard.customerCrm}</th>
                <th className="px-4 py-3">{translations.dashboard.dueDate}</th>
                <th className="px-4 py-3">{translations.dashboard.taxCharge}</th>
                <th className="px-4 py-3 text-right">{translations.dashboard.totalOwed}</th>
                <th className="px-4 py-3 text-right">{translations.dashboard.paymentStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredInvoices.map((inv) => {
                const customerName =
                  inv.customers?.company_name ||
                  `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`.trim() ||
                  'Customer';

                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-4 py-3 font-medium text-gray-700">{customerName}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{inv.due_date}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">${inv.tax_amount}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 font-medium">${inv.total_amount}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'paid' ? (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md border border-gray-200 shadow-xs select-none">
                          {translations.dashboard.paid}
                        </span>
                      ) : (
                        <form
                          action={markInvoiceAsPaid.bind(null, inv.id, inv.customer_id)}
                          className="inline-block"
                        >
                          <button
                            type="submit"
                            title={translations.dashboard.markAsPaid}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-md transition duration-200 border border-emerald-200 text-[10px] uppercase tracking-wider font-bold shadow-xs cursor-pointer"
                          >
                            {translations.dashboard.unpaid}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-xs italic text-center py-4">{translations.dashboard.noStatements}</p>
      )}
    </>
  );
}
