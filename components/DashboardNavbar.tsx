'use client';

import Link from 'next/link';
import PradoLogo from '@/components/PradoLogo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDashboardNotifications } from '@/components/dashboard/DashboardNotificationContext';
import {
  Bell,
  Briefcase,
  Check,
  CheckCheck,
  FileText,
  Loader2,
  Receipt,
  Smartphone,
  Users,
  X,
} from 'lucide-react';

interface DashboardNavbarProps {
  userInitials?: string;
  userFirstName?: string;
  userFullName?: string;
  companyName?: string;
  userRole?: string;
}

function formatRelativeTime(dateString: string, isEs: boolean) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSec < 60) return isEs ? 'Hace un momento' : 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isEs ? `Hace ${diffMin}m` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return isEs ? `Hace ${diffHours}h` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return isEs ? `Hace ${diffDays}d` : `${diffDays}d ago`;
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

  const {
    hasIncompleteProfile,
    hasIncompleteOrgProfile,
    accountingWarnings,
    dbNotifications,
    totalUnreadCount,
    pushStatus,
    markAsRead,
    deleteNotification,
    enablePushNotifications,
    disablePushNotifications,
  } = useDashboardNotifications();

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const cleanedName = userFullName.trim();
  const displayFullName = (cleanedName && !cleanedName.includes('@')) ? cleanedName : 'Carlos Diaz del Valle';
  const displayCompanyName = companyName.trim() || 'Indeva Websites';
  const displayInitials = userInitials.trim() && userInitials !== 'U'
    ? userInitials
    : (userFirstName.trim() ? userFirstName.trim().charAt(0).toUpperCase() : (displayFullName ? displayFullName.charAt(0).toUpperCase() : 'C'));

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

  // System warnings
  const staticWarnings = useMemo(() => {
    const list = [];

    if (hasIncompleteProfile) {
      list.push({
        id: 'profile-incomplete',
        title: isEs ? 'Completa tu perfil' : 'Complete your profile',
        body: isEs
          ? 'Agrega tu nombre, apellido y teléfono para terminar la configuración.'
          : 'Add your first name, last name, and phone number to finish setting up your account.',
        href: `/${activeLocale}/dashboard/profile-settings`,
        cta: isEs ? 'Abrir perfil' : 'Open profile',
      });
    }

    if (hasIncompleteOrgProfile) {
      list.push({
        id: 'org-profile-incomplete',
        title: isEs ? 'Completa el perfil de la empresa' : 'Complete company profile',
        body: isEs
          ? 'Agrega teléfono, dirección, ciudad, estado y código postal de tu empresa.'
          : 'Add phone, address, city, state, and zip code for your company.',
        href: `/${activeLocale}/dashboard/settings`,
        cta: isEs ? 'Ir a configuración' : 'Go to settings',
      });
    }

    for (const warning of accountingWarnings) {
      list.push({
        id: `accounting-warning-${warning.source}`,
        title: warning.source === 'qbo'
          ? (isEs ? 'Alerta de QuickBooks' : 'QuickBooks alert')
          : (isEs ? 'Alerta de Xero' : 'Xero alert'),
        body: warning.message,
        href: `/${activeLocale}/dashboard/settings/integrations`,
        cta: isEs ? 'Revisar integraciones' : 'Review integrations',
      });
    }

    return list;
  }, [accountingWarnings, activeLocale, hasIncompleteProfile, hasIncompleteOrgProfile, isEs]);

  const handleTogglePush = async () => {
    setIsSubscribingPush(true);
    try {
      if (pushStatus.isSubscribed) {
        await disablePushNotifications();
      } else {
        const res = await enablePushNotifications();
        if (!res.success && res.error) {
          alert(res.error);
        }
      }
    } finally {
      setIsSubscribingPush(false);
    }
  };


  const openSettingsMenu = () => {
    setShowNotifications(false);
    setShowSettingsMenu((current) => !current);
  };

  const closeSettingsMenu = () => {
    setShowSettingsMenu(false);
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'job':
        return <Briefcase className="h-4 w-4 text-emerald-600" />;
      case 'quote':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'invoice':
        return <Receipt className="h-4 w-4 text-purple-600" />;
      case 'customer':
        return <Users className="h-4 w-4 text-amber-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const renderTypeLabel = (type: string) => {
    switch (type) {
      case 'job':
        return isEs ? 'Trabajo' : 'Job';
      case 'quote':
        return isEs ? 'Cotización' : 'Quote';
      case 'invoice':
        return isEs ? 'Factura' : 'Invoice';
      case 'customer':
        return isEs ? 'Cliente' : 'Customer';
      default:
        return isEs ? 'Actualización' : 'Update';
    }
  };

  return (
    <nav className="w-full border-b border-gray-200 bg-white sticky top-0 z-50 px-6 py-3 select-none">
      <div className="mx-auto flex justify-between items-center">
        {/* Left Side: Logo Branding */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hover:opacity-95 transition">
            <PradoLogo theme="light" iconType="layers" />
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
                className="tour-notification-icon relative h-8 w-8 cursor-pointer rounded-lg text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                aria-label={isEs ? 'Abrir notificaciones' : 'Open notifications'}
              >
                <Bell className="mx-auto h-5 w-5" />
                {totalUnreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white animate-pulse">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                ) : null}
              </button>

              {showNotifications ? (
                <div className="fixed left-1/2 top-16 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-gray-200 bg-white shadow-2xl md:absolute md:right-0 md:left-auto md:top-10 md:w-96 md:max-w-none md:translate-x-0 overflow-hidden animate-fadeIn">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {isEs ? 'Notificaciones' : 'Notifications'}
                      </p>
                      {totalUnreadCount > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {totalUnreadCount} {isEs ? 'nuevas' : 'new'}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {totalUnreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => markAsRead('all')}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                          title={isEs ? 'Marcar todo como leído' : 'Mark all as read'}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span>{isEs ? 'Leído' : 'Mark read'}</span>
                        </button>
                      ) : null}

                    </div>
                  </div>

                  {/* Web Push PWA Device Banner */}
                  {pushStatus.isSupported ? (
                    <div className="border-b border-gray-100 bg-emerald-50/50 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Smartphone className="h-4 w-4 shrink-0 text-emerald-600" />
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 leading-tight">
                            {pushStatus.isSubscribed
                              ? (isEs ? 'Notificaciones en pantalla activa' : 'Homescreen push active')
                              : (isEs ? 'Activar notificaciones en el móvil' : 'Receive updates on homescreen')}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {pushStatus.isSubscribed
                              ? (isEs ? 'Este dispositivo recibe alertas' : 'This device receives push alerts')
                              : (isEs ? 'Recibe avisos de Jobs y Facturas' : 'Get Job & Invoice alerts instantly')}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleTogglePush}
                        disabled={isSubscribingPush}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                          pushStatus.isSubscribed
                            ? 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                        }`}
                      >
                        {isSubscribingPush ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : pushStatus.isSubscribed ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-700" />
                            <span>{isEs ? 'Activo' : 'Active'}</span>
                          </>
                        ) : (
                          <span>{isEs ? 'Activar' : 'Enable'}</span>
                        )}
                      </button>
                    </div>
                  ) : null}

                  {/* Notification Items List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {/* Setup Warnings */}
                    {staticWarnings.map((warning) => (
                      <div key={warning.id} className="p-3 bg-amber-50/50 hover:bg-amber-50 transition">
                        <p className="text-xs font-bold text-slate-900">{warning.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{warning.body}</p>
                        <Link
                          href={warning.href}
                          onClick={() => setShowNotifications(false)}
                          className="mt-2 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          {warning.cta} &rarr;
                        </Link>
                      </div>
                    ))}

                    {/* Database Notifications */}
                    {dbNotifications.length === 0 && staticWarnings.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Bell className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium text-slate-600">
                          {isEs ? 'No tienes notificaciones pendientes.' : 'You have no notifications yet.'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {isEs
                            ? 'Las actualizaciones de Jobs, Facturas y Clientes aparecerán aquí.'
                            : 'Updates for Jobs, Invoices, and Customers will appear here.'}
                        </p>
                      </div>
                    ) : (
                      dbNotifications.map((notification) => {
                        const isUnread = !notification.read_at;
                        const linkTarget = notification.link_url || `/${activeLocale}/dashboard`;

                        return (
                          <div
                            key={notification.id}
                            className={`p-3 transition relative flex items-start gap-3 hover:bg-slate-50 ${
                              isUnread ? 'bg-emerald-50/20' : 'bg-white'
                            }`}
                          >
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                              {renderNotificationIcon(notification.type)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                  {renderTypeLabel(notification.type)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatRelativeTime(notification.created_at, isEs)}
                                </span>
                              </div>

                              <Link
                                href={linkTarget}
                                onClick={() => {
                                  if (isUnread) markAsRead(notification.id);
                                  setShowNotifications(false);
                                }}
                                className="block mt-1 group"
                              >
                                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                                  {notification.title}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                  {notification.body}
                                </p>
                              </Link>
                            </div>

                            <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                              {isUnread ? (
                                <button
                                  type="button"
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                  title={isEs ? 'Marcar como leído' : 'Mark as read'}
                                >
                                  <span className="block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => deleteNotification(notification.id)}
                                className="p-1 text-slate-300 hover:text-slate-600 transition cursor-pointer"
                                title={isEs ? 'Eliminar notificación' : 'Dismiss notification'}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
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