'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type DashboardView = 'operations' | 'financials';

interface DashboardViewToggleProps {
  activeView: DashboardView;
  operationsLabel: string;
  financialsLabel: string;
}

const STORAGE_KEY = 'dashboard:viewMode';

function isDashboardView(value: string | null): value is DashboardView {
  return value === 'operations' || value === 'financials';
}

export default function DashboardViewToggle({
  activeView,
  operationsLabel,
  financialsLabel,
}: DashboardViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentView = searchParams.get('view');

    if (isDashboardView(currentView)) {
      window.localStorage.setItem(STORAGE_KEY, currentView);
      return;
    }

    const storedView = window.localStorage.getItem(STORAGE_KEY);
    if (!isDashboardView(storedView)) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('view', storedView);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [pathname, router, searchParams]);

  const handleSelect = (view: DashboardView) => {
    window.localStorage.setItem(STORAGE_KEY, view);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('view', view);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="mt-4 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
      <button
        type="button"
        onClick={() => handleSelect('operations')}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          activeView === 'operations' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {operationsLabel}
      </button>
      <button
        type="button"
        onClick={() => handleSelect('financials')}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          activeView === 'financials' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {financialsLabel}
      </button>
    </div>
  );
}
