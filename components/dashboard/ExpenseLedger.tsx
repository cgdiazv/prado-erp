 'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTranslations } from '@/lib/translations';

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  vendor?: string | null;
  description?: string | null;
  amount: number;
  jobs?: {
    id: string;
    job_type: string;
    scheduled_date?: string | null;
  } | null;
}

interface ExpenseLedgerProps {
  expenses: Expense[] | null;
  locale?: string;
}

type SortColumn = 'date' | 'category' | 'job' | 'vendor' | 'description' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function ExpenseLedger({ expenses, locale = 'en' }: ExpenseLedgerProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const expenseList = expenses || [];

  const sortedExpenses = useMemo(() => {
    const getDate = (exp: Expense) => new Date(exp.expense_date || 0).getTime();
    const getCategory = (exp: Expense) => (exp.category || '').toLowerCase();
    const getJob = (exp: Expense) => (exp.jobs?.job_type || '').toLowerCase();
    const getVendor = (exp: Expense) => (exp.vendor || '').toLowerCase();
    const getDescription = (exp: Expense) => (exp.description || '').toLowerCase();
    const getAmount = (exp: Expense) => Number(exp.amount || 0);

    const sorted = [...expenseList].sort((a, b) => {
      let result = 0;

      if (sortColumn === 'date') {
        result = getDate(a) - getDate(b);
      } else if (sortColumn === 'category') {
        result = getCategory(a).localeCompare(getCategory(b));
      } else if (sortColumn === 'job') {
        result = getJob(a).localeCompare(getJob(b));
      } else if (sortColumn === 'vendor') {
        result = getVendor(a).localeCompare(getVendor(b));
      } else if (sortColumn === 'description') {
        result = getDescription(a).localeCompare(getDescription(b));
      } else if (sortColumn === 'amount') {
        result = getAmount(a) - getAmount(b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [expenseList, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const paginatedExpenses = sortedExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

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

  return (
    <>
      {expenseList.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-end">
            <label htmlFor="expenses-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              {isEs ? 'Registros por pagina' : 'Rows per page'}
            </label>
            <select
              id="expenses-page-size"
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

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3 table-date-column">
                  <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.expenseDate}</span>
                    {renderSortIndicator('date')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('description')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.description}</span>
                    {renderSortIndicator('description')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('category')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.category}</span>
                    {renderSortIndicator('category')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('vendor')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.vendor}</span>
                    {renderSortIndicator('vendor')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('job')} className="inline-flex items-center gap-1">
                    <span>{isEs ? 'Trabajo' : 'Job'}</span>
                    {renderSortIndicator('job')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleSort('amount')} className="inline-flex items-center gap-1 justify-end">
                    <span>{translations.dashboard.amount}</span>
                    {renderSortIndicator('amount')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap table-date-column">
                    {new Date(exp.expense_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{exp.description || '—'}</td>
                  <td className="px-4 py-3"><span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-medium">{exp.category}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{exp.vendor || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{exp.jobs?.job_type || (isEs ? 'Sin asignar' : 'Unassigned')}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-mono font-semibold">-${exp.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm italic">{translations.dashboard.noOperationalExpenses}</p>
      )}
    </>
  );
}
