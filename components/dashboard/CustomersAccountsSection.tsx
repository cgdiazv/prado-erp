'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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

type SortColumn = 'name' | 'email' | 'phone' | 'paidBalance' | 'unpaidBalance';
type SortDirection = 'asc' | 'desc';

export default function CustomersAccountsSection({
  customers,
  unpaidBalances,
  paidBalances,
  locale = 'en',
}: CustomersAccountsSectionProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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

  const withoutOptional = (label: string) => label.replace(/\s*\((?:optional|opcional)\)\s*/gi, '').trim();

  const sortedCustomers = useMemo(() => {
    const getCustomerName = (customer: Customer) => `${customer.first_name} ${customer.last_name}`.trim().toLowerCase();
    const getEmail = (customer: Customer) => (customer.email || '').trim().toLowerCase();
    const getPhone = (customer: Customer) => (customer.phone || '').trim().toLowerCase();
    const getPaidBalance = (customer: Customer) => paidBalances[customer.id] || 0;
    const getUnpaidBalance = (customer: Customer) => unpaidBalances[customer.id] || 0;

    const sorted = [...filteredCustomers].sort((a, b) => {
      let result = 0;

      if (sortColumn === 'name') {
        result = getCustomerName(a).localeCompare(getCustomerName(b));
      } else if (sortColumn === 'email') {
        result = getEmail(a).localeCompare(getEmail(b));
      } else if (sortColumn === 'phone') {
        result = getPhone(a).localeCompare(getPhone(b));
      } else if (sortColumn === 'paidBalance') {
        result = getPaidBalance(a) - getPaidBalance(b);
      } else if (sortColumn === 'unpaidBalance') {
        result = getUnpaidBalance(a) - getUnpaidBalance(b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredCustomers, paidBalances, unpaidBalances, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / pageSize));
  const paginatedCustomers = sortedCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  const renderSortIndicator = (column: SortColumn) => (
    <span className="inline-flex flex-col leading-none text-[8px]">
      <span className={sortColumn === column && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
      <span className={sortColumn === column && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
    </span>
  );

  const resetToFirstPage = () => setCurrentPage(1);

  const labels = {
    filterAll: isEs ? 'Todos' : 'All',
    filterUnpaid: isEs ? 'Saldo pendiente' : 'Unpaid Balance',
    filterPaid: isEs ? 'Saldo pagado' : 'Paid Balance',
    paidBalance: isEs ? 'Saldo pagado' : 'Paid Balance',
    noRecords: isEs ? 'No se encontraron clientes para este filtro.' : 'No customers matched this filter.',
    noCustomers: isEs ? 'No hay clientes registrados.' : translations.dashboard.noCustomers,
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        {/* Desktop filter buttons */}
        <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => {
              setBalanceFilter('all');
              resetToFirstPage();
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
              balanceFilter === 'all'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {labels.filterAll}
          </button>
          <button
            onClick={() => {
              setBalanceFilter('unpaid');
              resetToFirstPage();
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
              balanceFilter === 'unpaid'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {labels.filterUnpaid}
          </button>
          <button
            onClick={() => {
              setBalanceFilter('paid');
              resetToFirstPage();
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
              balanceFilter === 'paid'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {labels.filterPaid}
          </button>
        </div>
        
        {/* Mobile filter dropdown */}
        <select
          value={balanceFilter}
          onChange={(e) => {
            setBalanceFilter(e.target.value as any);
            resetToFirstPage();
          }}
          className="sm:hidden text-xs bg-white border border-gray-300 rounded-md px-3 py-1.5 text-slate-700 w-full"
        >
          <option value="all">{labels.filterAll}</option>
          <option value="unpaid">{labels.filterUnpaid}</option>
          <option value="paid">{labels.filterPaid}</option>
        </select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="customers-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {isEs ? 'Registros por pagina' : 'Rows per page'}
          </label>
          <select
            id="customers-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              resetToFirstPage();
            }}
            className="text-xs bg-white border border-gray-300 rounded-md px-2 py-1.5 text-slate-700"
          >
            {[25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEs ? 'Anterior' : 'Prev'}
          </button>

          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {isEs ? 'Pagina' : 'Page'} {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEs ? 'Siguiente' : 'Next'}
          </button>
        </div>
      </div>

      {customerList.length > 0 ? (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="min-w-[720px] sm:min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">
                  <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1">
                    <span>{isEs ? 'Nombre' : 'Name'}</span>
                    {renderSortIndicator('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">
                  <button type="button" onClick={() => handleSort('email')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.customerEmail}</span>
                    {renderSortIndicator('email')}
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">
                  <button type="button" onClick={() => handleSort('phone')} className="inline-flex items-center gap-1">
                    <span>{withoutOptional(translations.dashboard.phoneNumber)}</span>
                    {renderSortIndicator('phone')}
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">
                  <button type="button" onClick={() => handleSort('paidBalance')} className="inline-flex items-center gap-1">
                    <span>{labels.paidBalance}</span>
                    {renderSortIndicator('paidBalance')}
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 tracking-wider">
                  <button type="button" onClick={() => handleSort('unpaidBalance')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.unpaidBalance}</span>
                    {renderSortIndicator('unpaidBalance')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-xs text-slate-500 italic text-center">
                    {labels.noRecords}
                  </td>
                </tr>
              ) : paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                    <Link href={`/dashboard/customers/${customer.id}`}>{customer.first_name} {customer.last_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{customer.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    {paidBalances[customer.id] > 0 ? `$${paidBalances[customer.id].toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">
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
