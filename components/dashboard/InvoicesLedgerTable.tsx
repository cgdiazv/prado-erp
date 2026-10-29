'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { markInvoiceAsPaid, sendInvoiceOverdueReminderAction, triggerOverdueRemindersForWorkspaceAction } from '@/app/actions';
import { getTranslations } from '@/lib/translations';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import { AlertCircle, BellRing, CheckCircle2, Filter, Loader2, Plus, Image as ImageIcon } from 'lucide-react';
import EditInvoiceModal from './EditInvoiceModal';
import CreateInvoiceModal, { CustomerOption, ServiceOption } from './CreateInvoiceModal';
import InvoiceRowActions from './InvoiceRowActions';

type FilterType = 'all' | 'unpaid' | 'paid';
type SortColumn = 'customer' | 'date' | 'tax' | 'total' | 'status';
type SortDirection = 'asc' | 'desc';

interface InvoiceRow {
  id: string;
  customer_id: string;
  invoice_number?: number | null;
  due_date: string;
  tax_amount: number;
  total_amount: number;
  currency_code?: string | null;
  status: 'paid' | 'unpaid';
  stripe_payment_url?: string | null;
  job_id?: string | null;
  invoice_type?: string | null;
  notes?: string | null;
  photos?: string[] | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    email?: string | null;
  } | null;
}

interface InvoicesLedgerTableProps {
  invoices: InvoiceRow[];
  customers?: CustomerOption[];
  services?: ServiceOption[];
  locale?: string;
  orgTaxRatePercent?: number;
  orgCurrencyCode?: string;
}

export default function InvoicesLedgerTable({
  invoices,
  customers = [],
  services = [],
  locale = 'en',
  orgTaxRatePercent,
  orgCurrencyCode = 'USD',
}: InvoicesLedgerTableProps) {
  const router = useRouter();
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>(invoices);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [isProcessingBatchReminders, setIsProcessingBatchReminders] = useState(false);
  const [reminderNotification, setReminderNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setInvoiceRows(invoices);
  }, [invoices]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    return invoiceRows.filter(
      (inv) => inv.status === 'unpaid' && inv.due_date && new Date(inv.due_date) < today
    ).length;
  }, [invoiceRows]);

  const handleSendRowReminder = async (invoiceId: string) => {
    setSendingReminderId(invoiceId);
    setReminderNotification(null);
    try {
      const res = await sendInvoiceOverdueReminderAction(invoiceId);
      if (res.error) {
        setReminderNotification({ type: 'error', text: res.error });
      } else {
        setReminderNotification({
          type: 'success',
          text: isEs
            ? 'Recordatorio de pago enviado exitosamente al cliente.'
            : 'Payment reminder email sent successfully to customer.',
        });
      }
    } catch (err: any) {
      setReminderNotification({ type: 'error', text: err?.message || 'Error sending reminder.' });
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string, customerId: string) => {
    await markInvoiceAsPaid(invoiceId, customerId);
    setInvoiceRows((prev) =>
      prev.map((r) => (r.id === invoiceId ? { ...r, status: 'paid' } : r))
    );
  };

  const handleTriggerBatchReminders = async () => {
    setIsProcessingBatchReminders(true);
    setReminderNotification(null);
    try {
      const res = await triggerOverdueRemindersForWorkspaceAction();
      if (res.error) {
        setReminderNotification({ type: 'error', text: res.error });
      } else {
        const count = res.remindersSent ?? 0;
        setReminderNotification({
          type: 'success',
          text: isEs
            ? `Se enviaron ${count} recordatorio(s) de facturas vencidas.`
            : `Successfully sent ${count} overdue invoice reminder(s).`,
        });
      }
    } catch (err: any) {
      setReminderNotification({ type: 'error', text: err?.message || 'Error processing reminders.' });
    } finally {
      setIsProcessingBatchReminders(false);
    }
  };

  const filteredInvoices =
    filter === 'all' ? invoiceRows : invoiceRows.filter((inv) => inv.status === filter);

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

  const unpaidTotal = invoiceRows
    .filter((invoice) => invoice.status === 'unpaid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const paidTotal = invoiceRows
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const summaryCurrency = normalizeCurrencyCode(invoiceRows[0]?.currency_code);
  const totalInvoices = invoiceRows.length;

  return (
    <>
      {/* 1. Header Row - Title & Subtitle on left, New Invoice Button on right end */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {translations.dashboard.invoicesAndLedger}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isEs
              ? 'Monitorea el estado de pago de todas las facturas emitidas en tu workspace.'
              : 'Monitor payment status for all invoices issued in your workspace.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>{isEs ? 'Nueva Factura' : 'New Invoice'}</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible mb-2 sm:mb-5 md:mb-2">
        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Total Pendiente' : 'Unpaid Total'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(unpaidTotal, summaryCurrency)}</p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Total Pagado' : 'Paid Total'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(paidTotal, summaryCurrency)}</p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Facturas Totales' : 'Total Invoices'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalInvoices}</p>
        </div>
      </div>

      {reminderNotification && (
        <div className={`mb-3 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          reminderNotification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {reminderNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{reminderNotification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setReminderNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter tabs + pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 md:mb-3">
        {/* Filter dropdown */}
        <div className="relative inline-flex items-center">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            id="invoices-status-filter"
            aria-label={isEs ? 'Filtro por estado de factura' : 'Filter by invoice status'}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterType);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-gray-300 rounded-md pl-8 pr-7 py-1.5 text-slate-700 font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition cursor-pointer appearance-none"
          >
            {filters.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto w-full sm:w-auto">
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={handleTriggerBatchReminders}
              disabled={isProcessingBatchReminders}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isProcessingBatchReminders ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>
                {isEs ? `Recordar vencidas (${overdueCount})` : `Remind Overdue (${overdueCount})`}
              </span>
            </button>
          )}

          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap sm:flex-nowrap">
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
      </div>

      {sortedInvoices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3 table-date-column">
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
                <th className="px-4 py-3 text-right min-w-[160px]">
                  <span>{isEs ? 'Acciones' : 'Actions'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedInvoices.map((inv) => {
                const customerName =
                  `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`.trim() ||
                  inv.customers?.company_name ||
                  'Customer';
                const rowCurrency = normalizeCurrencyCode(inv.currency_code);

                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap table-date-column">
                      {new Date(inv.due_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{customerName}</span>
                          {inv.invoice_type === 'deposit' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                              {isEs ? 'Anticipo' : 'Deposit'}
                            </span>
                          )}
                          {inv.invoice_type === 'final' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                              {isEs ? 'Saldo' : 'Final'}
                            </span>
                          )}
                          {inv.photos && inv.photos.length > 0 && (
                            <span
                              title={isEs ? `${inv.photos.length} fotos adjuntas` : `${inv.photos.length} photos attached`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              <ImageIcon className="w-2.5 h-2.5" />
                              {inv.photos.length}
                            </span>
                          )}
                        </div>
                        {inv.notes && (
                          <span className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {inv.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-bold text-slate-800 whitespace-nowrap">{formatCurrency(Number(inv.total_amount || 0), rowCurrency)}</td>
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
                            setInvoiceRows((prev) =>
                              prev.map((r) => (r.id === inv.id ? { ...r, status: 'paid' } : r))
                            );
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
                    <td className="px-4 py-3 text-right min-w-[160px]">
                      <InvoiceRowActions
                        invoice={inv}
                        locale={locale}
                        translations={translations}
                        sendingReminderId={sendingReminderId}
                        onSendReminder={handleSendRowReminder}
                        onEdit={setEditingInvoice}
                        onPrint={(invoice) =>
                          window.open(`/api/invoices/${invoice.id}/pdf?lng=${locale}`, '_blank', 'noopener,noreferrer')
                        }
                        onMarkAsPaid={handleMarkAsPaid}
                      />
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

      <EditInvoiceModal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        invoice={
          editingInvoice
            ? {
                ...editingInvoice,
                customerName: (
                  `${editingInvoice.customers?.first_name || ''} ${editingInvoice.customers?.last_name || ''}`.trim() ||
                  editingInvoice.customers?.company_name ||
                  'Customer'
                ),
                customerEmail: editingInvoice.customers?.email || null,
              }
            : null
        }
        onSuccess={(updated) => {
          setInvoiceRows((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          );
        }}
        locale={locale}
        orgTaxRatePercent={orgTaxRatePercent}
      />

      {isCreateModalOpen && (
        <CreateInvoiceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          customers={customers}
          services={services}
          locale={locale}
          orgTaxRatePercent={orgTaxRatePercent}
          orgCurrencyCode={orgCurrencyCode}
          onSuccess={(createdInvoice) => {
            setInvoiceRows((prev) => [createdInvoice, ...prev]);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
