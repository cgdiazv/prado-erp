'use client';

import { useEffect, useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { getTranslations } from '@/lib/translations';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/expenseCategories';

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

const DIRECT_JOB_COST_CATEGORIES = new Set([
  'labor',
  'materials & supplies',
  'materials',
  'subcontractor',
  'subcontractor payout',
]);

export default function ExpenseLedger({ expenses, locale = 'en' }: ExpenseLedgerProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const expenseList = useMemo(
    () =>
      (expenses || []).map((exp) => ({
        ...exp,
        category: exp.category === 'Subcontractor Payout' ? 'Subcontractor' : exp.category,
      })),
    [expenses]
  );

  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_EXPENSE_CATEGORIES);
    expenseList.forEach((exp) => {
      if (exp.category?.trim()) {
        set.add(exp.category.trim());
      }
    });
    return Array.from(set);
  }, [expenseList]);

  const summaryMetrics = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let totalAllTime = 0;
    let totalLast30Days = 0;
    let directJobCosts = 0;

    expenseList.forEach((exp) => {
      const amt = Number(exp.amount || 0);
      if (!Number.isFinite(amt)) return;

      totalAllTime += amt;

      const expTime = new Date(exp.expense_date || 0).getTime();
      if (expTime > 0 && now - expTime <= thirtyDaysMs) {
        totalLast30Days += amt;
      }

      const normalizedCat = (exp.category || '').trim().toLowerCase();
      if (DIRECT_JOB_COST_CATEGORIES.has(normalizedCat) || Boolean(exp.jobs?.id)) {
        directJobCosts += amt;
      }
    });

    return {
      totalAllTime,
      totalLast30Days,
      directJobCosts,
    };
  }, [expenseList]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expenseList;
    return expenseList.filter(
      (exp) => (exp.category || '').toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [expenseList, categoryFilter]);

  const sortedExpenses = useMemo(() => {
    const getDate = (exp: Expense) => new Date(exp.expense_date || 0).getTime();
    const getCategory = (exp: Expense) => (exp.category || '').toLowerCase();
    const getJob = (exp: Expense) => (exp.jobs?.job_type || '').toLowerCase();
    const getVendor = (exp: Expense) => (exp.vendor || '').toLowerCase();
    const getDescription = (exp: Expense) => (exp.description || '').toLowerCase();
    const getAmount = (exp: Expense) => Number(exp.amount || 0);

    const sorted = [...filteredExpenses].sort((a, b) => {
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
  }, [filteredExpenses, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const paginatedExpenses = sortedExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, categoryFilter]);

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
    <div className="space-y-4">
      {/* 3 Summary Cards */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible">
        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Gastos (Últimos 30d)' : 'Expenses (Last 30d)'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            ${summaryMetrics.totalLast30Days.toFixed(2)}
          </p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Costos Directos de Jobs' : 'Direct Job Costs'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            ${summaryMetrics.directJobCosts.toFixed(2)}
          </p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Gastos Totales' : 'Total Expenses'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            ${summaryMetrics.totalAllTime.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filter + Pagination Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative inline-flex items-center">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            id="expenses-category-filter"
            aria-label={isEs ? 'Filtrar por categoría' : 'Filter by category'}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-white border border-gray-300 rounded-md pl-8 pr-7 py-1.5 text-slate-700 font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition cursor-pointer"
          >
            <option value="all">{isEs ? 'Todas las categorías' : 'All categories'}</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
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
            type="button"
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
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEs ? 'Siguiente' : 'Next'}
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      {sortedExpenses.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
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
                  <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap table-date-column">
                    {new Date(exp.expense_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{exp.description || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center whitespace-nowrap bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-medium">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{exp.vendor || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {exp.jobs?.job_type || (isEs ? 'Sin asignar' : 'Unassigned')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-red-600 font-mono font-semibold whitespace-nowrap">
                    -${Number(exp.amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-xs text-slate-400">
          {translations.dashboard.noOperationalExpenses}
        </div>
      )}
    </div>
  );
}
