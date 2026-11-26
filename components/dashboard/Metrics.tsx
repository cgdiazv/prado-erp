import { getTranslations } from '@/lib/translations';

interface MetricsProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingReceivables: number;
  trends: {
    revenue: { direction: 'up' | 'down'; percentage: number };
    expenses: { direction: 'up' | 'down'; percentage: number };
    netProfit: { direction: 'up' | 'down'; percentage: number };
    receivables: { direction: 'up' | 'down'; percentage: number };
  };
  locale?: string;
}

export default function Metrics({
  totalRevenue,
  totalExpenses,
  netProfit,
  outstandingReceivables,
  trends,
  locale = 'en',
}: MetricsProps) {
  const translations = getTranslations(locale);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const renderTrend = (
    trend: { direction: 'up' | 'down'; percentage: number },
    invertColor = false
  ) => {
    const isPositive = invertColor
      ? trend.direction === 'down' || trend.percentage === 0
      : trend.direction === 'up';
    const colorClass = isPositive ? 'text-emerald-600' : 'text-rose-600';

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
      <section className="tour-metrics flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3.5 mb-2 sm:mb-5 md:mb-8 sm:overflow-x-visible">
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-3.5 sm:p-5 rounded-lg shadow-2xs border border-slate-200">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1.5">{translations.dashboard.totalInvoicedRevenue}</span>
        <span className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-slate-900 block">{formatCurrency(totalRevenue)}</span>
        {renderTrend(trends.revenue)}
      </div>
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-3.5 sm:p-5 rounded-lg shadow-2xs border border-slate-200">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1.5">{translations.dashboard.trackedExpenses}</span>
        <span className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-slate-900 block">{formatCurrency(totalExpenses)}</span>
        {renderTrend(trends.expenses)}
      </div>
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-3.5 sm:p-5 rounded-lg shadow-2xs border border-slate-200">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1.5">{translations.dashboard.netIncome}</span>
        <span className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-slate-900 block">
          {formatCurrency(netProfit)}
        </span>
        {renderTrend(trends.netProfit)}
      </div>
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-3.5 sm:p-5 rounded-lg shadow-2xs border border-slate-200">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1.5">{translations.dashboard.outstandingReceivables}</span>
        <span className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-slate-900 block">{formatCurrency(outstandingReceivables)}</span>
        {renderTrend(trends.receivables, true)}
      </div>
    </section>
    </div>
  );
}
