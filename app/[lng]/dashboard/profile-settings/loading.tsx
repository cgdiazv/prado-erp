'use client';

import { useParams } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function ProfileSettingsLoading() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials="C" />

      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={undefined} locale={locale} canViewImportExport={false} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-6 text-left animate-pulse">
            <div className="border-b border-gray-200 pb-5">
              <div className="h-7 w-56 rounded bg-slate-200" />
              <div className="h-3 w-96 rounded bg-slate-200 mt-2" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-4">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="space-y-3">
                <div className="h-10 w-full rounded-lg bg-slate-100" />
                <div className="h-10 w-full rounded-lg bg-slate-100" />
                <div className="h-10 w-full rounded-lg bg-slate-100" />
              </div>
              <div className="h-9 w-32 rounded-lg bg-slate-200" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="h-12 bg-slate-100 border-b border-gray-200" />
              <div className="p-6 space-y-3">
                <div className="h-10 w-full rounded-lg bg-slate-100" />
                <div className="h-10 w-full rounded-lg bg-slate-100" />
                <div className="h-9 w-32 rounded-lg bg-slate-200" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
