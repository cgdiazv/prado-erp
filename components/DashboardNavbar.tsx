'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabaseClient';
import { useDashboardNotifications } from '@/components/dashboard/DashboardNotificationContext';

interface DashboardNavbarProps {
  userInitials?: string; // e.g., "CD" for Carlos Diaz
  organizationLogoUrl?: string;
}

export default function DashboardNavbar({ userInitials = "C", organizationLogoUrl = '' }: DashboardNavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = useParams();
  const activeLocale = typeof params.lng === 'string' && params.lng.length > 0 ? params.lng : 'en';
  const isEs = activeLocale.toLowerCase().startsWith('es');
  const supabase = createBrowserSupabaseClient();
  const { hasIncompleteProfile: initialHasIncompleteProfile } = useDashboardNotifications();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(initialHasIncompleteProfile);
  const [notificationReady, setNotificationReady] = useState(true);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const hasLogo = organizationLogoUrl.trim().length > 0 && !logoLoadFailed;
  
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
    setHasIncompleteProfile(initialHasIncompleteProfile);
    setNotificationReady(true);
  }, [initialHasIncompleteProfile]);

  useEffect(() => {
    let isMounted = true;

    const syncProfileNotification = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user;

      if (!authUser) {
        if (!isMounted) return;
        setHasIncompleteProfile(false);
        setNotificationReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!isMounted) return;

      const missingRequiredProfileField =
        !profile?.first_name?.trim() ||
        !profile?.last_name?.trim() ||
        !profile?.phone?.trim();
      const metadataRequiresCompletion =
        authUser.user_metadata?.needs_profile_completion === true &&
        authUser.user_metadata?.profile_completed !== true;

      setHasIncompleteProfile(metadataRequiresCompletion || missingRequiredProfileField);
      setNotificationReady(true);
    };

    syncProfileNotification();

    const authSubscription = supabase.auth.onAuthStateChange(() => {
      syncProfileNotification();
    });

    const profileChannel = supabase
      .channel('dashboard-navbar-profile-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
        },
        () => {
          syncProfileNotification();
        }
      )
      .subscribe();

    const handleDocumentClick = (event: MouseEvent) => {
      if (!notificationRef.current) return;
      if (notificationRef.current.contains(event.target as Node)) return;
      setShowNotifications(false);
    };

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      isMounted = false;
      authSubscription.data.subscription.unsubscribe();
      document.removeEventListener('mousedown', handleDocumentClick);
      supabase.removeChannel(profileChannel);
    };
  }, [supabase]);

  const notifications = useMemo(() => {
    if (!hasIncompleteProfile) return [];

    return [
      {
        id: 'profile-incomplete',
        title: isEs ? 'Completa tu perfil' : 'Complete your profile',
        body: isEs
          ? 'Agrega tu nombre, apellido y telefono para terminar la configuracion de tu cuenta.'
          : 'Add your first name, last name, and phone number to finish setting up your account.',
        href: `/${activeLocale}/dashboard/profile-settings`,
        cta: isEs ? 'Abrir perfil' : 'Open profile',
      },
    ];
  }, [activeLocale, hasIncompleteProfile, isEs]);

  const unreadCount = notificationReady ? notifications.length : 0;

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
        </Link>

        {/* Right Side: Account Settings Avatar & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative mt-0.5" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative h-8 w-8 rounded-full border border-gray-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
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
              <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
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

          <Link 
            href="/dashboard/settings" 
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold tracking-wider shadow-sm transition transform hover:scale-[1.03] active:scale-[0.97] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
              hasLogo
                ? 'overflow-hidden border border-gray-200 bg-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Account Settings"
          >
            {hasLogo ? (
              <img
                src={organizationLogoUrl}
                alt="Organization logo"
                className="h-full w-full object-contain"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              userInitials.toUpperCase()
            )}
          </Link>

          {/* Mobile Hamburger Toggle Trigger Menu Button placed directly next to initials */}
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