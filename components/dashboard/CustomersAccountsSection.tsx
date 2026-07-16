'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getTranslations } from '@/lib/translations';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface CustomersAccountsSectionProps {
  customers: Customer[] | null;
  unpaidBalances: Record<string, number>;
  paidBalances: Record<string, number>;
  locale?: string;
}

export default function CustomersAccountsSection({
  customers,
  unpaidBalances,
  paidBalances,
  locale = 'en',
}: CustomersAccountsSectionProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const customerList = customers || [];

  const filteredCustomers = useMemo(() => {
    if (balanceFilter === 'unpaid') {
      return customerList.filter((customer) => (unpaidBalances[customer.id] || 0) > 0);
    }

    if (balanceFilter === 'paid') {
      return customerList.filter((customer) => (paidBalances[customer.id] || 0) > 0);
    }

    return customerList;
  }, [balanceFilter, customerList, unpaidBalances, paidBalances]);

  const labels = {
    filterAll: isEs ? 'Todos' : 'All',
    filterUnpaid: isEs ? 'Con saldo pendiente' : 'With Unpaid Balance',
    filterPaid: isEs ? 'Con saldo pagado' : 'With Paid Balance',
    paidBalance: isEs ? 'Saldo pagado' : 'Paid Balance',
    noRecords: isEs ? 'No se encontraron clientes para este filtro.' : 'No customers matched this filter.',
    noCustomers: isEs ? 'No hay clientes registrados.' : translations.dashboard.noCustomers,
  };

  return (
    <>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setBalanceFilter('all')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
            balanceFilter === 'all'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {labels.filterAll}
        </button>
        <button
          onClick={() => setBalanceFilter('unpaid')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
            balanceFilter === 'unpaid'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {labels.filterUnpaid}
        </button>
        <button
          onClick={() => setBalanceFilter('paid')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
            balanceFilter === 'paid'
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {labels.filterPaid}
        </button>
      </div>

      {customerList.length > 0 ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">{isEs ? 'Nombre' : 'Name'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">{translations.dashboard.companyName}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">{translations.dashboard.customerEmail}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">{translations.dashboard.phoneNumber}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">{labels.paidBalance}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">{translations.dashboard.unpaidBalance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-xs text-slate-500 italic text-center">
                    {labels.noRecords}
                  </td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                    <Link href={`/dashboard/customers/${customer.id}`}>{customer.first_name} {customer.last_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{customer.company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-semibold">
                    {paidBalances[customer.id] > 0 ? `$${paidBalances[customer.id].toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-semibold">
                    {unpaidBalances[customer.id] > 0 ? `$${unpaidBalances[customer.id].toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">{labels.noCustomers}</p>
      )}
    </>
  );
}
