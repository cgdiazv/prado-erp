'use client';

import { useState, useMemo } from 'react';
import { getTranslations } from '@/lib/translations';

interface Invoice {
  total_amount: number;
  due_date: string;
}

interface Expense {
  amount: number;
  expense_date: string;
}

interface PerformanceChartProps {
  invoices: Invoice[];
  expenses: Expense[];
  locale?: string;
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

export default function PerformanceChart({ invoices, expenses, locale = 'en' }: PerformanceChartProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');

  // Calculate date range based on period filter
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let daysBack = 30;
    if (periodFilter === '7d') daysBack = 7;
    else if (periodFilter === '30d') daysBack = 30;
    else if (periodFilter === '90d') daysBack = 90;
    else if (periodFilter === 'all') daysBack = 3650; // 10 years
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);
    
    return { startDate, endDate: today, daysBack };
  }, [periodFilter]);

  // Filter and calculate data for selected period
  const { trendData, totalRevenue, totalExpenses, netProfit } = useMemo(() => {
    const toDayKey = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Generate date array for the period
    const rollingDates: Date[] = [];
    for (let i = dateRange.daysBack; i >= 0; i--) {
      const date = new Date(dateRange.endDate);
      date.setDate(dateRange.endDate.getDate() - i);
      rollingDates.push(date);
    }

    const rollingDateKeys = new Set(rollingDates.map((date) => toDayKey(date)));
    const revenueByDay = new Map<string, number>();
    const expensesByDay = new Map<string, number>();

    rollingDates.forEach((date) => {
      const key = toDayKey(date);
      revenueByDay.set(key, 0);
      expensesByDay.set(key, 0);
    });

    // Process invoices
    invoices.forEach((invoice) => {
      if (!invoice.due_date) return;
      const key = invoice.due_date;
      if (!rollingDateKeys.has(key)) return;
      revenueByDay.set(key, (revenueByDay.get(key) || 0) + Number(invoice.total_amount || 0));
    });

    // Process expenses
    expenses.forEach((expense) => {
      if (!expense.expense_date) return;
      const key = expense.expense_date;
      if (!rollingDateKeys.has(key)) return;
      expensesByDay.set(key, (expensesByDay.get(key) || 0) + Number(expense.amount || 0));
    });

    // Build trend data
    const trend = rollingDates.map((date) => {
      const key = toDayKey(date);
      const revenue = revenueByDay.get(key) || 0;
      const expense = expensesByDay.get(key) || 0;

      return {
        dateLabel: date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        revenue,
        expenses: expense,
        netIncome: revenue - expense,
      };
    });

    // Calculate totals
    const totalRev = trend.reduce((sum, entry) => sum + entry.revenue, 0);
    const totalExp = trend.reduce((sum, entry) => sum + entry.expenses, 0);
    const netProf = totalRev - totalExp;

    return {
      trendData: trend,
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      netProfit: netProf,
    };
  }, [invoices, expenses, dateRange, locale]);

  // Chart rendering logic
  const chartWidth = 100;
  const chartHeight = 42;
  const minY = 4;
  const maxY = 36;

  const allValues = trendData.flatMap((entry) => [entry.revenue, entry.expenses, entry.netIncome]);
  const peak = Math.max(...allValues.map((value) => Math.abs(value)), 1);

  const toX = (index: number) => (trendData.length <= 1 ? 0 : (index / (trendData.length - 1)) * chartWidth);
  const toY = (value: number) => {
    const normalized = (value + peak) / (2 * peak);
    return maxY - normalized * (maxY - minY);
  };

  const buildLine = (selector: (entry: (typeof trendData)[number]) => number) =>
    trendData.map((entry, index) => `${toX(index)},${toY(selector(entry))}`).join(' ');

  const revenueLine = buildLine((entry) => entry.revenue);
  const expensesLine = buildLine((entry) => entry.expenses);
  const netLine = buildLine((entry) => entry.netIncome);

  // Spread X-axis ticks across the full data range to avoid label clustering on all-time views.
  const axisTicks = useMemo(() => {
    const lastIndex = Math.max(trendData.length - 1, 0);

    if (lastIndex === 0) {
      return [
        {
          key: 0,
          label: trendData[0]?.dateLabel || '',
          position: 0,
        },
      ];
    }

    const targetTickCount = periodFilter === 'all' ? 6 : 5;
    const step = lastIndex / (targetTickCount - 1);
    const tickIndexes = Array.from({ length: targetTickCount }, (_, idx) =>
      Math.round(idx * step)
    );

    const uniqueSortedIndexes = Array.from(new Set([0, ...tickIndexes, lastIndex])).sort((a, b) => a - b);

    return uniqueSortedIndexes.map((index) => ({
      key: index,
      label: trendData[index]?.dateLabel || '',
      position: (index / lastIndex) * 100,
    }));
  }, [trendData, periodFilter]);

  const periodLabels: Record<PeriodFilter, string> = {
    '7d': isEs ? 'Últimos 7 días' : 'Last 7 days',
    '30d': isEs ? 'Últimos 30 días' : 'Last 30 days',
    '90d': isEs ? 'Últimos 90 días' : 'Last 90 days',
    'all': isEs ? 'Todo el tiempo' : 'All time',
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs w-full min-w-0">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">{translations.dashboard.financialBreakdown}</h3>
          <p className="text-xs text-slate-400 font-medium">{translations.dashboard.financialBreakdownDesc}</p>
        </div>
        
        {/* Mobile dropdown */}
        <select
          value={periodFilter}
          onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 sm:hidden"
        >
          {(['7d', '30d', '90d', 'all'] as const).map((period) => (
            <option key={period} value={period}>
              {periodLabels[period]}
            </option>
          ))}
        </select>

        {/* Desktop filter buttons */}
        <div className="hidden gap-1 bg-gray-100 p-1 rounded-lg sm:flex sm:w-fit">
          {(['7d', '30d', '90d', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodFilter(period)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition duration-150 cursor-pointer text-center whitespace-nowrap ${
                periodFilter === period
                  ? 'bg-white text-slate-900 shadow-xs border border-gray-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">{translations.dashboard.revenue}</span>
            <span className="text-emerald-600 font-mono">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">{translations.dashboard.expenses}</span>
            <span className="text-rose-600 font-mono">${totalExpenses.toFixed(2)}</span>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">{translations.dashboard.netIncome}</span>
            <span className={`font-mono ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              ${netProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <svg viewBox="0 0 100 42" className="w-full h-56" aria-label="Revenue, expenses, and net income trend chart" role="img">
          <polyline points="0,20 100,20" fill="none" stroke="rgb(203 213 225)" strokeWidth="0.35" strokeDasharray="2 2" />
          <polyline points={revenueLine} fill="none" stroke="rgb(16 185 129)" strokeWidth="0.45" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={expensesLine} fill="none" stroke="rgb(244 63 94)" strokeWidth="0.45" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={netLine} fill="none" stroke={netProfit >= 0 ? 'rgb(37 99 235)' : 'rgb(234 88 12)'} strokeWidth="0.45" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="mt-3 relative h-4 text-[10px] font-semibold text-slate-500">
          {axisTicks.map((tick) => (
            <span
              key={tick.key}
              className="absolute -translate-x-1/2"
              style={{ left: `${tick.position}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}