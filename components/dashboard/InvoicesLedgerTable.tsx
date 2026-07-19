'use client';

import { useEffect, useMemo, useState } from 'react';
import { markInvoiceAsPaid } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

type FilterType = 'all' | 'unpaid' | 'paid';
type SortColumn = 'customer' | 'date' | 'tax' | 'total' | 'status';
type SortDirection = 'asc' | 'desc';

interface InvoiceRow {
  id: string;
  customer_id: string;
  due_date: string;
  tax_amount: number;
  total_amount: number;
  status: 'paid' | 'unpaid';
  stripe_payment_url?: string | null;
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
  const isEs = locale.toLowerCase().startsWith('es');
  const [filter, setFilter] = useState<FilterType>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredInvoices =
    filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const sortedInvoices = useMemo(() => {
    const getCustomerName = (inv: InvoiceRow) => {
      return (
        `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`.trim() ||
        inv.customers?.company_name ||
        'Customer'
      ).toLowerCase();
    };
    const getDate = (inv: InvoiceRow) => new Date(inv.due_date || 0).getTime();
    const getTax = (inv: InvoiceRow) => Number(inv.tax_amount || 0);
    const getTotal = (inv: InvoiceRow) => Number(inv.total_amount || 0);
    const getStatus = (inv: InvoiceRow) => (inv.status === 'paid' ? 2 : 1);

    const sorted = [...filteredInvoices].sort((a, b) => {
      let result = 0;

      if (sortColumn === 'customer') {
        result = getCustomerName(a).localeCompare(getCustomerName(b));
      } else if (sortColumn === 'date') {
        result = getDate(a) - getDate(b);
      } else if (sortColumn === 'tax') {
        result = getTax(a) - getTax(b);
      } else if (sortColumn === 'total') {
        result = getTotal(a) - getTotal(b);
      } else if (sortColumn === 'status') {
        result = getStatus(a) - getStatus(b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredInvoices, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / pageSize));
  const paginatedInvoices = sortedInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, pageSize]);

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

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: translations.dashboard.filterAll },
    { key: 'unpaid', label: translations.dashboard.filterUnpaid },
    { key: 'paid', label: translations.dashboard.filterPaid },
  ];

  const unpaidTotal = invoices
    .filter((invoice) => invoice.status === 'unpaid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const paidTotal = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const totalInvoices = invoices.length;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible mb-2 sm:mb-5 md:mb-2">
        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-red-600">
            {isEs ? 'Total Pendiente' : 'Unpaid Total'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">${unpaidTotal.toFixed(2)}</p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
            {isEs ? 'Total Pagado' : 'Paid Total'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">${paidTotal.toFixed(2)}</p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            {isEs ? 'Facturas Totales' : 'Total Invoices'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">{totalInvoices}</p>
        </div>
      </div>

      {/* Filter tabs + pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 md:mb-3">
        {/* Desktop filter buttons */}
        <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
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
        
        {/* Mobile filter dropdown */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="sm:hidden text-xs bg-white border border-gray-300 rounded-md px-3 py-1.5 text-slate-700 w-full"
        >
          {filters.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="invoices-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {isEs ? 'Registros por pagina' : 'Rows per page'}
          </label>
          <select
            id="invoices-page-size"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
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

      {sortedInvoices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.dueDate}</span>
                    {renderSortIndicator('date')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('customer')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.customerCrm}</span>
                    {renderSortIndicator('customer')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('tax')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.taxCharge}</span>
                    {renderSortIndicator('tax')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleSort('total')} className="inline-flex items-center gap-1 justify-end">
                    <span>{translations.dashboard.totalOwed}</span>
                    {renderSortIndicator('total')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <span>{isEs ? 'Pago' : 'Payment'}</span>
                </th>
                <th className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1 justify-end">
                    <span>{translations.dashboard.paymentStatus}</span>
                    {renderSortIndicator('status')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedInvoices.map((inv) => {
                const customerName =
                  `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`.trim() ||
                  inv.customers?.company_name ||
                  'Customer';

                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {new Date(inv.due_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{customerName}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">${inv.tax_amount}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">${Number(inv.total_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.status !== 'paid' && inv.stripe_payment_url ? (
                        <a
                          href={inv.stripe_payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 transition hover:bg-sky-100"
                        >
                          {isEs ? 'Cobrar' : 'Pay Link'}
                        </a>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-slate-300">
                          {isEs ? 'N/A' : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'paid' ? (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md border border-gray-200 shadow-xs select-none">
                          {translations.dashboard.paid}
                        </span>
                      ) : (
                        <form
                          action={async () => {
                            await markInvoiceAsPaid(inv.id, inv.customer_id);
                          }}
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
