'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter, useParams } from 'next/navigation';
import { getTranslations } from '@/lib/translations';

interface DashboardSidebarProps {
  subscriptionStatus?: string | null; // 'trial' | 'individual' | 'growth' | 'enterprise'
  locale?: string;
  canViewImportExport?: boolean;
  canAccessPradoManagement?: boolean;
}

export default function DashboardSidebar({
  subscriptionStatus,
  locale = 'en',
  canViewImportExport = false,
  canAccessPradoManagement = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const lng = params.lng;
  const activeLocale = typeof lng === 'string' && lng.length > 0 ? lng : locale;
  const translations = getTranslations(locale);
  const isEs = activeLocale.toLowerCase().startsWith('es');
  
  // Check if mobile sidebar is open via URL parameters
  const isOpen = searchParams.get('sidebar') === 'open';

  // Premium features are visible during trial OR with growth/enterprise plans
  const showPremiumFeatures = subscriptionStatus !== 'individual';

  const linkStyle = (path: string) => {
    // Adjust the path for comparison to include the current language
    const localizedPath = `/${activeLocale}${path}`;
    // A more flexible check for "active" status, works for nested routes.
    // For example, /en/dashboard/customers will be active for /en/dashboard/customers/some-id
    const isActive = pathname.startsWith(localizedPath);

    // Exact match required for parent dashboard link
    if (path === '/dashboard' && pathname !== localizedPath) {
      return `flex items-center gap-2.5 px-3 py-1.5 text-sm transition rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`;
    }

    return `flex items-center gap-2.5 px-3 py-1.5 text-sm transition rounded-lg ${
      isActive 
        ? 'bg-emerald-50 text-emerald-800 font-semibold' 
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
    }`;
  };

  // Function to gracefully close the sidebar on mobile when a link is clicked
  const closeSidebar = () => {
    if (!isOpen) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sidebar');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const localizedHref = (path: string) => `/${activeLocale}${path}`;

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={closeSidebar}
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar Container Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-200 flex flex-col p-4 select-none shrink-0 
        transform transition-transform duration-300 ease-in-out
        md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:translate-x-0 md:z-auto
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'}
      `}>
        <div className="space-y-0.5 flex-1 overflow-y-auto overflow-x-hidden pt-2 md:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-2">{isEs ? 'Operaciones' : 'Operations'}</p>
          
          <Link href={localizedHref('/dashboard')} onClick={closeSidebar} className={linkStyle('/dashboard')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {translations.dashboard.overviewTerminal}
          </Link>

          <Link href={localizedHref('/dashboard/customers')} onClick={closeSidebar} className={linkStyle('/dashboard/customers')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {translations.dashboard.customerCrm}
          </Link>

          <Link href={localizedHref('/dashboard/estimates')} onClick={closeSidebar} className={linkStyle('/dashboard/estimates')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12h6m-6 3h3.75M3 16.5V7.5A2.25 2.25 0 015.25 5.25h5.379a1.125 1.125 0 01.795.33l5.121 5.121a1.125 1.125 0 01.33.795V16.5A2.25 2.25 0 0114.625 18.75h-9.375A2.25 2.25 0 013 16.5z" />
            </svg>
            {translations.dashboard.estimates}
          </Link>

          <Link href={localizedHref('/dashboard/schedule')} onClick={closeSidebar} className={linkStyle('/dashboard/schedule')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {translations.dashboard.jobScheduling}
          </Link>

          {/* PREMIUM CAPABILITIES: Available to Trial, Growth, and Enterprise */}
          {showPremiumFeatures && (
            <>
              <Link href={localizedHref('/dashboard/routing')} onClick={closeSidebar} className={linkStyle('/dashboard/routing')}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.856 1.928a1.125 1.125 0 01-1.006 0L9.503 3.813a1.125 1.125 0 00-1.006 0L3.622 6.565c-.383.19-.622.58-.622 1.006v12.166c0 .836.88 1.38 1.628 1.006l3.856-1.928a1.125 1.125 0 011.006 0l3.856 1.928a1.125 1.125 0 001.006 0z" />
                </svg>
                {translations.dashboard.dispatchRouting}
              </Link>

              <div className="pt-2 mt-1 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-2">
                  {isEs ? 'Finanzas' : 'Finances'}
                </p>

                <Link href={localizedHref('/dashboard/invoices-ledger')} onClick={closeSidebar} className={linkStyle('/dashboard/invoices-ledger')}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7.5 4.5h9A1.5 1.5 0 0118 6v12a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 18V6a1.5 1.5 0 011.5-1.5z" />
                  </svg>
                  Invoices Ledger
                </Link>

                <Link href={localizedHref('/dashboard/expense-ledger')} onClick={closeSidebar} className={linkStyle('/dashboard/expense-ledger')}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {translations.dashboard.expenseLedger}
                </Link>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-gray-100 mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-2">{translations.dashboard.management}</p>
            {canViewImportExport ? (
              <Link href={localizedHref('/dashboard/import-export')} onClick={closeSidebar} className={linkStyle('/dashboard/import-export')}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3m-4.5 6L12 4.5 16.5 9" />
                </svg>
                {translations.dashboard.importExport}
              </Link>
            ) : null}

            <Link href={localizedHref('/dashboard/print-reports')} onClick={closeSidebar} className={linkStyle('/dashboard/print-reports')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3.75A.75.75 0 016.75 3h10.5a.75.75 0 01.75.75V9M6 18h12m-12 0H5.25A2.25 2.25 0 013 15.75v-4.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v4.5A2.25 2.25 0 0118.75 18H18m-12 0v2.25c0 .414.336.75.75.75h10.5a.75.75 0 00.75-.75V18m-9 0h6" />
              </svg>
              {translations.dashboard.printReports}
            </Link>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-100">
          {canAccessPradoManagement ? (
            <Link href={localizedHref('/management')} onClick={closeSidebar} className={linkStyle('/management')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5M3.75 12h16.5m-16.5 6.75h16.5" />
              </svg>
              {isEs ? 'Consola Prado' : 'Prado Console'}
            </Link>
          ) : null}

          <Link
            href={localizedHref('/dashboard/help')}
            onClick={closeSidebar}
            className={linkStyle('/dashboard/help')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75v.008M9.75 10.5a2.25 2.25 0 114.5 0c0 1.5-2.25 1.875-2.25 3.375" />
            </svg>
            {isEs ? 'Ayuda' : 'Help'}
          </Link>

          <Link
            href={localizedHref('/dashboard/messenger')}
            onClick={closeSidebar}
            className={linkStyle('/dashboard/messenger')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 19.5A2.625 2.625 0 0021 16.875V7.125A2.625 2.625 0 0018.375 4.5H5.625A2.625 2.625 0 003 7.125v9.75A2.625 2.625 0 005.625 19.5h8.155a2.625 2.625 0 011.857.769l1.594 1.594a.375.375 0 00.64-.265V19.5h.504Z" />
            </svg>
            {isEs ? 'Messenger' : 'Messenger'}
          </Link>

          <div className="px-3 pt-3 text-[10px] leading-4 text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} Prado Systems. {translations.footer.copyright}
          </div>
        </div>
      </aside>
    </>
  );
}