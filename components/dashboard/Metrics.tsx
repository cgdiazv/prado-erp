import { getTranslations } from '@/lib/translations';

interface MetricsProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  trends: {
    revenue: { direction: 'up' | 'down'; percentage: number };
    expenses: { direction: 'up' | 'down'; percentage: number };
    netProfit: { direction: 'up' | 'down'; percentage: number };
  };
  locale?: string;
}

export default function Metrics({ totalRevenue, totalExpenses, netProfit, trends, locale = 'en' }: MetricsProps) {
  const translations = getTranslations(locale);

  const renderTrend = (trend: { direction: 'up' | 'down'; percentage: number }) => {
    const colorClass = trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600';

    return (
      <span className={`mt-1 flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${colorClass}`}>
        {trend.direction === 'up' ? (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
            <path d="M5 1L9 8H1L5 1Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
            <path d="M1 2H9L5 9L1 2Z" />
          </svg>
        )}
        {trend.percentage.toFixed(1)}%
      </span>
    );
  };
  
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{translations.dashboard.businessPerformance}</h2>
      <section className="tour-metrics flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-6 mb-2 sm:mb-5 md:mb-8 sm:overflow-x-visible">
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-2.5 sm:p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-[10px] sm:text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.totalInvoicedRevenue}</span>
        <span className="text-lg sm:text-xl font-extrabold text-emerald-600">${totalRevenue.toFixed(2)}</span>
        {renderTrend(trends.revenue)}
      </div>
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-2.5 sm:p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-[10px] sm:text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.trackedExpenses}</span>
        <span className="text-lg sm:text-xl font-extrabold text-red-600">${totalExpenses.toFixed(2)}</span>
        {renderTrend(trends.expenses)}
      </div>
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-2.5 sm:p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-[10px] sm:text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.netIncome}</span>
        <span className={`text-lg sm:text-xl font-extrabold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
          ${netProfit.toFixed(2)}
        </span>
        {renderTrend(trends.netProfit)}
      </div>
    </section>
    </div>
  );
}
