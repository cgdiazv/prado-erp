'use client';

import { getTranslations } from '@/lib/translations';

interface PerformanceChartProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  locale?: string;
}

export default function PerformanceChart({ totalRevenue, totalExpenses, netProfit, locale = 'en' }: PerformanceChartProps) {
  const translations = getTranslations(locale);
  // Graceful fallback to prevent division by zero if there's no data yet
  const maxVal = Math.max(totalRevenue, totalExpenses, Math.abs(netProfit), 1000);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const toRatio = (value: number) => clamp(Math.abs(value) / maxVal, 0, 1);

  const buildLinePoints = (ratio: number, offsets: number[]) => {
    const anchorX = [0, 25, 50, 75, 100];
    const baseY = 34;
    const amplitude = 22;

    return anchorX
      .map((x, index) => {
        const y = clamp(baseY - ratio * amplitude + offsets[index], 6, 36);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const revenuePoints = buildLinePoints(toRatio(totalRevenue), [3, -2, 1, -1, -3]);
  const expensePoints = buildLinePoints(toRatio(totalExpenses), [2, 1, -2, 1, -2]);
  const profitPoints = buildLinePoints(toRatio(netProfit), [4, 1, -1, -2, -4]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs max-w-5xl">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">{translations.dashboard.financialBreakdown}</h3>
        <p className="text-xs text-slate-400 font-medium">{translations.dashboard.financialBreakdownDesc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 min-h-[220px]">
        
        {/* Revenue Line */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline text-xs font-semibold px-1">
            <span className="text-slate-500">{translations.dashboard.revenue}</span>
            <span className="text-slate-900 font-mono">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-24 p-2">
            <svg viewBox="0 0 100 40" className="h-full w-full" aria-label="Revenue line chart" role="img">
              <polyline
                points="0,34 100,34"
                fill="none"
                stroke="rgb(203 213 225)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <polyline
                points={revenuePoints}
                fill="none"
                stroke="rgb(16 185 129)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Expenses Line */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline text-xs font-semibold px-1">
            <span className="text-slate-500">{translations.dashboard.expenses}</span>
            <span className="text-slate-900 font-mono">${totalExpenses.toFixed(2)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-24 p-2">
            <svg viewBox="0 0 100 40" className="h-full w-full" aria-label="Expenses line chart" role="img">
              <polyline
                points="0,34 100,34"
                fill="none"
                stroke="rgb(203 213 225)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <polyline
                points={expensePoints}
                fill="none"
                stroke="rgb(244 63 94)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Net Profit Line */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline text-xs font-semibold px-1">
            <span className="text-slate-500">{translations.dashboard.netIncome}</span>
            <span className={`font-mono ${netProfit >= 0 ? 'text-teal-600' : 'text-amber-600'}`}>
              ${netProfit.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-24 p-2">
            <svg viewBox="0 0 100 40" className="h-full w-full" aria-label="Net income line chart" role="img">
              <polyline
                points="0,34 100,34"
                fill="none"
                stroke="rgb(203 213 225)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <polyline
                points={profitPoints}
                fill="none"
                stroke={netProfit >= 0 ? 'rgb(20 184 166)' : 'rgb(245 158 11)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}