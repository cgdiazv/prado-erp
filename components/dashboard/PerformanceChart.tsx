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

type MetricTrend = {
  key: 'revenue' | 'expenses' | 'netIncome';
  label: string;
  total: number;
  stroke: string;
  fill: string;
  textClassName: string;
  values: number[];
  ariaLabel: string;
};

export default function PerformanceChart({ invoices, expenses, locale = 'en' }: PerformanceChartProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d');
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

  const metricTrends = useMemo<MetricTrend[]>(() => {
    const metrics: Omit<MetricTrend, 'values'>[] = [
      {
        key: 'revenue',
        label: translations.dashboard.revenue,
        total: totalRevenue,
        stroke: 'rgb(16 185 129)',
        fill: 'rgba(16, 185, 129, 0.16)',
        textClassName: 'text-emerald-600',
        ariaLabel: `${translations.dashboard.revenue} trend`,
      },
      {
        key: 'expenses',
        label: translations.dashboard.expenses,
        total: totalExpenses,
        stroke: 'rgb(244 63 94)',
        fill: 'rgba(244, 63, 94, 0.16)',
        textClassName: 'text-rose-600',
        ariaLabel: `${translations.dashboard.expenses} trend`,
      },
      {
        key: 'netIncome',
        label: translations.dashboard.netIncome,
        total: netProfit,
        stroke: netProfit >= 0 ? 'rgb(37 99 235)' : 'rgb(234 88 12)',
        fill: netProfit >= 0 ? 'rgba(37, 99, 235, 0.16)' : 'rgba(234, 88, 12, 0.16)',
        textClassName: netProfit >= 0 ? 'text-blue-600' : 'text-orange-600',
        ariaLabel: `${translations.dashboard.netIncome} trend`,
      },
    ];

    return metrics.map((metric) => ({
      ...metric,
      values: trendData.map((entry) => entry[metric.key]),
    }));
  }, [trendData, totalRevenue, totalExpenses, netProfit, translations.dashboard]);

  const buildSparkline = (values: number[]) => {
    const width = 100;
    const minY = 5;
    const maxY = 39;
    const lastIndex = Math.max(values.length - 1, 0);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    const toX = (index: number) => (lastIndex === 0 ? width / 2 : (index / lastIndex) * width);
    const toY = (value: number) => maxY - ((value - minValue) / range) * (maxY - minY);

    const line = values.map((value, index) => `${toX(index)},${toY(value)}`).join(' ');
    const area = `${line} ${width},${maxY} 0,${maxY}`;
    const gridLines = [minY, (minY + maxY) / 2, maxY];

    return { line, area, baseline: toY(values[values.length - 1] ?? 0), gridLines };
  };

  const periodLabels: Record<PeriodFilter, string> = {
    '7d': isEs ? 'Últimos 7 días' : 'Last 7 days',
    '30d': isEs ? 'Últimos 30 días' : 'Last 30 days',
    '90d': isEs ? 'Últimos 90 días' : 'Last 90 days',
    'all': isEs ? 'Todo el tiempo' : 'All time',
  };

  return (
    <div className="w-full min-w-0">
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

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            {metricTrends.map((metric) => {
              const { line, area, baseline, gridLines } = buildSparkline(metric.values);

              return (
                <div key={metric.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold">
                    <span className="text-slate-500">{metric.label}</span>
                    <span className={`font-mono ${metric.textClassName}`}>${metric.total.toFixed(2)}</span>
                  </div>

                  <svg viewBox="0 0 100 44" className="h-28 w-full" aria-label={metric.ariaLabel} role="img">
                    {gridLines.map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgb(226 232 240)" strokeWidth="0.35" />
                    ))}
                    <line x1="0" y1={baseline} x2="100" y2={baseline} stroke="rgb(226 232 240)" strokeWidth="0.5" strokeDasharray="2 2" />
                    <polyline points={area} fill={metric.fill} stroke="none" />
                    <polyline points={line} fill="none" stroke={metric.stroke} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>{trendData[0]?.dateLabel || periodLabels[periodFilter]}</span>
                    <span>{trendData[trendData.length - 1]?.dateLabel || periodLabels[periodFilter]}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          localStorage.removeItem('prado_onboarding_completed');
          window.dispatchEvent(new CustomEvent('prado:restart-tour'));
        }}
        className="mt-2 text-[10px] font-medium text-slate-50 transition hover:opacity-80 focus:opacity-80"
      >
        {isEs ? 'Reiniciar recorrido' : 'Restart tour'}
      </button>
    </div>
  );
}