import { getTranslations } from '@/lib/translations';

interface MetricsProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  locale?: string;
}

export default function Metrics({ totalRevenue, totalExpenses, netProfit, locale = 'en' }: MetricsProps) {
  const translations = getTranslations(locale);
  
  return (
    <section className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-6 mb-2 sm:mb-5 md:mb-8 sm:overflow-x-visible">
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-2.5 sm:p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-[10px] sm:text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.totalInvoicedRevenue}</span>
        <span className="text-lg sm:text-2xl font-bold text-emerald-600 font-mono">${totalRevenue.toFixed(2)}</span>
      </div>
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-2.5 sm:p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-[10px] sm:text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.trackedExpenses}</span>
        <span className="text-lg sm:text-2xl font-bold text-red-600 font-mono">${totalExpenses.toFixed(2)}</span>
      </div>
      <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white p-2.5 sm:p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-[10px] sm:text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.netIncome}</span>
        <span className={`text-lg sm:text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
          ${netProfit.toFixed(2)}
        </span>
      </div>
    </section>
  );
}
