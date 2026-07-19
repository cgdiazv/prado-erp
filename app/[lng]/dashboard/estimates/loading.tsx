'use client';

import { useParams } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function EstimatesLoading() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials="C" />

      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={undefined} locale={locale} canViewImportExport={false} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="space-y-2">
                <div className="h-7 w-56 rounded bg-slate-200" />
                <div className="h-3 w-96 rounded bg-slate-200" />
              </div>
              <div className="h-9 w-36 rounded-lg bg-slate-200" />
            </div>

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

            <div className="flex items-center gap-2">
              <div className="h-9 w-32 rounded-lg bg-slate-200" />
              <div className="h-9 w-24 rounded-lg bg-slate-200" />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="h-11 border-b border-gray-200 bg-slate-100" />
              <div className="divide-y divide-gray-200">
                <div className="h-14 bg-white" />
                <div className="h-14 bg-white" />
                <div className="h-14 bg-white" />
                <div className="h-14 bg-white" />
                <div className="h-14 bg-white" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
