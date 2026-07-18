import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import { getUserOrganization } from '@/lib/organization';
import ProfileSettingsForm from './ProfileSettingsForm';
import PasswordForm from '../settings/PasswordForm';

export default async function DashboardProfileSettingsPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { organization: org } = await getUserOrganization(user.id);
  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, phone')
    .eq('user_id', user.id)
    .maybeSingle();

  const initial = org.name ? org.name.charAt(0) : 'C';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />

      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-6 text-left">
            <div className="border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isEs ? 'Perfil' : 'Profile Settings'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {isEs
                  ? 'Completa tu informacion para activar tu espacio de trabajo.'
                  : 'Complete your profile information to activate your workspace experience.'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 md:p-8">
              <ProfileSettingsForm
                locale={locale}
                accountEmail={user.email || ''}
                initialFirstName={profile?.first_name || ''}
                initialLastName={profile?.last_name || ''}
                initialPhone={profile?.phone || ''}
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <PasswordForm locale={locale} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
