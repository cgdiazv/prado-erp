'use client';

import { Skeleton } from '@/components/Skeleton';

export default function EstimatesLoading() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-3 w-80 sm:w-96 rounded mt-2" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>

        {/* Summary Cards */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible mb-2 sm:mb-5 md:mb-2">
          {[1, 2, 3].map((cardIdx) => (
            <div
              key={cardIdx}
              className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto h-20 p-3.5 rounded-xl border border-gray-200 bg-white flex flex-col justify-between"
            >
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-28 rounded" />
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 md:mb-3">
          <Skeleton className="h-9 w-full sm:w-96 rounded-lg" />
          <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
        </div>

        {/* Table Placeholder */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((rowIdx) => (
              <div
                key={rowIdx}
                className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0"
              >
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-44 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-20 rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}