'use client';

import { getTranslations } from '@/lib/translations';

interface PerformanceChartProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  trendData: Array<{
    dateLabel: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
  locale?: string;
}

export default function PerformanceChart({ totalRevenue, totalExpenses, netProfit, trendData, locale = 'en' }: PerformanceChartProps) {
  const translations = getTranslations(locale);
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

  const buildLine = (selector: (entry: PerformanceChartProps['trendData'][number]) => number) =>
    trendData.map((entry, index) => `${toX(index)},${toY(selector(entry))}`).join(' ');

  const revenueLine = buildLine((entry) => entry.revenue);
  const expensesLine = buildLine((entry) => entry.expenses);
  const netLine = buildLine((entry) => entry.netIncome);

  const axisTicks = [0, 6, 12, 18, 24]
    .filter((index) => index < trendData.length)
    .map((index) => ({
      key: index,
      label: trendData[index]?.dateLabel || '',
      position: (index / Math.max(trendData.length - 1, 1)) * 100,
    }));

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs w-full">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">{translations.dashboard.financialBreakdown}</h3>
        <p className="text-xs text-slate-400 font-medium">{translations.dashboard.financialBreakdownDesc}</p>
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
            <span className={`font-mono ${netProfit >= 0 ? 'text-teal-600' : 'text-amber-600'}`}>
              ${netProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <svg viewBox="0 0 100 42" className="w-full h-56" aria-label="Revenue, expenses, and net income trend chart" role="img">
          <polyline points="0,20 100,20" fill="none" stroke="rgb(203 213 225)" strokeWidth="0.35" strokeDasharray="2 2" />
          <polyline points={revenueLine} fill="none" stroke="rgb(16 185 129)" strokeWidth="0.45" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={expensesLine} fill="none" stroke="rgb(244 63 94)" strokeWidth="0.45" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={netLine} fill="none" stroke={netProfit >= 0 ? 'rgb(20 184 166)' : 'rgb(245 158 11)'} strokeWidth="0.45" strokeLinecap="round" strokeLinejoin="round" />
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