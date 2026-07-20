import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import { getUserOrganization } from '@/lib/organization';
import { REMEMBER_ME_COOKIE_NAME } from '@/lib/rememberMe';
import InactivityLockScreen from '@/components/dashboard/InactivityLockScreen';
import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const supabase = await createClient();
  const cookieStore = await cookies();
  const hasRememberCookie = cookieStore.has(REMEMBER_ME_COOKIE_NAME);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    if (hasRememberCookie) {
      redirect(`/${locale}/auth/remember-restore?next=${encodeURIComponent(`/${locale}/dashboard`)}`);
    }

    redirect(`/${locale}/login`);
  }

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const canViewImportExport = role === 'owner' || role === 'admin';
  const initial = org.name ? org.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        <div className="tour-sidebar">
          <DashboardSidebar
            subscriptionStatus={org.subscription_status ?? undefined}
            locale={locale}
            canViewImportExport={canViewImportExport}
          />
        </div>
        <InactivityLockScreen locale={locale} userEmail={user.email ?? ''}>
          {children}
        </InactivityLockScreen>
      </div>
    </div>
  );
}