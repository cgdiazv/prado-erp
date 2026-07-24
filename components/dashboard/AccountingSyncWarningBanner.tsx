'use client';

import Link from 'next/link';

interface AccountingWarningItem {
  source: 'qbo' | 'xero';
  message: string;
}

interface AccountingSyncWarningBannerProps {
  locale?: string;
  warnings: AccountingWarningItem[];
}

export default function AccountingSyncWarningBanner({ locale = 'en', warnings }: AccountingSyncWarningBannerProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-amber-950">
      <div className="mx-auto flex max-w-full flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0 1 18 0ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {isEs ? 'Hay alertas de sincronización contable' : 'There are accounting sync alerts'}
            </p>
            <div className="space-y-1 text-xs leading-relaxed text-amber-900">
              {warnings.map((warning) => (
                <p key={`${warning.source}-${warning.message}`}>
                  <span className="font-semibold uppercase">{warning.source}:</span> {warning.message}
                </p>
              ))}
            </div>
          </div>
        </div>

        <Link
          href={`/${locale}/dashboard/settings/integrations`}
          className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          {isEs ? 'Revisar integraciones' : 'Review integrations'}
        </Link>
      </div>
    </div>
  );
}
