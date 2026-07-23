import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import BillingModal from '@/components/BillingModal';
import { DashboardNotificationProvider } from '@/components/dashboard/DashboardNotificationContext';
import { getUserOrganization } from '@/lib/organization';
import { isPradoManagementUser } from '@/lib/pradoManagement';
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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, phone')
    .eq('user_id', user.id)
    .maybeSingle();

  const rawPhone = org.phone || '';
  const rawStreet = org.street_address || '';
  const rawCity = org.city || '';
  const rawState = org.state || '';
  const rawZip = org.zip_code || '';

  const looksLikeZip = (value: string) => /^\d{5}(?:-\d{4})?$/.test(value.trim());
  const looksLikeStateCode = (value: string) => /^[A-Za-z]{2}$/.test(value.trim());
  const looksLikeStreet = (value: string) => /\d/.test(value) && /[A-Za-z]/.test(value);
  const looksLikePhone = (value: string) => /^[+()\d\s.-]{7,}$/.test(value.trim());

  const hasShiftedIdentityValues =
    !looksLikePhone(rawPhone) &&
    looksLikeStreet(rawPhone) &&
    rawStreet.length > 0 &&
    looksLikeStateCode(rawCity) &&
    looksLikeZip(rawState) &&
    !looksLikeZip(rawZip);

  const hasIncompleteProfile =
    !profile?.first_name?.trim() ||
    !profile?.last_name?.trim() ||
    !profile?.phone?.trim();

  const normalizedPhone = hasShiftedIdentityValues ? '' : rawPhone;
  const normalizedStreetAddress = hasShiftedIdentityValues ? rawPhone : rawStreet;
  const normalizedCity = hasShiftedIdentityValues ? rawStreet : rawCity;
  const normalizedState = hasShiftedIdentityValues ? rawCity : rawState;
  const normalizedZipCode = hasShiftedIdentityValues ? rawState : rawZip;

  const hasIncompleteOrgProfile =
    !org.slogan?.trim() ||
    !normalizedPhone.trim() ||
    !normalizedStreetAddress.trim() ||
    !normalizedCity.trim() ||
    !normalizedState.trim() ||
    !normalizedZipCode.trim();

  const canViewImportExport = role === 'owner' || role === 'admin';
  const canAccessPradoManagement = isPradoManagementUser(user);
  const initial = org.name ? org.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNotificationProvider
        hasIncompleteProfile={hasIncompleteProfile}
        hasIncompleteOrgProfile={hasIncompleteOrgProfile}
      >
        <DashboardNavbar userInitials={initial} />
        <div className="flex flex-1 relative">
          <div className="tour-sidebar">
            <DashboardSidebar
              subscriptionStatus={org.subscription_status ?? undefined}
              locale={locale}
              canViewImportExport={canViewImportExport}
              canAccessPradoManagement={canAccessPradoManagement}
            />
          </div>
          <InactivityLockScreen locale={locale} userEmail={user.email ?? ''}>
            {children}
          </InactivityLockScreen>
          <BillingModal userEmail={user.email ?? ''} orgId={org.id} locale={locale} />
        </div>
      </DashboardNotificationProvider>
    </div>
  );
}