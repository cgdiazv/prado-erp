'use client';

interface PerformanceChartProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export default function PerformanceChart({ totalRevenue, totalExpenses, netProfit }: PerformanceChartProps) {
  // Graceful fallback to prevent division by zero if there's no data yet
  const maxVal = Math.max(totalRevenue, totalExpenses, Math.abs(netProfit), 1000);
  
  // Calculate relative percentages for CSS flex bars
  const revHeight = Math.max((totalRevenue / maxVal) * 100, 4);
  const expHeight = Math.max((totalExpenses / maxVal) * 100, 4);
  const profHeight = Math.max((Math.abs(netProfit) / maxVal) * 100, 4);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs max-w-5xl">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">Financial breakdown</h3>
        <p className="text-xs text-slate-400 font-medium">Visual comparison of workspace revenue pipelines vs cash outlays</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 min-h-[220px]">
        
        {/* Revenue Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline text-xs font-semibold px-1">
            <span className="text-slate-500">Revenue</span>
            <span className="text-slate-900 font-mono">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-24 flex items-end overflow-hidden">
            <div 
              style={{ height: `${revHeight}%` }} 
              className="w-full bg-emerald-500/80 hover:bg-emerald-500 transition-all duration-500 rounded-b-md"
            />
          </div>
        </div>

        {/* Expenses Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline text-xs font-semibold px-1">
            <span className="text-slate-500">Expenses</span>
            <span className="text-slate-900 font-mono">${totalExpenses.toFixed(2)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-24 flex items-end overflow-hidden">
            <div 
              style={{ height: `${expHeight}%` }} 
              className="w-full bg-rose-500/80 hover:bg-rose-500 transition-all duration-500 rounded-b-md"
            />
          </div>
        </div>

        {/* Net Profit Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline text-xs font-semibold px-1">
            <span className="text-slate-500">Net Income</span>
            <span className={`font-mono ${netProfit >= 0 ? 'text-teal-600' : 'text-amber-600'}`}>
              ${netProfit.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-24 flex items-end overflow-hidden">
            <div 
              style={{ height: `${profHeight}%` }} 
              className={`w-full transition-all duration-500 rounded-b-md ${
                netProfit >= 0 ? 'bg-teal-500/80 hover:bg-teal-500' : 'bg-amber-500/80 hover:bg-amber-500'
              }`}
            />
          </div>
        </div>

      </div>
    </div>
  );
}