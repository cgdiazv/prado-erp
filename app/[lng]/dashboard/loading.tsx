'use client';

export default function DashboardLoading() {
  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-5xl ml-0 animate-pulse">
        {/* A generic header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="space-y-2">
            <div className="h-7 w-56 rounded bg-slate-200" />
            <div className="h-3 w-96 rounded bg-slate-200" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-slate-200" />
        </div>

        {/* A generic content area skeleton */}
        <div className="mt-6 space-y-6">
          <div className="h-40 rounded-xl border border-gray-200 bg-white" />
          <div className="h-64 rounded-xl border border-gray-200 bg-white" />
        </div>
      </div>
    </main>
  );
}