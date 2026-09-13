'use client';

import { Skeleton } from '@/components/Skeleton';

export default function DashboardLoading() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 space-y-8 text-left">
        {/* A generic header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56 rounded" />
            <Skeleton className="h-3 w-80 sm:w-96 rounded" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>

        {/* A generic content area skeleton */}
        <div className="mt-6 space-y-6">
          <div className="p-6 rounded-xl border border-gray-200 bg-white space-y-4">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="p-6 rounded-xl border border-gray-200 bg-white space-y-4">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
}