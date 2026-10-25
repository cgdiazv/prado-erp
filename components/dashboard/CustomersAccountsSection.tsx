'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { getTranslations } from '@/lib/translations';
import CustomerEmailModal from '@/components/dashboard/CustomerEmailModal';

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const customerList = customers || [];

  const filteredCustomers = useMemo(() => {
    let list = customerList;

    if (balanceFilter === 'unpaid') {
      list = list.filter((customer) => (unpaidBalances[customer.id] || 0) > 0);
    } else if (balanceFilter === 'paid') {
      list = list.filter((customer) => (paidBalances[customer.id] || 0) > 0);
    }

    const query = searchTerm.trim().toLowerCase();
    if (query) {
      const queryDigits = query.replace(/\D/g, '');
      list = list.filter((customer) => {
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const company = (customer.company_name || '').toLowerCase();
        const nameMatch = fullName.includes(query) || company.includes(query);

        const phone = customer.phone || '';
        const phoneDigits = phone.replace(/\D/g, '');
        const phoneMatch =
          phone.toLowerCase().includes(query) ||
          (queryDigits.length > 0 && phoneDigits.includes(queryDigits));

        return nameMatch || phoneMatch;
      });
    }

    return list;
  }, [balanceFilter, customerList, unpaidBalances, paidBalances, searchTerm]);

  const withoutOptional = (label: string) => label.replace(/\s*\((?:optional|opcional)\)\s*/gi, '').trim();

  const formatPhoneDisplay = (value?: string | null) => {
    if (!value) {
      return '—';
    }

    const digits = value.replace(/\D/g, '');
    if (digits.length !== 10) {
      return value;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 md:mb-2">
        {/* Filter dropdown */}
        <div className="relative inline-flex items-center">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            id="customers-balance-filter"
            aria-label={isEs ? 'Filtro por saldo' : 'Filter by balance'}
            value={balanceFilter}
            onChange={(e) => {
              setBalanceFilter(e.target.value as any);
              resetToFirstPage();
            }}
            className="text-xs bg-white border border-gray-300 rounded-md pl-8 pr-7 py-1.5 text-slate-700 font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition cursor-pointer appearance-none"
          >
            <option value="all">{labels.filterAll}</option>
            <option value="unpaid">{labels.filterUnpaid}</option>
            <option value="paid">{labels.filterPaid}</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Search bar (between filters and pagination) */}
        <div className="relative w-full sm:w-64 sm:mx-3">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              resetToFirstPage();
            }}
            placeholder={isEs ? 'Buscar por nombre o teléfono...' : 'Search by name or phone...'}
            className="w-full bg-white border border-gray-300 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                resetToFirstPage();
              }}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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
        <div className="tour-ledger rounded-xl border border-gray-200 overflow-x-auto">
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
                    <span>Email</span>
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
                  <td className="px-4 py-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                    <Link href={`/dashboard/customers/${customer.id}`}>{customer.first_name} {customer.last_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {customer.email ? (
                      <CustomerEmailModal
                        locale={locale}
                        customerId={customer.id}
                        customerEmail={customer.email}
                        customerName={`${customer.first_name} ${customer.last_name}`.trim()}
                        context="customers_table"
                        className="cursor-pointer text-emerald-600 hover:text-emerald-700 hover:underline"
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatPhoneDisplay(customer.phone)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">
                    {paidBalances[customer.id] > 0 ? `$${paidBalances[customer.id].toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">
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
