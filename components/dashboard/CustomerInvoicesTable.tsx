'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { markInvoiceAsPaid } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

interface InvoiceRow {
  id: string;
  due_date: string;
  tax_amount: number | string | null;
  total_amount: number | string | null;
  status: string | null;
  stripe_payment_url?: string | null;
}

interface CustomerInvoicesTableProps {
  invoices: InvoiceRow[];
  customerId: string;
  locale?: string;
}

type StatusFilter = 'all' | 'paid' | 'unpaid';

export default function CustomerInvoicesTable({ invoices, customerId, locale = 'en' }: CustomerInvoicesTableProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [rows, setRows] = useState(invoices);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [pending, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((invoice) => (invoice.status || '').toLowerCase() === statusFilter);
  }, [rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const rowsPerPageLabel = isEs ? 'Filas por pagina' : 'Rows per page';
  const prevPageLabel = isEs ? 'Anterior' : 'Prev';
  const nextPageLabel = isEs ? 'Siguiente' : 'Next';
  const pageLabel = isEs ? 'Pagina' : 'Page';

  const handleMarkPaid = (invoiceId: string) => {
    startTransition(async () => {
      const result = await markInvoiceAsPaid(invoiceId, customerId);
      if (!result?.error) {
        setRows((current) => current.map((invoice) => (
          invoice.id === invoiceId ? { ...invoice, status: 'paid' } : invoice
        )));
      }
    });
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translations.dashboard.invoicesAndLedger}</h2>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Desktop filter buttons */}
          <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: 'all' as const, label: translations.dashboard.filterAll },
              { key: 'unpaid' as const, label: translations.dashboard.filterUnpaid },
              { key: 'paid' as const, label: translations.dashboard.filterPaid },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
                  statusFilter === filter.key
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          {/* Mobile filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="sm:hidden text-xs bg-white border border-gray-300 rounded-md px-3 py-1.5 text-slate-700 w-full"
          >
            {[
              { key: 'all' as const, label: translations.dashboard.filterAll },
              { key: 'unpaid' as const, label: translations.dashboard.filterUnpaid },
              { key: 'paid' as const, label: translations.dashboard.filterPaid },
            ].map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 sm:ml-auto">
            <label htmlFor="invoice-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              {rowsPerPageLabel}
            </label>
            <select
              id="invoice-page-size"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="text-xs bg-white border border-gray-300 rounded-md px-2 py-1.5 text-slate-700"
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prevPageLabel}
            </button>

            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              {pageLabel} {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nextPageLabel}
            </button>
          </div>
        </div>

        <section className="border border-gray-200 bg-white rounded-xl overflow-hidden shadow-xs">
          {filteredRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50 text-slate-500 font-bold">
                    <th className="p-4 table-date-column">{translations.dashboard.dueDate}</th>
                    <th className="p-4">{translations.dashboard.taxCharge}</th>
                    <th className="p-4 text-right">{translations.dashboard.totalOwed}</th>
                    <th className="p-4 text-right">{isEs ? 'Pago' : 'Payment'}</th>
                    <th className="p-4 text-right">{translations.dashboard.paymentStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedRows.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-slate-700 whitespace-nowrap table-date-column">
                        {new Date(`${inv.due_date}T00:00:00`).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                      </td>
                      <td className="p-4 text-slate-700">${Number(inv.tax_amount || 0).toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-slate-800">${Number(inv.total_amount || 0).toFixed(2)}</td>
                      <td className="p-4 text-right">
                        {inv.status !== 'paid' && inv.stripe_payment_url ? (
                          <a
                            href={inv.stripe_payment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 transition hover:bg-sky-100"
                          >
                            {isEs ? 'Cobrar' : 'Pay Link'}
                          </a>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide text-slate-300">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {(inv.status || '').toLowerCase() === 'paid' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-emerald-100 text-emerald-700 border-emerald-200">
                            {translations.dashboard.paid}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={pending}
                            title={translations.dashboard.markAsPaid}
                            className="px-2 py-0.5 bg-red-50 hover:bg-emerald-50 text-red-700 hover:text-emerald-700 border border-red-200/80 hover:border-emerald-200/80 rounded text-[10px] uppercase font-bold tracking-wide transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {translations.dashboard.unpaid}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-medium text-xs">{translations.dashboard.noStatements}</div>
          )}
        </section>
      </div>
    </div>
  );
}