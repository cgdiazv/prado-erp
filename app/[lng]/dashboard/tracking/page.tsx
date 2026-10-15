import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import LiveTracking from '@/components/dashboard/LiveTracking';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { canUseLiveTracking } from '@/lib/subscriptionAccess';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getUserOrganization } from '@/lib/organization';

export default async function TrackingDashboardPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) redirect(`/${locale}/auth/access-pending`);

  const canAccessDispatch = await hasDashboardModuleAccess(org.id, role, 'dispatch');
  if (!canAccessDispatch) {
    redirect(`/${locale}/dashboard`);
  }

  if (!canUseLiveTracking(org.subscription_status)) {
    redirect(`/${locale}/dashboard?restricted=true`);
  }

  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect(`/${locale}/dashboard?expired=true`);
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 text-left">
        <LiveTracking locale={locale} />
      </div>
    </main>
  );
}
