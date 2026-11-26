'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams, useParams } from 'next/navigation';
import { DASHBOARD_MODULES, type DashboardModule } from '@/lib/dashboardRolePermissions.config';
import { canUseDispatchEngine, canUseExpenseLedger, canUseLiveTracking } from '@/lib/subscriptionAccess';
import { getTranslations } from '@/lib/translations';
import { Gift, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface DashboardSidebarProps {
  subscriptionStatus?: string | null; // 'trial' | 'individual' | 'growth' | 'enterprise'
  locale?: string;
  canViewImportExport?: boolean;
  allowedModules?: DashboardModule[];
}

export default function DashboardSidebar({
  subscriptionStatus,
  locale = 'en',
  canViewImportExport = false,
  allowedModules = [...DASHBOARD_MODULES],
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const lng = params.lng;
  const activeLocale = typeof lng === 'string' && lng.length > 0 ? lng : locale;
  const translations = getTranslations(locale);
  const isEs = activeLocale.toLowerCase().startsWith('es');
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem('prado_sidebar_collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('prado_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const isDispatchSublinkActive =
    pathname.startsWith(`/${activeLocale}/dashboard/tracking`) ||
    pathname.startsWith(`/${activeLocale}/dashboard/driver-shift`);

  const isMoneySublinkActive =
    pathname.startsWith(`/${activeLocale}/dashboard/payouts`) ||
    pathname.startsWith(`/${activeLocale}/dashboard/expense-ledger`);

  const [isDispatchExpanded, setIsDispatchExpanded] = useState<boolean>(false);
  const [isMoneyExpanded, setIsMoneyExpanded] = useState<boolean>(false);

  const toggleDispatchExpanded = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDispatchExpanded((prev) => {
      const next = !prev;
      if (next) {
        setIsMoneyExpanded(false);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('prado_dispatch_expanded', String(next));
        if (next) {
          localStorage.setItem('prado_money_expanded', 'false');
        }
      }
      return next;
    });
  };

  const toggleMoneyExpanded = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCollapsed) {
      setIsCollapsed(false);
      setIsMoneyExpanded(true);
      setIsDispatchExpanded(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('prado_sidebar_collapsed', 'false');
        localStorage.setItem('prado_money_expanded', 'true');
        localStorage.setItem('prado_dispatch_expanded', 'false');
      }
      return;
    }
    setIsMoneyExpanded((prev) => {
      const next = !prev;
      if (next) {
        setIsDispatchExpanded(false);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('prado_money_expanded', String(next));
        if (next) {
          localStorage.setItem('prado_dispatch_expanded', 'false');
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDispatchSublinkActive) {
      setIsDispatchExpanded(true);
      setIsMoneyExpanded(false);
      localStorage.setItem('prado_dispatch_expanded', 'true');
      localStorage.setItem('prado_money_expanded', 'false');
      return;
    }
    if (isMoneySublinkActive) {
      setIsMoneyExpanded(true);
      setIsDispatchExpanded(false);
      localStorage.setItem('prado_money_expanded', 'true');
      localStorage.setItem('prado_dispatch_expanded', 'false');
      return;
    }

    const savedDispatch = localStorage.getItem('prado_dispatch_expanded');
    const savedMoney = localStorage.getItem('prado_money_expanded');

    if (savedDispatch === 'true') {
      setIsDispatchExpanded(true);
      setIsMoneyExpanded(false);
      if (savedMoney === 'true') {
        localStorage.setItem('prado_money_expanded', 'false');
      }
    } else if (savedMoney === 'true') {
      setIsMoneyExpanded(true);
      setIsDispatchExpanded(false);
    } else {
      setIsDispatchExpanded(false);
      setIsMoneyExpanded(false);
    }
  }, [isDispatchSublinkActive, isMoneySublinkActive]);

  useEffect(() => {
    // Keep backward compatibility for links that may still include ?sidebar=open
    const openFromUrl = searchParams.get('sidebar') === 'open';
    if (openFromUrl) {
      setIsOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      if (typeof customEvent.detail?.open === 'boolean') {
        setIsOpen(customEvent.detail.open);
        return;
      }

      setIsOpen((current) => !current);
    };

    window.addEventListener('prado:dashboard-sidebar-toggle', handleToggle as EventListener);
    return () => {
      window.removeEventListener('prado:dashboard-sidebar-toggle', handleToggle as EventListener);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('prado:dashboard-sidebar-state', { detail: { open: isOpen } }));
  }, [isOpen]);

  const hasModuleAccess = (moduleId: DashboardModule) => allowedModules.includes(moduleId);
  const canAccessDispatch = canUseDispatchEngine(subscriptionStatus);
  const canAccessLiveTracking = canUseLiveTracking(subscriptionStatus);
  const canAccessExpenses = canUseExpenseLedger(subscriptionStatus);
  const canShowMoneyGroup =
    hasModuleAccess('invoice') || (canAccessExpenses && hasModuleAccess('expenses'));

  const linkStyle = (path: string) => {
    const localizedPath = `/${activeLocale}${path}`;
    const isActive = pathname.startsWith(localizedPath);
    const collapseAlign = isCollapsed ? 'md:justify-center md:px-2' : '';

    if (path === '/dashboard' && pathname !== localizedPath) {
      return `flex items-center gap-2.5 px-3 py-2 text-sm transition rounded-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium border-l-2 border-transparent ${collapseAlign}`;
    }

    return `flex items-center gap-2.5 px-3 py-2 text-sm transition rounded-sm ${collapseAlign} ${
      isActive
        ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-2 border-emerald-600'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium border-l-2 border-transparent'
    }`;
  };

  const sublinkStyle = (path: string) => {
    const localizedPath = `/${activeLocale}${path}`;
    const isActive = pathname.startsWith(localizedPath);

    return `flex items-center gap-2 px-2.5 py-1.5 text-xs transition rounded-sm ${
      isActive
        ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-2 border-emerald-600'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium border-l-2 border-transparent'
    }`;
  };

  const iconStyle = (path: string) => {
    const localizedPath = `/${activeLocale}${path}`;
    const isActive = path === '/dashboard' ? pathname === localizedPath : pathname.startsWith(localizedPath);

    return `w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-600' : 'text-current'}`;
  };

  const closeSidebar = () => {
    setIsOpen(false);
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
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col p-3 select-none shrink-0 
        transform transition-[width,transform] duration-200 ease-in-out
        ${isCollapsed ? 'md:w-16 md:px-2' : 'md:w-56'}
        md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:translate-x-0 md:z-auto
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'}
      `}
      >
        {/* Desktop Expand Button (Stacked over Dashboard only when collapsed) */}
        {isCollapsed ? (
          <div className="hidden md:flex items-center justify-center mb-1">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              title={isEs ? 'Expandir barra lateral' : 'Expand sidebar'}
              aria-label="Expand sidebar"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        <div className="space-y-0.25 flex-1 overflow-y-auto overflow-x-hidden pt-2 md:pt-0">
          <div
            className={`flex items-center justify-between rounded-sm transition border-l-2 ${
              pathname === localizedHref('/dashboard')
                ? 'bg-emerald-50 text-emerald-800 font-semibold border-emerald-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium border-transparent'
            }`}
          >
            <Link
              href={localizedHref('/dashboard')}
              onClick={closeSidebar}
              title={translations.dashboard.overviewTerminal}
              className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-sm min-w-0 ${
                isCollapsed ? 'md:justify-center md:px-2' : ''
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{translations.dashboard.overviewTerminal}</span>
            </Link>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                title={isEs ? 'Colapsar barra lateral' : 'Collapse sidebar'}
                aria-label="Collapse sidebar"
                className="hidden md:inline-flex p-1.5 mr-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition cursor-pointer shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {hasModuleAccess('customers') ? (
            <Link
              href={localizedHref('/dashboard/customers')}
              onClick={closeSidebar}
              title={translations.dashboard.customerCrm}
              className={linkStyle('/dashboard/customers')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard/customers')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <span className={isCollapsed ? 'md:hidden' : ''}>{translations.dashboard.customerCrm}</span>
            </Link>
          ) : null}

          {hasModuleAccess('estimates') ? (
            <Link
              href={localizedHref('/dashboard/estimates')}
              onClick={closeSidebar}
              title={translations.dashboard.estimates}
              className={linkStyle('/dashboard/estimates')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard/estimates')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12h6m-6 3h3.75M3 16.5V7.5A2.25 2.25 0 015.25 5.25h5.379a1.125 1.125 0 01.795.33l5.121 5.121a1.125 1.125 0 01.33.795V16.5A2.25 2.25 0 0114.625 18.75h-9.375A2.25 2.25 0 013 16.5z" />
              </svg>
              <span className={isCollapsed ? 'md:hidden' : ''}>{translations.dashboard.estimates}</span>
            </Link>
          ) : null}

          {hasModuleAccess('jobs') ? (
            <Link
              href={localizedHref('/dashboard/schedule')}
              onClick={closeSidebar}
              title={translations.dashboard.jobScheduling}
              className={linkStyle('/dashboard/schedule')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard/schedule')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className={isCollapsed ? 'md:hidden' : ''}>{translations.dashboard.jobScheduling}</span>
            </Link>
          ) : null}

          {hasModuleAccess('invoice') ? (
            <Link
              href={localizedHref('/dashboard/invoices-ledger')}
              onClick={closeSidebar}
              title="Invoices"
              className={linkStyle('/dashboard/invoices-ledger')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard/invoices-ledger')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7.5 4.5h9A1.5 1.5 0 0118 6v12a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 18V6a1.5 1.5 0 011.5-1.5z" />
              </svg>
              <span className={isCollapsed ? 'md:hidden' : ''}>Invoices</span>
            </Link>
          ) : null}

          {canAccessDispatch && hasModuleAccess('dispatch') ? (
            <div className="space-y-0.5">
              <div
                className={`flex items-center justify-between rounded-sm transition border-l-2 ${
                  pathname.startsWith(`/${activeLocale}/dashboard/routing`)
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-600'
                    : 'hover:bg-gray-50 text-gray-600 border-transparent'
                }`}
              >
                <Link
                  href={localizedHref('/dashboard/routing')}
                  onClick={closeSidebar}
                  title={translations.dashboard.dispatchRouting}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-sm font-medium hover:text-gray-900 min-w-0 ${
                    isCollapsed ? 'md:justify-center md:px-2' : ''
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard/routing')}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.856 1.928a1.125 1.125 0 01-1.006 0L9.503 3.813a1.125 1.125 0 00-1.006 0L3.622 6.565c-.383.19-.622.58-.622 1.006v12.166c0 .836.88 1.38 1.628 1.006l3.856-1.928a1.125 1.125 0 011.006 0l3.856 1.928a1.125 1.125 0 001.006 0z" />
                  </svg>
                  <span className={`whitespace-nowrap truncate ${isCollapsed ? 'md:hidden' : ''} ${pathname.startsWith(`/${activeLocale}/dashboard/routing`) ? 'font-semibold' : ''}`}>
                    {translations.dashboard.dispatchRouting}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={toggleDispatchExpanded}
                  title={isDispatchExpanded ? (isEs ? 'Colapsar subenlaces' : 'Collapse sublinks') : (isEs ? 'Expandir subenlaces' : 'Expand sublinks')}
                  aria-label={isDispatchExpanded ? 'Collapse sublinks' : 'Expand sublinks'}
                  aria-expanded={isDispatchExpanded}
                  className={`p-1.5 mr-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition cursor-pointer ${
                    isCollapsed ? 'md:hidden' : ''
                  }`}
                >
                  {isDispatchExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {isDispatchExpanded ? (
                <div className={`ml-5 pl-2.5 border-l border-slate-200 space-y-0.5 ${isCollapsed ? 'md:hidden' : ''}`}>
                  {canAccessLiveTracking ? (
                    <Link href={localizedHref('/dashboard/tracking')} onClick={closeSidebar} className={sublinkStyle('/dashboard/tracking')}>
                      <span>{translations.dashboard.liveTracking}</span>
                    </Link>
                  ) : null}
                  <Link href={localizedHref('/dashboard/driver-shift')} onClick={closeSidebar} className={sublinkStyle('/dashboard/driver-shift')}>
                    <span>{translations.dashboard.driverShiftPortal}</span>
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {canShowMoneyGroup ? (
            <div className="space-y-0.5">
              <div
                className={`flex items-center justify-between rounded-sm transition border-l-2 ${
                  isMoneySublinkActive
                    ? 'text-emerald-800 border-transparent'
                    : 'hover:bg-gray-50 text-gray-600 border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={toggleMoneyExpanded}
                  title={isEs ? 'Dinero' : 'Money'}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-sm font-medium hover:text-gray-900 min-w-0 text-left cursor-pointer ${
                    isCollapsed ? 'md:justify-center md:px-2' : ''
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`w-4 h-4 shrink-0 transition-colors ${isMoneySublinkActive ? 'text-emerald-600' : 'text-current'}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`whitespace-nowrap truncate ${isCollapsed ? 'md:hidden' : ''} ${isMoneySublinkActive ? 'font-semibold' : ''}`}>
                    {isEs ? 'Dinero' : 'Money'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={toggleMoneyExpanded}
                  title={isMoneyExpanded ? (isEs ? 'Colapsar subenlaces' : 'Collapse sublinks') : (isEs ? 'Expandir subenlaces' : 'Expand sublinks')}
                  aria-label={isMoneyExpanded ? 'Collapse sublinks' : 'Expand sublinks'}
                  aria-expanded={isMoneyExpanded}
                  className={`p-1.5 mr-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition cursor-pointer ${
                    isCollapsed ? 'md:hidden' : ''
                  }`}
                >
                  {isMoneyExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {isMoneyExpanded ? (
                <div className={`ml-5 pl-2.5 border-l border-slate-200 space-y-0.5 ${isCollapsed ? 'md:hidden' : ''}`}>
                  {hasModuleAccess('invoice') ? (
                    <Link href={localizedHref('/dashboard/payouts')} onClick={closeSidebar} className={sublinkStyle('/dashboard/payouts')}>
                      <span>{isEs ? 'Pagos' : 'Payouts'}</span>
                    </Link>
                  ) : null}
                  {canAccessExpenses && hasModuleAccess('expenses') ? (
                    <Link href={localizedHref('/dashboard/expense-ledger')} onClick={closeSidebar} className={sublinkStyle('/dashboard/expense-ledger')}>
                      <span>{translations.dashboard.expenses}</span>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <Link
            href={localizedHref('/dashboard/print-reports')}
            onClick={closeSidebar}
            title={translations.dashboard.reports}
            className={linkStyle('/dashboard/print-reports')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard/print-reports')}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className={isCollapsed ? 'md:hidden' : ''}>{translations.dashboard.reports}</span>
          </Link>

          <div className="pt-4 border-t border-gray-100 mt-4 space-y-1">
            <Link
              href={localizedHref('/dashboard/help')}
              onClick={closeSidebar}
              title={isEs ? 'Ayuda' : 'Help'}
              className={linkStyle('/dashboard/help')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconStyle('/dashboard/help')}>
                <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
              </svg>
              <span className={isCollapsed ? 'md:hidden' : ''}>{isEs ? 'Ayuda' : 'Help'}</span>
            </Link>

            <Link
              href={localizedHref('/dashboard/settings/manage-subscription')}
              onClick={closeSidebar}
              title={isEs ? 'Invita y Gana 50%' : 'Invite & Earn 50%'}
              className={`mt-2 group flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 transition shadow-2xs ${
                isCollapsed ? 'md:justify-center md:px-2' : ''
              }`}
            >
              <Gift className="w-4 h-4 text-emerald-600 shrink-0 transition-transform group-hover:scale-110" />
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{isEs ? 'Invita y Gana 50%' : 'Invite & Earn 50%'}</span>
            </Link>
          </div>
        </div>

        <div className={`pt-2 ${isCollapsed ? 'md:hidden' : ''}`}>
          <div className="px-3 pt-1 text-[10px] leading-4 text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} Prado Systems. {translations.footer.copyright}
          </div>
        </div>
      </aside>
    </>
  );
}
