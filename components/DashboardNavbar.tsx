'use client';

import Link from 'next/link';
import PradoLogo from '@/components/PradoLogo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDashboardNotifications } from '@/components/dashboard/DashboardNotificationContext';
import { getTranslations } from '@/lib/translations';

interface DashboardNavbarProps {
  userInitials?: string;
  userFirstName?: string;
  userFullName?: string;
  companyName?: string;
  userRole?: string;
}

export default function DashboardNavbar({
  userInitials = 'C',
  userFirstName = '',
  userFullName = '',
  companyName = '',
  userRole = '',
}: DashboardNavbarProps) {
  const params = useParams();
  const activeLocale = typeof params.lng === 'string' && params.lng.length > 0 ? params.lng : 'en';
  const isEs = activeLocale.toLowerCase().startsWith('es');
  const translations = getTranslations(activeLocale);
  const { hasIncompleteProfile, hasIncompleteOrgProfile, accountingWarnings } = useDashboardNotifications();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  
  const cleanedName = userFullName.trim();
  const displayFullName = (cleanedName && !cleanedName.includes('@')) ? cleanedName : 'Carlos Diaz del Valle';
  const displayCompanyName = companyName.trim() || 'Indeva Websites';
  const displayInitials = userInitials.trim() && userInitials !== 'U' ? userInitials : (displayFullName ? displayFullName.charAt(0).toUpperCase() : 'C');
  
  const roleDisplayMap: Record<string, { en: string; es: string }> = {
    owner: { en: 'Owner', es: 'Propietario' },
    admin: { en: 'Admin', es: 'Administrador' },
    member: { en: 'Member', es: 'Miembro' },
    technician: { en: 'Technician', es: 'Técnico' },
  };
  const formattedRole = userRole ? (roleDisplayMap[userRole.toLowerCase()]?.[isEs ? 'es' : 'en'] || (userRole.charAt(0).toUpperCase() + userRole.slice(1))) : null;
  const displayStatus = formattedRole || (isEs ? 'Autenticado' : 'Authenticated');
  
  const toggleSidebar = () => {
    const nextOpen = !isSidebarOpen;
    setIsSidebarOpen(nextOpen);
    window.dispatchEvent(new CustomEvent('prado:dashboard-sidebar-toggle', { detail: { open: nextOpen } }));
  };

  useEffect(() => {
    const handleSidebarState = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      if (typeof customEvent.detail?.open === 'boolean') {
        setIsSidebarOpen(customEvent.detail.open);
      }
    };

    window.addEventListener('prado:dashboard-sidebar-state', handleSidebarState as EventListener);
    return () => {
      window.removeEventListener('prado:dashboard-sidebar-state', handleSidebarState as EventListener);
    };
  }, []);

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

  const openSettingsMenu = () => {
    setShowNotifications(false);
    setShowSettingsMenu((current) => !current);
  };

  const closeSettingsMenu = () => {
    setShowSettingsMenu(false);
  };

  return (
    <nav className="w-full border-b border-gray-200 bg-white sticky top-0 z-50 px-6 py-3 select-none">
      <div className="mx-auto flex justify-between items-center">
        
        {/* Left Side: Logo Branding */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hover:opacity-95 transition">
            <PradoLogo theme="light" iconType="layers" badgeText="Dashboard" subtitle="Job & Field Operations" />
          </Link>
        </div>

        {/* Right Side: Account Settings Avatar & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="order-2 flex items-center gap-2 sm:gap-3">
            
            {/* Notification Bell Icon */}
            <div className="relative mt-0.5" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setShowNotifications((current) => !current)}
                className="tour-notification-icon relative h-8 w-8 cursor-pointer text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                aria-label={isEs ? 'Abrir notificaciones' : 'Open notifications'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="mx-auto h-5 w-5">
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

            {/* Vertical Divider */}
            <div className="h-6 w-[1px] bg-gray-200/90 mx-1 hidden sm:block" />

            {/* User Profile Avatar Dropdown (To the right of Notification Icon) */}
            <div className="relative">
              <button
                type="button"
                onClick={openSettingsMenu}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition hover:bg-slate-50 focus:outline-none cursor-pointer"
                aria-label={isEs ? 'Menú de usuario' : 'User menu'}
                aria-haspopup="menu"
                aria-expanded={showSettingsMenu}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-xs">
                  {displayInitials}
                </div>

                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-sm font-bold text-slate-800 tracking-tight">
                    {displayFullName}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {displayStatus}
                  </span>
                </div>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                    showSettingsMenu ? 'rotate-180' : ''
                  }`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showSettingsMenu ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={closeSettingsMenu} />
                  <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xl animate-fadeIn">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {displayFullName}
                      </p>
                      <p className="text-xs font-medium text-slate-400">
                        {displayCompanyName}
                      </p>
                    </div>

                    <div className="border-t border-gray-100 my-4" />

                    <form action={`/${activeLocale}/auth/signout`} method="POST">
                      <button
                        type="submit"
                        className="flex items-center gap-2.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.2}
                          stroke="currentColor"
                          className="h-4.5 w-4.5 shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                          />
                        </svg>
                        {isEs ? 'Cerrar sesión' : 'Sign Out'}
                      </button>
                    </form>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Mobile Hamburger Toggle Trigger Menu Button */}
          <button
            onClick={toggleSidebar}
            className="order-3 md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 focus:outline-none transition cursor-pointer"
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