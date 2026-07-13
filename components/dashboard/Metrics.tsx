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
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.totalInvoicedRevenue}</span>
        <span className="text-2xl font-bold text-gray-950 font-mono">${totalRevenue.toFixed(2)}</span>
      </div>
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.trackedExpenses}</span>
        <span className="text-2xl font-bold text-red-600 font-mono">${totalExpenses.toFixed(2)}</span>
      </div>
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <span className="text-xs uppercase font-medium text-gray-400 block mb-1">{translations.dashboard.netIncome}</span>
        <span className={`text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          ${netProfit.toFixed(2)}
        </span>
      </div>
    </section>
  );
}
