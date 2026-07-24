'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { useDashboardNotifications } from '@/components/dashboard/DashboardNotificationContext';
import { getTranslations } from '@/lib/translations';

interface DashboardNavbarProps {
  userInitials?: string; // e.g., "CD" for Carlos Diaz
  userFirstName?: string;
}

export default function DashboardNavbar({ userInitials = "C", userFirstName = '' }: DashboardNavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = useParams();
  const activeLocale = typeof params.lng === 'string' && params.lng.length > 0 ? params.lng : 'en';
  const isEs = activeLocale.toLowerCase().startsWith('es');
  const translations = getTranslations(activeLocale);
  const { hasIncompleteProfile, hasIncompleteOrgProfile, accountingWarnings } = useDashboardNotifications();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  
  // Verify state criteria from current URL search parameters
  const isSidebarOpen = searchParams.get('sidebar') === 'open';

  const toggleSidebar = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isSidebarOpen) {
      params.delete('sidebar');
    } else {
      params.set('sidebar', 'open');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  const notifications = useMemo(() => {
    const notificationsList = [];

    if (hasIncompleteProfile) {
      notificationsList.push({
        id: 'profile-incomplete',
        title: isEs ? 'Completa tu perfil' : 'Complete your profile',
        body: isEs
          ? 'Agrega tu nombre, apellido y telefono para terminar la configuracion de tu cuenta.'
          : 'Add your first name, last name, and phone number to finish setting up your account.',
        href: `/${activeLocale}/dashboard/profile-settings`,
        cta: isEs ? 'Abrir perfil' : 'Open profile',
      });
    }

    if (hasIncompleteOrgProfile) {
      notificationsList.push({
        id: 'org-profile-incomplete',
        title: isEs ? 'Completa el perfil de la empresa' : 'Complete company profile',
        body: isEs
          ? 'Agrega telefono, direccion, ciudad, estado y codigo postal de tu empresa.'
          : 'Add phone, address, city, state, and zip code for your company.',
        href: `/${activeLocale}/dashboard/settings`,
        cta: isEs ? 'Ir a configuracion' : 'Go to settings',
      });
    }

    for (const warning of accountingWarnings) {
      notificationsList.push({
        id: `accounting-warning-${warning.source}`,
        title: warning.source === 'qbo'
          ? (isEs ? 'Alerta de QuickBooks' : 'QuickBooks alert')
          : (isEs ? 'Alerta de Xero' : 'Xero alert'),
        body: warning.message,
        href: `/${activeLocale}/dashboard/settings/integrations`,
        cta: isEs ? 'Revisar integraciones' : 'Review integrations',
      });
    }

    return notificationsList;
  }, [accountingWarnings, activeLocale, hasIncompleteProfile, hasIncompleteOrgProfile, isEs]);

  const unreadCount = notifications.length;
  const greeting = useMemo(() => {
    const firstName = userFirstName.trim();
    if (!firstName) return '';

    const hour = new Date().getHours();
    const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return `${salutation}, ${firstName}`;
  }, [userFirstName]);

  const openSettingsMenu = () => {
    setShowNotifications(false);
    setShowSettingsMenu((current) => !current);
  };

  const closeSettingsMenu = () => {
    setShowSettingsMenu(false);
  };

  const closeAllMenus = () => {
    setShowSettingsMenu(false);
    setShowNotifications(false);
  };

  return (
    <nav className="w-full border-b border-gray-200 bg-white sticky top-0 z-50 px-6 py-3 select-none">
      <div className="mx-auto flex justify-between items-center">
        
        {/* Left Side: Logo Branding */}
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition">
          <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
            </svg>
          </span>
          <span className="font-sans">Prado</span>
          <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 ml-1">
            Dashboard
          </span>
          {greeting ? <span className="ml-2 hidden sm:inline text-base font-semibold text-slate-700">{greeting}</span> : null}
        </Link>

        {/* Right Side: Account Settings Avatar & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={openSettingsMenu}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              aria-label={isEs ? 'Abrir configuracion' : 'Open settings'}
              aria-haspopup="menu"
              aria-expanded={showSettingsMenu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettingsMenu ? (
              <>
                <div className="fixed inset-0 z-40" onClick={closeSettingsMenu} />
                <div className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                <Link
                  href={`/${activeLocale}/dashboard/profile-settings`}
                  onClick={closeAllMenus}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  {isEs ? 'Perfil' : 'Profile Settings'}
                </Link>

                <Link
                  href={`/${activeLocale}/dashboard/settings`}
                  onClick={closeAllMenus}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {translations.dashboard.systemSettings}
                </Link>

                <form action={`/${activeLocale}/auth/signout`} method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    {translations.dashboard.signOutOfAccount}
                  </button>
                </form>
              </div>
              </>
            ) : null}
          </div>

          <div className="relative mt-0.5" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="tour-notification-icon relative h-8 w-8 cursor-pointer rounded-full border border-gray-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              aria-label={isEs ? 'Abrir notificaciones' : 'Open notifications'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="mx-auto h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9a6 6 0 00-12 0v.05-.05.7a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.081 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>

            {showNotifications ? (
              <div className="fixed left-1/2 top-16 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-xl md:absolute md:right-0 md:left-auto md:top-10 md:w-80 md:max-w-none md:translate-x-0">
                <div className="border-b border-gray-200 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isEs ? 'Notificaciones' : 'Notifications'}
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      {isEs ? 'No tienes notificaciones pendientes.' : 'You have no pending notifications.'}
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{notification.body}</p>
                        <Link
                          href={notification.href}
                          onClick={() => setShowNotifications(false)}
                          className="mt-3 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-600"
                        >
                          {notification.cta}
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Mobile Hamburger Toggle Trigger Menu Button */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 focus:outline-none transition cursor-pointer"
            aria-label="Toggle workspace side menu"
          >
            {isSidebarOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

      </div>
    </nav>
  );
}