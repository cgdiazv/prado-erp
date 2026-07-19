'use client';

import { useParams } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardLoading() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials="C" />

      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={undefined} locale={locale} canViewImportExport={false} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-8 text-left animate-pulse">
            {/* Header */}
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <div className="h-7 w-56 rounded bg-slate-200" />
              <div className="h-3 w-96 rounded bg-slate-200 mt-2" />
            </div>

            {/* View Toggle + Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                <div className="h-8 w-32 rounded-md bg-slate-200" />
                <div className="h-8 w-32 rounded-md bg-slate-200" />
              </div>
              <div className="flex gap-2 sm:flex-wrap">
                <div className="h-20 w-20 rounded-lg bg-slate-200" />
                <div className="h-20 w-20 rounded-lg bg-slate-200" />
                <div className="h-20 w-20 rounded-lg bg-slate-200" />
                <div className="h-20 w-20 rounded-lg bg-slate-200" />
              </div>
            </div>

            {/* Metric Cards */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible">
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto h-20 rounded-xl border border-gray-200 bg-white p-4">
                <div className="h-3 w-24 rounded bg-slate-200 mb-3" />
                <div className="h-6 w-16 rounded bg-slate-200" />
              </div>
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto h-20 rounded-xl border border-gray-200 bg-white p-4">
                <div className="h-3 w-24 rounded bg-slate-200 mb-3" />
                <div className="h-6 w-16 rounded bg-slate-200" />
              </div>
              <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto h-20 rounded-xl border border-gray-200 bg-white p-4">
                <div className="h-3 w-24 rounded bg-slate-200 mb-3" />
                <div className="h-6 w-16 rounded bg-slate-200" />
              </div>
            </div>

            {/* Priority Alerts Section */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="h-16 rounded-lg border border-gray-200 bg-slate-100" />
                <div className="h-16 rounded-lg border border-gray-200 bg-slate-100" />
                <div className="h-16 rounded-lg border border-gray-200 bg-slate-100" />
                <div className="h-16 rounded-lg border border-gray-200 bg-slate-100" />
              </div>
            </div>

            {/* Chart Section */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="h-4 w-40 rounded bg-slate-200 mb-4" />
              <div className="h-64 rounded-lg bg-slate-100" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
