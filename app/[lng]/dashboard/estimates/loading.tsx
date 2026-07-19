'use client';

export default function EstimatesLoading() {
  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-5xl ml-0 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left animate-pulse">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="h-7 w-48 rounded bg-slate-200" />
            <div className="h-3 w-96 rounded bg-slate-200 mt-2" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-slate-200" />
        </div>

        {/* Summary Cards */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible mb-2 sm:mb-5 md:mb-2">
          <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto h-20 rounded-xl border border-gray-200 bg-white" />
          <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto h-20 rounded-xl border border-gray-200 bg-white" />
          <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto h-20 rounded-xl border border-gray-200 bg-white" />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 md:mb-3">
          <div className="h-9 w-full sm:w-96 rounded-lg bg-slate-100" />
          <div className="h-9 w-full sm:w-72 rounded-lg bg-slate-100" />
        </div>

        {/* Table */}
        <div className="h-96 rounded-xl border border-gray-200 bg-white" />
      </div>
    </main>
  );
}